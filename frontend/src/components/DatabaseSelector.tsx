import React, { useState, useEffect } from 'react';
import { Dropdown, type DropdownItem } from './ui/Dropdown';
import { LoadingSpinner } from './ui/LoadingSpinner';
import type { DatabaseConnection } from '../types';
import apiService from '../services/api';

export interface DatabaseSelectorProps {
    activeDatabaseId?: string;
    onDatabaseChange: (databaseId: string) => void;
    className?: string;
}

/**
 * DatabaseSelector Component
 * 
 * Displays the active database connection and provides a dropdown
 * for switching between configured databases.
 * 
 * Features:
 * - Shows active database name and connection status
 * - Dropdown menu for switching databases
 * - Visual status indicators (connected, disconnected, error)
 * - Loading state while fetching databases
 * 
 * **Validates: Requirements 7.1, 7.2, 1.5**
 */
export const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
    activeDatabaseId,
    onDatabaseChange,
    className = '',
}) => {
    const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch databases on mount
    useEffect(() => {
        fetchDatabases();
    }, []);

    const fetchDatabases = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await apiService.getDatabases();
            setDatabases(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load databases');
            console.error('Error fetching databases:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Find the active database
    const activeDatabase = databases.find(db => db.id === activeDatabaseId);

    // Get status icon and color
    const getStatusIndicator = (status: DatabaseConnection['status']) => {
        switch (status) {
            case 'connected':
                return {
                    icon: '●',
                    color: 'text-green-500',
                    label: 'Connected',
                };
            case 'disconnected':
                return {
                    icon: '●',
                    color: 'text-gray-400',
                    label: 'Disconnected',
                };
            case 'error':
                return {
                    icon: '●',
                    color: 'text-red-500',
                    label: 'Error',
                };
            default:
                return {
                    icon: '●',
                    color: 'text-gray-400',
                    label: 'Unknown',
                };
        }
    };

    // Convert databases to dropdown items
    const dropdownItems: DropdownItem[] = databases.map(db => {
        const status = getStatusIndicator(db.status);
        return {
            label: db.name,
            value: db.id,
            icon: <span className={status.color}>{status.icon}</span>,
            disabled: db.status === 'error',
        };
    });

    // Add divider and refresh option
    if (dropdownItems.length > 0) {
        dropdownItems.push({ label: '', value: 'divider', divider: true });
        dropdownItems.push({
            label: 'Refresh Connections',
            value: 'refresh',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ),
        });
    }

    const handleSelect = (value: string) => {
        if (value === 'refresh') {
            fetchDatabases();
        } else {
            onDatabaseChange(value);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading databases...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="text-sm text-red-600 dark:text-red-400">Error: {error}</span>
                <button
                    onClick={fetchDatabases}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    Retry
                </button>
            </div>
        );
    }

    // No databases configured
    if (databases.length === 0) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="text-sm text-gray-600 dark:text-gray-400">No databases configured</span>
            </div>
        );
    }

    // No active database selected
    if (!activeDatabase) {
        return (
            <Dropdown
                trigger={
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Database</span>
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                }
                items={dropdownItems}
                onSelect={handleSelect}
                align="left"
                className={className}
            />
        );
    }

    // Active database selected
    const status = getStatusIndicator(activeDatabase.status);

    return (
        <Dropdown
            trigger={
                <button className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {activeDatabase.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-xs ${status.color}`}>{status.icon}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{status.label}</span>
                        </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            }
            items={dropdownItems}
            onSelect={handleSelect}
            align="left"
            className={className}
        />
    );
};
