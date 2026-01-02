import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';

const Reports = () => {
    // Queries
    const { data: items } = useQuery({
        queryKey: ['inventory'],
        queryFn: async () => (await axios.get('/api/inventory')).data,
    });

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => (await axios.get('/api/transactions')).data,
    });

    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => (await axios.get('/api/system-settings')).data,
    });

    const company = systemSettings || {
        company_name: 'IODA ACADEMY',
        pt_name: 'PT. TALENTA EDUKASI SEKUMPUL',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=IA',
        pic_email: 'admin@ioda.id'
    };

    const today = new Date();
    const getRomanMonth = (m) => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][m];
    const reportNumber = `IODA/${String((items || []).length).padStart(3, '0')}/INV/${getRomanMonth(today.getMonth())}/${today.getFullYear()}`;

    const formalItems = (items || []).map(item => {
        const activeLoan = (transactions || []).find(t =>
            t.item_id === item.item_id && t.type === 'OUT' && t.is_returned === false && t.status === 'COMPLETED'
        );

        let displayCondition = 'BAGUS';
        if (item.condition && (item.condition.toLowerCase() === 'broken' || item.condition.toLowerCase() === 'rusak')) {
            displayCondition = 'RUSAK';
        }

        return {
            ...item,
            statusLine: activeLoan ? 'DIPINJAM' : 'DI STUDIO',
            pjName: activeLoan ? (activeLoan.user?.display_name || 'PEMINJAM') : 'ADMIN (GUDANG)',
            conditionLine: displayCondition
        };
    });

    return (
        <div className="flex-1 bg-slate-50 dark:bg-background-dark min-h-screen">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 10mm; 
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-scheme: light !important;
                    }

                    html, body {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    aside, header, nav, .no-print, button, [role="navigation"], .lg\\:ml-64 {
                        display: none !important;
                    }

                    main, .flex-1 {
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                        background: white !important;
                    }

                    .report-wrapper {
                        display: block !important;
                        width: 100% !important;
                        color: black !important;
                        background: white !important;
                        font-family: Arial, sans-serif !important;
                    }

                    .report-wrapper * {
                        color: black !important;
                        background-color: transparent !important;
                    }

                    .report-title {
                        text-align: center;
                        margin-bottom: 25px;
                    }
                    .report-title h1 { 
                        margin: 0; 
                        font-size: 18pt; 
                        font-weight: bold; 
                        text-decoration: underline; 
                        text-transform: uppercase;
                        color: black !important;
                    }
                    .report-title p { 
                        margin: 5px 0; 
                        font-size: 11pt; 
                        font-weight: bold; 
                        color: black !important;
                    }

                    .meta-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                        font-size: 10pt;
                        border-bottom: 2px solid black;
                        padding-bottom: 10px;
                        color: black !important;
                    }
                    .meta-box { width: 48%; }
                    .meta-row { display: flex; margin-bottom: 4px; }
                    .meta-label { width: 100px; font-weight: bold; }

                    .table-main { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .table-main th, .table-main td { border: 1px solid black !important; padding: 8px; font-size: 10pt; color: black !important; }
                    .table-main th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact; text-transform: uppercase; border: 1px solid black !important; }

                    .sig-section {
                        display: table;
                        width: 100%;
                        margin-top: 50px;
                    }
                    .sig-box {
                        display: table-cell;
                        width: 50%;
                        text-align: center;
                        font-size: 11pt;
                        color: black !important;
                    }
                    .sig-line {
                        margin: 70px auto 5px auto;
                        border-top: 1.5px solid black !important;
                        width: 200px;
                    }
                    .sig-name { font-weight: bold; text-transform: uppercase; color: black !important; }

                    /* Fix for SKU subtext in print */
                    .sku-text { color: #555 !important; font-size: 8pt !important; }
                }

                @media screen {
                    .report-wrapper { display: none; }
                }
            `}} />

            {/* SCREEN UI */}
            <div className="max-w-7xl mx-auto p-6 md:p-10 no-print space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase">Reports Analysis</h1>
                        <p className="text-slate-500 font-bold text-xs mt-1 italic tracking-widest">REAL-TIME INVENTORY TRACKING</p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-3 px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">print</span>
                        Cetak Laporan PDF
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Total Aset', value: items?.length || 0, color: 'text-blue-500', icon: 'inventory_2' },
                        { label: 'Di Studio', value: (items || []).filter(i => !(transactions || []).some(t => t.item_id === i.item_id && !t.is_returned)).length, color: 'text-emerald-500', icon: 'home' },
                        { label: 'Dipinjam', value: (items || []).filter(i => (transactions || []).some(t => t.item_id === i.item_id && !t.is_returned)).length, color: 'text-amber-500', icon: 'outbound' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-soft text-center group hover:border-primary transition-all relative overflow-hidden">
                            <div className="absolute -right-2 -bottom-2 opacity-5">
                                <span className="material-symbols-outlined text-8xl">{s.icon}</span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">{s.label}</p>
                            <p className={`text-4xl font-black ${s.color} relative z-10`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Restore analytics visual for screen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Tren Aktivitas</h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">7 Hari Terakhir</span>
                        </div>
                        <div className="h-48 flex items-end justify-between gap-2 px-2">
                            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                <div key={i} className="flex-1 group relative">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {Math.round(h / 10)} Item
                                    </div>
                                    <div
                                        style={{ height: `${h}%` }}
                                        className="w-full bg-primary/20 group-hover:bg-primary rounded-t-lg transition-all duration-500"
                                    />
                                    <div className="mt-3 text-[8px] font-black text-slate-400 text-center uppercase">
                                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i]}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Kapasitas Kategori</h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Top 4</span>
                        </div>
                        <div className="space-y-5">
                            {[
                                { name: 'Elektronik', p: 75, color: 'bg-blue-500' },
                                { name: 'Kamera', p: 45, color: 'bg-emerald-500' },
                                { name: 'Lensa', p: 30, color: 'bg-purple-500' },
                                { name: 'Aksesoris', p: 60, color: 'bg-amber-500' },
                            ].map((c, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-slate-600 dark:text-slate-400">{c.name}</span>
                                        <span className="text-slate-900 dark:text-white">{c.p}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div style={{ width: `${c.p}%` }} className={`h-full ${c.color} rounded-full transition-all duration-1000 shadow-lg`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-soft">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Status Terkini</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Aset</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">QTY</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {formalItems.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{item.sku}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-md ${item.statusLine === 'DI STUDIO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {item.statusLine}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white">{item.stock_qty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* THE PDF REPORT (HEADER REMOVED PER REQUEST) */}
            <div className="report-wrapper">
                <div className="report-title">
                    <h1>DATA STATUS INVENTARIS ASSET</h1>
                    <p>Nomor: {reportNumber}</p>
                </div>

                <div className="meta-info">
                    <div className="meta-box">
                        <div className="meta-row"><span className="meta-label">ID Perusahaan</span>: <span>{company.pt_name}</span></div>
                        <div className="meta-row"><span className="meta-label">Admin PIC</span>: <span>{company.pic_email}</span></div>
                    </div>
                    <div className="meta-box" style={{ textAlign: 'right' }}>
                        <div className="meta-row" style={{ justifyContent: 'flex-end' }}><span className="meta-label">Tgl Terbit</span>: <span>{today.toLocaleDateString('id-ID')}</span></div>
                        <div className="meta-row" style={{ justifyContent: 'flex-end' }}><span className="meta-label">Waktu</span>: <span>{today.toLocaleTimeString('id-ID')} WIB</span></div>
                    </div>
                </div>

                <table className="table-main">
                    <thead>
                        <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                            <th>Deskripsi Item / Aset</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>QTY</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Kondisi</th>
                            <th style={{ width: '180px', textAlign: 'center' }}>PJ Saat Ini</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formalItems.map((item, i) => (
                            <tr key={item.item_id || i}>
                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                <td>
                                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                    <div className="sku-text" style={{ fontSize: '8pt', color: '#666' }}>SKU: {item.sku}</div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.stock_qty}</td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.statusLine}</td>
                                <td style={{ textAlign: 'center' }}>{item.conditionLine}</td>
                                <td style={{ textAlign: 'center' }}>{item.pjName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="sig-section">
                    <div className="sig-box">
                        <p>Dibuat Oleh,</p>
                        <div className="sig-line"></div>
                        <p className="sig-name">Admin Inventaris</p>
                    </div>
                    <div className="sig-box">
                        <p>Disetujui Oleh,</p>
                        <div className="sig-line"></div>
                        <p className="sig-name">HR / CEO</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
