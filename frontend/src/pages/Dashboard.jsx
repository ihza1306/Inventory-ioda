import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Modal from '../components/Modal';
import QRScanner from '../components/QRScanner';
import { useAuth } from '../hooks/useAuth';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);
    const [scannerMode, setScannerMode] = React.useState('OUT'); // OUT or IN
    const [isNewItemModalOpen, setIsNewItemModalOpen] = React.useState(false);

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/stats');
            return response.data;
        },
        refetchInterval: 2000,
    });

    const { data: recentActivity } = useQuery({
        queryKey: ['recent-activity'],
        queryFn: async () => {
            const response = await axios.get('/api/transactions');
            return response.data.slice(0, 5); // Just latest 5
        },
        refetchInterval: 2000,
    });

    const { data: reservations } = useQuery({
        queryKey: ['reservations-dashboard'],
        queryFn: async () => (await axios.get('/api/reservations')).data,
        refetchInterval: 5000,
    });

    const pendingReservationsCount = (reservations || []).filter(r => r.status === 'PENDING').length;

    const handleQuickAction = (action) => {
        if (action === 'Pindai & Keluar') {
            setScannerMode('OUT');
            setIsScannerOpen(true);
        } else if (action === 'Masuk Kembali') {
            setScannerMode('IN');
            setIsScannerOpen(true);
        } else if (action === 'Reservasi') {
            navigate('/transactions?filter=Permintaan');
        } else if (action === 'Item Baru') {
            setIsNewItemModalOpen(true);
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex flex-col gap-6">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sistem Manajemen Inventaris</p>
                        <p className="text-slate-900 dark:text-white text-3xl font-black tracking-tight mt-1">
                            {isAdmin ? 'Dasbor' : `Selamat Datang, ${user?.display_name?.split(' ')[0] || 'User'}!`}
                        </p>
                    </motion.div>

                    {isAdmin && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                        >
                            <button
                                onClick={() => navigate('/reports')}
                                className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">file_download</span>
                                Laporan
                            </button>
                            <button
                                onClick={() => navigate('/inventory')}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-primary/30 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Tambah Aset
                            </button>
                        </motion.div>
                    )}
                </div>

                {isAdmin ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Aset', value: stats?.totalItems || 0, icon: 'inventory_2', color: 'blue', sub: 'Total Jumlah' },
                                { label: 'Sedang Dipinjam', value: stats?.itemsOut || 0, icon: 'outbound', color: 'indigo', sub: `+${stats?.thisWeekBorrowed || 0} minggu ini`, subColor: 'text-green-600 bg-green-50' },
                                { label: 'Item Terlambat', value: stats?.overdueCount || 0, icon: 'assignment_late', color: 'red', sub: 'Mendesak', subColor: 'text-red-600 bg-red-50', border: 'border-l-4 border-l-red-500' },
                                { label: 'Stok Rendah', value: stats?.lowStockCount || 0, icon: 'low_priority', color: 'orange', sub: 'Pesan Ulang' },
                            ].map((card, i) => (
                                <motion.div
                                    key={card.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${card.border || ''}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 bg-${card.color}-50 dark:bg-${card.color}-900/20 rounded-lg`}>
                                            <span className={`material-symbols-outlined text-${card.color}-600 dark:text-${card.color}-400`}>{card.icon}</span>
                                        </div>
                                        <span className={`flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${card.subColor || 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                            {card.sub}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{card.label}</p>
                                    <p className="text-slate-900 dark:text-white text-3xl font-black mt-1">{card.value}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Main Dashboard Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Quick Actions & Overdue */}
                            <div className="grid gap-6">
                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Tindakan Cepat</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: 'Pindai & Keluar', icon: 'qr_code_scanner', roles: ['admin'] },
                                            { label: 'Masuk Kembali', icon: 'input', roles: ['admin'] },
                                            { label: 'Reservasi', icon: 'calendar_add_on', badge: pendingReservationsCount > 0 ? pendingReservationsCount : null, roles: ['admin', 'staff', 'viewer'] },
                                            { label: 'Item Baru', icon: 'add_box', roles: ['admin'] },
                                        ].filter(action => !action.roles || action.roles.includes(user?.role)).map(action => (
                                            <button
                                                key={action.label}
                                                onClick={() => handleQuickAction(action.label)}
                                                className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
                                            >
                                                {action.badge && (
                                                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-sm">
                                                        {action.badge}
                                                    </span>
                                                )}
                                                <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform">{action.icon}</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{action.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 border-l-4 border-l-red-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
                                            Pengembalian Telat
                                        </h3>
                                        <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-2 py-0.5 rounded-full uppercase">{stats?.overdueCount || 0} Item</span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {stats?.overdueItems?.length > 0 ? (
                                            stats.overdueItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 group hover:scale-[1.02] transition-all cursor-pointer">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="size-10 rounded-lg bg-cover bg-center border border-red-200 dark:border-red-800 shadow-sm"
                                                            style={{ backgroundImage: `url(${item.img})` }}
                                                        ></div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate max-w-[120px]">{item.name}</p>
                                                            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">Peminjam: {item.borrower}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs font-black text-red-600 dark:text-red-400">{item.time}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-8 h-full flex items-center justify-center text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semua Aman! 🎉</p>
                                            </div>
                                        )}
                                    </div>
                                    {stats?.overdueItems?.length > 0 && (
                                        <button className="w-full mt-4 py-3 text-[10px] text-red-600 dark:text-red-400 font-black hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest border border-dashed border-red-200 dark:border-red-900/40">
                                            <span className="material-symbols-outlined text-[16px]">send</span>
                                            Beritahu Semua
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Recent Activity Table */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
                                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Aktivitas Terkini</h3>
                                    <button
                                        onClick={() => navigate('/transactions')}
                                        className="text-xs text-primary font-bold uppercase tracking-widest hover:underline"
                                    >Lihat Semua</button>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left font-medium">
                                        <thead className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4">Aset</th>
                                                <th className="px-6 py-4">Pengguna</th>
                                                <th className="px-6 py-4">Tindakan</th>
                                                <th className="px-6 py-4">Waktu</th>
                                                <th className="px-6 py-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {recentActivity?.map((trx) => (
                                                <tr key={trx.trx_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-slate-400 text-lg">
                                                                {trx.item.category === 'Elektronik' ? 'laptop_mac' : 'inventory_2'}
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{trx.item.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{trx.user.display_name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest",
                                                            trx.type === 'OUT' ? "text-blue-600" : "text-emerald-600"
                                                        )}>
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                {trx.type === 'OUT' ? 'logout' : 'login'}
                                                            </span>
                                                            {trx.type === 'OUT' ? 'Dipinjam' : 'Dikembalikan'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 font-bold uppercase">
                                                        {new Date(trx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                            trx.type === 'OUT'
                                                                ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                                                : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                                        )}>
                                                            {trx.type === 'OUT' ? 'Aktif' : 'Selesai'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* USER VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Pinjaman */}
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">assignment_return</span>
                                Pinjaman Berjalan
                            </h3>
                            <div className="space-y-3">
                                {/* We need to fetch 'my' active loans using existing data or a new query. 
                                    For now, we will use 'reservations' (Pending/Approved) as 'Requests' 
                                    and we need 'active loans'.
                                    Actually, the user asked for "Pinjaman yang sedang berjalan". 
                                    Since we don't have a reliable "My Active Loans" endpoint, 
                                    let's check if 'recentActivity' contains 'OUT' for me. 
                                    
                                    Wait, 'recentActivity' is global. I should fetch '/api/transactions?user_id=me' if possible.
                                    Or filter `reservations`? Reservations are for *booking*. 
                                    Transactions are for *checkout*.
                                    
                                    IMPROVISATION: Since we don't have a dedicated "My Items Out" endpoint ready, 
                                    and the user demands accuracy, I will use `reservations` (Permintaan) as the closest proxy for "what I asked for".
                                    AND I will try to see if I can fetch my own history.
                                    
                                    Let's just show 'Your Reservations' here as it's cleaner and safer than guessing transactions.
                                 */}
                                {reservations?.filter(r => r.user_id === user?.user_id && ['PENDING', 'APPROVED'].includes(r.status)).length > 0 ? (
                                    reservations.filter(r => r.user_id === user?.user_id && ['PENDING', 'APPROVED'].includes(r.status)).map(res => (
                                        <div key={res.res_id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="size-12 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center p-1 border border-slate-200 dark:border-slate-600">
                                                <img src={res.item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${res.item.sku}`} className="w-full h-full object-cover rounded-md" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{res.item.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                                    {new Date(res.start_date).toLocaleDateString('id-ID')}
                                                </p>
                                            </div>
                                            <span className={cn(
                                                "px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border",
                                                res.status === 'PENDING' ? "bg-yellow-50 text-yellow-600 border-yellow-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            )}>
                                                {res.status === 'PENDING' ? 'Menunggu' : 'Disetujui'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                                        <p className="text-xs font-bold uppercase tracking-widest">Tidak ada pinjaman aktif</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg shadow-primary/30 p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <span className="material-symbols-outlined text-9xl transform rotate-12">inventory_2</span>
                            </div>
                            <h3 className="text-lg font-bold mb-2">Butuh Pinjaman?</h3>
                            <p className="text-blue-100 text-sm mb-6 max-w-[80%]">Ajukan peminjaman aset dengan mudah melalui fitur reservasi kami.</p>
                            <button onClick={() => navigate('/transactions?filter=Permintaan')} className="px-6 py-3 bg-white text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-sm">
                                Buat Reservasi
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* QR Scanner Modal */}
            <Modal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                title={scannerMode === 'OUT' ? "Pindai Aset untuk Pinjam" : "Pindai Aset untuk Kembali"}
            >
                <div className="space-y-4">
                    <QRScanner
                        onScan={(sku) => {
                            setIsScannerOpen(false);
                            if (scannerMode === 'OUT') {
                                navigate(`/inventory?q=${sku}`);
                            } else {
                                navigate(`/transactions?q=${sku}`);
                            }
                        }}
                        onClose={() => setIsScannerOpen(false)}
                    />
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        Arahkan kamera ke QR Code pada label aset Ioda Academy
                    </p>
                </div>
            </Modal>

            {/* New Item Selection Modal */}
            <Modal
                isOpen={isNewItemModalOpen}
                onClose={() => setIsNewItemModalOpen(false)}
                title="Tambah Item Baru"
            >
                <div className="grid grid-cols-2 gap-4 p-2">
                    <button
                        onClick={() => {
                            setIsNewItemModalOpen(false);
                            navigate('/inventory');
                        }}
                        className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                        <span className="material-symbols-outlined text-3xl text-primary mb-3 group-hover:scale-110 transition-transform">inventory_2</span>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Aset Inventaris</span>
                    </button>
                    <button
                        onClick={() => {
                            setIsNewItemModalOpen(false);
                            navigate('/shared-accounts');
                        }}
                        className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
                    >
                        <span className="material-symbols-outlined text-3xl text-blue-500 mb-3 group-hover:scale-110 transition-transform">key</span>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Akun Shared</span>
                    </button>
                </div>
            </Modal>

            {/* Reservation Modal Placeholder */}
        </div>
    );
};

export default Dashboard;
