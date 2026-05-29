import React, { useState, useEffect } from 'react';
import { getClinicalSnapshot } from '../../services/api';
import { 
    SparklesIcon, 
    ArrowTrendingUpIcon, 
    ArrowTrendingDownIcon,
    ExclamationCircleIcon,
    ClockIcon,
    BeakerIcon,
    HeartIcon,
    FireIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

const ClinicalSnapshot = ({ patientId }) => {
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSnapshot = async () => {
            try {
                setLoading(true);
                const response = await getClinicalSnapshot(patientId);
                setSnapshot(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching clinical snapshot:', err);
                setError('Failed to load clinical summary');
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            fetchSnapshot();
        }
    }, [patientId]);

    if (loading) {
        return (
            <div className="animate-pulse bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="h-6 w-6 bg-purple-500/20 rounded-full"></div>
                    <div className="h-4 w-48 bg-white/10 rounded"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-4 w-full bg-white/5 rounded"></div>
                    <div className="h-4 w-5/6 bg-white/5 rounded"></div>
                    <div className="h-4 w-4/6 bg-white/5 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !snapshot) {
        return null; // Don't show if error or no data
    }

    const { summary, quickMetrics } = snapshot;

    return (
        <div className="relative group overflow-hidden">
            {/* Background Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative bg-slate-900/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/20">
                            <SparklesIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-none">AI Clinical Snapshot</h3>
                            <p className="text-[10px] text-purple-400 font-mono mt-1 uppercase tracking-widest">Instant Patient Intelligence</p>
                        </div>
                    </div>
                    
                    {quickMetrics && (
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                <ClockIcon className="h-3.5 w-3.5 text-gray-500" />
                                <span className="text-[10px] font-mono text-gray-400">
                                    Last Check: {new Date(quickMetrics.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* The Narrative Summary */}
                    <div className="lg:col-span-2 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500/50 to-transparent rounded-full"></div>
                        <div className="pl-6">
                            <p className="text-gray-200 leading-relaxed text-sm lg:text-base italic">
                                "{summary}"
                            </p>
                        </div>
                    </div>

                    {/* Vital Indicators */}
                    {quickMetrics && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${quickMetrics.temp > 37.5 ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    <FireIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Temp</p>
                                    <p className="text-sm font-bold text-white">{quickMetrics.temp}°C</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${quickMetrics.hr > 100 ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                                    <HeartIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">HR</p>
                                    <p className="text-sm font-bold text-white">{quickMetrics.hr} <span className="text-[8px] text-gray-500">bpm</span></p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center space-x-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                    <BoltIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">BP</p>
                                    <p className="text-sm font-bold text-white">{quickMetrics.bp}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${quickMetrics.spO2 < 94 ? 'bg-red-500/10 text-red-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
                                    <BeakerIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">SpO2</p>
                                    <p className="text-sm font-bold text-white">{quickMetrics.spO2}%</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase">System Ready</span>
                        </div>
                        <div className="h-3 w-[1px] bg-white/10"></div>
                        <div className="flex items-center space-x-1.5">
                            <BoltIcon className="h-3 w-3 text-cyber-blue" />
                            <span className="text-[10px] font-mono text-gray-500 uppercase">Pattern Synthesis Active</span>
                        </div>
                    </div>
                    
                    <button className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest flex items-center">
                        View Detailed Trends
                        <ArrowTrendingUpIcon className="h-3 w-3 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClinicalSnapshot;
