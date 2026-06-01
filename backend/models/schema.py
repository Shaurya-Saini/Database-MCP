"""
Database schema models for the Universal Database Chat Assistant.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ColumnInfo(BaseModel):
    """Database column information."""
    
    name: str = Field(..., description="Column name")
    type: str = Field(..., description="Column data type")
    nullable: bool = Field(..., description="Whether column allows NULL values")
    primary_key: bool = Field(..., description="Whether column is a primary key")
    foreign_key: Optional[str] = Field(None, description="Foreign key reference")
    default_value: Optional[str] = Field(None, description="Default value")
    
    class Config:
        from_attributes = True


class TableInfo(BaseModel):
    """Database table information."""
    
    name: str = Field(..., description="Table name")
    schema: str = Field(default="public", description="Schema name")
    columns: List[ColumnInfo] = Field(..., description="Table columns")
    row_count: Optional[int] = Field(None, description="Approximate row count")
    
    class Config:
        from_attributes = True


class DatabaseSchemaResponse(BaseModel):
    """Database schema response."""
    
    tables: List[TableInfo] = Field(..., description="Database tables")
    cached_at: datetime = Field(..., description="When schema was cached")
    database_name: str = Field(..., description="Database name")
    
    class Config:
        from_attributes = True
