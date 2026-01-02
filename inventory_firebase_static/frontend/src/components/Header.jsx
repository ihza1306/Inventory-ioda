import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const Header = ({ title }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => (await axios.get('/api/system-settings')).data
    });

    const logoUrl = systemSettings?.company_logo || 'https://api.dicebear.com/7.x/initials/svg?seed=IA';

    const handleSearch = (e) => {
        if (e.key === 'Enter' && search.trim()) {
            navigate(`/inventory?q=${encodeURIComponent(search.trim())}`);
            setSearch('');
            setIsMobileSearchOpen(false);
        }
    };

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 z-50 sticky top-0 transition-colors duration-300">
            {/* Mobile Search Tray */}
            {isMobileSearchOpen && (
                <div className="absolute inset-x-0 top-0 h-16 bg-surface-light dark:bg-surface-dark flex items-center px-4 gap-3 z-50 transition-all duration-300 ease-out">
                    <button
                        onClick={() => setIsMobileSearchOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex-1 relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input
                            autoFocus
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                            placeholder="Cari aset..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4">
                <img
                    src={logoUrl}
                    alt="Logo"
                    className={`h-7 w-auto object-contain transition-all duration-300 ${theme === 'dark' ? "brightness-0 invert" : ""}`}
                />
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>
                <h2 className="hidden sm:block text-xl font-bold text-slate-900 dark:text-white capitalize">{title}</h2>

                {/* Cloud Status Indicator */}
                <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
                    <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cloud Aktif</span>
                </div>
            </div>

            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                <div className="relative hidden md:block group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input
                        className="pl-10 pr-4 py-2 w-64 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                        placeholder="Cari aset & tekan Enter..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>

                <div className="flex items-center gap-1 sm:gap-4">
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined">search</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
