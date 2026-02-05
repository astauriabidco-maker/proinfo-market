/**
 * AvailabilityBadge Component
 * Badge de disponibilité temps réel
 */

import React from 'react';
import { Badge } from '../design-system/components/Badge';

interface AvailabilityBadgeProps {
    available: boolean;
    stock?: number;
    className?: string;
}

export function AvailabilityBadge({
    available,
    stock,
    className = '',
}: AvailabilityBadgeProps) {
    if (!available) {
        return (
            <Badge variant="neutral" className={className}>
                Indisponible
            </Badge>
        );
    }

    if (stock !== undefined && stock <= 3) {
        return (
            <Badge variant="warning" dot className={className}>
                Stock limité ({stock})
            </Badge>
        );
    }

    return (
        <Badge variant="success" dot className={className}>
            Disponible
        </Badge>
    );
}
