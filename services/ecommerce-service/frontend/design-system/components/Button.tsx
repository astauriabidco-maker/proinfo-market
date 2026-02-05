/**
 * Design System - Button Component
 * Bouton premium B2B
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: `
    bg-[#1E3A5F] text-white 
    hover:bg-[#152A45] 
    active:bg-[#0D1A2B]
    border border-transparent
  `,
    secondary: `
    bg-[#E9ECEF] text-[#343A40] 
    hover:bg-[#DEE2E6] 
    active:bg-[#CED4DA]
    border border-transparent
  `,
    outline: `
    bg-transparent text-[#1E3A5F] 
    hover:bg-[#E8EEF4] 
    active:bg-[#C5D5E4]
    border border-[#1E3A5F]
  `,
    ghost: `
    bg-transparent text-[#1E3A5F] 
    hover:bg-[#F8F9FA] 
    active:bg-[#E9ECEF]
    border border-transparent
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm rounded',
    md: 'px-5 py-2.5 text-base rounded-md',
    lg: 'px-8 py-3.5 text-lg rounded-lg',
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    children,
    disabled,
    className = '',
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : icon}
            {children}
        </button>
    );
}
