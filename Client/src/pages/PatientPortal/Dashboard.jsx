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
    MagnifyingGlassIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    CpuChipIcon
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
        const patientData = localStorage.getItem('patient');
        if (patientData) {
            try {
                setPatient(JSON.parse(patientData));
            } catch (e) {
                console.error('Error parsing patient data:', e);
            }
        }
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const token = localStorage.getItem('patientToken');
            
            if (!token) {
                console.log('No token found, redirecting to login');
                navigate('/patient/login');
                return;
            }
            
            // Load profile stats
            try {
                const profileRes = await fetch('http://localhost:5000/api/patient/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    if (profileData.stats) {
                        setStats(profileData.stats);
                    }
                }
            } catch (err) {
                console.error('Error loading profile:', err);
            }
            
            // Load recent records
            try {
                const recordsRes = await fetch('http://localhost:5000/api/patient/records', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const recordsData = await recordsRes.json();
                if (recordsRes.ok && Array.isArray(recordsData)) {
                    setRecentRecords(recordsData.slice(0, 3));
                    if (!stats.totalRecords && recordsData.length) {
                        setStats(prev => ({ ...prev, totalRecords: recordsData.length }));
                    }
                } else if (recordsRes.ok && recordsData.records) {
                    const records = Array.isArray(recordsData.records) ? recordsData.records : [];
                    setRecentRecords(records.slice(0, 3));
                }
            } catch (err) {
                console.error('Error loading records:', err);
            }

            // Load AI health summary (non-blocking)
            try {
                const aiRes = await fetch('http://localhost:5000/api/patient/ai/health-summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (aiRes.ok) {
                    const aiData = await aiRes.json();
                    setAiSummary(aiData);
                }
            } catch (err) {
                // AI summary is optional — don't block dashboard load
                console.error('AI summary unavailable:', err);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patient');
        navigate('/patient/login');
    };

    const getTriageStyles = (priority) => {
        switch(priority) {
            case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'EMERGENT': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'URGENT': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'STABLE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const triageStatus = patient?.clinicalProfile?.triageStatus || { priority: 'STABLE', score: 0, reasons: [] };

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
            {/* Friendly Greeting Section */}
            <div className="mb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Hello, <span className="text-emerald-400">{patient?.firstName || 'there'}</span>
                        </h1>
                        <p className="text-slate-400 font-medium">
                            Your health status is currently <span className="text-emerald-400 font-bold">{triageStatus.priority.toLowerCase()}</span>.
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Last Update</p>
                        <p className="text-sm font-semibold text-slate-300">
                            {triageStatus.lastAssessment ? new Date(triageStatus.lastAssessment).toLocaleDateString() : 'Just now'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                
                {/* Health Pulse Card */}
                <div className="lg:col-span-2 relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div className="flex items-center space-x-6">
                                <div className={`p-5 rounded-2xl border ${getTriageStyles(triageStatus.priority)} shadow-lg`}>
                                    <SparklesIcon className="h-10 w-10" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Health Pulse</p>
                                    <h2 className="text-2xl font-bold text-white">Your Wellness Score</h2>
                                </div>
                            </div>

                            <div className="flex items-center space-x-8">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vitality Score</p>
                                    <p className="text-4xl font-bold text-white">{triageStatus.score || 0}<span className="text-xs text-slate-500 ml-1">/100</span></p>
                                </div>
                                <div className={`px-6 py-3 rounded-2xl border font-bold text-lg ${getTriageStyles(triageStatus.priority)} shadow-inner`}>
                                    {triageStatus.priority}
                                </div>
                            </div>
                        </div>

                        {triageStatus.reasons && triageStatus.reasons.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-2 text-emerald-400" />
                                    Observations
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {triageStatus.reasons.map((reason, idx) => (
                                        <span key={idx} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions Hub */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider px-2">Quick Actions</h3>
                    <button 
                        onClick={() => navigate('/patient/vitals')}
                        className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all group"
                    >
                        <div className="flex items-center space-x-3">
                            <HeartIcon className="h-5 w-5" />
                            <span className="font-bold">Log My Vitals</span>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                        onClick={() => navigate('/patient/records')}
                        className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all group"
                    >
                        <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-5 w-5" />
                            <span className="font-bold">My Records</span>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                        className="flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all group opacity-50 cursor-not-allowed"
                    >
                        <div className="flex items-center space-x-3">
                            <BellAlertIcon className="h-5 w-5" />
                            <span className="font-bold">Health Assistant</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20">Coming Soon</span>
                    </button>
                </div>
            </div>

            {/* Health Statistics Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[
                    { label: 'Total Visit Logs', value: stats.totalRecords || recentRecords.length || 0, icon: DocumentTextIcon, color: 'text-emerald-400' },
                    { label: 'Last Check-up', value: stats.lastVisitDate ? new Date(stats.lastVisitDate).toLocaleDateString() : 'None found', icon: CalendarIcon, color: 'text-blue-400' },
                    { label: 'Cloud Sync', value: 'Live', icon: CpuChipIcon, color: 'text-indigo-400' }
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-xl font-bold text-white">{stat.value}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Insights Gallery */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center space-x-3">
                        <SparklesIcon className="h-6 w-6 text-emerald-400" />
                        <h2 className="text-xl font-bold text-white">Smart Health Insights</h2>
                    </div>
                    <button onClick={() => navigate('/patient/ai/health-summary')} className="text-xs font-bold text-emerald-400 hover:underline underline-offset-4">
                        View Detailed Report
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { path: '/patient/ai/health-summary', icon: ChartBarIcon, title: 'Health Score', desc: 'A summary of your overall health metrics.', color: 'text-emerald-400' },
                        { path: '/patient/ai/vitals-insights', icon: ArrowTrendingUpIcon, title: 'Vitals Trends', desc: 'Seeing how your body changes over time.', color: 'text-blue-400' },
                        { path: '/patient/ai/reminders', icon: BellAlertIcon, title: 'Care Tasks', desc: 'Upcoming checkups and healthy habits.', color: 'text-amber-400' },
                        { path: '/patient/ai/symptom-checker', icon: MagnifyingGlassIcon, title: 'Symptom Guide', desc: 'Get help understanding how you feel.', color: 'text-rose-400' }
                    ].map(card => (
                        <div
                            key={card.path}
                            onClick={() => navigate(card.path)}
                            className="bg-slate-900/40 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-6 transition-all cursor-pointer group"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <card.icon className={`h-6 w-6 ${card.color}`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-1">{card.title}</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{card.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Visits Section */}
            {recentRecords.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-white mb-6 px-2">Recent Visits</h2>
                    <div className="space-y-3">
                        {recentRecords.map((record, idx) => (
                            <div 
                                key={idx} 
                                className="bg-slate-900/40 border border-white/5 hover:bg-slate-900/60 rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-colors"
                                onClick={() => navigate('/patient/records')}
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-emerald-500/20 flex items-center justify-center">
                                        <DocumentTextIcon className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">{record.disease || record.primaryDiagnosis?.name || 'Medical Visit'}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <p className="text-xs font-bold text-slate-500">{record.visitDate ? new Date(record.visitDate).toLocaleDateString() : 'Date missing'}</p>
                                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                            <p className="text-xs font-bold text-blue-400/80 uppercase tracking-wider">{record.hospital || 'Facility'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        record.disposition === 'Discharged' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                        'bg-slate-800 text-slate-400 border border-white/5'
                                    }`}>
                                        {record.disposition || 'Completed'}
                                    </span>
                                    <ArrowRightIcon className="h-5 w-5 text-slate-600" />
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