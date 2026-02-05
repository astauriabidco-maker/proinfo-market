/**
 * Data Erasure Page
 * Effacement des données - RGPD - Certificat
 */

import React from 'react';
import Head from 'next/head';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Card, CardContent } from '../design-system/components/Card';
import { Alert } from '../design-system/components/Alert';

const standards = [
    {
        name: 'NIST 800-88',
        description: 'Guidelines for Media Sanitization',
        detail: 'Standard américain de référence pour l\'effacement sécurisé des supports de stockage.',
    },
    {
        name: 'DoD 5220.22-M',
        description: 'Department of Defense Standard',
        detail: 'Méthode d\'écrasement multiple utilisée par le Département de la Défense US.',
    },
    {
        name: 'RGPD / GDPR',
        description: 'Règlement Européen',
        detail: 'Conformité totale avec le Règlement Général sur la Protection des Données.',
    },
];

const process_steps = [
    {
        number: '1',
        title: 'Identification des supports',
        description: 'Inventaire complet de tous les supports de stockage (HDD, SSD, NVMe, USB, etc.).',
    },
    {
        number: '2',
        title: 'Effacement certifié',
        description: 'Utilisation d\'outils professionnels (Blancco, DBAN) avec algorithmes conformes.',
    },
    {
        number: '3',
        title: 'Vérification',
        description: 'Scan post-effacement pour confirmer l\'absence de données récupérables.',
    },
    {
        number: '4',
        title: 'Certificat',
        description: 'Génération d\'un certificat d\'effacement horodaté et archivé.',
    },
];

export default function DataErasurePage() {
    return (
        <>
            <Head>
                <title>Effacement des données | ProInfo Market</title>
                <meta name="description" content="Effacement certifié des données conforme NIST, DoD et RGPD. Certificat d'effacement fourni pour chaque équipement." />
            </Head>

            <Header />

            <main>
                {/* Hero */}
                <section className="bg-gradient-hero text-white py-16 lg:py-20">
                    <div className="container-b2b">
                        <div className="max-w-3xl">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
                                Effacement sécurisé des données
                            </h1>
                            <p className="text-lg text-[#C5D5E4] leading-relaxed">
                                Conformité RGPD garantie. Certificat d'effacement fourni.
                                Vos données sensibles ne quittent jamais votre contrôle.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Alert */}
                <section className="bg-white border-b border-[#E9ECEF]">
                    <div className="container-b2b py-6">
                        <Alert variant="success" title="Conformité garantie">
                            Tous nos équipements passent par un processus d'effacement certifié
                            avant remise en vente. Aucune exception.
                        </Alert>
                    </div>
                </section>

                {/* Standards */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Normes respectées</h2>
                            <p className="text-[#6C757D] max-w-2xl mx-auto">
                                Nous appliquons les standards internationaux les plus stricts.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {standards.map((s) => (
                                <Card key={s.name}>
                                    <CardContent className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-[#E8EEF4] rounded-xl flex items-center justify-center">
                                            <svg className="w-8 h-8 text-[#1E3A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-[#212529] mb-1">{s.name}</h3>
                                        <p className="text-sm text-[#1E3A5F] font-medium mb-2">{s.description}</p>
                                        <p className="text-sm text-[#6C757D]">{s.detail}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Process */}
                <section className="section-b2b bg-[#F8F9FA]">
                    <div className="container-b2b">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Notre processus</h2>
                        </div>

                        <div className="max-w-3xl mx-auto">
                            <div className="space-y-6">
                                {process_steps.map((step, index) => (
                                    <div key={step.number} className="flex gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 bg-[#1E3A5F] rounded-full flex items-center justify-center text-white font-bold">
                                            {step.number}
                                        </div>
                                        <div className="pt-1">
                                            <h3 className="font-semibold text-[#212529] mb-1">{step.title}</h3>
                                            <p className="text-[#6C757D]">{step.description}</p>
                                        </div>
                                        {index < process_steps.length - 1 && (
                                            <div className="absolute left-5 mt-10 w-0.5 h-8 bg-[#DEE2E6]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Certificate */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="max-w-3xl mx-auto text-center">
                            <div className="w-20 h-20 mx-auto mb-6 bg-[#E8F5E9] rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-[#388E3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Certificat d'effacement</h2>
                            <p className="text-[#6C757D] mb-8">
                                Chaque équipement est accompagné d'un certificat d'effacement
                                horodaté, mentionnant l'algorithme utilisé et le résultat de vérification.
                                Ce document peut être utilisé pour vos audits de conformité.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
