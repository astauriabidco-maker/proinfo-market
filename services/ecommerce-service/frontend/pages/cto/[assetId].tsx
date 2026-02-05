/**
 * CTO Configurator Page
 * Configurateur CTO premium - zéro stress décisionnel
 */

import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { CtoSummary } from '../../components/CtoSummary';
import { Button } from '../../design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/components/Card';
import { Badge } from '../../design-system/components/Badge';
import { Alert } from '../../design-system/components/Alert';

// Types
interface CtoOptionValue {
    id: string;
    label: string;
    description?: string;
    price: number;
    incompatibleWith?: string[];
}

interface CtoOptionGroup {
    id: string;
    label: string;
    required: boolean;
    options: CtoOptionValue[];
}

interface BaseProduct {
    id: string;
    brand: string;
    model: string;
    basePrice: number;
}

interface CtoPageProps {
    product: BaseProduct;
    optionGroups: CtoOptionGroup[];
}

// Steps
const STEPS = [
    { id: 1, label: 'Mémoire' },
    { id: 2, label: 'Stockage' },
    { id: 3, label: 'Réseau' },
    { id: 4, label: 'Récapitulatif' },
];

export default function CtoPage({ product, optionGroups }: CtoPageProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    // Pre-select default options (price = 0) to avoid "Configuration incomplète" friction
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
        const defaults: Record<string, string> = {};
        optionGroups.forEach((group) => {
            const defaultOption = group.options.find((o) => o.price === 0);
            if (defaultOption) {
                defaults[group.id] = defaultOption.id;
            }
        });
        return defaults;
    });
    const [submitting, setSubmitting] = useState(false);

    // Get incompatibilities
    const incompatibilities = useMemo(() => {
        const incompatible = new Set<string>();
        Object.values(selectedOptions).forEach((optionId) => {
            optionGroups.forEach((group) => {
                const selected = group.options.find((o) => o.id === optionId);
                if (selected?.incompatibleWith) {
                    selected.incompatibleWith.forEach((id) => incompatible.add(id));
                }
            });
        });
        return incompatible;
    }, [selectedOptions, optionGroups]);

    // Calculate total price
    const totalPrice = useMemo(() => {
        let total = product.basePrice;
        Object.values(selectedOptions).forEach((optionId) => {
            optionGroups.forEach((group) => {
                const option = group.options.find((o) => o.id === optionId);
                if (option) {
                    total += option.price;
                }
            });
        });
        return total;
    }, [selectedOptions, optionGroups, product.basePrice]);

    // Get selected options for summary
    const summaryOptions = useMemo(() => {
        return Object.entries(selectedOptions).map(([groupId, optionId]) => {
            const group = optionGroups.find((g) => g.id === groupId);
            const option = group?.options.find((o) => o.id === optionId);
            return {
                label: group?.label ?? '',
                value: option?.label ?? '',
                price: option?.price ?? 0,
            };
        });
    }, [selectedOptions, optionGroups]);

    // Check if configuration is valid
    const isValid = useMemo(() => {
        return optionGroups
            .filter((g) => g.required)
            .every((g) => selectedOptions[g.id]);
    }, [selectedOptions, optionGroups]);

    const handleSelectOption = (groupId: string, optionId: string) => {
        setSelectedOptions((prev) => ({
            ...prev,
            [groupId]: optionId,
        }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        // Simulation d'envoi (en production, appel API réel)
        await new Promise((resolve) => setTimeout(resolve, 1500));
        router.push(`/products/${product.id}?configured=true`);
    };

    const currentGroup = optionGroups[currentStep - 1];

    return (
        <>
            <Head>
                <title>Configurer {product.brand} {product.model} | ProInfo Market</title>
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen">
                {/* Breadcrumb */}
                <div className="bg-white border-b border-[#E9ECEF]">
                    <div className="container-b2b py-3">
                        <nav className="flex items-center gap-2 text-sm text-[#6C757D]">
                            <Link href="/" className="hover:text-[#1E3A5F]">Catalogue</Link>
                            <span>/</span>
                            <Link href={`/products/${product.id}`} className="hover:text-[#1E3A5F]">
                                {product.brand} {product.model}
                            </Link>
                            <span>/</span>
                            <span className="text-[#212529]">Configuration</span>
                        </nav>
                    </div>
                </div>

                <div className="container-b2b py-8">
                    {/* Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between max-w-2xl mx-auto">
                            {STEPS.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === step.id
                                                ? 'bg-[#1E3A5F] text-white'
                                                : currentStep > step.id
                                                    ? 'bg-[#388E3C] text-white'
                                                    : 'bg-[#E9ECEF] text-[#6C757D]'
                                                }`}
                                        >
                                            {currentStep > step.id ? (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                step.id
                                            )}
                                        </div>
                                        <span className={`mt-2 text-xs ${currentStep === step.id ? 'text-[#1E3A5F] font-medium' : 'text-[#6C757D]'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-[#388E3C]' : 'bg-[#E9ECEF]'}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main content */}
                        <div className="lg:col-span-2">
                            {currentStep < STEPS.length ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{currentGroup?.label}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {currentGroup?.options.map((option) => {
                                                const isIncompatible = incompatibilities.has(option.id);
                                                const isSelected = selectedOptions[currentGroup.id] === option.id;

                                                return (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => !isIncompatible && handleSelectOption(currentGroup.id, option.id)}
                                                        disabled={isIncompatible}
                                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isIncompatible
                                                            ? 'border-[#E9ECEF] bg-[#F8F9FA] opacity-50 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'border-[#1E3A5F] bg-[#E8EEF4]'
                                                                : 'border-[#E9ECEF] hover:border-[#CED4DA]'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-[#212529]">{option.label}</span>
                                                                    {isIncompatible && (
                                                                        <Badge variant="error">Incompatible</Badge>
                                                                    )}
                                                                </div>
                                                                {option.description && (
                                                                    <p className="text-sm text-[#6C757D] mt-1">{option.description}</p>
                                                                )}
                                                            </div>
                                                            <span className={`font-semibold ${option.price > 0 ? 'text-[#1E3A5F]' : 'text-[#388E3C]'}`}>
                                                                {option.price > 0 ? `+${option.price.toLocaleString('fr-FR')} €` : 'Inclus'}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Navigation */}
                                        <div className="flex justify-between mt-8 pt-6 border-t border-[#E9ECEF]">
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                                                disabled={currentStep === 1}
                                            >
                                                Précédent
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={() => setCurrentStep((s) => s + 1)}
                                            >
                                                Suivant
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                /* Final step - Recap */
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Validation de la configuration</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isValid ? (
                                            <Alert variant="success" title="Configuration validée techniquement">
                                                Toutes les options sélectionnées sont compatibles entre elles.
                                                Votre configuration est prête à être commandée.
                                            </Alert>
                                        ) : (
                                            <Alert variant="warning" title="Configuration incomplète">
                                                Veuillez sélectionner toutes les options requises.
                                            </Alert>
                                        )}

                                        {/* Navigation */}
                                        <div className="flex justify-between mt-8 pt-6 border-t border-[#E9ECEF]">
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentStep((s) => s - 1)}
                                            >
                                                Modifier la configuration
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                onClick={handleSubmit}
                                                disabled={!isValid}
                                                loading={submitting}
                                            >
                                                Valider et commander
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar - Summary */}
                        <div className="space-y-6">
                            <CtoSummary
                                baseProduct={{ brand: product.brand, model: product.model }}
                                options={summaryOptions}
                                totalPrice={totalPrice}
                                deliveryDays={5}
                                validated={isValid && currentStep === STEPS.length}
                            />

                            <Alert variant="info">
                                Prix HT. Le délai de livraison est indicatif et peut varier selon la configuration.
                            </Alert>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}

// Server-side data fetching
export const getServerSideProps: GetServerSideProps<CtoPageProps> = async ({ params }) => {
    const assetId = params?.assetId as string;

    const product: BaseProduct = {
        id: assetId,
        brand: 'Dell',
        model: 'PowerEdge R740',
        basePrice: 2500,
    };

    const optionGroups: CtoOptionGroup[] = [
        {
            id: 'ram',
            label: 'Mémoire RAM',
            required: true,
            options: [
                { id: 'ram-64', label: '64 GB DDR4 ECC', description: '4x 16GB', price: 0 },
                { id: 'ram-128', label: '128 GB DDR4 ECC', description: '8x 16GB', price: 350 },
                { id: 'ram-256', label: '256 GB DDR4 ECC', description: '8x 32GB', price: 800 },
                { id: 'ram-512', label: '512 GB DDR4 ECC', description: '16x 32GB', price: 1600, incompatibleWith: ['storage-nvme-8'] },
            ],
        },
        {
            id: 'storage',
            label: 'Stockage',
            required: true,
            options: [
                { id: 'storage-sas-4', label: '4x 960GB SSD SAS', description: '3.8 TB brut', price: 0 },
                { id: 'storage-sas-8', label: '8x 960GB SSD SAS', description: '7.5 TB brut', price: 600 },
                { id: 'storage-nvme-4', label: '4x 1.6TB NVMe', description: '6.4 TB brut', price: 1200 },
                { id: 'storage-nvme-8', label: '8x 1.6TB NVMe', description: '12.8 TB brut', price: 2400 },
            ],
        },
        {
            id: 'network',
            label: 'Réseau',
            required: false,
            options: [
                { id: 'net-10g', label: '4x 10GbE Base-T', description: 'Standard', price: 0 },
                { id: 'net-25g', label: '2x 25GbE SFP28', description: 'Performance', price: 450 },
                { id: 'net-100g', label: '2x 100GbE QSFP28', description: 'Ultra-performance', price: 1200 },
            ],
        },
    ];

    return {
        props: {
            product,
            optionGroups,
        },
    };
};
