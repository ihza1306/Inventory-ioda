import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const LoadingSpinner = ({ size = 'default' }) => {
    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => (await axios.get('/api/system-settings')).data,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    const sizes = {
        small: { container: 'w-12 h-12', logo: 'w-8 h-8', border: 'border-2' },
        default: { container: 'w-20 h-20', logo: 'w-14 h-14', border: 'border-4' },
        large: { container: 'w-32 h-32', logo: 'w-24 h-24', border: 'border-[6px]' }
    };

    const currentSize = sizes[size] || sizes.default;

    return (
        <div className="relative flex items-center justify-center">
            {/* Outer rotating ring with gradient */}
            <motion.div
                className={`${currentSize.container} rounded-full ${currentSize.border} border-transparent bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 bg-clip-border`}
                style={{
                    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6) border-box',
                }}
                animate={{ rotate: 360 }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

            {/* Pulsing glow effect */}
            <motion.div
                className={`absolute ${currentSize.container} rounded-full bg-blue-500/20`}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.2, 0.5]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Logo container */}
            <motion.div
                className={`absolute ${currentSize.logo} rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-lg`}
                animate={{
                    scale: [1, 1.05, 1]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                {systemSettings?.login_logo ? (
                    <img
                        src={systemSettings.login_logo}
                        alt="Logo"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">IODA</span>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default LoadingSpinner;
