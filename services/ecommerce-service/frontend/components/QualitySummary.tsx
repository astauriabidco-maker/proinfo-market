/**
 * Quality Summary Component
 * Résumé du contrôle qualité pour fiche produit
 */

import React from 'react';
import { Badge } from '../design-system/components/Badge';

interface QualityCheckItem {
    label: string;
    passed: boolean;
}

interface QualitySummaryProps {
    grade?: string;
    checks?: QualityCheckItem[];
    batterySoH?: number;
    className?: string;
}

const defaultChecks: QualityCheckItem[] = [
    { label: 'Inspection visuelle', passed: true },
    { label: 'Test POST/BIOS', passed: true },
    { label: 'Test mémoire', passed: true },
    { label: 'Test stockage', passed: true },
    { label: 'Test réseau', passed: true },
    { label: 'Test charge/stress', passed: true },
];

export function QualitySummary({
    grade,
    checks = defaultChecks,
    batterySoH,
    className = '',
}: QualitySummaryProps) {
    const passedCount = checks.filter((c) => c.passed).length;
    const allPassed = passedCount === checks.length;

    return (
        <div className={`bg-white rounded-lg border border-[#E9ECEF] p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#1E3A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-semibold text-[#212529]">Contrôle Qualité</h4>
                </div>
                {grade && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[#6C757D]">Grade</span>
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#1E3A5F] text-white text-sm font-bold rounded">
                            {grade}
                        </span>
                    </div>
                )}
            </div>

            {/* Status */}
            <div className="mb-4">
                {allPassed ? (
                    <Badge variant="success" dot>
                        Tous les tests réussis ({passedCount}/{checks.length})
                    </Badge>
                ) : (
                    <Badge variant="warning" dot>
                        {passedCount}/{checks.length} tests réussis
                    </Badge>
                )}
            </div>

            {/* Checklist */}
            <ul className="space-y-2 mb-4">
                {checks.map((check, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                        {check.passed ? (
                            <svg className="w-4 h-4 text-[#388E3C]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-[#C62828]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        )}
                        <span className={check.passed ? 'text-[#212529]' : 'text-[#6C757D]'}>
                            {check.label}
                        </span>
                    </li>
                ))}
            </ul>

            {/* Battery SoH (if applicable) */}
            {batterySoH !== undefined && (
                <div className="pt-4 border-t border-[#E9ECEF]">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6C757D]">État batterie (SoH)</span>
                        <span className={`font-medium ${batterySoH >= 80 ? 'text-[#388E3C]' : batterySoH >= 60 ? 'text-[#FFA000]' : 'text-[#C62828]'}`}>
                            {batterySoH}%
                        </span>
                    </div>
                    <div className="mt-2 h-2 bg-[#E9ECEF] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${batterySoH >= 80 ? 'bg-[#388E3C]' : batterySoH >= 60 ? 'bg-[#FFA000]' : 'bg-[#C62828]'
                                }`}
                            style={{ width: `${batterySoH}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
