/**
 * Warranty Page
 * Garantie - SAV - RMA
 */

import React from 'react';
import Head from 'next/head';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system/components/Card';
import { Badge } from '../design-system/components/Badge';
import { Alert } from '../design-system/components/Alert';

const warrantyFeatures = [
    {
        title: 'Garantie 12 mois',
        description: 'Tous nos équipements sont garantis 12 mois pièces et main d\'œuvre.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
    },
    {
        title: 'Extension possible',
        description: 'Prolongez votre garantie jusqu\'à 36 mois pour une tranquillité totale.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
        ),
    },
    {
        title: 'SAV France',
        description: 'Support technique basé en France, joignable par téléphone et email.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
    },
    {
        title: 'RMA simplifié',
        description: 'Processus de retour clair et rapide. Enlèvement organisé à votre demande.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
    },
];

const rmaSteps = [
    { step: '1', label: 'Contact SAV', detail: 'Appelez ou envoyez un email avec le numéro de série' },
    { step: '2', label: 'Diagnostic', detail: 'Notre équipe analyse le problème à distance' },
    { step: '3', label: 'RMA créé', detail: 'Numéro de retour et étiquette d\'envoi fournis' },
    { step: '4', label: 'Réparation', detail: 'Intervention sous 5 jours ouvrés en moyenne' },
    { step: '5', label: 'Retour', detail: 'Équipement réparé et renvoyé à vos frais' },
];

export default function WarrantyPage() {
    return (
        <>
            <Head>
                <title>Garantie & SAV | ProInfo Market</title>
                <meta name="description" content="Garantie 12 mois extensible à 36 mois. SAV France. Processus RMA simplifié. Support technique dédié pour tous vos équipements reconditionnés." />
            </Head>

            <Header />

            <main>
                {/* Hero */}
                <section className="bg-gradient-hero text-white py-16 lg:py-20">
                    <div className="container-b2b">
                        <div className="max-w-3xl">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
                                Garantie & Service Après-Vente
                            </h1>
                            <p className="text-lg text-[#C5D5E4] leading-relaxed">
                                Un accompagnement complet après votre achat.
                                SAV réactif, processus RMA maîtrisé.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {warrantyFeatures.map((f, index) => (
                                <Card key={index}>
                                    <CardContent className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-[#E8EEF4] rounded-xl flex items-center justify-center text-[#1E3A5F]">
                                            {f.icon}
                                        </div>
                                        <h3 className="font-semibold text-[#212529] mb-2">{f.title}</h3>
                                        <p className="text-sm text-[#6C757D]">{f.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* What's covered */}
                <section className="section-b2b bg-[#F8F9FA]">
                    <div className="container-b2b">
                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Badge variant="success">Couvert</Badge>
                                        Ce qui est inclus
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {[
                                            'Pannes matérielles (CPU, RAM, carte mère)',
                                            'Défauts de fabrication',
                                            'Dysfonctionnements stockage',
                                            'Problèmes alimentation',
                                            'Défaillances réseau intégrées',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm">
                                                <svg className="w-4 h-4 text-[#388E3C]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Badge variant="neutral">Exclusions</Badge>
                                        Ce qui n'est pas couvert
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {[
                                            'Dommages physiques (chocs, chutes)',
                                            'Dégâts des eaux',
                                            'Surtensions électriques',
                                            'Modifications non autorisées',
                                            'Usure normale (ventilateurs, batteries*)',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-[#6C757D]">
                                                <svg className="w-4 h-4 text-[#ADB5BD]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-[#6C757D] mt-4">
                                        * Batteries laptop couvertes si SoH &lt; 60% dans les 6 premiers mois
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* RMA Process */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Processus RMA</h2>
                            <p className="text-[#6C757D] max-w-2xl mx-auto">
                                Un processus simple et rapide pour le retour de vos équipements.
                            </p>
                        </div>

                        <div className="max-w-4xl mx-auto">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                {rmaSteps.map((s, index) => (
                                    <React.Fragment key={s.step}>
                                        <div className="flex-1 text-center">
                                            <div className="w-12 h-12 mx-auto mb-3 bg-[#1E3A5F] rounded-full flex items-center justify-center text-white font-bold">
                                                {s.step}
                                            </div>
                                            <h4 className="font-semibold text-[#212529] mb-1">{s.label}</h4>
                                            <p className="text-xs text-[#6C757D]">{s.detail}</p>
                                        </div>
                                        {index < rmaSteps.length - 1 && (
                                            <div className="hidden md:block w-8 h-0.5 bg-[#DEE2E6]" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section className="section-b2b bg-[#F8F9FA]">
                    <div className="container-b2b text-center">
                        <h2 className="text-3xl font-bold mb-4">Besoin d'assistance ?</h2>
                        <p className="text-[#6C757D] mb-8">
                            Notre équipe SAV est disponible du lundi au vendredi, 9h-18h.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <a
                                href="tel:+33123456789"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#152A45] transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                01 23 45 67 89
                            </a>
                            <a
                                href="mailto:sav@proinfo-market.com"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#1E3A5F] border border-[#1E3A5F] rounded-lg font-medium hover:bg-[#E8EEF4] transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                sav@proinfo-market.com
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
