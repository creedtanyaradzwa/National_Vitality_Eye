import React, { useState, useEffect, useCallback } from 'react';
import { login as loginApi, getProfile } from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(() => {
        return localStorage.getItem('token');
    });

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        toast.success('Logged out successfully');
    }, []);

    const loadUser = useCallback(async () => {
        try {
            const response = await getProfile();
            setUser(response.data.user);
        } catch (error) {
            console.error('Failed to load user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, [token, loadUser]);

    const login = useCallback(async (userId, password) => {
        try {
            const response = await loginApi({ userId, password });
            const { token: newToken, user: userData } = response.data;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(userData);
            toast.success(`Welcome back, ${userData.firstName}!`);
            return { success: true, user: userData };
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Login failed';
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const hasPermission = useCallback((permission) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        
        const rolePermissions = {
            doctor: [
                'view:patients', 'create:patients', 'edit:patients', 
                'view:records', 'create:records', 'edit:records', 
                'view:analytics', 'use:ai_predictor', 'view:logs'
            ],
            nurse: [
                'view:patients', 'create:patients', 
                'view:records', 'create:records', 
                'view:analytics', 'use:ai_predictor', 'view:logs'
            ],
            data_entry: [
                'view:patients', 'create:patients', 'edit:patients', 
                'view:records', 'create:records', 
                'view:analytics', 'use:ai_predictor', 'view:logs'
            ],
            viewer: [
                'view:patients', 'view:records', 
                'view:analytics', 'use:ai_predictor', 'view:logs'
            ]
        };
        
        const permissions = rolePermissions[user.role] || [];
        return permissions.includes(permission);
    }, [user]);

    const hasRole = useCallback((...roles) => {
        if (!user) return false;
        return roles.includes(user.role);
    }, [user]);

    const value = {
        user,
        loading,
        token,
        login,
        logout,
        hasPermission,
        hasRole,
        isAuthenticated: !!token
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};