"""
Query executor service that routes natural language queries through the MCP client.

Flow: User query → MCP Client → MCP Server → PostgreSQL → Results
"""
import os
import time
import logging
from typing import Dict, List, Any, Optional

from models.query import QueryRequest, QueryResponse
from services.database_manager import DatabaseManager
from services.mcp_client import MCPClient
from llm_providers.base import LLMProvider
from services.query_validator import QueryValidator
from exceptions import QueryExecutionError

logger = logging.getLogger(__name__)


class QueryExecutor:
    """Executes natural language queries against databases via MCP."""

    def __init__(
        self,
        database_manager: DatabaseManager,
        query_validator: QueryValidator,
        default_result_limit: int = 1000,
        query_timeout: int = 30,
        mcp_server_script: Optional[str] = None,
    ):
        """
        Initialize query executor.

        Args:
            database_manager: Database manager instance
            query_validator: Query validator instance
            default_result_limit: Default result limit
            query_timeout: Query timeout in seconds
            mcp_server_script: Path to the MCP server script
        """
        self.database_manager = database_manager
        self.query_validator = query_validator
        self.default_result_limit = default_result_limit
        self.query_timeout = query_timeout

        # Resolve MCP server script path
        if mcp_server_script:
            self.mcp_server_script = mcp_server_script
        else:
            # Default: look for mcp_server.py next to the backend package
            self.mcp_server_script = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "mcp_server.py",
            )

        logger.info(f"MCP server script: {self.mcp_server_script}")

    async def execute_query(
        self,
        request: QueryRequest,
        llm_provider: LLMProvider,
    ) -> QueryResponse:
        """
        Execute a natural language query via the MCP pipeline.

        Args:
            request: Query request with natural language query, database ID, and LLM config
            llm_provider: LLM provider instance to use

        Returns:
            QueryResponse with results
        """
        try:
            # Get database connection details (including decrypted password)
            db_config = await self.database_manager.get_connection_config(
                request.database_id
            )
            if not db_config:
                return QueryResponse(
                    natural_language_response="Database connection not found.",
                    sql_query="",
                    results=[],
                    row_count=0,
                    execution_time_ms=0,
                    truncated=False,
                    error="Database connection not found",
                )

            # Build conversation history for context
            conversation_history = request.conversation_history or []

            # Create MCP client and process the query
            mcp_client = MCPClient(
                server_script_path=self.mcp_server_script,
                max_iterations=15,
                tool_timeout=float(self.query_timeout),
            )

            result = await mcp_client.process_query(
                natural_query=request.query,
                db_config=db_config,
                llm_provider=llm_provider,
                conversation_history=conversation_history,
            )

            return QueryResponse(
                natural_language_response=result.get("natural_language_response", ""),
                sql_query=result.get("sql_query", ""),
                results=result.get("results", []),
                row_count=result.get("row_count", 0),
                execution_time_ms=result.get("execution_time_ms", 0),
                truncated=result.get("truncated", False),
                error=result.get("error"),
            )

        except Exception as e:
            logger.error(f"Query execution error: {e}")
            return QueryResponse(
                natural_language_response=f"Error executing query: {str(e)}",
                sql_query="",
                results=[],
                row_count=0,
                execution_time_ms=0,
                truncated=False,
                error=str(e),
            )
