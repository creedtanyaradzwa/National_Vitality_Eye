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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button onClick={() => navigate('/patient/dashboard')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
                    <ArrowLeftIcon className="h-5 w-5" /> Back to Dashboard
                </button>

                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6 flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <HeartIcon className="h-8 w-8 text-pink-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Vitals AI Insights</h1>
                                <p className="text-gray-400 text-sm">Anomaly detection and trend analysis on your vital signs</p>
                            </div>
                        </div>
                        <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'anomalies', label: 'Anomaly Alerts' },
                        { key: 'trends',    label: 'Trend Analysis' }
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

                {/* ── ANOMALIES TAB ── */}
                {activeTab === 'anomalies' && data && (
                    <div className="space-y-5">
                        {/* Status banner */}
                        <div className={`rounded-xl p-4 border flex items-center gap-3 ${
                            data.allClear
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-yellow-500/10 border-yellow-500/20'
                        }`}>
                            {data.allClear
                                ? <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0" />
                                : <ShieldExclamationIcon className="h-6 w-6 text-yellow-400 flex-shrink-0" />}
                            <div>
                                <p className={`font-bold text-sm ${data.allClear ? 'text-green-300' : 'text-yellow-300'}`}>
                                    {data.message}
                                </p>
                                {data.latestDate && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Based on {data.recordsAnalyzed} records · Latest: {new Date(data.latestDate).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Latest vitals quick view */}
                        {data.latestVitals && Object.keys(data.latestVitals).length > 0 && (
                            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Latest Recorded Vitals</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {data.latestVitals.temperature && (
                                        <div className="bg-white/5 rounded-lg p-3 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase">Temp</p>
                                            <p className={`text-lg font-black ${data.latestVitals.temperature > 38.5 ? 'text-red-400' : 'text-white'}`}>
                                                {data.latestVitals.temperature}°C
                                            </p>
                                        </div>
                                    )}
                                    {data.latestVitals.heartRate && (
                                        <div className="bg-white/5 rounded-lg p-3 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase">Heart Rate</p>
                                            <p className={`text-lg font-black ${data.latestVitals.heartRate > 100 ? 'text-orange-400' : 'text-white'}`}>
                                                {data.latestVitals.heartRate} bpm
                                            </p>
                                        </div>
                                    )}
                                    {data.latestVitals.bloodPressure?.systolic && (
                                        <div className="bg-white/5 rounded-lg p-3 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase">Blood Pressure</p>
                                            <p className={`text-lg font-black ${data.latestVitals.bloodPressure.systolic > 140 ? 'text-red-400' : 'text-white'}`}>
                                                {data.latestVitals.bloodPressure.systolic}/{data.latestVitals.bloodPressure.diastolic}
                                            </p>
                                        </div>
                                    )}
                                    {data.latestVitals.oxygenSaturation && (
                                        <div className="bg-white/5 rounded-lg p-3 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase">O₂ Sat</p>
                                            <p className={`text-lg font-black ${data.latestVitals.oxygenSaturation < 95 ? 'text-red-400' : 'text-white'}`}>
                                                {data.latestVitals.oxygenSaturation}%
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Anomaly cards */}
                        {data.anomalies?.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Detected Anomalies</h3>
                                {data.anomalies.map((a, i) => <VitalCard key={i} anomaly={a} />)}
                            </div>
                        ) : data.hasData ? (
                            <div className="text-center py-10 bg-white/5 rounded-xl border border-white/10">
                                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                <p className="text-white font-semibold">All vitals look normal</p>
                                <p className="text-gray-500 text-sm mt-1">No unusual readings compared to your personal baseline</p>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white/5 rounded-xl border border-white/10">
                                <HeartIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No vital sign records found yet</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TRENDS TAB ── */}
                {activeTab === 'trends' && trends && (
                    <div className="space-y-5">
                        {/* Summary banner */}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                            <p className="text-sm text-gray-300">{trends.summary}</p>
                            {trends.hasData && (
                                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                                    <span className="text-green-400 font-bold">{trends.improvingCount} improving</span>
                                    <span className="text-orange-400 font-bold">{trends.worseningCount} worsening</span>
                                    <span className="text-blue-400 font-bold">{(trends.trends?.length || 0) - trends.improvingCount - trends.worseningCount} stable</span>
                                </div>
                            )}
                        </div>

                        {trends.trends?.length > 0 ? trends.trends.map((t, i) => (
                            <div key={i} className={`rounded-xl border p-5 ${trendBg(t.trend)}`}>
                                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-2xl font-black ${trendColor(t.trend)}`}>{trendIcon(t.trend)}</span>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">{t.vital}</h3>
                                            <p className="text-xs text-gray-400">{t.explanation}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 uppercase">Latest</p>
                                            <p className={`text-lg font-black ${trendColor(t.trend)}`}>{t.latestValue}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                            t.trend === 'IMPROVING' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                            t.trend === 'WORSENING' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                            'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        }`}>{t.trend}</span>
                                    </div>
                                </div>

                                {t.chartData?.length > 1 && (
                                    <ResponsiveContainer width="100%" height={120}>
                                        <LineChart data={t.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} tick={{ fill: '#94a3b8' }} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tick={{ fill: '#94a3b8' }} width={35} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                                            <Line
                                                type="monotone" dataKey="value" strokeWidth={2}
                                                stroke={t.trend === 'IMPROVING' ? '#10b981' : t.trend === 'WORSENING' ? '#f97316' : '#3b82f6'}
                                                dot={{ r: 3 }} name={t.vital}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}

                                {!t.inNormalRange && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
                                        <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                        Latest reading is outside the normal range — mention this to your doctor.
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-10 bg-white/5 rounded-xl border border-white/10">
                                <HeartIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">Not enough records to analyse trends yet</p>
                                <p className="text-gray-500 text-sm mt-1">Trends appear after 2 or more visits with recorded vitals</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Anomaly detection compares your latest readings against your own historical baseline.
                        This is not a medical diagnosis. Always consult your doctor for medical advice.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIVitalsInsights;
