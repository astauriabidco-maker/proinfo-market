/**
 * ProductCard Component
 * Affiche une carte produit dans le catalogue
 */

import Link from 'next/link';
import { Asset, Availability } from '@/services/api';

interface ProductCardProps {
    asset: Asset;
    availability?: Availability;
}

export default function ProductCard({ asset, availability }: ProductCardProps) {
    const isAvailable = availability?.available ?? false;

    return (
        <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{ marginBottom: '12px' }}>
                <span style={{
                    backgroundColor: isAvailable ? '#22c55e' : '#ef4444',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>
                    {isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
                {asset.brand} {asset.model}
            </h3>

            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                Type: {asset.assetType}
            </p>

            {asset.grade && (
                <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                    Grade: {asset.grade}
                </p>
            )}

            <p style={{ margin: '0 0 16px 0', color: '#999', fontSize: '12px' }}>
                S/N: {asset.serialNumber}
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                    href={`/products/${asset.id}`}
                    style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '14px'
                    }}
                >
                    Voir détails
                </Link>

                {isAvailable && (
                    <Link
                        href={`/cto/${asset.id}`}
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '8px 16px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '14px'
                        }}
                    >
                        Configurer
                    </Link>
                )}
            </div>
        </div>
    );
}
