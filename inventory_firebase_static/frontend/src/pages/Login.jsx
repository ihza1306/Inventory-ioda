import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSound } from '../hooks/useSound';
import { useNotification } from '../components/NotificationProvider';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const { playClick, playSuccess } = useSound();
    const { showNotification } = useNotification();

    const { data: systemSettings, isLoading } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => (await api.get('/api/system-settings')).data
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        playClick();
        setIsSubmitting(true);
        const result = await login(email, password);
        if (result.success) {
            playSuccess();
            setIsLoggingIn(true);
            // Show zoom animation first
            setTimeout(() => {
                setShowLoadingScreen(true);
                // Show loading screen for 2-4 seconds (random) before navigating
                const loadingDuration = 2000 + Math.random() * 2000; // 2-4 seconds
                setTimeout(() => {
                    navigate('/');
                }, loadingDuration);
            }, 1500);
        } else {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        playClick();
        const result = await loginWithGoogle();
        if (result.success) {
            playSuccess();
            setIsLoggingIn(true);
            // Show zoom animation first
            setTimeout(() => {
                setShowLoadingScreen(true);
                // Show loading screen for 2-4 seconds (random) before navigating
                const loadingDuration = 2000 + Math.random() * 2000; // 2-4 seconds
                setTimeout(() => {
                    navigate('/');
                }, loadingDuration);
            }, 1500);
        } else if (result.error) {
            showNotification('Login gagal: ' + result.error, 'error');
        }
    };

    // Show 2-second loading screen after login
    if (showLoadingScreen) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                >
                    <LoadingSpinner size="large" />
                </motion.div>
            </div>
        );
    }

    // Show loading while settings are being fetched
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    return (
        <motion.div
            className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden"
            animate={isLoggingIn ? { scale: 1.5, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Background */}
            {systemSettings?.login_bg_video_url ? (
                <video
                    src={systemSettings.login_bg_video_url}
                    autoPlay loop muted
                    className="absolute inset-0 w-full h-full object-cover z-0"
                />
            ) : (
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed z-0 bg-slate-50 dark:bg-slate-950"></div>
            )}

            {/* Overlay for readability if video is used */}
            {systemSettings?.login_bg_video_url && <div className="absolute inset-0 bg-black/40 z-0"></div>}

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-white/10 z-10 relative"
            >
                <div className="p-10 flex flex-col items-center">
                    {/* Logo / Icon */}
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-8 relative border border-white/20 overflow-hidden">
                        {systemSettings?.login_logo ? (
                            <img src={systemSettings.login_logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl relative z-10">
                                <LogIn className="w-6 h-6" />
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl font-extrabold text-white mb-2 text-center">{systemSettings?.company_name || 'Inventory Sync'}</h1>
                    <p className="text-slate-200 text-sm text-center mb-10 leading-relaxed font-medium">
                        Welcome back. Please log in to manage <br /> your inventory anywhere.
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isSubmitting || isLoggingIn}
                        className="w-full flex items-center justify-center gap-3 py-4 border border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-bold text-white transition-all mb-8 backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-6 h-6 bg-white rounded-lg shadow-sm flex items-center justify-center">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        </div>
                        Continue with Google (Secure)
                    </button>

                    <div className="w-full flex items-center gap-4 mb-8">
                        <div className="flex-1 h-px bg-white/20"></div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">Or sign in with email</span>
                        <div className="flex-1 h-px bg-white/20"></div>
                    </div>

                    <form onSubmit={handleLogin} className="w-full space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    disabled={isSubmitting || isLoggingIn}
                                    className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:bg-black/30 transition-all outline-none text-white placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    disabled={isSubmitting || isLoggingIn}
                                    className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:bg-black/30 transition-all outline-none text-white placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || isLoggingIn}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed backdrop-blur-sm"
                        >
                            {isSubmitting ? 'Signing in...' : isLoggingIn ? 'Redirecting...' : 'Sign In'}
                        </button>
                    </form>

                    <button
                        className="mt-8 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                        disabled={isSubmitting || isLoggingIn}
                    >
                        Forgot password?
                    </button>
                </div>
            </motion.div>

            <div className="mt-10 flex flex-col items-center gap-4 text-center z-10">
                <p className="text-[10px] text-slate-400 max-w-[280px] leading-relaxed">
                    By continuing, you agree to our <span className="font-bold text-slate-300">Terms of Service</span> and <span className="font-bold text-slate-300">Privacy Policy</span>.
                </p>
            </div>
        </motion.div>
    );
};

export default Login;
