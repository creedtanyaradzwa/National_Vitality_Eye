import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    HeartIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    InformationCircleIcon,
    ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const severityStyle = (s) => ({
    HIGH:     { bg: 'bg-red-500/15 border-red-500/30',    text: 'text-red-400',    badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
    MODERATE: { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
}[s] || { bg: 'bg-white/5 border-white/10', text: 'text-gray-300', badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30' });

const VitalCard = ({ anomaly }) => {
    const s = severityStyle(anomaly.severity);
    return (
        <div className={`rounded-xl border p-5 ${s.bg}`}>
            <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                <h3 className={`font-bold text-sm uppercase tracking-wider ${s.text}`}>{anomaly.vital}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${s.badge}`}>
                    {anomaly.severity}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Latest Reading</p>
                    <p className={`text-xl font-black ${s.text}`}>{anomaly.current}</p>
                </div>
                {anomaly.yourAverage && (
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Your Average</p>
                        <p className="text-xl font-black text-white">{anomaly.yourAverage}</p>
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-300 mb-2">{anomaly.message}</p>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                <InformationCircleIcon className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">{anomaly.action}</p>
            </div>
        </div>
    );
};

const AIVitalsInsights = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [trends, setTrends] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('anomalies');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const headers = { Authorization: `Bearer ${token}` };

            const [anomalyRes, trendRes] = await Promise.all([
                fetch(`${PORTAL_API}/ai/vitals-anomalies`, { headers }),
                fetch(`${PORTAL_API}/ai/health-trends`, { headers })
            ]);
            const [anomalyData, trendData] = await Promise.all([anomalyRes.json(), trendRes.json()]);

            if (!anomalyRes.ok) throw new Error(anomalyData.error);
            setData(anomalyData);
            setTrends(trendData);
        } catch (err) {
            toast.error('Could not load vitals insights');
        } finally {
            setLoading(false);
        }
    };

    const trendColor = (t) => ({
        IMPROVING: 'text-green-400',
        STABLE:    'text-blue-400',
        WORSENING: 'text-orange-400',
        CHANGING:  'text-yellow-400'
    }[t] || 'text-gray-400');

    const trendBg = (t) => ({
        IMPROVING: 'bg-green-500/10 border-green-500/20',
        STABLE:    'bg-blue-500/10 border-blue-500/20',
        WORSENING: 'bg-orange-500/10 border-orange-500/20',
        CHANGING:  'bg-yellow-500/10 border-yellow-500/20'
    }[t] || 'bg-white/5 border-white/10');

    const trendIcon = (t) => ({
        IMPROVING: '↑',
        STABLE:    '→',
        WORSENING: '↓',
        CHANGING:  '~'
    }[t] || '?');

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
                                <div className="absolute inset-0 rounded-2xl bg-cyber-blue/20 blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 rounded-2xl bg-brand-dark-900 border border-cyber-blue/30 flex items-center justify-center shadow-2xl">
                                    <HeartIcon className="h-8 w-8 text-cyber-blue" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Vitals Analysis Matrix</h1>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                                    Neural anomaly detection and trend projections
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={load} 
                            className="p-3 rounded-xl bg-brand-dark-900 border border-white/5 hover:border-cyber-blue/30 text-gray-500 hover:text-cyber-blue transition-all duration-300 shadow-xl"
                        >
                            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex rounded-2xl bg-brand-dark-950 p-1.5 mb-10 border border-white/5 w-fit">
                    {[
                        { key: 'anomalies', label: 'Anomaly Protocol' },
                        { key: 'trends',    label: 'Trend Matrix' }
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

                {/* ── ANOMALIES TAB ── */}
                {activeTab === 'anomalies' && data && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        {/* Status banner */}
                        <div className={`glass-card-modern p-6 border flex items-center gap-6 ${
                            data.allClear
                                ? 'border-cyber-green/20 bg-cyber-green/5'
                                : 'border-yellow-500/20 bg-yellow-500/5'
                        }`}>
                            <div className={`p-3 rounded-xl bg-brand-dark-950 border ${data.allClear ? 'border-cyber-green/30' : 'border-yellow-500/30'} shadow-2xl`}>
                                {data.allClear
                                    ? <CheckCircleIcon className="h-6 w-6 text-cyber-green animate-pulse" />
                                    : <ShieldExclamationIcon className="h-6 w-6 text-yellow-400 animate-pulse" />}
                            </div>
                            <div>
                                <p className={`text-sm font-black uppercase tracking-widest italic ${data.allClear ? 'text-cyber-green' : 'text-yellow-400'}`}>
                                    {data.message.toUpperCase()}
                                </p>
                                {data.latestDate && (
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">
                                        ANALYTICS_NODE: {data.recordsAnalyzed} SAMPLES · TIMESTAMP: {new Date(data.latestDate).toLocaleDateString().toUpperCase()}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Latest vitals quick view */}
                        {data.latestVitals && Object.keys(data.latestVitals).length > 0 && (
                            <div className="glass-card-modern p-8 border border-white/5">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-8 italic flex items-center gap-3">
                                    <div className="w-1 h-1 rounded-full bg-cyber-blue" />
                                    LIVE BIOMETRIC TELEMETRY
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Thermal', val: data.latestVitals.temperature ? `${data.latestVitals.temperature}°C` : null, warn: data.latestVitals.temperature > 38.5 },
                                        { label: 'Cardiac', val: data.latestVitals.heartRate ? `${data.latestVitals.heartRate} BPM` : null, warn: data.latestVitals.heartRate > 100 },
                                        { label: 'Pressure', val: data.latestVitals.bloodPressure?.systolic ? `${data.latestVitals.bloodPressure.systolic}/${data.latestVitals.bloodPressure.diastolic}` : null, warn: data.latestVitals.bloodPressure?.systolic > 140 },
                                        { label: 'Oxygen', val: data.latestVitals.oxygenSaturation ? `${data.latestVitals.oxygenSaturation}%` : null, warn: data.latestVitals.oxygenSaturation < 95 }
                                    ].map((v, i) => v.val && (
                                        <div key={i} className="bg-brand-dark-900 border border-white/5 rounded-2xl p-5 shadow-xl hover:border-cyber-blue/30 transition-all duration-300">
                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">{v.label}</p>
                                            <p className={`text-xl font-black italic tracking-tighter ${v.warn ? 'text-red-400' : 'text-white'}`}>
                                                {v.val}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Anomaly cards */}
                        {data.anomalies?.length > 0 ? (
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.3em] italic flex items-center gap-3">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> BIOMETRIC IRREGULARITIES DETECTED
                                </h3>
                                {data.anomalies.map((a, i) => {
                                    const s = severityStyle(a.severity);
                                    return (
                                        <div key={i} className={`glass-card-modern p-8 border transition-all duration-500 hover:scale-[1.01] ${
                                            a.severity === 'HIGH' ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
                                        }`}>
                                            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl bg-brand-dark-950 border flex items-center justify-center shadow-xl ${a.severity === 'HIGH' ? 'border-red-500/30' : 'border-yellow-500/30'}`}>
                                                        <ShieldExclamationIcon className={`h-6 w-6 ${a.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`} />
                                                    </div>
                                                    <h3 className={`text-2xl font-black italic tracking-tighter uppercase ${a.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`}>{a.vital}</h3>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${s.badge}`}>
                                                    SEVERITY_{a.severity}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div className="bg-brand-dark-950/50 rounded-2xl p-6 border border-white/5">
                                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">LAST_READING</p>
                                                    <p className={`text-3xl font-black italic tracking-tighter ${a.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`}>{a.current}</p>
                                                </div>
                                                {a.yourAverage && (
                                                    <div className="bg-brand-dark-950/50 rounded-2xl p-6 border border-white/5">
                                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">NEURAL_BASELINE</p>
                                                        <p className="text-3xl font-black text-white italic tracking-tighter">{a.yourAverage}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-6 italic">{a.message}</p>
                                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-brand-dark-900 border border-white/5 border-l-cyber-blue border-l-4">
                                                <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest italic">{a.action}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : data.hasData ? (
                            <div className="glass-card-modern py-20 text-center border border-white/5">
                                <div className="w-20 h-20 rounded-3xl bg-brand-dark-950 border border-cyber-green/30 flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                                    <CheckCircleIcon className="h-10 w-10 text-cyber-green" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Protocol Optimal</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No unusual signals detected relative to historical baseline.</p>
                            </div>
                        ) : (
                            <div className="glass-card-modern py-20 text-center border border-white/5">
                                <div className="w-20 h-20 rounded-3xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                    <HeartIcon className="h-10 w-10 text-gray-700" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Telemetry Offline</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Awaiting sequential biometric samples for analysis.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TRENDS TAB ── */}
                {activeTab === 'trends' && trends && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        {/* Summary banner */}
                        <div className="glass-card-modern p-6 border border-white/5 bg-brand-dark-900/50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed italic">
                                NEURAL_TREND_OUTPUT: {trends.summary.toUpperCase()}
                            </p>
                            {trends.hasData && (
                                <div className="flex gap-6 mt-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyber-green shadow-[0_0_10px_rgba(57,255,20,0.5)]" />
                                        <span className="text-[9px] font-black text-cyber-green uppercase tracking-[0.2em]">{trends.improvingCount} OPTIMISING</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                        <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em]">{trends.worseningCount} REGRESSING</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
                                        <span className="text-[9px] font-black text-cyber-blue uppercase tracking-[0.2em]">{(trends.trends?.length || 0) - trends.improvingCount - trends.worseningCount} STABLE</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {trends.trends?.length > 0 ? trends.trends.map((t, i) => (
                            <div key={i} className={`glass-card-modern p-8 border transition-all duration-500 ${
                                t.trend === 'IMPROVING' ? 'border-cyber-green/10 hover:border-cyber-green/30' :
                                t.trend === 'WORSENING' ? 'border-red-500/10 hover:border-red-500/30' :
                                'border-white/5 hover:border-cyber-blue/30'
                            }`}>
                                <div className="flex justify-between items-center mb-8 flex-wrap gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl bg-brand-dark-950 border flex items-center justify-center shadow-xl ${
                                            t.trend === 'IMPROVING' ? 'border-cyber-green/30' :
                                            t.trend === 'WORSENING' ? 'border-red-500/30' :
                                            'border-cyber-blue/30'
                                        }`}>
                                            <span className={`text-3xl font-black italic ${trendColor(t.trend)}`}>{trendIcon(t.trend)}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">{t.vital}</h3>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.explanation}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-1">LATEST_VALUE</p>
                                            <p className={`text-2xl font-black italic tracking-tighter ${trendColor(t.trend)}`}>{t.latestValue}</p>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            t.trend === 'IMPROVING' ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/20' :
                                            t.trend === 'WORSENING' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20'
                                        }`}>{t.trend}</span>
                                    </div>
                                </div>

                                {t.chartData?.length > 1 && (
                                    <div className="h-[150px] w-full bg-brand-dark-950/50 rounded-2xl p-4 border border-white/5">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={t.chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                                                <Line
                                                    type="monotone" dataKey="value" strokeWidth={3}
                                                    stroke={t.trend === 'IMPROVING' ? '#39ff14' : t.trend === 'WORSENING' ? '#ef4444' : '#00f2ff'}
                                                    dot={{ r: 3, fill: '#0a0a0b', strokeWidth: 2 }} activeDot={{ r: 5 }} name="Biometric Signal"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {!t.inNormalRange && (
                                    <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                                        <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest italic">OUT_OF_NOMINAL_RANGE: PROTOCOL REQUIRES CLINICAL REVIEW</p>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="glass-card-modern py-20 text-center border border-white/5">
                                <div className="w-20 h-20 rounded-3xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                    <HeartIcon className="h-10 w-10 text-gray-700" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Insufficient History</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trend analysis requires a minimum of 2 telemetry samples.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="mt-10 p-6 rounded-2xl bg-brand-dark-900 border border-white/5 border-l-cyber-blue border-l-4 flex items-start gap-4">
                    <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0" />
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        NEURAL ANALYSIS DISCLAIMER: IRREGULARITY DETECTION IS BASED ON DEVIATIONS FROM PERSONAL ARCHIVE LOGS. 
                        IT DOES NOT SUBSTITUTE FOR A PRIMARY DIAGNOSTIC PROTOCOL. 
                        CONTACT A MEDICAL PROVIDER FOR INTERPRETATION.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIVitalsInsights;
