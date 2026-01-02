import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { motion } from 'framer-motion';

const Borrowers = () => {
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch users (borrowers)
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/api/users');
            return response.data;
        }
    });

    // Fetch transactions to calculate stats
    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const response = await api.get('/api/transactions');
            return response.data;
        }
    });

    const getUserStats = (userId) => {
        const userTrxs = transactions?.filter(t => t.user_id === userId) || [];
        const totalBorrowed = userTrxs.filter(t => t.type === 'OUT').reduce((acc, t) => acc + Math.abs(t.qty_change), 0);
        const activeLoans = userTrxs.filter(t => t.type === 'OUT' && !t.is_returned).reduce((acc, t) => acc + Math.abs(t.qty_change), 0);

        return { totalBorrowed, activeLoans };
    };

    const filteredUsers = users?.filter(u =>
        u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="flex-1 p-6 lg:p-8 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Daftar Peminjam</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Data staf dan siswa yang terdaftar dalam sistem.</p>
                </div>

                {/* Search Bar */}
                <div className="bg-white dark:bg-surface-dark p-3 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800">
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input
                            type="text"
                            placeholder="Cari peminjam berdasarkan nama atau email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white transition-all"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                                    <th className="px-6 py-4">Profil</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Status Akun</th>
                                    <th className="px-6 py-4">Barang Aktif</th>
                                    <th className="px-6 py-4">Total Pinjam</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Data Peminjam...</td></tr>
                                ) : filteredUsers.map((u, i) => {
                                    const stats = getUserStats(u.user_id);
                                    return (
                                        <motion.tr
                                            key={u.user_id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="size-10 rounded-full bg-cover bg-center border border-white dark:border-slate-700 shadow-sm"
                                                        style={{ backgroundImage: `url(${u.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`})` }}
                                                    ></div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{u.display_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${u.role === 'admin' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'}`}>
                                                    {u.role === 'admin' ? 'Administrator' : 'Staf Ioda'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${stats.activeLoans > 0 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'text-slate-400'}`}>
                                                        {stats.activeLoans} Barang
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{stats.totalBorrowed}</p>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Borrowers;
