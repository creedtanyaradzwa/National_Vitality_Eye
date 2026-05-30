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
    InformationCircleIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const AIReminders = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('followups');

    useEffect(() => {
        load();
    }, []);

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
        switch(status) {
            case 'OVERDUE': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'SOON': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'UPCOMING': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
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
                            <BellAlertIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Care Reminders</h1>
                            <p className="text-slate-400 font-medium mt-1">
                                Stay on top of your medications and follow-up visits.
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

            {/* Urgent Message */}
            {data?.urgentMessage && (
                <div className={`p-6 rounded-3xl border mb-10 flex items-center gap-6 ${
                    data.overdueCount > 0 ? 'bg-rose-500/5 border-rose-500/10' : 'bg-amber-500/5 border-amber-500/10'
                }`}>
                    <div className={`p-4 rounded-2xl ${data.overdueCount > 0 ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
                        <ExclamationTriangleIcon className={`h-6 w-6 ${data.overdueCount > 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                    </div>
                    <p className={`text-sm font-bold ${data.overdueCount > 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {data.urgentMessage}
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex p-1.5 bg-slate-900/60 rounded-2xl border border-white/5 mb-10 w-fit">
                {[
                    { key: 'followups',   label: `Visits (${data?.followUps?.length || 0})` },
                    { key: 'medications', label: `Medications (${data?.medications?.length || 0})` }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                            activeTab === tab.key
                                ? 'bg-emerald-500 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Section */}
            {activeTab === 'followups' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {data?.followUps?.length > 0 ? data.followUps.map((f, i) => (
                        <div key={i} className={`bg-slate-900/40 border border-white/5 rounded-3xl p-8 hover:bg-slate-900/60 transition-all ${
                            f.status === 'OVERDUE' ? 'border-rose-500/10' : ''
                        }`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getStatusStyles(f.status)}`}>
                                        <CalendarIcon className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">{f.forCondition}</h3>
                                        <p className="text-xs text-slate-500 font-medium">Provider: {f.provider}</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(f.status)}`}>
                                    {f.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-900/60 rounded-2xl p-6 border border-white/5 text-center md:text-left">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Scheduled Date</p>
                                    <p className="text-lg font-bold text-white">{new Date(f.date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-2xl p-6 border border-white/5 text-center md:text-left">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Timeline</p>
                                    <p className={`text-lg font-bold ${f.status === 'OVERDUE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {formatDaysUntil(f.daysUntil)}
                                    </p>
                                </div>
                            </div>

                            {f.instructions && (
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex items-start gap-4">
                                    <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                                    <p className="text-sm text-slate-300 font-medium leading-relaxed">{f.instructions}</p>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl py-20 text-center">
                            <CheckCircleIcon className="h-12 w-12 text-emerald-500/20 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-1">No Upcoming Visits</h3>
                            <p className="text-sm text-slate-500">You're all caught up with your scheduled appointments.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'medications' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {data?.medications?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.medications.map((med, i) => (
                                <div key={i} className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 hover:bg-slate-900/60 transition-all group">
                                    <div className="flex items-start gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/30 transition-all">
                                            <BeakerIcon className="h-7 w-7" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white">{med.name}</h3>
                                            <p className="text-xs text-slate-500 font-medium mt-1">For: {med.forCondition}</p>
                                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                                <span>Started: {new Date(med.prescribedAt).toLocaleDateString()}</span>
                                                {med.hospital && <span className="text-blue-400/60">{med.hospital}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl py-20 text-center">
                            <BeakerIcon className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-1">No Active Medications</h3>
                            <p className="text-sm text-slate-500">Any prescriptions from your visits will appear here as reminders.</p>
                        </div>
                    )}
                </div>
            )}

            {/* AI Disclaimer */}
            <div className="mt-12 bg-slate-900/20 border-l-4 border-blue-500 rounded-2xl p-6 flex items-start gap-4">
                <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    Disclaimer: These reminders are automatically synchronized from your medical records. 
                    Always confirm appointment times directly with your clinic. 
                    Do not change your medication dosages without consulting your doctor.
                </p>
            </div>
        </div>
    );
};

export default AIReminders;