import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../components/NotificationProvider';

const SharedAccounts = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const isAdmin = user?.role === 'admin';
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
    const [manageType, setManageType] = useState('ADD'); // ADD or EDIT
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showPassword, setShowPassword] = useState({});
    const [platformSelect, setPlatformSelect] = useState(''); // Tracking the dropdown selection separate from the final value
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState({
        platform: '', username: '', email: '', password: '', notes: '', authorized_emails: '', url: '', icon_url: '', login_method: 'Langsung'
    });

    // Queries
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await axios.get('/api/users');
            return response.data;
        },
        enabled: isAdmin
    });

    const { data: accounts, isLoading } = useQuery({
        queryKey: ['shared-accounts'],
        queryFn: async () => {
            const response = await axios.get('/api/shared-accounts');
            return response.data;
        }
    });

    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => (await axios.get('/api/system-settings')).data,
    });

    // Mutations
    const manageMutation = useMutation({
        mutationFn: async (data) => {
            if (manageType === 'ADD') {
                return axios.post('/api/shared-accounts', data);
            } else {
                return axios.put(`/api/shared-accounts/${selectedAccount.account_id}`, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['shared-accounts']);
            setIsModalOpen(false);
            setFormData({ platform: '', username: '', email: '', password: '', notes: '', authorized_emails: '', url: '', icon_url: '', login_method: 'Langsung' });
            setPlatformSelect('');
            showNotification(manageType === 'ADD' ? 'Akun berhasil ditambahkan!' : 'Akun berhasil diperbarui!', 'success');
        },
        onError: (error) => {
            showNotification(`Gagal menyimpan akun: ${error.response?.data?.error || error.message}`, 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return axios.delete(`/api/shared-accounts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['shared-accounts']);
            setIsDeleteModalOpen(false);
            setAccountToDelete(null);
            showNotification('Akun berhasil dihapus!', 'success');
        },
        onError: (error) => {
            showNotification(`Gagal menghapus akun: ${error.response?.data?.error || error.message}`, 'error');
        }
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async (newIcons) => {
            return axios.put('/api/system-settings', { ...systemSettings, platform_icons: JSON.stringify(newIcons) });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['system-settings']);
            showNotification('Logo platform berhasil diperbarui!', 'success');
        },
        onError: (error) => {
            showNotification(`Gagal memperbarui logo platform: ${error.message}`, 'error');
        }
    });

    const togglePassword = (id) => {
        setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAddModal = () => {
        setManageType('ADD');
        setFormData({ platform: '', username: '', email: '', password: '', notes: '', authorized_emails: '', url: '', icon_url: '', login_method: 'Langsung' });
        setPlatformSelect('');
        setIsModalOpen(true);
    };

    const openEditModal = (acc) => {
        setSelectedAccount(acc);
        setManageType('EDIT');
        const defaultPlatforms = ['ChatGPT for Learning', 'Mayar', 'Adobe Creative Cloud', 'Canva Premium', 'Freepik', 'Frame.io', 'Youtube Premium'];
        const isDefault = defaultPlatforms.includes(acc.platform);

        setFormData({
            platform: acc.platform,
            username: acc.username,
            email: acc.email,
            password: acc.password,
            notes: acc.notes || '',
            authorized_emails: acc.authorized_emails || '',
            url: acc.url || '',
            icon_url: acc.icon_url || '',
            login_method: acc.login_method || 'Langsung'
        });
        setPlatformSelect(isDefault ? acc.platform : 'Platform Lainnya');
        setIsModalOpen(true);
    };

    const handleIconUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('logo', file);

        try {
            setIsUploading(true);
            const response = await axios.post('/api/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, icon_url: response.data.url }));
            showNotification('Ikon berhasil diunggah!', 'success');
        } catch (error) {
            showNotification('Gagal mengunggah ikon: ' + error.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add a toast notification here
    };

    const filteredAccounts = accounts?.filter(acc => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = acc.platform.toLowerCase().includes(query) ||
            acc.email.toLowerCase().includes(query) ||
            (acc.username && acc.username.toLowerCase().includes(query));

        if (isAdmin) return matchesSearch;

        // For non-admins, check if their email is whitelisted
        const userEmail = user?.email?.toLowerCase();
        if (!userEmail) return false;

        const authEmails = acc.authorized_emails ? acc.authorized_emails.split(',').map(e => e.trim().toLowerCase()) : [];
        return matchesSearch && authEmails.includes(userEmail);
    }) || [];

    const getPlatformIcon = (acc) => {
        // 1. Check account-specific icon
        if (acc.icon_url) {
            return (
                <div className="size-full overflow-hidden flex items-center justify-center">
                    <img src={acc.icon_url} alt={acc.platform} className="w-full h-full object-cover" />
                </div>
            );
        }

        // 2. Check global setting fallback
        const globalIcons = JSON.parse(systemSettings?.platform_icons || '{}');
        if (globalIcons[acc.platform]) {
            return (
                <div className="size-full overflow-hidden flex items-center justify-center">
                    <img src={globalIcons[acc.platform]} alt={acc.platform} className="w-full h-full object-cover" />
                </div>
            );
        }

        // 3. Material icon fallback
        const p = acc.platform.toLowerCase();
        let iconName = 'account_circle';
        if (p.includes('chatgpt')) iconName = 'psychology';
        else if (p.includes('adobe')) iconName = 'brush';
        else if (p.includes('canva')) iconName = 'design_services';
        else if (p.includes('freepik')) iconName = 'image';
        else if (p.includes('youtube')) iconName = 'smart_display';
        else if (p.includes('frame')) iconName = 'video_library';
        else if (p.includes('mayar')) iconName = 'payments';

        return <span className="material-symbols-outlined text-2xl">{iconName}</span>;
    };

    return (
        <div className="flex-1 p-6 lg:p-8 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Akun Share Login</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Kelola akses akun premium platform luar ke dalam satu sistem.</p>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsLogoModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[20px]">app_registration</span>
                                Atur Logo
                            </button>
                            <button
                                onClick={openAddModal}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-xs font-black hover:bg-blue-600 shadow-lg shadow-primary/30 transition-all uppercase tracking-widest active:scale-95"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Tambah Akun
                            </button>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="bg-white dark:bg-surface-dark p-3 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800">
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input
                            type="text"
                            placeholder="Cari platform atau email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Akun...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAccounts.map((acc, idx) => (
                            <motion.div
                                key={acc.account_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1, duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
                                className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden group hover:shadow-md transition-all border-t-4 border-t-primary"
                            >
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary flex items-center justify-center overflow-hidden">
                                                {getPlatformIcon(acc)}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{acc.platform}</h3>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Aktif</span>
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase tracking-tighter">
                                                        {acc.login_method === 'Gmail' ? 'Via Gmail' : 'Langsung'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(acc)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setAccountToDelete(acc);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username / Email</p>
                                                {acc.url && (
                                                    <a
                                                        href={acc.url.startsWith('http') ? acc.url : `https://${acc.url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-black text-primary hover:text-blue-600 flex items-center gap-1 transition-all"
                                                    >
                                                        Buka Platform
                                                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between px-3 py-2 bg-background-light dark:bg-background-dark/50 rounded-xl border border-slate-50 dark:border-slate-800">
                                                <span className="text-xs font-bold text-slate-700 dark:text-white truncate pr-2">{acc.email || acc.username}</span>
                                                <button onClick={() => copyToClipboard(acc.email || acc.username)} className="text-slate-400 hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</p>
                                            <div className="flex items-center justify-between px-3 py-2 bg-background-light dark:bg-background-dark/50 rounded-xl border border-slate-50 dark:border-slate-800">
                                                <span className="text-xs font-bold text-slate-700 dark:text-white">
                                                    {isAdmin ? (showPassword[acc.account_id] ? acc.password : '••••••••') : '••••••••'}
                                                </span>
                                                {isAdmin && (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => togglePassword(acc.account_id)} className="text-slate-400 hover:text-primary transition-colors">
                                                            <span className="material-symbols-outlined text-sm">{showPassword[acc.account_id] ? 'visibility_off' : 'visibility'}</span>
                                                        </button>
                                                        <button onClick={() => copyToClipboard(acc.password)} className="text-slate-400 hover:text-primary transition-colors">
                                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {acc.notes && (
                                        <div className="pt-2">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{acc.notes}</p>
                                        </div>
                                    )}

                                    {acc.authorized_emails && (
                                        <div className="pt-3 border-t border-slate-50 dark:border-slate-800/50 mt-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">group</span>
                                                User Berhak:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {acc.authorized_emails.split(',').map(email => (
                                                    <span key={email} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[8px] font-bold rounded-md border border-slate-200 dark:border-slate-700">
                                                        {email}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Platform Logo Management Modal */}
            <Modal
                isOpen={isLogoModalOpen}
                onClose={() => setIsLogoModalOpen(false)}
                title="Manajemen Logo Platform"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(JSON.parse(systemSettings?.platform_icons || '{}')).map(([platform, url]) => (
                            <div key={platform} className="p-3 bg-background-light dark:bg-background-dark rounded-xl border border-slate-100 dark:border-slate-800 text-center relative group">
                                <div className="size-12 rounded-lg bg-white dark:bg-slate-800 mx-auto flex items-center justify-center overflow-hidden mb-2 border border-slate-100 dark:border-slate-700">
                                    <img src={url} className="w-full h-full object-contain p-1" />
                                </div>
                                <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase truncate px-1">{platform}</p>
                                <button
                                    onClick={() => {
                                        const icons = JSON.parse(systemSettings.platform_icons || '{}');
                                        delete icons[platform];
                                        updateSettingsMutation.mutate(icons);
                                    }}
                                    className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 z-20"
                                >
                                    <span className="material-symbols-outlined text-[12px] font-black">close</span>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Tambah Logo Baru</p>
                        <div className="flex flex-col gap-3">
                            <input
                                id="new-global-platform"
                                placeholder="Nama Platform (Misal: Netflix)"
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
                            />
                            <label className="cursor-pointer w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">upload</span>
                                {isUploading ? 'Uploading...' : 'Upload Logo Platform'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    disabled={isUploading}
                                    onChange={async (e) => {
                                        if (!platform) {
                                            showNotification('Masukkan nama platform dulu!', 'warning');
                                            return;
                                        }
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        const uploadData = new FormData();
                                        uploadData.append('logo', file);
                                        try {
                                            setIsUploading(true);
                                            const res = await axios.post('/api/upload', uploadData);
                                            const icons = JSON.parse(systemSettings.platform_icons || '{}');
                                            icons[platform] = res.data.url;
                                            updateSettingsMutation.mutate(icons);
                                            document.getElementById('new-global-platform').value = '';
                                        } catch (err) {
                                            showNotification('Gagal: ' + err.message, 'error');
                                        }
                                        finally { setIsUploading(false); }
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Manage Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={manageType === 'ADD' ? 'Tambah Akun Share' : 'Edit Akun'}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Left Side */}
                    <div className="space-y-7">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Platform</label>
                            <select
                                value={platformSelect}
                                onChange={(e) => {
                                    setPlatformSelect(e.target.value);
                                    if (e.target.value !== 'Platform Lainnya') {
                                        setFormData({ ...formData, platform: e.target.value });
                                    } else {
                                        setFormData({ ...formData, platform: '' });
                                    }
                                }}
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                            >
                                <option value="">Pilih Platform...</option>
                                <option>ChatGPT for Learning</option>
                                <option>Mayar</option>
                                <option>Adobe Creative Cloud</option>
                                <option>Canva Premium</option>
                                <option>Freepik</option>
                                <option>Frame.io</option>
                                <option>Youtube Premium</option>
                                {systemSettings?.platform_icons && Object.keys(JSON.parse(systemSettings.platform_icons)).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                                <option>Platform Lainnya</option>
                            </select>
                        </div>

                        {platformSelect === 'Platform Lainnya' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Nama Platform Kustom</label>
                                <input
                                    type="text"
                                    value={formData.platform}
                                    placeholder="Misal: Netflix"
                                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Opsi Login Platform</label>
                            <select
                                value={formData.login_method}
                                onChange={(e) => setFormData({ ...formData, login_method: e.target.value })}
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                            >
                                <option value="Langsung">Langsung (Email & Password)</option>
                                <option value="Gmail">Melalui Akun Gmail</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Platform Logo</label>
                            <div className="flex items-center gap-4 p-4 bg-background-light dark:bg-background-dark rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                <div className="size-16 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                    {formData.icon_url ? (
                                        <img src={formData.icon_url} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <span className="material-symbols-outlined text-2xl text-slate-300">image</span>
                                    )}
                                </div>
                                <div className="flex-1 w-full space-y-2">
                                    <div className="flex flex-col gap-2">
                                        <label className="cursor-pointer w-full text-center py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-primary transition-all flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-[14px]">{isUploading ? 'sync' : 'upload'}</span>
                                            {isUploading ? '...' : 'Upload'}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleIconUpload} disabled={isUploading} />
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Atau URL..."
                                            value={formData.icon_url}
                                            onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                                            className="w-full bg-transparent border-none text-[9px] font-bold outline-none text-slate-400 placeholder:text-slate-500 text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">URL Platform (Opsional)</label>
                            <input
                                type="text"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="space-y-7">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Username / Email</label>
                            <input
                                type="text"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                placeholder="email@example.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Password</label>
                            <input
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Catatan Keamanan (Opsional)</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white min-h-[60px]"
                                placeholder="Catatan khusus..."
                            />
                        </div>

                        {isAdmin && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Hak Akses User</label>
                                <div className="max-h-[120px] overflow-y-auto p-3 bg-background-light dark:bg-background-dark rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                                    {usersData?.filter(u => u.email).map(u => (
                                        <label key={u.user_id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-surface-dark rounded-xl cursor-pointer transition-colors group">
                                            <input
                                                type="checkbox"
                                                checked={formData.authorized_emails?.split(',').includes(u.email)}
                                                onChange={(e) => {
                                                    const current = formData.authorized_emails ? formData.authorized_emails.split(',').filter(x => x) : [];
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, authorized_emails: [...new Set([...current, u.email])].join(',') });
                                                    } else {
                                                        setFormData({ ...formData, authorized_emails: current.filter(email => email !== u.email).join(',') });
                                                    }
                                                }}
                                                className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-white group-hover:text-primary transition-colors">{u.display_name || 'Tanpa Nama'}</span>
                                                <span className="text-[9px] text-slate-400 font-medium">{u.email}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-8">
                    <button
                        onClick={() => manageMutation.mutate(formData)}
                        disabled={manageMutation.isPending || !formData.platform || !formData.email || !formData.password}
                        className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                        {manageMutation.isPending ? 'Menyimpan...' : (manageType === 'ADD' ? 'Tambah Akun' : 'Simpan Perubahan')}
                    </button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Konfirmasi Hapus"
            >
                <div className="space-y-4 p-2">
                    <div className="size-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-red-500 text-3xl">delete_forever</span>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Hapus Akun Platform?</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium px-4">
                            Tindakan ini akan menghapus akses akun <span className="font-black text-slate-800 dark:text-slate-200">{accountToDelete?.platform}</span> secara permanen dari sistem.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => deleteMutation.mutate(accountToDelete.account_id)}
                            disabled={deleteMutation.isPending}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {deleteMutation.isPending ? 'Menghapus...' : 'Hapus Sekarang'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div >
    );
};

export default SharedAccounts;
