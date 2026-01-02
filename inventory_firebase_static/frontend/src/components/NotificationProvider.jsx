import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useSound } from '../hooks/useSound';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const { playSuccess, playNotification } = useSound();

    const showNotification = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();

        // Play sound based on type
        if (type === 'success') {
            playSuccess();
        } else {
            playNotification();
        }

        setNotifications(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, duration);
    }, [playSuccess, playNotification]);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        </NotificationContext.Provider>
    );
};

const NotificationContainer = ({ notifications, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                    <Notification
                        key={notification.id}
                        notification={notification}
                        onRemove={onRemove}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

const Notification = ({ notification, onRemove }) => {
    const { id, message, type } = notification;

    const config = {
        success: {
            icon: CheckCircle,
            bgColor: 'bg-green-500',
            textColor: 'text-white',
            borderColor: 'border-green-600'
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-red-500',
            textColor: 'text-white',
            borderColor: 'border-red-600'
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-yellow-500',
            textColor: 'text-white',
            borderColor: 'border-yellow-600'
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-500',
            textColor: 'text-white',
            borderColor: 'border-blue-600'
        }
    };

    const { icon: Icon, bgColor, textColor, borderColor } = config[type] || config.info;

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
                exit: { duration: 0.3 }
            }}
            className={`${bgColor} ${textColor} ${borderColor} border-2 rounded-2xl shadow-2xl backdrop-blur-sm pointer-events-auto min-w-[300px] max-w-md overflow-hidden`}
        >
            <div className="p-4 flex items-start gap-3">
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                </motion.div>

                <motion.p
                    className="flex-1 text-sm font-medium leading-relaxed"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                >
                    {message}
                </motion.p>

                <button
                    onClick={() => onRemove(id)}
                    className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress bar */}
            <motion.div
                className="h-1 bg-white/30"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 4, ease: "linear" }}
                style={{ transformOrigin: "left" }}
            />
        </motion.div>
    );
};
