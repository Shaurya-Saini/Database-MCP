"""
Saved queries service for managing bookmarked queries.
"""
import aiosqlite
import uuid
import json
from datetime import datetime
from typing import List, Optional
from models.saved_query import (
    SavedQueryCreate,
    SavedQueryUpdate,
    SavedQueryResponse
)


class SavedQueriesService:
    """Manages saved queries storage and retrieval."""
    
    def __init__(self, saved_queries_db_path: str):
        """
        Initialize saved queries service.
        
        Args:
            saved_queries_db_path: Path to SQLite database for saved queries
        """
        self.saved_queries_db_path = saved_queries_db_path
    
    async def initialize(self):
        """Initialize the saved queries database."""
        async with aiosqlite.connect(self.saved_queries_db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS saved_queries (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    query TEXT NOT NULL,
                    category TEXT,
                    database_id TEXT,
                    database_name TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    use_count INTEGER NOT NULL DEFAULT 0
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS query_tags (
                    query_id TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    PRIMARY KEY (query_id, tag),
                    FOREIGN KEY (query_id) REFERENCES saved_queries(id) ON DELETE CASCADE
                )
            """)
            
            # Create indexes
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_saved_category 
                ON saved_queries(category)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_saved_database 
                ON saved_queries(database_id)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_tags_query 
                ON query_tags(query_id)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_tags_tag 
                ON query_tags(tag)
            """)
            
            await db.commit()
    
    async def create_query(self, query: SavedQueryCreate) -> SavedQueryResponse:
        """
        Create a saved query.
        
        Args:
            query: Query to save
            
        Returns:
            Created saved query
        """
        query_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.saved_queries_db_path) as db:
            # Insert query
            await db.execute("""
                INSERT INTO saved_queries 
                (id, name, description, query, category, database_id, created_at, updated_at, use_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            """, (
                query_id,
                query.name,
                query.description,
                query.query,
                query.category,
                query.database_id,
                now.isoformat(),
                now.isoformat()
            ))
            
            # Insert tags
            for tag in query.tags:
                await db.execute("""
                    INSERT INTO query_tags (query_id, tag)
                    VALUES (?, ?)
                """, (query_id, tag))
            
            await db.commit()
        
        return await self.get_query(query_id)
    
    async def get_query(self, query_id: str) -> Optional[SavedQueryResponse]:
        """
        Get a saved query by ID.
        
        Args:
            query_id: Query ID
            
        Returns:
            Saved query or None if not found
        """
        async with aiosqlite.connect(self.saved_queries_db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Get query
            async with db.execute(
                "SELECT * FROM saved_queries WHERE id = ?",
                (query_id,)
            ) as cursor:
                row = await cursor.fetchone()
            
            if not row:
                return None
            
            # Get tags
            async with db.execute(
                "SELECT tag FROM query_tags WHERE query_id = ?",
                (query_id,)
            ) as cursor:
                tags = [tag_row["tag"] for tag_row in await cursor.fetchall()]
            
            return SavedQueryResponse(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                query=row["query"],
                category=row["category"],
                tags=tags,
                database_id=row["database_id"],
                database_name=row["database_name"],
                created_at=datetime.fromisoformat(row["created_at"]),
                updated_at=datetime.fromisoformat(row["updated_at"]),
                use_count=row["use_count"]
            )
    
    async def list_queries(
        self,
        category: Optional[str] = None,
        tag: Optional[str] = None
    ) -> List[SavedQueryResponse]:
        """
        List saved queries with optional filtering.
        
        Args:
            category: Filter by category
            tag: Filter by tag
            
        Returns:
            List of saved queries
        """
        async with aiosqlite.connect(self.saved_queries_db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Build query
            if category and tag:
                query = """
                    SELECT DISTINCT sq.* FROM saved_queries sq
                    JOIN query_tags qt ON sq.id = qt.query_id
                    WHERE sq.category = ? AND qt.tag = ?
                    ORDER BY sq.name
                """
                params = (category, tag)
            elif category:
                query = """
                    SELECT * FROM saved_queries 
                    WHERE category = ?
                    ORDER BY name
                """
                params = (category,)
            elif tag:
                query = """
                    SELECT DISTINCT sq.* FROM saved_queries sq
                    JOIN query_tags qt ON sq.id = qt.query_id
                    WHERE qt.tag = ?
                    ORDER BY sq.name
                """
                params = (tag,)
            else:
                query = "SELECT * FROM saved_queries ORDER BY name"
                params = ()
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
            
            # Get tags for each query
            queries = []
            for row in rows:
                async with db.execute(
                    "SELECT tag FROM query_tags WHERE query_id = ?",
                    (row["id"],)
                ) as cursor:
                    tags = [tag_row["tag"] for tag_row in await cursor.fetchall()]
                
                queries.append(SavedQueryResponse(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"],
                    query=row["query"],
                    category=row["category"],
                    tags=tags,
                    database_id=row["database_id"],
                    database_name=row["database_name"],
                    created_at=datetime.fromisoformat(row["created_at"]),
                    updated_at=datetime.fromisoformat(row["updated_at"]),
                    use_count=row["use_count"]
                ))
            
            return queries
    
    async def update_query(
        self,
        query_id: str,
        update: SavedQueryUpdate
    ) -> SavedQueryResponse:
        """
        Update a saved query.
        
        Args:
            query_id: Query ID
            update: Update data
            
        Returns:
            Updated saved query
        """
        async with aiosqlite.connect(self.saved_queries_db_path) as db:
            # Build update dict
            updates = {}
            if update.name is not None:
                updates["name"] = update.name
            if update.description is not None:
                updates["description"] = update.description
            if update.query is not None:
                updates["query"] = update.query
            if update.category is not None:
                updates["category"] = update.category
            if update.database_id is not None:
                updates["database_id"] = update.database_id
            
            if updates:
                updates["updated_at"] = datetime.utcnow().isoformat()
                
                # Build SQL
                set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
                values = list(updates.values()) + [query_id]
                
                await db.execute(
                    f"UPDATE saved_queries SET {set_clause} WHERE id = ?",
                    values
                )
            
            # Update tags if provided
            if update.tags is not None:
                # Delete existing tags
                await db.execute(
                    "DELETE FROM query_tags WHERE query_id = ?",
                    (query_id,)
                )
                
                # Insert new tags
                for tag in update.tags:
                    await db.execute(
                        "INSERT INTO query_tags (query_id, tag) VALUES (?, ?)",
                        (query_id, tag)
                    )
            
            await db.commit()
        
        return await self.get_query(query_id)
    
    async def delete_query(self, query_id: str) -> bool:
        """
        Delete a saved query.
        
        Args:
            query_id: Query ID
            
        Returns:
            True if deleted, False if not found
        """
        async with aiosqlite.connect(self.saved_queries_db_path) as db:
            # Delete tags (cascade should handle this, but explicit is better)
            await db.execute(
                "DELETE FROM query_tags WHERE query_id = ?",
                (query_id,)
            )
            
            # Delete query
            cursor = await db.execute(
                "DELETE FROM saved_queries WHERE id = ?",
                (query_id,)
            )
            
            await db.commit()
            return cursor.rowcount > 0
    
    async def increment_use_count(self, query_id: str):
        """Increment use count for a query."""
        async with aiosqlite.connect(self.saved_queries_db_path) as db:
            await db.execute(
                "UPDATE saved_queries SET use_count = use_count + 1 WHERE id = ?",
                (query_id,)
            )
            await db.commit()
    
    async def export_queries(self) -> str:
        """
        Export all saved queries to JSON.
        
        Returns:
            JSON string of all queries
        """
        queries = await self.list_queries()
        return json.dumps(
            [query.dict() for query in queries],
            default=str,
            indent=2
        )
    
    async def import_queries(self, queries_json: str) -> tuple[int, List[str]]:
        """
        Import saved queries from JSON.
        
        Args:
            queries_json: JSON string of queries
            
        Returns:
            Tuple of (imported_count, errors)
        """
        try:
            queries_data = json.loads(queries_json)
        except json.JSONDecodeError as e:
            return 0, [f"Invalid JSON: {str(e)}"]
        
        imported_count = 0
        errors = []
        
        for query_data in queries_data:
            try:
                query = SavedQueryCreate(**query_data)
                await self.create_query(query)
                imported_count += 1
            except Exception as e:
                errors.append(f"Failed to import query '{query_data.get('name', 'unknown')}': {str(e)}")
        
        return imported_count, errors
