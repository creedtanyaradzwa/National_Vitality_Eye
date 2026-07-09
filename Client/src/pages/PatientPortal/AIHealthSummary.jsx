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
    InformationCircleIcon,
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
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSummary(data);
        } catch (err) {
            console.error('Error loading summary:', err);
            toast.error('Could not load health summary');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-cyber-green';
        if (score >= 60) return 'text-amber-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getTriageBadge = (priority) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'EMERGENT': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'URGENT':   return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'STABLE':   return 'bg-cyber-green/10 text-cyber-green border-cyber-green/20';
            default:         return 'bg-white/5 text-gray-400 border-white/10';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-cyber-blue/20 border-t-cyber-blue animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8">
            {/* Back */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/patient/dashboard')}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Home</span>
                </button>
            </div>

            {/* Header */}
            <div className="bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 mb-8">
                <div className="flex justify-between items-center flex-wrap gap-6">
                    <div className="flex items-center space-x-5">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 rounded-xl bg-cyber-blue/20 blur-lg" />
                            <div className="relative w-14 h-14 rounded-xl bg-brand-dark-950 border border-cyber-blue/30 flex items-center justify-center">
                                <SparklesIcon className="h-7 w-7 text-cyber-blue" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Health Score Report</h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">AI-powered analysis of your medical history</p>
                        </div>
                    </div>
                    <button
                        onClick={load}
                        className="p-3 rounded-xl bg-brand-dark-950 border border-white/5 hover:border-cyber-blue/30 text-gray-500 hover:text-cyber-blue transition-all"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {summary && (
                <div className="space-y-6">
                    {/* Score card */}
                    <div className="bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
                        <div className="flex flex-col md:flex-row items-center gap-10">
                            {/* Circular score */}
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 rounded-full blur-2xl opacity-20 bg-cyber-blue" />
                                <div className="relative w-36 h-36 rounded-full border-4 border-brand-dark-800 bg-brand-dark-950 flex flex-col items-center justify-center">
                                    <span className={`text-5xl font-black ${getScoreColor(summary.healthScore)}`}>
                                        {summary.healthScore}
                                    </span>
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">Score</span>
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                                    <h2 className="text-2xl font-black text-white tracking-tighter">{summary.scoreLabel}</h2>
                                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getTriageBadge(summary.triagePriority)}`}>
                                        {summary.triagePriority}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { label: 'Total Visits',  val: summary.totalVisits },
                                        { label: 'Recent Visits', val: summary.recentVisits },
                                        { label: 'Last Check-up', val: summary.lastVisitDate ? new Date(summary.lastVisitDate).toLocaleDateString() : 'N/A' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-brand-dark-950/60 border border-white/5 rounded-xl p-4">
                                            <p className="text-lg font-black text-white">{s.val}</p>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Findings grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {summary.triageReasons?.length > 0 && (
                            <div className="bg-brand-dark-900/60 border border-amber-500/10 rounded-2xl p-6">
                                <h3 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> Patterns Identified
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {summary.triageReasons.map((r, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-brand-dark-950 border border-amber-500/10 text-xs text-gray-400 font-medium">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {summary.insights?.length > 0 && (
                            <div className="bg-brand-dark-900/60 border border-cyber-green/10 rounded-2xl p-6">
                                <h3 className="text-[9px] font-black text-cyber-green uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <CheckCircleIcon className="h-4 w-4" /> Positive Insights
                                </h3>
                                <ul className="space-y-3">
                                    {summary.insights.map((ins, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-300 font-medium leading-relaxed">
                                            <CheckCircleIcon className="h-4 w-4 text-cyber-green/40 flex-shrink-0 mt-0.5" />
                                            {ins}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Critical alerts */}
                    {summary.warnings?.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                            <h3 className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <ShieldCheckIcon className="h-4 w-4" /> Important Observations
                            </h3>
                            <ul className="space-y-3">
                                {summary.warnings.map((w, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-red-300 font-medium leading-relaxed">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Conditions */}
                    {summary.diagnoses?.length > 0 && (
                        <div className="bg-brand-dark-900/60 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <HeartIcon className="h-4 w-4 text-red-400" /> Medical Conditions on File
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {summary.diagnoses.map((d, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-brand-dark-950 border border-white/5 text-xs text-gray-400 font-black uppercase tracking-tight">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="bg-brand-dark-900/40 border-l-4 border-l-cyber-blue border-y border-r border-white/5 rounded-xl p-5 flex items-start gap-4">
                        <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0" />
                        <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
                            This health score is generated by AI based on your recorded medical history. It is for informational purposes only and does not replace professional clinical advice. Please consult your doctor for any health concerns.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIHealthSummary;
