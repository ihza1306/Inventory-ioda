import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            // Attempt to load user from localStorage for persistence
            const savedUser = localStorage.getItem('inventory_user');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }

            // Handle redirect result from Firebase Google Login
            try {
                const { getAuth, getRedirectResult } = await import('firebase/auth');
                const { initializeApp, getApps } = await import('firebase/app');

                const firebaseConfig = {
                    apiKey: "AIzaSyAOlNYGm0WtBaF_X6Ji-eER2_A9ziG3AtY",
                    authDomain: "posdc-febdf.firebaseapp.com",
                    projectId: "posdc-febdf",
                    storageBucket: "posdc-febdf.firebasestorage.app",
                    messagingSenderId: "770724794830",
                    appId: "1:770724794830:web:176ce7675c2c84fbc79b9f",
                    measurementId: "G-Y6CTRRV0JH"
                };

                if (getApps().length === 0) {
                    initializeApp(firebaseConfig);
                }

                const auth = getAuth();
                const result = await getRedirectResult(auth);

                if (result) {
                    const googleUser = result.user;
                    // Sync with real backend
                    const response = await api.post('/api/users', {
                        google_uid: googleUser.uid,
                        email: googleUser.email,
                        display_name: googleUser.displayName,
                        photo_url: googleUser.photoURL
                    });

                    const userData = response.data;
                    setUser(userData);
                    localStorage.setItem('inventory_user', JSON.stringify(userData));
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Error handling redirect result:', error);
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        const adminEmails = ['ihza@iodacademy.id', 'heldi@iodacademy.id', 'nabila@iodacademy.id'];
        if (adminEmails.includes(email.toLowerCase()) && password !== '12345670') {
            return { success: false, error: 'Password salah untuk akun admin.' };
        }

        try {
            const response = await api.post('/api/users', {
                email: email,
                google_uid: 'manual-' + Math.random().toString(36).substr(2, 9),
                display_name: email.split('@')[0],
                photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            });

            const userData = response.data;
            setUser(userData);
            localStorage.setItem('inventory_user', JSON.stringify(userData));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const loginWithGoogle = async () => {
        try {
            const { getAuth, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
            const { initializeApp, getApps } = await import('firebase/app');

            const firebaseConfig = {
                apiKey: "AIzaSyAOlNYGm0WtBaF_X6Ji-eER2_A9ziG3AtY",
                authDomain: "posdc-febdf.firebaseapp.com",
                projectId: "posdc-febdf",
                storageBucket: "posdc-febdf.firebasestorage.app",
                messagingSenderId: "770724794830",
                appId: "1:770724794830:web:176ce7675c2c84fbc79b9f",
                measurementId: "G-Y6CTRRV0JH"
            };

            if (getApps().length === 0) {
                initializeApp(firebaseConfig);
            }

            const auth = getAuth();
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            await signInWithRedirect(auth, provider);
            return { success: true };
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: error.message };
        }
    };

    const refreshUser = async () => {
        if (!user) return;
        try {
            const response = await api.get(`/api/users/${user.user_id}`);
            const updatedUser = response.data;
            setUser(updatedUser);
            localStorage.setItem('inventory_user', JSON.stringify(updatedUser));
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('inventory_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
