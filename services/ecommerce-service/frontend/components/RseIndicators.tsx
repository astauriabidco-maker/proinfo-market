/**
 * RseIndicators Component
 * Indicateurs RSE pour fiche produit
 */

import React from 'react';

interface RseIndicatorsProps {
    co2SavedKg?: number;
    waterSavedL?: number;
    energySavedKwh?: number;
    className?: string;
}

export function RseIndicators({
    co2SavedKg,
    waterSavedL,
    energySavedKwh,
    className = '',
}: RseIndicatorsProps) {
    if (!co2SavedKg && !waterSavedL && !energySavedKwh) {
        return null;
    }

    return (
        <div className={`bg-[#E8F5E9] rounded-lg p-4 ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-[#388E3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-sm font-semibold text-[#2E7D32]">Impact environnemental</h4>
            </div>

            <p className="text-xs text-[#388E3C] mb-3">
                En choisissant cet équipement reconditionné, vous économisez :
            </p>

            <div className="grid grid-cols-3 gap-3">
                {co2SavedKg !== undefined && (
                    <div className="text-center">
                        <p className="text-lg font-bold text-[#2E7D32]">{co2SavedKg}</p>
                        <p className="text-xs text-[#388E3C]">kg CO₂</p>
                    </div>
                )}
                {waterSavedL !== undefined && (
                    <div className="text-center">
                        <p className="text-lg font-bold text-[#2E7D32]">{(waterSavedL / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-[#388E3C]">L d'eau</p>
                    </div>
                )}
                {energySavedKwh !== undefined && (
                    <div className="text-center">
                        <p className="text-lg font-bold text-[#2E7D32]">{energySavedKwh}</p>
                        <p className="text-xs text-[#388E3C]">kWh</p>
                    </div>
                )}
            </div>

            <p className="text-[10px] text-[#6C757D] mt-3 text-center">
                Estimations basées sur moyennes sectorielles
            </p>
        </div>
    );
}
