"""
Query history models for the Universal Database Chat Assistant.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class QueryHistoryEntry(BaseModel):
    """Query history entry."""
    
    id: str
    database_id: str
    database_name: str
    query: str
    sql_query: str
    success: bool
    error_message: Optional[str]
    row_count: Optional[int]
    execution_time_ms: Optional[float]
    timestamp: datetime
    
    class Config:
        from_attributes = True


class QueryHistoryResponse(BaseModel):
    """Paginated query history response."""
    
    queries: List[QueryHistoryEntry]
    total: int
    limit: int
    offset: int


class QueryHistoryExportRequest(BaseModel):
    """Request model for exporting query history."""
    
    format: str = Field(..., pattern="^(json|csv)$", description="Export format")
    database_id: Optional[str] = Field(None, description="Filter by database ID")
