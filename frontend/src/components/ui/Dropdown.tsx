import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
    label: string;
    value: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
}

export interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    onSelect: (value: string) => void;
    align?: 'left' | 'right';
    className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
    trigger,
    items,
    onSelect,
    align = 'left',
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleSelect = (item: DropdownItem) => {
        if (!item.disabled && !item.divider) {
            onSelect(item.value);
            setIsOpen(false);
        }
    };

    const alignStyles = {
        left: 'left-0',
        right: 'right-0',
    };

    return (
        <div ref={dropdownRef} className={`relative inline-block ${className}`}>
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={`absolute ${alignStyles[align]} mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50`}
                >
                    <div className="py-1">
                        {items.map((item, index) => {
                            if (item.divider) {
                                return (
                                    <div
                                        key={`divider-${index}`}
                                        className="my-1 border-t border-gray-200 dark:border-gray-700"
                                    />
                                );
                            }

                            return (
                                <button
                                    key={item.value}
                                    onClick={() => handleSelect(item)}
                                    disabled={item.disabled}
                                    className={`
                    w-full text-left px-4 py-2 text-sm flex items-center gap-2
                    ${item.disabled
                                            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                            : item.danger
                                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                    transition-colors
                  `}
                                >
                                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
