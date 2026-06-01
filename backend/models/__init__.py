"""
Pydantic models for the Universal Database Chat Assistant.
"""
from .database import (
    DatabaseConnectionCreate,
    DatabaseConnectionUpdate,
    DatabaseConnectionResponse,
    DatabaseTestResponse,
)
from .query import QueryRequest, QueryResponse
from .history import (
    QueryHistoryEntry,
    QueryHistoryResponse,
    QueryHistoryExportRequest,
)
from .saved_query import (
    SavedQueryCreate,
    SavedQueryUpdate,
    SavedQueryResponse,
    SavedQueryImportRequest,
)
from .schema import ColumnInfo, TableInfo, DatabaseSchemaResponse
from .config import LLMProviderConfig, AppConfig, HealthResponse

__all__ = [
    # Database models
    "DatabaseConnectionCreate",
    "DatabaseConnectionUpdate",
    "DatabaseConnectionResponse",
    "DatabaseTestResponse",
    # Query models
    "QueryRequest",
    "QueryResponse",
    # History models
    "QueryHistoryEntry",
    "QueryHistoryResponse",
    "QueryHistoryExportRequest",
    # Saved query models
    "SavedQueryCreate",
    "SavedQueryUpdate",
    "SavedQueryResponse",
    "SavedQueryImportRequest",
    # Schema models
    "ColumnInfo",
    "TableInfo",
    "DatabaseSchemaResponse",
    # Config models
    "LLMProviderConfig",
    "AppConfig",
    "HealthResponse",
]
