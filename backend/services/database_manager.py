"""
Database Manager service for managing multiple PostgreSQL database connections.
"""
import asyncpg
import aiosqlite
import uuid
import ssl
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from models.database import (
    DatabaseConnectionCreate,
    DatabaseConnectionUpdate,
    DatabaseConnectionResponse,
    DatabaseTestResponse,
)
from models.schema import DatabaseSchemaResponse, TableInfo, ColumnInfo
from exceptions import DatabaseConnectionError
from .credential_manager import CredentialManager


class DatabaseManager:
    """Manages multiple database connections with connection pooling and schema caching."""
    
    def __init__(
        self,
        config_db_path: str,
        credential_manager: CredentialManager,
        pool_min_size: int = 2,
        pool_max_size: int = 10,
        schema_cache_ttl: int = 300
    ):
        """
        Initialize database manager.
        
        Args:
            config_db_path: Path to SQLite database for storing connection configs
            credential_manager: Credential manager for password encryption
            pool_min_size: Minimum connection pool size
            pool_max_size: Maximum connection pool size
            schema_cache_ttl: Schema cache TTL in seconds
        """
        self.config_db_path = config_db_path
        self.credential_manager = credential_manager
        self.pool_min_size = pool_min_size
        self.pool_max_size = pool_max_size
        self.schema_cache_ttl = schema_cache_ttl
        
        self.connection_pools: Dict[str, asyncpg.Pool] = {}
        self.schema_cache: Dict[str, tuple[DatabaseSchemaResponse, datetime]] = {}
    
    async def initialize(self):
        """Initialize the database manager and create tables."""
        async with aiosqlite.connect(self.config_db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS database_connections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    host TEXT NOT NULL,
                    port INTEGER NOT NULL,
                    database TEXT NOT NULL,
                    username TEXT NOT NULL,
                    password TEXT NOT NULL,
                    ssl_enabled BOOLEAN NOT NULL DEFAULT 0,
                    ssl_cert_path TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.commit()
    
    async def add_connection(self, config: DatabaseConnectionCreate) -> DatabaseConnectionResponse:
        """
        Add a new database connection.
        
        Args:
            config: Database connection configuration
            
        Returns:
            Created database connection
            
        Raises:
            DatabaseConnectionError: If connection with same name exists or validation fails
        """
        # Check for duplicate name
        existing = await self._get_connection_by_name(config.name)
        if existing:
            raise DatabaseConnectionError(
                message=f"Connection with name '{config.name}' already exists",
                error_code="DUPLICATE_NAME",
                troubleshooting=[
                    "Choose a different connection name",
                    "Delete the existing connection first"
                ]
            )
        
        # Validate connection before saving
        test_result = await self._test_connection_params(
            config.host,
            config.port,
            config.database,
            config.username,
            config.password,
            config.ssl_enabled
        )
        
        if not test_result.success:
            raise DatabaseConnectionError(
                message=f"Connection validation failed: {test_result.message}",
                error_code="VALIDATION_FAILED",
                troubleshooting=[
                    "Verify host and port are correct",
                    "Check database name exists",
                    "Verify username and password",
                    "Ensure database allows connections from this IP"
                ]
            )
        
        # Encrypt password
        encrypted_password = self.credential_manager.encrypt_password(config.password)
        
        # Generate ID and timestamps
        connection_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Save to database
        async with aiosqlite.connect(self.config_db_path) as db:
            await db.execute("""
                INSERT INTO database_connections 
                (id, name, host, port, database, username, password, ssl_enabled, ssl_cert_path, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                connection_id,
                config.name,
                config.host,
                config.port,
                config.database,
                config.username,
                encrypted_password,
                config.ssl_enabled,
                config.ssl_cert_path,
                now.isoformat(),
                now.isoformat()
            ))
            await db.commit()
        
        return DatabaseConnectionResponse(
            id=connection_id,
            name=config.name,
            host=config.host,
            port=config.port,
            database=config.database,
            username=config.username,
            ssl_enabled=config.ssl_enabled,
            ssl_cert_path=config.ssl_cert_path,
            status="connected",
            created_at=now,
            updated_at=now
        )
    
    async def get_connection(self, connection_id: str) -> Optional[DatabaseConnectionResponse]:
        """
        Get a database connection by ID.
        
        Args:
            connection_id: Connection ID
            
        Returns:
            Database connection or None if not found
        """
        async with aiosqlite.connect(self.config_db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM database_connections WHERE id = ?",
                (connection_id,)
            ) as cursor:
                row = await cursor.fetchone()
                
        if not row:
            return None
        
        # Test connection status
        status = "disconnected"
        try:
            pool = await self.get_pool(connection_id)
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            status = "connected"
        except Exception:
            status = "error"
        
        return DatabaseConnectionResponse(
            id=row["id"],
            name=row["name"],
            host=row["host"],
            port=row["port"],
            database=row["database"],
            username=row["username"],
            ssl_enabled=bool(row["ssl_enabled"]),
            ssl_cert_path=row["ssl_cert_path"],
            status=status,
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"])
        )
    
    async def list_connections(self) -> List[DatabaseConnectionResponse]:
        """
        List all database connections.
        
        Returns:
            List of database connections
        """
        async with aiosqlite.connect(self.config_db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM database_connections ORDER BY name") as cursor:
                rows = await cursor.fetchall()
        
        connections = []
        for row in rows:
            # Test connection status
            status = "disconnected"
            try:
                pool = await self.get_pool(row["id"])
                async with pool.acquire() as conn:
                    await conn.fetchval("SELECT 1")
                status = "connected"
            except Exception:
                status = "error"
            
            connections.append(DatabaseConnectionResponse(
                id=row["id"],
                name=row["name"],
                host=row["host"],
                port=row["port"],
                database=row["database"],
                username=row["username"],
                ssl_enabled=bool(row["ssl_enabled"]),
                ssl_cert_path=row["ssl_cert_path"],
                status=status,
                created_at=datetime.fromisoformat(row["created_at"]),
                updated_at=datetime.fromisoformat(row["updated_at"])
            ))
        
        return connections
    
    async def update_connection(
        self,
        connection_id: str,
        update: DatabaseConnectionUpdate
    ) -> DatabaseConnectionResponse:
        """
        Update a database connection.
        
        Args:
            connection_id: Connection ID
            update: Update data
            
        Returns:
            Updated database connection
            
        Raises:
            DatabaseConnectionError: If connection not found or validation fails
        """
        # Get existing connection
        existing = await self.get_connection(connection_id)
        if not existing:
            raise DatabaseConnectionError(
                message=f"Connection with ID '{connection_id}' not found",
                error_code="NOT_FOUND",
                troubleshooting=["Verify the connection ID is correct"]
            )
        
        # Build update dict
        updates = {}
        if update.name is not None:
            updates["name"] = update.name
        if update.host is not None:
            updates["host"] = update.host
        if update.port is not None:
            updates["port"] = update.port
        if update.database is not None:
            updates["database"] = update.database
        if update.username is not None:
            updates["username"] = update.username
        if update.password is not None:
            updates["password"] = self.credential_manager.encrypt_password(update.password)
        if update.ssl_enabled is not None:
            updates["ssl_enabled"] = update.ssl_enabled
        if update.ssl_cert_path is not None:
            updates["ssl_cert_path"] = update.ssl_cert_path
        
        if not updates:
            return existing
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        # Build SQL
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [connection_id]
        
        async with aiosqlite.connect(self.config_db_path) as db:
            await db.execute(
                f"UPDATE database_connections SET {set_clause} WHERE id = ?",
                values
            )
            await db.commit()
        
        # Close existing pool if connection params changed
        if any(k in updates for k in ["host", "port", "database", "username", "password", "ssl_enabled"]):
            await self.close_pool(connection_id)
        
        return await self.get_connection(connection_id)
    
    async def delete_connection(self, connection_id: str) -> bool:
        """
        Delete a database connection.
        
        Args:
            connection_id: Connection ID
            
        Returns:
            True if deleted, False if not found
        """
        # Close pool first
        await self.close_pool(connection_id)
        
        # Delete from database
        async with aiosqlite.connect(self.config_db_path) as db:
            cursor = await db.execute(
                "DELETE FROM database_connections WHERE id = ?",
                (connection_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
    
    async def test_connection(self, connection_id: str) -> DatabaseTestResponse:
        """
        Test a database connection.
        
        Args:
            connection_id: Connection ID
            
        Returns:
            Test result with latency
        """
        try:
            start_time = datetime.utcnow()
            pool = await self.get_pool(connection_id)
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            end_time = datetime.utcnow()
            latency_ms = (end_time - start_time).total_seconds() * 1000
            
            return DatabaseTestResponse(
                success=True,
                message="Connection successful",
                latency_ms=latency_ms
            )
        except Exception as e:
            return DatabaseTestResponse(
                success=False,
                message=f"Connection failed: {str(e)}"
            )
    
    async def get_pool(self, connection_id: str) -> asyncpg.Pool:
        """
        Get or create connection pool for a database.
        
        Args:
            connection_id: Connection ID
            
        Returns:
            Connection pool
            
        Raises:
            DatabaseConnectionError: If connection not found or pool creation fails
        """
        # Return existing pool if available
        if connection_id in self.connection_pools:
            return self.connection_pools[connection_id]
        
        # Get connection config
        async with aiosqlite.connect(self.config_db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM database_connections WHERE id = ?",
                (connection_id,)
            ) as cursor:
                row = await cursor.fetchone()
        
        if not row:
            raise DatabaseConnectionError(
                message=f"Connection with ID '{connection_id}' not found",
                error_code="NOT_FOUND",
                troubleshooting=["Verify the connection ID is correct"]
            )
        
        # Decrypt password
        password = self.credential_manager.decrypt_password(row["password"])
        
        # SSL configuration
        ssl_context = False
        if row["ssl_enabled"]:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        # Create pool
        try:
            pool = await asyncpg.create_pool(
                host=row["host"],
                port=row["port"],
                database=row["database"],
                user=row["username"],
                password=password,
                min_size=self.pool_min_size,
                max_size=self.pool_max_size,
                command_timeout=30,
                ssl=ssl_context
            )
            
            self.connection_pools[connection_id] = pool
            return pool
            
        except Exception as e:
            raise DatabaseConnectionError(
                message=f"Failed to create connection pool: {str(e)}",
                error_code="POOL_CREATION_FAILED",
                troubleshooting=[
                    "Verify database is running",
                    "Check network connectivity",
                    "Verify credentials are correct"
                ]
            )
    
    async def get_schema(
        self,
        connection_id: str,
        refresh: bool = False
    ) -> DatabaseSchemaResponse:
        """
        Get database schema (cached or fresh).
        
        Args:
            connection_id: Connection ID
            refresh: Force refresh cache
            
        Returns:
            Database schema
        """
        # Check cache
        if not refresh and connection_id in self.schema_cache:
            schema, cached_at = self.schema_cache[connection_id]
            if datetime.utcnow() - cached_at < timedelta(seconds=self.schema_cache_ttl):
                return schema
        
        # Fetch schema from database
        pool = await self.get_pool(connection_id)
        
        async with pool.acquire() as conn:
            # Get all tables
            tables_query = """
                SELECT 
                    table_schema,
                    table_name
                FROM information_schema.tables
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
            """
            tables = await conn.fetch(tables_query)
            
            table_infos = []
            for table in tables:
                table_schema = table["table_schema"]
                table_name = table["table_name"]
                
                # Get columns
                columns_query = """
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                """
                columns = await conn.fetch(columns_query, table_schema, table_name)
                
                # Get primary keys
                pk_query = """
                    SELECT a.attname
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = $1::regclass AND i.indisprimary
                """
                pks = await conn.fetch(pk_query, f"{table_schema}.{table_name}")
                pk_columns = {pk["attname"] for pk in pks}
                
                # Build column info
                column_infos = [
                    ColumnInfo(
                        name=col["column_name"],
                        type=col["data_type"],
                        nullable=col["is_nullable"] == "YES",
                        primary_key=col["column_name"] in pk_columns,
                        default_value=col["column_default"]
                    )
                    for col in columns
                ]
                
                table_infos.append(TableInfo(
                    name=table_name,
                    schema=table_schema,
                    columns=column_infos
                ))
        
        # Get database name
        connection = await self.get_connection(connection_id)
        
        # Create schema response
        schema = DatabaseSchemaResponse(
            tables=table_infos,
            cached_at=datetime.utcnow(),
            database_name=connection.database
        )
        
        # Cache schema
        self.schema_cache[connection_id] = (schema, datetime.utcnow())
        
        return schema
    
    async def close_pool(self, connection_id: str):
        """Close a connection pool."""
        if connection_id in self.connection_pools:
            await self.connection_pools[connection_id].close()
            del self.connection_pools[connection_id]
        
        # Clear schema cache
        if connection_id in self.schema_cache:
            del self.schema_cache[connection_id]
    
    async def close_all_pools(self):
        """Close all connection pools."""
        for pool in self.connection_pools.values():
            await pool.close()
        
        self.connection_pools.clear()
        self.schema_cache.clear()
    
    async def get_connection_config(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """
        Get raw connection configuration including decrypted password.
        Used by the MCP client to pass DB credentials to the MCP server subprocess.

        Args:
            connection_id: Connection ID

        Returns:
            Dict with host, port, database, username, password, ssl_enabled, ssl_cert_path
            or None if not found
        """
        async with aiosqlite.connect(self.config_db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM database_connections WHERE id = ?",
                (connection_id,)
            ) as cursor:
                row = await cursor.fetchone()

        if not row:
            return None

        # Decrypt password
        password = self.credential_manager.decrypt_password(row["password"])

        return {
            "host": row["host"],
            "port": row["port"],
            "database": row["database"],
            "username": row["username"],
            "password": password,
            "ssl_enabled": bool(row["ssl_enabled"]),
            "ssl_cert_path": row["ssl_cert_path"],
        }

    async def _get_connection_by_name(self, name: str) -> Optional[dict]:
        """Get connection by name."""
        async with aiosqlite.connect(self.config_db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM database_connections WHERE name = ?",
                (name,)
            ) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None
    
    async def _test_connection_params(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_enabled: bool
    ) -> DatabaseTestResponse:
        """Test connection parameters."""
        try:
            ssl_context = False
            if ssl_enabled:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE

            conn = await asyncpg.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password,
                ssl=ssl_context,
                timeout=10
            )
            await conn.close()
            return DatabaseTestResponse(success=True, message="Connection successful")
        except Exception as e:
            return DatabaseTestResponse(success=False, message=str(e))
