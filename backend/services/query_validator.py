"""
Query validator for SQL security validation.
"""
import re
from typing import List
from exceptions import SecurityError


class QueryValidator:
    """Validates SQL queries for security."""
    
    # Dangerous SQL keywords that should be blocked
    DANGEROUS_KEYWORDS = [
        r'\bDROP\b',
        r'\bTRUNCATE\b',
        r'\bALTER\b',
        r'\bCREATE\b',
        r'\bGRANT\b',
        r'\bREVOKE\b',
        r'\bEXEC\b',
        r'\bEXECUTE\b'
    ]
    
    # DML operations blocked by default
    DML_KEYWORDS = [
        r'\bINSERT\b',
        r'\bUPDATE\b',
        r'\bDELETE\b'
    ]
    
    def __init__(self, allow_dml: bool = False):
        """
        Initialize query validator.
        
        Args:
            allow_dml: Whether to allow DML operations (INSERT, UPDATE, DELETE)
        """
        self.allow_dml = allow_dml
    
    def validate(self, sql_query: str) -> None:
        """
        Validate SQL query for dangerous operations.
        
        Args:
            sql_query: SQL query to validate
            
        Raises:
            SecurityError: If query contains dangerous operations
        """
        query_upper = sql_query.upper()
        
        # Check for dangerous DDL operations
        for pattern in self.DANGEROUS_KEYWORDS:
            if re.search(pattern, query_upper, re.IGNORECASE):
                keyword = re.search(pattern, query_upper, re.IGNORECASE).group()
                raise SecurityError(
                    message=f"Query blocked: {keyword} operations are not allowed",
                    blocked_operation=keyword
                )
        
        # Check for DML operations if not allowed
        if not self.allow_dml:
            for pattern in self.DML_KEYWORDS:
                if re.search(pattern, query_upper, re.IGNORECASE):
                    keyword = re.search(pattern, query_upper, re.IGNORECASE).group()
                    raise SecurityError(
                        message=f"Query blocked: {keyword} operations are not allowed by default",
                        blocked_operation=keyword
                    )
        
        # Check for SQL injection patterns
        self._check_injection_patterns(sql_query)
    
    def _check_injection_patterns(self, sql_query: str) -> None:
        """Check for common SQL injection patterns."""
        injection_patterns = [
            r";\s*DROP",
            r";\s*DELETE",
            r"--\s*$",  # SQL comments at end
            r"/\*.*\*/",  # Block comments
            r"UNION\s+SELECT",  # Union-based injection
            r"OR\s+1\s*=\s*1",  # Always-true conditions
            r"OR\s+'1'\s*=\s*'1'"
        ]
        
        for pattern in injection_patterns:
            if re.search(pattern, sql_query, re.IGNORECASE):
                raise SecurityError(
                    message="Query blocked: potential SQL injection detected",
                    blocked_operation="SQL_INJECTION"
                )
