"""
Query execution models for the Universal Database Chat Assistant.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request model for query execution."""
    
    database_id: str = Field(..., description="Database connection ID")
    query: str = Field(..., min_length=1, max_length=5000, description="Natural language query")
    llm_provider: str = Field(..., pattern="^(openai|anthropic|google|ollama|groq)$", description="LLM provider")
    llm_model: str = Field(..., description="LLM model name")
    api_key: str = Field(..., description="LLM API key (not stored)")
    conversation_history: Optional[List[Dict[str, str]]] = Field(None, description="Previous conversation messages")
    result_limit: Optional[int] = Field(default=1000, ge=1, le=10000, description="Maximum number of rows to return")


class QueryResponse(BaseModel):
    """Response model for query execution."""
    
    natural_language_response: str = Field(..., description="Natural language explanation of results")
    sql_query: str = Field(..., description="Generated SQL query")
    results: List[Dict[str, Any]] = Field(..., description="Query results")
    row_count: int = Field(..., description="Number of rows returned")
    execution_time_ms: float = Field(..., description="Query execution time in milliseconds")
    truncated: bool = Field(..., description="Whether results were truncated")
    error: Optional[str] = Field(None, description="Error message if query failed")
