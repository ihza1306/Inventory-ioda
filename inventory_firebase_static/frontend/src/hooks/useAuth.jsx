import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Attempt to load user from localStorage for persistence
        const savedUser = localStorage.getItem('inventory_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Enforce password for specific admin accounts
        const adminEmails = ['ihza@iodacademy.id', 'heldi@iodacademy.id'];
        if (adminEmails.includes(email.toLowerCase()) && password !== '12345670') {
            return { success: false, error: 'Password salah untuk akun admin.' };
        }

        // For now, let's simulate a successful login or use our backend
        // Since we don't have a real password system yet, we'll auto-login or upsert via API
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
            // Try to use Firebase Google Auth
            const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
            const { initializeApp, getApps } = await import('firebase/app');

            // Legitimate Firebase configuration provided by user
            const firebaseConfig = {
                apiKey: "AIzaSyAOlNYGm0WtBaF_X6Ji-eER2_A9ziG3AtY",
                authDomain: "posdc-febdf.firebaseapp.com",
                projectId: "posdc-febdf",
                storageBucket: "posdc-febdf.firebasestorage.app",
                messagingSenderId: "770724794830",
                appId: "1:770724794830:web:176ce7675c2c84fbc79b9f",
                measurementId: "G-Y6CTRRV0JH"
            };

            // Initialize Firebase if not already initialized
            if (getApps().length === 0) {
                initializeApp(firebaseConfig);
            }

            const auth = getAuth();
            const provider = new GoogleAuthProvider();
            // Force account selection prompt
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await signInWithPopup(auth, provider);
            const googleUser = result.user;

            // Sync with backend (mock API in static version)
            const response = await api.post('/api/users', {
                google_uid: googleUser.uid,
                email: googleUser.email,
                display_name: googleUser.displayName,
                photo_url: googleUser.photoURL
            });

            const userData = response.data;
            setUser(userData);
            localStorage.setItem('inventory_user', JSON.stringify(userData));
            return { success: true };
        } catch (error) {
            console.error('Google login error:', error);
            // Return actual error instead of silent fallback to Guest
            return { success: false, error: error.message };
        }
    };

    const fallbackGoogleLogin = async () => {
        // For the static version, we'll use a fixed demo email to avoid 'prompt' blocking
        // or we can allow the user to just click and enter.
        const demoEmail = 'guest@ioda.academy';

        try {
            const response = await api.post('/api/users', {
                google_uid: 'demo-' + Math.random().toString(36).substr(2, 9),
                email: demoEmail,
                display_name: 'Guest User',
                photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${demoEmail}`
            });

            const userData = response.data;
            setUser(userData);
            localStorage.setItem('inventory_user', JSON.stringify(userData));
            return { success: true };
        } catch (error) {
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
