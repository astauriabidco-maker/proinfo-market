/**
 * Quality Page
 * Contrôle qualité - checklists - batterie
 */

import React from 'react';
import Head from 'next/head';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system/components/Card';
import { Badge } from '../design-system/components/Badge';

const qualityCategories = [
    {
        title: 'Inspection visuelle',
        items: [
            'État du châssis et boîtier',
            'Connecteurs et ports',
            'Écran (laptops)',
            'Clavier et pavé tactile',
            'Ventilateurs et grilles',
        ],
    },
    {
        title: 'Tests matériels',
        items: [
            'POST/BIOS - Démarrage système',
            'Test mémoire complet (Memtest86+)',
            'Test SMART disques/SSD',
            'Benchmark CPU (stress 100%)',
            'Test GPU (si applicable)',
        ],
    },
    {
        title: 'Tests réseau',
        items: [
            'Ports Ethernet (1G/10G/25G)',
            'Cartes réseau additionnelles',
            'iDRAC/iLO/IPMI - accès distant',
            'Test débit et latence',
        ],
    },
    {
        title: 'Tests alimentation',
        items: [
            'Alimentation principale',
            'Alimentation redondante',
            'Batterie CMOS',
            'Batterie laptop (SoH)',
        ],
    },
    {
        title: 'Tests fonctionnels',
        items: [
            'Installation OS de test',
            'Charge 48h continue',
            'Stress thermique',
            'Test stabilité long terme',
        ],
    },
];

const grades = [
    {
        grade: 'A',
        description: 'Excellent état cosmétique et fonctionnel',
        details: 'Aucune trace visible, performances optimales, batterie > 85% SoH.',
    },
    {
        grade: 'B',
        description: 'Bon état avec traces d\'usage légères',
        details: 'Traces cosmétiques mineures, performances optimales, batterie > 70% SoH.',
    },
    {
        grade: 'C',
        description: 'État fonctionnel avec usure visible',
        details: 'Traces cosmétiques visibles, performances conformes, batterie > 60% SoH.',
    },
];

export default function QualityPage() {
    return (
        <>
            <Head>
                <title>Contrôle Qualité | ProInfo Market</title>
                <meta name="description" content="47 points de contrôle qualité sur chaque équipement. Tests mémoire, stockage, réseau, charge 48h. Grades A, B, C selon état cosmétique et fonctionnel." />
            </Head>

            <Header />

            <main>
                {/* Hero */}
                <section className="bg-gradient-hero text-white py-16 lg:py-20">
                    <div className="container-b2b">
                        <div className="max-w-3xl">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
                                Contrôle Qualité Industriel
                            </h1>
                            <p className="text-lg text-[#C5D5E4] leading-relaxed">
                                47 points de contrôle sur chaque équipement.
                                Aucun compromis sur la fiabilité.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Checklist */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Checklist complète</h2>
                            <p className="text-[#6C757D] max-w-2xl mx-auto">
                                Chaque équipement passe par une série exhaustive de tests avant certification.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {qualityCategories.map((category, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Badge variant="info">{category.items.length}</Badge>
                                            {category.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {category.items.map((item, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-[#495057]">
                                                    <svg className="w-4 h-4 text-[#388E3C] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Grades */}
                <section className="section-b2b bg-[#F8F9FA]">
                    <div className="container-b2b">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Système de grades</h2>
                            <p className="text-[#6C757D] max-w-2xl mx-auto">
                                Chaque équipement reçoit un grade basé sur son état cosmétique et fonctionnel.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            {grades.map((g) => (
                                <Card key={g.grade} className="text-center">
                                    <CardContent>
                                        <div className="w-16 h-16 mx-auto mb-4 bg-[#1E3A5F] rounded-xl flex items-center justify-center">
                                            <span className="text-3xl font-bold text-white">{g.grade}</span>
                                        </div>
                                        <h3 className="font-semibold text-[#212529] mb-2">{g.description}</h3>
                                        <p className="text-sm text-[#6C757D]">{g.details}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Battery */}
                <section className="section-b2b bg-white">
                    <div className="container-b2b">
                        <div className="max-w-3xl mx-auto text-center">
                            <h2 className="text-3xl font-bold mb-4">État batterie (SoH)</h2>
                            <p className="text-[#6C757D] mb-8">
                                Pour les laptops, nous mesurons et affichons le State of Health (SoH)
                                de la batterie. Transparence totale sur l'autonomie réelle.
                            </p>
                            <div className="bg-[#F8F9FA] rounded-lg p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[#6C757D]">Exemple : SoH 92%</span>
                                    <Badge variant="success">Excellent</Badge>
                                </div>
                                <div className="h-4 bg-[#E9ECEF] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#388E3C] rounded-full" style={{ width: '92%' }} />
                                </div>
                                <p className="text-xs text-[#6C757D] mt-2">
                                    SoH ≥ 85% = Grade A | SoH ≥ 70% = Grade B | SoH ≥ 60% = Grade C
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
