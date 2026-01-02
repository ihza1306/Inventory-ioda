import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SharedAccounts from './pages/SharedAccounts';
import Borrowers from './pages/Borrowers';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';

function AppContent() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark transition-colors duration-300">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (!user && location.pathname !== '/login') {
        return <Navigate to="/login" />;
    }

    if (user && location.pathname === '/login') {
        return <Navigate to="/" />;
    }

    if (location.pathname === '/login') {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
            </Routes>
        );
    }

    const getTitle = (path) => {
        switch (path) {
            case '/': return 'Dasbor';
            case '/inventory': return 'Daftar Aset';
            case '/transactions': return 'Pinjaman';
            case '/borrowers': return 'Peminjam';
            case '/shared-accounts': return 'Akun Terbagi';
            case '/reports': return 'Laporan & Analitik';
            case '/settings': return 'Pengaturan';
            default: return 'Aplikasi Inventaris';
        }
    };

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300 font-display pb-16 lg:pb-0 overflow-hidden">
            <Sidebar />
            <main className="lg:ml-64 flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Header title={getTitle(location.pathname)} />
                <motion.div
                    className="flex-1 overflow-y-auto custom-scrollbar relative"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
                >
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/transactions" element={<Transactions />} />
                        <Route path="/shared-accounts" element={<SharedAccounts />} />

                        {/* Admin Only Routes */}
                        {user?.role === 'admin' ? (
                            <>
                                <Route path="/borrowers" element={<Borrowers />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/settings" element={<Settings />} />
                            </>
                        ) : (
                            <>
                                <Route path="/borrowers" element={<Navigate to="/" />} />
                                <Route path="/reports" element={<Navigate to="/" />} />
                                <Route path="/settings" element={<Navigate to="/" />} />
                            </>
                        )}

                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </motion.div>
            </main>
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

export default App;
