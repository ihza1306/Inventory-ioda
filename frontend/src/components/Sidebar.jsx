import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const Sidebar = () => {
    const { logout, user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => (await axios.get('/api/system-settings')).data
    });

    const logoUrl = systemSettings?.company_logo || 'https://api.dicebear.com/7.x/initials/svg?seed=IA';

    const isAdmin = user?.role === 'admin';

    const menuItems = [
        { name: 'Dasbor', icon: 'dashboard', path: '/' },
        { name: 'Aset', icon: 'inventory_2', path: '/inventory' },
        { name: 'Pinjaman', icon: 'assignment_return', path: '/transactions' },
        ...(isAdmin ? [
            { name: 'Peminjam', icon: 'groups', path: '/borrowers' },
            { name: 'Laporan', icon: 'bar_chart', path: '/reports' },
        ] : []),
        { name: 'Akun Terbagi', icon: 'key', path: '/shared-accounts' },
    ];

    const DesktopSidebar = (
        <aside className="hidden lg:flex w-64 flex-col bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 transition-colors duration-300 h-screen fixed left-0 top-0">
            <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3 w-full p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <div
                        className="size-8 rounded-full bg-cover bg-center border border-white dark:border-slate-700 shadow-sm shrink-0"
                        style={{ backgroundImage: `url(${user?.photo_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'})` }}
                    ></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{user?.display_name || 'User'}</p>
                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">{user?.role || 'Viewer'}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2 custom-scrollbar">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        )}
                    >
                        <span className={cn(
                            "material-symbols-outlined",
                            "group-hover:text-primary transition-colors"
                        )}>{item.icon}</span>
                        <span className="text-sm font-semibold">{item.name}</span>
                    </NavLink>
                ))}

                {/* System Settings - Only for Admin */}
                {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sistem</p>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            )}
                        >
                            <span className="material-symbols-outlined group-hover:text-primary transition-colors">settings</span>
                            <span className="text-sm font-medium">Pengaturan</span>
                        </NavLink>
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-2">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-full"
                    >
                        <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                        <span className="text-sm font-medium">{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors w-full"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span className="text-sm font-medium">Keluar</span>
                    </button>
                </div>
            </div>
        </aside >
    );

    const MobileNav = (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 px-2 z-[100]">
            {menuItems.filter(item => ['/', '/inventory', '/transactions', '/shared-accounts'].includes(item.path)).map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center gap-1 flex-1",
                        isActive
                            ? "text-primary"
                            : "text-slate-500 dark:text-slate-400"
                    )}
                >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="text-[10px] font-bold text-center leading-none">{item.name === 'Akun Terbagi' ? 'Akun' : item.name}</span>
                </NavLink>
            ))}
            {isAdmin && (
                <NavLink
                    to="/settings"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center gap-1 flex-1",
                        isActive
                            ? "text-primary"
                            : "text-slate-500 dark:text-slate-400"
                    )}
                >
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-[10px] font-bold">Menu</span>
                </NavLink>
            )}
        </nav>
    );

    return (
        <>
            {DesktopSidebar}
            {MobileNav}
        </>
    );
};

export default Sidebar;
