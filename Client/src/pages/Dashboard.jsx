import React, { useState, useEffect, useCallback } from 'react';
import {
    getPatientCount, getTopDiseases, getAllDiseases, getProvinceStats,
    getDiseaseInsights, getDiseaseAnalytics, getDiseaseTrends,
    getGlobalSummary, getSystemLoad, getCommunityReports
} from '../services/api';
import { useAlerts } from '../context/AlertProvider.jsx';
import { useDataRefresh } from '../context/DataRefreshProvider.jsx';
import StatsCards from '../components/dashboard/StatsCards';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import DiseaseChart from '../components/dashboard/DiseaseChart';
import CitizenSignalsFeed from '../components/dashboard/CitizenSignalsFeed';
import {
    SparklesIcon, ArrowPathIcon, CpuChipIcon, MapIcon, BeakerIcon,
    FireIcon, ChartBarIcon, UserGroupIcon, ArrowTrendingUpIcon,
    ArrowTrendingDownIcon, CheckCircleIcon, ShieldCheckIcon,
    BellAlertIcon, HeartIcon, DocumentTextIcon, SignalIcon,
    GlobeAltIcon, BoltIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { toGrowthIndex, clampPercent } from '../utils/analyticsHelpers.js';

const Dashboard = () => {
    const [patientCount, setPatientCount]           = useState(0);
    const [totalCases, setTotalCases]               = useState(0);
    const [diseasesTracked, setDiseasesTracked]     = useState(0);
    const [provincesActive, setProvincesActive]     = useState(0);
    const [topDiseases, setTopDiseases]             = useState([]);
    const [availableDiseases, setAvailableDiseases] = useState([]);
    const [provinceStats, setProvinceStats]         = useState([]);
    const [systemLoad, setSystemLoad]               = useState(null);
    const [loading, setLoading]                     = useState(true);
    const [lastUpdated, setLastUpdated]             = useState(new Date());
    const [citizenSignals, setCitizenSignals]       = useState([]);
    const [signalsLoading, setSignalsLoading]       = useState(false);
    const [selectedDisease, setSelectedDisease]     = useState('');
    const [diseaseInsights, setDiseaseInsights]     = useState(null);
    const [diseaseAnalytics, setDiseaseAnalytics]   = useState(null);
    const [diseaseTrends, setDiseaseTrends]         = useState([]);
    const [diseaseLoading, setDiseaseLoading]       = useState(false);

    const { activeAlerts, subscribeToRooms } = useAlerts();
    const { refreshTrigger, refreshData } = useDataRefresh();

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, diseasesRes, allDiseasesRes, provinceRes, summaryRes, loadRes] = await Promise.all([
                getPatientCount(), getTopDiseases(), getAllDiseases(),
                getProvinceStats(), getGlobalSummary(), getSystemLoad()
            ]);
            setPatientCount(patientRes.data?.count || 0);
            const topD = diseasesRes.data || [];
            setTopDiseases(topD);
            setTotalCases(summaryRes.data?.totalCases || 0);
            setDiseasesTracked(summaryRes.data?.diseasesTracked || 0);
            setProvincesActive(summaryRes.data?.provincesActive || 0);
            setProvinceStats(provinceRes.data?.provinces || []);
            const allD = allDiseasesRes.data || [];
            setAvailableDiseases(allD);
            setSystemLoad(loadRes.data);
            if (topD.length > 0 && !selectedDisease) setSelectedDisease(topD[0]._id);
            else if (allD.length > 0 && !selectedDisease) setSelectedDisease(allD[0]._id);
            setLastUpdated(new Date());
            setSignalsLoading(true);
            getCommunityReports({ limit: 20, sort: 'recent' })
                .then(r => setCitizenSignals(r.data?.reports || r.data || []))
                .catch(() => setCitizenSignals([]))
                .finally(() => setSignalsLoading(false));
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [selectedDisease]);

    useEffect(() => { loadDashboardData(); }, [refreshTrigger]); // eslint-disable-line

    useEffect(() => {
        subscribeToRooms(['all-alerts']);
        const handleAIUpdate = () => loadDashboardData();
        window.addEventListener('ai-stats-update', handleAIUpdate);
        return () => window.removeEventListener('ai-stats-update', handleAIUpdate);
    }, []); // eslint-disable-line

    useEffect(() => {
        if (!selectedDisease) return;
        const load = async () => {
            setDiseaseLoading(true);
            try {
                const fetchInsights = async () => {
                    try { const r = await getDiseaseInsights(selectedDisease); setDiseaseInsights(r.data); }
                    catch (e) { setDiseaseInsights(null); }
                };
                const fetchAnalytics = async () => {
                    try { const r = await getDiseaseAnalytics(selectedDisease); setDiseaseAnalytics(r.data); }
                    catch (e) { setDiseaseAnalytics(null); }
                };
                const fetchTrends = async () => {
                    try { const r = await getDiseaseTrends(selectedDisease); setDiseaseTrends(r.data || []); }
                    catch (e) { setDiseaseTrends([]); }
                };
                await Promise.all([fetchInsights(), fetchAnalytics(), fetchTrends()]);
            } catch (err) {
                console.error('Failed to load disease data', err);
            } finally {
                setDiseaseLoading(false);
            }
        };
        load();
    }, [selectedDisease]);

    const getDiseaseStats = () => {
        if (!diseaseAnalytics) return null;
        const da = diseaseAnalytics;
        const discharged = da.outcomes?.['Discharged']?.count || 0;
        const admitted   = da.outcomes?.['Admitted']?.count   || 0;
        const deceased   = da.outcomes?.['Deceased']?.count   || 0;
        const total      = da.totalCases || 1;
        return {
            totalCases:   da.totalCases,
            growthRate:   da.growthRate,
            growthIndex:  da.growthIndex ?? toGrowthIndex(da.growthRate),
            recoveryRate: Math.round((discharged / total) * 100),
            admissionRate:Math.round((admitted   / total) * 100),
            mortalityRate:Math.round((deceased   / total) * 100),
            hotspot: (() => {
                if (da.primaryHotspots?.length && da.hotspot) return da.hotspot;
                const pb = da.provinceBreakdown || [];
                if (!pb.length) return 'N/A';
                const max = Math.max(...pb.map(p => p.count));
                return pb.filter(p => p.count === max).map(p => p.province).join(' & ');
            })(),
            hotspotCases: da.hotspotCases ?? da.provinceBreakdown?.[0]?.count ?? 0,
            riskLevel:    diseaseInsights?.summary?.riskLevel || 'MODERATE',
        };
    };

    const stats = {
        totalPatients: patientCount, totalClinicalEvents: totalCases,
        diseasesTracked, provincesActive, activeAlerts: activeAlerts?.length || 0,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark-950 gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyber-blue/20 rounded-full animate-spin border-t-cyber-blue" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <CpuChipIcon className="h-6 w-6 text-cyber-blue animate-pulse" />
                    </div>
                </div>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Loading Clinical Intelligence...</p>
            </div>
        );
    }

    const diseaseStats = getDiseaseStats();
    const growthIdx = diseaseStats?.growthIndex ?? 50;
    const riskLevel = diseaseStats?.riskLevel ?? 'MODERATE';
    const isUrgent  = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';

    const riskBadgeClass =
        riskLevel === 'CRITICAL' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
        riskLevel === 'HIGH'     ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
        riskLevel === 'MODERATE' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                                   'bg-cyber-green/15 text-cyber-green border-cyber-green/30';

    return (
        <div className="min-h-screen bg-brand-dark-950 pb-12">

            {/* -------------------------------------------------------
                SECTION 1 � HEADER BAND
            ------------------------------------------------------- */}
            <div className="relative overflow-hidden bg-brand-dark-900/80 border-b border-white/5 py-5 px-4">
                {/* Ambient glows */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-cyber-blue/5 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-cyber-purple/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
                </div>

                <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

                    {/* -- LEFT: Wordmark + status -- */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-brand-dark-800 border border-cyber-blue/40
                                            shadow-[0_0_24px_rgba(0,242,255,0.15)] flex items-center justify-center">
                                <ShieldCheckIcon className="h-6 w-6 text-cyber-blue" />
                            </div>
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-cyber-green border-2 border-brand-dark-900 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.35em] mb-0.5">
                                National Vitality Eye
                            </p>
                            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
                                Clinical Intelligence Overview
                            </h1>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyber-green animate-pulse" />
                                    <span className="text-[10px] font-bold text-cyber-green uppercase tracking-widest">System Online</span>
                                </div>
                                {activeAlerts?.length > 0 && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
                                        <BellAlertIcon className="h-3 w-3 text-red-400" />
                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                            {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* -- CENTER: Disease focus selector -- */}
                    <div className="flex items-center gap-2 bg-brand-dark-800/80 border border-purple-500/40
                                    rounded-2xl px-4 py-2.5 shadow-[0_0_20px_rgba(139,92,246,0.1)]
                                    hover:border-purple-500/60 transition-all duration-300 cursor-pointer">
                        <BeakerIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest hidden sm:block">Focus Disease:</span>
                        <select
                            value={selectedDisease}
                            onChange={e => setSelectedDisease(e.target.value)}
                            className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer max-w-[200px] md:max-w-none"
                        >
                            {availableDiseases
                                .sort((a, b) => a._id.localeCompare(b._id))
                                .map(d => <option key={d._id} value={d._id} className="bg-gray-900">{d._id}</option>)
                            }
                        </select>
                        {diseaseLoading && (
                            <div className="w-3 h-3 border-2 border-purple-500/30 rounded-full animate-spin border-t-purple-400 flex-shrink-0" />
                        )}
                    </div>

                    {/* -- RIGHT: Sync time + refresh + version badge -- */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-dark-800/60 border border-white/5">
                            <div>
                                <p className="text-[9px] uppercase tracking-widest font-bold text-gray-600 mb-0.5">Last Sync</p>
                                <p className="text-[11px] text-gray-300 font-mono tabular-nums leading-none">
                                    {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                            </div>
                            <button
                                onClick={refreshData}
                                className="p-2 rounded-lg bg-brand-dark-700 hover:bg-cyber-blue/10 border border-white/5
                                           hover:border-cyber-blue/30 text-gray-400 hover:text-cyber-blue transition-all duration-300"
                                title="Refresh data"
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-brand-dark-800/60 border border-cyber-blue/20
                                        flex items-center gap-2 shadow-[0_0_12px_rgba(0,242,255,0.06)]">
                            <CpuChipIcon className="h-3.5 w-3.5 text-cyber-blue flex-shrink-0" />
                            <span className="text-[10px] font-black text-cyber-blue uppercase tracking-widest whitespace-nowrap">v5.0 � EDLIZ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* -------------------------------------------------------
                MAIN CONTENT AREA
            ------------------------------------------------------- */}
            <div className="max-w-7xl mx-auto px-4 py-7 space-y-7">

                {/* -- SECTION 2: SYSTEM STATS ROW -- */}
                <StatsCards stats={stats} diseaseStats={diseaseStats} selectedDisease={selectedDisease} />

                {/* -- SECTION 3: DISEASE INTELLIGENCE PANEL -- */}
                {diseaseStats && (
                    <div className="relative rounded-2xl overflow-hidden bg-brand-dark-900/60 border border-white/5 p-6"
                         style={{ borderLeft: '3px solid transparent', borderImage: 'linear-gradient(to bottom, #a855f7, #ec4899) 1' }}>
                        {/* Gradient left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-l-2xl" />

                        {/* Top row: disease name + risk badge + AI confidence */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pl-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-lg font-black text-white tracking-tight uppercase">{selectedDisease}</h2>
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${riskBadgeClass}`}>
                                    {riskLevel}
                                </span>
                            </div>
                            {diseaseInsights?.summary?.confidence != null && (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25">
                                    <SparklesIcon className="h-3 w-3 text-purple-400" />
                                    <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">
                                        AI Confidence: {diseaseInsights.summary.confidence}%
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 6-tile grid (2 rows x 3 cols) */}
                        <div className="pl-3 grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">

                            {/* Tile 1: Total Cases */}
                            <div className="rounded-xl bg-brand-dark-800/60 border border-white/5 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Total Cases</p>
                                <p className="text-3xl font-black text-white tracking-tighter leading-none">
                                    {(diseaseStats.totalCases ?? 0).toLocaleString()}
                                </p>
                                <div className="mt-3 h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyber-blue rounded-full" style={{ width: '100%' }} />
                                </div>
                            </div>

                            {/* Tile 2: Outbreak Index */}
                            <div className="rounded-xl bg-brand-dark-800/60 border border-white/5 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Outbreak Index</p>
                                <p className={`text-3xl font-black tracking-tighter leading-none ${isUrgent ? 'text-red-400' : 'text-cyber-blue'}`}>
                                    {(growthIdx / 100).toFixed(2)}
                                </p>
                                <div className="mt-3 h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-cyber-blue'}`}
                                         style={{ width: `${clampPercent(growthIdx)}%` }} />
                                </div>
                            </div>

                            {/* Tile 3: Recovery % */}
                            <div className="rounded-xl bg-brand-dark-800/60 border border-white/5 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Recovery Rate</p>
                                <p className="text-3xl font-black text-cyber-green tracking-tighter leading-none">
                                    {diseaseStats.recoveryRate ?? 0}<span className="text-base text-gray-600">%</span>
                                </p>
                                <div className="mt-3 h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyber-green rounded-full transition-all duration-1000"
                                         style={{ width: `${diseaseStats.recoveryRate ?? 0}%` }} />
                                </div>
                            </div>

                            {/* Tile 4: Admission % */}
                            <div className="rounded-xl bg-brand-dark-800/60 border border-white/5 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Admission Rate</p>
                                <p className="text-3xl font-black text-yellow-400 tracking-tighter leading-none">
                                    {diseaseStats.admissionRate ?? 0}<span className="text-base text-gray-600">%</span>
                                </p>
                                <div className="mt-3 h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000"
                                         style={{ width: `${diseaseStats.admissionRate ?? 0}%` }} />
                                </div>
                            </div>

                            {/* Tile 5: Mortality % */}
                            <div className="rounded-xl bg-brand-dark-800/60 border border-white/5 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Mortality Rate</p>
                                <p className={`text-3xl font-black tracking-tighter leading-none ${(diseaseStats.mortalityRate ?? 0) > 5 ? 'text-red-400' : 'text-gray-300'}`}>
                                    {diseaseStats.mortalityRate ?? 0}<span className="text-base text-gray-600">%</span>
                                </p>
                                <div className="mt-3 h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${(diseaseStats.mortalityRate ?? 0) > 5 ? 'bg-red-500' : 'bg-gray-500'}`}
                                         style={{ width: `${diseaseStats.mortalityRate ?? 0}%` }} />
                                </div>
                            </div>

                            {/* Tile 6: Primary Hotspot */}
                            <div className="rounded-xl bg-brand-dark-800/60 border border-white/5 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Primary Hotspot</p>
                                <p className="text-lg font-black text-orange-400 tracking-tight leading-snug truncate">
                                    {diseaseStats.hotspot || 'N/A'}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-1">{diseaseStats.hotspotCases ?? 0} cases</p>
                                <div className="mt-2 h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '75%' }} />
                                </div>
                            </div>
                        </div>

                        {/* EDLIZ Protocol (shown if available) */}
                        {diseaseInsights?.edlizProtocol && (
                            <div className="pl-3 pt-5 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {diseaseInsights.edlizProtocol.treatmentLines?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <ClipboardDocumentListIcon className="h-3 w-3" />
                                            EDLIZ Treatment Protocol
                                        </p>
                                        <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3 max-h-24 overflow-y-auto space-y-0.5">
                                            {diseaseInsights.edlizProtocol.treatmentLines.slice(0, 10).map((line, i) => (
                                                <p key={i} className={`text-[10px] leading-relaxed ${
                                                    line.startsWith('??') ? 'text-cyan-300 font-semibold mt-1' :
                                                    line.startsWith('  �') ? 'text-gray-300 ml-3' : 'text-gray-400'
                                                }`}>{line}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {diseaseInsights.edlizProtocol.preventionLines?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <ShieldCheckIcon className="h-3 w-3" />
                                            Prevention Protocol
                                        </p>
                                        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 max-h-24 overflow-y-auto space-y-0.5">
                                            {diseaseInsights.edlizProtocol.preventionLines.slice(0, 8).map((line, i) => (
                                                <p key={i} className={`text-[10px] leading-relaxed ${
                                                    line.startsWith('??') ? 'text-emerald-300 font-semibold mt-1' :
                                                    line.startsWith('  �') ? 'text-gray-300 ml-3' : 'text-gray-400'
                                                }`}>{line}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* -- SECTION 4: THREE METRIC CARDS ROW -- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Card A � Outbreak Velocity (cyber-blue accent) */}
                    <div className="glass-card-modern p-5 border border-white/5 relative overflow-hidden group hover:border-cyber-blue/20 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-cyber-blue/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-cyber-blue/10 transition-colors duration-500" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyber-blue/3 rounded-full blur-2xl -ml-12 -mb-12" />

                        <div className="relative flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center">
                                    <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-cyber-blue" />
                                </div>
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Outbreak Velocity</h3>
                            </div>
                            <span className="text-[9px] font-bold text-cyber-blue px-2 py-0.5 bg-cyber-blue/10 rounded-lg border border-cyber-blue/20">Real-time</span>
                        </div>

                        <div className="relative flex items-end justify-between mb-5">
                            <div>
                                <p className="text-5xl font-black text-white tracking-tighter leading-none">
                                    {growthIdx}
                                </p>
                                <p className="text-base text-gray-600 font-black -mt-1">/100</p>
                                <p className="text-[10px] text-gray-500 mt-1.5">Outbreak index � 50 = stable</p>
                            </div>
                            {/* Mini sparkline bars */}
                            <div className="w-24 h-12 flex items-end gap-0.5 pb-0.5">
                                {[28, 45, 38, 62, 55, 71, growthIdx].map((h, i) => (
                                    <div key={i}
                                        className={`flex-1 rounded-t-sm transition-all duration-500 ${
                                            i === 6 ? 'bg-cyber-blue shadow-[0_0_8px_rgba(0,242,255,0.4)]' : 'bg-brand-dark-700'
                                        }`}
                                        style={{ height: `${Math.max(8, (h / 100) * 100)}%` }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="relative pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Alert Level</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${riskBadgeClass}`}>
                                    {isUrgent ? riskLevel : 'Nominal'}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-brand-dark-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-cyber-blue/70 to-cyber-blue'}`}
                                    style={{ width: `${clampPercent(growthIdx)}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Card B � Clinical Resource Load (purple accent) */}
                    <div className="glass-card-modern p-5 border border-white/5 relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-cyber-purple/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-cyber-purple/10 transition-colors duration-500" />

                        <div className="relative flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center">
                                    <UserGroupIcon className="h-3.5 w-3.5 text-cyber-purple" />
                                </div>
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Clinical Resource Load</h3>
                            </div>
                            <span className="text-[9px] font-bold text-cyber-purple px-2 py-0.5 bg-cyber-purple/10 rounded-lg border border-cyber-purple/20">Live</span>
                        </div>

                        <div className="relative space-y-4 mb-5">
                            {[
                                { label: 'Personnel Engagement', val: clampPercent(systemLoad?.personnelEngagement ?? 0), color: 'from-purple-600 to-purple-400' },
                                { label: 'Clinical Capacity', val: clampPercent(systemLoad?.clinicalCapacity ?? 0), color: 'from-cyber-blue/80 to-cyber-blue' },
                            ].map(m => (
                                <div key={m.label}>
                                    <div className="flex justify-between items-center text-[11px] mb-1.5">
                                        <span className="text-gray-400">{m.label}</span>
                                        <span className="text-white font-black">{m.val}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-brand-dark-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full bg-gradient-to-r ${m.color} transition-all duration-1000`}
                                             style={{ width: `${m.val}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="relative pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Staffing Ratio</p>
                                <p className="text-xl font-black text-white">{systemLoad?.staffingRatio || '�'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Record Completeness</p>
                                <p className="text-xl font-black text-white">
                                    {systemLoad?.recordCompletenessIndex ?? 0}
                                    <span className="text-xs text-gray-600 font-bold">/100</span>
                                </p>
                            </div>
                        </div>
                        <p className="relative text-[9px] text-gray-700 font-bold uppercase tracking-widest mt-3">
                            Powered by SystemLoad API
                        </p>
                    </div>

                    {/* Card C � Symptom Signature (green accent) � FIXED */}
                    <div className="glass-card-modern p-5 border border-white/5 relative overflow-hidden group hover:border-cyber-green/20 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-cyber-green/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-cyber-green/10 transition-colors duration-500" />

                        <div className="relative flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                                    <SparklesIcon className="h-3.5 w-3.5 text-cyber-green" />
                                </div>
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Symptom Signature</h3>
                            </div>
                            <span className="text-[9px] font-bold text-cyber-green px-2 py-0.5 bg-cyber-green/10 rounded-lg border border-cyber-green/20">Neural</span>
                        </div>

                        <div className="relative">
                            {diseaseLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <div className="w-8 h-8 border-2 border-cyber-green/20 rounded-full animate-spin border-t-cyber-green" />
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Analyzing Neural Data...</p>
                                </div>
                            ) : diseaseAnalytics?.topSymptoms?.length > 0 ? (
                                <div>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">
                                        Top presenting � {selectedDisease}
                                    </p>
                                    <div className="space-y-2.5">
                                        {diseaseAnalytics.topSymptoms.slice(0, 5).map((s, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                    <span className="text-gray-300 font-medium capitalize truncate pr-4">{s.symptom}</span>
                                                    <span className="text-cyber-green font-black flex-shrink-0">{s.percentage}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-brand-dark-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-cyber-green/80 to-cyber-green transition-all duration-1000"
                                                        style={{ width: `${s.percentage}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                                        <HeartIcon className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                            {diseaseInsights?.summary?.primaryAgeGroup || 'General'} � {diseaseInsights?.summary?.primaryGender || 'All'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-700 gap-3">
                                    <BeakerIcon className="h-10 w-10 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center">
                                        {selectedDisease ? 'No symptom data recorded yet' : 'Select a disease above'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* -- SECTION 5: CHARTS + SIGNALS ROW -- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left col: Alerts stacked above CitizenSignals */}
                    <div className="lg:col-span-1 space-y-5">
                        <RecentAlerts
                            alerts={activeAlerts || []}
                            selectedDisease={selectedDisease}
                        />
                        <CitizenSignalsFeed
                            signals={citizenSignals}
                            loading={signalsLoading}
                        />
                    </div>
                    {/* Right col: Disease Chart */}
                    <div className="lg:col-span-2 min-h-[420px]">
                        <DiseaseChart
                            data={topDiseases || []}
                            totalCases={totalCases}
                            selectedDisease={selectedDisease}
                            onSelectDisease={setSelectedDisease}
                            diseaseTrends={diseaseTrends}
                        />
                    </div>
                </div>

                {/* -- SECTION 6: DISEASE DEEP-DIVE -- always rendered, graceful empty states */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* Card 1 � Symptom Profile */}
                        <div className="rounded-2xl bg-brand-dark-900/60 border border-white/5 p-5 hover:border-white/10 transition-colors duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                    <ChartBarIcon className="h-3.5 w-3.5 text-cyan-400" />
                                </div>
                                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Symptom Profile</h3>
                            </div>
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">{selectedDisease}</p>
                            {diseaseAnalytics?.topSymptoms?.length > 0 ? (
                                <div className="space-y-2.5">
                                    {diseaseAnalytics.topSymptoms.slice(0, 7).map(s => (
                                        <div key={s.symptom}>
                                            <div className="flex justify-between text-[11px] mb-1">
                                                <span className="text-gray-300 capitalize">{s.symptom}</span>
                                                <span className="text-white font-black">{s.percentage}%</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                                                    style={{ width: `${s.percentage}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-700 gap-2">
                                    <BeakerIcon className="h-8 w-8 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No symptom data recorded</p>
                                </div>
                            )}
                        </div>

                        {/* Card 2 � Patient Outcomes */}
                        <div className="rounded-2xl bg-brand-dark-900/60 border border-white/5 p-5 hover:border-white/10 transition-colors duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
                                </div>
                                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Patient Outcomes</h3>
                            </div>
                            {Object.keys(diseaseAnalytics?.outcomes || {}).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(diseaseAnalytics.outcomes).map(([outcome, data]) => {
                                        const colorMap = {
                                            Discharged: { bar: 'from-emerald-500 to-green-400', text: 'text-emerald-400' },
                                            Admitted:   { bar: 'from-yellow-500 to-orange-400', text: 'text-yellow-400' },
                                            Deceased:   { bar: 'from-red-600 to-red-500',       text: 'text-red-400'    },
                                        };
                                        const c = colorMap[outcome] || { bar: 'from-blue-500 to-cyan-400', text: 'text-blue-400' };
                                        return (
                                            <div key={outcome}>
                                                <div className="flex justify-between items-center text-[11px] mb-1.5">
                                                    <span className={`font-black uppercase tracking-wide ${c.text}`}>{outcome}</span>
                                                    <span className="text-white font-black">
                                                        {data.count.toLocaleString()}
                                                        <span className="text-gray-500 font-bold"> ({data.percentage}%)</span>
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-1000`}
                                                        style={{ width: `${data.percentage}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-600 text-xs text-center py-8">No outcome data</p>
                            )}
                        </div>

                        {/* Card 3 � Province Breakdown */}
                        <div className="rounded-2xl bg-brand-dark-900/60 border border-white/5 p-5 hover:border-white/10 transition-colors duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                    <MapIcon className="h-3.5 w-3.5 text-purple-400" />
                                </div>
                                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Province Breakdown</h3>
                            </div>
                            {diseaseAnalytics?.provinceBreakdown?.length > 0 ? (
                                <div className="space-y-2.5">
                                    {diseaseAnalytics.provinceBreakdown.slice(0, 7).map((p, idx) => (
                                        <div key={p.province} className="flex items-center gap-2">
                                            <span className="text-[9px] text-gray-700 font-black w-4 tabular-nums text-right">{idx + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-[11px] mb-1">
                                                    <span className="text-gray-300">{p.province}</span>
                                                    <span className="text-white font-black">{p.count}</span>
                                                </div>
                                                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                                                        style={{ width: `${p.percentage}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600 text-xs text-center py-8">No province data</p>
                            )}
                        </div>
                </div>

                {/* ── SECTION 7: AI INTERVENTION BANNER ── always rendered */}
                <div className="relative rounded-2xl overflow-hidden border border-purple-500/25 bg-gradient-to-r from-purple-900/20 via-brand-dark-900/40 to-pink-900/15 p-6">
                        {/* Top shimmer line */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500" />

                        {/* AI Badge — top right */}
                        <div className="absolute top-4 right-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/30 backdrop-blur-sm">
                                <CpuChipIcon className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                                <span className="text-[9px] font-black text-purple-300 uppercase tracking-widest">AI Model v5.0 — EDLIZ Pre-trained</span>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center pr-0 md:pr-56 pl-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30
                                            flex items-center justify-center flex-shrink-0
                                            shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                <FireIcon className="h-6 w-6 text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                                        Strategic Intervention Recommended
                                    </h3>
                                    {isUrgent && (
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${riskBadgeClass}`}>
                                            {riskLevel}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Hotspot identified in{' '}
                                    <span className="text-white font-black">{diseaseStats?.hotspot || 'N/A'}</span>
                                    {' '}({diseaseStats?.hotspotCases || 0} cases). Recovery rate{' '}
                                    <span className="text-cyber-green font-black">{diseaseStats?.recoveryRate ?? 0}%</span>
                                    {' '}· Mortality{' '}
                                    <span className={`font-black ${(diseaseStats?.mortalityRate ?? 0) > 5 ? 'text-red-400' : 'text-gray-300'}`}>
                                        {diseaseStats?.mortalityRate ?? 0}%
                                    </span>.
                                    {diseaseInsights?.outbreakStatus && (
                                        <span className="text-orange-400 font-black"> ⚠ {diseaseInsights.outbreakStatus}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                {/* ── SECTION 8: REGIONAL DISTRIBUTION ── always rendered */}
                <div className="relative rounded-2xl overflow-hidden bg-brand-dark-900/60 border border-white/5 p-6">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-cyber-purple/4 blur-[120px] pointer-events-none" />
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center">
                                <GlobeAltIcon className="h-4 w-4 text-cyber-purple" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">National Coverage</p>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Regional Distribution</h2>
                            </div>
                            <span className="ml-auto text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                {provinceStats.length} provinces reporting
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {provinceStats.map(prov => (
                                <div key={prov._id}
                                    className="group relative overflow-hidden rounded-2xl p-4 bg-brand-dark-800/50 border border-white/5
                                               hover:border-cyber-purple/30 hover:bg-brand-dark-800/80 transition-all duration-300 cursor-default">
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyber-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                                    <div className="relative">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 truncate">{prov._id}</p>
                                        <p className="text-3xl font-black text-white tracking-tighter leading-none mb-2">
                                            {(prov.total || 0).toLocaleString()}
                                        </p>
                                        <div className="h-1 w-full bg-brand-dark-950 rounded-full overflow-hidden mb-2">
                                            <div
                                                className="h-full bg-gradient-to-r from-cyber-purple to-pink-500 rounded-full transition-all duration-1000 group-hover:brightness-125"
                                                style={{ width: totalCases > 0 ? `${Math.min((prov.total / totalCases) * 100, 100)}%` : '0%' }}
                                            />
                                        </div>
                                        {prov.diseases?.[0] && (
                                            <p className="text-[9px] text-gray-600 truncate">
                                                {[...prov.diseases].sort((a, b) => b.cases - a.cases)[0]?.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
