import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import Modal from '../components/Modal';

const Settings = () => {
    const { user: currentUser, loginWithGoogle, refreshUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const queryClient = useQueryClient();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('staff');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [invitePhone, setInvitePhone] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isWAModalOpen, setIsWAModalOpen] = useState(false);
    const [profileForm, setProfileForm] = useState({
        displayName: currentUser?.display_name || '',
        photoUrl: currentUser?.photo_url || '',
        phone: currentUser?.phone || '',
    });

    const roleAvatars = [
        { label: 'B2B', seed: 'B2B', id: 'b2b', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=B2B' },
        { label: 'B2C', seed: 'B2C', id: 'b2c', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=B2C' },
        { label: 'Learning', seed: 'Learning', id: 'learning', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Learning' },
        { label: 'Intern', seed: 'Intern', id: 'intern', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Intern' },
        { label: 'Admin', seed: 'Admin', id: 'admin', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin' },
        { label: 'Viewer', seed: 'Viewer', id: 'viewer', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Viewer' },
    ];

    // Fetch all users
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await axios.get('/api/users');
            return response.data;
        }
    });

    // Fetch System Settings
    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => {
            const response = await axios.get('/api/system-settings');
            return response.data;
        }
    });

    const [settingsForm, setSettingsForm] = useState({});

    useEffect(() => {
        if (systemSettings) {
            setSettingsForm(systemSettings);
        }
    }, [systemSettings]);

    const updateSettingsMutation = useMutation({
        mutationFn: async (newData) => {
            const response = await axios.put('/api/system-settings', newData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['system-settings']);
            alert('Pengaturan sistem berhasil diperbarui!');
        }
    });

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        try {
            setIsUploading(true);
            const response = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSettingsForm({ ...settingsForm, company_logo: response.data.url });
        } catch (error) {
            alert('Gagal mengunggah logo: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleProfilePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setIsUploading(true);
            const response = await axios.post('/api/upload-profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProfileForm({ ...profileForm, photoUrl: response.data.url });
        } catch (error) {
            alert('Gagal mengunggah foto profil: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }) => axios.put(`/api/users/${userId}/role`, { role }),
        onSuccess: () => queryClient.invalidateQueries(['users'])
    });

    const addUserMutation = useMutation({
        mutationFn: async (data) => axios.post('/api/users', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInvitePhone('');
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => axios.delete(`/api/users/${userId}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        },
        onError: (error) => {
            alert(`Gagal menghapus user: ${error.response?.data?.error || error.message}`);
        }
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (data) => axios.put(`/api/users/${currentUser.user_id}/profile`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            refreshUser();
            setIsProfileModalOpen(false);
            alert('Profil berhasil diperbaharui!');
        }
    });

    return (
        <div className="flex-1 p-6 lg:p-8 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-8 pb-20 lg:pb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pengaturan Sistem</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Lengkapi identitas perusahaan dan automasi pesan WhatsApp.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft text-center">
                            <img
                                src={currentUser?.photo_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                                className="size-20 rounded-full mx-auto border-4 border-white dark:border-slate-800 shadow-lg mb-4 object-cover"
                            />
                            <p className="text-lg font-black text-slate-900 dark:text-white truncate">{currentUser?.display_name}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-4">{currentUser?.role}</p>
                            <div className="space-y-2">
                                <p className="text-[9px] text-slate-400 italic mb-2">{currentUser?.email}</p>
                                <button
                                    onClick={() => {
                                        setProfileForm({
                                            displayName: currentUser.display_name,
                                            photoUrl: currentUser.photo_url || '',
                                            phone: currentUser.phone || ''
                                        });
                                        setIsProfileModalOpen(true);
                                    }}
                                    className="w-full py-2 bg-slate-50 dark:bg-background-dark rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all border border-transparent hover:border-primary/20"
                                >
                                    Ubah Akun
                                </button>
                                <button onClick={loginWithGoogle} className="w-full py-2 bg-slate-50/50 dark:bg-background-dark/50 rounded-xl text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-all">Ganti Akun Google</button>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Konfigurasi</h3>
                            <div className="space-y-3">
                                <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-background-dark rounded-xl group hover:ring-1 hover:ring-primary/20 transition-all">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mode Gelap</span>
                                    <div className={`w-10 h-6 rounded-full relative transition-all ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-5' : 'left-1'}`} />
                                    </div>
                                </button>
                                {currentUser?.role === 'admin' && (
                                    <button
                                        onClick={() => setIsWAModalOpen(true)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-background-dark rounded-xl group hover:ring-1 hover:ring-primary/20 transition-all text-xs font-bold text-slate-600 dark:text-slate-300"
                                    >
                                        <span>Edit Pesan WA Notifikasi</span>
                                        <span className="material-symbols-outlined text-lg opacity-50">chevron_right</span>
                                    </button>
                                )}
                            </div>
                        </section>

                        {/* Moved Access Manager to Left on Desktop, but optimized width */}
                        {currentUser?.role === 'admin' && (
                            <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden hidden lg:block">
                                <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Pengelola Akses</h3>
                                    <button onClick={() => setIsInviteModalOpen(true)} className="p-1 px-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-md text-[8px] font-black uppercase transition-all">Add</button>
                                </div>
                                <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {users?.map(u => (
                                        <div key={u.user_id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-background-dark/30 rounded-xl gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src={u.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`} className="size-6 rounded-full border border-white shrink-0" alt="avatar" />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <p className="text-[9px] font-black text-slate-900 dark:text-white truncate">{u.display_name || u.email.split('@')[0]}</p>
                                                        {u.phone && (
                                                            <a href={`https://wa.me/${u.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:scale-110 transition-transform flex items-center shrink-0">
                                                                <span className="material-symbols-outlined text-[12px] font-black">call</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-[7.5px] text-slate-500 font-medium truncate opacity-60">{u.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <select
                                                    value={u.role}
                                                    onChange={e => updateRoleMutation.mutate({ userId: u.user_id, role: e.target.value })}
                                                    className="bg-white dark:bg-slate-800 text-[8px] font-black uppercase p-0.5 rounded outline-none w-16"
                                                >
                                                    <option value="admin">Adm</option>
                                                    <option value="staff">Stf</option>
                                                    <option value="viewer">Vwr</option>
                                                    <option value="none">Susp</option>
                                                </select>
                                                <button onClick={() => { setUserToDelete(u); setIsDeleteModalOpen(true); }} className="text-red-300 hover:text-red-500 transition-colors shrink-0">
                                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Panel: Company Info & WA */}
                    <div className="lg:col-span-2 space-y-6">
                        {currentUser?.role === 'admin' && (
                            <>
                                <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden mb-6">
                                    <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Latar Belakang Login</h3>
                                        <button
                                            onClick={() => updateSettingsMutation.mutate(settingsForm)}
                                            disabled={updateSettingsMutation.isPending}
                                            className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-lg shadow-xl shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                            {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                    <div className="p-8">
                                        <div className="flex flex-col gap-4">
                                            <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                                                {settingsForm.login_bg_video_url ? (
                                                    <video
                                                        src={settingsForm.login_bg_video_url}
                                                        className="w-full h-full object-cover"
                                                        autoPlay loop muted
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <span className="material-symbols-outlined text-4xl">movie</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <label className="cursor-pointer px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold hover:scale-105 transition-transform">
                                                        Ganti Video
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="video/mp4,video/quicktime"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('video', file);
                                                                try {
                                                                    setIsUploading(true);
                                                                    const res = await axios.post('/api/upload-video', formData);
                                                                    const newData = { ...settingsForm, login_bg_video_url: res.data.url };
                                                                    setSettingsForm(newData);
                                                                    updateSettingsMutation.mutate(newData);
                                                                } catch (err) {
                                                                    alert('Gagal upload video: ' + err.message);
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    {settingsForm.login_bg_video_url && (
                                                        <button
                                                            onClick={() => {
                                                                const newData = { ...settingsForm, login_bg_video_url: null };
                                                                setSettingsForm(newData);
                                                                updateSettingsMutation.mutate(newData);
                                                            }}
                                                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                                                        >
                                                            Hapus
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 italic text-center">Format: MP4, MOV. Disarankan rasio 16:9, max 10MB.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden mb-6">
                                    <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Logo Login</h3>
                                        <button
                                            onClick={() => updateSettingsMutation.mutate(settingsForm)}
                                            disabled={updateSettingsMutation.isPending}
                                            className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-lg shadow-xl shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                            {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                    <div className="p-8">
                                        <div className="flex flex-col gap-4">
                                            <div className="aspect-square max-w-[200px] mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                                                {settingsForm.login_logo ? (
                                                    <img
                                                        src={settingsForm.login_logo}
                                                        alt="Login Logo"
                                                        className="w-full h-full object-contain p-4"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <span className="material-symbols-outlined text-4xl">image</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <label className="cursor-pointer px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold hover:scale-105 transition-transform">
                                                        Ganti Logo
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('logo', file);
                                                                try {
                                                                    setIsUploading(true);
                                                                    const res = await axios.post('/api/upload', formData);
                                                                    const newData = { ...settingsForm, login_logo: res.data.url };
                                                                    setSettingsForm(newData);
                                                                    updateSettingsMutation.mutate(newData);
                                                                } catch (err) {
                                                                    alert('Gagal upload logo: ' + err.message);
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    {settingsForm.login_logo && (
                                                        <button
                                                            onClick={() => {
                                                                const newData = { ...settingsForm, login_logo: null };
                                                                setSettingsForm(newData);
                                                                updateSettingsMutation.mutate(newData);
                                                            }}
                                                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                                                        >
                                                            Hapus
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 italic text-center">Logo untuk halaman login. Format: PNG, JPG, SVG. Disarankan rasio 1:1.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
                                    <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Informasi Perusahaan</h3>
                                        <button
                                            onClick={() => updateSettingsMutation.mutate(settingsForm)}
                                            disabled={updateSettingsMutation.isPending}
                                            className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-lg shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                        >
                                            Simpan Perubahan
                                        </button>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        {/* Logo Upload */}
                                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-background-dark/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                            <div className="size-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                {settingsForm.company_logo ? (
                                                    <img src={settingsForm.company_logo} className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-3xl text-slate-300">image</span>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2 text-center sm:text-left">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Perusahaan</p>
                                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                                    <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all">
                                                        {isUploading ? 'Mengunggah...' : 'Pilih Logo'}
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Atau masukkan URL gambar..."
                                                        value={settingsForm.company_logo || ''}
                                                        onChange={e => setSettingsForm({ ...settingsForm, company_logo: e.target.value })}
                                                        className="flex-1 min-w-[200px] bg-transparent border-none text-[10px] font-bold outline-none text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama Perusahaan (Brand)</label>
                                                <input
                                                    value={settingsForm.company_name || ''}
                                                    onChange={e => setSettingsForm({ ...settingsForm, company_name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/40 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama PT (Legal Entity)</label>
                                                <input
                                                    value={settingsForm.pt_name || ''}
                                                    onChange={e => setSettingsForm({ ...settingsForm, pt_name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/40 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">PIC Email</label>
                                                <input
                                                    value={settingsForm.pic_email || ''}
                                                    onChange={e => setSettingsForm({ ...settingsForm, pic_email: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/40 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp Perusahaan</label>
                                                <input
                                                    value={settingsForm.company_phone || ''}
                                                    onChange={e => setSettingsForm({ ...settingsForm, company_phone: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/40 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Alamat Kantor/Gudang</label>
                                                <textarea
                                                    value={settingsForm.company_address || ''}
                                                    onChange={e => setSettingsForm({ ...settingsForm, company_address: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/40 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white h-20 resize-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Format No. Surat</label>
                                                <input
                                                    value={settingsForm.report_number_format || ''}
                                                    onChange={e => setSettingsForm({ ...settingsForm, report_number_format: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/40 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* Mobile view of Access Manager */}
                        <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden lg:hidden">
                            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Pengelola Akses</h3>
                                <button onClick={() => setIsInviteModalOpen(true)} className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase transition-all">Tambah User</button>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {users?.map(u => (
                                    <div key={u.user_id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-background-dark/50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <img src={u.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`} className="size-8 rounded-full border border-white" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{u.display_name || u.email.split('@')[0]}</p>
                                                    {u.phone && (
                                                        <a href={`https://wa.me/${u.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full">
                                                            <span className="material-symbols-outlined text-[10px]">call</span>
                                                            <span className="text-[8px] font-bold">{u.phone}</span>
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-slate-500 font-medium truncate italic">{u.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={u.role}
                                                onChange={e => updateRoleMutation.mutate({ userId: u.user_id, role: e.target.value })}
                                                className="bg-white dark:bg-slate-800 text-[9px] font-black uppercase p-1 rounded outline-none"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="staff">Staff</option>
                                                <option value="viewer">Viewer</option>
                                                <option value="none">Suspended</option>
                                            </select>
                                            <button onClick={() => { setUserToDelete(u); setIsDeleteModalOpen(true); }} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Undang User">
                    <div className="p-4 space-y-4">
                        <input
                            type="email" placeholder="Email Google User"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark rounded-xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800"
                            value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                        />
                        <input
                            type="text" placeholder="Nomor WhatsApp (Contoh: 62812...)"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark rounded-xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800"
                            value={invitePhone} onChange={e => setInvitePhone(e.target.value)}
                        />
                        <button onClick={() => addUserMutation.mutate({ email: inviteEmail, phone: invitePhone, role: inviteRole, display_name: inviteEmail.split('@')[0] })} className="w-full py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-xl shadow-primary/30">Tambah Akses</button>
                    </div>
                </Modal>

                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Akses">
                    <div className="p-6 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 px-4 leading-relaxed">Konfirmasi hapus akses permanen untuk <span className="text-slate-900 dark:text-white font-black italic">{userToDelete?.display_name || userToDelete?.email}</span>?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase">Batal</button>
                            <button onClick={() => deleteUserMutation.mutate(userToDelete.user_id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20">Ya, Hapus</button>
                        </div>
                    </div>
                </Modal>

                {/* WA Template Modal */}
                < Modal isOpen={isWAModalOpen} onClose={() => setIsWAModalOpen(false)} title="Edit Pesan WA Notifikasi" >
                    <div className="p-6 space-y-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center italic">Berikan notifikasi yang jelas dengan bahasa yang ramah</p>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {[
                                { key: 'wa_confirm_borrow', label: 'Konfirmasi Pinjam' },
                                { key: 'wa_confirm_return', label: 'Konfirmasi Kembali' },
                                { key: 'wa_notify_damage', label: 'Laporan Kerusakan' },
                                { key: 'wa_notify_loss', label: 'Barang Kurang/Hilang' },
                                { key: 'wa_notify_overdue', label: 'Tagihan Telat Kembali' },
                                { key: 'wa_booking_approved', label: 'Reservasi Disetujui' },
                                { key: 'wa_booking_rejected', label: 'Reservasi Ditolak' },
                            ].map(wa => (
                                <div key={wa.key} className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{wa.label}</label>
                                    <textarea
                                        value={settingsForm[wa.key] || ''}
                                        onChange={e => setSettingsForm({ ...settingsForm, [wa.key]: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border border-slate-100 dark:border-slate-800 rounded-2xl text-[11px] font-medium outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none transition-all"
                                        placeholder="Gunakan {name} dan {item} untuk teks dinamis..."
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                updateSettingsMutation.mutate(settingsForm);
                                setIsWAModalOpen(false);
                            }}
                            className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Simpan Template Pesan
                        </button>
                    </div>
                </Modal >

                {/* Ubah Akun Modal */}
                < Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Ubah Akun" >
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                                <img src={profileForm.photoUrl} className="size-24 rounded-full border-4 border-slate-50 shadow-xl object-cover" />
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleProfilePhotoUpload} />
                                </label>
                            </div>
                            <button
                                onClick={() => setProfileForm({ ...profileForm, photoUrl: currentUser.photo_url })}
                                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                                Sinkronkan dengan Foto Google
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama Tampilan</label>
                                <input
                                    value={profileForm.displayName}
                                    onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/20"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nomor WhatsApp</label>
                                <input
                                    value={profileForm.phone}
                                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                    placeholder="Contoh: 628123456789"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-background-dark border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-primary/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Pilih Avatar Sesuai Role</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {roleAvatars.map(av => (
                                        <button
                                            key={av.id}
                                            onClick={() => setProfileForm({ ...profileForm, photoUrl: av.url })}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${profileForm.photoUrl === av.url ? 'border-primary bg-primary/5' : 'border-slate-50 dark:border-slate-800'}`}
                                        >
                                            <img src={av.url} className="size-10 rounded-full" />
                                            <span className="text-[8px] font-black uppercase tracking-tighter">{av.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Custom Photo URL</label>
                                <input
                                    value={profileForm.photoUrl}
                                    onChange={e => setProfileForm({ ...profileForm, photoUrl: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-background-dark border-none rounded-xl text-[10px] font-medium outline-none opacity-60"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Password Default (System)</label>
                                <input
                                    type="password" value="********" readOnly
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none cursor-not-allowed opacity-50"
                                />
                                <p className="text-[8px] text-slate-400 italic mt-1 ml-1">*Login utama tetap menggunakan Google Auth demi keamanan.</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Batal</button>
                            <button
                                onClick={() => updateProfileMutation.mutate({
                                    display_name: profileForm.displayName,
                                    photo_url: profileForm.photoUrl,
                                    phone: profileForm.phone
                                })}
                                className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-primary/30"
                            >
                                Simpan Profil
                            </button>
                        </div>
                    </div>
                </Modal >
            </div>
        </div>
    );
};

export default Settings;
