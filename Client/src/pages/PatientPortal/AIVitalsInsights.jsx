import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    HeartIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    InformationCircleIcon,
    ShieldExclamationIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const VitalCard = ({ anomaly }) => {
    const isHigh = anomaly.severity === 'HIGH';
    return (
        <div className={`rounded-3xl border p-6 ${isHigh ? 'bg-rose-500/5 border-rose-500/10' : 'bg-slate-900/40 border-white/5'}`}>
            <div className="flex justify-between items-start mb-6 flex-wrap gap-2">
                <h3 className={`font-bold text-sm uppercase tracking-widest ${isHigh ? 'text-rose-400' : 'text-white'}`}>{anomaly.vital}</h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isHigh ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {anomaly.severity}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/60 rounded-2xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Latest</p>
                    <p className={`text-xl font-bold ${isHigh ? 'text-rose-400' : 'text-white'}`}>{anomaly.current}</p>
                </div>
                {anomaly.yourAverage && (
                    <div className="bg-slate-900/60 rounded-2xl p-4">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Your Average</p>
                        <p className="text-xl font-bold text-slate-300">{anomaly.yourAverage}</p>
                    </div>
                )}
            </div>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-4">{anomaly.message}</p>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300 font-medium leading-relaxed">{anomaly.action}</p>
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

    useEffect(() => {
        load();
    }, []);

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
            console.error('Error loading insights:', err);
            toast.error('Could not load vitals insights');
        } finally {
            setLoading(false);
        }
    };

    const getTrendStyles = (t) => {
        switch(t) {
            case 'IMPROVING': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'WORSENING': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'STABLE':    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default:          return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
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
                            <ChartBarIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Vitals Insights</h1>
                            <p className="text-slate-400 font-medium mt-1">
                                AI analysis of your biometric data and patterns.
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

            {/* Tabs */}
            <div className="flex p-1.5 bg-slate-900/60 rounded-2xl border border-white/5 mb-10 w-fit">
                {[
                    { key: 'anomalies', label: 'Anomaly Checks' },
                    { key: 'trends',    label: 'Health Trends' }
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
            {activeTab === 'anomalies' && data && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Status Header */}
                    <div className={`p-6 rounded-3xl border flex items-center gap-6 ${
                        data.allClear
                            ? 'bg-emerald-500/5 border-emerald-500/10'
                            : 'bg-amber-500/5 border-amber-500/10'
                    }`}>
                        <div className={`p-4 rounded-2xl ${data.allClear ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                            {data.allClear
                                ? <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
                                : <ShieldExclamationIcon className="h-8 w-8 text-amber-400" />}
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${data.allClear ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {data.message}
                            </p>
                            {data.latestDate && (
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    Last Analysis: {new Date(data.latestDate).toLocaleDateString()} · Based on {data.recordsAnalyzed} records
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Latest Snapshot Grid */}
                    {data.latestVitals && Object.keys(data.latestVitals).length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Temperature', val: data.latestVitals.temperature ? `${data.latestVitals.temperature}°C` : null },
                                { label: 'Heart Rate', val: data.latestVitals.heartRate ? `${data.latestVitals.heartRate} BPM` : null },
                                { label: 'Blood Pressure', val: data.latestVitals.bloodPressure?.systolic ? `${data.latestVitals.bloodPressure.systolic}/${data.latestVitals.bloodPressure.diastolic}` : null },
                                { label: 'Oxygen Level', val: data.latestVitals.oxygenSaturation ? `${data.latestVitals.oxygenSaturation}%` : null }
                            ].map((v, i) => v.val && (
                                <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{v.label}</p>
                                    <p className="text-xl font-bold text-white">{v.val}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Anomalies List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.anomalies?.map((a, i) => (
                            <VitalCard key={i} anomaly={a} />
                        ))}
                    </div>

                    {(!data.anomalies || data.anomalies.length === 0) && data.hasData && (
                        <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl py-20 text-center">
                            <CheckCircleIcon className="h-12 w-12 text-emerald-500/20 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-1">Vitals are Stable</h3>
                            <p className="text-sm text-slate-500">Your health signals are currently within your normal ranges.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'trends' && trends && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
                        <p className="text-sm text-slate-300 font-medium leading-relaxed italic">
                            " {trends.summary} "
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {trends.trends?.map((t, i) => (
                            <div key={i} className={`bg-slate-900/40 border rounded-3xl p-8 transition-all hover:border-white/10 ${
                                t.trend === 'WORSENING' ? 'border-rose-500/10' : 'border-white/5'
                            }`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl ${getTrendStyles(t.trend)}`}>
                                            {t.trend === 'IMPROVING' ? '↑' : t.trend === 'WORSENING' ? '↓' : '→'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{t.vital}</h3>
                                            <p className="text-xs text-slate-400 font-medium">{t.explanation}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-8 w-full md:w-auto">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current</p>
                                            <p className="text-2xl font-bold text-white">{t.latestValue}</p>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTrendStyles(t.trend)}`}>
                                            {t.trend}
                                        </div>
                                    </div>
                                </div>

                                {t.chartData?.length > 1 && (
                                    <div className="h-[180px] w-full mt-8 pt-8 border-t border-white/5">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={t.chartData}>
                                                <defs>
                                                    <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={t.trend === 'IMPROVING' ? '#10b981' : t.trend === 'WORSENING' ? '#f43f5e' : '#3b82f6'} stopOpacity={0.1}/>
                                                        <stop offset="95%" stopColor={t.trend === 'IMPROVING' ? '#10b981' : t.trend === 'WORSENING' ? '#f43f5e' : '#3b82f6'} stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="value" 
                                                    stroke={t.trend === 'IMPROVING' ? '#10b981' : t.trend === 'WORSENING' ? '#f43f5e' : '#3b82f6'} 
                                                    fillOpacity={1} 
                                                    fill={`url(#grad-${i})`} 
                                                    strokeWidth={3} 
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Disclaimer */}
            <div className="mt-12 bg-slate-900/20 border-l-4 border-blue-500 rounded-2xl p-6 flex items-start gap-4">
                <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    NEURAL ANALYSIS DISCLAIMER: This analysis detects deviations from your personal historical baseline. 
                    It is an AI-powered observation and does not constitute a clinical diagnosis. 
                    Please consult your health provider for professional interpretation.
                </p>
            </div>
        </div>
    );
};

export default AIVitalsInsights;