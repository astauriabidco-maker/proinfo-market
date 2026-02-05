/**
 * Page: Dashboard B2B
 * Tableau de bord compte entreprise
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

interface User {
    id: string;
    email: string;
    role: string;
    companyId: string;
    companyName: string;
}

interface Quote {
    id: string;
    assetId: string;
    priceSnapshot: { total: number };
    status: string;
    isExpired: boolean;
    daysRemaining: number;
    createdAt: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            router.push('/account/login');
            return;
        }

        try {
            setUser(JSON.parse(storedUser));
        } catch {
            router.push('/account/login');
            return;
        }

        // Charger les devis (simulation)
        setQuotes([
            {
                id: 'Q-001',
                assetId: 'HP-DL380-G10',
                priceSnapshot: { total: 2499 },
                status: 'ACTIVE',
                isExpired: false,
                daysRemaining: 25,
                createdAt: new Date().toISOString()
            },
            {
                id: 'Q-002',
                assetId: 'DELL-T640',
                priceSnapshot: { total: 3299 },
                status: 'ACTIVE',
                isExpired: false,
                daysRemaining: 18,
                createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
            }
        ]);
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/account/login');
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
                <title>Mon compte | ProInfo Market</title>
                <meta name="description" content="Gérez vos devis et commandes depuis votre espace client B2B ProInfo Market." />
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen py-12">
                <div className="container-b2b">
                    {/* En-tête */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-[#212529]">
                                Bonjour, {user?.email?.split('@')[0]}
                            </h1>
                            <p className="text-[#6C757D]">
                                {user?.companyName} • Rôle : <span className="font-medium">{user?.role}</span>
                            </p>
                        </div>
                        <Button variant="ghost" onClick={handleLogout}>
                            Se déconnecter
                        </Button>
                    </div>

                    {/* Navigation rapide */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Link href="/account/quotes">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="py-6 text-center">
                                    <div className="text-3xl mb-2">📋</div>
                                    <div className="font-semibold text-[#212529]">Mes devis</div>
                                    <div className="text-sm text-[#6C757D]">{quotes.length} devis actifs</div>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/account/orders">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="py-6 text-center">
                                    <div className="text-3xl mb-2">📦</div>
                                    <div className="font-semibold text-[#212529]">Mes commandes</div>
                                    <div className="text-sm text-[#6C757D]">Historique</div>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="py-6 text-center">
                                    <div className="text-3xl mb-2">🔧</div>
                                    <div className="font-semibold text-[#212529]">Configurer</div>
                                    <div className="text-sm text-[#6C757D]">Nouveau devis</div>
                                </CardContent>
                            </Card>
                        </Link>
                        {user?.role === 'ADMIN_CLIENT' && (
                            <Link href="/account/team">
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="py-6 text-center">
                                        <div className="text-3xl mb-2">👥</div>
                                        <div className="font-semibold text-[#212529]">Mon équipe</div>
                                        <div className="text-sm text-[#6C757D]">Gérer les accès</div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )}
                    </div>

                    {/* Devis récents */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Devis récents</CardTitle>
                                <Link href="/account/quotes">
                                    <Button variant="ghost" size="sm">Voir tous →</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {quotes.length === 0 ? (
                                <div className="text-center py-8 text-[#6C757D]">
                                    <p>Aucun devis pour le moment</p>
                                    <Link href="/" className="text-[#1E3A5F] hover:underline mt-2 inline-block">
                                        Configurer un équipement →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {quotes.map(quote => (
                                        <div
                                            key={quote.id}
                                            className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-lg"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-[#212529]">{quote.id}</span>
                                                    <Badge
                                                        variant={quote.isExpired ? 'warning' : 'success'}
                                                        size="sm"
                                                    >
                                                        {quote.isExpired ? 'Expiré' : `${quote.daysRemaining}j restants`}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-[#6C757D]">{quote.assetId}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-[#1E3A5F]">
                                                    {quote.priceSnapshot.total.toLocaleString('fr-FR')} € HT
                                                </span>
                                                {!quote.isExpired && user?.role !== 'LECTURE' && (
                                                    <Button variant="primary" size="sm">
                                                        Commander
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </>
    );
}
