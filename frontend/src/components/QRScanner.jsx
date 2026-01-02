import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, X, QrCode, AlertCircle, ShieldAlert } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScan, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const scannerRef = useRef(null);
    const scannerId = "qr-reader";

    const startScanner = async () => {
        setIsInitialLoading(true);
        setError(null);

        // Security check
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isSecure) {
            setError("Kamera hanya dapat diakses melalui koneksi aman (HTTPS) atau Localhost.");
            setIsInitialLoading(false);
            return;
        }

        if (scannerRef.current && scannerRef.current.isScanning) {
            try { await scannerRef.current.stop(); } catch (e) { }
        }

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        try {
            await html5QrCode.start(
                { facingMode: "environment" }, // Prioritaskan kamera belakang
                {
                    fps: 15,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    html5QrCode.stop().then(() => {
                        onScan(decodedText);
                    }).catch(err => {
                        console.error("Stop error:", err);
                        onScan(decodedText); // Tetap kembalikan hasil meski stop gagal
                    });
                },
                (errorMessage) => {
                    // Silently ignore repetitive errors during scan
                }
            );
            setIsScanning(true);
            setIsInitialLoading(false);
            setError(null);
        } catch (err) {
            console.error("Scanner Error:", err);
            // Fallback: Coba tanpa facingMode (mungkin hanya ada satu kamera)
            try {
                await html5QrCode.start(
                    { deviceId: { exact: undefined } },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (text) => { html5QrCode.stop().then(() => onScan(text)); },
                    () => { }
                );
                setIsScanning(true);
                setIsInitialLoading(false);
            } catch (fallbackErr) {
                setError("Gagal mengakses kamera. Pastikan Anda telah memberikan izin di browser.");
                setIsInitialLoading(false);
                setIsScanning(false);
            }
        }
    };

    useEffect(() => {
        // Beri sedikit jeda agar kontainer DOM benar-benar siap
        const timeout = setTimeout(startScanner, 500);
        return () => {
            clearTimeout(timeout);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Cleanup error:", err));
            }
        };
    }, []);

    return (
        <div className="space-y-6 flex flex-col items-center">
            <style>
                {`
                    #${scannerId} video {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        border-radius: 2rem;
                    }
                    #${scannerId} {
                        border: none !important;
                    }
                `}
            </style>
            <div className="relative w-full aspect-square max-w-[320px] bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-2xl">
                {/* Real Scanner Container */}
                <div id={scannerId} className="w-full h-full overflow-hidden"></div>

                {/* Overlays */}
                {isInitialLoading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
                        <p className="text-[10px] font-black text-white uppercase tracking-widest text-center px-4">Menginisialisasi Kamera...</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-20 p-6 text-center">
                        <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-xs font-bold text-white mb-6 leading-relaxed px-2">{error}</p>
                        <div className="flex flex-col gap-2 w-full">
                            <button
                                onClick={startScanner}
                                className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Coba Lagi
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                                Refresh Halaman
                            </button>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {isScanning && (
                        <>
                            {/* Animated Scanning Line */}
                            <motion.div
                                initial={{ top: '10%' }}
                                animate={{ top: ['15%', '85%', '15%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute left-[15%] right-[15%] h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                            />

                            {/* Corner Brackets */}
                            <div className="absolute top-12 left-12 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-xl z-20" />
                            <div className="absolute top-12 right-12 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-xl z-20" />
                            <div className="absolute bottom-12 left-12 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-xl z-20" />
                            <div className="absolute bottom-12 right-12 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-xl z-20" />

                            {/* Scanning Pulse Overlay */}
                            <div className="absolute inset-0 bg-primary/5 animate-pulse z-0" />
                        </>
                    )}
                </AnimatePresence>
            </div>

            <div className="text-center space-y-2">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Status: {isScanning ? 'Kamera Aktif' : 'Menunggu...'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Arahkan lensa ke Kode QR produk<br />untuk memproses pinjaman/kembali</p>
            </div>

            <div className="w-full pt-2">
                <button
                    onClick={onClose}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                    Batalkan Pemindaian
                </button>
            </div>
        </div>
    );
};

export default QRScanner;
