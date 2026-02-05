/**
 * CTO Summary Component
 * Résumé de configuration CTO
 */

import React from 'react';
import { Badge } from '../design-system/components/Badge';

interface CtoOption {
    label: string;
    value: string;
    price?: number;
}

interface CtoSummaryProps {
    baseProduct: {
        brand: string;
        model: string;
    };
    options: CtoOption[];
    totalPrice?: number;
    deliveryDays?: number;
    validated?: boolean;
    className?: string;
}

export function CtoSummary({
    baseProduct,
    options,
    totalPrice,
    deliveryDays,
    validated = false,
    className = '',
}: CtoSummaryProps) {
    return (
        <div className={`bg-white rounded-lg border border-[#E9ECEF] p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[#212529]">Résumé configuration</h4>
                {validated && (
                    <Badge variant="success" dot>
                        Validée techniquement
                    </Badge>
                )}
            </div>

            {/* Base product */}
            <div className="pb-4 border-b border-[#E9ECEF]">
                <p className="text-sm text-[#6C757D]">Équipement de base</p>
                <p className="font-medium text-[#212529]">
                    {baseProduct.brand} {baseProduct.model}
                </p>
            </div>

            {/* Options */}
            <div className="py-4 space-y-3">
                {options.map((option, index) => (
                    <div key={index} className="flex justify-between items-start text-sm">
                        <div>
                            <p className="text-[#6C757D]">{option.label}</p>
                            <p className="font-medium text-[#212529]">{option.value}</p>
                        </div>
                        {option.price !== undefined && option.price > 0 && (
                            <span className="text-[#1E3A5F] font-medium">
                                +{option.price.toLocaleString('fr-FR')} €
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Total */}
            {totalPrice !== undefined && (
                <div className="pt-4 border-t border-[#E9ECEF]">
                    <div className="flex justify-between items-center">
                        <span className="text-[#6C757D]">Total HT</span>
                        <span className="text-2xl font-bold text-[#1E3A5F]">
                            {totalPrice.toLocaleString('fr-FR')} €
                        </span>
                    </div>
                </div>
            )}

            {/* Delivery */}
            {deliveryDays !== undefined && (
                <div className="mt-4 p-3 bg-[#F8F9FA] rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-[#1E3A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-[#6C757D]">
                            Délai estimé : <strong className="text-[#212529]">{deliveryDays} jours ouvrés</strong>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
