import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    BellAlertIcon,
    BeakerIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    InformationCircleIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

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
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            setData(d);
        } catch (err) {
            console.error('Error loading reminders:', err);
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

    const getStatusStyles = (status) => {
        switch (status) {
            case 'OVERDUE':  return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'SOON':     return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'UPCOMING': return 'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20';
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
                                <BellAlertIcon className="h-7 w-7 text-cyber-blue" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Care Reminders</h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">Stay on top of your medications and follow-up visits</p>
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

            {/* Urgent message */}
            {data?.urgentMessage && (
                <div className={`p-5 rounded-xl border mb-8 flex items-center gap-5 ${
                    data.overdueCount > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-amber-500/5 border-amber-500/10'
                }`}>
                    <div className={`p-3 rounded-xl ${data.overdueCount > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                        <ExclamationTriangleIcon className={`h-5 w-5 ${data.overdueCount > 0 ? 'text-red-400' : 'text-amber-400'}`} />
                    </div>
                    <p className={`text-sm font-black ${data.overdueCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {data.urgentMessage}
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex p-1 bg-brand-dark-900/60 rounded-xl border border-white/5 mb-8 w-fit">
                {[
                    { key: 'followups',   label: `Visits (${data?.followUps?.length || 0})` },
                    { key: 'medications', label: `Medications (${data?.medications?.length || 0})` },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.key
                                ? 'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20'
                                : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Follow-ups */}
            {activeTab === 'followups' && (
                <div className="space-y-3">
                    {data?.followUps?.length > 0 ? data.followUps.map((f, i) => (
                        <div key={i} className={`bg-brand-dark-900/60 border rounded-2xl p-6 hover:bg-brand-dark-900/80 transition-all ${
                            f.status === 'OVERDUE' ? 'border-red-500/10' : 'border-white/5'
                        }`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-6">
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${getStatusStyles(f.status)}`}>
                                        <CalendarIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white tracking-tight">{f.forCondition}</h3>
                                        <p className="text-xs text-gray-500 font-medium">Provider: {f.provider}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(f.status)}`}>
                                    {f.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-brand-dark-950/60 rounded-xl p-4 border border-white/5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Scheduled Date</p>
                                    <p className="text-base font-black text-white">{new Date(f.date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-brand-dark-950/60 rounded-xl p-4 border border-white/5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Timeline</p>
                                    <p className={`text-base font-black ${f.status === 'OVERDUE' ? 'text-red-400' : 'text-cyber-green'}`}>
                                        {formatDaysUntil(f.daysUntil)}
                                    </p>
                                </div>
                            </div>

                            {f.instructions && (
                                <div className="bg-cyber-blue/5 border border-cyber-blue/10 rounded-xl p-4 flex items-start gap-3">
                                    <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0" />
                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">{f.instructions}</p>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="bg-brand-dark-900/40 border border-dashed border-white/10 rounded-2xl py-16 text-center">
                            <CheckCircleIcon className="h-12 w-12 text-cyber-green/20 mx-auto mb-3" />
                            <h3 className="text-base font-black text-white uppercase mb-1">No Upcoming Visits</h3>
                            <p className="text-sm text-gray-500">You're all caught up with your scheduled appointments.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Medications */}
            {activeTab === 'medications' && (
                <div>
                    {data?.medications?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.medications.map((med, i) => (
                                <div key={i} className="bg-brand-dark-900/60 border border-white/5 hover:border-cyber-blue/20 rounded-xl p-5 transition-all group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-brand-dark-950 border border-white/5 group-hover:border-cyber-blue/20 flex items-center justify-center text-cyber-blue transition-all">
                                            <BeakerIcon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-base font-black text-white">{med.name}</h3>
                                            <p className="text-xs text-gray-500 font-medium mt-1">For: {med.forCondition}</p>
                                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                                <span>Started: {new Date(med.prescribedAt).toLocaleDateString()}</span>
                                                {med.hospital && <span className="text-cyber-blue/50">{med.hospital}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-brand-dark-900/40 border border-dashed border-white/10 rounded-2xl py-16 text-center">
                            <BeakerIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                            <h3 className="text-base font-black text-white uppercase mb-1">No Active Medications</h3>
                            <p className="text-sm text-gray-500">Any prescriptions from your visits will appear here.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Disclaimer */}
            <div className="mt-10 bg-brand-dark-900/40 border-l-4 border-l-cyber-blue border-y border-r border-white/5 rounded-xl p-5 flex items-start gap-4">
                <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0" />
                <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
                    Disclaimer: These reminders are automatically synchronized from your medical records. Always confirm appointment times directly with your clinic. Do not change medication dosages without consulting your doctor.
                </p>
            </div>
        </div>
    );
};

export default AIReminders;
