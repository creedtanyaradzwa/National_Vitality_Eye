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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button onClick={() => navigate('/patient/dashboard')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
                    <ArrowLeftIcon className="h-5 w-5" /> Back to Dashboard
                </button>

                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6 flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <SparklesIcon className="h-8 w-8 text-purple-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">AI Health Summary</h1>
                                <p className="text-gray-400 text-sm">Personalised insights from your medical history</p>
                            </div>
                        </div>
                        <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {summary && (
                    <div className="space-y-6">
                        {/* Health Score */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                {/* Score circle */}
                                <div className="relative flex-shrink-0">
                                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                        <circle
                                            cx="60" cy="60" r="50" fill="none"
                                            stroke="url(#scoreGrad)" strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(summary.healthScore / 100) * 314} 314`}
                                        />
                                        <defs>
                                            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor={summary.scoreColor === 'green' ? '#10b981' : summary.scoreColor === 'yellow' ? '#f59e0b' : summary.scoreColor === 'orange' ? '#f97316' : '#ef4444'} />
                                                <stop offset="100%" stopColor={summary.scoreColor === 'green' ? '#34d399' : summary.scoreColor === 'yellow' ? '#fbbf24' : summary.scoreColor === 'orange' ? '#ef4444' : '#dc2626'} />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                                        <span className="text-3xl font-black text-white">{summary.healthScore}</span>
                                        <span className="text-xs text-gray-400">/100</span>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <h2 className="text-2xl font-black text-white">{summary.scoreLabel}</h2>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${triageBadge(summary.triagePriority)}`}>
                                            {summary.triagePriority}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-2xl font-bold text-white">{summary.totalVisits}</p>
                                            <p className="text-xs text-gray-500">Total Visits</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-2xl font-bold text-white">{summary.recentVisits}</p>
                                            <p className="text-xs text-gray-500">Last 3 Months</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-lg font-bold text-white">{summary.lastVisitDate ? new Date(summary.lastVisitDate).toLocaleDateString() : 'N/A'}</p>
                                            <p className="text-xs text-gray-500">Last Visit</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Triage reasons */}
                        {summary.triageReasons?.length > 0 && (
                            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-5">
                                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> Clinical Indicators
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {summary.triageReasons.map((r, i) => (
                                        <span key={i} className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-mono">{r}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {summary.warnings?.length > 0 && (
                            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5">
                                <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> Things to Watch
                                </h3>
                                <ul className="space-y-2">
                                    {summary.warnings.map((w, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Positive insights */}
                        {summary.insights?.length > 0 && (
                            <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-5">
                                <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CheckCircleIcon className="h-4 w-4" /> Positive Findings
                                </h3>
                                <ul className="space-y-2">
                                    {summary.insights.map((ins, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-green-300">
                                            <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            {ins}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Conditions on record */}
                        {summary.diagnoses?.length > 0 && (
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <HeartIcon className="h-4 w-4" /> Conditions on Record
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {summary.diagnoses.map((d, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-sm">{d}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
                            <InformationCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-500 leading-relaxed">
                                This summary is generated from your recorded medical data and is intended to help you understand your health history.
                                It is not a medical diagnosis. Always consult your doctor for medical advice.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIHealthSummary;
