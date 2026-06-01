#!/usr/bin/env python3
"""
MCP Server for PostgreSQL Database Operations.
Uses the official MCP Python SDK with FastMCP.
Exposes database tools (query, schema, modification, test) via the MCP protocol.
"""

import asyncio
import os
import ssl
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from dataclasses import dataclass
import logging

from dotenv import load_dotenv
load_dotenv()

from mcp.server.fastmcp import FastMCP, Context
import asyncpg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DatabaseContext:
    """Context to hold the database connection pool."""
    pool: asyncpg.Pool


@asynccontextmanager
async def database_lifespan(server: FastMCP) -> AsyncIterator[DatabaseContext]:
    """Manage database connection lifecycle."""
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")

    connection_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    connection_string = os.getenv("DATABASE_URL", connection_string)

    logger.info(f"Connecting to database at {db_host}...")

    try:
        # SSL configuration
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False

        ssl_cert_path = os.getenv("SSL_CERT_PATH")
        if ssl_cert_path and os.path.exists(ssl_cert_path):
            ssl_context.load_verify_locations(ssl_cert_path)
            ssl_context.verify_mode = ssl.CERT_REQUIRED
            logger.info(f"Using SSL certificate from {ssl_cert_path}")
        else:
            ssl_context.verify_mode = ssl.CERT_NONE

        # Determine if SSL should be used
        use_ssl = os.getenv("SSL_ENABLED", "false").lower() == "true"

        # Connection retry logic
        max_retries = 3
        retry_delay = 1.0

        for attempt in range(max_retries):
            try:
                pool_kwargs = {
                    "min_size": 2,
                    "max_size": 10,
                    "command_timeout": 60,
                    "server_settings": {
                        "application_name": "mcp_postgres_server",
                    },
                }

                if use_ssl:
                    pool_kwargs["ssl"] = ssl_context

                pool = await asyncpg.create_pool(connection_string, **pool_kwargs)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Connection attempt {attempt + 1} failed: {e}")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    raise

        # Test the connection
        async with pool.acquire() as connection:
            await connection.execute("SELECT 1")

        logger.info("Successfully connected to PostgreSQL database")
        yield DatabaseContext(pool=pool)

    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise
    finally:
        if "pool" in locals():
            await pool.close()
            logger.info("Database connection pool closed")


# Create MCP server with database lifecycle management
mcp = FastMCP("PostgreSQL Database Server", lifespan=database_lifespan)


def is_safe_query(query: str) -> bool:
    """Check if query is a safe SELECT statement."""
    query_clean = query.strip().upper()
    return query_clean.startswith("SELECT")


def is_safe_modification_query(query: str) -> bool:
    """Check if query is a safe modification (INSERT, UPDATE, DELETE)."""
    query_clean = query.strip().upper()
    dangerous_keywords = ["DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"]
    return (
        query_clean.startswith(("INSERT", "UPDATE", "DELETE"))
        and not any(keyword in query_clean for keyword in dangerous_keywords)
    )


@mcp.tool()
async def query_database(ctx: Context, query: str, params: list | None = None) -> str:
    """
    Execute a SELECT query on the database.

    Args:
        query: SQL SELECT query to execute
        params: Optional parameters for the query

    Returns:
        Query results as formatted string
    """
    if params is None:
        params = []

    if not is_safe_query(query):
        return "Error: Only SELECT queries are allowed for this tool"

    try:
        db_context = ctx.request_context.lifespan_context
        pool = db_context.pool

        async with pool.acquire() as connection:
            if params:
                rows = await asyncio.wait_for(
                    connection.fetch(query, *params), timeout=30.0
                )
            else:
                rows = await asyncio.wait_for(
                    connection.fetch(query), timeout=30.0
                )

            if not rows:
                return "No results found"

            result_lines = []
            if rows:
                headers = list(rows[0].keys())
                result_lines.append(" | ".join(headers))
                result_lines.append("-" * len(result_lines[0]))

                for row in rows[:100]:  # Limit to 100 rows
                    result_lines.append(
                        " | ".join(str(value) for value in row.values())
                    )

                if len(rows) > 100:
                    result_lines.append(f"... and {len(rows) - 100} more rows")

            return "\n".join(result_lines)

    except asyncio.TimeoutError:
        return "Database error: Query timeout"
    except Exception as e:
        logger.error(f"Database query error: {e}")
        return f"Database error: {str(e)}"


@mcp.tool()
async def get_table_schema(ctx: Context, table_name: str = None) -> str:
    """
    Get database schema information.

    Args:
        table_name: Specific table name (optional, returns all tables if not specified)

    Returns:
        Schema information as formatted string
    """
    try:
        db_context = ctx.request_context.lifespan_context
        pool = db_context.pool

        async with pool.acquire() as connection:
            if table_name:
                query = """
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                """
                rows = await asyncio.wait_for(
                    connection.fetch(query, table_name), timeout=30.0
                )

                if not rows:
                    return f"Table '{table_name}' not found"

                result_lines = [f"Schema for table '{table_name}':"]
                result_lines.append(
                    "Column Name | Data Type | Nullable | Default"
                )
                result_lines.append("-" * 50)

                for row in rows:
                    result_lines.append(
                        f"{row['column_name']} | {row['data_type']} | "
                        f"{row['is_nullable']} | {row['column_default'] or 'None'}"
                    )
            else:
                query = """
                    SELECT table_name, table_type
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """
                rows = await asyncio.wait_for(
                    connection.fetch(query), timeout=30.0
                )

                if not rows:
                    return "No tables found in the database"

                result_lines = ["Available tables:"]
                result_lines.append("Table Name | Type")
                result_lines.append("-" * 30)

                for row in rows:
                    result_lines.append(
                        f"{row['table_name']} | {row['table_type']}"
                    )

            return "\n".join(result_lines)

    except asyncio.TimeoutError:
        return "Schema error: Query timeout"
    except Exception as e:
        logger.error(f"Schema query error: {e}")
        return f"Schema error: {str(e)}"


@mcp.tool()
async def test_connection(ctx: Context) -> str:
    """
    Test the database connection and return connection info.

    Returns:
        Connection status and basic database info
    """
    try:
        db_context = ctx.request_context.lifespan_context
        pool = db_context.pool

        async with pool.acquire() as connection:
            result = await connection.fetchrow(
                "SELECT version(), current_database(), current_user"
            )

            return f"""Connection successful:
Database: {result['current_database']}
User: {result['current_user']}
PostgreSQL Version: {result['version'][:80]}"""

    except Exception as e:
        logger.error(f"Connection test error: {e}")
        return f"Connection test failed: {str(e)}"


# Main execution
if __name__ == "__main__":
    required_vars = ["DB_HOST", "DB_USER", "DB_PASSWORD"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        logger.warning(f"Missing environment variables: {missing_vars}")

    mcp.run()
