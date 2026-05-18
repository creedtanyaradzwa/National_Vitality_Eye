import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    BellAlertIcon,
    CalendarDaysIcon,
    BeakerIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ClockIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const statusStyle = (s) => ({
    OVERDUE:  { bg: 'bg-red-500/15 border-red-500/30',    text: 'text-red-400',    badge: 'bg-red-500/20 text-red-400 border-red-500/30',    icon: ExclamationTriangleIcon },
    SOON:     { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: ClockIcon },
    UPCOMING: { bg: 'bg-blue-500/15 border-blue-500/30',   text: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   icon: CalendarDaysIcon }
}[s] || { bg: 'bg-white/5 border-white/10', text: 'text-gray-400', badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CalendarDaysIcon });

const AIReminders = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('followups');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const res = await fetch(`${PORTAL_API}/ai/reminders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            setData(d);
        } catch (err) {
            toast.error('Could not load reminders');
        } finally {
            setLoading(false);
        }
    };

    const formatDaysUntil = (days) => {
        if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `In ${days} days`;
    };

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
                                <div className="absolute inset-0 rounded-2xl bg-yellow-500/20 blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 rounded-2xl bg-brand-dark-900 border border-yellow-500/30 flex items-center justify-center shadow-2xl">
                                    <BellAlertIcon className="h-8 w-8 text-yellow-400" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Neural Protocol Feed</h1>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                                    Active prescriptions and follow-up synchronization
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={load} 
                            className="p-3 rounded-xl bg-brand-dark-900 border border-white/5 hover:border-yellow-500/30 text-gray-500 hover:text-yellow-400 transition-all duration-300 shadow-xl"
                        >
                            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Urgent banner */}
                {data?.urgentMessage && (
                    <div className={`glass-card-modern p-6 border mb-10 flex items-center gap-6 animate-pulse ${
                        data.overdueCount > 0
                            ? 'border-red-500/20 bg-red-500/5'
                            : 'border-yellow-500/20 bg-yellow-500/5'
                    }`}>
                        <div className={`p-3 rounded-xl bg-brand-dark-950 border ${data.overdueCount > 0 ? 'border-red-500/30' : 'border-yellow-500/30'} shadow-2xl`}>
                            <ExclamationTriangleIcon className={`h-6 w-6 ${data.overdueCount > 0 ? 'text-red-400' : 'text-yellow-400'}`} />
                        </div>
                        <p className={`text-sm font-black uppercase tracking-widest italic ${data.overdueCount > 0 ? 'text-red-300' : 'text-yellow-300'}`}>
                            {data.urgentMessage.toUpperCase()}
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex rounded-2xl bg-brand-dark-950 p-1.5 mb-10 border border-white/5 w-fit">
                    {[
                        { key: 'followups',   label: `Sync Appointments (${data?.followUps?.length || 0})` },
                        { key: 'medications', label: `Active Protocols (${data?.medications?.length || 0})` }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                activeTab === tab.key
                                    ? 'bg-brand-dark-800 text-white shadow-lg border border-white/10'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── FOLLOW-UPS TAB ── */}
                {activeTab === 'followups' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        {data?.followUps?.length > 0 ? data.followUps.map((f, i) => {
                            const s = statusStyle(f.status);
                            const Icon = s.icon;
                            return (
                                <div key={i} className={`glass-card-modern p-8 border transition-all duration-500 hover:scale-[1.01] ${s.bg}`}>
                                    <div className="flex justify-between items-start flex-wrap gap-6 mb-8">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl bg-brand-dark-950 border flex items-center justify-center shadow-xl ${s.badge}`}>
                                                <Icon className={`h-7 w-7 ${s.text}`} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">{f.forCondition}</h3>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PROV: {f.provider.toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${s.badge}`}>
                                            STATUS_{f.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="bg-brand-dark-950/50 rounded-2xl p-6 border border-white/5">
                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">APPOINTMENT_TIMESTAMP</p>
                                            <p className={`text-xl font-black italic tracking-tighter ${s.text}`}>{new Date(f.date).toLocaleDateString().toUpperCase()}</p>
                                        </div>
                                        <div className="bg-brand-dark-950/50 rounded-2xl p-6 border border-white/5">
                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">TELEMETRY_COUNTDOWN</p>
                                            <p className={`text-xl font-black italic tracking-tighter ${s.text}`}>{formatDaysUntil(f.daysUntil).toUpperCase()}</p>
                                        </div>
                                    </div>

                                    {f.instructions && (
                                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-brand-dark-900 border border-white/5 border-l-cyber-blue border-l-4">
                                            <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest italic leading-relaxed">{f.instructions}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="glass-card-modern py-20 text-center border border-white/5">
                                <div className="w-20 h-20 rounded-3xl bg-brand-dark-950 border border-cyber-green/30 flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                                    <CheckCircleIcon className="h-10 w-10 text-cyber-green" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Queue Clear</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No scheduled follow-up protocols identified.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MEDICATIONS TAB ── */}
                {activeTab === 'medications' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        {data?.medications?.length > 0 ? (
                            <>
                                <div className="p-6 rounded-2xl bg-brand-dark-900 border border-white/5 border-l-cyber-purple/50 border-l-4 flex items-start gap-4 mb-8">
                                    <InformationCircleIcon className="h-5 w-5 text-cyber-purple flex-shrink-0" />
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                        PROTOCOL_ADVISORY: THESE BIO-CHEMICAL AGENTS WERE RECORDED IN RECENT CLINICAL ENCOUNTERS. 
                                        FOLLOW PRESCRIBED DOSAGE SEQUENCES EXACTLY. DO NOT DE-TERMINATE WITHOUT PRACTITIONER CONSENT.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {data.medications.map((med, i) => (
                                        <div key={i} className="glass-card-modern p-6 border border-white/5 hover:border-cyber-purple/30 transition-all duration-300 group">
                                            <div className="flex items-start gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-brand-dark-950 border border-white/5 flex items-center justify-center shadow-xl group-hover:border-cyber-purple/30 transition-all duration-500">
                                                    <BeakerIcon className="h-7 w-7 text-cyber-purple group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter italic truncate">{med.name}</h3>
                                                    <p className="text-[10px] font-bold text-cyber-blue uppercase tracking-widest mt-1">FOR: {med.forCondition.toUpperCase()}</p>
                                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                                        <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">INIT: {new Date(med.prescribedAt).toLocaleDateString().toUpperCase()}</p>
                                                        {med.hospital && (
                                                            <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">{med.hospital.toUpperCase()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="glass-card-modern py-20 text-center border border-white/5">
                                <div className="w-20 h-20 rounded-3xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                    <BeakerIcon className="h-10 w-10 text-gray-700" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">No Active Protocols</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No bio-chemical prescriptions found in recent archives.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="mt-10 p-6 rounded-2xl bg-brand-dark-900 border border-white/5 border-l-cyber-blue border-l-4 flex items-start gap-4">
                    <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0" />
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        SYNCHRONIZATION DISCLAIMER: REMINDERS ARE DERIVED FROM ARCHIVED CLINICAL LOGS. 
                        APPOINTMENT TIMESTAMPS ARE SUBJECT TO FACILITY VALIDATION. 
                        DIRECT CONTACT WITH THE NODE PROVIDER IS MANDATORY FOR PROTOCOL CHANGES.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIReminders;
