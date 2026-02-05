/**
 * Design System - Badge Component
 * Badge technique et sobre
 */

import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
    dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
    warning: 'bg-[#FFF8E1] text-[#FF8F00] border-[#FFE082]',
    error: 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]',
    info: 'bg-[#E8EEF4] text-[#1E3A5F] border-[#C5D5E4]',
    neutral: 'bg-[#F1F3F5] text-[#495057] border-[#DEE2E6]',
};

const dotStyles: Record<BadgeVariant, string> = {
    success: 'bg-[#4CAF50]',
    warning: 'bg-[#FFA000]',
    error: 'bg-[#F44336]',
    info: 'bg-[#3B73A7]',
    neutral: 'bg-[#6C757D]',
};

export function Badge({
    variant = 'neutral',
    children,
    className = '',
    dot = false,
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1
        text-xs font-medium
        rounded-full
        border
        ${variantStyles[variant]}
        ${className}
      `}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />
            )}
            {children}
        </span>
    );
}
