import React, { useState, useEffect, useCallback } from 'react';
import { WifiIcon, CloudArrowUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { syncPendingOperations, getPendingOperations } from '../../utils/offlineSync';

const OfflineStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    // Wrap loadPendingCount in useCallback to avoid recreation
    const loadPendingCount = useCallback(async () => {
        try {
            const pending = await getPendingOperations();
            setPendingCount(pending.length);
        } catch (error) {
            console.error('Error loading pending count:', error);
            setPendingCount(0);
        }
    }, []);

    const handleSync = useCallback(async () => {
        setSyncing(true);
        try {
            await syncPendingOperations();
            await loadPendingCount();
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            setSyncing(false);
        }
    }, [loadPendingCount]);

    // Separate useEffect for initial load
    useEffect(() => {
        loadPendingCount();
    }, [loadPendingCount]);

    // Separate useEffect for online/offline event listeners
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Sync when coming back online
            handleSync();
        };
        
        const handleOffline = () => {
            setIsOnline(false);
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleSync]);

    // Don't show anything if online and no pending operations
    if (isOnline && pendingCount === 0) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 rounded-xl shadow-lg transition-all duration-300 ${
            isOnline ? 'bg-green-500/90 backdrop-blur-sm' : 'bg-red-500/90 backdrop-blur-sm'
        }`}>
            <div className="flex items-center space-x-2 px-4 py-2">
                {isOnline ? (
                    <CloudArrowUpIcon className="h-5 w-5 text-white" />
                ) : (
                    <WifiIcon className="h-5 w-5 text-white animate-pulse" />
                )}
                <span className="text-white text-sm">
                    {isOnline ? `${pendingCount} pending sync` : 'Offline Mode'}
                </span>
                {isOnline && pendingCount > 0 && (
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="ml-2 p-1 rounded-lg bg-white/20 hover:bg-white/30 transition disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`h-4 w-4 text-white ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default OfflineStatus;