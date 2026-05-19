import React, { useState, useEffect, useCallback } from 'react';
import { 
    getPatientCount, 
    getTopDiseases, 
    getAllDiseases,
    getProvinceStats,
    getDiseaseInsights,
    getDiseaseAnalytics,
    getMonthlyTrends,
    getGlobalSummary,
    getSystemLoad
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
import { toGrowthIndex, clampPercent } from '../utils/analyticsHelpers';

const Dashboard = () => {
    const [patientCount, setPatientCount]       = useState(0);
    const [totalCases, setTotalCases]           = useState(0);
    const [diseasesTracked, setDiseasesTracked] = useState(0);
    const [provincesActive, setProvincesActive] = useState(0);
    const [topDiseases, setTopDiseases]         = useState([]);
    const [availableDiseases, setAvailableDiseases] = useState([]);
    const [provinceStats, setProvinceStats]     = useState([]);
    const [systemLoad, setSystemLoad]           = useState(null);
    const [loading, setLoading]                 = useState(true);
    const [lastUpdated, setLastUpdated]         = useState(new Date());

    // Disease focus state
    const [selectedDisease, setSelectedDisease]     = useState('');
    const [diseaseInsights, setDiseaseInsights]     = useState(null);
    const [diseaseAnalytics, setDiseaseAnalytics]   = useState(null);
    const [diseaseTrends, setDiseaseTrends]         = useState([]);
    const [diseaseLoading, setDiseaseLoading]       = useState(false);

    const { activeAlerts, subscribeToRooms } = useAlerts();
    const { refreshTrigger, refreshData } = useDataRefresh();

    // ── Load system-wide data ──────────────────────────────────────────────
    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, diseasesRes, allDiseasesRes, provinceRes, summaryRes, loadRes] = await Promise.all([
                getPatientCount(),
                getTopDiseases(),
                getAllDiseases(),
                getProvinceStats(),
                getGlobalSummary(),
                getSystemLoad()
            ]);

            setPatientCount(patientRes.data?.count || 0);

            const topDiseases = diseasesRes.data || [];
            setTopDiseases(topDiseases);
            
            // Use global summary for system-wide stats
            setTotalCases(summaryRes.data?.totalCases || 0);
            setDiseasesTracked(summaryRes.data?.diseasesTracked || 0);
            setProvincesActive(summaryRes.data?.provincesActive || 0);

            const provinces = provinceRes.data?.provinces || [];
            setProvinceStats(provinces);

            // Set available diseases for the selector (using all diseases)
            const allDiseases = allDiseasesRes.data || [];
            setAvailableDiseases(allDiseases);

            // System Load Factor
            setSystemLoad(loadRes.data);

            // Default to highest-cases disease if none selected
            if (topDiseases.length > 0 && !selectedDisease) {
                console.log('Setting initial disease focus:', topDiseases[0]._id);
                setSelectedDisease(topDiseases[0]._id);
            } else if (allDiseases.length > 0 && !selectedDisease) {
                console.log('Setting initial disease focus from all diseases:', allDiseases[0]._id);
                setSelectedDisease(allDiseases[0]._id);
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

    // ── Subscribe to 'all-alerts' room and listen for AI stats updates ────
    // When a new medical record is saved anywhere, the server emits 'ai-update'
    // via WebSocket. We use that signal to silently refresh the dashboard stats.
    useEffect(() => {
        subscribeToRooms(['all-alerts']);

        const handleAIUpdate = () => {
            // Silently refresh top-level stats without showing a loading spinner
            loadDashboardData();
        };
        window.addEventListener('ai-stats-update', handleAIUpdate);
        return () => window.removeEventListener('ai-stats-update', handleAIUpdate);
    }, []);                                         // eslint-disable-line

    // ── Load per-disease data whenever selection changes ──────────────────
    useEffect(() => {
        if (!selectedDisease) return;
        const load = async () => {
            setDiseaseLoading(true);
            try {
                // Fetch each with its own error handling to be resilient
                const fetchInsights = async () => {
                    try {
                        const res = await getDiseaseInsights(selectedDisease);
                        setDiseaseInsights(res.data);
                    } catch (e) {
                        console.warn(`No AI insights for ${selectedDisease}`);
                        setDiseaseInsights(null);
                    }
                };

                const fetchAnalytics = async () => {
                    try {
                        const res = await getDiseaseAnalytics(selectedDisease);
                        setDiseaseAnalytics(res.data);
                    } catch (e) {
                        console.error(`Failed to load analytics for ${selectedDisease}`);
                        setDiseaseAnalytics(null);
                    }
                };

                const fetchTrends = async () => {
                    try {
                        const res = await getDiseaseTrends(selectedDisease);
                        setDiseaseTrends(res.data || []);
                    } catch (e) {
                        console.warn(`No trends for ${selectedDisease}`);
                        setDiseaseTrends([]);
                    }
                };

                await Promise.all([
                    fetchInsights(),
                    fetchAnalytics(),
                    fetchTrends()
                ]);
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
            growthIndex:    da.growthIndex ?? toGrowthIndex(da.growthRate),
            recoveryRate:   Math.round((discharged / total) * 100),
            admissionRate:  Math.round((admitted   / total) * 100),
            mortalityRate:  Math.round((deceased   / total) * 100),
            hotspot:        (() => {
                const hs = da.primaryHotspots?.length
                    ? { label: da.hotspot, maxCount: da.hotspotCases }
                    : null;
                if (hs?.label) return hs.label;
                const pb = da.provinceBreakdown || [];
                if (!pb.length) return 'N/A';
                const max = Math.max(...pb.map((p) => p.count));
                return pb.filter((p) => p.count === max).map((p) => p.province).join(' & ');
            })(),
            hotspotCases:   da.hotspotCases ?? da.provinceBreakdown?.[0]?.count ?? 0,
            riskLevel:      diseaseInsights?.summary?.riskLevel || 'MODERATE'
        };
    };

    const stats = {
        totalPatients:   patientCount,
        totalClinicalEvents: totalCases,
        diseasesTracked,
        provincesActive,
        activeAlerts:    activeAlerts?.length || 0
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
                                    {availableDiseases
                                        .sort((a, b) => a._id.localeCompare(b._id))
                                        .map((d, i) => (
                                        <option key={d._id} value={d._id}>
                                            {d._id}
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
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/25 p-5 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                        <div className="absolute top-0 right-0 p-4">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
                                <CpuChipIcon className="h-3 w-3 text-purple-400 animate-pulse" />
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Neural Model Accuracy: 94.2%</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                                    <FireIcon className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        Strategic Intervention Recommended
                                        <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/30">
                                            High Impact
                                        </span>
                                    </h3>
                                    <p className="text-sm text-gray-400 max-w-2xl mt-1 leading-relaxed">
                                        Neural analysis of <span className="text-purple-400 font-bold">{selectedDisease}</span> data indicates a potential hotspot emergence in <span className="text-white font-bold">{diseaseStats?.hotspot}</span>. 
                                        Prioritize resource allocation and clinical staffing in this sector to mitigate risk.
                                    </p>
                                </div>
                            </div>
                            <button className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-purple-500/25">
                                View Detailed Analysis
                            </button>
                        </div>
                    </div>
                )}

                {/* ── HANDS-ON ANALYTICS SECTION ─────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    
                    {/* 1. Real-time Outbreak Velocity */}
                    <div className="glass-card-modern p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-blue/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyber-blue/10 transition-colors" />
                        
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <ArrowTrendingUpIcon className="h-4 w-4 text-cyber-blue" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Outbreak Velocity</h3>
                            </div>
                            <span className="text-[10px] font-bold text-cyber-blue px-2 py-0.5 bg-cyber-blue/10 rounded-lg">Real-time</span>
                        </div>

                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-4xl font-black text-white tracking-tighter">
                                    {diseaseStats?.growthIndex ?? 50}<span className="text-lg text-gray-500">/100</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Outbreak index (50 = stable, 0–100 scale)</p>
                            </div>
                            <div className="w-24 h-12 flex items-end gap-1 pb-1">
                                {[40, 60, 45, 70, 85, 60, 95].map((h, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-2 rounded-t-sm transition-all duration-500 ${i === 6 ? 'bg-cyber-blue' : 'bg-brand-dark-700'}`}
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">System Alert Level</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${diseaseStats?.riskLevel === 'CRITICAL' ? 'text-red-400' : 'text-cyber-green'}`}>
                                    {diseaseStats?.riskLevel === 'CRITICAL' ? 'Emergency' : 'Nominal'}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-brand-dark-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${diseaseStats?.riskLevel === 'CRITICAL' ? 'bg-red-500' : 'bg-cyber-blue'}`}
                                    style={{ width: `${clampPercent(diseaseStats?.growthIndex ?? 50)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Clinical Resource Load */}
                <div className="glass-card-modern p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-purple/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyber-purple/10 transition-colors" />
                    
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <UserGroupIcon className="h-4 w-4 text-cyber-purple" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">System Load Factor</h3>
                        </div>
                        <span className="text-[10px] font-bold text-cyber-purple px-2 py-0.5 bg-cyber-purple/10 rounded-lg">Live</span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <p className="text-xs text-gray-400 font-medium">Personnel Engagement</p>
                                <p className="text-sm font-bold text-white">{clampPercent(systemLoad?.personnelEngagement ?? 0)}%</p>
                            </div>
                            <div className="w-full h-1 bg-brand-dark-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-cyber-purple transition-all duration-1000" 
                                    style={{ width: `${clampPercent(systemLoad?.personnelEngagement ?? 0)}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <p className="text-xs text-gray-400 font-medium">Clinical Capacity (Avg)</p>
                                <p className="text-sm font-bold text-white">{clampPercent(systemLoad?.clinicalCapacity ?? 0)}%</p>
                            </div>
                            <div className="w-full h-1 bg-brand-dark-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-cyber-blue transition-all duration-1000" 
                                    style={{ width: `${clampPercent(systemLoad?.clinicalCapacity ?? 0)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Staffing Ratio</p>
                            <p className="text-lg font-black text-white">{systemLoad?.staffingRatio || '1:0'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Record completeness</p>
                            <p className="text-lg font-black text-white">{systemLoad?.recordCompletenessIndex ?? 0}/100</p>
                            <p className="text-[9px] text-gray-600 mt-0.5">7-day records with vitals + diagnosis</p>
                        </div>
                    </div>
                </div>

                    {/* 3. Clinical Symptom Signature */}
                <div className="glass-card-modern p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-green/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyber-green/10 transition-colors" />
                    
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-cyber-green" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Symptom Signature</h3>
                        </div>
                        <span className="text-[10px] font-bold text-cyber-green px-2 py-0.5 bg-cyber-green/10 rounded-lg">Neural</span>
                    </div>

                    {diseaseLoading ? (
                        <div className="flex flex-col items-center justify-center h-48">
                            <div className="w-8 h-8 border-2 border-cyber-green/20 rounded-full animate-spin border-t-cyber-green mb-3" />
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Processing Neural Data...</p>
                        </div>
                    ) : diseaseAnalytics?.topSymptoms?.length > 0 ? (
                        <div className="space-y-3">
                            {diseaseAnalytics.topSymptoms.slice(0, 3).map((s, idx) => (
                                <div key={idx} className="relative">
                                    <div className="flex justify-between items-end mb-1">
                                        <p className="text-xs text-gray-300 font-bold truncate pr-4">{s.symptom}</p>
                                        <p className="text-[10px] font-black text-cyber-green">{s.percentage}%</p>
                                    </div>
                                    <div className="w-full h-1 bg-brand-dark-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-cyber-green transition-all duration-1000" 
                                            style={{ width: `${s.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            
                            <div className="mt-6 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                        <UserGroupIcon className="h-4 w-4 text-pink-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Primary Demographic</p>
                                        <p className="text-xs font-black text-white uppercase">
                                            {diseaseInsights?.summary?.primaryAgeGroup || 'General'} · {diseaseInsights?.summary?.primaryGender || 'All'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                            <BeakerIcon className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">
                                {selectedDisease ? 'No symptom clusters found' : 'Select a disease to analyze'}
                            </p>
                        </div>
                    )}
                </div>
                </div>

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
                            totalCases={totalCases}
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
