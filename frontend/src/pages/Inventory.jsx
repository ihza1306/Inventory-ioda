import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import Modal from '../components/Modal';
import QRScanner from '../components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';

const Inventory = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [manageType, setManageType] = useState('ADD'); // 'ADD' or 'EDIT'
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
    const [isLabelSettingsOpen, setIsLabelSettingsOpen] = useState(false);

    const [labelSettings, setLabelSettings] = useState({
        companyName: 'IODA ACADEMY',
        footerText: 'Dilarang Melepas Stiker Ini!!',
        primaryColor: '#7c3aed',
        secondaryColor: '#0f172a',
        accentColor: '#ffffff',
        layout: 'horizontal-dark',
        logoType: 'interests',
        logoUrl: null, // New field for uploaded logo
        showCategory: true,
        showSku: true
    });

    const [borrowQty, setBorrowQty] = useState(1);
    const [notes, setNotes] = useState('');
    const [sortBy, setSortBy] = useState({ column: 'name', direction: 'asc' });
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isConfirmCategoryDeleteOpen, setIsConfirmCategoryDeleteOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    // Form Stats for ADD/EDIT
    const [formData, setFormData] = useState({
        name: '', sku: '', category: 'Elektronik', stock_qty: 0, unit: 'Unit', condition: 'Good', location: 'Gudang Utama', image_url: ''
    });

    // Data Fetching
    const { data: items, isLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: async () => {
            const response = await api.get('/api/inventory');
            return response.data;
        },
        refetchInterval: 1000,
    });

    const { data: categories, isLoading: isCatsLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await api.get('/api/categories');
            return response.data;
        },
        refetchInterval: 5000,
    });

    // Initial effect to capture search from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const query = params.get('q');
        if (query && items) {
            setSearchTerm(query);
            // Try to find exact match by ID (preferred for QR) or SKU
            const exactItem = items.find(i =>
                i.item_id === query ||
                i.sku.toLowerCase() === query.toLowerCase()
            );
            if (exactItem) {
                setSelectedItem(exactItem);
                setIsBorrowModalOpen(true);
                // Clear query from URL without reloading to avoid re-triggering
                navigate('/inventory', { replace: true });
            }
        }
    }, [location.search, items]);

    // Mutations
    const borrowMutation = useMutation({
        mutationFn: async () => {
            const isRequest = !isAdmin;
            if (isRequest && selectedItem.stock_qty < borrowQty) {
                throw new Error('Stok tidak mencukupi untuk pengajuan ini');
            }
            return api.post('/api/transactions', {
                item_id: selectedItem.item_id,
                user_id: user.user_id,
                type: 'OUT',
                qty_change: -borrowQty,
                notes: notes,
                status: isAdmin ? 'COMPLETED' : 'PENDING'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory']);
            queryClient.invalidateQueries(['dashboard-stats']);
            setIsBorrowModalOpen(false);
            setSelectedItem(null);
            setBorrowQty(1);
            setNotes('');
        }
    });

    const manageMutation = useMutation({
        mutationFn: async (data) => {
            if (manageType === 'ADD') {
                return api.post('/api/inventory', { ...data, last_updated_by: user.user_id });
            } else {
                return api.put(`/api/inventory/${selectedItem.item_id}`, { ...data, last_updated_by: user.user_id });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory']);
            setIsManageModalOpen(false);
            setFormData({ name: '', sku: '', category: 'Elektronik', stock_qty: 0, unit: 'Unit', condition: 'Good', location: 'Gudang Utama', image_url: '' });
        }
    });

    const generateSKU = (name, category) => {
        if (!name) return '';
        const namePart = name.split(' ')[0].substring(0, 4).toUpperCase();
        const catPart = (category || 'GEN').substring(0, 3).toUpperCase();
        const typePart = name.split(' ').length > 1 ? name.split(' ').pop().substring(0, 3).toUpperCase() : 'XX';
        // Use a consistent number based on existing items + 1
        const numPart = String((items?.length || 0) + 1).padStart(3, '0');

        return `${namePart}${typePart}-${numPart}-${catPart}`;
    };

    useEffect(() => {
        if (manageType === 'ADD' && formData.name && !formData.sku_manually_edited) {
            const newSku = generateSKU(formData.name, formData.category);
            setFormData(prev => ({ ...prev, sku: newSku }));
        }
    }, [formData.name, formData.category, manageType]);

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return api.delete(`/api/inventory/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory']);
            setIsDetailsOpen(false);
            // Optional: Add toast success here
        },
        onError: (error) => {
            alert(`Gagal menghapus item: ${error.response?.data?.error || error.message}`);
        }
    });

    const addCategoryMutation = useMutation({
        mutationFn: async (name) => {
            return api.post('/api/categories', { name });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['categories']);
            setNewCategoryName('');
        },
        onError: (err) => alert('Gagal menambah kategori: ' + (err.response?.data?.error || err.message))
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id) => {
            return api.delete(`/api/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['categories']);
        },
        onError: (err) => alert('Gagal menghapus kategori: ' + (err.response?.data?.error || err.message))
    });

    const handleSort = (column) => {
        setSortBy(prev => ({
            column,
            direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getStatusStyles = (condition, stock) => {
        if (stock === 0) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-900/50';
        if (condition === 'Damaged') return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-900/50';
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-900/50';
    };

    function cn(...args) {
        return args.filter(Boolean).join(' ');
    }

    const filteredItems = items?.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const sortedItems = [...filteredItems].sort((a, b) => {
        const valA = a[sortBy.column];
        const valB = b[sortBy.column];
        if (valA < valB) return sortBy.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortBy.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const openAddModal = () => {
        setManageType('ADD');
        setFormData({ name: '', sku: '', category: 'Elektronik', stock_qty: 0, unit: 'Unit', condition: 'Good', location: 'Gudang Utama', image_url: '' });
        setIsManageModalOpen(true);
    };

    const openEditModal = (item) => {
        setSelectedItem(item);
        setManageType('EDIT');
        setFormData({
            name: item.name,
            sku: item.sku,
            category: item.category,
            stock_qty: item.stock_qty,
            unit: item.unit,
            condition: item.condition,
            location: item.location,
            image_url: item.image_url || ''
        });
        setIsManageModalOpen(true);
    };

    const DesktopView = (
        <div className="hidden md:block bg-white dark:bg-surface-dark rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4 cursor-pointer hover:text-primary" onClick={() => handleSort('name')}>Aset</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-primary" onClick={() => handleSort('sku')}>QR / SKU</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-primary" onClick={() => handleSort('category')}>Kategori</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-primary" onClick={() => handleSort('stock_qty')}>Stok</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-primary" onClick={() => handleSort('condition')}>Kondisi</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {isLoading ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Inventaris...</td></tr>
                        ) : sortedItems.map((item, idx) => (
                            <motion.tr
                                key={item.item_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() => {
                                    setSelectedItem(item);
                                    setIsDetailsOpen(true);
                                }}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform">
                                            <img
                                                src={item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.sku}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">ID: #{item.item_id.split('-')[0]}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-black text-primary dark:text-blue-400">{item.sku}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.category}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full", item.stock_qty > 10 ? 'bg-emerald-500' : 'bg-orange-500')}
                                                style={{ width: `${Math.min(100, (item.stock_qty / 50) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{item.stock_qty}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border",
                                        getStatusStyles(item.condition, item.stock_qty)
                                    )}>
                                        {item.stock_qty === 0 ? 'Habis' : item.condition === 'Good' ? 'Bagus' : 'Rusak'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                                                    className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItem(item);
                                                        setIsConfirmDeleteOpen(true);
                                                    }}
                                                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedItem(item);
                                                setIsBorrowModalOpen(true);
                                            }}
                                            disabled={item.stock_qty === 0}
                                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-95 shadow-sm shadow-primary/20"
                                        >
                                            {isAdmin ? 'Pinjam' : 'Ajukan'}
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const MobileView = (
        <div className="md:hidden space-y-4">
            {isLoading ? (
                <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Inventaris...</div>
            ) : sortedItems.map((item, idx) => (
                <motion.div
                    key={item.item_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => {
                        setSelectedItem(item);
                        setIsDetailsOpen(true);
                    }}
                    className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 space-y-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                            <img src={item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.sku}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase truncate">{item.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.category}</p>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-primary rounded-xl transition-all"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Hapus aset ini?')) deleteMutation.mutate(item.item_id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-xl transition-all"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.sku}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={cn(
                                    "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border",
                                    getStatusStyles(item.condition, item.stock_qty)
                                )}>
                                    {item.condition}
                                </span>
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">STOK: {item.stock_qty}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                            setIsBorrowModalOpen(true);
                        }}
                        disabled={item.stock_qty === 0}
                        className="w-full py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                        Pinjam Aset
                    </button>
                </motion.div>
            ))}
        </div>
    );

    const getContrastColor = (hexcolor) => {
        if (!hexcolor || hexcolor.length < 7) return '#ffffff';
        const r = parseInt(hexcolor.slice(1, 3), 16);
        const g = parseInt(hexcolor.slice(3, 5), 16);
        const b = parseInt(hexcolor.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    };

    // Label Renderer Component for different styles
    const renderLabel = (item, settings, isBulk = false) => {
        const { layout, companyName, footerText, primaryColor, logoType, logoUrl, showCategory, showSku } = settings;

        const footerTextColor = getContrastColor(primaryColor);
        const labelWidth = "380px";
        const commonClasses = isBulk ? "" : `w-full max-w-[${labelWidth}]`;

        const renderHeader = (isDarkTheme = true) => {
            if (logoUrl) {
                return (
                    <div style={{
                        height: '75px',
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '16px',
                        width: 'fit-content'
                    }}>
                        <img
                            src={logoUrl}
                            style={{
                                height: '100%',
                                maxWidth: '270px',
                                objectFit: 'contain',
                                // Force logo to pure white for dark theme contrast
                                filter: isDarkTheme ? 'brightness(0) invert(1)' : 'none'
                            }}
                            alt="Logo"
                        />
                    </div>
                );
            }
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                        backgroundColor: isDarkTheme ? primaryColor : '#f1f5f9',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span className="material-symbols-outlined" style={{
                            fontSize: '18px',
                            color: isDarkTheme ? getContrastColor(primaryColor) : primaryColor
                        }}>{logoType}</span>
                    </div>
                    <p style={{
                        fontSize: '11px',
                        fontWeight: '900',
                        color: isDarkTheme ? 'white' : '#1e293b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        margin: 0
                    }}>{companyName}</p>
                </div>
            );
        };

        if (layout === 'horizontal-dark') {
            return (
                <div id={isBulk ? `label-${item.item_id}` : "printable-label"} style={{
                    width: labelWidth,
                    backgroundColor: '#0f172a',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    <div style={{ display: 'flex', padding: '24px', gap: '24px' }}>
                        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '12px', flexShrink: 0 }}>
                            <QRCodeSVG value={item.item_id} size={100} level="H" />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {renderHeader(true)}
                            <h4 style={{
                                fontSize: '20px',
                                fontWeight: '900',
                                color: 'white',
                                textTransform: 'uppercase',
                                lineHeight: '1.2',
                                margin: '0 0 8px 0',
                                letterSpacing: '-0.02em',
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>{item.name}</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {showCategory && <p style={{ fontSize: '10px', fontWeight: '800', color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{item.category}</p>}
                                {showSku && <p style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>SKU: {item.sku}</p>}
                            </div>
                        </div>
                    </div>
                    <div style={{ backgroundColor: primaryColor, padding: '12px 0', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: footerTextColor, textTransform: 'uppercase', letterSpacing: '0.25em', margin: 0 }}>{footerText}</p>
                    </div>
                </div>
            );
        }

        if (layout === 'horizontal-blue') {
            return (
                <div id={isBulk ? `label-${item.item_id}` : "printable-label"} style={{
                    width: labelWidth,
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    borderLeft: '8px solid #38bdf8',
                    display: 'flex',
                    flexDirection: 'row',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            {renderHeader(true)}
                            <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'white', textTransform: 'uppercase', margin: '6px 0', letterSpacing: '-0.01em' }}>{item.name}</h4>
                            {showCategory && <p style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>{item.category}</p>}
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px', marginTop: '12px' }}>
                            {showSku && <p style={{ fontSize: '13px', fontFamily: "'Roboto Mono', monospace", color: 'white', fontWeight: '900', margin: 0 }}>{item.sku}</p>}
                            <p style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', marginTop: '4px', margin: 0 }}>{footerText}</p>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <QRCodeSVG value={item.item_id} size={90} level="M" />
                    </div>
                </div>
            );
        }

        if (layout === 'vertical-minimal') {
            return (
                <div id={isBulk ? `label-${item.item_id}` : "printable-label"} style={{
                    width: '320px',
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                        {renderHeader(false)}
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '32px', marginBottom: '20px' }}>
                        <QRCodeSVG value={item.item_id} size={140} level="H" />
                    </div>
                    <h4 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{item.name}</h4>
                    {showSku && <p style={{ fontSize: '12px', fontWeight: '900', color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{item.sku}</p>}
                    <div style={{ width: '40px', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', margin: '16px 0' }}></div>
                    <p style={{ fontSize: '8px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>{footerText}</p>
                </div>
            );
        }

        if (layout === 'vertical-gold') {
            return (
                <div id={isBulk ? `label-${item.item_id}` : "printable-label"} style={{
                    width: '320px',
                    backgroundColor: '#1a1a1a',
                    border: '4px solid #d4af37',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    fontFamily: "'Inter', sans-serif",
                    color: '#d4af37'
                }}>
                    <div style={{ marginBottom: '24px', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {logoUrl ? (
                            <div style={{
                                height: '75px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img
                                    src={logoUrl}
                                    style={{
                                        height: '100%',
                                        maxWidth: '240px',
                                        objectFit: 'contain',
                                        filter: 'brightness(0) invert(1)'
                                    }}
                                    alt="Logo"
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#d4af37' }}>{logoType}</span>
                                <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{companyName}</p>
                            </div>
                        )}
                    </div>

                    <div style={{ backgroundColor: '#d4af37', padding: '10px', borderRadius: '2px', marginBottom: '24px' }}>
                        <QRCodeSVG value={item.item_id} size={130} level="H" fgColor="#1a1a1a" />
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ height: '1px', backgroundColor: 'rgba(212, 175, 55, 0.4)' }}></div>
                        <h4 style={{
                            fontSize: '20px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            margin: 0,
                            padding: '8px 0'
                        }}>{item.name}</h4>
                        <div style={{ height: '1px', backgroundColor: 'rgba(212, 175, 55, 0.4)' }}></div>
                    </div>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        {showSku && <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.2em', margin: 0, opacity: 0.8 }}>{item.sku}</p>}
                    </div>
                    <div style={{ marginTop: '30px', paddingTop: '12px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', width: '100%', textAlign: 'center' }}>
                        <p style={{ fontSize: '8px', fontStyle: 'italic', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{footerText}</p>
                    </div>
                </div>
            );
        }

        if (layout === 'horizontal-tech') {
            return (
                <div id={isBulk ? `label-${item.item_id}` : "printable-label"} style={{
                    width: labelWidth,
                    backgroundColor: '#0a0a0a',
                    borderRadius: '8px',
                    padding: '24px',
                    borderLeft: `5px solid ${primaryColor}`,
                    display: 'flex',
                    flexDirection: 'row',
                    fontFamily: "'Roboto Mono', monospace",
                    position: 'relative'
                }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            {renderHeader(true)}
                            <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'white', textTransform: 'uppercase', margin: 0 }}>{item.name}</h4>
                            {showCategory && <p style={{ fontSize: '10px', color: primaryColor, fontWeight: '700', marginTop: '4px', margin: 0 }}>[{item.category}]</p>}
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            {showSku && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', color: '#666' }}>SYS_ID:</span>
                                    <span style={{ fontSize: '14px', color: 'white', fontWeight: '900' }}>{item.sku}</span>
                                </div>
                            )}
                            <p style={{ fontSize: '8px', color: primaryColor, fontWeight: '900', textTransform: 'uppercase', marginTop: '8px', margin: 0, letterSpacing: '0.1em' }}>{footerText}</p>
                        </div>
                    </div>
                    <div style={{ marginLeft: '24px' }}>
                        <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', border: `2px solid ${primaryColor}66` }}>
                            <QRCodeSVG value={item.item_id} size={90} level="M" />
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark transition-colors duration-300">
            <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
                {/* Header & Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Daftar Aset</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">Manajemen fisik inventaris Ioda Academy.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setIsQRModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg text-primary">qr_code_scanner</span>
                            Pindai
                        </button>
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setIsLabelSettingsOpen(true)}
                                    className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-lg text-primary">architecture</span>
                                    Desain
                                </button>
                                <button
                                    onClick={() => setIsBulkPrintOpen(true)}
                                    className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-lg text-primary">print</span>
                                    Masal
                                </button>
                                <button
                                    onClick={openAddModal}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-black hover:bg-blue-600 shadow-lg shadow-primary/30 active:scale-95 transition-all uppercase tracking-widest"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    <span>Tambah</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-surface-dark p-3 sm:p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input
                            type="text"
                            placeholder="Cari aset..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold transition-all focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                        />
                    </div>

                    <button onClick={() => handleSort('name')} className="p-2.5 sm:p-3 bg-background-light dark:bg-background-dark rounded-xl text-slate-500 dark:text-slate-400 transition-colors hover:text-primary">
                        <span className="material-symbols-outlined text-lg">sort_by_alpha</span>
                    </button>
                </div>

                {/* Content Views */}
                {DesktopView}
                {MobileView}
            </div>

            {/* Manage Modal (ADD/EDIT) */}
            <Modal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                title={manageType === 'ADD' ? 'Tambah Aset Baru' : 'Edit Aset'}
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Nama Aset</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                placeholder="Misal: MacBook Pro M2"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">SKU / Kode QR</label>
                            <div className="relative group/sku">
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value, sku_manually_edited: true })}
                                    className="w-full px-4 py-2.5 pr-10 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                    placeholder="AUTOGENERATED"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newSku = generateSKU(formData.name, formData.category);
                                        setFormData({ ...formData, sku: newSku, sku_manually_edited: false });
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    title="Generate SKU Otomatis"
                                >
                                    <span className="material-symbols-outlined text-lg">magic_button</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Kategori</label>
                                {isAdmin && (
                                    <button
                                        onClick={() => setIsCategoryModalOpen(true)}
                                        className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest"
                                    >
                                        Kelola
                                    </button>
                                )}
                            </div>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white appearance-none"
                            >
                                <option value="">Pilih Kategori</option>
                                {categories?.map(cat => (
                                    <option key={cat.category_id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Lokasi</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                placeholder="Gudang A"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Stok</label>
                            <input
                                type="number"
                                value={formData.stock_qty}
                                onChange={(e) => setFormData({ ...formData, stock_qty: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Satuan</label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                placeholder="Pcs/Unit"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Kondisi</label>
                            <select
                                value={formData.condition}
                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white appearance-none"
                            >
                                <option value="Good">Bagus</option>
                                <option value="Damaged">Rusak</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">URL Gambar (Opsional)</label>
                        <div className="flex gap-4 items-start">
                            <input
                                type="text"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                className="flex-1 px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                placeholder="https://..."
                            />
                            {formData.image_url && (
                                <div className="size-10 rounded-lg bg-background-light dark:bg-background-dark overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                    <img
                                        src={formData.image_url}
                                        onError={(e) => {
                                            e.target.src = 'https://placehold.co/100x100?text=Invalid';
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={() => {
                                // Basic validation for Image URL if provided
                                if (formData.image_url) {
                                    const img = new Image();
                                    img.onload = () => manageMutation.mutate(formData);
                                    img.onerror = () => alert('URL Gambar tidak valid atau tidak dapat dibuka. Silakan masukkan URL gambar yang benar.');
                                    img.src = formData.image_url;
                                } else {
                                    manageMutation.mutate(formData);
                                }
                            }}
                            disabled={manageMutation.isPending || !formData.name || !formData.sku}
                            className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {manageMutation.isPending ? 'Menyimpan...' : (manageType === 'ADD' ? 'Tambah Aset' : 'Simpan Perubahan')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Borrow Modal */}
            <Modal
                isOpen={isBorrowModalOpen}
                onClose={() => setIsBorrowModalOpen(false)}
                title={`Pinjam: ${selectedItem?.name}`}
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-background-light dark:bg-background-dark rounded-2xl border border-slate-100 dark:border-slate-800">
                        <img
                            src={selectedItem?.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedItem?.sku}`}
                            className="w-20 h-20 rounded-xl object-cover border border-white dark:border-slate-700 shadow-lg"
                        />
                        <div>
                            <p className="font-black text-slate-900 dark:text-white text-lg">{selectedItem?.name}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tersedia: <span className="text-primary">{selectedItem?.stock_qty} {selectedItem?.unit}</span></p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah</label>
                        <input
                            type="number"
                            min="1" max={selectedItem?.stock_qty}
                            value={borrowQty}
                            onChange={(e) => setBorrowQty(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Keperluan proyek..."
                            className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px] text-slate-900 dark:text-white"
                        ></textarea>
                    </div>

                    <button
                        onClick={() => borrowMutation.mutate()}
                        disabled={borrowMutation.isPending || borrowQty < 1 || borrowQty > (selectedItem?.stock_qty || 0)}
                        className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        {borrowMutation.isPending ? 'Proses...' : 'Konfirmasi Peminjaman'}
                    </button>
                </div>
            </Modal>

            {/* Details Sidebar */}
            <AnimatePresence>
                {isDetailsOpen && (
                    <div className="fixed inset-0 z-[110] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsDetailsOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-md bg-white dark:bg-surface-dark h-full shadow-2xl overflow-y-auto custom-scrollbar flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-surface-dark z-10 transition-colors">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Detail Produk</h3>
                                <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="aspect-square w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 relative group">
                                    <img
                                        src={selectedItem?.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedItem?.sku}`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md rounded-full shadow-lg">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedItem?.sku}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{selectedItem?.name}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{selectedItem?.category}</span>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                            getStatusStyles(selectedItem?.condition, selectedItem?.stock_qty)
                                        )}>
                                            {selectedItem?.stock_qty === 0 ? 'Habis' : selectedItem?.condition}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-background-light dark:bg-background-dark rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stok Saat Ini</p>
                                        <p className="text-3xl font-black text-primary">{selectedItem?.stock_qty}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedItem?.unit}</p>
                                    </div>
                                    <div className="p-5 bg-background-light dark:bg-background-dark rounded-2xl border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <div className="flex items-center justify-center gap-1.5 mt-2">
                                            <div className="size-2 bg-emerald-500 rounded-full"></div>
                                            <p className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Normal</p>
                                        </div>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => openEditModal(selectedItem)}
                                            className="flex-1 py-4 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:bg-slate-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setIsConfirmDeleteOpen(true)}
                                            disabled={deleteMutation.isPending}
                                            className="flex-1 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
                                        </button>
                                    </div>
                                )}

                                {isAdmin && (
                                    <button
                                        onClick={() => setIsLabelModalOpen(true)}
                                        className="w-full py-3 bg-white dark:bg-surface-dark border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 mt-[-10px]"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">print</span>
                                        Cetak Label QR
                                    </button>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={() => {
                                            setIsDetailsOpen(false);
                                            setIsBorrowModalOpen(true);
                                        }}
                                        disabled={selectedItem?.stock_qty === 0}
                                        className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-[0.98] disabled:opacity-50 transition-all"
                                    >
                                        {isAdmin ? 'Pinjam Aset Ini' : 'Ajukan Peminjaman'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Category Management Modal */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="Kelola Kategori"
            >
                <div className="space-y-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nama kategori baru..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-background-light dark:bg-background-dark border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                        />
                        <button
                            onClick={() => addCategoryMutation.mutate(newCategoryName)}
                            disabled={!newCategoryName || addCategoryMutation.isPending}
                            className="px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-50"
                        >
                            Tambah
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daftar Kategori</label>
                        {isCatsLoading ? (
                            <p className="text-center py-4 text-xs text-slate-400 font-bold uppercase tracking-widest">Memuat...</p>
                        ) : categories?.length === 0 ? (
                            <p className="text-center py-4 text-xs text-slate-400 font-bold uppercase tracking-widest">Belum ada kategori</p>
                        ) : (
                            <div className="grid gap-2">
                                {categories?.map(cat => (
                                    <div key={cat.category_id} className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-xl border border-slate-50 dark:border-slate-800 group">
                                        <span className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-tight">{cat.name}</span>
                                        <button
                                            onClick={() => {
                                                setCategoryToDelete(cat);
                                                setIsConfirmCategoryDeleteOpen(true);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => setIsCategoryModalOpen(false)}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Selesai
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Asset Confirmation Modal */}
            <Modal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                title="Hapus Aset"
            >
                <div className="space-y-6 text-center">
                    <div className="size-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-red-500 text-4xl">warning</span>
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Hapus Aset Ini?</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium px-4 leading-relaxed">
                            Anda akan menghapus <span className="font-black text-slate-800 dark:text-slate-200">{selectedItem?.name}</span>. Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsConfirmDeleteOpen(false)}
                            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => {
                                deleteMutation.mutate(selectedItem?.item_id);
                                setIsConfirmDeleteOpen(false);
                            }}
                            className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
                        >
                            Hapus Sekarang
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Category Confirmation Modal */}
            <Modal
                isOpen={isConfirmCategoryDeleteOpen}
                onClose={() => setIsConfirmCategoryDeleteOpen(false)}
                title="Hapus Kategori"
            >
                <div className="space-y-6 text-center">
                    <div className="size-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-red-500 text-4xl">category</span>
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Hapus Kategori Ini?</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium px-4 leading-relaxed">
                            Menghapus kategori <span className="font-black text-slate-800 dark:text-slate-200">{categoryToDelete?.name}</span> dapat mempengaruhi data aset yang terkait.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsConfirmCategoryDeleteOpen(false)}
                            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => {
                                deleteCategoryMutation.mutate(categoryToDelete?.category_id);
                                setIsConfirmCategoryDeleteOpen(false);
                            }}
                            className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
                        >
                            Hapus Kategori
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} title="Pindai QR Code Asset">
                <QRScanner
                    onScan={(sku) => {
                        setIsQRModalOpen(false);
                        setSearchTerm(sku);
                        // If exact match exists, open borrow modal automatically
                        const exactItem = items?.find(i => i.sku.toLowerCase() === sku.toLowerCase());
                        if (exactItem) {
                            setSelectedItem(exactItem);
                            setIsBorrowModalOpen(true);
                        }
                    }}
                    onClose={() => setIsQRModalOpen(false)}
                />
            </Modal>

            {/* Label Print Modal */}
            <Modal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                title="Cetak Label Aset"
            >
                <div className="space-y-8 flex flex-col items-center">
                    {selectedItem && renderLabel(selectedItem, labelSettings)}

                    <div className="w-full space-y-3 px-2">
                        <button
                            onClick={() => {
                                const printContent = document.getElementById('printable-label');
                                const win = window.open('', '', 'width=600,height=500');
                                win.document.write('<html><head><title>Print Label</title>');
                                win.document.write(`<style>
                                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');
                                    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                                    body{margin:0; padding:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:white; font-family:'Inter', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;}
                                    #printable-label{width: 380px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-shadow: none !important;}
                                    .material-symbols-outlined { font-size: 16px; font-weight: normal; font-style: normal; line-height: 1; letter-spacing: normal; text-transform: none; display: inline-block; white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-smoothing: antialiased; }
                                    div, p, h4, span, img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                                    @media print{ 
                                        body{height:auto; padding: 0; margin: 0;} 
                                        #printable-label{margin: 0 !important; transform: scale(1) !important;}
                                        .no-print{display:none;} 
                                    }
                                </style>`);
                                win.document.write('</head><body>');
                                win.document.write(printContent.outerHTML);
                                win.document.write('<script>setTimeout(() => { window.print(); window.close(); }, 500);</script>');
                                win.document.write('</body></html>');
                                win.document.close();
                            }}
                            className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                        >
                            <span className="material-symbols-outlined">print</span>
                            Cetak Sekarang
                        </button>
                        <button
                            onClick={() => setIsLabelModalOpen(false)}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Print Modal */}
            <Modal
                isOpen={isBulkPrintOpen}
                onClose={() => setIsBulkPrintOpen(false)}
                title="Cetak Semua Label Aset"
            >
                <div className="space-y-6">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Fitur ini akan mencetak label untuk seluruh <span className="font-black text-slate-900 dark:text-white">{items?.length}</span> aset dengan desain aktif.
                    </p>

                    <div id="bulk-printable-labels" className="hidden">
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: labelSettings.layout.includes('vertical') ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                            gap: '15px',
                            padding: '15px',
                            backgroundColor: 'white'
                        }}>
                            {items?.map(item => (
                                <div key={item.item_id}>
                                    {renderLabel(item, labelSettings, true)}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <button
                            onClick={() => {
                                const content = document.getElementById('bulk-printable-labels').innerHTML;
                                const win = window.open('', '', 'width=900,height=800');
                                win.document.write('<html><head><title>Print All Labels</title>');
                                win.document.write(`<style>
                                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');
                                    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                                    body{margin:0;font-family:'Inter', sans-serif;background:white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;} 
                                    div, p, h4, span, img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                                    @media print{ 
                                        body{padding:0; margin:0;} 
                                        div{-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;} 
                                        img{-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;} 
                                    }
                                </style>`);
                                win.document.write('</head><body>');
                                win.document.write(content);
                                win.document.write('<script>setTimeout(() => { window.print(); window.close(); }, 800);</script>');
                                win.document.write('</body></html>');
                                win.document.close();
                            }}
                            className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            Cetak {items?.length} Label
                        </button>
                        <button
                            onClick={() => setIsBulkPrintOpen(false)}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Label Settings Modal */}
            <Modal
                isOpen={isLabelSettingsOpen}
                onClose={() => setIsLabelSettingsOpen(false)}
                title="Kustomisasi Label QR"
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Template Desain</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'horizontal-dark', name: 'Elegant Dark', icon: 'rectangle' },
                                { id: 'horizontal-blue', name: 'Pro Blue', icon: 'view_quilt' },
                                { id: 'vertical-minimal', name: 'Minimalist', icon: 'view_agenda' },
                                { id: 'vertical-gold', name: 'Royal Gold', icon: 'workspace_premium' },
                                { id: 'horizontal-tech', name: 'Tech / Mono', icon: 'terminal' }
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setLabelSettings({ ...labelSettings, layout: preset.id })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${labelSettings.layout === preset.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-2xl ${labelSettings.layout === preset.id ? 'text-primary' : 'text-slate-400'}`}>{preset.icon}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${labelSettings.layout === preset.id ? 'text-primary' : 'text-slate-500'}`}>{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Konten</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nama Perusahaan</label>
                                <input
                                    type="text"
                                    value={labelSettings.companyName}
                                    onChange={(e) => setLabelSettings({ ...labelSettings, companyName: e.target.value })}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Teks Footer (Warning)</label>
                                <input
                                    type="text"
                                    value={labelSettings.footerText}
                                    onChange={(e) => setLabelSettings({ ...labelSettings, footerText: e.target.value })}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo & Warna</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Upload Logo Perusahaan</label>
                                <div className="flex flex-col gap-3">
                                    {labelSettings.logoUrl && (
                                        <div className="relative size-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                                            <img src={labelSettings.logoUrl} className="size-full object-contain p-2" alt="Logo preview" />
                                            <button
                                                onClick={() => setLabelSettings({ ...labelSettings, logoUrl: null })}
                                                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setLabelSettings({ ...labelSettings, logoUrl: reader.result });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="text-[10px] block w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Warna Utama</label>
                                    <div className="flex gap-2 items-center mt-1">
                                        <input
                                            type="color"
                                            value={labelSettings.primaryColor}
                                            onChange={(e) => setLabelSettings({ ...labelSettings, primaryColor: e.target.value })}
                                            className="size-10 rounded-lg overflow-hidden border-none cursor-pointer"
                                        />
                                        <span className="text-xs font-mono uppercase font-black">{labelSettings.primaryColor}</span>
                                    </div>
                                </div>
                                {!labelSettings.logoUrl && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Icon Alternatif (Material)</label>
                                        <input
                                            type="text"
                                            value={labelSettings.logoType}
                                            onChange={(e) => setLabelSettings({ ...labelSettings, logoType: e.target.value })}
                                            placeholder="e.g. interests, token"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-mono border-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setIsLabelSettingsOpen(false)}
                            className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            Simpan Desain
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Inventory;
