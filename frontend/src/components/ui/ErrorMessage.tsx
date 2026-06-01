import React from 'react';

export interface ErrorMessageProps {
    title?: string;
    message: string;
    details?: string[];
    onRetry?: () => void;
    onDismiss?: () => void;
    variant?: 'inline' | 'card' | 'banner';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    title = 'Error',
    message,
    details,
    onRetry,
    onDismiss,
    variant = 'card',
}) => {
    const ErrorIcon = () => (
        <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    );

    if (variant === 'inline') {
        return (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                <ErrorIcon />
                <span className="text-sm">{message}</span>
            </div>
        );
    }

    if (variant === 'banner') {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
                <div className="flex items-start">
                    <ErrorIcon />
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                            {message}
                        </p>
                        {details && details.length > 0 && (
                            <ul className="mt-2 text-sm text-red-700 dark:text-red-400 list-disc list-inside">
                                {details.map((detail, index) => (
                                    <li key={index}>{detail}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="ml-3 text-red-500 hover:text-red-700 dark:hover:text-red-300"
                        >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Card variant (default)
    return (
        <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <ErrorIcon />
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                        {message}
                    </p>
                    {details && details.length > 0 && (
                        <ul className="mt-2 text-sm text-red-600 dark:text-red-500 list-disc list-inside space-y-1">
                            {details.map((detail, index) => (
                                <li key={index}>{detail}</li>
                            ))}
                        </ul>
                    )}
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                            Try Again
                        </button>
                    )}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};
