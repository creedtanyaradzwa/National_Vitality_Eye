import React, { useState, useEffect } from 'react';
import { getAlerts, refreshAI } from '../services/api';
import { useAlerts } from "../context/AlertProvider";
import { useAuth } from '../context/AuthProvider';
import { 
    BellIcon, 
    ExclamationTriangleIcon, 
    CheckCircleIcon, 
    ArrowPathIcon, 
    EyeIcon, 
    MapPinIcon, 
    CalendarIcon, 
    ChartBarIcon, 
    XMarkIcon, 
    ShieldCheckIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Alerts = () => {
    const { hasPermission } = useAuth();
    const { activeAlerts, connected } = useAlerts();
    const canViewAnalytics = hasPermission('view:analytics');
    
    const [alertsHistory, setAlertsHistory] = useState([]);
    const [activeAlertList, setActiveAlertList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => { 
        if (canViewAnalytics) loadAlerts(); 
    }, [canViewAnalytics]);

    useEffect(() => { 
        setActiveAlertList(activeAlerts); 
    }, [activeAlerts]);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const response = await getAlerts();
            setAlertsHistory(response.data.history || []);
            setActiveAlertList(response.data.activeAlerts || []);
            setLastUpdated(new Date()); // Update timestamp when data loads
        } catch { 
            toast.error('Failed to load alerts'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleRefreshAI = async () => {
        try { 
            await refreshAI(); 
            toast.success('AI refreshed successfully'); 
            await loadAlerts(); // Refresh alerts after AI refresh
        } catch { 
            toast.error('Failed to refresh AI'); 
        }
    };

    const getSeverityColor = (severity) => {
        switch(severity) {
            case 'CRITICAL': return 'bg-red-500/20 border-red-500 text-red-400';
            case 'HIGH': return 'bg-orange-500/20 border-orange-500 text-orange-400';
            case 'MEDIUM': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
            default: return 'bg-blue-500/20 border-blue-500 text-blue-400';
        }
    };

    const getSeverityIcon = (severity) => {
        if (severity === 'CRITICAL' || severity === 'HIGH') {
            return <ExclamationTriangleIcon className="h-5 w-5" />;
        }
        return <BellIcon className="h-5 w-5" />;
    };

    const getFilteredAlerts = () => {
        let alerts = filter === 'active' ? activeAlertList : alertsHistory;
        if (severityFilter !== 'all') {
            alerts = alerts.filter(alert => alert.severity === severityFilter);
        }
        return alerts;
    };

    const getAlertSummary = () => {
        const activeCount = activeAlertList.length;
        const criticalCount = [...activeAlertList, ...alertsHistory].filter(a => a.severity === 'CRITICAL').length;
        const highCount = [...activeAlertList, ...alertsHistory].filter(a => a.severity === 'HIGH').length;
        const resolvedCount = alertsHistory.filter(a => a.resolved).length;
        return { activeCount, criticalCount, highCount, resolvedCount };
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString();
    };

    const summary = getAlertSummary();
    const filteredAlerts = getFilteredAlerts();

    if (!canViewAnalytics) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 p-[1px]">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-12 text-center">
                        <BellIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                        <p className="text-gray-400">
                            You don't have permission to view alerts.
                            Please contact your administrator to upgrade your role.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <BellIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Outbreak Alerts</h1>
                                <p className="text-gray-400">Real-time disease outbreak monitoring and alert management</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Last Updated Display - NOW USED */}
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-gray-500">Last updated</p>
                                <p className="text-sm text-gray-300">{lastUpdated.toLocaleTimeString()}</p>
                            </div>
                            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-sm">{connected ? 'Live' : 'Disconnected'}</span>
                            </div>
                            <button
                                onClick={handleRefreshAI}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                                title="Refresh AI"
                            >
                                <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-400 text-sm">Active Alerts</p>
                            <p className="text-3xl font-bold text-white">{summary.activeCount}</p>
                        </div>
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                    </div>
                </div>
                
                <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-400 text-sm">High Risk</p>
                            <p className="text-3xl font-bold text-white">{summary.highCount}</p>
                        </div>
                        <ExclamationTriangleIcon className="h-8 w-8 text-orange-400" />
                    </div>
                </div>
                
                <div className="rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-400 text-sm">Critical</p>
                            <p className="text-3xl font-bold text-white">{summary.criticalCount}</p>
                        </div>
                        <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400" />
                    </div>
                </div>
                
                <div className="rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-400 text-sm">Resolved</p>
                            <p className="text-3xl font-bold text-white">{summary.resolvedCount}</p>
                        </div>
                        <CheckCircleIcon className="h-8 w-8 text-green-400" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Show:</span>
                        <div className="flex space-x-1">
                            <button
                                onClick={() => setFilter('active')}
                                className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
                                    filter === 'active'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        : 'bg-white/10 text-gray-400 hover:text-white'
                                }`}
                            >
                                Active Alerts
                            </button>
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
                                    filter === 'all'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        : 'bg-white/10 text-gray-400 hover:text-white'
                                }`}
                            >
                                History
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Severity:</span>
                        <select
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                        >
                            <option value="all">All Severities</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Alerts List */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    </div>
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
                    <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-400">No alerts found</p>
                    <p className="text-sm text-gray-500 mt-1">All systems are normal</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAlerts.map((alert, index) => {
                        const styles = getSeverityColor(alert.severity);
                        return (
                            <div
                                key={alert.id || index}
                                className={`rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 ${styles.split(' ')[0]}`}
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className={`p-2 rounded-xl ${styles.split(' ')[0]}`}>
                                                {getSeverityIcon(alert.severity)}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h3 className="text-lg font-bold text-white">
                                                        {alert.disease || alert.type}
                                                    </h3>
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${styles}`}>
                                                        {alert.severity}
                                                    </span>
                                                    {alert.resolved && (
                                                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400">
                                                            Resolved
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-300 mb-3">{alert.message}</p>
                                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                                    <div className="flex items-center space-x-1">
                                                        <MapPinIcon className="h-4 w-4" />
                                                        <span>{alert.province}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{formatDate(alert.timestamp)}</span>
                                                    </div>
                                                    {alert.recentCases && (
                                                        <div className="flex items-center space-x-1">
                                                            <ChartBarIcon className="h-4 w-4" />
                                                            <span>{alert.recentCases} cases (↑{alert.increasePercent}%)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedAlert(alert);
                                                setShowModal(true);
                                            }}
                                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Alert Details Modal */}
            {showModal && selectedAlert && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900/95">
                                <h2 className="text-2xl font-bold text-white">Alert Details</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-xl ${
                                        selectedAlert.severity === 'CRITICAL' ? 'bg-red-500/20' : 
                                        selectedAlert.severity === 'HIGH' ? 'bg-orange-500/20' : 
                                        'bg-yellow-500/20'
                                    }`}>
                                        {getSeverityIcon(selectedAlert.severity)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">
                                            {selectedAlert.disease || selectedAlert.type}
                                        </h3>
                                        <p className="text-gray-400">{selectedAlert.province}</p>
                                    </div>
                                </div>
                                
                                <div className="rounded-xl bg-white/5 p-4">
                                    <p className="text-gray-300">{selectedAlert.message}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl bg-white/5 p-3">
                                        <p className="text-sm text-gray-400">Severity</p>
                                        <p className={`font-semibold ${
                                            selectedAlert.severity === 'CRITICAL' ? 'text-red-400' : 
                                            selectedAlert.severity === 'HIGH' ? 'text-orange-400' : 
                                            'text-yellow-400'
                                        }`}>
                                            {selectedAlert.severity}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white/5 p-3">
                                        <p className="text-sm text-gray-400">Timestamp</p>
                                        <p className="font-semibold text-white">{formatDate(selectedAlert.timestamp)}</p>
                                    </div>
                                    {selectedAlert.recentCases && (
                                        <>
                                            <div className="rounded-xl bg-white/5 p-3">
                                                <p className="text-sm text-gray-400">Recent Cases</p>
                                                <p className="font-semibold text-white">{selectedAlert.recentCases}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/5 p-3">
                                                <p className="text-sm text-gray-400">Increase</p>
                                                <p className="font-semibold text-red-400">+{selectedAlert.increasePercent}%</p>
                                            </div>
                                        </>
                                    )}
                                    {selectedAlert.previousCases && (
                                        <div className="rounded-xl bg-white/5 p-3">
                                            <p className="text-sm text-gray-400">Previous Cases</p>
                                            <p className="font-semibold text-white">{selectedAlert.previousCases}</p>
                                        </div>
                                    )}
                                    {selectedAlert.mortalityRate && (
                                        <div className="rounded-xl bg-white/5 p-3">
                                            <p className="text-sm text-gray-400">Mortality Rate</p>
                                            <p className="font-semibold text-red-400">{selectedAlert.mortalityRate}%</p>
                                        </div>
                                    )}
                                </div>
                                
                                {selectedAlert.affectedAgeGroups && (
                                    <div className="rounded-xl bg-white/5 p-4">
                                        <h4 className="font-semibold text-purple-400 mb-2">Affected Age Groups</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Children (&lt;18)</span>
                                                <span className="font-medium text-white">{selectedAlert.affectedAgeGroups.child}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Adults (18-64)</span>
                                                <span className="font-medium text-white">{selectedAlert.affectedAgeGroups.adult}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Elderly (65+)</span>
                                                <span className="font-medium text-white">{selectedAlert.affectedAgeGroups.elderly}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 border-t border-white/10">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all duration-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Alerts;