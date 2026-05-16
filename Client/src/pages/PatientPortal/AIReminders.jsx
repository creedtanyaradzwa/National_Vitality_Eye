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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button onClick={() => navigate('/patient/dashboard')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
                    <ArrowLeftIcon className="h-5 w-5" /> Back to Dashboard
                </button>

                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6 flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <BellAlertIcon className="h-8 w-8 text-yellow-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Reminders & Medications</h1>
                                <p className="text-gray-400 text-sm">Follow-up appointments and active prescriptions from your records</p>
                            </div>
                        </div>
                        <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Urgent banner */}
                {data?.urgentMessage && (
                    <div className={`rounded-xl p-4 border mb-6 flex items-center gap-3 ${
                        data.overdueCount > 0
                            ? 'bg-red-500/15 border-red-500/30'
                            : 'bg-yellow-500/15 border-yellow-500/30'
                    }`}>
                        <ExclamationTriangleIcon className={`h-6 w-6 flex-shrink-0 ${data.overdueCount > 0 ? 'text-red-400' : 'text-yellow-400'}`} />
                        <p className={`font-semibold text-sm ${data.overdueCount > 0 ? 'text-red-300' : 'text-yellow-300'}`}>
                            {data.urgentMessage}
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'followups',   label: `Follow-ups (${data?.followUps?.length || 0})` },
                        { key: 'medications', label: `Medications (${data?.medications?.length || 0})` }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                                activeTab === tab.key
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── FOLLOW-UPS TAB ── */}
                {activeTab === 'followups' && (
                    <div className="space-y-4">
                        {data?.followUps?.length > 0 ? data.followUps.map((f, i) => {
                            const s = statusStyle(f.status);
                            const Icon = s.icon;
                            return (
                                <div key={i} className={`rounded-xl border p-5 ${s.bg}`}>
                                    <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${s.bg}`}>
                                                <Icon className={`h-5 w-5 ${s.text}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">{f.forCondition}</p>
                                                <p className="text-xs text-gray-400">{f.provider}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${s.badge}`}>
                                            {f.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Appointment Date</p>
                                            <p className={`font-bold text-sm ${s.text}`}>{new Date(f.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Time Until</p>
                                            <p className={`font-bold text-sm ${s.text}`}>{formatDaysUntil(f.daysUntil)}</p>
                                        </div>
                                    </div>

                                    {f.instructions && (
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                                            <InformationCircleIcon className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-300">{f.instructions}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                <p className="text-white font-semibold">No follow-up appointments found</p>
                                <p className="text-gray-500 text-sm mt-1">Follow-up reminders will appear here when your doctor schedules them</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MEDICATIONS TAB ── */}
                {activeTab === 'medications' && (
                    <div className="space-y-4">
                        {data?.medications?.length > 0 ? (
                            <>
                                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3">
                                    <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-300 leading-relaxed">
                                        These medications were prescribed across your recent visits. Always follow your doctor's instructions
                                        and do not stop or change medications without consulting your healthcare provider.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {data.medications.map((med, i) => (
                                        <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-200">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
                                                    <BeakerIcon className="h-5 w-5 text-purple-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-white text-sm truncate">{med.name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">For: {med.forCondition}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Prescribed: {new Date(med.prescribedAt).toLocaleDateString()}
                                                    </p>
                                                    {med.hospital && (
                                                        <p className="text-xs text-gray-600 mt-0.5">{med.hospital}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                                <BeakerIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-white font-semibold">No medications on record</p>
                                <p className="text-gray-500 text-sm mt-1">Prescribed medications will appear here after your visits</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Reminders are extracted from your medical records. Follow-up dates are set by your healthcare provider.
                        Always contact your clinic directly to confirm or reschedule appointments.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIReminders;
