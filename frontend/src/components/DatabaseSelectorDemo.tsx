import React, { useState } from 'react';
import { DatabaseSelector } from './DatabaseSelector';
import { Card } from './ui/Card';

/**
 * DatabaseSelectorDemo Component
 * 
 * Demonstrates how to integrate the DatabaseSelector component
 * into your application. This shows:
 * 
 * 1. Managing active database state
 * 2. Responding to database changes
 * 3. Displaying the selector in a header/sidebar
 * 4. Using the selected database for queries
 * 
 * Usage Example:
 * ```tsx
 * import { DatabaseSelectorDemo } from './components/DatabaseSelectorDemo';
 * 
 * function App() {
 *   return <DatabaseSelectorDemo />;
 * }
 * ```
 */
export const DatabaseSelectorDemo: React.FC = () => {
    const [activeDatabaseId, setActiveDatabaseId] = useState<string | undefined>(undefined);
    const [changeLog, setChangeLog] = useState<Array<{ timestamp: string; databaseId: string }>>([]);

    const handleDatabaseChange = (databaseId: string) => {
        console.log('Database changed to:', databaseId);
        setActiveDatabaseId(databaseId);

        // Log the change for demo purposes
        setChangeLog(prev => [
            ...prev,
            {
                timestamp: new Date().toLocaleTimeString(),
                databaseId,
            },
        ]);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with Database Selector */}
                <header className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Universal Database Chat Assistant
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Database Selector Component Demo
                            </p>
                        </div>

                        {/* Database Selector in Header */}
                        <DatabaseSelector
                            activeDatabaseId={activeDatabaseId}
                            onDatabaseChange={handleDatabaseChange}
                        />
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Current State */}
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Current State
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Active Database ID:
                                </label>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <code className="text-sm text-gray-900 dark:text-gray-100">
                                        {activeDatabaseId || 'None selected'}
                                    </code>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status:
                                </label>
                                <div className="flex items-center gap-2">
                                    {activeDatabaseId ? (
                                        <>
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                ✓ Database Selected
                                            </span>
                                        </>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                            ⚠ No Database Selected
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Right Column: Change Log */}
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Change Log
                        </h2>

                        {changeLog.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                No database changes yet. Select a database to see the log.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {changeLog.map((entry, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {entry.timestamp}
                                        </span>
                                        <code className="text-sm text-gray-900 dark:text-gray-100">
                                            {entry.databaseId}
                                        </code>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Integration Examples */}
                <Card>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Integration Examples
                    </h2>

                    <div className="space-y-6">
                        {/* Example 1: Header Integration */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                1. Header Integration
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Place the selector in your application header for easy access:
                            </p>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {`<header className="flex items-center justify-between">
  <h1>My App</h1>
  <DatabaseSelector
    activeDatabaseId={activeDatabaseId}
    onDatabaseChange={setActiveDatabaseId}
  />
</header>`}
                            </pre>
                        </div>

                        {/* Example 2: Sidebar Integration */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                2. Sidebar Integration
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Use in a sidebar for persistent visibility:
                            </p>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {`<aside className="w-64 p-4">
  <DatabaseSelector
    activeDatabaseId={activeDatabaseId}
    onDatabaseChange={setActiveDatabaseId}
    className="mb-4"
  />
  {/* Other sidebar content */}
</aside>`}
                            </pre>
                        </div>

                        {/* Example 3: Using with Queries */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                3. Using Selected Database for Queries
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Pass the active database ID to your query execution:
                            </p>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {`const executeQuery = async (query: string) => {
  if (!activeDatabaseId) {
    alert('Please select a database first');
    return;
  }
  
  const response = await apiService.executeQuery({
    database_id: activeDatabaseId,
    query,
    llm_provider: 'openai',
    llm_model: 'gpt-4',
    api_key: 'your-api-key',
  });
  
  return response;
};`}
                            </pre>
                        </div>
                    </div>
                </Card>

                {/* Features Overview */}
                <Card>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Component Features
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Connection Status
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Visual indicators for connected, disconnected, and error states
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Dropdown Selection
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Easy switching between configured databases
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Refresh Capability
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Reload database list without page refresh
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Error Handling
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Graceful error states with retry functionality
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Loading States
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Clear feedback during data fetching
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Dark Mode Support
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Fully styled for both light and dark themes
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
