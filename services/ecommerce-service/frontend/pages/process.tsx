/**
 * Process Page
 * Processus industriel - reconditionnement - tests
 */

import React from 'react';
import Head from 'next/head';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Card, CardContent } from '../design-system/components/Card';

const processSteps = [
    {
        number: '01',
        title: 'Acquisition & Traçabilité',
        description: 'Chaque équipement entrant est enregistré avec son origine, numéro de série et historique documenté. Traçabilité complète dès le premier jour.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        ),
    },
    {
        number: '02',
        title: 'Diagnostic initial',
        description: 'Test POST/BIOS, inspection visuelle complète, inventaire des composants. Identification des pièces à remplacer ou mettre à niveau.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        number: '03',
        title: 'Effacement sécurisé',
        description: 'Effacement certifié des données selon les normes NIST/DoD. Certificat d\'effacement généré et archivé. Conformité RGPD garantie.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
    },
    {
        number: '04',
        title: 'Reconditionnement',
        description: 'Nettoyage professionnel, remplacement des composants défectueux, application de pâte thermique neuve, mise à jour firmware.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        number: '05',
        title: 'Tests industriels',
        description: '47 points de contrôle : mémoire, stockage, réseau, alimentation. Tests de charge 48h. Stress thermique et validation stabilité.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        number: '06',
        title: 'Configuration & Livraison',
        description: 'Configuration CTO selon vos spécifications. Emballage professionnel antistatique. Livraison assurée avec tracking.',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
        ),
    },
];

export default function ProcessPage() {
    return (
        <>
            <Head>
                <title>Notre processus industriel | ProInfo Market</title>
                <meta name="description" content="Découvrez notre processus de reconditionnement industriel : acquisition, diagnostic, effacement, tests et livraison. 47 points de contrôle qualité." />
            </Head>

            <Header />

            <main>
                {/* Hero */}
                <section className="bg-gradient-hero text-white py-16 lg:py-20">
                    <div className="container-b2b">
                        <div className="max-w-3xl">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
                                Processus industriel de reconditionnement
                            </h1>
                            <p className="text-lg text-[#C5D5E4] leading-relaxed">
                                Chaque équipement suit un parcours rigoureux de 6 étapes,
                                garantissant qualité, traçabilité et conformité.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Process Steps */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="space-y-8">
                            {processSteps.map((step, index) => (
                                <div
                                    key={step.number}
                                    className={`flex flex-col md:flex-row gap-8 items-start ${index % 2 === 1 ? 'md:flex-row-reverse' : ''
                                        }`}
                                >
                                    <div className="md:w-1/3">
                                        <Card className="sticky top-24">
                                            <CardContent className="text-center py-8">
                                                <div className="w-16 h-16 mx-auto mb-4 bg-[#E8EEF4] rounded-xl flex items-center justify-center text-[#1E3A5F]">
                                                    {step.icon}
                                                </div>
                                                <span className="text-4xl font-bold text-[#1E3A5F]">{step.number}</span>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="md:w-2/3 py-4">
                                        <h2 className="text-2xl font-bold text-[#212529] mb-4">{step.title}</h2>
                                        <p className="text-[#6C757D] text-lg leading-relaxed">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="section-b2b bg-[#F8F9FA]">
                    <div className="container-b2b text-center">
                        <h2 className="text-3xl font-bold mb-4">Un processus transparent</h2>
                        <p className="text-[#6C757D] max-w-xl mx-auto mb-8">
                            Chaque étape est documentée. Vous pouvez demander l'historique complet de votre équipement.
                        </p>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
