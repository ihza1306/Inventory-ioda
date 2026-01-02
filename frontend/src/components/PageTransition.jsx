import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PageTransition = ({ children, isActive = true }) => {
    return (
        <AnimatePresence mode="wait">
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1] // Custom easing for smooth feel
                    }}
                    className="w-full h-full"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PageTransition;
