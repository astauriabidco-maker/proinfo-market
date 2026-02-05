/**
 * Design System - Table Component
 * Table technique lisible pour acheteurs pro
 */

import React from 'react';

interface TableProps {
    children: React.ReactNode;
    className?: string;
}

export function Table({ children, className = '' }: TableProps) {
    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full text-sm text-left">
                {children}
            </table>
        </div>
    );
}

interface TableHeadProps {
    children: React.ReactNode;
    className?: string;
}

export function TableHead({ children, className = '' }: TableHeadProps) {
    return (
        <thead className={`bg-[#F8F9FA] border-b border-[#DEE2E6] ${className}`}>
            {children}
        </thead>
    );
}

interface TableBodyProps {
    children: React.ReactNode;
    className?: string;
}

export function TableBody({ children, className = '' }: TableBodyProps) {
    return <tbody className={`divide-y divide-[#E9ECEF] ${className}`}>{children}</tbody>;
}

interface TableRowProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export function TableRow({
    children,
    className = '',
    hover = true,
    onClick,
}: TableRowProps) {
    return (
        <tr
            className={`
        ${hover ? 'hover:bg-[#F8F9FA] transition-colors' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

interface TableHeaderCellProps {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

export function TableHeaderCell({
    children,
    className = '',
    align = 'left',
}: TableHeaderCellProps) {
    const alignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    }[align];

    return (
        <th
            className={`
        px-4 py-3
        font-semibold text-[#495057]
        uppercase tracking-wide text-xs
        ${alignClass}
        ${className}
      `}
        >
            {children}
        </th>
    );
}

interface TableCellProps {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

export function TableCell({
    children,
    className = '',
    align = 'left',
}: TableCellProps) {
    const alignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    }[align];

    return (
        <td
            className={`
        px-4 py-3
        text-[#212529]
        ${alignClass}
        ${className}
      `}
        >
            {children}
        </td>
    );
}
