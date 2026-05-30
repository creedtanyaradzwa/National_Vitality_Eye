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

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) {
                navigate('/patient/login');
                return;
            }
            const res = await fetch(`${PORTAL_API}/ai/health-summary`, {
                headers: { Authorization: `Bearer ${token}` }
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
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-rose-400';
    };

    const getTriageBadge = (priority) => {
        switch(priority) {
            case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'EMERGENT': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'URGENT': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'STABLE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-8">
            {/* Navigation Header */}
            <div className="mb-10">
                <button 
                    onClick={() => navigate('/patient/dashboard')} 
                    className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition" />
                    <span className="text-xs font-bold uppercase tracking-wider">Back to Home</span>
                </button>
            </div>

            {/* Page Title */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mb-10">
                <div className="flex justify-between items-center flex-wrap gap-6">
                    <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <SparklesIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Health Score Report</h1>
                            <p className="text-slate-400 font-medium mt-1">
                                AI-powered analysis of your medical history.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={load} 
                        className="p-3 rounded-xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 text-slate-500 hover:text-emerald-400 transition-all"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {summary && (
                <div className="space-y-8">
                    {/* Main Health Score Card */}
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            {/* Score Display */}
                            <div className="relative flex-shrink-0">
                                <div className="w-40 h-40 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center">
                                    <span className={`text-5xl font-bold ${getScoreColor(summary.healthScore)}`}>
                                        {summary.healthScore}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Score</span>
                                </div>
                                <div className={`absolute inset-0 rounded-full blur-2xl opacity-10 ${summary.healthScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                                    <h2 className="text-3xl font-bold text-white">{summary.scoreLabel}</h2>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTriageBadge(summary.triagePriority)}`}>
                                        {summary.triagePriority}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Total Visits', val: summary.totalVisits },
                                        { label: 'Recent Visits', val: summary.recentVisits },
                                        { label: 'Last Check-up', val: summary.lastVisitDate ? new Date(summary.lastVisitDate).toLocaleDateString() : 'N/A' }
                                    ].map((s, i) => (
                                        <div key={i} className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                                            <p className="text-lg font-bold text-white">{s.val}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Findings & Observations Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Clinical Patterns */}
                        {summary.triageReasons?.length > 0 && (
                            <div className="bg-slate-900/40 border border-amber-500/10 rounded-3xl p-8">
                                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="h-5 w-5" /> Patterns Identified
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {summary.triageReasons.map((r, i) => (
                                        <span key={i} className="px-4 py-2 rounded-xl bg-slate-950 border border-amber-500/10 text-xs text-slate-400 font-medium">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Optimal Parameters */}
                        {summary.insights?.length > 0 && (
                            <div className="bg-slate-900/40 border border-emerald-500/10 rounded-3xl p-8">
                                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <CheckCircleIcon className="h-5 w-5" /> Positive Insights
                                </h3>
                                <ul className="space-y-4">
                                    {summary.insights.map((ins, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium leading-relaxed">
                                            <CheckCircleIcon className="h-5 w-5 text-emerald-500/40 flex-shrink-0" />
                                            {ins}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Critical Alerts */}
                    {summary.warnings?.length > 0 && (
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-8">
                            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShieldCheckIcon className="h-5 w-5" /> Important Observations
                            </h3>
                            <ul className="space-y-4">
                                {summary.warnings.map((w, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-rose-300 font-medium leading-relaxed">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Conditions */}
                    {summary.diagnoses?.length > 0 && (
                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <HeartIcon className="h-5 w-5 text-rose-400" /> Medical Conditions on File
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {summary.diagnoses.map((d, i) => (
                                    <span key={i} className="px-4 py-2 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-400 font-bold uppercase tracking-tight">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Disclaimer */}
                    <div className="bg-slate-900/20 border-l-4 border-blue-500 rounded-2xl p-6 flex items-start gap-4">
                        <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            Disclaimer: This health score and summary are generated by an AI assistant based on your recorded medical history. 
                            It is provided for informational purposes only and should not replace professional clinical advice or diagnosis. 
                            Please consult with your doctor for any health concerns.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIHealthSummary;