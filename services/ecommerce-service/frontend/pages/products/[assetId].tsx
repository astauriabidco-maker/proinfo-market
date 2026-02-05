/**
 * Product Detail Page
 * Fiche produit experte pour DSI
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { AvailabilityBadge } from '../../components/AvailabilityBadge';
import { AssetSpecs, AssetSpec } from '../../components/AssetSpecs';
import { QualitySummary } from '../../components/QualitySummary';
import { RseIndicators } from '../../components/RseIndicators';
import { Button } from '../../design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/components/Card';
import { Badge } from '../../design-system/components/Badge';
import { Alert } from '../../design-system/components/Alert';

// Types
interface ProductDetail {
    id: string;
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    status: string;
    grade?: string;
    specs: {
        cpu?: string;
        ram?: string;
        storage?: string;
        network?: string;
        psu?: string;
        formFactor?: string;
    };
    availability: {
        available: boolean;
        stock?: number;
    };
    rse?: {
        co2SavedKg: number;
        waterSavedL: number;
        energySavedKwh: number;
    };
}

interface ProductPageProps {
    product: ProductDetail;
}

export default function ProductPage({ product }: ProductPageProps) {
    const specs: AssetSpec[] = [
        { label: 'Processeur', value: product.specs.cpu ?? '-' },
        { label: 'Mémoire RAM', value: product.specs.ram ?? '-' },
        { label: 'Stockage', value: product.specs.storage ?? '-' },
        { label: 'Réseau', value: product.specs.network ?? '-' },
        { label: 'Alimentation', value: product.specs.psu ?? '-' },
        { label: 'Format', value: product.specs.formFactor ?? '-' },
        { label: 'Numéro de série', value: product.serialNumber },
    ];

    return (
        <>
            <Head>
                <title>{product.brand} {product.model} | ProInfo Market</title>
                <meta name="description" content={`${product.brand} ${product.model} reconditionné Grade ${product.grade}. ${product.specs.cpu}, ${product.specs.ram}. Garanti 12 mois.`} />
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen">
                {/* Breadcrumb */}
                <div className="bg-white border-b border-[#E9ECEF]">
                    <div className="container-b2b py-3">
                        <nav className="flex items-center gap-2 text-sm text-[#6C757D]">
                            <Link href="/" className="hover:text-[#1E3A5F]">Catalogue</Link>
                            <span>/</span>
                            <Link href={`/?type=${product.assetType}`} className="hover:text-[#1E3A5F]">
                                {product.assetType === 'SERVER' ? 'Serveurs' :
                                    product.assetType === 'WORKSTATION' ? 'Workstations' : 'Laptops'}
                            </Link>
                            <span>/</span>
                            <span className="text-[#212529]">{product.brand} {product.model}</span>
                        </nav>
                    </div>
                </div>

                <div className="container-b2b py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Header */}
                            <Card>
                                <CardContent>
                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge variant="info">{product.assetType}</Badge>
                                                <AvailabilityBadge
                                                    available={product.availability.available}
                                                    stock={product.availability.stock}
                                                />
                                            </div>
                                            <h1 className="text-2xl lg:text-3xl font-bold text-[#212529]">
                                                {product.brand} {product.model}
                                            </h1>
                                            <p className="text-[#6C757D] mt-1">
                                                Réf: {product.serialNumber}
                                            </p>
                                        </div>

                                        {product.grade && (
                                            <div className="text-center">
                                                <p className="text-xs text-[#6C757D] mb-1">Grade</p>
                                                <span className="inline-flex items-center justify-center w-12 h-12 bg-[#1E3A5F] text-white text-xl font-bold rounded-lg">
                                                    {product.grade}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stock quantity */}
                                    {product.availability.available && product.availability.stock && (
                                        <div className="flex items-center gap-2 py-2 px-3 bg-[#E8F5E9] rounded-lg text-sm text-[#388E3C] mb-4">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span><strong>{product.availability.stock} unité{product.availability.stock > 1 ? 's' : ''}</strong> disponible{product.availability.stock > 1 ? 's' : ''} en stock</span>
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-[#E9ECEF]">
                                        <Link href={`/cto/${product.id}`}>
                                            <Button size="lg" variant="primary">
                                                Configurer et commander
                                            </Button>
                                        </Link>
                                        <Button size="lg" variant="outline">
                                            Demander un devis
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="ghost"
                                            onClick={() => window.print()}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Télécharger PDF
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Specifications */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Spécifications techniques</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <AssetSpecs specs={specs} />
                                </CardContent>
                            </Card>

                            {/* Quality */}
                            <QualitySummary
                                grade={product.grade}
                                batterySoH={product.assetType === 'LAPTOP' ? 92 : undefined}
                            />
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* RSE */}
                            {product.rse && (
                                <RseIndicators
                                    co2SavedKg={product.rse.co2SavedKg}
                                    waterSavedL={product.rse.waterSavedL}
                                    energySavedKwh={product.rse.energySavedKwh}
                                />
                            )}

                            {/* Warranty */}
                            <Card>
                                <CardContent>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-[#E8EEF4] rounded-lg flex items-center justify-center text-[#1E3A5F]">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#212529]">Garantie 12 mois</h4>
                                            <p className="text-sm text-[#6C757D]">Extension possible</p>
                                        </div>
                                    </div>
                                    <Link href="/warranty" className="text-sm text-[#1E3A5F] hover:underline">
                                        En savoir plus →
                                    </Link>
                                </CardContent>
                            </Card>

                            {/* Data Erasure */}
                            <Card>
                                <CardContent>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-[#E8EEF4] rounded-lg flex items-center justify-center text-[#1E3A5F]">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#212529]">Effacement certifié</h4>
                                            <p className="text-sm text-[#6C757D]">Conforme RGPD</p>
                                        </div>
                                    </div>
                                    <Link href="/data-erasure" className="text-sm text-[#1E3A5F] hover:underline">
                                        En savoir plus →
                                    </Link>
                                </CardContent>
                            </Card>

                            {/* Support */}
                            <Card>
                                <CardContent>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-[#E8EEF4] rounded-lg flex items-center justify-center text-[#1E3A5F]">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#212529]">SAV France</h4>
                                            <p className="text-sm text-[#6C757D]">Support technique dédié</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[#6C757D]">
                                        Une question ? Appelez-nous au <strong>01 23 45 67 89</strong>
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Info */}
                            <Alert variant="info">
                                Cette fiche produit peut être transmise en interne pour validation.
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
export const getServerSideProps: GetServerSideProps<ProductPageProps> = async ({ params }) => {
    const assetId = params?.assetId as string;

    // Demo product (en production, appels API réels)
    const product: ProductDetail = {
        id: assetId,
        serialNumber: `SN-${assetId}`,
        assetType: 'SERVER',
        brand: 'Dell',
        model: 'PowerEdge R740',
        status: 'SELLABLE',
        grade: 'A',
        specs: {
            cpu: '2x Intel Xeon Gold 6230 (20 cores @ 2.1GHz)',
            ram: '256 GB DDR4 ECC (16x 16GB)',
            storage: '8x 960GB SSD SAS (7.5TB brut)',
            network: '4x 10GbE + 2x 1GbE iDRAC',
            psu: '2x 750W Platinum (redondant)',
            formFactor: 'Rack 2U',
        },
        availability: {
            available: true,
            stock: 3,
        },
        rse: {
            co2SavedKg: 900,
            waterSavedL: 120000,
            energySavedKwh: 500,
        },
    };

    return {
        props: {
            product,
        },
    };
};
