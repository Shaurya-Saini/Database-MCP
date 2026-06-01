import React, { useState } from 'react';
import type { DatabaseConnection } from '../../types';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

export interface DatabaseConnectionListProps {
    connections: DatabaseConnection[];
    isLoading?: boolean;
    error?: string;
    onEdit: (connection: DatabaseConnection) => void;
    onDelete: (connectionId: string) => void;
    onTest?: (connectionId: string) => void;
}

export const DatabaseConnectionList: React.FC<DatabaseConnectionListProps> = ({
    connections,
    isLoading = false,
    error,
    onEdit,
    onDelete,
    onTest,
}) => {
    const [testingId, setTestingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleTest = async (connectionId: string) => {
        if (!onTest) return;
        setTestingId(connectionId);
        try {
            await onTest(connectionId);
        } finally {
            setTestingId(null);
        }
    };

    const handleDelete = async (connectionId: string) => {
        if (!confirm('Are you sure you want to delete this database connection?')) {
            return;
        }
        setDeletingId(connectionId);
        try {
            await onDelete(connectionId);
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusBadge = (status: DatabaseConnection['status']) => {
        const statusConfig = {
            connected: {
                color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                icon: '●',
                label: 'Connected',
            },
            disconnected: {
                color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
                icon: '○',
                label: 'Disconnected',
            },
            error: {
                color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                icon: '✕',
                label: 'Error',
            },
        };

        const config = statusConfig[status];

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
            >
                <span className="text-sm">{config.icon}</span>
                {config.label}
            </span>
        );
    };

    if (isLoading) {
        return (
            <Card>
                <CardBody>
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="lg" />
                    </div>
                </CardBody>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardBody>
                    <ErrorMessage message={error} />
                </CardBody>
            </Card>
        );
    }

    if (connections.length === 0) {
        return (
            <Card>
                <CardBody>
                    <div className="text-center py-8">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            No database connections
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Get started by adding a new database connection.
                        </p>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {connections.map((connection) => (
                <Card key={connection.id} variant="bordered">
                    <CardBody>
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                                        {connection.name}
                                    </h3>
                                    {getStatusBadge(connection.status)}
                                </div>

                                <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="h-4 w-4 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                                            />
                                        </svg>
                                        <span className="font-medium">Host:</span>
                                        <span className="truncate">
                                            {connection.host}:{connection.port}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="h-4 w-4 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                                            />
                                        </svg>
                                        <span className="font-medium">Database:</span>
                                        <span className="truncate">{connection.database}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="h-4 w-4 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                        <span className="font-medium">User:</span>
                                        <span className="truncate">{connection.username}</span>
                                    </div>

                                    {connection.ssl_enabled && (
                                        <div className="flex items-center gap-2">
                                            <svg
                                                className="h-4 w-4 text-green-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                />
                                            </svg>
                                            <span className="text-green-600 dark:text-green-400 font-medium">
                                                SSL Enabled
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                                    Created: {new Date(connection.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                                {onTest && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTest(connection.id)}
                                        isLoading={testingId === connection.id}
                                        disabled={testingId !== null || deletingId !== null}
                                        leftIcon={
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        }
                                    >
                                        Test
                                    </Button>
                                )}

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onEdit(connection)}
                                    disabled={testingId !== null || deletingId !== null}
                                    leftIcon={
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    }
                                >
                                    Edit
                                </Button>

                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(connection.id)}
                                    isLoading={deletingId === connection.id}
                                    disabled={testingId !== null || deletingId !== null}
                                    leftIcon={
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    }
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};
