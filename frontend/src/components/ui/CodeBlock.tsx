import React, { useState } from 'react';

export interface CodeBlockProps {
    code: string;
    language?: string;
    title?: string;
    showLineNumbers?: boolean;
    maxHeight?: string;
    copyable?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
    code,
    language = 'sql',
    title,
    showLineNumbers = true,
    maxHeight = '400px',
    copyable = true,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    const lines = code.split('\n');

    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            {(title || copyable) && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        {title && (
                            <span className="text-sm font-medium text-gray-300">{title}</span>
                        )}
                        {language && (
                            <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded uppercase">
                                {language}
                            </span>
                        )}
                    </div>
                    {copyable && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                            title="Copy to clipboard"
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
            <div
                className="overflow-auto p-4"
                style={{ maxHeight }}
            >
                <pre className="text-sm">
                    <code className="text-gray-100 font-mono">
                        {showLineNumbers ? (
                            <table className="w-full border-collapse">
                                <tbody>
                                    {lines.map((line, index) => (
                                        <tr key={index}>
                                            <td className="text-gray-500 text-right pr-4 select-none align-top" style={{ width: '1%' }}>
                                                {index + 1}
                                            </td>
                                            <td className="text-gray-100 align-top">
                                                {line || '\n'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            code
                        )}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export interface InlineCodeProps {
    children: React.ReactNode;
    className?: string;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children, className = '' }) => {
    return (
        <code
            className={`px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded text-sm font-mono ${className}`}
        >
            {children}
        </code>
    );
};
