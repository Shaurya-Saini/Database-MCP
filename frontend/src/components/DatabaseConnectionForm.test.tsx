import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DatabaseConnectionForm } from './DatabaseConnectionForm';
import { apiService } from '../services/api';
import type { DatabaseConnection, DatabaseTestResponse } from '../types';

// Mock the API service
vi.mock('../services/api', () => ({
    apiService: {
        createDatabase: vi.fn(),
        testDatabase: vi.fn(),
        deleteDatabase: vi.fn(),
    },
}));

describe('DatabaseConnectionForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all form fields', () => {
        render(<DatabaseConnectionForm />);

        expect(screen.getByLabelText(/connection name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^host$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^port$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/database name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/enable ssl\/tls connection/i)).toBeInTheDocument();
    });

    it('shows validation errors for empty required fields', async () => {
        render(<DatabaseConnectionForm />);

        const submitButton = screen.getByRole('button', { name: /save connection/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/connection name is required/i)).toBeInTheDocument();
            expect(screen.getByText(/host is required/i)).toBeInTheDocument();
            expect(screen.getByText(/database name is required/i)).toBeInTheDocument();
            expect(screen.getByText(/username is required/i)).toBeInTheDocument();
            expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
    });

    it('validates port number range', async () => {
        render(<DatabaseConnectionForm />);

        const portInput = screen.getByLabelText(/^port$/i);

        // Test invalid port (too low)
        fireEvent.change(portInput, { target: { value: '0' } });
        fireEvent.blur(portInput);

        await waitFor(() => {
            expect(screen.getByText(/port must be between 1 and 65535/i)).toBeInTheDocument();
        });

        // Test invalid port (too high)
        fireEvent.change(portInput, { target: { value: '70000' } });
        fireEvent.blur(portInput);

        await waitFor(() => {
            expect(screen.getByText(/port must be between 1 and 65535/i)).toBeInTheDocument();
        });

        // Test valid port
        fireEvent.change(portInput, { target: { value: '5432' } });
        fireEvent.blur(portInput);

        await waitFor(() => {
            expect(screen.queryByText(/port must be between 1 and 65535/i)).not.toBeInTheDocument();
        });
    });

    it('shows SSL certificate path field when SSL is enabled', () => {
        render(<DatabaseConnectionForm />);

        const sslCheckbox = screen.getByLabelText(/enable ssl\/tls connection/i);

        // SSL cert path should not be visible initially
        expect(screen.queryByLabelText(/ssl certificate path/i)).not.toBeInTheDocument();

        // Enable SSL
        fireEvent.click(sslCheckbox);

        // SSL cert path should now be visible
        expect(screen.getByLabelText(/ssl certificate path/i)).toBeInTheDocument();
    });

    it('tests connection successfully', async () => {
        const mockConnection: DatabaseConnection = {
            id: 'test-id',
            name: 'Test DB',
            host: 'localhost',
            port: 5432,
            database: 'testdb',
            username: 'testuser',
            ssl_enabled: false,
            status: 'connected',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const mockTestResponse: DatabaseTestResponse = {
            success: true,
            message: 'Connection successful',
            latency_ms: 25,
        };

        vi.mocked(apiService.createDatabase).mockResolvedValue(mockConnection);
        vi.mocked(apiService.testDatabase).mockResolvedValue(mockTestResponse);
        vi.mocked(apiService.deleteDatabase).mockResolvedValue(undefined);

        render(<DatabaseConnectionForm />);

        // Fill in the form
        fireEvent.change(screen.getByLabelText(/connection name/i), { target: { value: 'Test DB' } });
        fireEvent.change(screen.getByLabelText(/^host$/i), { target: { value: 'localhost' } });
        fireEvent.change(screen.getByLabelText(/^port$/i), { target: { value: '5432' } });
        fireEvent.change(screen.getByLabelText(/database name/i), { target: { value: 'testdb' } });
        fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass' } });

        // Click test connection button
        const testButton = screen.getByRole('button', { name: /test connection/i });
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getAllByText(/connection successful/i).length).toBeGreaterThan(0);
        });

        // Check for latency display
        expect(screen.getByText(/\(25ms\)/i)).toBeInTheDocument();

        // Verify API calls
        expect(apiService.createDatabase).toHaveBeenCalledWith({
            name: 'Test DB',
            host: 'localhost',
            port: 5432,
            database: 'testdb',
            username: 'testuser',
            password: 'testpass',
            ssl_enabled: false,
            ssl_cert_path: '',
        });
        expect(apiService.testDatabase).toHaveBeenCalledWith('test-id');
        expect(apiService.deleteDatabase).toHaveBeenCalledWith('test-id');
    });

    it('handles connection test failure', async () => {
        const mockConnection: DatabaseConnection = {
            id: 'test-id',
            name: 'Test DB',
            host: 'localhost',
            port: 5432,
            database: 'testdb',
            username: 'testuser',
            ssl_enabled: false,
            status: 'error',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const mockTestResponse: DatabaseTestResponse = {
            success: false,
            message: 'Connection refused',
        };

        vi.mocked(apiService.createDatabase).mockResolvedValue(mockConnection);
        vi.mocked(apiService.testDatabase).mockResolvedValue(mockTestResponse);
        vi.mocked(apiService.deleteDatabase).mockResolvedValue(undefined);

        render(<DatabaseConnectionForm />);

        // Fill in the form
        fireEvent.change(screen.getByLabelText(/connection name/i), { target: { value: 'Test DB' } });
        fireEvent.change(screen.getByLabelText(/^host$/i), { target: { value: 'localhost' } });
        fireEvent.change(screen.getByLabelText(/^port$/i), { target: { value: '5432' } });
        fireEvent.change(screen.getByLabelText(/database name/i), { target: { value: 'testdb' } });
        fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass' } });

        // Click test connection button
        const testButton = screen.getByRole('button', { name: /test connection/i });
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
        });

        // Verify temporary connection was deleted
        expect(apiService.deleteDatabase).toHaveBeenCalledWith('test-id');
    });

    it('submits form successfully', async () => {
        const mockConnection: DatabaseConnection = {
            id: 'new-connection-id',
            name: 'My Database',
            host: 'db.example.com',
            port: 5432,
            database: 'mydb',
            username: 'dbuser',
            ssl_enabled: true,
            ssl_cert_path: '/path/to/cert.pem',
            status: 'connected',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        vi.mocked(apiService.createDatabase).mockResolvedValue(mockConnection);

        const onSuccess = vi.fn();
        render(<DatabaseConnectionForm onSuccess={onSuccess} />);

        // Fill in the form
        fireEvent.change(screen.getByLabelText(/connection name/i), { target: { value: 'My Database' } });
        fireEvent.change(screen.getByLabelText(/^host$/i), { target: { value: 'db.example.com' } });
        fireEvent.change(screen.getByLabelText(/^port$/i), { target: { value: '5432' } });
        fireEvent.change(screen.getByLabelText(/database name/i), { target: { value: 'mydb' } });
        fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'dbuser' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'dbpass' } });
        fireEvent.click(screen.getByLabelText(/enable ssl\/tls connection/i));
        fireEvent.change(screen.getByLabelText(/ssl certificate path/i), { target: { value: '/path/to/cert.pem' } });

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /save connection/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith('new-connection-id');
        });

        expect(apiService.createDatabase).toHaveBeenCalledWith({
            name: 'My Database',
            host: 'db.example.com',
            port: 5432,
            database: 'mydb',
            username: 'dbuser',
            password: 'dbpass',
            ssl_enabled: true,
            ssl_cert_path: '/path/to/cert.pem',
        });
    });

    it('handles form submission error', async () => {
        vi.mocked(apiService.createDatabase).mockRejectedValue(new Error('Database connection failed'));

        render(<DatabaseConnectionForm />);

        // Fill in the form
        fireEvent.change(screen.getByLabelText(/connection name/i), { target: { value: 'Test DB' } });
        fireEvent.change(screen.getByLabelText(/^host$/i), { target: { value: 'localhost' } });
        fireEvent.change(screen.getByLabelText(/^port$/i), { target: { value: '5432' } });
        fireEvent.change(screen.getByLabelText(/database name/i), { target: { value: 'testdb' } });
        fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass' } });

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /save connection/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
        });
    });

    it('calls onCancel when cancel button is clicked', () => {
        const onCancel = vi.fn();
        render(<DatabaseConnectionForm onCancel={onCancel} />);

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(onCancel).toHaveBeenCalled();
    });

    it('clears field error when user starts typing', async () => {
        render(<DatabaseConnectionForm />);

        const nameInput = screen.getByLabelText(/connection name/i);

        // Trigger validation error
        fireEvent.blur(nameInput);

        await waitFor(() => {
            expect(screen.getByText(/connection name is required/i)).toBeInTheDocument();
        });

        // Start typing
        fireEvent.change(nameInput, { target: { value: 'Test' } });

        // Error should be cleared
        expect(screen.queryByText(/connection name is required/i)).not.toBeInTheDocument();
    });

    it('populates form with initial data', () => {
        const initialData = {
            name: 'Existing DB',
            host: 'existing.example.com',
            port: 5433,
            database: 'existingdb',
            username: 'existinguser',
            password: 'existingpass',
            ssl_enabled: true,
            ssl_cert_path: '/existing/cert.pem',
        };

        render(<DatabaseConnectionForm initialData={initialData} />);

        expect(screen.getByLabelText(/connection name/i)).toHaveValue('Existing DB');
        expect(screen.getByLabelText(/^host$/i)).toHaveValue('existing.example.com');
        expect(screen.getByLabelText(/^port$/i)).toHaveValue(5433);
        expect(screen.getByLabelText(/database name/i)).toHaveValue('existingdb');
        expect(screen.getByLabelText(/^username$/i)).toHaveValue('existinguser');
        expect(screen.getByLabelText(/^password$/i)).toHaveValue('existingpass');
        expect(screen.getByLabelText(/enable ssl\/tls connection/i)).toBeChecked();
        expect(screen.getByLabelText(/ssl certificate path/i)).toHaveValue('/existing/cert.pem');
    });
});
