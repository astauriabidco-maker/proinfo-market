/**
 * Asset Specifications Component
 * Table des spécifications techniques
 */

import React from 'react';

export interface AssetSpec {
    label: string;
    value: string | React.ReactNode;
}

interface AssetSpecsProps {
    specs: AssetSpec[];
    className?: string;
}

export function AssetSpecs({ specs, className = '' }: AssetSpecsProps) {
    return (
        <table className={`specs-table ${className}`}>
            <tbody>
                {specs.map((spec, index) => (
                    <tr key={index}>
                        <td>{spec.label}</td>
                        <td>{spec.value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
