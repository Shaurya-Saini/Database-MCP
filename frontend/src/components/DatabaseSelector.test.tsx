import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DatabaseSelector } from './DatabaseSelector';
import apiService from '../services/api';
import type { DatabaseConnection } from '../types';

// Mock the API service
vi.mock('../services/api', () => ({
    default: {
        getDatabases: vi.fn(),
    },
}));

describe('DatabaseSelector', () => {
    const mockDatabases: DatabaseConnection[] = [
        {
            id: 'db1',
            name: 'Production DB',
            host: 'localhost',
            port: 5432,
            database: 'prod',
            username: 'admin',
            ssl_enabled: false,
            status: 'connected',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 'db2',
            name: 'Development DB',
            host: 'localhost',
            port: 5433,
            database: 'dev',
            username: 'dev',
            ssl_enabled: false,
            status: 'disconnected',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 'db3',
            name: 'Error DB',
            host: 'localhost',
            port: 5434,
            database: 'error',
            username: 'user',
            ssl_enabled: false,
            status: 'error',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
    ];

    const mockOnDatabaseChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render loading state initially', () => {
        vi.mocked(apiService.getDatabases).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        );

        render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        expect(screen.getByText('Loading databases...')).toBeInTheDocument();
    });

    it('should display databases after loading', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue(mockDatabases);

        render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Select Database')).toBeInTheDocument();
        });
    });

    it('should display active database with status', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue(mockDatabases);

        render(
            <DatabaseSelector
                activeDatabaseId="db1"
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Production DB')).toBeInTheDocument();
            expect(screen.getByText('Connected')).toBeInTheDocument();
        });
    });

    it('should show error state when API fails', async () => {
        vi.mocked(apiService.getDatabases).mockRejectedValue(
            new Error('Network error')
        );

        render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
        });
    });

    it('should show "No databases configured" when list is empty', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue([]);

        render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('No databases configured')).toBeInTheDocument();
        });
    });

    it('should call onDatabaseChange when a database is selected', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue(mockDatabases);

        render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Select Database')).toBeInTheDocument();
        });

        // Click the dropdown trigger
        const trigger = screen.getByText('Select Database').closest('button');
        fireEvent.click(trigger!);

        // Wait for dropdown to open and click a database
        await waitFor(() => {
            const dbOption = screen.getByText('Production DB');
            fireEvent.click(dbOption);
        });

        expect(mockOnDatabaseChange).toHaveBeenCalledWith('db1');
    });

    it('should refresh databases when refresh option is clicked', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue(mockDatabases);

        render(
            <DatabaseSelector
                activeDatabaseId="db1"
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Production DB')).toBeInTheDocument();
        });

        // Click the dropdown trigger
        const trigger = screen.getByText('Production DB').closest('button');
        fireEvent.click(trigger!);

        // Click refresh option
        await waitFor(() => {
            const refreshOption = screen.getByText('Refresh Connections');
            fireEvent.click(refreshOption);
        });

        // getDatabases should be called twice: once on mount, once on refresh
        expect(apiService.getDatabases).toHaveBeenCalledTimes(2);
    });

    it('should disable error status databases in dropdown', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue(mockDatabases);

        render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Select Database')).toBeInTheDocument();
        });

        // Click the dropdown trigger
        const trigger = screen.getByText('Select Database').closest('button');
        fireEvent.click(trigger!);

        // Find the error database option
        await waitFor(() => {
            const errorDbButton = screen.getByText('Error DB').closest('button');
            expect(errorDbButton).toBeDisabled();
        });
    });

    it('should retry fetching databases on error', async () => {
        vi.mocked(apiService.getDatabases).mockRejectedValueOnce(
            new Error('Network error')
        ).mockResolvedValueOnce(mockDatabases);

        render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
        });

        // Click retry button
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);

        // Should show databases after retry
        await waitFor(() => {
            expect(screen.getByText('Select Database')).toBeInTheDocument();
        });
    });

    it('should display correct status indicators for different statuses', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue(mockDatabases);

        const { rerender } = render(
            <DatabaseSelector
                activeDatabaseId="db1"
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        // Connected status
        await waitFor(() => {
            expect(screen.getByText('Connected')).toBeInTheDocument();
        });

        // Disconnected status
        rerender(
            <DatabaseSelector
                activeDatabaseId="db2"
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Disconnected')).toBeInTheDocument();
        });

        // Error status
        rerender(
            <DatabaseSelector
                activeDatabaseId="db3"
                onDatabaseChange={mockOnDatabaseChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Error')).toBeInTheDocument();
        });
    });

    it('should apply custom className', async () => {
        vi.mocked(apiService.getDatabases).mockResolvedValue(mockDatabases);

        const { container } = render(
            <DatabaseSelector
                onDatabaseChange={mockOnDatabaseChange}
                className="custom-class"
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Select Database')).toBeInTheDocument();
        });

        // Check if custom class is applied to the dropdown container
        const dropdown = container.querySelector('.custom-class');
        expect(dropdown).toBeInTheDocument();
    });
});
