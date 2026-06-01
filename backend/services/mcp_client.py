"""
Generic MCP Client for the Universal Database Chat Assistant.
Connects to the MCP Server via stdio, discovers tools, and orchestrates
the LLM tool-calling loop to process natural language queries against databases.
"""

import asyncio
import json
import os
import sys
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
        import time
        start_time = time.time()

        # Build the system prompt
        system_prompt = """You are a database assistant. You help users query PostgreSQL databases using natural language.

You have access to database tools via MCP (Model Context Protocol):
- `get_table_schema`: Get schema info for all tables or a specific table
- `query_database`: Execute SELECT queries against the database
- `test_connection`: Test the database connection

WORKFLOW:
1. First, call `get_table_schema` to understand the database structure
2. Then formulate and execute SQL queries using `query_database`
3. Analyze the results and provide a clear, helpful response

RULES:
- Only generate SELECT queries (read-only)
- Always check the schema before querying to use correct table/column names
- Include the SQL query you used in your response
- Format results clearly for the user
- If a query returns no results, explain why and suggest alternatives"""

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

        while iteration < self.max_iterations:
            iteration += 1
            logger.info(f"Tool-calling loop iteration {iteration}")

            try:
                # Get LLM completion with tools
                response = await llm_provider.chat_completion(
                    messages=messages,
                    tools=provider_tools,
                    temperature=0.1,
                )

                content = response.get("content", "")
                tool_calls = response.get("tool_calls")

                # If the LLM wants to call tools
                if tool_calls:
                    logger.info(f"LLM wants to call {len(tool_calls)} tool(s)")

                    # Add assistant message with tool calls to history
                    messages.append({
                        "role": "assistant",
                        "content": content,
                        "tool_calls": tool_calls,
                    })

                    # Execute each tool call
                    for tool_call in tool_calls:
                        function_name = tool_call.function.name
                        try:
                            function_args = json.loads(tool_call.function.arguments)
                        except (json.JSONDecodeError, AttributeError):
                            function_args = {}

                        logger.info(f"Executing MCP tool: {function_name}")

                        # Track SQL queries
                        if function_name == "query_database":
                            sql_query = function_args.get("query", "")
                            sql_queries_executed.append(sql_query)

                        # Call the MCP tool
                        tool_result = await self._call_mcp_tool(
                            session, function_name, function_args
                        )

                        # Track results from query_database
                        if function_name == "query_database" and tool_result:
                            last_query_results = self._parse_table_results(tool_result)

                        # Add tool result to messages
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": tool_result,
                        })

                    continue  # Go back to get another LLM completion

                else:
                    # No tool calls — LLM has a final answer
                    last_content = content or ""
                    logger.info("LLM produced final answer")
                    break

            except Exception as e:
                logger.error(f"Error in iteration {iteration}: {e}")
                if iteration >= 3:
                    last_content = f"Error during query processing: {str(e)}"
                    break
                continue

        # Calculate execution time
        execution_time_ms = (time.time() - start_time) * 1000

        # Build the result
        sql_query = sql_queries_executed[-1] if sql_queries_executed else ""

        return {
            "natural_language_response": last_content or "Query completed.",
            "sql_query": sql_query,
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
