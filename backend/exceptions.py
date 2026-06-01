"""
Custom exception classes for the Universal Database Chat Assistant.
"""
from typing import List, Optional


class DatabaseConnectionError(Exception):
    """Base class for database connection errors."""
    
    def __init__(self, message: str, error_code: str, troubleshooting: List[str]):
        self.message = message
        self.error_code = error_code
        self.troubleshooting = troubleshooting
        super().__init__(self.message)


class LLMProviderError(Exception):
    """Base class for LLM provider errors."""
    
    def __init__(
        self,
        provider: str,
        message: str,
        error_code: str,
        retry_after: Optional[int] = None
    ):
        self.provider = provider
        self.message = message
        self.error_code = error_code
        self.retry_after = retry_after
        super().__init__(self.message)


class QueryExecutionError(Exception):
    """Base class for query execution errors."""
    
    def __init__(self, message: str, sql_query: Optional[str], error_code: str):
        self.message = message
        self.sql_query = sql_query
        self.error_code = error_code
        super().__init__(self.message)


class SecurityError(Exception):
    """Base class for security-related errors."""
    
    def __init__(self, message: str, blocked_operation: str):
        self.message = message
        self.blocked_operation = blocked_operation
        super().__init__(self.message)


class ValidationError(Exception):
    """Base class for validation errors."""
    
    def __init__(self, message: str, field: str, value: any):
        self.message = message
        self.field = field
        self.value = value
        super().__init__(self.message)
