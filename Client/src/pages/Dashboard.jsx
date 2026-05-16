import React, { useState, useEffect, useCallback } from 'react';
import {
    getTopDiseases,
    getProvinceStats,
    getPatientCount,
    getDiseaseInsights,
    getDiseaseAnalytics,
    getDiseaseTrends
} from '../services/api';
import { useAlerts } from '../context/AlertProvider';
import { useDataRefresh } from '../context/useDataRefresh';
import StatsCards from '../components/dashboard/StatsCards';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import DiseaseChart from '../components/dashboard/DiseaseChart';
import {
    SparklesIcon,
    ArrowPathIcon,
    CpuChipIcon,
    MapIcon,
    BeakerIcon,
    FireIcon,
    ChartBarIcon,
    UserGroupIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    HeartIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [patientCount, setPatientCount]       = useState(0);
    const [totalCases, setTotalCases]           = useState(0);
    const [diseasesTracked, setDiseasesTracked] = useState(0);
    const [provincesActive, setProvincesActive] = useState(0);
    const [topDiseases, setTopDiseases]         = useState([]);
    const [provinceStats, setProvinceStats]     = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [lastUpdated, setLastUpdated]         = useState(new Date());

    // Disease focus state
    const [selectedDisease, setSelectedDisease]     = useState('');
    const [diseaseInsights, setDiseaseInsights]     = useState(null);
    const [diseaseAnalytics, setDiseaseAnalytics]   = useState(null);
    const [diseaseTrends, setDiseaseTrends]         = useState([]);
    const [diseaseLoading, setDiseaseLoading]       = useState(false);

    const { activeAlerts } = useAlerts();
    const { refreshTrigger, refreshData } = useDataRefresh();

    // ── Load system-wide data ──────────────────────────────────────────────
    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, diseasesRes, provinceRes] = await Promise.all([
                getPatientCount(),
                getTopDiseases(),
                getProvinceStats()
            ]);

            setPatientCount(patientRes.data?.count || 0);

            const diseases = diseasesRes.data || [];
            setTopDiseases(diseases);
            setTotalCases(diseases.reduce((sum, d) => sum + d.count, 0));
            setDiseasesTracked(new Set(diseases.map(d => d._id)).size);

            const provinces = provinceRes.data || [];
            setProvinceStats(provinces);
            setProvincesActive(provinces.length);

            // Default to highest-cases disease
            if (diseases.length > 0 && !selectedDisease) {
                setSelectedDisease(diseases[0]._id);
            }

            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [selectedDisease]);

    useEffect(() => {
        loadDashboardData();
    }, [refreshTrigger]);                           // eslint-disable-line

    // ── Load per-disease data whenever selection changes ──────────────────
    useEffect(() => {
        if (!selectedDisease) return;
        const load = async () => {
            setDiseaseLoading(true);
            try {
                const [insightsRes, analyticsRes, trendsRes] = await Promise.all([
                    getDiseaseInsights(selectedDisease),
                    getDiseaseAnalytics(selectedDisease),
                    getDiseaseTrends(selectedDisease)
                ]);
                setDiseaseInsights(insightsRes.data);
                setDiseaseAnalytics(analyticsRes.data);
                setDiseaseTrends(trendsRes.data || []);
            } catch (err) {
                console.error('Failed to load disease data', err);
            } finally {
                setDiseaseLoading(false);
            }
        };
        load();
    }, [selectedDisease]);

    // ── Derived disease stats for StatsCards ──────────────────────────────
    const getDiseaseStats = () => {
        if (!diseaseAnalytics) return null;
        const da = diseaseAnalytics;
        const discharged = da.outcomes?.['Discharged']?.count || 0;
        const admitted   = da.outcomes?.['Admitted']?.count   || 0;
        const deceased   = da.outcomes?.['Deceased']?.count   || 0;
        const total      = da.totalCases || 1;
        return {
            totalCases:     da.totalCases,
            growthRate:     da.growthRate,
            recoveryRate:   Math.round((discharged / total) * 100),
            admissionRate:  Math.round((admitted   / total) * 100),
            mortalityRate:  Math.round((deceased   / total) * 100),
            hotspot:        da.provinceBreakdown?.[0]?.province || 'N/A',
            hotspotCases:   da.provinceBreakdown?.[0]?.count    || 0,
            riskLevel:      diseaseInsights?.summary?.riskLevel || 'MODERATE'
        };
    };

    const stats = {
        totalPatients:   patientCount,
        totalCases,
        diseasesTracked,
        provincesActive
    };

    // ── Loading screen ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark-950">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyber-blue/20 rounded-full animate-spin border-t-cyber-blue" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <CpuChipIcon className="h-6 w-6 text-cyber-blue animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const diseaseStats = getDiseaseStats();

    return (
        <div className="min-h-screen bg-brand-dark-950">

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-brand-dark-900/50 border-b border-white/5 py-10">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cyber-blue/5 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1/4 h-full bg-gradient-to-r from-cyber-purple/5 to-transparent pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-dark-800 border border-cyber-blue/30 shadow-[0_0_20px_rgba(0,242,255,0.1)] flex items-center justify-center">
                                <SparklesIcon className="h-6 w-6 text-cyber-blue" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                    Clinical Intelligence
                                </h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyber-green animate-pulse" />
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">System Operational</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Disease selector — prominent, defaults to highest cases */}
                            <div className="flex items-center gap-2 bg-brand-dark-800/60 border border-purple-500/30 rounded-xl px-3 py-2">
                                <BeakerIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest hidden sm:block">Focus:</span>
                                <select
                                    value={selectedDisease}
                                    onChange={(e) => setSelectedDisease(e.target.value)}
                                    className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                                >
                                    {topDiseases.map((d, i) => (
                                        <option key={d._id} value={d._id} className="bg-slate-900">
                                            {d._id}{i === 0 ? ' ★' : ''}
                                        </option>
                                    ))}
                                </select>
                                {diseaseLoading && (
                                    <div className="w-3 h-3 border-2 border-purple-500/30 rounded-full animate-spin border-t-purple-500" />
                                )}
                            </div>

                            <div className="flex items-center gap-3 p-1 rounded-2xl bg-brand-dark-800/50 border border-white/5">
                                <div className="px-3 py-1.5 border-r border-white/5">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Last Sync</p>
                                    <p className="text-xs text-gray-300 font-mono">
                                        {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </p>
                                </div>
                                <button
                                    onClick={refreshData}
                                    className="mr-1 p-2 rounded-xl bg-brand-dark-700 hover:bg-brand-dark-600 border border-white/5 text-gray-400 hover:text-cyber-blue transition-all duration-300"
                                >
                                    <ArrowPathIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* Stats cards (system-wide + disease-specific row) */}
                <StatsCards
                    stats={stats}
                    diseaseStats={diseaseStats}
                    selectedDisease={selectedDisease}
                />

                {/* AI Decision Support banner — shown when insights are loaded */}
                {diseaseInsights && !diseaseLoading && (
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/25 p-5">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 animate-pulse">
                                    <SparklesIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                                        Neural Analytics Engine · Live Decision Support
                                    </p>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tight">
                                        AI Insights — {selectedDisease}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Confidence</p>
                                    <p className="text-xl font-black text-white">{diseaseInsights.aiConfidence?.toFixed(0)}%</p>
                                </div>
                                <span className={`px-3 py-1.5 rounded-xl border font-black tracking-widest text-xs ${
                                    diseaseInsights.summary?.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                    diseaseInsights.summary?.riskLevel === 'HIGH'     ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }`}>
                                    {diseaseInsights.summary?.riskLevel} RISK
                                </span>
                            </div>
                        </div>

                        {/* Quick metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Monthly Growth</p>
                                <p className={`text-xl font-black ${diseaseInsights.summary?.growthRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {diseaseInsights.summary?.growthRate > 0 ? '+' : ''}{diseaseInsights.summary?.growthRate}%
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Primary Hotspot</p>
                                <div className="flex items-center gap-1.5">
                                    <MapIcon className="h-4 w-4 text-purple-400" />
                                    <p className="text-sm font-black text-white uppercase">{diseaseInsights.summary?.hotspot}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Target Age Group</p>
                                <div className="flex items-center gap-1.5">
                                    <UserGroupIcon className="h-4 w-4 text-pink-400" />
                                    <p className="text-sm font-black text-white uppercase">{diseaseInsights.summary?.primaryAgeGroup}</p>
                                </div>
                            </div>
                            {/* Vital signs highlight */}
                            {diseaseAnalytics?.vitalsProfile?.temperature && (
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Avg Temperature</p>
                                    <div className="flex items-center gap-1.5">
                                        <HeartIcon className="h-4 w-4 text-red-400" />
                                        <p className={`text-xl font-black ${diseaseAnalytics.vitalsProfile.temperature > 37.5 ? 'text-red-400' : 'text-white'}`}>
                                            {diseaseAnalytics.vitalsProfile.temperature}°C
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI Recommendations */}
                        {diseaseInsights.recommendations?.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {diseaseInsights.recommendations.slice(0, 4).map((rec, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200">
                                        <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                                            rec.type === 'URGENT' || rec.type === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                            rec.type === 'PREVENTION' ? 'bg-green-500/20 text-green-400' :
                                            'bg-purple-500/20 text-purple-400'
                                        }`}>
                                            <SparklesIcon className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-0.5">{rec.title}</p>
                                            <p className="text-[11px] text-gray-400 leading-relaxed">{rec.action}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Charts + Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <RecentAlerts
                            alerts={activeAlerts || []}
                            selectedDisease={selectedDisease}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <DiseaseChart
                            data={topDiseases || []}
                            selectedDisease={selectedDisease}
                            onSelectDisease={setSelectedDisease}
                            diseaseTrends={diseaseTrends}
                        />
                    </div>
                </div>

                {/* Disease symptoms + outcomes quick view */}
                {diseaseAnalytics && !diseaseLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* Top symptoms */}
                        <div className="rounded-2xl bg-brand-dark-900/60 border border-white/5 p-5">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ChartBarIcon className="h-4 w-4 text-cyan-400" />
                                Top Symptoms — {selectedDisease}
                            </h3>
                            {diseaseAnalytics.topSymptoms?.length > 0 ? (
                                <div className="space-y-2.5">
                                    {diseaseAnalytics.topSymptoms.slice(0, 6).map((s) => (
                                        <div key={s.symptom}>
                                            <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-gray-300 capitalize">{s.symptom}</span>
                                                <span className="text-white font-bold">{s.percentage}%</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                                    style={{ width: `${s.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-6">No symptom data</p>
                            )}
                        </div>

                        {/* Outcomes */}
                        <div className="rounded-2xl bg-brand-dark-900/60 border border-white/5 p-5">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                                Patient Outcomes
                            </h3>
                            {Object.keys(diseaseAnalytics.outcomes || {}).length > 0 ? (
                                <div className="space-y-3">
                                    {Object.entries(diseaseAnalytics.outcomes).map(([outcome, data]) => {
                                        const color =
                                            outcome === 'Discharged' ? 'from-green-500 to-emerald-500' :
                                            outcome === 'Admitted'   ? 'from-yellow-500 to-orange-500' :
                                            outcome === 'Deceased'   ? 'from-red-600 to-red-700' :
                                            'from-blue-500 to-cyan-500';
                                        return (
                                            <div key={outcome}>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                    <span className="text-gray-300">{outcome}</span>
                                                    <span className="text-white font-bold">
                                                        {data.count} <span className="text-gray-500">({data.percentage}%)</span>
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${data.percentage}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-6">No outcome data</p>
                            )}
                        </div>

                        {/* Province breakdown for selected disease */}
                        <div className="rounded-2xl bg-brand-dark-900/60 border border-white/5 p-5">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapIcon className="h-4 w-4 text-purple-400" />
                                Province Breakdown
                            </h3>
                            {diseaseAnalytics.provinceBreakdown?.length > 0 ? (
                                <div className="space-y-2">
                                    {diseaseAnalytics.provinceBreakdown.slice(0, 6).map((p, idx) => (
                                        <div key={p.province} className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-600 w-3">{idx + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-[11px] mb-0.5">
                                                    <span className="text-gray-300">{p.province}</span>
                                                    <span className="text-white font-bold">{p.count}</span>
                                                </div>
                                                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                        style={{ width: `${p.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-6">No province data</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Regional Distribution — all diseases */}
                {provinceStats.length > 0 && (
                    <div className="relative rounded-3xl overflow-hidden bg-brand-dark-900 border border-white/5 p-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyber-purple/5 blur-[100px] pointer-events-none" />
                        <h2 className="text-base font-bold text-white mb-6 flex items-center gap-3">
                            <MapIcon className="h-5 w-5 text-cyber-purple" />
                            Regional Distribution — All Diseases
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {provinceStats.map((prov) => (
                                <div
                                    key={prov._id}
                                    className="group relative overflow-hidden rounded-2xl p-4 bg-brand-dark-800/40 border border-white/5 hover:border-cyber-purple/30 transition-all duration-500"
                                >
                                    <h3 className="font-medium text-gray-500 text-[10px] uppercase tracking-widest mb-1">{prov._id}</h3>
                                    <p className="text-2xl font-bold text-white tracking-tighter">{prov.total}</p>
                                    <div className="mt-3 h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyber-purple to-cyber-blue rounded-full transition-all duration-1000 group-hover:brightness-125"
                                            style={{ width: `${totalCases > 0 ? Math.min((prov.total / totalCases) * 100, 100) : 0}%` }}
                                        />
                                    </div>
                                    {/* Top disease for this province */}
                                    {prov.diseases?.[0] && (
                                        <p className="text-[9px] text-gray-600 mt-2 truncate">
                                            Top: {prov.diseases.sort((a, b) => b.cases - a.cases)[0]?.name}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Dashboard;
