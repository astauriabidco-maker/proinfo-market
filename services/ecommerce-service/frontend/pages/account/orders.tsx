/**
 * Page: Historique des commandes B2B
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Card, CardContent } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';

interface Order {
    id: string;
    assetId: string;
    priceSnapshot: { total: number };
    status: 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
    createdAt: string;
}

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/account/login');
            return;
        }

        // Simulation
        setOrders([
            {
                id: 'ORD-20260115-001',
                assetId: 'HP ZBook 15 G6',
                priceSnapshot: { total: 1049 },
                status: 'DELIVERED',
                createdAt: '2026-01-15T09:00:00Z'
            },
            {
                id: 'ORD-20260120-002',
                assetId: 'Dell Precision 7520',
                priceSnapshot: { total: 1299 },
                status: 'SHIPPED',
                createdAt: '2026-01-20T14:00:00Z'
            }
        ]);
        setLoading(false);
    }, [router]);

    const getStatusBadge = (status: Order['status']) => {
        const config = {
            PENDING: { variant: 'warning' as const, label: 'En attente' },
            RESERVED: { variant: 'info' as const, label: 'Réservé' },
            CONFIRMED: { variant: 'info' as const, label: 'Confirmé' },
            SHIPPED: { variant: 'success' as const, label: 'Expédié' },
            DELIVERED: { variant: 'success' as const, label: 'Livré' }
        };
        const { variant, label } = config[status];
        return <Badge variant={variant}>{label}</Badge>;
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
                <title>Mes commandes | ProInfo Market</title>
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen py-12">
                <div className="container-b2b">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-[#212529]">Mes commandes</h1>
                            <p className="text-[#6C757D]">{orders.length} commandes</p>
                        </div>
                    </div>

                    {orders.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-[#6C757D]">Aucune commande</p>
                                <Link href="/account/quotes" className="text-[#1E3A5F] hover:underline mt-2 inline-block">
                                    Voir mes devis →
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <Card key={order.id}>
                                    <CardContent className="py-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-mono text-sm text-[#6C757D]">{order.id}</span>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                                <h3 className="font-semibold text-[#212529]">{order.assetId}</h3>
                                                <p className="text-sm text-[#6C757D]">
                                                    Commandé le {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-[#1E3A5F]">
                                                    {order.priceSnapshot.total.toLocaleString('fr-FR')} € HT
                                                </div>
                                            </div>
                                            <Button variant="outline">Détails</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

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
