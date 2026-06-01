import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'bordered' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'md',
    className = '',
    ...props
}) => {
    const variantStyles = {
        default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        bordered: 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600',
        elevated: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
    };

    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div
            className={`rounded-lg ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
    title,
    subtitle,
    action,
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={`flex items-start justify-between mb-4 ${className}`} {...props}>
            <div className="flex-1">
                {title && (
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                    </h3>
                )}
                {subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {subtitle}
                    </p>
                )}
                {children}
            </div>
            {action && <div className="ml-4">{action}</div>}
        </div>
    );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardBody: React.FC<CardBodyProps> = ({
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: 'left' | 'center' | 'right';
}

export const CardFooter: React.FC<CardFooterProps> = ({
    children,
    align = 'right',
    className = '',
    ...props
}) => {
    const alignStyles = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
    };

    return (
        <div
            className={`flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${alignStyles[align]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};
