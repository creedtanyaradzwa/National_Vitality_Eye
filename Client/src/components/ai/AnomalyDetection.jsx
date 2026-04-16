import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, HeartIcon, BeakerIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AnomalyDetection = ({ patientId, vitalsHistory, currentVitals }) => {
    const [anomalies, setAnomalies] = useState(null);
    const [loading, setLoading] = useState(false);

    const detectAnomalies = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/ai-features/anomaly-detection/${patientId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentVitals })
            });
            const data = await response.json();
            setAnomalies(data);
        } catch (error) {
            toast.error('Failed to detect anomalies');
        } finally {
            setLoading(false);
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
        return <BeakerIcon className="h-5 w-5" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-purple-400 flex items-center">
                    <HeartIcon className="h-5 w-5 mr-2" />
                    Vital Signs Anomaly Detection
                </h3>
                <button
                    onClick={detectAnomalies}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg transition-all"
                >
                    {loading ? 'Analyzing...' : 'Run Anomaly Detection'}
                </button>
            </div>

            {anomalies && (
                <div className="space-y-4">
                    {/* Overall Status */}
                    <div className={`p-4 rounded-xl border ${anomalies.requiresAttention ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Anomaly Score</p>
                                <p className="text-2xl font-bold">{anomalies.anomalyScore}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">Risk Level</p>
                                <p className={`text-lg font-bold ${anomalies.riskLevel === 'CRITICAL' ? 'text-red-400' : anomalies.riskLevel === 'HIGH' ? 'text-orange-400' : anomalies.riskLevel === 'MODERATE' ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {anomalies.riskLevel}
                                </p>
                            </div>
                            <div>
                                {anomalies.requiresAttention ? (
                                    <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                                ) : (
                                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Anomalies List */}
                    {anomalies.anomalies && anomalies.anomalies.length > 0 ? (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-white">Detected Anomalies ({anomalies.anomalyCount})</h4>
                            {anomalies.anomalies.map((anomaly, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${getSeverityColor(anomaly.severity)}`}>
                                    <div className="flex items-start space-x-3">
                                        <div className="mt-1">{getSeverityIcon(anomaly.severity)}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold">{anomaly.type.replace('_', ' ')}</p>
                                            <p className="text-sm mt-1">{anomaly.message}</p>
                                            <p className="text-xs mt-2 text-gray-400">Action: {anomaly.action}</p>
                                            {anomaly.currentValue && anomaly.expectedRange && (
                                                <p className="text-xs mt-1">
                                                    Current: {anomaly.currentValue} | Expected: {anomaly.expectedRange.min?.toFixed(1)} - {anomaly.expectedRange.max?.toFixed(1)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-white/5 rounded-xl">
                            <CheckCircleIcon className="h-12 w-12 mx-auto text-green-400 mb-2" />
                            <p className="text-gray-400">No anomalies detected in vital signs</p>
                            <p className="text-xs text-gray-500 mt-1">All vitals are within normal range</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnomalyDetection;