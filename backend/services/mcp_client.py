"""
Generic MCP Client for the Universal Database Chat Assistant.
Connects to the MCP Server via stdio, discovers tools, and orchestrates
the LLM tool-calling loop to process natural language queries against databases.
"""

import asyncio
import json
import os
import re
import sys
import time
from typing import List, Dict, Any, Optional
import logging

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from llm_providers.base import LLMProvider

logger = logging.getLogger(__name__)


class MCPClient:
    """
    Generic MCP client that works with any LLM provider.
    
    Orchestrates the flow:
    1. Connect to MCP Server (subprocess)
    2. Discover available tools from the server
    3. Convert tools to LLM provider format
    4. Run the LLM tool-calling loop until the LLM produces a final answer
    5. Return structured results
    """

    def __init__(
        self,
        server_script_path: str,
        max_iterations: int = 15,
        tool_timeout: float = 30.0,
    ):
        """
        Initialize MCP client.

        Args:
            server_script_path: Absolute path to the MCP server script
            max_iterations: Maximum tool-calling iterations before stopping
            tool_timeout: Timeout for individual tool calls in seconds
        """
        self.server_script_path = server_script_path
        self.max_iterations = max_iterations
        self.tool_timeout = tool_timeout

    def _build_env_vars(self, db_config: Dict[str, Any]) -> Dict[str, str]:
        """
        Build environment variables for the MCP Server subprocess
        from a database connection configuration.

        Args:
            db_config: Database connection details (host, port, database, username, password, ssl_enabled, ssl_cert_path)

        Returns:
            Environment variables dict for the subprocess
        """
        env = {
            "PATH": os.environ.get("PATH", ""),
            "PYTHONPATH": os.environ.get("PYTHONPATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "DB_HOST": str(db_config.get("host", "localhost")),
            "DB_PORT": str(db_config.get("port", 5432)),
            "DB_NAME": str(db_config.get("database", "")),
            "DB_USER": str(db_config.get("username", "")),
            "DB_PASSWORD": str(db_config.get("password", "")),
            "SSL_ENABLED": str(db_config.get("ssl_enabled", False)).lower(),
        }

        ssl_cert_path = db_config.get("ssl_cert_path")
        if ssl_cert_path:
            env["SSL_CERT_PATH"] = ssl_cert_path

        # Pass through VIRTUAL_ENV if set for correct Python resolution
        virtual_env = os.environ.get("VIRTUAL_ENV")
        if virtual_env:
            env["VIRTUAL_ENV"] = virtual_env

        return env

    async def _call_mcp_tool(
        self,
        session: ClientSession,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> str:
        """
        Call a single MCP tool on the server and return its text result.

        Args:
            session: Active MCP client session
            tool_name: Name of the MCP tool to call
            arguments: Arguments to pass to the tool

        Returns:
            Text result from the tool
        """
        try:
            logger.info(f"Calling MCP tool: {tool_name} with args: {arguments}")
            result = await asyncio.wait_for(
                session.call_tool(tool_name, arguments),
                timeout=self.tool_timeout,
            )

            # Extract text content from MCP result
            if result.content:
                text_parts = []
                for content_item in result.content:
                    if hasattr(content_item, "text"):
                        text_parts.append(content_item.text)
                final_result = "\n".join(text_parts)
                logger.info(f"Tool {tool_name} returned {len(final_result)} chars")
                return final_result
            else:
                return "Tool executed successfully but returned no content"

        except asyncio.TimeoutError:
            error_msg = f"Tool {tool_name} timed out after {self.tool_timeout}s"
            logger.error(error_msg)
            return error_msg
        except Exception as e:
            error_msg = f"Error executing tool {tool_name}: {str(e)}"
            logger.error(error_msg)
            return error_msg

    def _cap_result_size(self, result: str, max_chars: int = 1500) -> str:
        """
        Cap a tool result to max_chars to prevent oversized messages.
        Preserves the beginning (headers, summaries) and notes truncation.
        """
        if len(result) <= max_chars:
            return result
        return result[:max_chars] + f"\n... [truncated, {len(result)} total chars]"

    def _compress_old_messages(self, messages: list, preserve_after_index: int) -> None:
        """
        Compress tool result messages from BEFORE preserve_after_index.

        After the LLM has seen and processed tool results in a previous iteration,
        we replace the full content with a compact summary. The LLM already absorbed
        the information — it just needs a brief reminder, not the raw data.

        Results from the current iteration (after preserve_after_index) are kept
        at full fidelity so the LLM can reason about them.

        Modifies messages in-place.
        """
        for i in range(preserve_after_index):
            msg = messages[i]
            if msg.get("role") != "tool":
                continue
            content = msg.get("content", "")
            if len(content) <= 150:  # Already compact, skip
                continue

            tool_name = msg.get("name", "unknown")
            lines = content.split("\n")
            non_empty = [l for l in lines if l.strip()]

            if tool_name == "get_table_schema":
                # Keep first line (table list or schema header) + column names
                summary = "\n".join(non_empty[:4])
                if len(non_empty) > 4:
                    summary += f"\n[... {len(non_empty) - 4} more lines]"
            elif tool_name == "sample_table_data":
                # Keep row count + first few distinct values or sample rows
                summary = "\n".join(non_empty[:6])
                if len(non_empty) > 6:
                    summary += f"\n[... {len(non_empty) - 6} more lines]"
            elif tool_name == "query_database":
                # Keep headers + first 3 data rows (needed for final answer)
                summary = "\n".join(non_empty[:5])
                if len(non_empty) > 5:
                    summary += f"\n[... {len(non_empty) - 5} more rows]"
            else:
                summary = content[:200]
                if len(content) > 200:
                    summary += f"\n[... truncated]"

            old_len = len(content)
            messages[i]["content"] = summary
            logger.debug(
                f"Compressed tool result [{tool_name}] at index {i}: "
                f"{old_len} -> {len(summary)} chars"
            )

    async def process_query(
        self,
        natural_query: str,
        db_config: Dict[str, Any],
        llm_provider: LLMProvider,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Process a natural language query via the MCP Server.

        This is the main entry point. It:
        1. Starts the MCP Server as a subprocess with the target DB credentials
        2. Discovers available tools from the MCP Server
        3. Sends the query to the LLM with the MCP tools
        4. Runs the LLM tool-calling loop until a final answer is produced
        5. Returns structured results

        Args:
            natural_query: The user's natural language question
            db_config: Database connection config (host, port, database, username, password, etc.)
            llm_provider: LLM provider instance to use for chat completions
            conversation_history: Optional prior conversation for context

        Returns:
            Dict with keys: natural_language_response, sql_query, results, row_count,
            execution_time_ms, truncated, error
        """
        env_vars = self._build_env_vars(db_config)

        # Determine the Python executable
        python_executable = sys.executable

        server_params = StdioServerParameters(
            command=python_executable,
            args=[self.server_script_path],
            env=env_vars,
        )

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    # Initialize the MCP session
                    await session.initialize()
                    logger.info("Connected to MCP server")

                    # Discover available tools
                    tools_response = await session.list_tools()
                    mcp_tools = tools_response.tools
                    logger.info(f"Discovered {len(mcp_tools)} MCP tools")

                    # Convert tools to the LLM provider's format
                    provider_tools = llm_provider.convert_tools_format(mcp_tools)

                    # Run the tool-calling loop
                    return await self._run_tool_loop(
                        session=session,
                        natural_query=natural_query,
                        llm_provider=llm_provider,
                        provider_tools=provider_tools,
                        conversation_history=conversation_history,
                    )

        except Exception as e:
            logger.error(f"MCP client error: {e}")
            return {
                "natural_language_response": f"Error: {str(e)}",
                "sql_query": "",
                "results": [],
                "row_count": 0,
                "execution_time_ms": 0,
                "truncated": False,
                "error": str(e),
            }

    async def _run_tool_loop(
        self,
        session: ClientSession,
        natural_query: str,
        llm_provider: LLMProvider,
        provider_tools: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Run the LLM tool-calling loop.

        The LLM decides which MCP tools to call, we execute them,
        feed results back, and repeat until the LLM produces a final text answer.

        Args:
            session: Active MCP client session
            natural_query: User's natural language question
            llm_provider: LLM provider instance
            provider_tools: Tools in the provider's format
            conversation_history: Optional prior conversation

        Returns:
            Structured result dict
        """
        start_time = time.time()

        # Build the system prompt — kept concise to reduce token usage
        system_prompt = """You are an expert data analyst. Your goal is to answer the user's analytical questions, provide insights, and solve problems using your access to their PostgreSQL database. You are not just a query generator; you are a partner in analyzing their data.

You have access to database tools via MCP (Model Context Protocol):
- `get_table_schema`: Get schema info for all tables or a specific table
- `get_table_relationships`: Discover foreign key relationships between tables
- `sample_table_data`: Explore actual data in a table — see sample rows or distinct values in a column
- `query_database`: Execute SELECT queries against the database to gather data for your analysis
- `test_connection`: Test the database connection

CRITICAL INSTRUCTION REGARDING TOOLS:
You MUST actually INVOKE the tools provided to you via function/tool calls. Do NOT simply write SQL in markdown blocks and pretend you executed it. You must use the tool-calling mechanism to send queries to the `query_database` tool, wait for the actual JSON response, and then use that data to formulate your answer. If you only output text, no query will be executed!

WORKFLOW — you MUST follow these steps in order every time you need data:

1. DISCOVER STRUCTURE: Call `get_table_schema` (no args) to list all tables in the database.

2. INSPECT RELEVANT TABLES: For each table that looks relevant to the user's question,
   call `get_table_schema(table_name=...)` to see its columns and data types.
   Use `get_table_relationships()` if you need to perform JOINs.

3. EXPLORE ACTUAL DATA (THIS IS THE MOST CRITICAL STEP):
   Before writing ANY query, you MUST understand the actual data stored in the tables.
   - Call `sample_table_data(table_name=...)` to see sample rows and understand
     what kind of data is stored, what the values look like, and how the data is organized.
   - Call `sample_table_data(table_name=..., column_name=...)` on any column you plan
     to filter or group by — this shows you the exact distinct values that exist.
   - This step is essential. Without it you will guess wrong about what values exist
     and your queries will return 0 rows.

4. GATHER DATA: Now that you understand the schema AND the actual data,
   construct a SQL query that accurately matches the real values in the database to get the information you need.
   Use the exact values, patterns, and column names you observed in step 3.
   Call `query_database` to fetch the data.

5. ANALYZE & RESPOND: Don't just dump the raw data or the SQL query. Analyze the results, draw conclusions, and present a clear, insightful answer to the user's question. Use tables or formatting if it helps clarity.

RULES:
- Act as an analyst answering the business/analytical question, not just a SQL converter.
- Only generate SELECT queries (read-only).
- NEVER skip the data exploration step — always look at real data before querying.
- NEVER guess what values might exist in a column — always check first.
- If a query returns no results, go back and explore the data again to understand why.
- While your primary output should be the analysis, always briefly include the SQL query you used in a code block so the user can verify your work."""

        # Build messages
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)

        # Add the user query
        messages.append({"role": "user", "content": natural_query})

        # Track the SQL queries executed
        sql_queries_executed = []
        last_query_results = []
        last_content = ""
        iteration = 0
        rate_limit_retries = 0
        max_rate_limit_retries = 3
        # Track where fresh (unprocessed) tool results start in messages.
        # Everything before this index has already been seen by the LLM
        # and can be compressed to save tokens.
        messages_snapshot_idx = len(messages)

        logger.info("")
        logger.info(f"{'='*70}")
        logger.info(f"  QUERY PIPELINE START")
        logger.info(f"  User query: \"{natural_query}\"")
        logger.info(f"  Max iterations: {self.max_iterations}")
        logger.info(f"  System prompt: {len(system_prompt)} chars")
        logger.info(f"  Conversation history: {len(conversation_history or [])} messages")
        logger.info(f"{'='*70}")

        # Token tracking
        total_prompt_tokens = 0
        total_completion_tokens = 0

        while iteration < self.max_iterations:
            iteration += 1
            logger.info("")
            logger.info(f"{'─'*70}")
            logger.info(f"  ITERATION {iteration}/{self.max_iterations}")
            logger.info(f"{'─'*70}")

            # Compress old tool results that the LLM already processed
            if messages_snapshot_idx < len(messages):
                compressed_count = 0
                saved_chars = 0
                for i in range(messages_snapshot_idx):
                    msg = messages[i]
                    if msg.get("role") == "tool" and len(msg.get("content", "")) > 150:
                        old_len = len(msg["content"])
                        self._compress_old_messages(messages, preserve_after_index=messages_snapshot_idx)
                        new_len = len(msg["content"])
                        if new_len < old_len:
                            compressed_count += 1
                            saved_chars += old_len - new_len
                        break  # _compress_old_messages handles all at once
                if compressed_count > 0 or saved_chars > 0:
                    logger.info(f"  [COMPRESS] Compressed old tool results, saved ~{saved_chars} chars")

            # Log message history state
            msg_roles = [m.get("role", "?") for m in messages]
            role_counts = {r: msg_roles.count(r) for r in set(msg_roles)}
            total_content_chars = sum(len(str(m.get('content', '') or '')) for m in messages)
            logger.info(f"  [CONTEXT] Messages: {len(messages)} ({role_counts})")
            logger.info(f"  [CONTEXT] Total content size: ~{total_content_chars} chars (~{total_content_chars // 4} est. tokens)")

            try:
                # Get LLM completion with tools
                logger.info(f"  [LLM] Sending request to LLM...")
                iter_start = time.time()
                response = await llm_provider.chat_completion(
                    messages=messages,
                    tools=provider_tools,
                    temperature=0.1,
                )
                llm_time = (time.time() - iter_start) * 1000

                # Log token usage
                usage = response.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)
                total_tokens = usage.get("total_tokens", 0)
                total_prompt_tokens += prompt_tokens
                total_completion_tokens += completion_tokens

                if total_tokens:
                    logger.info(f"  [LLM] Response received in {llm_time:.0f}ms")
                    logger.info(f"  [TOKENS] This call: {prompt_tokens} prompt + {completion_tokens} completion = {total_tokens} total")
                    logger.info(f"  [TOKENS] Running total: {total_prompt_tokens} prompt + {total_completion_tokens} completion = {total_prompt_tokens + total_completion_tokens} total")
                else:
                    logger.info(f"  [LLM] Response received in {llm_time:.0f}ms (token counts not available)")

                content = response.get("content", "")
                tool_calls = response.get("tool_calls")

                # Log LLM's text thinking (if any)
                if content and content.strip():
                    logger.info(f"  [LLM THINKING] {content[:300]}{'...' if len(content or '') > 300 else ''}")

                # If the LLM wants to call tools
                if tool_calls:
                    logger.info(f"  [DECISION] LLM wants to call {len(tool_calls)} tool(s)")

                    # Add assistant message with tool calls to history
                    messages.append({
                        "role": "assistant",
                        "content": content,
                        "tool_calls": tool_calls,
                    })

                    # Execute each tool call
                    for tool_idx, tool_call in enumerate(tool_calls):
                        function_name = tool_call.function.name
                        try:
                            function_args = json.loads(tool_call.function.arguments)
                        except (json.JSONDecodeError, AttributeError):
                            function_args = {}

                        logger.info("")
                        logger.info(f"  ┌── TOOL CALL [{tool_idx + 1}/{len(tool_calls)}] ──────────────")
                        logger.info(f"  │ Tool: {function_name}")
                        logger.info(f"  │ Args: {json.dumps(function_args, default=str)}")

                        # Track SQL queries
                        if function_name == "query_database":
                            sql_query = function_args.get("query", "")
                            sql_queries_executed.append(sql_query)
                            logger.info(f"  │ SQL: {sql_query}")

                        # Call the MCP tool
                        tool_start = time.time()
                        tool_result = await self._call_mcp_tool(
                            session, function_name, function_args
                        )
                        tool_time = (time.time() - tool_start) * 1000

                        # Log FULL tool result
                        result_lines = tool_result.split('\n') if tool_result else []
                        logger.info(f"  │ Result ({tool_time:.0f}ms, {len(result_lines)} lines, {len(tool_result)} chars):")
                        for line in result_lines:
                            logger.info(f"  │   {line[:150]}")

                        # Track results from query_database
                        if function_name == "query_database" and tool_result:
                            last_query_results = self._parse_table_results(tool_result)
                            logger.info(f"  │ Parsed rows: {len(last_query_results)}")

                        logger.info(f"  └─────────────────────────────────────────")

                        # Cap result size and add to messages
                        capped_result = self._cap_result_size(tool_result)
                        if len(capped_result) < len(tool_result):
                            logger.info(f"  [CAP] Result capped: {len(tool_result)} → {len(capped_result)} chars")
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": capped_result,
                        })

                    # Mark current position for next compression pass
                    messages_snapshot_idx = len(messages)
                    continue  # Go back to get another LLM completion

                else:
                    # No tool calls — LLM has a final answer
                    last_content = content or ""
                    logger.info(f"  [DECISION] LLM produced FINAL ANSWER ({len(last_content)} chars)")
                    logger.info("")
                    logger.info(f"  ┌── FINAL ANSWER ─────────────────────────")
                    for line in last_content.split('\n'):
                        logger.info(f"  │ {line[:150]}")
                    logger.info(f"  └─────────────────────────────────────────")
                    break

            except Exception as e:
                error_str = str(e)

                # Handle rate limit errors (429) with smart backoff
                if "429" in error_str or "rate_limit" in error_str:
                    rate_limit_retries += 1
                    if rate_limit_retries > max_rate_limit_retries:
                        logger.error(f"  [RATE LIMIT] Exceeded max retries ({max_rate_limit_retries}). Giving up.")
                        last_content = (
                            "Rate limit exceeded. The LLM provider's token quota has been reached. "
                            "Please wait a minute and try again, or switch to a model with higher limits."
                        )
                        break

                    # Try to parse wait time from error
                    wait_match = re.search(r"try again in (\d+\.?\d*)s", error_str, re.IGNORECASE)
                    if wait_match:
                        wait_time = float(wait_match.group(1)) + 1.0
                    else:
                        min_match = re.search(r"in (\d+)m(\d+\.?\d*)s", error_str, re.IGNORECASE)
                        if min_match:
                            wait_time = int(min_match.group(1)) * 60 + float(min_match.group(2)) + 1.0
                        else:
                            wait_time = min(5 * rate_limit_retries, 30)

                    logger.warning(
                        f"  [RATE LIMIT] Hit rate limit (retry {rate_limit_retries}/{max_rate_limit_retries}). "
                        f"Waiting {wait_time:.1f}s..."
                    )
                    await asyncio.sleep(wait_time)
                    iteration -= 1  # Don't count rate-limit retries
                    continue

                # Other errors
                logger.error(f"  [ERROR] Iteration {iteration} failed: {e}")
                if iteration >= 3:
                    last_content = f"Error during query processing: {str(e)}"
                    break
                logger.info(f"  [RETRY] Will retry...")
                continue

        # Calculate execution time
        execution_time_ms = (time.time() - start_time) * 1000

        # Build the result
        sql_query = sql_queries_executed[-1] if sql_queries_executed else ""

        # Final summary
        logger.info("")
        logger.info(f"{'='*70}")
        logger.info(f"  PIPELINE COMPLETE — SUMMARY")
        logger.info(f"{'='*70}")
        logger.info(f"  Total iterations:      {iteration}")
        logger.info(f"  Rate limit retries:    {rate_limit_retries}")
        logger.info(f"  Total SQL queries:     {len(sql_queries_executed)}")
        if sql_queries_executed:
            for i, sq in enumerate(sql_queries_executed):
                logger.info(f"    [{i+1}] {sq}")
        logger.info(f"  Result rows returned:  {len(last_query_results)}")
        logger.info(f"  Total tokens used:     {total_prompt_tokens + total_completion_tokens}")
        logger.info(f"    ├── Prompt tokens:   {total_prompt_tokens}")
        logger.info(f"    └── Completion:      {total_completion_tokens}")
        logger.info(f"  Total wall time:       {execution_time_ms:.0f}ms ({execution_time_ms/1000:.1f}s)")
        logger.info(f"{'='*70}")
        logger.info("")

        return {
            "natural_language_response": last_content or "Query completed.",
            "sql_query": sql_query,
            "sql_queries": sql_queries_executed,
            "results": last_query_results,
            "row_count": len(last_query_results),
            "execution_time_ms": round(execution_time_ms, 2),
            "truncated": len(last_query_results) >= 100,
            "error": None,
        }

    def _parse_table_results(self, raw_result: str) -> List[Dict[str, Any]]:
        """
        Parse the text table output from MCP tool into a list of dicts.

        The MCP server returns results as pipe-separated text:
            col1 | col2 | col3
            -----------------
            val1 | val2 | val3

        Args:
            raw_result: Raw text result from the MCP query_database tool

        Returns:
            List of row dicts
        """
        rows = []
        if not raw_result or raw_result == "No results found":
            return rows

        lines = raw_result.strip().split("\n")
        if len(lines) < 2:
            return rows

        # First line is headers
        headers = [h.strip() for h in lines[0].split("|")]

        # Skip separator line and parse data rows
        for line in lines[2:]:
            if line.startswith("..."):  # Truncation indicator
                break
            values = [v.strip() for v in line.split("|")]
            if len(values) == len(headers):
                row = {}
                for header, value in zip(headers, values):
                    row[header] = value
                rows.append(row)

        return rows
