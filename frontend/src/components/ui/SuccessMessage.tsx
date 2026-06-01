import React from 'react';

export interface SuccessMessageProps {
    title?: string;
    message: string;
    details?: string[];
    onDismiss?: () => void;
    variant?: 'inline' | 'card' | 'banner';
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
    title = 'Success',
    message,
    details,
    onDismiss,
    variant = 'card',
}) => {
    const SuccessIcon = () => (
        <svg
            className="h-5 w-5 text-green-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    );

    if (variant === 'inline') {
        return (
            <div className="flex items-start gap-2 text-green-600 dark:text-green-400">
                <SuccessIcon />
                <span className="text-sm">{message}</span>
            </div>
        );
    }

    if (variant === 'banner') {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4">
                <div className="flex items-start">
                    <SuccessIcon />
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                            {message}
                        </p>
                        {details && details.length > 0 && (
                            <ul className="mt-2 text-sm text-green-700 dark:text-green-400 list-disc list-inside">
                                {details.map((detail, index) => (
                                    <li key={index}>{detail}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="ml-3 text-green-500 hover:text-green-700 dark:hover:text-green-300"
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
        <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <SuccessIcon />
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                        {message}
                    </p>
                    {details && details.length > 0 && (
                        <ul className="mt-2 text-sm text-green-600 dark:text-green-500 list-disc list-inside space-y-1">
                            {details.map((detail, index) => (
                                <li key={index}>{detail}</li>
                            ))}
                        </ul>
                    )}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-green-400 hover:text-green-600 dark:hover:text-green-300"
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
