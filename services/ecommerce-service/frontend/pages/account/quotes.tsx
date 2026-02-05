/**
 * Page: Liste des devis B2B
 * Affiche tous les devis de l'entreprise avec actions
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';

interface Quote {
    id: string;
    assetId: string;
    priceSnapshot: {
        base: number;
        options: number;
        total: number;
    };
    leadTimeDays: number;
    status: 'ACTIVE' | 'EXPIRED' | 'CONVERTED';
    isExpired: boolean;
    daysRemaining: number;
    createdAt: string;
    expiresAt: string;
}

export default function QuotesPage() {
    const router = useRouter();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'converted'>('all');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/account/login');
            return;
        }

        // Simulation de données
        setQuotes([
            {
                id: 'Q-20260205-001',
                assetId: 'HP ProLiant DL380 Gen10',
                priceSnapshot: { base: 1899, options: 600, total: 2499 },
                leadTimeDays: 5,
                status: 'ACTIVE',
                isExpired: false,
                daysRemaining: 25,
                createdAt: '2026-02-05T10:00:00Z',
                expiresAt: '2026-03-07T10:00:00Z'
            },
            {
                id: 'Q-20260203-002',
                assetId: 'Dell PowerEdge T640',
                priceSnapshot: { base: 2799, options: 500, total: 3299 },
                leadTimeDays: 7,
                status: 'ACTIVE',
                isExpired: false,
                daysRemaining: 18,
                createdAt: '2026-02-03T14:30:00Z',
                expiresAt: '2026-03-05T14:30:00Z'
            },
            {
                id: 'Q-20260115-003',
                assetId: 'HP ZBook 15 G6',
                priceSnapshot: { base: 899, options: 150, total: 1049 },
                leadTimeDays: 3,
                status: 'CONVERTED',
                isExpired: false,
                daysRemaining: 0,
                createdAt: '2026-01-15T09:00:00Z',
                expiresAt: '2026-02-14T09:00:00Z'
            },
            {
                id: 'Q-20260101-004',
                assetId: 'Dell Precision 5520',
                priceSnapshot: { base: 799, options: 0, total: 799 },
                leadTimeDays: 5,
                status: 'EXPIRED',
                isExpired: true,
                daysRemaining: 0,
                createdAt: '2026-01-01T11:00:00Z',
                expiresAt: '2026-01-31T11:00:00Z'
            }
        ]);
        setLoading(false);
    }, [router]);

    const filteredQuotes = quotes.filter(q => {
        if (filter === 'all') return true;
        if (filter === 'active') return q.status === 'ACTIVE' && !q.isExpired;
        if (filter === 'expired') return q.status === 'EXPIRED' || q.isExpired;
        if (filter === 'converted') return q.status === 'CONVERTED';
        return true;
    });

    const getStatusBadge = (quote: Quote) => {
        if (quote.status === 'CONVERTED') {
            return <Badge variant="info">Commandé</Badge>;
        }
        if (quote.isExpired || quote.status === 'EXPIRED') {
            return <Badge variant="warning">Expiré</Badge>;
        }
        return <Badge variant="success">{quote.daysRemaining}j restants</Badge>;
    };

    if (loading) {
        return (
            <>
                <Header />
                <main className="bg-[#F8F9FA] min-h-screen flex items-center justify-center">
                    <div className="text-[#6C757D]">Chargement...</div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Mes devis | ProInfo Market</title>
                <meta name="description" content="Consultez et gérez vos devis de matériel informatique reconditionné." />
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen py-12">
                <div className="container-b2b">
                    {/* En-tête */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-[#212529]">Mes devis</h1>
                            <p className="text-[#6C757D]">
                                {quotes.filter(q => q.status === 'ACTIVE' && !q.isExpired).length} devis actifs sur {quotes.length} total
                            </p>
                        </div>
                        <Link href="/">
                            <Button variant="primary">
                                + Nouveau devis
                            </Button>
                        </Link>
                    </div>

                    {/* Filtres */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {[
                            { key: 'all', label: 'Tous' },
                            { key: 'active', label: 'Actifs' },
                            { key: 'expired', label: 'Expirés' },
                            { key: 'converted', label: 'Commandés' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key as typeof filter)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f.key
                                        ? 'bg-[#1E3A5F] text-white'
                                        : 'bg-white text-[#6C757D] hover:bg-[#E9ECEF]'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Liste */}
                    {filteredQuotes.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-[#6C757D]">Aucun devis trouvé</p>
                                <Link href="/" className="text-[#1E3A5F] hover:underline mt-2 inline-block">
                                    Configurer un équipement →
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredQuotes.map(quote => (
                                <Card key={quote.id}>
                                    <CardContent className="py-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-mono text-sm text-[#6C757D]">{quote.id}</span>
                                                    {getStatusBadge(quote)}
                                                </div>
                                                <h3 className="font-semibold text-[#212529] truncate">{quote.assetId}</h3>
                                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-[#6C757D]">
                                                    <span>Créé le {new Date(quote.createdAt).toLocaleDateString('fr-FR')}</span>
                                                    <span>•</span>
                                                    <span>Livraison {quote.leadTimeDays}j ouvrés</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-[#1E3A5F]">
                                                    {quote.priceSnapshot.total.toLocaleString('fr-FR')} € HT
                                                </div>
                                                {quote.priceSnapshot.options > 0 && (
                                                    <div className="text-sm text-[#6C757D]">
                                                        dont {quote.priceSnapshot.options} € d'options
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {quote.status === 'ACTIVE' && !quote.isExpired && (
                                                    <Button variant="primary">
                                                        Commander
                                                    </Button>
                                                )}
                                                <Button variant="outline">
                                                    Détails
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Navigation retour */}
                    <div className="mt-8">
                        <Link href="/account/dashboard" className="text-[#1E3A5F] hover:underline">
                            ← Retour au tableau de bord
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
