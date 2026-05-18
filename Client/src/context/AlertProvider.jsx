import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

// Create context
const AlertContext = React.createContext(undefined);

// Custom hook for using alerts - MUST BE EXPORTED
export const useAlerts = () => {
    const context = React.useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlerts must be used within an AlertProvider');
    }
    return context;
};

// Alert Provider Component
export const AlertProvider = ({ children }) => {
    const { token, isAuthenticated } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        // Only connect if authenticated and token exists
        if (!isAuthenticated || !token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setConnected(false);
            return;
        }

        console.log('🔌 Attempting WebSocket connection...');

        // Use window.location.hostname to connect to the same host
        const socketUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : `http://${window.location.hostname}:5000`;

        const newSocket = io(socketUrl, {
            query: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            setConnected(true);
            console.log('✅ WebSocket connected');
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error.message);
            setConnected(false);
        });

        newSocket.on('disconnect', (reason) => {
            setConnected(false);
            console.log('❌ WebSocket disconnected:', reason);
            if (reason === "io server disconnect") {
                // the disconnection was initiated by the server, you need to reconnect manually
                newSocket.connect();
            }
        });

        newSocket.on('welcome', (data) => {
            if (data.activeAlerts) {
                setActiveAlerts(data.activeAlerts);
                setAlerts(data.activeAlerts);
            }
        });

        newSocket.on('outbreak-alert', (alert) => {
            setActiveAlerts(prev => [alert, ...prev]);
            setAlerts(prev => [alert, ...prev]);
            
            if (alert.severity === 'CRITICAL') {
                toast.error(`🚨 CRITICAL: ${alert.message}`, { duration: 10000 });
            } else if (alert.severity === 'HIGH') {
                toast.error(`⚠️ ${alert.message}`, { duration: 8000 });
            } else {
                toast(`🆕 ${alert.message}`, { duration: 5000 });
            }
        });

        newSocket.on('alert-resolved', (data) => {
            setActiveAlerts(prev => prev.filter(a => 
                !(a.province === data.province && a.disease === data.disease)
            ));
            toast.success(data.message);
        });

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [token, isAuthenticated]);

    const acknowledgeAlert = (alertId) => {
        if (socketRef.current) {
            socketRef.current.emit('acknowledge-alert', { alertId });
        }
    };

    const clearAlerts = () => {
        setAlerts([]);
    };

    const value = {
        alerts,
        activeAlerts,
        connected,
        acknowledgeAlert,
        clearAlerts
    };

    return (
        <AlertContext.Provider value={value}>
            {children}
        </AlertContext.Provider>
    );
};

export default AlertProvider;