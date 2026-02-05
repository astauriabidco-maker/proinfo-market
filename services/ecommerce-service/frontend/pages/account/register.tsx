/**
 * Page: Inscription B2B
 * Création de compte entreprise
 */

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        companyName: '',
        siren: '',
        address: '',
        adminEmail: '',
        adminPassword: '',
        adminFirstName: '',
        adminLastName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.companyName,
                    siren: formData.siren,
                    address: formData.address,
                    adminEmail: formData.adminEmail,
                    adminPassword: formData.adminPassword,
                    adminFirstName: formData.adminFirstName,
                    adminLastName: formData.adminLastName
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Erreur lors de l\'inscription');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            router.push('/account/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur d\'inscription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Créer un compte entreprise | ProInfo Market</title>
                <meta name="description" content="Créez votre compte entreprise B2B pour accéder aux fonctionnalités de devis et commandes ProInfo Market." />
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen py-16">
                <div className="container-b2b">
                    <div className="max-w-lg mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-center text-2xl">Créer un compte B2B</CardTitle>
                                <p className="text-center text-[#6C757D] mt-2">
                                    Inscrivez votre entreprise pour accéder à l'espace pro
                                </p>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {error && (
                                        <div className="bg-[#FFEBEE] text-[#C62828] px-4 py-3 rounded-lg text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {/* Section Entreprise */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-[#212529] border-b border-[#E9ECEF] pb-2">
                                            Informations entreprise
                                        </h3>

                                        <div>
                                            <label htmlFor="companyName" className="block text-sm font-medium text-[#212529] mb-1">
                                                Nom de l'entreprise *
                                            </label>
                                            <input
                                                type="text"
                                                id="companyName"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                                placeholder="Ma Société SAS"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="siren" className="block text-sm font-medium text-[#212529] mb-1">
                                                    SIREN
                                                </label>
                                                <input
                                                    type="text"
                                                    id="siren"
                                                    name="siren"
                                                    value={formData.siren}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                                    placeholder="123 456 789"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="address" className="block text-sm font-medium text-[#212529] mb-1">
                                                    Ville
                                                </label>
                                                <input
                                                    type="text"
                                                    id="address"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                                    placeholder="Paris"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section Administrateur */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-[#212529] border-b border-[#E9ECEF] pb-2">
                                            Administrateur du compte
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="adminFirstName" className="block text-sm font-medium text-[#212529] mb-1">
                                                    Prénom
                                                </label>
                                                <input
                                                    type="text"
                                                    id="adminFirstName"
                                                    name="adminFirstName"
                                                    value={formData.adminFirstName}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                                    placeholder="Jean"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="adminLastName" className="block text-sm font-medium text-[#212529] mb-1">
                                                    Nom
                                                </label>
                                                <input
                                                    type="text"
                                                    id="adminLastName"
                                                    name="adminLastName"
                                                    value={formData.adminLastName}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                                    placeholder="Dupont"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="adminEmail" className="block text-sm font-medium text-[#212529] mb-1">
                                                Email professionnel *
                                            </label>
                                            <input
                                                type="email"
                                                id="adminEmail"
                                                name="adminEmail"
                                                value={formData.adminEmail}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                                placeholder="vous@entreprise.com"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="adminPassword" className="block text-sm font-medium text-[#212529] mb-1">
                                                Mot de passe *
                                            </label>
                                            <input
                                                type="password"
                                                id="adminPassword"
                                                name="adminPassword"
                                                value={formData.adminPassword}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-[#DEE2E6] rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                                                placeholder="••••••••"
                                                minLength={8}
                                                required
                                            />
                                            <p className="text-xs text-[#6C757D] mt-1">Minimum 8 caractères</p>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        className="w-full"
                                        disabled={loading}
                                    >
                                        {loading ? 'Création en cours...' : 'Créer le compte'}
                                    </Button>

                                    <p className="text-xs text-[#6C757D] text-center">
                                        En créant un compte, vous acceptez nos{' '}
                                        <Link href="/cgv" className="text-[#1E3A5F] hover:underline">CGV</Link>
                                        {' '}et notre{' '}
                                        <Link href="/privacy" className="text-[#1E3A5F] hover:underline">politique de confidentialité</Link>.
                                    </p>
                                </form>

                                <div className="mt-6 pt-6 border-t border-[#E9ECEF] text-center">
                                    <p className="text-sm text-[#6C757D]">
                                        Déjà un compte ?{' '}
                                        <Link href="/account/login" className="text-[#1E3A5F] font-medium hover:underline">
                                            Se connecter
                                        </Link>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
