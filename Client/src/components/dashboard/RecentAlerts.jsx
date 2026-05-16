import React from 'react';
import { 
    ExclamationTriangleIcon, 
    CheckCircleIcon,
    BellAlertIcon
} from '@heroicons/react/24/solid';
import { MapPinIcon } from '@heroicons/react/24/outline';

const RecentAlerts = ({ alerts, selectedDisease }) => {
    // Filter alerts by selected disease if one is chosen
    const filteredAlerts = selectedDisease
        ? (alerts || []).filter(a =>
            !a.disease ||
            a.disease.toLowerCase() === selectedDisease.toLowerCase()
          )
        : (alerts || []);

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return {
                    bg: 'bg-red-500/10',
                    border: 'border-l-red-500',
                    text: 'text-red-400',
                    icon: 'text-red-500'
                };
            case 'HIGH':
                return {
                    bg: 'bg-orange-500/10',
                    border: 'border-l-orange-500',
                    text: 'text-orange-400',
                    icon: 'text-orange-500'
                };
            case 'MEDIUM':
                return {
                    bg: 'bg-yellow-500/10',
                    border: 'border-l-yellow-500',
                    text: 'text-yellow-400',
                    icon: 'text-yellow-500'
                };
            default:
                return {
                    bg: 'bg-cyber-blue/10',
                    border: 'border-l-cyber-blue',
                    text: 'text-cyber-blue',
                    icon: 'text-cyber-blue'
                };
        }
    };

    if (filteredAlerts.length === 0) {
        return (
            <div className="glass-card-modern p-8 text-center border border-white/5">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-brand-dark-800 flex items-center justify-center border border-cyber-green/30 shadow-[0_0_30px_rgba(57,255,20,0.08)]">
                    <CheckCircleIcon className="h-8 w-8 text-cyber-green" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 tracking-tight">All Clear</h3>
                <p className="text-gray-500 text-xs font-medium">
                    {selectedDisease
                        ? `No active alerts for ${selectedDisease}`
                        : 'No active outbreaks detected in any region'}
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card-modern border border-white/5">
            <div className="p-5 border-b border-white/5 bg-brand-dark-900/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-dark-800 border border-red-500/30 flex items-center justify-center">
                            <BellAlertIcon className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">Active Alerts</h2>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
                                {filteredAlerts.length} threat{filteredAlerts.length !== 1 ? 's' : ''}
                                {selectedDisease && <span className="text-purple-400 ml-1">· {selectedDisease}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                        <div className="relative w-2 h-2 rounded-full bg-red-500" />
                    </div>
                </div>
            </div>

            <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                {filteredAlerts.map((alert, index) => {
                    const styles = getSeverityStyles(alert.severity);
                    return (
                        <div
                            key={index}
                            className={`p-4 transition-all duration-300 hover:bg-white/[0.02] ${styles.border} border-l-4`}
                        >
                            <div className="flex items-start space-x-3">
                                <div className={`mt-0.5 p-1.5 rounded-lg ${styles.bg} flex-shrink-0`}>
                                    <ExclamationTriangleIcon className={`h-4 w-4 ${styles.icon}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5 gap-2">
                                        <h3 className="font-bold text-white text-xs tracking-tight truncate">
                                            {alert.disease}
                                        </h3>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border border-white/5 flex-shrink-0 ${styles.bg} ${styles.text}`}>
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-[11px] mb-2 leading-relaxed line-clamp-2">
                                        {alert.message}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                            <MapPinIcon className="h-3 w-3 text-gray-600" />
                                            <span>{alert.province}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-600">
                                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RecentAlerts;
