/**
 * Header Component
 * Navigation B2B premium et sobre
 */

import React from 'react';
import Link from 'next/link';

export function Header() {
    return (
        <header className="bg-white border-b border-[#E9ECEF] sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1E3A5F] rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">P</span>
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-xl font-bold text-[#1E3A5F]">ProInfo</span>
                            <span className="text-xl font-light text-[#6C757D]"> Market</span>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link
                            href="/"
                            className="text-sm font-medium text-[#495057] hover:text-[#1E3A5F] transition-colors"
                        >
                            Catalogue
                        </Link>
                        <Link
                            href="/process"
                            className="text-sm font-medium text-[#495057] hover:text-[#1E3A5F] transition-colors"
                        >
                            Notre processus
                        </Link>
                        <Link
                            href="/quality"
                            className="text-sm font-medium text-[#495057] hover:text-[#1E3A5F] transition-colors"
                        >
                            Qualité
                        </Link>
                        <Link
                            href="/warranty"
                            className="text-sm font-medium text-[#495057] hover:text-[#1E3A5F] transition-colors"
                        >
                            Garantie & SAV
                        </Link>
                    </nav>

                    {/* CTA */}
                    <div className="flex items-center gap-4">
                        <a
                            href="tel:+33123456789"
                            className="hidden lg:flex items-center gap-2 text-sm text-[#495057]"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="font-medium">01 23 45 67 89</span>
                        </a>
                        <Link
                            href="/"
                            className="inline-flex items-center px-4 py-2 bg-[#1E3A5F] text-white text-sm font-medium rounded-md hover:bg-[#152A45] transition-colors"
                        >
                            Voir le catalogue
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button className="md:hidden p-2 rounded-md text-[#6C757D] hover:bg-[#F8F9FA]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
