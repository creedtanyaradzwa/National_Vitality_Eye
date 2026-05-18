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
        <div className="min-h-screen bg-brand-dark-950 text-gray-200">
            {/* Futuristic Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="glass-card-modern p-6 mb-8 border border-white/5">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-2xl bg-cyber-purple/20 blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 rounded-2xl bg-brand-dark-900 border border-cyber-purple/30 flex items-center justify-center shadow-2xl">
                                    <UserIcon className="h-8 w-8 text-cyber-purple" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                    Patient <span className="text-cyber-purple">Portal</span>
                                </h1>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                    Subject: {patient?.firstName || 'User'} {patient?.lastName || ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-2.5 rounded-xl bg-brand-dark-900 border border-red-500/30 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.05)]"
                        >
                            De-Authenticate
                        </button>
                    </div>
                </div>

                {/* AI Predictive Triage Priority Card */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-cyber-purple to-cyber-blue p-[1px] mb-8 group">
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]"></div>
                    <div className="relative rounded-2xl bg-brand-dark-950/90 backdrop-blur-xl p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div className="flex items-center space-x-6">
                                <div className={`p-5 rounded-2xl border ${getTriageStyles(triageStatus.priority)} animate-pulse shadow-2xl`}>
                                    <SparklesIcon className="h-10 w-10" />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyber-blue">Neural Assessment</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600">Active Stream</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-white mt-1 uppercase tracking-tighter italic">Live Health Priority</h2>
                                </div>
                            </div>

                            <div className="flex items-center space-x-6 w-full md:w-auto">
                                <div className="flex-1 md:flex-none text-right">
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Vitality Matrix</p>
                                    <p className="text-4xl font-black text-white italic">{triageStatus.score || 0}<span className="text-sm text-gray-600 ml-1">v-pts</span></p>
                                </div>
                                <div className={`px-8 py-4 rounded-2xl border font-black tracking-widest text-xl italic shadow-2xl ${getTriageStyles(triageStatus.priority)}`}>
                                    {triageStatus.priority}
                                </div>
                            </div>
                        </div>

                        {triageStatus.reasons && triageStatus.reasons.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <div className="flex items-center space-x-2 mb-4">
                                    <ExclamationTriangleIcon className="h-4 w-4 text-cyber-blue" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Clinical Patterns Identified</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {triageStatus.reasons.map((reason, idx) => (
                                        <span 
                                            key={idx}
                                            className="px-4 py-1.5 rounded-full bg-brand-dark-900 border border-white/5 text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:border-cyber-blue/30 transition-colors"
                                        >
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-between text-[9px] font-bold text-gray-700 tracking-widest">
                            <span>TIMESTAMP: {triageStatus.lastAssessment ? new Date(triageStatus.lastAssessment).toLocaleString().toUpperCase() : 'PENDING'}</span>
                            <span className="flex items-center">
                                <ShieldCheckIcon className="h-3 w-3 mr-2 text-cyber-blue/50" />
                                AI-DRIVEN TRIAGE PROTOCOL v4.0
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[
                        { label: 'Total Records', value: stats.totalRecords || recentRecords.length || 0, icon: DocumentTextIcon, color: 'text-cyber-purple' },
                        { label: 'Last Visit', value: stats.lastVisitDate ? new Date(stats.lastVisitDate).toLocaleDateString() : 'N/A', icon: CalendarIcon, color: 'text-cyber-blue' },
                        { label: 'Node Status', value: 'ACTIVE', icon: CpuChipIcon, color: 'text-cyber-green' }
                    ].map((stat, i) => (
                        <div key={i} className="stat-card group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-black text-white italic tracking-tighter">{stat.value}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center justify-center group-hover:border-cyber-purple/30 transition-all duration-500 shadow-xl">
                                    <stat.icon className={`h-6 w-6 ${stat.color} group-hover:scale-110 transition-transform`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div 
                        className="glass-card-modern p-8 group cursor-pointer border border-white/5 hover:border-cyber-purple/30"
                        onClick={() => navigate('/patient/records')}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-brand-dark-950 border border-white/5 flex items-center justify-center shadow-xl group-hover:border-cyber-purple/30 transition-all duration-500">
                                <DocumentTextIcon className="h-8 w-8 text-cyber-purple group-hover:scale-110 transition-transform" />
                            </div>
                            <ArrowRightIcon className="h-6 w-6 text-gray-700 group-hover:text-cyber-purple group-hover:translate-x-2 transition-all duration-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">Clinical Archives</h3>
                        <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-widest">Access your complete biometric history, laboratory findings, and diagnostic protocols.</p>
                    </div>
                    
                    <div 
                        className="glass-card-modern p-8 group cursor-pointer border border-white/5 hover:border-cyber-blue/30"
                        onClick={() => navigate('/patient/vitals')}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-brand-dark-950 border border-white/5 flex items-center justify-center shadow-xl group-hover:border-cyber-blue/30 transition-all duration-500">
                                <HeartIcon className="h-8 w-8 text-cyber-blue group-hover:scale-110 transition-transform" />
                            </div>
                            <ArrowRightIcon className="h-6 w-6 text-gray-700 group-hover:text-cyber-blue group-hover:translate-x-2 transition-all duration-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">Vitals Monitor</h3>
                        <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-widest">Real-time analysis of physiological metrics and historical trend visualisation.</p>
                    </div>
                </div>

                {/* ── AI FEATURES HUB ── */}
                <div className="mt-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-brand-dark-900 border border-cyber-purple/30 flex items-center justify-center shadow-xl">
                            <SparklesIcon className="h-6 w-6 text-cyber-purple animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">AI Augmentation Core</h2>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Subject-specific health intelligence protocols</p>
                        </div>
                    </div>

                    {/* Quick health score strip */}
                    {aiSummary && (
                        <div className={`glass-card-modern p-6 mb-8 border flex items-center justify-between flex-wrap gap-6 hover:translate-y-0 ${
                            aiSummary.scoreColor === 'green'  ? 'border-cyber-green/20 hover:border-cyber-green/40' :
                            aiSummary.scoreColor === 'yellow' ? 'border-yellow-500/20 hover:border-yellow-500/40' :
                            aiSummary.scoreColor === 'orange' ? 'border-orange-500/20 hover:border-orange-500/40' :
                            'border-red-500/20 hover:border-red-500/40'
                        }`}>
                            <div className="flex items-center gap-6">
                                <div className={`text-4xl font-black italic ${
                                    aiSummary.scoreColor === 'green'  ? 'text-cyber-green' :
                                    aiSummary.scoreColor === 'yellow' ? 'text-yellow-400' :
                                    aiSummary.scoreColor === 'orange' ? 'text-orange-400' : 'text-red-400'
                                }`}>{aiSummary.healthScore}<span className="text-xs text-gray-600 ml-1 font-bold">PTS</span></div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Health Matrix Score</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-black text-white uppercase tracking-tighter italic">{aiSummary.scoreLabel}</p>
                                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{aiSummary.warnings?.length || 0} Indicators Flagged</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/patient/ai/health-summary')}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-dark-900 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-cyber-purple hover:text-cyber-blue hover:border-cyber-blue/30 transition-all duration-300 shadow-xl"
                            >
                                Analysis Report <ArrowRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { path: '/patient/ai/health-summary', icon: ChartBarIcon, title: 'Health Score', desc: 'Neural analysis of biometric markers and clinical history.', color: 'text-cyber-purple', border: 'hover:border-cyber-purple/30' },
                            { path: '/patient/ai/vitals-insights', icon: ArrowTrendingUpIcon, title: 'Trend Matrix', desc: 'Anomaly detection and multi-vector trend projections.', color: 'text-cyber-pink', border: 'hover:border-cyber-pink/30' },
                            { path: '/patient/ai/reminders', icon: BellAlertIcon, title: 'Active Stream', desc: 'Real-time protocol reminders and follow-up tracking.', color: 'text-yellow-400', border: 'hover:border-yellow-400/30' },
                            { path: '/patient/ai/symptom-checker', icon: MagnifyingGlassIcon, title: 'Neural Triage', desc: 'AI-guided assessment for emergent symptom protocols.', color: 'text-cyber-blue', border: 'hover:border-cyber-blue/30' }
                        ].map(card => (
                            <div
                                key={card.path}
                                onClick={() => navigate(card.path)}
                                className={`glass-card-modern p-6 border border-white/5 ${card.border} transition-all duration-500 cursor-pointer group`}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center justify-center shadow-xl group-hover:border-cyber-purple/30 transition-all duration-500">
                                        <card.icon className={`h-6 w-6 ${card.color} group-hover:scale-110 transition-transform duration-500`} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-sm uppercase tracking-tighter italic mb-1">{card.title}</h3>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{card.desc}</p>
                                    </div>
                                    <div className="pt-2">
                                        <ArrowRightIcon className="h-4 w-4 text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all duration-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Records Section */}
                {recentRecords.length > 0 && (
                    <div className="mt-16">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-brand-dark-900 border border-white/5 flex items-center justify-center shadow-xl">
                                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Recent Logs</h2>
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Chronological clinical records stream</p>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            {recentRecords.map((record, idx) => (
                                <div 
                                    key={idx} 
                                    className="glass-card-modern p-5 border border-white/5 hover:border-white/10 group cursor-pointer"
                                    onClick={() => navigate('/patient/records')}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center justify-center shadow-xl">
                                                <span className="text-[10px] font-black text-cyber-purple italic">#{idx + 1}</span>
                                            </div>
                                            <div>
                                                <p className="font-black text-white uppercase tracking-tighter italic text-lg">{record.disease || record.primaryDiagnosis?.name || 'Medical Visit'}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{record.visitDate ? new Date(record.visitDate).toLocaleDateString().toUpperCase() : 'DATE_MISSING'}</p>
                                                    <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                                    <p className="text-[9px] font-bold text-cyber-blue uppercase tracking-widest">{record.hospital || 'UNKNOWN_FACILITY'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                record.disposition === 'Discharged' ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/20' : 
                                                record.disposition === 'Admitted' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-brand-dark-900 text-gray-500 border-white/5'
                                            }`}>
                                                {record.disposition || 'COMPLETED'}
                                            </span>
                                            <ArrowRightIcon className="h-5 w-5 text-gray-700 group-hover:text-white transition-colors" />
                                        </div>
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