/**
 * Homepage B2B Premium
 * Page d'accueil avec crédibilité immédiate
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { TrustBanner } from '../components/TrustBanner';
import { AvailabilityBadge } from '../components/AvailabilityBadge';
import { Button } from '../design-system/components/Button';
import { Card, CardContent } from '../design-system/components/Card';
import { Badge } from '../design-system/components/Badge';

// Types
interface Asset {
    id: string;
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    status: string;
    grade?: string;
}

interface Availability {
    available: boolean;
    stock?: number;
}

interface ProductWithAvailability extends Asset {
    availability: Availability;
}

interface HomePageProps {
    products: ProductWithAvailability[];
}

// Arguments B2B
const arguments_b2b = [
    {
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        title: 'Qualité industrielle',
        description: '47 points de contrôle technique, tests complets de charge et stress.',
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
        title: 'Traçabilité complète',
        description: 'Historique complet depuis l\'acquisition jusqu\'à la livraison.',
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        title: 'CTO sur mesure',
        description: 'Configuration personnalisée validée techniquement avant commande.',
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        title: 'SAV France',
        description: 'Support technique dédié et processus RMA maîtrisé.',
    },
];

export default function HomePage({ products }: HomePageProps) {
    return (
        <>
            <Head>
                <title>ProInfo Market | Serveurs & PC reconditionnés certifiés B2B</title>
                <meta name="description" content="Serveurs et postes de travail IT reconditionnés, certifiés et prêts pour la production. Qualité industrielle, traçabilité complète, SAV France." />
            </Head>

            <Header />

            <main>
                {/* Hero Section */}
                <section className="bg-gradient-hero text-white py-20 lg:py-28">
                    <div className="container-b2b">
                        <div className="max-w-3xl">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-balance text-white">
                                Serveurs & PC reconditionnés certifiés, prêts pour la production
                            </h1>
                            <p className="text-lg lg:text-xl text-[#C5D5E4] mb-8 leading-relaxed">
                                Équipements IT reconditionnés avec processus industriel.
                                Chaque machine est testée, tracée et garantie.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link href="/#catalogue">
                                    <Button size="lg" variant="secondary">
                                        Voir les configurations disponibles
                                    </Button>
                                </Link>
                                <Link href="/process">
                                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                        Découvrir notre processus
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust Banner */}
                <TrustBanner />

                {/* Arguments B2B */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">
                                L'expertise du reconditionnement professionnel
                            </h2>
                            <p className="text-[#6C757D] max-w-2xl mx-auto">
                                Nous appliquons des standards industriels à chaque étape du processus,
                                de l'acquisition à la livraison.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {arguments_b2b.map((arg, index) => (
                                <Card key={index} hover className="text-center">
                                    <CardContent>
                                        <div className="w-16 h-16 mx-auto mb-4 bg-[#E8EEF4] rounded-xl flex items-center justify-center text-[#1E3A5F]">
                                            {arg.icon}
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{arg.title}</h3>
                                        <p className="text-sm text-[#6C757D]">{arg.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Catalogue Section */}
                <section id="catalogue" className="section-b2b bg-[#F8F9FA]">
                    <div className="container-b2b">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Configurations disponibles</h2>
                                <p className="text-[#6C757D]">
                                    {products.length} équipement{products.length > 1 ? 's' : ''} disponible{products.length > 1 ? 's' : ''} en stock
                                </p>
                            </div>

                            {/* Filters placeholder */}
                            <div className="flex gap-2">
                                <Badge variant="info">Serveurs</Badge>
                                <Badge variant="neutral">Workstations</Badge>
                                <Badge variant="neutral">Laptops</Badge>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <Card key={product.id} hover padding="none" className="overflow-hidden">
                                    <CardContent className="p-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <AvailabilityBadge
                                                available={product.availability.available}
                                                stock={product.availability.stock}
                                            />
                                            <Badge variant="info">{product.assetType}</Badge>
                                        </div>

                                        {/* Product Info */}
                                        <h3 className="text-xl font-semibold text-[#212529] mb-1">
                                            {product.brand} {product.model}
                                        </h3>

                                        <p className="text-sm text-[#6C757D] mb-4">
                                            S/N: {product.serialNumber}
                                        </p>

                                        {/* Grade */}
                                        {product.grade && (
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-sm text-[#6C757D]">Grade :</span>
                                                <span className="inline-flex items-center justify-center w-7 h-7 bg-[#1E3A5F] text-white text-sm font-semibold rounded">
                                                    {product.grade}
                                                </span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-4 border-t border-[#E9ECEF]">
                                            <Link href={`/products/${product.id}`} className="flex-1">
                                                <Button variant="outline" size="sm" className="w-full">
                                                    Voir détails
                                                </Button>
                                            </Link>
                                            <Link href={`/cto/${product.id}`} className="flex-1">
                                                <Button variant="primary" size="sm" className="w-full">
                                                    Configurer
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="section-b2b bg-white border-t border-[#E9ECEF]">
                    <div className="container-b2b text-center">
                        <h2 className="text-3xl font-bold mb-4">
                            Besoin d'un conseil personnalisé ?
                        </h2>
                        <p className="text-[#6C757D] max-w-xl mx-auto mb-8">
                            Notre équipe technique vous accompagne dans le choix
                            et la configuration de vos équipements.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button size="lg" variant="primary">
                                Contactez-nous
                            </Button>
                            <Button size="lg" variant="outline">
                                01 23 45 67 89
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

// Server-side data fetching
export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
    // Demo products (en production, appels API réels)
    const products: ProductWithAvailability[] = [
        {
            id: 'asset-001',
            serialNumber: 'SN-DEMO-001',
            assetType: 'SERVER',
            brand: 'Dell',
            model: 'PowerEdge R740',
            status: 'SELLABLE',
            grade: 'A',
            availability: { available: true, stock: 5 },
        },
        {
            id: 'asset-002',
            serialNumber: 'SN-DEMO-002',
            assetType: 'SERVER',
            brand: 'HP',
            model: 'ProLiant DL380 Gen10',
            status: 'SELLABLE',
            grade: 'A',
            availability: { available: true, stock: 3 },
        },
        {
            id: 'asset-003',
            serialNumber: 'SN-DEMO-003',
            assetType: 'WORKSTATION',
            brand: 'Dell',
            model: 'Precision 7920',
            status: 'SELLABLE',
            grade: 'B',
            availability: { available: true, stock: 8 },
        },
        {
            id: 'asset-004',
            serialNumber: 'SN-DEMO-004',
            assetType: 'SERVER',
            brand: 'Lenovo',
            model: 'ThinkSystem SR650',
            status: 'SELLABLE',
            grade: 'A',
            availability: { available: true, stock: 2 },
        },
        {
            id: 'asset-005',
            serialNumber: 'SN-DEMO-005',
            assetType: 'LAPTOP',
            brand: 'Dell',
            model: 'Latitude 5520',
            status: 'SELLABLE',
            grade: 'A',
            availability: { available: true, stock: 12 },
        },
        {
            id: 'asset-006',
            serialNumber: 'SN-DEMO-006',
            assetType: 'WORKSTATION',
            brand: 'HP',
            model: 'Z4 G4',
            status: 'SELLABLE',
            grade: 'B',
            availability: { available: true, stock: 4 },
        },
    ];

    return {
        props: {
            products,
        },
    };
};
