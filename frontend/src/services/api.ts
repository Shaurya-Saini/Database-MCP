/**
 * API service for Universal Database Chat Assistant
 */
import axios, { type AxiosInstance } from 'axios';
import type {
    DatabaseConnection,
    DatabaseConnectionCreate,
    DatabaseTestResponse,
    DatabaseSchema,
    QueryRequest,
    QueryResponse,
    QueryHistoryResponse,
    QueryHistoryEntry,
    SavedQuery,
    SavedQueryCreate,
    AppConfig,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class APIService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    // Server responded with error
                    throw new Error(error.response.data.message || 'API request failed');
                } else if (error.request) {
                    // Request made but no response
                    throw new Error('No response from server');
                } else {
                    // Error in request setup
                    throw new Error(error.message);
                }
            }
        );
    }

    // Health and Configuration
    async getHealth() {
        const response = await this.client.get('/health');
        return response.data;
    }

    async getConfig(): Promise<AppConfig> {
        const response = await this.client.get<AppConfig>('/config');
        return response.data;
    }

    // Database Connections
    async getDatabases(): Promise<DatabaseConnection[]> {
        const response = await this.client.get<DatabaseConnection[]>('/databases');
        return response.data;
    }

    async getDatabase(id: string): Promise<DatabaseConnection> {
        const response = await this.client.get<DatabaseConnection>(`/databases/${id}`);
        return response.data;
    }

    async createDatabase(data: DatabaseConnectionCreate): Promise<DatabaseConnection> {
        const response = await this.client.post<DatabaseConnection>('/databases', data);
        return response.data;
    }

    async updateDatabase(id: string, data: Partial<DatabaseConnectionCreate>): Promise<DatabaseConnection> {
        const response = await this.client.put<DatabaseConnection>(`/databases/${id}`, data);
        return response.data;
    }

    async deleteDatabase(id: string): Promise<void> {
        await this.client.delete(`/databases/${id}`);
    }

    async testDatabase(id: string): Promise<DatabaseTestResponse> {
        const response = await this.client.post<DatabaseTestResponse>(`/databases/${id}/test`);
        return response.data;
    }

    async getSchema(id: string): Promise<DatabaseSchema> {
        const response = await this.client.get<DatabaseSchema>(`/databases/${id}/schema`);
        return response.data;
    }

    async refreshSchema(id: string): Promise<DatabaseSchema> {
        const response = await this.client.post<DatabaseSchema>(`/databases/${id}/refresh-schema`);
        return response.data;
    }

    // Query Execution
    async executeQuery(request: QueryRequest): Promise<QueryResponse> {
        const response = await this.client.post<QueryResponse>('/query', request);
        return response.data;
    }

    // Query History
    async getHistory(params?: {
        database_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<QueryHistoryResponse> {
        const response = await this.client.get<QueryHistoryResponse>('/history', { params });
        return response.data;
    }

    async searchHistory(q: string, database_id?: string): Promise<QueryHistoryEntry[]> {
        const response = await this.client.get<QueryHistoryEntry[]>('/history/search', {
            params: { q, database_id },
        });
        return response.data;
    }

    async clearHistory(database_id?: string): Promise<{ success: boolean; deleted_count: number }> {
        const response = await this.client.delete('/history', {
            params: { database_id },
        });
        return response.data;
    }

    async exportHistory(format: 'json' | 'csv', database_id?: string): Promise<Blob> {
        const response = await this.client.get('/history/export', {
            params: { format, database_id },
            responseType: 'blob',
        });
        return response.data;
    }

    // Saved Queries
    async getSavedQueries(params?: {
        category?: string;
        tag?: string;
    }): Promise<SavedQuery[]> {
        const response = await this.client.get<SavedQuery[]>('/saved-queries', { params });
        return response.data;
    }

    async getSavedQuery(id: string): Promise<SavedQuery> {
        const response = await this.client.get<SavedQuery>(`/saved-queries/${id}`);
        return response.data;
    }

    async createSavedQuery(data: SavedQueryCreate): Promise<SavedQuery> {
        const response = await this.client.post<SavedQuery>('/saved-queries', data);
        return response.data;
    }

    async updateSavedQuery(id: string, data: Partial<SavedQueryCreate>): Promise<SavedQuery> {
        const response = await this.client.put<SavedQuery>(`/saved-queries/${id}`, data);
        return response.data;
    }

    async deleteSavedQuery(id: string): Promise<void> {
        await this.client.delete(`/saved-queries/${id}`);
    }

    async importSavedQueries(queriesJson: string): Promise<{ imported_count: number; errors: string[] }> {
        const response = await this.client.post('/saved-queries/import', { queries_json: queriesJson });
        return response.data;
    }

    async exportSavedQueries(): Promise<Blob> {
        const response = await this.client.get('/saved-queries/export', {
            responseType: 'blob',
        });
        return response.data;
    }
}

export const apiService = new APIService();
export default apiService;
