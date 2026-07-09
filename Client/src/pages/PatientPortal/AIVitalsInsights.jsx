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
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const VitalCard = ({ anomaly }) => {
    const isHigh = anomaly.severity === 'HIGH';
    return (
        <div className={`rounded-2xl border p-6 ${isHigh ? 'bg-red-500/5 border-red-500/10' : 'bg-brand-dark-900/60 border-white/5'}`}>
            <div className="flex justify-between items-start mb-5 flex-wrap gap-2">
                <h3 className={`font-black text-[10px] uppercase tracking-widest ${isHigh ? 'text-red-400' : 'text-white'}`}>{anomaly.vital}</h3>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isHigh ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {anomaly.severity}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-brand-dark-950/60 rounded-xl p-3">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Latest</p>
                    <p className={`text-xl font-black ${isHigh ? 'text-red-400' : 'text-white'}`}>{anomaly.current}</p>
                </div>
                {anomaly.yourAverage && (
                    <div className="bg-brand-dark-950/60 rounded-xl p-3">
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Your Average</p>
                        <p className="text-xl font-black text-gray-300">{anomaly.yourAverage}</p>
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-3">{anomaly.message}</p>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-cyber-blue/5 border border-cyber-blue/10">
                <InformationCircleIcon className="h-4 w-4 text-cyber-blue flex-shrink-0 mt-0.5" />
                <p className="text-xs text-cyan-300 font-medium leading-relaxed">{anomaly.action}</p>
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
                fetch(`${PORTAL_API}/ai/health-trends`, { headers }),
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
        switch (t) {
            case 'IMPROVING': return 'text-cyber-green bg-cyber-green/10 border-cyber-green/20';
            case 'WORSENING': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'STABLE':    return 'text-cyber-blue bg-cyber-blue/10 border-cyber-blue/20';
            default:          return 'text-gray-400 bg-white/5 border-white/10';
        }
    };

    const trendColor = (t) => t === 'IMPROVING' ? '#39ff14' : t === 'WORSENING' ? '#f43f5e' : '#00f2ff';

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
                                <ChartBarIcon className="h-7 w-7 text-cyber-blue" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Vitals Insights</h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">AI analysis of your biometric data and patterns</p>
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

            {/* Tabs */}
            <div className="flex p-1 bg-brand-dark-900/60 rounded-xl border border-white/5 mb-8 w-fit">
                {[
                    { key: 'anomalies', label: 'Anomaly Checks' },
                    { key: 'trends',    label: 'Health Trends' },
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

            {/* Anomalies tab */}
            {activeTab === 'anomalies' && data && (
                <div className="space-y-6">
                    {/* Status banner */}
                    <div className={`p-5 rounded-xl border flex items-center gap-5 ${
                        data.allClear ? 'bg-cyber-green/5 border-cyber-green/10' : 'bg-amber-500/5 border-amber-500/10'
                    }`}>
                        <div className={`p-3 rounded-xl ${data.allClear ? 'bg-cyber-green/10' : 'bg-amber-500/10'}`}>
                            {data.allClear
                                ? <CheckCircleIcon className="h-7 w-7 text-cyber-green" />
                                : <ShieldExclamationIcon className="h-7 w-7 text-amber-400" />}
                        </div>
                        <div>
                            <p className={`text-sm font-black ${data.allClear ? 'text-cyber-green' : 'text-amber-400'}`}>{data.message}</p>
                            {data.latestDate && (
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    Last Analysis: {new Date(data.latestDate).toLocaleDateString()} · Based on {data.recordsAnalyzed} records
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Latest snapshot */}
                    {data.latestVitals && Object.keys(data.latestVitals).length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { label: 'Temperature',   val: data.latestVitals.temperature ? `${data.latestVitals.temperature}°C` : null },
                                { label: 'Heart Rate',    val: data.latestVitals.heartRate ? `${data.latestVitals.heartRate} BPM` : null },
                                { label: 'Blood Pressure',val: data.latestVitals.bloodPressure?.systolic ? `${data.latestVitals.bloodPressure.systolic}/${data.latestVitals.bloodPressure.diastolic}` : null },
                                { label: 'Oxygen Level',  val: data.latestVitals.oxygenSaturation ? `${data.latestVitals.oxygenSaturation}%` : null },
                            ].map((v, i) => v.val && (
                                <div key={i} className="bg-brand-dark-900/60 border border-white/5 rounded-xl p-4">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{v.label}</p>
                                    <p className="text-xl font-black text-white">{v.val}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Anomaly cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.anomalies?.map((a, i) => <VitalCard key={i} anomaly={a} />)}
                    </div>

                    {(!data.anomalies || data.anomalies.length === 0) && data.hasData && (
                        <div className="bg-brand-dark-900/40 border border-dashed border-white/10 rounded-2xl py-16 text-center">
                            <CheckCircleIcon className="h-12 w-12 text-cyber-green/20 mx-auto mb-3" />
                            <h3 className="text-base font-black text-white uppercase mb-1">Vitals are Stable</h3>
                            <p className="text-sm text-gray-500">Your health signals are within your normal ranges.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Trends tab */}
            {activeTab === 'trends' && trends && (
                <div className="space-y-4">
                    <div className="bg-brand-dark-900/60 border border-white/5 rounded-xl p-5">
                        <p className="text-sm text-gray-300 font-medium leading-relaxed italic">"{trends.summary}"</p>
                    </div>

                    {trends.trends?.map((t, i) => (
                        <div key={i} className={`bg-brand-dark-900/60 border rounded-2xl p-6 transition-all ${
                            t.trend === 'WORSENING' ? 'border-red-500/10' : 'border-white/5'
                        }`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${getTrendStyles(t.trend)}`}>
                                        {t.trend === 'IMPROVING' ? '↑' : t.trend === 'WORSENING' ? '↓' : '→'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white tracking-tight">{t.vital}</h3>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">{t.explanation}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Current</p>
                                        <p className="text-2xl font-black text-white">{t.latestValue}</p>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getTrendStyles(t.trend)}`}>
                                        {t.trend}
                                    </span>
                                </div>
                            </div>

                            {t.chartData?.length > 1 && (
                                <div className="h-[160px] w-full mt-6 pt-6 border-t border-white/5">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={t.chartData}>
                                            <defs>
                                                <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={trendColor(t.trend)} stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor={trendColor(t.trend)} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis dataKey="date" hide />
                                            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '10px' }} />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={trendColor(t.trend)}
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
            )}

            {/* Disclaimer */}
            <div className="mt-10 bg-brand-dark-900/40 border-l-4 border-l-cyber-blue border-y border-r border-white/5 rounded-xl p-5 flex items-start gap-4">
                <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0" />
                <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
                    AI ANALYSIS DISCLAIMER: This analysis detects deviations from your personal historical baseline. It is an AI-powered observation and does not constitute a clinical diagnosis. Please consult your health provider for professional interpretation.
                </p>
            </div>
        </div>
    );
};

export default AIVitalsInsights;
