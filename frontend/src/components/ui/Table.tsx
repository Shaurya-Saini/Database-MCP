import React from 'react';

export interface TableColumn {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => React.ReactNode;
}

export interface TableProps {
    columns: TableColumn[];
    data: any[];
    emptyMessage?: string;
    striped?: boolean;
    hoverable?: boolean;
    bordered?: boolean;
    compact?: boolean;
    maxHeight?: string;
}

export const Table: React.FC<TableProps> = ({
    columns,
    data,
    emptyMessage = 'No data available',
    maxHeight,
}) => {
    return (
        <div style={{ maxHeight, overflowY: 'auto' }}>
            <table className="results-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length}>{emptyMessage}</td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map((column) => (
                                    <td key={column.key}>
                                        {column.render
                                            ? column.render(row[column.key], row)
                                            : row[column.key] !== null && row[column.key] !== undefined
                                                ? String(row[column.key])
                                                : '-'}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
}

export const TablePagination: React.FC<TablePaginationProps> = () => {
    return (
        <div>
            <span>Showing results</span>
        </div>
    );
};
