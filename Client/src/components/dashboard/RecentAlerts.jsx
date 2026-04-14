import React from 'react';
import { 
    ExclamationTriangleIcon, 
    CheckCircleIcon,
    BellAlertIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';

const RecentAlerts = ({ alerts }) => {
    const getSeverityStyles = (severity) => {
        switch(severity) {
            case 'CRITICAL': 
                return {
                    bg: 'bg-gradient-to-r from-red-500/20 to-red-600/10',
                    border: 'border-l-red-500',
                    text: 'text-red-400',
                    icon: 'text-red-500',
                    glow: 'shadow-red-500/20'
                };
            case 'HIGH': 
                return {
                    bg: 'bg-gradient-to-r from-orange-500/20 to-orange-600/10',
                    border: 'border-l-orange-500',
                    text: 'text-orange-400',
                    icon: 'text-orange-500',
                    glow: 'shadow-orange-500/20'
                };
            case 'MEDIUM': 
                return {
                    bg: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10',
                    border: 'border-l-yellow-500',
                    text: 'text-yellow-400',
                    icon: 'text-yellow-500',
                    glow: 'shadow-yellow-500/20'
                };
            default: 
                return {
                    bg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/10',
                    border: 'border-l-blue-500',
                    text: 'text-blue-400',
                    icon: 'text-blue-500',
                    glow: 'shadow-blue-500/20'
                };
        }
    };

    if (alerts.length === 0) {
        return (
            <div className="neon-card p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">All Systems Normal</h3>
                <p className="text-gray-400 text-sm">No active outbreaks detected</p>
            </div>
        );
    }

    return (
        <div className="neon-card overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-purple-500/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <BellAlertIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Active Alerts</h2>
                            <p className="text-xs text-gray-400">{alerts.length} active outbreak{alerts.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                        <div className="relative w-3 h-3 rounded-full bg-red-500" />
                    </div>
                </div>
            </div>
            
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                {alerts.map((alert, index) => {
                    const styles = getSeverityStyles(alert.severity);
                    return (
                        <div key={index} className={`p-4 transition-all duration-300 hover:${styles.bg} ${styles.border} border-l-4`}>
                            <div className="flex items-start space-x-3">
                                <div className={`mt-1 p-1 rounded-lg ${styles.bg}`}>
                                    <ExclamationTriangleIcon className={`h-4 w-4 ${styles.icon}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-white text-sm">
                                            {alert.disease}
                                        </h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-xs mb-2 line-clamp-2">{alert.message}</p>
                                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                                        <span className="flex items-center space-x-1">
                                            <span>📍</span>
                                            <span>{alert.province}</span>
                                        </span>
                                        <span>
                                            {new Date(alert.timestamp).toLocaleTimeString()}
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