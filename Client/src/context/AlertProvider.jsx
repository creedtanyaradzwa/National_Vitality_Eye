import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthProvider.jsx';

// Create context
const AlertContext = createContext(undefined);

// Alert Provider Component
function AlertProvider({ children }) {
    const auth = useContext(AuthContext);
    const token = auth?.token;
    const isAuthenticated = auth?.isAuthenticated;
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

        const socketUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : `http://${window.location.hostname}:5000`;

        // If socket exists and is connected, don't reconnect
        if (socketRef.current?.connected) {
            console.log('♻️ WebSocket already connected');
            return;
        }

        const newSocket = io(socketUrl, {
            query: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
            autoConnect: true
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

        newSocket.on('ai-update', (data) => {
            window.dispatchEvent(new CustomEvent('ai-stats-update', { detail: data }));
        });

        newSocket.on('system-status', (data) => {
            if (data.status === 'error') {
                toast.error(`AI System: ${data.message}`, { duration: 6000 });
            } else if (data.status === 'active') {
                console.log('🤖 AI System Online');
            }
        });

        newSocket.on('alert-acknowledged', ({ alertId }) => {
            setActiveAlerts(prev => prev.map(a =>
                a.id === alertId ? { ...a, acknowledged: true } : a
            ));
        });

        newSocket.on('new-case', (data) => {
            window.dispatchEvent(new CustomEvent('new-disease-case', { detail: data }));
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

    const subscribeToRooms = (topics) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('subscribe', topics);
        }
    };

    const unsubscribeFromRooms = (topics) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('unsubscribe', topics);
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
        subscribeToRooms,
        unsubscribeFromRooms,
        clearAlerts
    };

    return (
        <AlertContext.Provider value={value}>
            {children}
        </AlertContext.Provider>
    );
}

// Custom hook for using alerts
const useAlerts = () => {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlerts must be used within an AlertProvider');
    }
    return context;
};

export { AlertProvider, useAlerts, AlertContext };
export default AlertProvider;
