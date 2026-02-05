/**
 * CtoConfigurator Component
 * Interface de configuration CTO
 * 
 * IMPORTANT: Ce composant ne valide RIEN.
 * Toutes les validations sont faites par le CTO Service.
 */

import { useState } from 'react';
import { Asset, CtoComponent, CtoValidationResult, validateCtoConfiguration, createOrder } from '@/services/api';

interface CtoConfiguratorProps {
    asset: Asset;
}

// Options de composants (exemple simplifié)
const COMPONENT_OPTIONS = {
    CPU: [
        { reference: 'XEON-GOLD-6230', label: 'Intel Xeon Gold 6230' },
        { reference: 'XEON-SILVER-4210', label: 'Intel Xeon Silver 4210' }
    ],
    RAM: [
        { reference: 'DDR4-16GB', label: 'DDR4 16GB' },
        { reference: 'DDR4-32GB', label: 'DDR4 32GB' },
        { reference: 'DDR4-64GB', label: 'DDR4 64GB' }
    ],
    SSD: [
        { reference: 'NVME-512GB', label: 'NVMe 512GB' },
        { reference: 'NVME-1TB', label: 'NVMe 1TB' },
        { reference: 'NVME-2TB', label: 'NVMe 2TB' }
    ]
};

export default function CtoConfigurator({ asset }: CtoConfiguratorProps) {
    const [components, setComponents] = useState<CtoComponent[]>([]);
    const [validationResult, setValidationResult] = useState<CtoValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addComponent = (type: string, reference: string) => {
        const existing = components.find(c => c.type === type && c.reference === reference);
        if (existing) {
            setComponents(components.map(c =>
                c.type === type && c.reference === reference
                    ? { ...c, quantity: c.quantity + 1 }
                    : c
            ));
        } else {
            setComponents([...components, { type, reference, quantity: 1 }]);
        }
        // Reset validation when config changes
        setValidationResult(null);
        setError(null);
    };

    const removeComponent = (type: string, reference: string) => {
        setComponents(components.filter(c => !(c.type === type && c.reference === reference)));
        setValidationResult(null);
        setError(null);
    };

    const handleValidate = async () => {
        if (components.length === 0) {
            setError('Ajoutez au moins un composant');
            return;
        }

        setIsValidating(true);
        setError(null);

        try {
            const result = await validateCtoConfiguration(asset.id, asset.model, components);
            setValidationResult(result);
            if (!result.valid) {
                setError(result.errors[0]?.message || 'Configuration invalide');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de validation');
        } finally {
            setIsValidating(false);
        }
    };

    const handleOrder = async () => {
        if (!validationResult?.valid || !validationResult.configurationId) {
            return;
        }

        setIsOrdering(true);
        setError(null);

        try {
            await createOrder(asset.id, validationResult.configurationId, 'GUEST-USER');
            setOrderSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la commande');
        } finally {
            setIsOrdering(false);
        }
    };

    if (orderSuccess) {
        return (
            <div style={{
                backgroundColor: '#10b981',
                color: '#fff',
                padding: '24px',
                borderRadius: '8px',
                textAlign: 'center'
            }}>
                <h2>Commande confirmée ✓</h2>
                <p>Votre commande a été créée avec succès.</p>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>Configuration CTO</h2>

            {/* Options de composants */}
            {Object.entries(COMPONENT_OPTIONS).map(([type, options]) => (
                <div key={type} style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>{type}</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {options.map(option => (
                            <button
                                key={option.reference}
                                onClick={() => addComponent(type, option.reference)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                + {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Configuration actuelle */}
            {components.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Configuration sélectionnée</h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {components.map(c => (
                            <li key={`${c.type}-${c.reference}`} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                backgroundColor: '#f9fafb',
                                marginBottom: '4px',
                                borderRadius: '4px'
                            }}>
                                <span>{c.type}: {c.reference} x{c.quantity}</span>
                                <button
                                    onClick={() => removeComponent(c.type, c.reference)}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Erreur */}
            {error && (
                <div style={{
                    backgroundColor: '#fef2f2',
                    color: '#ef4444',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '16px'
                }}>
                    {error}
                </div>
            )}

            {/* Résultat de validation */}
            {validationResult?.valid && (
                <div style={{
                    backgroundColor: '#ecfdf5',
                    padding: '16px',
                    borderRadius: '4px',
                    marginBottom: '16px'
                }}>
                    <p style={{ margin: '0 0 8px 0', color: '#10b981', fontWeight: 'bold' }}>
                        ✓ Configuration validée
                    </p>
                    <p style={{ margin: '0 0 4px 0' }}>
                        Prix total: <strong>{validationResult.priceSnapshot?.total.toFixed(2)} {validationResult.priceSnapshot?.currency}</strong>
                    </p>
                    <p style={{ margin: 0 }}>
                        Délai: <strong>{validationResult.leadTimeDays} jours</strong>
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                        Prix figé le {new Date(validationResult.priceSnapshot?.frozenAt ?? '').toLocaleString()}
                    </p>
                </div>
            )}

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    onClick={handleValidate}
                    disabled={isValidating || components.length === 0}
                    style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: isValidating ? '#9ca3af' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isValidating ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                    }}
                >
                    {isValidating ? 'Validation...' : 'Valider la configuration'}
                </button>

                {validationResult?.valid && (
                    <button
                        onClick={handleOrder}
                        disabled={isOrdering}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: isOrdering ? '#9ca3af' : '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isOrdering ? 'not-allowed' : 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        {isOrdering ? 'Commande...' : 'Commander'}
                    </button>
                )}
            </div>
        </div>
    );
}
