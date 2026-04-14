// src/context/useAlerts.js
import { useContext } from 'react';
import { AlertContext } from './AlertContext';

export const useAlerts = () => {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlerts must be used within an AlertProvider');
    }
    return context;
};