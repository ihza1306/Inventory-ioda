import { useCallback } from 'react';
import soundManager from '../utils/soundUtils';

export const useSound = () => {
    const playClick = useCallback((volume = 0.3) => {
        soundManager.playClickSound(volume);
    }, []);

    const playSuccess = useCallback((volume = 0.3) => {
        soundManager.playSuccessSound(volume);
    }, []);

    const playNotification = useCallback((volume = 0.3) => {
        soundManager.playNotificationSound(volume);
    }, []);

    return {
        playClick,
        playSuccess,
        playNotification
    };
};
