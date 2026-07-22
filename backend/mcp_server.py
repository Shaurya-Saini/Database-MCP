#!/usr/bin/env python3
"""
MCP Server for PostgreSQL Database Operations.
Uses the official MCP Python SDK with FastMCP.
Exposes database tools (query, schema, modification, test) via the MCP protocol.
"""

import asyncio
import json
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
import sqlparse
from sqlparse import tokens as sql_tokens

# Hard cap on rows pulled from Postgres per query_database call. Enforced via
# a server-side cursor (see query_database) so an unbounded query never
# materializes more than this many rows in memory, regardless of table size.
MAX_QUERY_ROWS = 100

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


_DISALLOWED_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE",
    "GRANT", "REVOKE", "MERGE", "CALL", "EXECUTE", "COPY", "VACUUM",
    "REINDEX", "REFRESH", "INTO", "LOCK",
}


def is_safe_query(query: str) -> bool:
    """
    Check if a query is a read-only SELECT — including WITH/CTE queries,
    window functions, and recursive queries, which real analytical SQL needs.

    A plain `query.startswith("SELECT")` check (the previous implementation)
    has two problems: it rejects every CTE (`WITH ... SELECT ...`), and it
    fails to catch writes disguised as a SELECT, e.g. `SELECT ... INTO
    new_table` or a writable CTE like
    `WITH x AS (INSERT INTO t ... RETURNING *) SELECT * FROM x`.

    This tokenizes the SQL with sqlparse instead of pattern-matching the raw
    string, so:
    - `WITH ...` statements are allowed (CTEs are essential for real analysis).
    - Any write/DDL keyword appearing ANYWHERE in the statement — including
      inside a CTE body — is rejected, catching writable-CTE smuggling.
    - `SELECT ... INTO ...` is rejected (INTO is in the disallowed set).
    - Stacked statements (`SELECT 1; DROP TABLE x;`) are rejected.
    - Keywords that appear inside string literals or identifiers (e.g. a
      WHERE clause matching the literal 'DELETE') are correctly ignored,
      since sqlparse tokenizes those as literals/names, not keywords.

    Note: this is one layer of defense. The actual query execution in
    `query_database` additionally runs inside a Postgres-level read-only
    transaction, so even a gap in this parser cannot result in a write.
    """
    try:
        statements = [
            s for s in sqlparse.parse(query)
            if s.token_first(skip_cm=True) is not None
        ]
    except Exception:
        return False

    if len(statements) != 1:
        return False

    stmt = statements[0]
    first_token = stmt.token_first(skip_cm=True)
    if first_token is None:
        return False

    if first_token.value.upper() not in ("SELECT", "WITH"):
        return False

    for token in stmt.flatten():
        if token.ttype in sql_tokens.Keyword and token.value.upper() in _DISALLOWED_KEYWORDS:
            return False

    return True


@mcp.tool()
async def query_database(ctx: Context, query: str, params: list | None = None) -> str:
    """
    Execute a read-only query against the database. Supports plain SELECTs
    as well as WITH/CTE queries, window functions, and recursive queries —
    anything needed for real analytical SQL — as long as it performs no writes.

    Args:
        query: SQL SELECT or WITH/CTE query to execute
        params: Optional positional parameters for the query ($1, $2, ...)

    Returns:
        A JSON object: {"columns": [...], "rows": [{...}, ...],
        "row_count": N, "truncated": bool}, or {"error": "..."} on failure.
        Results are capped to the first MAX_QUERY_ROWS rows; "truncated"
        indicates whether more rows existed beyond that cap.
    """
    if params is None:
        params = []

    if not is_safe_query(query):
        return json.dumps({
            "error": (
                "Only read-only SELECT/WITH queries are allowed. Writes, DDL, "
                "SELECT INTO, and multiple statements in one call are rejected."
            )
        })

    try:
        db_context = ctx.request_context.lifespan_context
        pool = db_context.pool

        async with pool.acquire() as connection:
            # Enforce read-only at the Postgres level as defense-in-depth:
            # even if a query slips past is_safe_query's parsing, Postgres
            # itself will refuse to execute any write inside this transaction.
            # A server-side cursor is used (fetch(N)) instead of connection.fetch()
            # so an unbounded query never materializes more than MAX_QUERY_ROWS+1
            # rows in memory, regardless of the underlying table's size.
            async with connection.transaction(readonly=True):
                cursor = await (
                    connection.cursor(query, *params) if params
                    else connection.cursor(query)
                )
                rows = await asyncio.wait_for(
                    cursor.fetch(MAX_QUERY_ROWS + 1), timeout=30.0
                )

            truncated = len(rows) > MAX_QUERY_ROWS
            rows = rows[:MAX_QUERY_ROWS]

            if not rows:
                return json.dumps({
                    "columns": [], "rows": [], "row_count": 0, "truncated": False
                })

            columns = list(rows[0].keys())
            result_rows = [dict(row) for row in rows]

            return json.dumps({
                "columns": columns,
                "rows": result_rows,
                "row_count": len(result_rows),
                "truncated": truncated,
            }, default=str)

    except asyncio.TimeoutError:
        return json.dumps({"error": "Query timeout"})
    except Exception as e:
        logger.error(f"Database query error: {e}")
        return json.dumps({"error": f"Database error: {str(e)}"})


@mcp.tool()
async def get_table_schema(ctx: Context, table_name: str = None) -> str:
    """
    Get database schema information. For a specific table, this includes
    columns, the primary key, unique constraints, and indexes — use this to
    reason about join cardinality (PK vs. non-unique column), which columns
    are safe to assume unique, and what's indexed.

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
                    WHERE table_schema = 'public' AND table_name = $1
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

                pk_rows = await asyncio.wait_for(
                    connection.fetch(
                        """
                        SELECT kcu.column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                            ON tc.constraint_name = kcu.constraint_name
                            AND tc.table_schema = kcu.table_schema
                        WHERE tc.table_schema = 'public' AND tc.table_name = $1
                            AND tc.constraint_type = 'PRIMARY KEY'
                        ORDER BY kcu.ordinal_position
                        """,
                        table_name,
                    ),
                    timeout=15.0,
                )
                pk_cols = [r["column_name"] for r in pk_rows]

                unique_rows = await asyncio.wait_for(
                    connection.fetch(
                        """
                        SELECT tc.constraint_name,
                               array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS cols
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                            ON tc.constraint_name = kcu.constraint_name
                            AND tc.table_schema = kcu.table_schema
                        WHERE tc.table_schema = 'public' AND tc.table_name = $1
                            AND tc.constraint_type = 'UNIQUE'
                        GROUP BY tc.constraint_name
                        """,
                        table_name,
                    ),
                    timeout=15.0,
                )

                index_rows = await asyncio.wait_for(
                    connection.fetch(
                        "SELECT indexname, indexdef FROM pg_indexes "
                        "WHERE schemaname = 'public' AND tablename = $1 "
                        "ORDER BY indexname",
                        table_name,
                    ),
                    timeout=15.0,
                )

                result_lines.append("")
                result_lines.append(
                    f"Primary key: {', '.join(pk_cols) if pk_cols else '(none)'}"
                )

                if unique_rows:
                    result_lines.append("Unique constraints:")
                    for r in unique_rows:
                        result_lines.append(f"  - ({', '.join(r['cols'])})")
                else:
                    result_lines.append("Unique constraints: (none)")

                if index_rows:
                    result_lines.append("Indexes:")
                    for r in index_rows:
                        result_lines.append(f"  - {r['indexname']}: {r['indexdef']}")
                else:
                    result_lines.append("Indexes: (none)")
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


def _safe_ident(identifier: str) -> str:
    """
    Safely quote a SQL identifier (table name, column name) to prevent injection.
    Only allows alphanumeric characters and underscores.
    """
    import re
    if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", identifier):
        raise ValueError(f"Invalid identifier: {identifier}")
    return f'"{identifier}"'


@mcp.tool()
async def sample_table_data(
    ctx: Context,
    table_name: str,
    column_name: str | None = None,
    sample_limit: int = 5,
) -> str:
    """
    Explore actual data inside a table. Use this BEFORE writing any query
    to understand what values exist in the database.

    Two modes:
    - Without column_name: Returns sample rows from the table so you can see
      what the data looks like, along with the total row count.
    - With column_name: Returns all distinct values in that column (up to 50)
      so you know exactly what values exist to filter on.

    Args:
        table_name: Name of the table to explore
        column_name: Optional specific column to get distinct values for
        sample_limit: Number of sample rows to return (default 5, max 20)

    Returns:
        Formatted data exploration results
    """
    sample_limit = min(max(sample_limit, 1), 20)

    try:
        db_context = ctx.request_context.lifespan_context
        pool = db_context.pool

        async with pool.acquire() as connection:
            # Verify the table exists in public schema
            table_exists = await asyncio.wait_for(
                connection.fetchval(
                    """
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = $1
                    )
                    """,
                    table_name,
                ),
                timeout=10.0,
            )
            if not table_exists:
                return f"Table '{table_name}' not found in the database."

            result_lines = []
            safe_table = _safe_ident(table_name)

            # Row count: use the planner's row estimate (instant, from table
            # statistics) instead of always running a full-table COUNT(*),
            # which would be a full scan on large tables and risks timing out
            # exactly on the real-world databases this tool needs to handle.
            # Only fall back to an exact COUNT(*) for small tables, where the
            # scan is cheap and the estimate is least reliable.
            estimate = await asyncio.wait_for(
                connection.fetchval(
                    "SELECT reltuples::bigint FROM pg_class WHERE oid = to_regclass($1)",
                    f"public.{table_name}",
                ),
                timeout=10.0,
            ) or 0

            if estimate < 10000:
                row_count = await asyncio.wait_for(
                    connection.fetchval(f"SELECT COUNT(*) FROM {safe_table}"),
                    timeout=15.0,
                )
                result_lines.append(f"Table '{table_name}' has {row_count} total rows.\n")
            else:
                result_lines.append(
                    f"Table '{table_name}' has ~{estimate} rows (estimated from table "
                    f"statistics; exact COUNT(*) skipped for performance on large tables).\n"
                )

            if column_name:
                # Verify column exists
                col_exists = await asyncio.wait_for(
                    connection.fetchval(
                        """
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = $1 AND column_name = $2
                        )
                        """,
                        table_name,
                        column_name,
                    ),
                    timeout=10.0,
                )
                if not col_exists:
                    return f"Column '{column_name}' not found in table '{table_name}'."

                safe_col = _safe_ident(column_name)

                # Get distinct values for the column
                distinct_rows = await asyncio.wait_for(
                    connection.fetch(
                        f"SELECT DISTINCT {safe_col} FROM {safe_table} "
                        f"WHERE {safe_col} IS NOT NULL "
                        f"ORDER BY {safe_col} LIMIT 50"
                    ),
                    timeout=15.0,
                )

                distinct_count = await asyncio.wait_for(
                    connection.fetchval(
                        f"SELECT COUNT(DISTINCT {safe_col}) FROM {safe_table} "
                        f"WHERE {safe_col} IS NOT NULL"
                    ),
                    timeout=15.0,
                )

                result_lines.append(
                    f"Distinct values in '{column_name}' "
                    f"({distinct_count} unique values):"
                )
                for row in distinct_rows:
                    result_lines.append(f"  - {row[0]}")
                if distinct_count > 50:
                    result_lines.append(f"  ... and {distinct_count - 50} more")
            else:
                # Sample rows from the table
                sample_rows = await asyncio.wait_for(
                    connection.fetch(
                        f"SELECT * FROM {safe_table} LIMIT {sample_limit}"
                    ),
                    timeout=15.0,
                )

                if not sample_rows:
                    result_lines.append("Table is empty.")
                else:
                    headers = list(sample_rows[0].keys())
                    result_lines.append(
                        f"Sample of {len(sample_rows)} rows "
                        f"(columns: {', '.join(headers)}):\n"
                    )
                    result_lines.append(" | ".join(headers))
                    result_lines.append("-" * (len(" | ".join(headers))))
                    for row in sample_rows:
                        result_lines.append(
                            " | ".join(str(v) for v in row.values())
                        )

            return "\n".join(result_lines)

    except asyncio.TimeoutError:
        return "Data exploration error: Query timeout"
    except Exception as e:
        logger.error(f"Data exploration error: {e}")
        return f"Data exploration error: {str(e)}"


@mcp.tool()
async def get_table_relationships(ctx: Context, table_name: str | None = None) -> str:
    """
    Discover foreign key relationships between tables.
    Use this BEFORE writing JOINs to understand how tables connect to each other.

    Args:
        table_name: Optional specific table to get relationships for.
                    If omitted, returns ALL relationships in the database.

    Returns:
        Formatted list of foreign key relationships showing
        source_table.column → target_table.column
    """
    try:
        db_context = ctx.request_context.lifespan_context
        pool = db_context.pool

        async with pool.acquire() as connection:
            query = """
                SELECT
                    tc.table_name AS source_table,
                    kcu.column_name AS source_column,
                    ccu.table_name AS target_table,
                    ccu.column_name AS target_column,
                    tc.constraint_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
            """
            params = []

            if table_name:
                query += """
                    AND (tc.table_name = $1 OR ccu.table_name = $1)
                """
                params.append(table_name)

            query += " ORDER BY tc.table_name, kcu.column_name"

            if params:
                rows = await asyncio.wait_for(
                    connection.fetch(query, *params), timeout=15.0
                )
            else:
                rows = await asyncio.wait_for(
                    connection.fetch(query), timeout=15.0
                )

            if not rows:
                if table_name:
                    return f"No foreign key relationships found involving table '{table_name}'."
                return "No foreign key relationships found in the database."

            result_lines = []
            if table_name:
                result_lines.append(
                    f"Foreign key relationships involving '{table_name}':"
                )
            else:
                result_lines.append("All foreign key relationships:")

            result_lines.append("")

            for row in rows:
                result_lines.append(
                    f"  {row['source_table']}.{row['source_column']} → "
                    f"{row['target_table']}.{row['target_column']}  "
                    f"(constraint: {row['constraint_name']})"
                )

            return "\n".join(result_lines)

    except asyncio.TimeoutError:
        return "Relationship query error: Query timeout"
    except Exception as e:
        logger.error(f"Relationship query error: {e}")
        return f"Relationship query error: {str(e)}"


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
