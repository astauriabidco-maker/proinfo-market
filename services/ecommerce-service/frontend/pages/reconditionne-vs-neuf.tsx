/**
 * Page: Reconditionné vs Neuf - Comparatif B2B
 * Page de réassurance factuellement objective
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system/components/Card';
import { Badge } from '../design-system/components/Badge';

const comparisons = [
    {
        criteria: 'Prix d\'acquisition',
        neuf: { value: '100%', detail: 'Prix catalogue constructeur' },
        reconditionne: { value: '40-70%', detail: 'Économie moyenne de 30 à 60%', winner: true }
    },
    {
        criteria: 'Délai de livraison',
        neuf: { value: '4-12 semaines', detail: 'Selon disponibilité constructeur' },
        reconditionne: { value: '5-10 jours', detail: 'Stock immédiatement disponible', winner: true }
    },
    {
        criteria: 'Garantie',
        neuf: { value: '3 ans', detail: 'Garantie constructeur standard' },
        reconditionne: { value: '12 mois', detail: 'Extensible à 36 mois' }
    },
    {
        criteria: 'Performance',
        neuf: { value: 'Dernière génération', detail: 'Composants les plus récents' },
        reconditionne: { value: 'Génération N-1 à N-3', detail: 'Performance suffisante pour 95% des usages', winner: true }
    },
    {
        criteria: 'Impact environnemental',
        neuf: { value: 'Fort', detail: '~900 kg CO₂ par serveur' },
        reconditionne: { value: 'Minimal', detail: 'Prolongation de vie = économie de ressources', winner: true }
    },
    {
        criteria: 'Personnalisation',
        neuf: { value: 'CTO constructeur', detail: 'Délais supplémentaires' },
        reconditionne: { value: 'CTO interne', detail: 'Personnalisation sans délai additionnel', winner: true }
    },
    {
        criteria: 'Support technique',
        neuf: { value: 'Constructeur', detail: 'Hotline internationale' },
        reconditionne: { value: 'SAV France', detail: 'Interlocuteur dédié' }
    },
    {
        criteria: 'Disponibilité pièces',
        neuf: { value: 'Variable', detail: 'Selon politique constructeur' },
        reconditionne: { value: 'Stock pièces', detail: 'Pièces reconditionnées disponibles' }
    }
];

const useCases = [
    {
        title: 'Infrastructure de production',
        description: 'Pour les charges de travail stables et prévisibles, le reconditionné offre un excellent rapport performance/prix.',
        recommendation: 'reconditionné',
        examples: ['Serveurs de fichiers', 'Bases de données internes', 'Serveurs d\'impression']
    },
    {
        title: 'Environnements de développement/test',
        description: 'Inutile de payer le prix du neuf pour des machines de test.',
        recommendation: 'reconditionné',
        examples: ['CI/CD runners', 'Environnements de staging', 'Labs de formation']
    },
    {
        title: 'Workstations CAO/DAO',
        description: 'Les workstations de génération précédente restent largement suffisantes pour la plupart des logiciels métier.',
        recommendation: 'reconditionné',
        examples: ['Solidworks', 'AutoCAD', 'Revit']
    },
    {
        title: 'Haute densité / HPC',
        description: 'Pour les besoins de calcul intensif nécessitant les derniers GPU/CPU.',
        recommendation: 'neuf',
        examples: ['IA/ML training', 'Rendu 3D temps réel', 'Simulation scientifique']
    },
    {
        title: 'Edge computing critique',
        description: 'Quand la garantie constructeur longue durée est essentielle.',
        recommendation: 'neuf',
        examples: ['Équipements médicaux', 'Systèmes embarqués critiques']
    }
];

export default function ReconditionnePage() {
    return (
        <>
            <Head>
                <title>Reconditionné vs Neuf - Comparatif B2B | ProInfo Market</title>
                <meta name="description" content="Comparaison objective entre matériel informatique neuf et reconditionné pour les entreprises. Critères factuels pour guider votre décision d'achat." />
            </Head>

            <Header />

            <main className="bg-[#F8F9FA] min-h-screen">
                {/* Hero */}
                <section className="bg-gradient-to-r from-[#1E3A5F] to-[#2C5282] text-white py-16">
                    <div className="container-b2b">
                        <div className="max-w-3xl">
                            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
                                Reconditionné vs Neuf : le vrai comparatif B2B
                            </h1>
                            <p className="text-lg text-[#C5D5E4]">
                                Pas de discours marketing. Des faits, des chiffres, et une analyse objective pour guider votre décision d'achat.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="container-b2b py-12 space-y-12">
                    {/* Tableau comparatif */}
                    <section>
                        <h2 className="text-2xl font-bold text-[#212529] mb-6">Comparaison critère par critère</h2>

                        <Card>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-[#E9ECEF]">
                                                <th className="text-left py-4 px-4 font-semibold text-[#495057]">Critère</th>
                                                <th className="text-center py-4 px-4 font-semibold text-[#495057]">Neuf</th>
                                                <th className="text-center py-4 px-4 font-semibold text-[#1E3A5F]">Reconditionné</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comparisons.map((row, index) => (
                                                <tr key={index} className="border-b border-[#E9ECEF] last:border-0">
                                                    <td className="py-4 px-4 font-medium text-[#212529]">{row.criteria}</td>
                                                    <td className="py-4 px-4 text-center">
                                                        <div className="font-semibold text-[#6C757D]">{row.neuf.value}</div>
                                                        <div className="text-sm text-[#6C757D]">{row.neuf.detail}</div>
                                                    </td>
                                                    <td className={`py-4 px-4 text-center ${row.reconditionne.winner ? 'bg-[#E8F5E9]' : ''}`}>
                                                        <div className="font-semibold text-[#1E3A5F]">{row.reconditionne.value}</div>
                                                        <div className="text-sm text-[#6C757D]">{row.reconditionne.detail}</div>
                                                        {row.reconditionne.winner && (
                                                            <Badge variant="success" className="mt-1">Avantage</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Cas d'usage */}
                    <section>
                        <h2 className="text-2xl font-bold text-[#212529] mb-6">Recommandations par cas d'usage</h2>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {useCases.map((useCase, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between mb-2">
                                            <CardTitle className="text-lg">{useCase.title}</CardTitle>
                                            <Badge variant={useCase.recommendation === 'reconditionné' ? 'success' : 'info'}>
                                                {useCase.recommendation === 'reconditionné' ? 'Reconditionné' : 'Neuf'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-[#6C757D] mb-3">{useCase.description}</p>
                                        <div className="space-y-1">
                                            {useCase.examples.map((example, i) => (
                                                <div key={i} className="text-sm text-[#495057] flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 bg-[#1E3A5F] rounded-full"></span>
                                                    {example}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Mythes et réalités */}
                    <section>
                        <h2 className="text-2xl font-bold text-[#212529] mb-6">Mythes vs Réalités</h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardContent className="py-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-[#FFEBEE] rounded-lg flex items-center justify-center text-[#C62828] flex-shrink-0">
                                            ✗
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#212529] mb-2">"Le reconditionné tombe plus souvent en panne"</h4>
                                            <p className="text-sm text-[#6C757D]">
                                                <strong>Faux.</strong> Un équipement reconditionné industriellement passe 47 points de contrôle.
                                                Les composants défaillants sont remplacés avant la vente. Le taux de retour SAV est inférieur à 2%.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="py-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-[#FFEBEE] rounded-lg flex items-center justify-center text-[#C62828] flex-shrink-0">
                                            ✗
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#212529] mb-2">"Les performances sont dégradées"</h4>
                                            <p className="text-sm text-[#6C757D]">
                                                <strong>Faux.</strong> Les composants sont testés sous charge. Les benchmarks attestent de performances
                                                identiques à l'état neuf. Seuls les SSD/HDD avec usure excessive sont remplacés.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="py-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-[#E8F5E9] rounded-lg flex items-center justify-center text-[#388E3C] flex-shrink-0">
                                            ✓
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#212529] mb-2">"C'est vraiment moins cher"</h4>
                                            <p className="text-sm text-[#6C757D]">
                                                <strong>Vrai.</strong> En moyenne 40 à 60% moins cher que le neuf à configuration équivalente.
                                                Sur un parc de 50 machines, c'est plusieurs dizaines de milliers d'euros économisés.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="py-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-[#E8F5E9] rounded-lg flex items-center justify-center text-[#388E3C] flex-shrink-0">
                                            ✓
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#212529] mb-2">"C'est bon pour la RSE"</h4>
                                            <p className="text-sm text-[#6C757D]">
                                                <strong>Vrai.</strong> Prolonger la vie d'un serveur de 3 ans économise ~900 kg de CO₂,
                                                120 000 litres d'eau et 500 kWh d'énergie de fabrication.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="text-center py-8">
                        <Card className="bg-gradient-to-r from-[#1E3A5F] to-[#2C5282] text-white">
                            <CardContent className="py-8">
                                <h3 className="text-2xl font-bold mb-4">Prêt à explorer notre catalogue ?</h3>
                                <p className="text-[#C5D5E4] mb-6 max-w-2xl mx-auto">
                                    Découvrez nos serveurs, workstations et laptops reconditionnés.
                                    Chaque équipement est testé, certifié et garanti.
                                </p>
                                <Link
                                    href="/"
                                    className="inline-block bg-white text-[#1E3A5F] px-8 py-3 rounded-lg font-semibold hover:bg-[#E8EEF4] transition-colors"
                                >
                                    Voir le catalogue
                                </Link>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </main>

            <Footer />
        </>
    );
}
