"""
Pydantic models for the Universal Database Chat Assistant.

This module defines all request and response models used throughout the application.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================================================
# Database Connection Models
# ============================================================================

class DatabaseConnectionCreate(BaseModel):
    """Request model for creating a database connection."""
    name: str = Field(..., min_length=1, max_length=100, description="Connection name")
    host: str = Field(..., min_length=1, description="Database host address")
    port: int = Field(default=5432, ge=1, le=65535, description="Database port")
    database: str = Field(..., min_length=1, description="Database name")
    username: str = Field(..., min_length=1, description="Database username")
    password: str = Field(..., min_length=1, description="Database password")
    ssl_enabled: bool = Field(default=False, description="Enable SSL/TLS connection")
    ssl_cert_path: Optional[str] = Field(None, description="Path to SSL certificate file")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Production DB",
                "host": "localhost",
                "port": 5432,
                "database": "mydb",
                "username": "dbuser",
                "password": "securepassword",
                "ssl_enabled": False,
                "ssl_cert_path": None
            }
        }


class DatabaseConnectionResponse(BaseModel):
    """Response model for database connection."""
    id: str = Field(..., description="Unique connection identifier")
    name: str = Field(..., description="Connection name")
    host: str = Field(..., description="Database host address")
    port: int = Field(..., description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Database username")
    ssl_enabled: bool = Field(..., description="SSL/TLS enabled status")
    ssl_cert_path: Optional[str] = Field(None, description="Path to SSL certificate file")
    status: str = Field(..., description="Connection status: connected, disconnected, error")
    created_at: datetime = Field(..., description="Connection creation timestamp")
    updated_at: datetime = Field(..., description="Connection last update timestamp")

    class Config:
        # Password is never returned in responses
        json_schema_extra = {
            "example": {
                "id": "conn_123abc",
                "name": "Production DB",
                "host": "localhost",
                "port": 5432,
                "database": "mydb",
                "username": "dbuser",
                "ssl_enabled": False,
                "ssl_cert_path": None,
                "status": "connected",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }


# ============================================================================
# Query Execution Models
# ============================================================================

class QueryRequest(BaseModel):
    """Request model for query execution."""
    database_id: str = Field(..., description="Database connection ID to query")
    query: str = Field(..., min_length=1, max_length=5000, description="Natural language query")
    llm_provider: str = Field(
        ..., 
        pattern="^(openai|anthropic|google|ollama|groq)$",
        description="LLM provider to use"
    )
    llm_model: str = Field(..., description="Specific model to use from the provider")
    api_key: str = Field(..., description="API key for the LLM provider (not stored)")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        None, 
        description="Previous conversation messages for context"
    )
    result_limit: Optional[int] = Field(
        default=1000, 
        ge=1, 
        le=10000,
        description="Maximum number of rows to return"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "database_id": "conn_123abc",
                "query": "Show me the top 10 customers by total orders",
                "llm_provider": "openai",
                "llm_model": "gpt-4o",
                "api_key": "sk-...",
                "conversation_history": None,
                "result_limit": 1000
            }
        }


class QueryResponse(BaseModel):
    """Response model for query execution."""
    natural_language_response: str = Field(..., description="Natural language explanation of results")
    sql_query: str = Field(..., description="Generated SQL query")
    results: List[Dict[str, Any]] = Field(..., description="Query result rows")
    row_count: int = Field(..., description="Number of rows returned")
    execution_time_ms: float = Field(..., description="Query execution time in milliseconds")
    truncated: bool = Field(..., description="Whether results were truncated due to limit")
    error: Optional[str] = Field(None, description="Error message if query failed")

    class Config:
        json_schema_extra = {
            "example": {
                "natural_language_response": "Here are the top 10 customers by total orders...",
                "sql_query": "SELECT customer_name, COUNT(*) as order_count FROM orders GROUP BY customer_name ORDER BY order_count DESC LIMIT 10",
                "results": [
                    {"customer_name": "Acme Corp", "order_count": 150},
                    {"customer_name": "TechStart Inc", "order_count": 120}
                ],
                "row_count": 10,
                "execution_time_ms": 45.2,
                "truncated": False,
                "error": None
            }
        }


# ============================================================================
# Query History Models
# ============================================================================

class QueryHistoryEntry(BaseModel):
    """Query history entry."""
    id: str = Field(..., description="Unique history entry identifier")
    database_id: str = Field(..., description="Database connection ID used")
    database_name: str = Field(..., description="Database connection name")
    query: str = Field(..., description="Natural language query")
    sql_query: str = Field(..., description="Generated SQL query")
    success: bool = Field(..., description="Whether query executed successfully")
    error_message: Optional[str] = Field(None, description="Error message if query failed")
    row_count: Optional[int] = Field(None, description="Number of rows returned")
    execution_time_ms: Optional[float] = Field(None, description="Query execution time in milliseconds")
    timestamp: datetime = Field(..., description="Query execution timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "hist_456def",
                "database_id": "conn_123abc",
                "database_name": "Production DB",
                "query": "Show me all active users",
                "sql_query": "SELECT * FROM users WHERE status = 'active'",
                "success": True,
                "error_message": None,
                "row_count": 42,
                "execution_time_ms": 23.5,
                "timestamp": "2024-01-15T14:30:00Z"
            }
        }


class QueryHistoryResponse(BaseModel):
    """Paginated query history response."""
    queries: List[QueryHistoryEntry] = Field(..., description="List of query history entries")
    total: int = Field(..., description="Total number of history entries")
    limit: int = Field(..., description="Number of entries per page")
    offset: int = Field(..., description="Offset for pagination")

    class Config:
        json_schema_extra = {
            "example": {
                "queries": [],
                "total": 150,
                "limit": 100,
                "offset": 0
            }
        }


# ============================================================================
# Saved Query Models
# ============================================================================

class SavedQueryCreate(BaseModel):
    """Request model for creating a saved query."""
    name: str = Field(..., min_length=1, max_length=200, description="Query name")
    description: Optional[str] = Field(None, max_length=1000, description="Query description")
    query: str = Field(..., min_length=1, max_length=5000, description="Natural language query")
    category: Optional[str] = Field(None, max_length=100, description="Query category")
    tags: List[str] = Field(default_factory=list, description="Query tags")
    database_id: Optional[str] = Field(None, description="Associated database connection ID")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Monthly Sales Report",
                "description": "Get total sales for the current month",
                "query": "Show me total sales for this month",
                "category": "Reports",
                "tags": ["sales", "monthly", "reports"],
                "database_id": "conn_123abc"
            }
        }


class SavedQueryResponse(BaseModel):
    """Response model for saved query."""
    id: str = Field(..., description="Unique saved query identifier")
    name: str = Field(..., description="Query name")
    description: Optional[str] = Field(None, description="Query description")
    query: str = Field(..., description="Natural language query")
    category: Optional[str] = Field(None, description="Query category")
    tags: List[str] = Field(..., description="Query tags")
    database_id: Optional[str] = Field(None, description="Associated database connection ID")
    database_name: Optional[str] = Field(None, description="Associated database connection name")
    created_at: datetime = Field(..., description="Query creation timestamp")
    updated_at: datetime = Field(..., description="Query last update timestamp")
    use_count: int = Field(..., description="Number of times query has been executed")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "saved_789ghi",
                "name": "Monthly Sales Report",
                "description": "Get total sales for the current month",
                "query": "Show me total sales for this month",
                "category": "Reports",
                "tags": ["sales", "monthly", "reports"],
                "database_id": "conn_123abc",
                "database_name": "Production DB",
                "created_at": "2024-01-10T09:00:00Z",
                "updated_at": "2024-01-15T14:30:00Z",
                "use_count": 15
            }
        }


# ============================================================================
# Database Schema Models
# ============================================================================

class ColumnInfo(BaseModel):
    """Database column information."""
    name: str = Field(..., description="Column name")
    type: str = Field(..., description="Column data type")
    nullable: bool = Field(..., description="Whether column allows NULL values")
    primary_key: bool = Field(..., description="Whether column is a primary key")
    foreign_key: Optional[str] = Field(None, description="Foreign key reference if applicable")
    default_value: Optional[str] = Field(None, description="Default value for column")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "user_id",
                "type": "integer",
                "nullable": False,
                "primary_key": True,
                "foreign_key": None,
                "default_value": None
            }
        }


class TableInfo(BaseModel):
    """Database table information."""
    name: str = Field(..., description="Table name")
    schema: str = Field(default="public", description="Schema name")
    columns: List[ColumnInfo] = Field(..., description="List of table columns")
    row_count: Optional[int] = Field(None, description="Approximate number of rows in table")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "users",
                "schema": "public",
                "columns": [],
                "row_count": 1500
            }
        }


class DatabaseSchemaResponse(BaseModel):
    """Database schema response."""
    tables: List[TableInfo] = Field(..., description="List of database tables")
    cached_at: datetime = Field(..., description="When schema was cached")
    database_name: str = Field(..., description="Database name")

    class Config:
        json_schema_extra = {
            "example": {
                "tables": [],
                "cached_at": "2024-01-15T10:30:00Z",
                "database_name": "mydb"
            }
        }


# ============================================================================
# Configuration Models
# ============================================================================

class LLMProviderConfig(BaseModel):
    """LLM provider configuration."""
    provider: str = Field(..., description="Provider identifier")
    models: List[str] = Field(..., description="List of supported models")
    requires_api_key: bool = Field(..., description="Whether provider requires an API key")
    supports_streaming: bool = Field(..., description="Whether provider supports streaming responses")
    supports_tools: bool = Field(..., description="Whether provider supports tool/function calling")

    class Config:
        json_schema_extra = {
            "example": {
                "provider": "openai",
                "models": ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
                "requires_api_key": True,
                "supports_streaming": True,
                "supports_tools": True
            }
        }


class AppConfig(BaseModel):
    """Application configuration."""
    supported_llm_providers: List[LLMProviderConfig] = Field(..., description="List of supported LLM providers")
    default_result_limit: int = Field(default=1000, description="Default query result limit")
    max_result_limit: int = Field(default=10000, description="Maximum query result limit")
    query_timeout_seconds: int = Field(default=30, description="Database query timeout in seconds")
    llm_timeout_seconds: int = Field(default=90, description="LLM API call timeout in seconds")
    schema_cache_ttl_seconds: int = Field(default=300, description="Schema cache TTL in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "supported_llm_providers": [],
                "default_result_limit": 1000,
                "max_result_limit": 10000,
                "query_timeout_seconds": 30,
                "llm_timeout_seconds": 90,
                "schema_cache_ttl_seconds": 300
            }
        }
