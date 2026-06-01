import React, { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
import { ErrorMessage } from './ui/ErrorMessage';
import { apiService } from '../services/api';
import type { DatabaseConnectionCreate, DatabaseTestResponse } from '../types';

export interface DatabaseConnectionFormProps {
    onSuccess?: (connectionId: string) => void;
    onCancel?: () => void;
    initialData?: Partial<DatabaseConnectionCreate>;
}

interface FormErrors {
    name?: string;
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    ssl_cert_path?: string;
}

export const DatabaseConnectionForm: React.FC<DatabaseConnectionFormProps> = ({
    onSuccess,
    onCancel,
    initialData,
}) => {
    const [formData, setFormData] = useState<DatabaseConnectionCreate>({
        name: initialData?.name || '',
        host: initialData?.host || '',
        port: initialData?.port || 5432,
        database: initialData?.database || '',
        username: initialData?.username || '',
        password: initialData?.password || '',
        ssl_enabled: initialData?.ssl_enabled || false,
        ssl_cert_path: initialData?.ssl_cert_path || '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<DatabaseTestResponse | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const validateField = (name: keyof DatabaseConnectionCreate, value: any): string | undefined => {
        switch (name) {
            case 'name':
                if (!value || value.trim() === '') {
                    return 'Connection name is required';
                }
                if (value.length > 100) {
                    return 'Connection name must be 100 characters or less';
                }
                break;
            case 'host':
                if (!value || value.trim() === '') {
                    return 'Host is required';
                }
                break;
            case 'port':
                const portNum = Number(value);
                if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                    return 'Port must be between 1 and 65535';
                }
                break;
            case 'database':
                if (!value || value.trim() === '') {
                    return 'Database name is required';
                }
                break;
            case 'username':
                if (!value || value.trim() === '') {
                    return 'Username is required';
                }
                break;
            case 'password':
                if (!value || value.trim() === '') {
                    return 'Password is required';
                }
                break;
            case 'ssl_cert_path':
                if (formData.ssl_enabled && value && value.trim() !== '') {
                    // Basic path validation - check if it looks like a file path
                    if (!/^[a-zA-Z]:[\\\/]|^\/|^\.\.?\//.test(value)) {
                        return 'Please enter a valid file path';
                    }
                }
                break;
        }
        return undefined;
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        // Validate all required fields
        (Object.keys(formData) as Array<keyof DatabaseConnectionCreate>).forEach((key) => {
            const error = validateField(key, formData[key]);
            if (error) {
                newErrors[key as keyof FormErrors] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const fieldValue = type === 'checkbox' ? checked : type === 'number' ? Number(value) : value;

        setFormData((prev) => ({
            ...prev,
            [name]: fieldValue,
        }));

        // Clear error for this field when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({
                ...prev,
                [name]: undefined,
            }));
        }

        // Clear test result when form changes
        if (testResult) {
            setTestResult(null);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const error = validateField(name as keyof DatabaseConnectionCreate, value);

        if (error) {
            setErrors((prev) => ({
                ...prev,
                [name]: error,
            }));
        }
    };

    const handleTestConnection = async () => {
        // Validate form before testing
        if (!validateForm()) {
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        setSubmitError(null);

        try {
            // Create a temporary connection to test
            const connection = await apiService.createDatabase(formData);

            try {
                // Test the connection
                const result = await apiService.testDatabase(connection.id);
                setTestResult(result);
            } catch (testError) {
                setTestResult({
                    success: false,
                    message: testError instanceof Error ? testError.message : 'Connection test failed',
                });
            } finally {
                // Always delete the temporary connection after testing
                try {
                    await apiService.deleteDatabase(connection.id);
                } catch (deleteError) {
                    console.error('Failed to delete temporary connection:', deleteError);
                }
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create test connection',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const connection = await apiService.createDatabase(formData);

            // Call onSuccess callback with the new connection ID
            if (onSuccess) {
                onSuccess(connection.id);
            }
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to create database connection');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card variant="elevated" padding="lg">
            <CardHeader
                title="Add Database Connection"
                subtitle="Configure a new PostgreSQL database connection"
            />
            <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Connection Name */}
                    <Input
                        label="Connection Name"
                        name="name"
                        type="text"
                        placeholder="My Database"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.name}
                        required
                        helperText="A friendly name to identify this connection"
                    />

                    {/* Host */}
                    <Input
                        label="Host"
                        name="host"
                        type="text"
                        placeholder="localhost or 192.168.1.100"
                        value={formData.host}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.host}
                        required
                        helperText="Database server hostname or IP address"
                    />

                    {/* Port */}
                    <Input
                        label="Port"
                        name="port"
                        type="number"
                        placeholder="5432"
                        value={formData.port}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.port}
                        required
                        helperText="PostgreSQL port (default: 5432)"
                    />

                    {/* Database Name */}
                    <Input
                        label="Database Name"
                        name="database"
                        type="text"
                        placeholder="mydb"
                        value={formData.database}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.database}
                        required
                        helperText="Name of the database to connect to"
                    />

                    {/* Username */}
                    <Input
                        label="Username"
                        name="username"
                        type="text"
                        placeholder="postgres"
                        value={formData.username}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.username}
                        required
                        helperText="Database user with appropriate permissions"
                    />

                    {/* Password */}
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.password}
                        required
                        helperText="Password will be encrypted before storage"
                    />

                    {/* SSL Enabled */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="ssl_enabled"
                            name="ssl_enabled"
                            checked={formData.ssl_enabled}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                            htmlFor="ssl_enabled"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Enable SSL/TLS Connection
                        </label>
                    </div>

                    {/* SSL Certificate Path (conditional) */}
                    {formData.ssl_enabled && (
                        <Input
                            label="SSL Certificate Path (Optional)"
                            name="ssl_cert_path"
                            type="text"
                            placeholder="/path/to/certificate.pem"
                            value={formData.ssl_cert_path}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.ssl_cert_path}
                            helperText="Path to SSL certificate file (leave empty for default)"
                        />
                    )}

                    {/* Test Result Display */}
                    {testResult && (
                        <div className="mt-4">
                            {testResult.success ? (
                                <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4">
                                    <div className="flex items-start">
                                        <svg
                                            className="h-5 w-5 text-green-500"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                                Connection Successful
                                            </p>
                                            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                                                {testResult.message}
                                                {testResult.latency_ms && ` (${testResult.latency_ms.toFixed(0)}ms)`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <ErrorMessage
                                    variant="banner"
                                    title="Connection Failed"
                                    message={testResult.message}
                                    onDismiss={() => setTestResult(null)}
                                />
                            )}
                        </div>
                    )}

                    {/* Submit Error Display */}
                    {submitError && (
                        <ErrorMessage
                            variant="banner"
                            title="Failed to Save Connection"
                            message={submitError}
                            onDismiss={() => setSubmitError(null)}
                        />
                    )}
                </form>
            </CardBody>
            <CardFooter align="right">
                {onCancel && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isSubmitting || isTesting}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    isLoading={isTesting}
                    disabled={isSubmitting}
                >
                    Test Connection
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    disabled={isTesting}
                >
                    Save Connection
                </Button>
            </CardFooter>
        </Card>
    );
};
