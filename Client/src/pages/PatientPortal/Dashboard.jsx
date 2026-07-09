import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UserIcon,
    DocumentTextIcon,
    HeartIcon,
    ArrowRightIcon,
    CalendarIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon,
    BellAlertIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    CpuChipIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PatientDashboard = () => {
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [recentRecords, setRecentRecords] = useState([]);
    const [stats, setStats] = useState({ totalRecords: 0, lastVisitDate: null });
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('patient') || localStorage.getItem('patientUser');
        if (stored) {
            try { setPatient(JSON.parse(stored)); } catch (e) {}
        }
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const h = { 'Authorization': `Bearer ${token}` };

            await Promise.allSettled([
                fetch('http://localhost:5000/api/patient/profile', { headers: h })
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d?.stats) setStats(d.stats); }),

                fetch('http://localhost:5000/api/patient/records', { headers: h })
                    .then(r => r.ok ? r.json() : null)
                    .then(d => {
                        const recs = Array.isArray(d) ? d : (d?.records || []);
                        setRecentRecords(recs.slice(0, 3));
                        setStats(prev => ({ ...prev, totalRecords: prev.totalRecords || recs.length }));
                    }),

                fetch('http://localhost:5000/api/patient/ai/health-summary', { headers: h })
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d) setAiSummary(d); }),
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTriageStyles = (priority) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'EMERGENT': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'URGENT':   return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'STABLE':   return 'bg-cyber-green/10 text-cyber-green border-cyber-green/20';
            default:         return 'bg-white/5 text-gray-400 border-white/10';
        }
    };

    const triageStatus = patient?.clinicalProfile?.triageStatus || { priority: 'STABLE', score: 0, reasons: [] };
    const healthScore  = aiSummary?.healthScore ?? triageStatus.score ?? 0;
    const scoreLabel   = aiSummary?.scoreLabel  ?? triageStatus.priority;

    const getScoreColor = (s) => {
        if (s >= 80) return 'text-cyber-green';
        if (s >= 60) return 'text-amber-400';
        if (s >= 40) return 'text-orange-400';
        return 'text-red-400';
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
            {/* Greeting */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Patient Portal</p>
                        <h1 className="text-3xl font-black text-white tracking-tighter">
                            Hello, <span className="text-cyber-blue">{patient?.firstName || 'there'}</span>
                        </h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">
                            Current status:{' '}
                            <span className={`font-black uppercase text-xs ${getTriageStyles(triageStatus.priority).split(' ')[1]}`}>
                                {triageStatus.priority}
                            </span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Last Update</p>
                        <p className="text-sm font-bold text-gray-300">
                            {triageStatus.lastAssessment ? new Date(triageStatus.lastAssessment).toLocaleDateString() : 'Just now'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Hero grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Health pulse card */}
                <div className="lg:col-span-2 bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyber-blue/5 to-cyber-purple/5 pointer-events-none" />
                    <div className="relative">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-cyber-blue/20 blur-lg rounded-xl" />
                                    <div className={`relative p-4 rounded-xl border ${getTriageStyles(triageStatus.priority)}`}>
                                        <SparklesIcon className="h-8 w-8" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-cyber-blue uppercase tracking-[0.2em] mb-1">Health Pulse</p>
                                    <h2 className="text-xl font-black text-white tracking-tight">Your Wellness Score</h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Score</p>
                                    <p className={`text-5xl font-black ${getScoreColor(healthScore)}`}>
                                        {healthScore}<span className="text-sm text-gray-500 ml-1">/100</span>
                                    </p>
                                </div>
                                <span className={`px-4 py-2 rounded-xl border text-sm font-black uppercase tracking-widest ${getTriageStyles(triageStatus.priority)}`}>
                                    {triageStatus.priority}
                                </span>
                            </div>
                        </div>

                        {triageStatus.reasons?.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="h-3 w-3 text-cyber-blue" />
                                    Observations
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {triageStatus.reasons.map((reason, idx) => (
                                        <span key={idx} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300 font-medium">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick actions */}
                <div className="bg-brand-dark-900/60 border border-white/5 rounded-2xl p-6 flex flex-col gap-3">
                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] px-1 mb-1">Quick Actions</h3>
                    {[
                        { path: '/patient/vitals',       icon: HeartIcon,         label: 'My Vitals',       color: 'cyber-blue' },
                        { path: '/patient/records',      icon: DocumentTextIcon,  label: 'My Records',      color: 'cyber-purple' },
                        { path: '/patient/surveillance', icon: BellAlertIcon,     label: 'Community Health',color: 'amber-400' },
                        { path: '/patient/trusted-providers', icon: UserGroupIcon, label: 'My Care Team',   color: 'cyber-green' },
                    ].map(btn => (
                        <button
                            key={btn.path}
                            onClick={() => navigate(btn.path)}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-brand-dark-950/60 border border-white/5 hover:border-cyber-blue/20 text-gray-300 hover:text-white transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <btn.icon className={`h-4 w-4 text-${btn.color}`} />
                                <span className="text-xs font-black">{btn.label}</span>
                            </div>
                            <ArrowRightIcon className="h-3.5 w-3.5 text-gray-600 group-hover:translate-x-1 group-hover:text-white transition-all" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Total Visit Logs', value: stats.totalRecords || recentRecords.length || 0, icon: DocumentTextIcon, color: 'text-cyber-blue' },
                    { label: 'Last Check-up',    value: stats.lastVisitDate ? new Date(stats.lastVisitDate).toLocaleDateString() : 'None', icon: CalendarIcon, color: 'text-cyber-purple' },
                    { label: 'System Status',    value: 'Live',                                           icon: CpuChipIcon,       color: 'text-cyber-green' },
                ].map((stat, i) => (
                    <div key={i} className="bg-brand-dark-900/60 border border-white/5 rounded-xl p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-xl font-black text-white">{stat.value}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-brand-dark-950 border border-white/5">
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Insights */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="h-5 w-5 text-cyber-blue" />
                        <h2 className="text-base font-black text-white uppercase tracking-tight">Smart Health Insights</h2>
                    </div>
                    <button
                        onClick={() => navigate('/patient/ai/health-summary')}
                        className="text-[9px] font-black text-cyber-blue uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Full Report →
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { path: '/patient/ai/health-summary',  icon: ChartBarIcon,       title: 'Health Score',   desc: 'AI-powered overview of your health metrics.',   color: 'text-cyber-blue',   border: 'hover:border-cyber-blue/20' },
                        { path: '/patient/ai/vitals-insights', icon: ArrowTrendingUpIcon, title: 'Vitals Trends',  desc: 'Track how your vitals change over time.',       color: 'text-cyber-purple', border: 'hover:border-cyber-purple/20' },
                        { path: '/patient/ai/reminders',       icon: BellAlertIcon,       title: 'Care Reminders', desc: 'Upcoming checkups, medications & follow-ups.', color: 'text-amber-400',    border: 'hover:border-amber-500/20' },
                    ].map(card => (
                        <div
                            key={card.path}
                            onClick={() => navigate(card.path)}
                            className={`bg-brand-dark-900/60 border border-white/5 ${card.border} rounded-xl p-6 transition-all cursor-pointer group`}
                        >
                            <div className="flex flex-col gap-4">
                                <div className="w-11 h-11 rounded-xl bg-brand-dark-950 border border-white/5 group-hover:border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <card.icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-sm uppercase tracking-tight mb-1">{card.title}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{card.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent visits */}
            {recentRecords.length > 0 && (
                <div>
                    <h2 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 px-1">Recent Visits</h2>
                    <div className="space-y-2">
                        {recentRecords.map((record, idx) => (
                            <div
                                key={idx}
                                onClick={() => navigate('/patient/records')}
                                className="bg-brand-dark-900/60 border border-white/5 hover:border-cyber-blue/20 rounded-xl p-5 flex items-center justify-between cursor-pointer transition-all group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-xl bg-brand-dark-950 border border-cyber-blue/20 flex items-center justify-center">
                                        <DocumentTextIcon className="h-5 w-5 text-cyber-blue" />
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-sm tracking-tight">
                                            {record.disease || record.primaryDiagnosis?.name || 'Medical Visit'}
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <p className="text-[9px] font-black text-gray-500 uppercase">
                                                {record.visitDate ? new Date(record.visitDate).toLocaleDateString() : 'Unknown date'}
                                            </p>
                                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                                            <p className="text-[9px] font-black text-cyber-blue/60 uppercase tracking-wider">{record.hospital || 'Facility'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        record.disposition === 'Discharged'
                                            ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20'
                                            : 'bg-white/5 text-gray-500 border border-white/5'
                                    }`}>
                                        {record.disposition || 'Completed'}
                                    </span>
                                    <ArrowRightIcon className="h-4 w-4 text-gray-600 group-hover:translate-x-1 group-hover:text-white transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
