"""
Application configuration models for the Universal Database Chat Assistant.
"""
from typing import List
from pydantic import BaseModel, Field


class LLMProviderConfig(BaseModel):
    """LLM provider configuration."""
    
    provider: str = Field(..., description="Provider name")
    models: List[str] = Field(..., description="Supported models")
    requires_api_key: bool = Field(..., description="Whether API key is required")
    supports_streaming: bool = Field(..., description="Whether streaming is supported")
    supports_tools: bool = Field(..., description="Whether tool calling is supported")


class AppConfig(BaseModel):
    """Application configuration."""
    
    supported_llm_providers: List[LLMProviderConfig] = Field(..., description="Available LLM providers")
    default_result_limit: int = Field(default=1000, description="Default query result limit")
    max_result_limit: int = Field(default=10000, description="Maximum query result limit")
    query_timeout_seconds: int = Field(default=30, description="Database query timeout")
    llm_timeout_seconds: int = Field(default=90, description="LLM API timeout")
    schema_cache_ttl_seconds: int = Field(default=300, description="Schema cache TTL")


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str = Field(..., description="Service status")
    platform: str = Field(..., description="Platform information")
    database_connections: int = Field(..., description="Number of active database connections")
    mcp_server_status: str = Field(..., description="MCP server status")
