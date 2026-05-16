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
    ArrowTrendingUpIcon
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
            case 'CRITICAL': return 'bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            case 'EMERGENT': return 'bg-orange-500/20 text-orange-500 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
            case 'URGENT': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case 'STABLE': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const triageStatus = patient?.clinicalProfile?.triageStatus || { priority: 'STABLE', score: 0, reasons: [] };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Patient Portal</h1>
                                <p className="text-gray-400">Welcome back, {patient?.firstName || 'Patient'} {patient?.lastName || ''}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Predictive Triage Priority Card */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-500 p-[1px] mb-8 group">
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]"></div>
                    <div className="relative rounded-2xl bg-slate-900/90 backdrop-blur-xl p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center space-x-4">
                                <div className={`p-4 rounded-2xl ${getTriageStyles(triageStatus.priority)} animate-pulse`}>
                                    <SparklesIcon className="h-8 w-8" />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Clinical Intelligence</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Live Assessment</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-white mt-1 uppercase tracking-tight">Your Health Priority Status</h2>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 w-full md:w-auto">
                                <div className="flex-1 md:flex-none text-right">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Vitality Score</p>
                                    <p className="text-3xl font-black text-white">{triageStatus.score || 0}</p>
                                </div>
                                <div className={`px-6 py-3 rounded-xl border font-black tracking-widest text-lg ${getTriageStyles(triageStatus.priority)}`}>
                                    {triageStatus.priority}
                                </div>
                            </div>
                        </div>

                        {triageStatus.reasons && triageStatus.reasons.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <div className="flex items-center space-x-2 mb-3">
                                    <ExclamationTriangleIcon className="h-4 w-4 text-cyan-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clinical Indicators detected by AI</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {triageStatus.reasons.map((reason, idx) => (
                                        <span 
                                            key={idx}
                                            className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-300 uppercase"
                                        >
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-gray-600">
                            <span>LAST UPDATED: {triageStatus.lastAssessment ? new Date(triageStatus.lastAssessment).toLocaleString() : 'PENDING'}</span>
                            <span className="flex items-center">
                                <ShieldCheckIcon className="h-3 w-3 mr-1 text-green-500/50" />
                                AUTOMATED CLINICAL TRIAGE
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Records</p>
                                <p className="text-3xl font-bold text-white">{stats.totalRecords || recentRecords.length || 0}</p>
                            </div>
                            <DocumentTextIcon className="h-10 w-10 text-purple-400" />
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Last Visit</p>
                                <p className="text-lg font-bold text-white">
                                    {stats.lastVisitDate ? new Date(stats.lastVisitDate).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                            <CalendarIcon className="h-10 w-10 text-purple-400" />
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Profile Status</p>
                                <p className="text-lg font-bold text-white">Active</p>
                            </div>
                            <UserIcon className="h-10 w-10 text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Medical Records Card */}
                    <div 
                        className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/30 transition cursor-pointer group"
                        onClick={() => navigate('/patient/records')}
                    >
                        <DocumentTextIcon className="h-12 w-12 text-purple-400 mb-4 group-hover:scale-110 transition" />
                        <h3 className="text-xl font-semibold text-white mb-2">Medical Records</h3>
                        <p className="text-gray-400">View your complete medical history including diagnoses, lab results, and imaging</p>
                        <ArrowRightIcon className="h-5 w-5 text-purple-400 mt-4 group-hover:translate-x-1 transition" />
                    </div>
                    
                    {/* Vital Signs Card */}
                    <div 
                        className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/30 transition cursor-pointer group"
                        onClick={() => navigate('/patient/vitals')}
                    >
                        <HeartIcon className="h-12 w-12 text-purple-400 mb-4 group-hover:scale-110 transition" />
                        <h3 className="text-xl font-semibold text-white mb-2">Vital Signs</h3>
                        <p className="text-gray-400">Track your health metrics over time with interactive charts</p>
                        <ArrowRightIcon className="h-5 w-5 text-purple-400 mt-4 group-hover:translate-x-1 transition" />
                    </div>
                </div>

                {/* ── AI FEATURES HUB ── */}
                <div className="mt-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                            <SparklesIcon className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">AI Health Features</h2>
                            <p className="text-xs text-gray-500">Personalised insights powered by your medical data</p>
                        </div>
                    </div>

                    {/* Quick health score strip */}
                    {aiSummary && (
                        <div className={`rounded-xl border p-4 mb-5 flex items-center justify-between flex-wrap gap-3 ${
                            aiSummary.scoreColor === 'green'  ? 'bg-green-500/10 border-green-500/20' :
                            aiSummary.scoreColor === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20' :
                            aiSummary.scoreColor === 'orange' ? 'bg-orange-500/10 border-orange-500/20' :
                            'bg-red-500/10 border-red-500/20'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`text-3xl font-black ${
                                    aiSummary.scoreColor === 'green'  ? 'text-green-400' :
                                    aiSummary.scoreColor === 'yellow' ? 'text-yellow-400' :
                                    aiSummary.scoreColor === 'orange' ? 'text-orange-400' : 'text-red-400'
                                }`}>{aiSummary.healthScore}</div>
                                <div>
                                    <p className="text-white font-bold text-sm">Health Score — {aiSummary.scoreLabel}</p>
                                    <p className="text-xs text-gray-400">Triage: {aiSummary.triagePriority} · {aiSummary.warnings?.length || 0} warning{aiSummary.warnings?.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/patient/ai/health-summary')}
                                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition font-medium"
                            >
                                Full Summary <ArrowRightIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            {
                                path: '/patient/ai/health-summary',
                                icon: ChartBarIcon,
                                title: 'Health Summary',
                                desc: 'AI-generated overview of your health score, triage status, and key findings',
                                color: 'text-purple-400',
                                border: 'hover:border-purple-500/40'
                            },
                            {
                                path: '/patient/ai/vitals-insights',
                                icon: ArrowTrendingUpIcon,
                                title: 'Vitals Insights',
                                desc: 'Anomaly detection and trend analysis on your vital sign history',
                                color: 'text-pink-400',
                                border: 'hover:border-pink-500/40'
                            },
                            {
                                path: '/patient/ai/reminders',
                                icon: BellAlertIcon,
                                title: 'Reminders',
                                desc: 'Follow-up appointments and active medications from your records',
                                color: 'text-yellow-400',
                                border: 'hover:border-yellow-500/40'
                            },
                            {
                                path: '/patient/ai/symptom-checker',
                                icon: MagnifyingGlassIcon,
                                title: 'Symptom Checker',
                                desc: 'Enter your symptoms and get AI guidance on when to seek care',
                                color: 'text-cyan-400',
                                border: 'hover:border-cyan-500/40'
                            }
                        ].map(card => (
                            <div
                                key={card.path}
                                onClick={() => navigate(card.path)}
                                className={`bg-white/5 rounded-xl p-5 border border-white/10 ${card.border} transition-all duration-200 cursor-pointer group`}
                            >
                                <div className="flex items-start gap-3">
                                    <card.icon className={`h-8 w-8 ${card.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-200`} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-sm mb-1">{card.title}</h3>
                                        <p className="text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                                    </div>
                                    <ArrowRightIcon className="h-4 w-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 mt-0.5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Records Section */}
                {recentRecords.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Recent Medical Records</h2>
                        <div className="space-y-3">
                            {recentRecords.map((record, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                                    onClick={() => navigate('/patient/records')}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white">{record.disease || record.primaryDiagnosis?.name || 'Medical Visit'}</p>
                                            <p className="text-sm text-gray-400">{record.visitDate ? new Date(record.visitDate).toLocaleDateString() : 'Date N/A'}</p>
                                            <p className="text-xs text-gray-500">{record.hospital || 'Hospital N/A'}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                            record.disposition === 'Discharged' ? 'bg-green-500/20 text-green-400' : 
                                            record.disposition === 'Admitted' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                            {record.disposition || 'Completed'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDashboard;