"""
Database connection models for the Universal Database Chat Assistant.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DatabaseConnectionCreate(BaseModel):
    """Request model for creating a database connection."""
    
    name: str = Field(..., min_length=1, max_length=100, description="Connection name")
    host: str = Field(..., min_length=1, description="Database host")
    port: int = Field(default=5432, ge=1, le=65535, description="Database port")
    database: str = Field(..., min_length=1, description="Database name")
    username: str = Field(..., min_length=1, description="Database username")
    password: str = Field(..., min_length=1, description="Database password")
    ssl_enabled: bool = Field(default=False, description="Enable SSL/TLS connection")
    ssl_cert_path: Optional[str] = Field(None, description="Path to SSL certificate")


class DatabaseConnectionUpdate(BaseModel):
    """Request model for updating a database connection."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    host: Optional[str] = Field(None, min_length=1)
    port: Optional[int] = Field(None, ge=1, le=65535)
    database: Optional[str] = Field(None, min_length=1)
    username: Optional[str] = Field(None, min_length=1)
    password: Optional[str] = Field(None, min_length=1)
    ssl_enabled: Optional[bool] = None
    ssl_cert_path: Optional[str] = None


class DatabaseConnectionResponse(BaseModel):
    """Response model for database connection."""
    
    id: str
    name: str
    host: str
    port: int
    database: str
    username: str
    ssl_enabled: bool
    ssl_cert_path: Optional[str]
    status: str  # "connected", "disconnected", "error"
    created_at: datetime
    updated_at: datetime
    
    class Config:
        # Password is never returned in responses
        from_attributes = True


class DatabaseTestResponse(BaseModel):
    """Response model for database connection test."""
    
    success: bool
    message: str
    latency_ms: Optional[float] = None
