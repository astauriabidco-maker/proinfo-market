/**
 * Page: Connexion B2B
 * Page de connexion pour les comptes entreprise
 */

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Identifiants incorrects');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            router.push('/account/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Connexion | ProInfo Market</title>
                <meta name="description" content="Connectez-vous à votre espace client B2B ProInfo Market pour gérer vos devis et commandes." />
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen py-16">
                <div className="container-b2b">
                    <div className="max-w-md mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-center text-2xl">Espace Client B2B</CardTitle>
                                <p className="text-center text-[#6C757D] mt-2">
                                    Connectez-vous pour accéder à vos devis et commandes
                                </p>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="bg-[#FFEBEE] text-[#C62828] px-4 py-3 rounded-lg text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-[#212529] mb-1">
                                            Email professionnel
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                            placeholder="vous@entreprise.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-[#212529] mb-1">
                                            Mot de passe
                                        </label>
                                        <input
                                            type="password"
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        className="w-full"
                                        disabled={loading}
                                    >
                                        {loading ? 'Connexion...' : 'Se connecter'}
                                    </Button>
                                </form>

                                <div className="mt-6 pt-6 border-t border-[#E9ECEF] text-center">
                                    <p className="text-sm text-[#6C757D]">
                                        Pas encore de compte ?{' '}
                                        <Link href="/account/register" className="text-[#1E3A5F] font-medium hover:underline">
                                            Créer un compte entreprise
                                        </Link>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Avantages */}
                        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                            <div className="bg-white p-4 rounded-lg border border-[#E9ECEF]">
                                <div className="text-2xl mb-2">📋</div>
                                <div className="text-sm font-medium text-[#212529]">Devis sauvegardés</div>
                                <div className="text-xs text-[#6C757D]">Retrouvez vos configurations</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-[#E9ECEF]">
                                <div className="text-2xl mb-2">📦</div>
                                <div className="text-sm font-medium text-[#212529]">Suivi commandes</div>
                                <div className="text-xs text-[#6C757D]">Historique et statuts</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-[#E9ECEF]">
                                <div className="text-2xl mb-2">👥</div>
                                <div className="text-sm font-medium text-[#212529]">Multi-utilisateurs</div>
                                <div className="text-xs text-[#6C757D]">Gérez votre équipe</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-[#E9ECEF]">
                                <div className="text-2xl mb-2">⚡</div>
                                <div className="text-sm font-medium text-[#212529]">Commande rapide</div>
                                <div className="text-xs text-[#6C757D]">Depuis vos devis</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
