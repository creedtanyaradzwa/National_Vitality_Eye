import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    SparklesIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    HeartIcon,
    ArrowPathIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const AIHealthSummary = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const res = await fetch(`${PORTAL_API}/ai/health-summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSummary(data);
        } catch (err) {
            toast.error('Could not load health summary');
        } finally {
            setLoading(false);
        }
    };

    const scoreGradient = (color) => ({
        green:  'from-green-500 to-emerald-500',
        yellow: 'from-yellow-500 to-amber-500',
        orange: 'from-orange-500 to-red-400',
        red:    'from-red-500 to-red-700'
    }[color] || 'from-gray-500 to-gray-600');

    const triageBadge = (priority) => ({
        CRITICAL:   'bg-red-500/20 text-red-400 border-red-500/30',
        EMERGENT:   'bg-orange-500/20 text-orange-400 border-orange-500/30',
        URGENT:     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        STABLE:     'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'NON-URGENT': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30');

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-dark-950 text-gray-200">
            {/* Futuristic Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/patient/dashboard')} 
                    className="mb-8 flex items-center space-x-3 text-gray-500 hover:text-white group transition-all duration-300"
                >
                    <div className="p-2 rounded-xl bg-brand-dark-900 border border-white/5 group-hover:border-cyber-purple/30 transition-all">
                        <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Return to Core</span>
                </button>

                {/* Header */}
                <div className="glass-card-modern p-8 mb-10 border border-white/5">
                    <div className="flex justify-between items-center flex-wrap gap-6">
                        <div className="flex items-center space-x-6">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-2xl bg-cyber-purple/20 blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 rounded-2xl bg-brand-dark-900 border border-cyber-purple/30 flex items-center justify-center shadow-2xl">
                                    <SparklesIcon className="h-8 w-8 text-cyber-purple" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Health Matrix Report</h1>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                                    Neural analysis of clinical history stream
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={load} 
                            className="p-3 rounded-xl bg-brand-dark-900 border border-white/5 hover:border-cyber-purple/30 text-gray-500 hover:text-cyber-purple transition-all duration-300 shadow-xl"
                        >
                            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {summary && (
                    <div className="space-y-8">
                        {/* Health Score */}
                        <div className="glass-card-modern p-8 border border-white/5">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                {/* Score circle */}
                                <div className="relative flex-shrink-0">
                                    <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                                        <circle
                                            cx="60" cy="60" r="50" fill="none"
                                            stroke="url(#scoreGrad)" strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(summary.healthScore / 100) * 314} 314`}
                                            className="transition-all duration-1000 ease-out"
                                        />
                                        <defs>
                                            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor={summary.scoreColor === 'green' ? '#39ff14' : summary.scoreColor === 'yellow' ? '#fbbf24' : summary.scoreColor === 'orange' ? '#f97316' : '#ef4444'} />
                                                <stop offset="100%" stopColor={summary.scoreColor === 'green' ? '#00f2ff' : summary.scoreColor === 'yellow' ? '#f59e0b' : summary.scoreColor === 'orange' ? '#ef4444' : '#bc13fe'} />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                                        <span className="text-4xl font-black text-white italic tracking-tighter">{summary.healthScore}</span>
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">V-MATRIX</span>
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-cyber-purple/5 blur-3xl -z-10 animate-pulse" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">{summary.scoreLabel}</h2>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${triageBadge(summary.triagePriority)}`}>
                                            {summary.triagePriority}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { label: 'Total Visits', val: summary.totalVisits },
                                            { label: 'Last 3M', val: summary.recentVisits },
                                            { label: 'Last Node', val: summary.lastVisitDate ? new Date(summary.lastVisitDate).toLocaleDateString().toUpperCase() : 'N/A' }
                                        ].map((s, i) => (
                                            <div key={i} className="bg-brand-dark-900 border border-white/5 rounded-2xl p-4 shadow-xl">
                                                <p className="text-[10px] font-black text-white italic tracking-tight">{s.val}</p>
                                                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Triage reasons */}
                        {summary.triageReasons?.length > 0 && (
                            <div className="glass-card-modern p-6 border border-yellow-500/10 bg-yellow-500/5">
                                <h3 className="text-[10px] font-bold text-yellow-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3 italic">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> CLINICAL PATTERN MATCHES
                                </h3>
                                <div className="flex flex-wrap gap-3 ml-7">
                                    {summary.triageReasons.map((r, i) => (
                                        <span key={i} className="px-4 py-1.5 rounded-xl bg-brand-dark-950 border border-yellow-500/10 text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {summary.warnings?.length > 0 && (
                            <div className="glass-card-modern p-6 border border-red-500/10 bg-red-500/5">
                                <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3 italic">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> CRITICAL INDICATORS
                                </h3>
                                <ul className="space-y-3 ml-7">
                                    {summary.warnings.map((w, i) => (
                                        <li key={i} className="flex items-start gap-4 text-[10px] font-bold text-red-300 uppercase tracking-widest leading-relaxed italic">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] flex-shrink-0" />
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Positive insights */}
                        {summary.insights?.length > 0 && (
                            <div className="glass-card-modern p-6 border border-cyber-green/10 bg-cyber-green/5">
                                <h3 className="text-[10px] font-bold text-cyber-green uppercase tracking-[0.2em] mb-4 flex items-center gap-3 italic">
                                    <CheckCircleIcon className="h-4 w-4" /> OPTIMAL PARAMETERS
                                </h3>
                                <ul className="space-y-3 ml-7">
                                    {summary.insights.map((ins, i) => (
                                        <li key={i} className="flex items-start gap-4 text-[10px] font-bold text-cyber-green uppercase tracking-widest leading-relaxed italic opacity-80">
                                            <CheckCircleIcon className="h-4 w-4 text-cyber-green/50 flex-shrink-0" />
                                            {ins}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Conditions on record */}
                        {summary.diagnoses?.length > 0 && (
                            <div className="glass-card-modern p-6 border border-white/5">
                                <h3 className="text-[10px] font-bold text-cyber-purple uppercase tracking-[0.2em] mb-4 flex items-center gap-3 italic">
                                    <HeartIcon className="h-4 w-4" /> ARCHIVED CONDITIONS
                                </h3>
                                <div className="flex flex-wrap gap-3 ml-7">
                                    {summary.diagnoses.map((d, i) => (
                                        <span key={i} className="px-4 py-2 rounded-xl bg-brand-dark-900 border border-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest italic hover:border-cyber-purple/30 transition-all duration-300">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="p-6 rounded-2xl bg-brand-dark-900 border border-white/5 border-l-cyber-blue/50 border-l-4 flex items-start gap-4">
                            <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0" />
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                NEURAL ARCHIVE DATA: THIS REPORT IS AUTOMATED BASED ON RECORDED BIOMETRIC LOGS. 
                                IT DOES NOT CONSTITUTE A PRIMARY CLINICAL DIAGNOSIS. 
                                CROSS-REFERENCE ALL FINDINGS WITH A HUMAN PRACTITIONER.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIHealthSummary;
