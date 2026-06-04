"""
Main FastAPI application for Universal Database Chat Assistant.
"""

from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
import os
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager
from typing import Optional
import platform

from models import *
from services.credential_manager import CredentialManager
from services.database_manager import DatabaseManager
from services.query_executor import QueryExecutor
from services.query_validator import QueryValidator
from services.history_service import HistoryService
from services.saved_queries_service import SavedQueriesService
from llm_providers import (
    OpenAIProvider,
    AnthropicProvider,
    GroqProvider,
    GeminiProvider
)
from exceptions import (
    DatabaseConnectionError,
    LLMProviderError,
    QueryExecutionError,
    SecurityError
)


# Global service instances
credential_manager = None
database_manager = None
query_executor = None
history_service = None
saved_queries_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    # Startup
    global credential_manager, database_manager, query_executor, history_service, saved_queries_service
    
    # Initialize credential manager
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise ValueError("ENCRYPTION_KEY environment variable not set")
    
    credential_manager = CredentialManager(encryption_key)
    
    # Initialize database manager
    config_db_path = os.getenv("CONFIG_DB_PATH", "./config.db")
    database_manager = DatabaseManager(
        config_db_path=config_db_path,
        credential_manager=credential_manager,
        pool_min_size=int(os.getenv("DB_POOL_MIN_SIZE", "2")),
        pool_max_size=int(os.getenv("DB_POOL_MAX_SIZE", "10")),
        schema_cache_ttl=int(os.getenv("SCHEMA_CACHE_TTL_SECONDS", "300"))
    )
    await database_manager.initialize()
    
    # Initialize query validator and executor
    query_validator = QueryValidator(allow_dml=False)
    
    # Resolve MCP server script path
    mcp_server_script = os.getenv(
        "MCP_SERVER_SCRIPT",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_server.py")
    )
    
    query_executor = QueryExecutor(
        database_manager=database_manager,
        query_validator=query_validator,
        default_result_limit=int(os.getenv("DEFAULT_RESULT_LIMIT", "1000")),
        query_timeout=int(os.getenv("QUERY_TIMEOUT_SECONDS", "30")),
        mcp_server_script=mcp_server_script,
    )
    
    # Initialize history service
    history_db_path = os.getenv("HISTORY_DB_PATH", "./history.db")
    history_service = HistoryService(
        history_db_path=history_db_path,
        max_history=1000
    )
    await history_service.initialize()
    
    # Initialize saved queries service
    saved_queries_db_path = os.getenv("SAVED_QUERIES_DB_PATH", "./saved_queries.db")
    saved_queries_service = SavedQueriesService(saved_queries_db_path)
    await saved_queries_service.initialize()
    
    yield
    
    # Shutdown
    if database_manager:
        await database_manager.close_all_pools()


# Create FastAPI app
app = FastAPI(
    title="Universal Database Chat Assistant",
    description="Natural language interface for PostgreSQL databases",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(DatabaseConnectionError)
async def database_error_handler(request: Request, exc: DatabaseConnectionError):
    """Handle database connection errors."""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "Database Connection Failed",
            "message": exc.message,
            "error_code": exc.error_code,
            "troubleshooting": exc.troubleshooting
        }
    )


@app.exception_handler(LLMProviderError)
async def llm_error_handler(request: Request, exc: LLMProviderError):
    """Handle LLM provider errors."""
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "LLM Provider Error",
            "provider": exc.provider,
            "message": exc.message,
            "error_code": exc.error_code,
            "retry_after": exc.retry_after
        }
    )


@app.exception_handler(QueryExecutionError)
async def query_error_handler(request: Request, exc: QueryExecutionError):
    """Handle query execution errors."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Query Execution Failed",
            "message": exc.message,
            "error_code": exc.error_code,
            "sql_query": exc.sql_query
        }
    )


@app.exception_handler(SecurityError)
async def security_error_handler(request: Request, exc: SecurityError):
    """Handle security errors."""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "Security Error",
            "message": exc.message,
            "blocked_operation": exc.blocked_operation
        }
    )


# Health and configuration endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        platform=platform.system(),
        database_connections=len(database_manager.connection_pools),
        mcp_server_status="not_implemented"
    )


@app.get("/config", response_model=AppConfig)
async def get_config():
    """Get application configuration."""
    return AppConfig(
        supported_llm_providers=[
            LLMProviderConfig(
                provider="openai",
                models=["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
                requires_api_key=True,
                supports_streaming=True,
                supports_tools=True
            ),
            LLMProviderConfig(
                provider="anthropic",
                models=["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
                requires_api_key=True,
                supports_streaming=False,
                supports_tools=True
            ),
            LLMProviderConfig(
                provider="groq",
                models=[
                    "meta-llama/llama-4-scout-17b-16e-instruct",
                    "meta-llama/llama-4-maverick-17b-128e-instruct",
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                    "qwen-2.5-32b",
                ],
                requires_api_key=True,
                supports_streaming=False,
                supports_tools=True
            ),
            LLMProviderConfig(
                provider="gemini",
                models=["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
                requires_api_key=True,
                supports_streaming=False,
                supports_tools=True
            )
        ],
        default_result_limit=int(os.getenv("DEFAULT_RESULT_LIMIT", "1000")),
        max_result_limit=int(os.getenv("MAX_RESULT_LIMIT", "10000")),
        query_timeout_seconds=int(os.getenv("QUERY_TIMEOUT_SECONDS", "30")),
        llm_timeout_seconds=int(os.getenv("LLM_TIMEOUT_SECONDS", "90")),
        schema_cache_ttl_seconds=int(os.getenv("SCHEMA_CACHE_TTL_SECONDS", "300"))
    )


# Database management endpoints
@app.post("/databases", response_model=DatabaseConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_database_connection(connection: DatabaseConnectionCreate):
    """Create a new database connection."""
    return await database_manager.add_connection(connection)


@app.get("/databases", response_model=list[DatabaseConnectionResponse])
async def list_database_connections():
    """List all database connections."""
    return await database_manager.list_connections()


@app.get("/databases/{connection_id}", response_model=DatabaseConnectionResponse)
async def get_database_connection(connection_id: str):
    """Get a specific database connection."""
    connection = await database_manager.get_connection(connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection


@app.put("/databases/{connection_id}", response_model=DatabaseConnectionResponse)
async def update_database_connection(connection_id: str, update: DatabaseConnectionUpdate):
    """Update a database connection."""
    return await database_manager.update_connection(connection_id, update)


@app.delete("/databases/{connection_id}")
async def delete_database_connection(connection_id: str):
    """Delete a database connection."""
    deleted = await database_manager.delete_connection(connection_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"success": True, "message": "Connection deleted"}


@app.post("/databases/{connection_id}/test", response_model=DatabaseTestResponse)
async def test_database_connection(connection_id: str):
    """Test a database connection."""
    return await database_manager.test_connection(connection_id)


@app.get("/databases/{connection_id}/schema", response_model=DatabaseSchemaResponse)
async def get_database_schema(connection_id: str):
    """Get database schema."""
    return await database_manager.get_schema(connection_id)


@app.post("/databases/{connection_id}/refresh-schema", response_model=DatabaseSchemaResponse)
async def refresh_database_schema(connection_id: str):
    """Refresh database schema cache."""
    return await database_manager.get_schema(connection_id, refresh=True)


# Query execution endpoint
@app.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest):
    """Execute a natural language query."""
    # Create LLM provider based on request
    if request.llm_provider == "openai":
        llm_provider = OpenAIProvider(api_key=request.api_key, model=request.llm_model)
    elif request.llm_provider == "anthropic":
        llm_provider = AnthropicProvider(api_key=request.api_key, model=request.llm_model)
    elif request.llm_provider == "groq":
        llm_provider = GroqProvider(api_key=request.api_key, model=request.llm_model)
    elif request.llm_provider == "gemini":
        llm_provider = GeminiProvider(api_key=request.api_key, model=request.llm_model)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported LLM provider: {request.llm_provider}")
    
    # Execute query
    response = await query_executor.execute_query(request, llm_provider)
    
    # Save to history
    connection = await database_manager.get_connection(request.database_id)
    if connection:
        await history_service.add_entry(
            database_id=request.database_id,
            database_name=connection.database,
            query=request.query,
            sql_query=response.sql_query,
            success=response.error is None,
            row_count=response.row_count if response.error is None else None,
            execution_time_ms=response.execution_time_ms if response.error is None else None,
            error_message=response.error
        )
    
    return response


# Query history endpoints
@app.get("/history", response_model=QueryHistoryResponse)
async def get_query_history(
    database_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get query history with pagination."""
    return await history_service.get_history(database_id, limit, offset)


@app.get("/history/search", response_model=list[QueryHistoryEntry])
async def search_query_history(q: str, database_id: Optional[str] = None):
    """Search query history."""
    return await history_service.search_history(q, database_id)


@app.delete("/history")
async def clear_query_history(database_id: Optional[str] = None):
    """Clear query history."""
    deleted_count = await history_service.clear_history(database_id)
    return {"success": True, "deleted_count": deleted_count}


@app.get("/history/export")
async def export_query_history(format: str = "json", database_id: Optional[str] = None):
    """Export query history."""
    if format not in ["json", "csv"]:
        raise HTTPException(status_code=400, detail="Format must be 'json' or 'csv'")
    
    data = await history_service.export_history(format, database_id)
    
    media_type = "application/json" if format == "json" else "text/csv"
    filename = f"query_history.{format}"
    
    return StreamingResponse(
        iter([data]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Saved queries endpoints
@app.get("/saved-queries", response_model=list[SavedQueryResponse])
async def list_saved_queries(category: Optional[str] = None, tag: Optional[str] = None):
    """List all saved queries."""
    return await saved_queries_service.list_queries(category, tag)


@app.post("/saved-queries", response_model=SavedQueryResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_query(query: SavedQueryCreate):
    """Create a new saved query."""
    return await saved_queries_service.create_query(query)


@app.get("/saved-queries/{query_id}", response_model=SavedQueryResponse)
async def get_saved_query(query_id: str):
    """Get a specific saved query."""
    query = await saved_queries_service.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    return query


@app.put("/saved-queries/{query_id}", response_model=SavedQueryResponse)
async def update_saved_query(query_id: str, update: SavedQueryUpdate):
    """Update a saved query."""
    return await saved_queries_service.update_query(query_id, update)


@app.delete("/saved-queries/{query_id}")
async def delete_saved_query(query_id: str):
    """Delete a saved query."""
    deleted = await saved_queries_service.delete_query(query_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Query not found")
    return {"success": True}


@app.post("/saved-queries/import")
async def import_saved_queries(queries_json: str):
    """Import saved queries from JSON."""
    imported_count, errors = await saved_queries_service.import_queries(queries_json)
    return {"imported_count": imported_count, "errors": errors}


@app.get("/saved-queries/export")
async def export_saved_queries():
    """Export saved queries to JSON."""
    data = await saved_queries_service.export_queries()
    
    return StreamingResponse(
        iter([data]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=saved_queries.json"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=True
    )
