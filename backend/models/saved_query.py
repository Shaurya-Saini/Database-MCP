"""
Saved query models for the Universal Database Chat Assistant.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SavedQueryCreate(BaseModel):
    """Request model for creating a saved query."""
    
    name: str = Field(..., min_length=1, max_length=200, description="Query name")
    description: Optional[str] = Field(None, max_length=1000, description="Query description")
    query: str = Field(..., min_length=1, max_length=5000, description="Natural language query")
    category: Optional[str] = Field(None, max_length=100, description="Query category")
    tags: List[str] = Field(default_factory=list, description="Query tags")
    database_id: Optional[str] = Field(None, description="Associated database ID")


class SavedQueryUpdate(BaseModel):
    """Request model for updating a saved query."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    query: Optional[str] = Field(None, min_length=1, max_length=5000)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    database_id: Optional[str] = None


class SavedQueryResponse(BaseModel):
    """Response model for saved query."""
    
    id: str
    name: str
    description: Optional[str]
    query: str
    category: Optional[str]
    tags: List[str]
    database_id: Optional[str]
    database_name: Optional[str]
    created_at: datetime
    updated_at: datetime
    use_count: int
    
    class Config:
        from_attributes = True


class SavedQueryImportRequest(BaseModel):
    """Request model for importing saved queries."""
    
    queries: List[SavedQueryCreate]
