import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from '../components/Modal';
import QRScanner from '../components/QRScanner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Transactions = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(user?.role === 'admin');
    const [filter, setFilter] = useState(searchParams.get('filter') || 'Semua');

    // Modals & State
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedResId, setSelectedResId] = useState(null);
    const [isEditResModalOpen, setIsEditResModalOpen] = useState(false);
    const [isDeleteResModalOpen, setIsDeleteResModalOpen] = useState(false);
    const [resToEdit, setResToEdit] = useState(null);
    const [resToDelete, setResToDelete] = useState(null);

    // --- DATA FETCHING ---
    const { data: reservations, isLoading: isResLoading } = useQuery({
        queryKey: ['reservations'],
        queryFn: async () => (await api.get('/api/reservations')).data,
        refetchInterval: 5000,
    });

    const { data: inventory } = useQuery({
        queryKey: ['inventory'],
        queryFn: async () => (await api.get('/api/inventory')).data,
    });

    const { data: transactions, isLoading: isTrxLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => (await api.get('/api/transactions')).data,
        refetchInterval: 5000,
    });

    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => (await api.get('/api/system-settings')).data
    });

    // --- MUTATIONS ---
    const createReservationMutation = useMutation({
        mutationFn: async (data) => api.post('/api/reservations', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setIsReservationModalOpen(false);
        }
    });

    const editReservationMutation = useMutation({
        mutationFn: async ({ id, data }) => api.put(`/api/reservations/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setIsEditResModalOpen(false);
            setResToEdit(null);
        }
    });

    const deleteReservationMutation = useMutation({
        mutationFn: async (id) => api.delete(`/api/reservations/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setIsDeleteResModalOpen(false);
            setResToDelete(null);
        }
    });

    const updateResStatusMutation = useMutation({
        mutationFn: async ({ id, status, rejection_reason }) => api.put(`/api/reservations/${id}/status`, { status, rejection_reason }),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setIsRejectModalOpen(false);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => api.put(`/api/transactions/${id}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['inventory']);
        },
        onError: (error) => alert(`Gagal memperbarui status: ${error.response?.data?.error || error.message}`)
    });

    const returnMutation = useMutation({
        mutationFn: async (trx) => api.post('/api/transactions', {
            item_id: trx.item_id,
            user_id: trx.user_id,
            type: 'IN',
            qty_change: Math.abs(trx.qty_change),
            notes: `Returned: ${trx.item.name}`,
            original_trx_id: trx.trx_id
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['inventory']);
        }
    });

    // --- HELPER FUNCTIONS ---
    function cn(...args) { return args.filter(Boolean).join(' '); }

    const sendWANotif = (trx, type) => {
        if (!trx.user?.phone) {
            alert('User ini tidak memiliki nomor WhatsApp yang terdaftar.');
            return;
        }
        let message = '';
        if (type === 'APPROVED') {
            message = systemSettings?.wa_confirm_borrow
                ?.replace('{name}', trx.user.display_name)
                ?.replace('{item}', trx.item.name)
                ?.replace('{qty}', Math.abs(trx.qty_change));
        } else if (type === 'RETURNED') {
            message = systemSettings?.wa_confirm_return
                ?.replace('{name}', trx.user.display_name)
                ?.replace('{item}', trx.item.name);
        }
        const phone = trx.user.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message || 'Halo!')}`, '_blank');
    };

    const sendResWANotif = (res, type, reason = '') => {
        if (!res.user?.phone) return;
        let message = '';
        if (type === 'APPROVED') {
            message = (systemSettings?.wa_booking_approved || "Halo {name}, reservasi aset {item} anda untuk {start} s/d {end} telah DISETUJUI.")
                .replace('{name}', res.user.display_name)
                .replace('{item}', res.item.name)
                .replace('{start}', new Date(res.start_date).toLocaleDateString('id-ID'))
                .replace('{end}', new Date(res.end_date).toLocaleDateString('id-ID'));
        } else if (type === 'REJECTED') {
            message = (systemSettings?.wa_booking_rejected || "Halo {name}, reservasi aset {item} anda DITOLAK. Alasan: {reason}.")
                .replace('{name}', res.user.display_name)
                .replace('{item}', res.item.name)
                .replace('{reason}', reason || 'Tidak tersedia');
        }
        const phone = res.user.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const getStatusInfo = (trx) => {
        if (trx.status === 'PENDING') return { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-900/50', icon: 'hourglass_empty' };
        if (trx.status === 'REJECTED') return { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-900/50', icon: 'cancel' };

        const isOverdue = trx.type === 'OUT' && !trx.is_returned && (new Date() - new Date(trx.timestamp)) > (3 * 24 * 60 * 60 * 1000);
        if (trx.type === 'IN' || (trx.type === 'OUT' && trx.is_returned)) return { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-900/50', icon: 'check_circle' };
        if (isOverdue) return { label: 'Terlambat', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-900/50', icon: 'warning' };
        return { label: 'Aktif', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-900/50', icon: 'clock_loader_40' };
    };

    // --- FILTER LOGIC ---
    const sortedTransactions = [...(transactions || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const filteredTransactions = sortedTransactions.filter(trx => {
        if (filter === 'Permintaan') return trx.status === 'PENDING';
        if (filter === 'Aktif') return trx.type === 'OUT' && !trx.is_returned && trx.status !== 'PENDING' && trx.status !== 'REJECTED';
        if (filter === 'Kembali') return trx.type === 'OUT' && trx.is_returned;
        if (filter === 'Semua') return trx.type === 'OUT' && trx.status !== 'PENDING' && trx.status !== 'REJECTED';
        if (filter === 'Log Stok') return true;
        return true;
    });

    const DesktopTable = (
        <div className="hidden md:block bg-white dark:bg-surface-dark rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse font-medium">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">Barang</th>
                            <th className="px-6 py-4">Peminjam</th>
                            <th className="px-6 py-4">Waktu</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Ket</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {isTrxLoading ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Mengetahui Riwayat...</td></tr>
                        ) : filteredTransactions.map((trx, idx) => {
                            const status = getStatusInfo(trx);
                            return (
                                <motion.tr key={trx.trx_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group", status.label === 'Terlambat' && "bg-red-50/30 dark:bg-red-900/5")}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <img src={trx.item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${trx.item.sku}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div><p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[120px]">{trx.item.name}</p><p className="text-[10px] text-slate-400 font-bold tracking-widest">SKU: {trx.item.sku}</p></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-cover bg-center border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url(${trx.user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trx.user.email}`})` }}></div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{trx.user.display_name}</p>
                                                {trx.user.phone && (
                                                    <a href={`https://wa.me/${trx.user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] font-black text-emerald-500 hover:text-emerald-600 transition-colors">
                                                        <span className="material-symbols-outlined text-[12px]">call</span>
                                                        {trx.user.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="space-y-1"><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(trx.timestamp).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p><p className={cn("text-xs font-black", trx.qty_change < 0 ? 'text-red-500' : 'text-emerald-500')}>{trx.qty_change < 0 ? 'KELUAR' : 'MASUK'} {Math.abs(trx.qty_change)} PKT</p></div></td>
                                    <td className="px-6 py-4"><span className={cn("inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border", status.color)}><span className="material-symbols-outlined text-[14px]">{status.icon}</span>{status.label}</span></td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{trx.notes || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        {trx.status === 'PENDING' && isAdmin && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        updateStatusMutation.mutate({ id: trx.trx_id, status: 'APPROVED' });
                                                        setTimeout(() => sendWANotif(trx, 'APPROVED'), 1000);
                                                    }}
                                                    className="size-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                                </button>
                                                <button onClick={() => updateStatusMutation.mutate({ id: trx.trx_id, status: 'REJECTED' })} className="size-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"><span className="material-symbols-outlined text-[16px]">close</span></button>
                                            </div>
                                        )}
                                        {trx.type === 'OUT' && !trx.is_returned && trx.status !== 'PENDING' && trx.status !== 'REJECTED' && (
                                            <div className="flex justify-end gap-2">
                                                {trx.user?.phone && (
                                                    <button onClick={() => sendWANotif(trx, 'APPROVED')} className="size-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                                        <span className="material-symbols-outlined text-[16px]">chat</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        returnMutation.mutate(trx);
                                                        setTimeout(() => sendWANotif(trx, 'RETURNED'), 1000);
                                                    }}
                                                    disabled={returnMutation.isPending}
                                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                                                >
                                                    Pulangkan
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const MobileCards = (
        <div className="md:hidden space-y-4">
            {isTrxLoading ? (
                <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Riwayat...</div>
            ) : filteredTransactions.map((trx, idx) => {
                const status = getStatusInfo(trx);
                return (
                    <motion.div key={trx.trx_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className={cn("bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 space-y-4", status.label === 'Terlambat' && "border-l-4 border-l-red-500")}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <img src={trx.item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${trx.item.sku}`} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{trx.item.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(trx.timestamp).toLocaleDateString('id-ID')}</p>
                                </div>
                            </div>
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border", status.color)}>
                                {status.label}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark/50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-cover bg-center border border-white dark:border-slate-700" style={{ backgroundImage: `url(${trx.user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trx.user.email}`})` }}></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{trx.user.display_name}</p>
                                    {trx.user.phone && (
                                        <a href={`https://wa.me/${trx.user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black text-emerald-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">call</span>
                                            {trx.user.phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                            <p className={cn("text-[10px] font-black", trx.qty_change < 0 ? 'text-red-500' : 'text-emerald-500')}>
                                {trx.qty_change < 0 ? 'KELUAR' : 'MASUK'} {Math.abs(trx.qty_change)} UNIT
                            </p>
                        </div>
                        {trx.status === 'PENDING' && isAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        updateStatusMutation.mutate({ id: trx.trx_id, status: 'APPROVED' });
                                        setTimeout(() => sendWANotif(trx, 'APPROVED'), 1000);
                                    }}
                                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                                >
                                    Terima & WA
                                </button>
                                <button onClick={() => updateStatusMutation.mutate({ id: trx.trx_id, status: 'REJECTED' })} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all">Tolak</button>
                            </div>
                        )}
                        {trx.type === 'OUT' && !trx.is_returned && trx.status !== 'PENDING' && trx.status !== 'REJECTED' && (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        returnMutation.mutate(trx);
                                        setTimeout(() => sendWANotif(trx, 'RETURNED'), 1000);
                                    }}
                                    disabled={returnMutation.isPending}
                                    className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200 dark:shadow-none"
                                >
                                    Pulangkan Sekarang
                                </button>
                                {trx.user?.phone && (
                                    <button onClick={() => sendWANotif(trx, 'APPROVED')} className="w-full py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-sm">chat</span>
                                        Kirim Notifikasi WA
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
                {/* HEADERS */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Riwayat Pinjaman</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">Manajemen peredaran aset Ioda Academy.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsReservationModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all uppercase tracking-widest">
                            <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                            Booking
                        </button>
                        <button onClick={() => setIsQRModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all uppercase tracking-widest">
                            <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                            Scan QR
                        </button>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="bg-white dark:bg-surface-dark p-2 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 flex items-center overflow-x-auto no-scrollbar justify-between">
                    <div className="flex items-center gap-1">
                        {['Semua', 'Aktif', 'Kembali', 'Log Stok', 'Permintaan'].map((f) => (
                            <button key={f} onClick={() => setFilter(f)} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap", filter === f ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600")}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT */}
                {filter === 'Permintaan' ? (
                    <div className="space-y-4">
                        {/* REZ Desktop Table */}
                        <div className="hidden md:block bg-white dark:bg-surface-dark rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left border-collapse font-medium">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                                        <th className="px-6 py-4">Barang</th>
                                        <th className="px-6 py-4">Peminjam</th>
                                        <th className="px-6 py-4">Masa Booking</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {isResLoading ? (
                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Mengetahui Jadwal...</td></tr>
                                    ) : (reservations || []).length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-bold italic text-xs">Belum ada booking yang masuk.</td></tr>
                                    ) : (reservations || []).map((res) => (
                                        <tr key={res.res_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                                                        <img src={res.item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${res.item.sku}`} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div><p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{res.item.name}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-cover bg-center border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url(${res.user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.email}`})` }}></div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{res.user.display_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-2">
                                                <span>{new Date(res.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                                <span>{new Date(res.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                    res.status === 'PENDING' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                        res.status === 'APPROVED' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                                            "bg-red-100 text-red-700 border-red-200"
                                                )}>
                                                    {res.status === 'PENDING' ? 'Menunggu' : res.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdmin && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setResToEdit(res); setIsEditResModalOpen(true); }}
                                                            className="size-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                            title="Edit / Ubah Status"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => { setResToDelete(res); setIsDeleteResModalOpen(true); }}
                                                            className="size-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                            title="Hapus"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>

                                                        {res.status === 'PENDING' && (
                                                            <>
                                                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                                                <button
                                                                    onClick={() => {
                                                                        updateResStatusMutation.mutate({ id: res.res_id, status: 'APPROVED' });
                                                                        setTimeout(() => sendResWANotif(res, 'APPROVED'), 1000);
                                                                    }}
                                                                    className="size-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                                                                    title="Setujui"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => { setSelectedResId(res.res_id); setIsRejectModalOpen(true); }}
                                                                    className="size-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                                                    title="Tolak"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {res.status === 'REJECTED' && (
                                                    <span className="text-[10px] text-red-500 font-bold truncate max-w-[150px] inline-block" title={res.rejection_reason}>{res.rejection_reason || 'Tanpa alasan'}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* REZ Mobile Cards */}
                        <div className="md:hidden space-y-4">
                            {isTrxLoading ? (
                                <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Jadwal...</div>
                            ) : (reservations || []).map((res) => (
                                <div key={res.res_id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                                                <img src={res.item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${res.item.sku}`} className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{res.item.name}</p>
                                        </div>
                                        <span className={cn("px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border", res.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" : res.status === 'APPROVED' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                            {res.status}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${res.user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.email}`})` }}></div>
                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{res.user.display_name}</p>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                                            <span>Mulai: {new Date(res.start_date).toLocaleDateString('id-ID')}</span>
                                            <span>Sampai: {new Date(res.end_date).toLocaleDateString('id-ID')}</span>
                                        </div>
                                        {res.status === 'REJECTED' && (
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px]">
                                                <span className="font-bold text-red-500 uppercase tracking-widest block mb-1">Ditolak Karena:</span>
                                                <span className="text-slate-600 dark:text-slate-400">{res.rejection_reason || '-'}</span>
                                            </div>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className={cn("grid gap-2", res.status === 'PENDING' ? "grid-cols-2" : "grid-cols-2")}>
                                            <button onClick={() => { setResToEdit(res); setIsEditResModalOpen(true); }} className="py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Edit / Status</button>
                                            <button onClick={() => { setResToDelete(res); setIsDeleteResModalOpen(true); }} className="py-2.5 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Hapus</button>

                                            {res.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => { updateResStatusMutation.mutate({ id: res.res_id, status: 'APPROVED' }); setTimeout(() => sendResWANotif(res, 'APPROVED'), 1000); }} className="col-span-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Setuju</button>
                                                    <button onClick={() => { setSelectedResId(res.res_id); setIsRejectModalOpen(true); }} className="col-span-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Tolak</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {DesktopTable}
                        {MobileCards}
                    </>
                )}
            </div>

            {/* --- MODALS --- */}

            <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} title="Pindai QR Peminjaman">
                <QRScanner onScan={(sku) => { setIsQRModalOpen(false); navigate(`/inventory?q=${sku}`); }} onClose={() => setIsQRModalOpen(false)} />
            </Modal>

            <Modal isOpen={isReservationModalOpen} onClose={() => setIsReservationModalOpen(false)} title="Buat Reservasi Aset">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    createReservationMutation.mutate({
                        item_id: formData.get('item_id'),
                        user_id: user.user_id,
                        start_date: formData.get('start_date'),
                        end_date: formData.get('end_date'),
                        notes: formData.get('notes'),
                    });
                }} className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-cover bg-center border-2 border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url(${user?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`})` }}></div>
                            <div>
                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{user?.display_name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-[16px] text-emerald-500">call</span>
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 tracking-widest uppercase">WhatsApp: {user?.phone || 'Belum diatur'}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Aset</label>
                        <select name="item_id" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold active:ring-2 active:ring-primary/20 transition-all outline-none">
                            <option value="">-- Pilih Barang --</option>
                            {inventory?.map(item => <option key={item.item_id} value={item.item_id}>{item.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mulai</label>
                            <input type="date" name="start_date" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selesai</label>
                            <input type="date" name="end_date" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</label>
                        <textarea name="notes" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold h-24 outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Alasan peminjaman..."></textarea>
                    </div>
                    <button type="submit" disabled={createReservationMutation.isPending} className="w-full py-4 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50">
                        {createReservationMutation.isPending ? 'Memproses...' : 'Kirim Permintaan Booking'}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Alasan Penolakan">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const reason = new FormData(e.target).get('reason');
                    if (selectedResId) {
                        updateResStatusMutation.mutate({ id: selectedResId, status: 'REJECTED', rejection_reason: reason });
                        const res = reservations?.find(r => r.res_id === selectedResId);
                        if (res) setTimeout(() => sendResWANotif(res, 'REJECTED', reason), 1000);
                    }
                }} className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Anda akan menolak reservasi ini</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Harap berikan alasan yang jelas.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alasan Penolakan</label>
                        <textarea name="reason" required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold h-32 outline-none focus:ring-2 focus:ring-red-500/20 transition-all" placeholder="Contoh: Barang rusak..."></textarea>
                    </div>
                    <button type="submit" disabled={updateResStatusMutation.isPending} className="w-full py-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/30 active:scale-95 transition-all">
                        {updateResStatusMutation.isPending ? 'Memproses...' : 'Tolak Reservasi'}
                    </button>
                </form>
            </Modal>

            {/* Edit Reservation Modal */}
            <Modal isOpen={isEditResModalOpen} onClose={() => setIsEditResModalOpen(false)} title="Edit / Ubah Status Reservasi">
                {resToEdit && (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        editReservationMutation.mutate({
                            id: resToEdit.res_id,
                            data: {
                                item_id: formData.get('item_id'),
                                start_date: formData.get('start_date'),
                                end_date: formData.get('end_date'),
                                notes: formData.get('notes'),
                                status: formData.get('status'),
                                rejection_reason: formData.get('rejection_reason'),
                            }
                        });
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                            <select
                                name="status"
                                defaultValue={resToEdit.status}
                                onChange={(e) => {
                                    // Optional: force update component to show/hide rejection box if needed. 
                                    // For simplicity in Uncontrolled form, we might rely on CSS or a small state if we want dynamic show/hide.
                                    // But since we are using defaultValue, let's keep it simple.
                                    // If users select REJECTED, they should see the box. 
                                    // We'll just show it always if status is rejected by default, BUT for dynamic UX we need state.
                                    // We'll wrap this form in a small component or just use state here.
                                    setResToEdit(prev => ({ ...prev, status: e.target.value }));
                                }}
                                className={cn(
                                    "w-full p-4 border-none rounded-xl text-sm font-black uppercase tracking-widest outline-none transition-all",
                                    resToEdit.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                                        resToEdit.status === 'APPROVED' ? "bg-emerald-100 text-emerald-700" :
                                            "bg-red-100 text-red-700"
                                )}
                            >
                                <option value="PENDING">Menunggu</option>
                                <option value="APPROVED">Disetujui</option>
                                <option value="REJECTED">Ditolak</option>
                            </select>
                        </div>

                        {resToEdit.status === 'REJECTED' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alasan Penolakan</label>
                                <textarea
                                    name="rejection_reason"
                                    defaultValue={resToEdit.rejection_reason}
                                    className="w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-none rounded-xl text-sm font-bold h-24 outline-none focus:ring-2 focus:ring-red-500/20 transition-all placeholder:text-red-300"
                                    placeholder="Alasan penolakan..."
                                ></textarea>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Aset</label>
                            <select name="item_id" defaultValue={resToEdit.item_id} required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold active:ring-2 active:ring-primary/20 transition-all outline-none">
                                {inventory?.map(item => <option key={item.item_id} value={item.item_id}>{item.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mulai</label>
                                <input type="date" name="start_date" defaultValue={new Date(resToEdit.start_date).toISOString().split('T')[0]} required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selesai</label>
                                <input type="date" name="end_date" defaultValue={new Date(resToEdit.end_date).toISOString().split('T')[0]} required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</label>
                            <textarea name="notes" defaultValue={resToEdit.notes} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold h-24 outline-none focus:ring-2 focus:ring-primary/20 transition-all"></textarea>
                        </div>
                        <button type="submit" disabled={editReservationMutation.isPending} className="w-full py-4 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50">
                            {editReservationMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </form>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteResModalOpen} onClose={() => setIsDeleteResModalOpen(false)} title="Hapus Reservasi">
                {resToDelete && (
                    <div className="space-y-6 text-center p-4">
                        <div className="size-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                            <span className="material-symbols-outlined text-3xl">delete</span>
                        </div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            Reservasi <span className="text-slate-900 dark:text-white uppercase">{resToDelete.item.name}</span> oleh {resToDelete.user.display_name} akan dihapus permanen.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setIsDeleteResModalOpen(false)} className="py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Batal</button>
                            <button onClick={() => deleteReservationMutation.mutate(resToDelete.res_id)} className="py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">Hapus</button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default Transactions;
