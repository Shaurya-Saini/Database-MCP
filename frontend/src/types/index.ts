/**
 * TypeScript types for Universal Database Chat Assistant
 */

// Database Connection Types
export interface DatabaseConnection {
    id: string;
    name: string;
    host: string;
    port: number;
    database: string;
    username: string;
    ssl_enabled: boolean;
    ssl_cert_path?: string;
    status: 'connected' | 'disconnected' | 'error';
    created_at: string;
    updated_at: string;
}

export interface DatabaseConnectionCreate {
    name: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl_enabled: boolean;
    ssl_cert_path?: string;
}

export interface DatabaseTestResponse {
    success: boolean;
    message: string;
    latency_ms?: number;
}

// Schema Types
export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
    foreign_key?: string;
    default_value?: string;
}

export interface TableInfo {
    name: string;
    schema: string;
    columns: ColumnInfo[];
    row_count?: number;
}

export interface DatabaseSchema {
    tables: TableInfo[];
    cached_at: string;
    database_name: string;
}

// Query Types
export interface QueryRequest {
    database_id: string;
    query: string;
    llm_provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'groq';
    llm_model: string;
    api_key: string;
    conversation_history?: Array<{ role: string; content: string }>;
    result_limit?: number;
}

export interface QueryResponse {
    natural_language_response: string;
    sql_query: string;
    results: Array<Record<string, any>>;
    row_count: number;
    execution_time_ms: number;
    truncated: boolean;
    error?: string;
}

// History Types
export interface QueryHistoryEntry {
    id: string;
    database_id: string;
    database_name: string;
    query: string;
    sql_query: string;
    success: boolean;
    error_message?: string;
    row_count?: number;
    execution_time_ms?: number;
    timestamp: string;
}

export interface QueryHistoryResponse {
    queries: QueryHistoryEntry[];
    total: number;
    limit: number;
    offset: number;
}

// Saved Query Types
export interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    query: string;
    category?: string;
    tags: string[];
    database_id?: string;
    database_name?: string;
    created_at: string;
    updated_at: string;
    use_count: number;
}

export interface SavedQueryCreate {
    name: string;
    description?: string;
    query: string;
    category?: string;
    tags: string[];
    database_id?: string;
}

// Configuration Types
export interface LLMProviderConfig {
    provider: string;
    models: string[];
    requires_api_key: boolean;
    supports_streaming: boolean;
    supports_tools: boolean;
}

export interface AppConfig {
    supported_llm_providers: LLMProviderConfig[];
    default_result_limit: number;
    max_result_limit: number;
    query_timeout_seconds: number;
    llm_timeout_seconds: number;
    schema_cache_ttl_seconds: number;
}

// Error Types
export interface APIError {
    error: string;
    message: string;
    error_code?: string;
    troubleshooting?: string[];
}
