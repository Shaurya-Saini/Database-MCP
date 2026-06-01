"""
Query history service for tracking executed queries.
"""
import aiosqlite
import uuid
import json
import csv
import io
from datetime import datetime
from typing import List, Optional
from models.history import QueryHistoryEntry, QueryHistoryResponse


class HistoryService:
    """Manages query history storage and retrieval."""
    
    def __init__(self, history_db_path: str, max_history: int = 1000):
        """
        Initialize history service.
        
        Args:
            history_db_path: Path to SQLite database for history
            max_history: Maximum number of history entries to keep
        """
        self.history_db_path = history_db_path
        self.max_history = max_history
    
    async def initialize(self):
        """Initialize the history database."""
        async with aiosqlite.connect(self.history_db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS query_history (
                    id TEXT PRIMARY KEY,
                    database_id TEXT NOT NULL,
                    database_name TEXT NOT NULL,
                    query TEXT NOT NULL,
                    sql_query TEXT NOT NULL,
                    success BOOLEAN NOT NULL,
                    error_message TEXT,
                    row_count INTEGER,
                    execution_time_ms REAL,
                    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_history_database 
                ON query_history(database_id)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_history_timestamp 
                ON query_history(timestamp DESC)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_history_query 
                ON query_history(query)
            """)
            
            await db.commit()
    
    async def add_entry(
        self,
        database_id: str,
        database_name: str,
        query: str,
        sql_query: str,
        success: bool,
        row_count: Optional[int] = None,
        execution_time_ms: Optional[float] = None,
        error_message: Optional[str] = None
    ) -> str:
        """
        Add a query to history.
        
        Args:
            database_id: Database connection ID
            database_name: Database name
            query: Natural language query
            sql_query: Generated SQL query
            success: Whether query succeeded
            row_count: Number of rows returned
            execution_time_ms: Execution time in milliseconds
            error_message: Error message if failed
            
        Returns:
            Entry ID
        """
        entry_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.history_db_path) as db:
            await db.execute("""
                INSERT INTO query_history 
                (id, database_id, database_name, query, sql_query, success, 
                 error_message, row_count, execution_time_ms, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                entry_id,
                database_id,
                database_name,
                query,
                sql_query,
                success,
                error_message,
                row_count,
                execution_time_ms,
                now.isoformat()
            ))
            await db.commit()
            
            # Enforce max history limit
            await self._enforce_limit(db)
        
        return entry_id
    
    async def get_history(
        self,
        database_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> QueryHistoryResponse:
        """
        Get query history with pagination.
        
        Args:
            database_id: Filter by database ID
            limit: Maximum number of entries
            offset: Offset for pagination
            
        Returns:
            Paginated history response
        """
        async with aiosqlite.connect(self.history_db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Build query
            if database_id:
                query = """
                    SELECT * FROM query_history 
                    WHERE database_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ? OFFSET ?
                """
                params = (database_id, limit, offset)
                count_query = "SELECT COUNT(*) FROM query_history WHERE database_id = ?"
                count_params = (database_id,)
            else:
                query = """
                    SELECT * FROM query_history 
                    ORDER BY timestamp DESC
                    LIMIT ? OFFSET ?
                """
                params = (limit, offset)
                count_query = "SELECT COUNT(*) FROM query_history"
                count_params = ()
            
            # Get entries
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
            
            # Get total count
            async with db.execute(count_query, count_params) as cursor:
                total = (await cursor.fetchone())[0]
            
            entries = [
                QueryHistoryEntry(
                    id=row["id"],
                    database_id=row["database_id"],
                    database_name=row["database_name"],
                    query=row["query"],
                    sql_query=row["sql_query"],
                    success=bool(row["success"]),
                    error_message=row["error_message"],
                    row_count=row["row_count"],
                    execution_time_ms=row["execution_time_ms"],
                    timestamp=datetime.fromisoformat(row["timestamp"])
                )
                for row in rows
            ]
            
            return QueryHistoryResponse(
                queries=entries,
                total=total,
                limit=limit,
                offset=offset
            )
    
    async def search_history(
        self,
        search_term: str,
        database_id: Optional[str] = None
    ) -> List[QueryHistoryEntry]:
        """
        Search query history.
        
        Args:
            search_term: Search term
            database_id: Filter by database ID
            
        Returns:
            Matching history entries
        """
        async with aiosqlite.connect(self.history_db_path) as db:
            db.row_factory = aiosqlite.Row
            
            if database_id:
                query = """
                    SELECT * FROM query_history 
                    WHERE database_id = ? AND (query LIKE ? OR sql_query LIKE ?)
                    ORDER BY timestamp DESC
                    LIMIT 100
                """
                params = (database_id, f"%{search_term}%", f"%{search_term}%")
            else:
                query = """
                    SELECT * FROM query_history 
                    WHERE query LIKE ? OR sql_query LIKE ?
                    ORDER BY timestamp DESC
                    LIMIT 100
                """
                params = (f"%{search_term}%", f"%{search_term}%")
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
            
            return [
                QueryHistoryEntry(
                    id=row["id"],
                    database_id=row["database_id"],
                    database_name=row["database_name"],
                    query=row["query"],
                    sql_query=row["sql_query"],
                    success=bool(row["success"]),
                    error_message=row["error_message"],
                    row_count=row["row_count"],
                    execution_time_ms=row["execution_time_ms"],
                    timestamp=datetime.fromisoformat(row["timestamp"])
                )
                for row in rows
            ]
    
    async def clear_history(self, database_id: Optional[str] = None) -> int:
        """
        Clear query history.
        
        Args:
            database_id: If provided, clear only for this database
            
        Returns:
            Number of entries deleted
        """
        async with aiosqlite.connect(self.history_db_path) as db:
            if database_id:
                cursor = await db.execute(
                    "DELETE FROM query_history WHERE database_id = ?",
                    (database_id,)
                )
            else:
                cursor = await db.execute("DELETE FROM query_history")
            
            await db.commit()
            return cursor.rowcount
    
    async def export_history(
        self,
        format: str,
        database_id: Optional[str] = None
    ) -> str:
        """
        Export query history.
        
        Args:
            format: Export format ('json' or 'csv')
            database_id: Filter by database ID
            
        Returns:
            Exported data as string
        """
        history = await self.get_history(database_id=database_id, limit=10000)
        
        if format == "json":
            return json.dumps(
                [entry.dict() for entry in history.queries],
                default=str,
                indent=2
            )
        elif format == "csv":
            output = io.StringIO()
            writer = csv.DictWriter(
                output,
                fieldnames=[
                    "id", "database_id", "database_name", "query", "sql_query",
                    "success", "error_message", "row_count", "execution_time_ms", "timestamp"
                ]
            )
            writer.writeheader()
            for entry in history.queries:
                writer.writerow(entry.dict())
            return output.getvalue()
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    async def _enforce_limit(self, db: aiosqlite.Connection):
        """Enforce maximum history limit."""
        await db.execute("""
            DELETE FROM query_history
            WHERE id IN (
                SELECT id FROM query_history
                ORDER BY timestamp DESC
                LIMIT -1 OFFSET ?
            )
        """, (self.max_history,))
        await db.commit()
