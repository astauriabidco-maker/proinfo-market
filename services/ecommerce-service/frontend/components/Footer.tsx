/**
 * Footer Component
 * Footer B2B avec informations de confiance
 */

import React from 'react';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className="bg-[#212529] text-white">
            {/* Main footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Company */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <span className="text-[#1E3A5F] font-bold text-lg">P</span>
                            </div>
                            <div>
                                <span className="text-lg font-bold">ProInfo</span>
                                <span className="text-lg font-light text-[#ADB5BD]"> Market</span>
                            </div>
                        </div>
                        <p className="text-sm text-[#ADB5BD] leading-relaxed">
                            Serveurs et postes de travail IT reconditionnés,
                            certifiés et prêts pour la production.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4">
                            Catalogue
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Tous les produits
                                </Link>
                            </li>
                            <li>
                                <Link href="/?type=SERVER" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Serveurs
                                </Link>
                            </li>
                            <li>
                                <Link href="/?type=WORKSTATION" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Workstations
                                </Link>
                            </li>
                            <li>
                                <Link href="/?type=LAPTOP" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Laptops
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Trust */}
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4">
                            Confiance
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/process" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Notre processus
                                </Link>
                            </li>
                            <li>
                                <Link href="/quality" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Contrôle qualité
                                </Link>
                            </li>
                            <li>
                                <Link href="/data-erasure" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Effacement des données
                                </Link>
                            </li>
                            <li>
                                <Link href="/warranty" className="text-sm text-[#ADB5BD] hover:text-white transition-colors">
                                    Garantie & SAV
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4">
                            Contact
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2 text-sm text-[#ADB5BD]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                01 23 45 67 89
                            </li>
                            <li className="flex items-center gap-2 text-sm text-[#ADB5BD]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                contact@proinfo-market.com
                            </li>
                            <li className="flex items-start gap-2 text-sm text-[#ADB5BD]">
                                <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>
                                    Zone Industrielle<br />
                                    75000 Paris, France
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-[#343A40]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#6C757D]">
                        <p>© 2026 ProInfo Market. Tous droits réservés.</p>
                        <div className="flex gap-6">
                            <Link href="/mentions-legales" className="hover:text-white transition-colors">
                                Mentions légales
                            </Link>
                            <Link href="/cgu" className="hover:text-white transition-colors">
                                CGV
                            </Link>
                            <Link href="/rgpd" className="hover:text-white transition-colors">
                                RGPD
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
