import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DatabaseConnectionList } from './DatabaseConnectionList';
import type { DatabaseConnection } from '../../types';

describe('DatabaseConnectionList', () => {
    const mockConnections: DatabaseConnection[] = [
        {
            id: '1',
            name: 'Production DB',
            host: 'prod.example.com',
            port: 5432,
            database: 'production',
            username: 'admin',
            ssl_enabled: true,
            status: 'connected',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: '2',
            name: 'Development DB',
            host: 'localhost',
            port: 5432,
            database: 'dev',
            username: 'devuser',
            ssl_enabled: false,
            status: 'disconnected',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
        },
        {
            id: '3',
            name: 'Test DB',
            host: 'test.example.com',
            port: 5433,
            database: 'test',
            username: 'testuser',
            ssl_enabled: false,
            status: 'error',
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
        },
    ];

    const mockHandlers = {
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onTest: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Loading State', () => {
        it('should display loading spinner when isLoading is true', () => {
            render(
                <DatabaseConnectionList
                    connections={[]}
                    isLoading={true}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            // Check for the spinner SVG element
            const spinner = document.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        it('should display error message when error prop is provided', () => {
            const errorMessage = 'Failed to load connections';
            render(
                <DatabaseConnectionList
                    connections={[]}
                    error={errorMessage}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('should display empty state when no connections exist', () => {
            render(
                <DatabaseConnectionList
                    connections={[]}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            expect(screen.getByText('No database connections')).toBeInTheDocument();
            expect(screen.getByText('Get started by adding a new database connection.')).toBeInTheDocument();
        });
    });

    describe('Connection Display', () => {
        it('should display all connections with their details', () => {
            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            // Check all connection names are displayed
            expect(screen.getByText('Production DB')).toBeInTheDocument();
            expect(screen.getByText('Development DB')).toBeInTheDocument();
            expect(screen.getByText('Test DB')).toBeInTheDocument();

            // Check connection details
            expect(screen.getByText('prod.example.com:5432')).toBeInTheDocument();
            expect(screen.getByText('localhost:5432')).toBeInTheDocument();
            expect(screen.getByText('test.example.com:5433')).toBeInTheDocument();

            // Check database names
            expect(screen.getByText('production')).toBeInTheDocument();
            expect(screen.getByText('dev')).toBeInTheDocument();
            expect(screen.getByText('test')).toBeInTheDocument();

            // Check usernames
            expect(screen.getByText('admin')).toBeInTheDocument();
            expect(screen.getByText('devuser')).toBeInTheDocument();
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });

        it('should display SSL enabled indicator for connections with SSL', () => {
            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            // Only Production DB has SSL enabled
            const sslIndicators = screen.getAllByText('SSL Enabled');
            expect(sslIndicators).toHaveLength(1);
        });
    });

    describe('Status Indicators', () => {
        it('should display correct status badge for connected state', () => {
            render(
                <DatabaseConnectionList
                    connections={[mockConnections[0]]}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            expect(screen.getByText('Connected')).toBeInTheDocument();
        });

        it('should display correct status badge for disconnected state', () => {
            render(
                <DatabaseConnectionList
                    connections={[mockConnections[1]]}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            expect(screen.getByText('Disconnected')).toBeInTheDocument();
        });

        it('should display correct status badge for error state', () => {
            render(
                <DatabaseConnectionList
                    connections={[mockConnections[2]]}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            expect(screen.getByText('Error')).toBeInTheDocument();
        });
    });

    describe('Edit Action', () => {
        it('should call onEdit with connection when edit button is clicked', () => {
            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            const editButtons = screen.getAllByText('Edit');
            fireEvent.click(editButtons[0]);

            expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockConnections[0]);
            expect(mockHandlers.onEdit).toHaveBeenCalledTimes(1);
        });
    });

    describe('Delete Action', () => {
        it('should show confirmation dialog when delete button is clicked', () => {
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this database connection?');
            expect(mockHandlers.onDelete).not.toHaveBeenCalled();

            confirmSpy.mockRestore();
        });

        it('should call onDelete with connection id when confirmed', async () => {
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
            mockHandlers.onDelete.mockResolvedValue(undefined);

            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            await waitFor(() => {
                expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');
            });

            confirmSpy.mockRestore();
        });
    });

    describe('Test Action', () => {
        it('should display test button when onTest prop is provided', () => {
            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                    onTest={mockHandlers.onTest}
                />
            );

            const testButtons = screen.getAllByText('Test');
            expect(testButtons).toHaveLength(mockConnections.length);
        });

        it('should not display test button when onTest prop is not provided', () => {
            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            const testButtons = screen.queryAllByText('Test');
            expect(testButtons).toHaveLength(0);
        });

        it('should call onTest with connection id when test button is clicked', async () => {
            mockHandlers.onTest.mockResolvedValue(undefined);

            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                    onTest={mockHandlers.onTest}
                />
            );

            const testButtons = screen.getAllByText('Test');
            fireEvent.click(testButtons[0]);

            await waitFor(() => {
                expect(mockHandlers.onTest).toHaveBeenCalledWith('1');
            });
        });

        it('should disable all buttons while testing', async () => {
            mockHandlers.onTest.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                    onTest={mockHandlers.onTest}
                />
            );

            const testButtons = screen.getAllByText('Test');
            fireEvent.click(testButtons[0]);

            // Check that buttons are disabled during testing
            const allButtons = screen.getAllByRole('button');
            allButtons.forEach(button => {
                expect(button).toBeDisabled();
            });

            await waitFor(() => {
                expect(mockHandlers.onTest).toHaveBeenCalled();
            });
        });
    });

    describe('Button States', () => {
        it('should disable all buttons while deleting', async () => {
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
            mockHandlers.onDelete.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            render(
                <DatabaseConnectionList
                    connections={mockConnections}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                    onTest={mockHandlers.onTest}
                />
            );

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            // Check that buttons are disabled during deletion
            const allButtons = screen.getAllByRole('button');
            allButtons.forEach(button => {
                expect(button).toBeDisabled();
            });

            await waitFor(() => {
                expect(mockHandlers.onDelete).toHaveBeenCalled();
            });

            confirmSpy.mockRestore();
        });
    });

    describe('Date Display', () => {
        it('should display formatted creation date', () => {
            render(
                <DatabaseConnectionList
                    connections={[mockConnections[0]]}
                    onEdit={mockHandlers.onEdit}
                    onDelete={mockHandlers.onDelete}
                />
            );

            // Check that date is displayed (format may vary by locale)
            const dateText = screen.getByText(/Created:/);
            expect(dateText).toBeInTheDocument();
        });
    });
});
