import React from 'react';

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
    title,
    maxHeight = '400px',
}) => {
    return (
        <div className="code-block" style={{ maxHeight, overflow: 'auto' }}>
            {title && <div className="code-block-header">{title}</div>}
            <div className="code-block-content">
                {code}
            </div>
        </div>
    );
};

export interface InlineCodeProps {
    children: React.ReactNode;
    className?: string;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children }) => {
    return (
        <code>{children}</code>
    );
};
