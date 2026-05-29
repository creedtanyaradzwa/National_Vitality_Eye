import React, { useState, useEffect } from 'react';
import { getClinicalSnapshot } from '../../services/api';
import { 
    SparklesIcon, 
    HeartIcon, 
    BeakerIcon, 
    ClipboardDocumentListIcon,
    ArrowPathIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

const ClinicalSnapshot = ({ patientId }) => {
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadSnapshot = async () => {
        setLoading(true);
        try {
            const res = await getClinicalSnapshot(patientId);
            setSnapshot(res.data);
            setError(null);
        } catch (err) {
            console.error('Failed to load clinical snapshot:', err);
            setError('Failed to generate snapshot');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientId) {
            loadSnapshot();
        }
    }, [patientId]);

    if (loading) {
        return (
            <div className="animate-pulse rounded-2xl bg-cyber-blue/5 border border-cyber-blue/20 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-cyber-blue/20" />
                    <div className="h-4 w-48 bg-cyber-blue/20 rounded" />
                </div>
                <div className="space-y-3">
                    <div className="h-3 w-full bg-cyber-blue/10 rounded" />
                    <div className="h-3 w-3/4 bg-cyber-blue/10 rounded" />
                </div>
            </div>
        );
    }

    if (error || !snapshot) return null;

    const { summary, metrics } = snapshot;

    return (
        <div className="relative group mb-8">
            {/* Animated background glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyber-blue to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative rounded-2xl bg-slate-900/90 border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: AI Clinical Story */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-cyber-blue/20 text-cyber-blue">
                                <SparklesIcon className="h-5 w-5 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-cyber-blue uppercase tracking-[0.3em]">AI Clinical Snapshot</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Real-time NLP Synthesis</p>
                            </div>
                        </div>

                        <p className="text-lg font-medium text-white leading-relaxed mb-6">
                            "{summary}"
                        </p>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={loadSnapshot}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <ArrowPathIcon className="h-3.5 w-3.5" />
                                Re-Synthesize
                            </button>
                            <span className="text-[9px] font-mono text-gray-600 uppercase">
                                Analysis Source: Historical Records & Last Vital Sync
                            </span>
                        </div>
                    </div>

                    {/* Right: Quick Vitals Metrics */}
                    {metrics && (
                        <div className="w-full lg:w-72 grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <HeartIcon className="h-3.5 w-3.5 text-red-500" />
                                    <span className="text-[8px] font-black text-gray-500 uppercase">Heart Rate</span>
                                </div>
                                <p className="text-xl font-black text-white">{metrics.hr} <span className="text-[10px] font-normal text-gray-500">bpm</span></p>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <BoltIcon className="h-3.5 w-3.5 text-cyan-400" />
                                    <span className="text-[8px] font-black text-gray-500 uppercase">SpO2</span>
                                </div>
                                <p className="text-xl font-black text-cyan-400">{metrics.spO2}%</p>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <BeakerIcon className="h-3.5 w-3.5 text-orange-400" />
                                    <span className="text-[8px] font-black text-gray-500 uppercase">Temp</span>
                                </div>
                                <p className="text-xl font-black text-white">{metrics.temp}°C</p>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <ClipboardDocumentListIcon className="h-3.5 w-3.5 text-purple-400" />
                                    <span className="text-[8px] font-black text-gray-500 uppercase">Blood Pressure</span>
                                </div>
                                <p className="text-sm font-black text-white">{metrics.bp}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClinicalSnapshot;
