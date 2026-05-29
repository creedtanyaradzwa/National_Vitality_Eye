import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    getTopDiseases,
    getProvinceStats,
    getMonthlyTrends,
    getAIStats,
    getDiseaseTrends,
    getDiseaseInsights,
    getPatientCount,
    getDiseaseAnalytics,
    getGlobalSummary,
    getAllDiseases,
    getPrevalence
} from '../services/api';
import { useAlerts } from '../context/AlertProvider';
import {
    mergeDiseaseLists,
    clampPercent,
    buildMonthlyProjections,
    aggregateMonthlyTotals,
    buildChartSeriesWithProjections,
    buildDistributionPieData,
    buildStackedMonthlyChartData,
    pickTopDiseases,
    sortMonthlySeries,
    generateOverviewInsight,
    resolvePrimaryHotspots,
    MONTH_LABELS,
    TOP_DISEASE_LIMIT,
    PROJECTION_HORIZON
} from '../utils/analyticsHelpers.js';
import { useAuth } from '../context/AuthProvider';

const NO_DATA = 'Insufficient recorded data to display this metric.';
import { useDataRefresh } from '../context/DataRefreshProvider.jsx';
import {
    ChartBarIcon,
    MapIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    BeakerIcon,
    UserGroupIcon,
    ArrowPathIcon,
    SparklesIcon,
    CpuChipIcon,
    HeartIcon,
    ShieldExclamationIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    FireIcon,
    ClipboardDocumentListIcon,
    MagnifyingGlassIcon,
    BoltIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis
} from 'recharts';
import toast from 'react-hot-toast';

const Analytics = () => {
    const { hasPermission } = useAuth();
    const { refreshTrigger } = useDataRefresh();
    const { subscribeToRooms, unsubscribeFromRooms } = useAlerts();
    const canViewAnalytics = hasPermission('view:analytics');
    
    const [topDiseases, setTopDiseases] = useState([]);
    const [systemDiseases, setSystemDiseases] = useState([]);
    const [provinceStats, setProvinceStats] = useState([]);
    const [monthlyTrends, setMonthlyTrends] = useState([]);
    const [aiStats, setAiStats] = useState(null);
    const [summaryStats, setSummaryStats] = useState(null);
    const [prevalenceStats, setPrevalenceStats] = useState({ activeBurden: 0, growthRate: 0, topDiseaseShare: 0 });
    const [selectedDisease, setSelectedDisease] = useState('');
    const [diseaseTrends, setDiseaseTrends] = useState([]);
    const [diseaseInsights, setDiseaseInsights] = useState(null);
    const [diseaseAnalytics, setDiseaseAnalytics] = useState(null);
    const [patientCount, setPatientCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [diseaseLoading, setDiseaseLoading] = useState(false);
    const [diseaseTimeRange, setDiseaseTimeRange] = useState('6months');
    const [overviewTimeRange, setOverviewTimeRange] = useState('6months');
    const [diseaseSearch, setDiseaseSearch] = useState('');
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#F97316', '#6366F1', '#A855F7'];
    const months = MONTH_LABELS;



    // Redo loadAnalyticsData to ensure all fields are captured correctly
    const loadAnalyticsData = useCallback(async () => {
        setLoading(true);
        try {
            const [diseasesRes, allDiseasesRes, provinceRes, trendsRes, statsRes,
                   patientCountRes, summaryRes, prevalenceRes] = await Promise.all([
                getTopDiseases(),
                getAllDiseases(),
                getProvinceStats(),
                getMonthlyTrends(),
                getAIStats(),
                getPatientCount(),
                getGlobalSummary(),
                getPrevalence()
            ]);

            const topD = diseasesRes.data || [];
            const allD = allDiseasesRes.data || [];
            const merged = mergeDiseaseLists(topD, allD);

            setTopDiseases(topD);
            setSystemDiseases(merged);
            setProvinceStats(provinceRes.data?.provinces || []);
            setMonthlyTrends(trendsRes.data || []);
            setAiStats(statsRes.data);
            setPatientCount(patientCountRes.data?.count || 0);
            setSummaryStats(summaryRes.data);
            setPrevalenceStats(prevalenceRes.data || { activeBurden: 0, growthRate: 0, topDiseaseShare: 0 });
            setLastUpdated(new Date());

            // Default focus: disease with highest case count
            if (merged.length > 0) {
                setSelectedDisease((prev) => prev || merged[0]._id);
            }
        } catch (error) {
            console.error("Analytics Load Error:", error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadDiseaseTrends = async () => {
            if (!selectedDisease) return;
            setDiseaseLoading(true);
            try {
                const [trendsRes, insightsRes, analyticsRes] = await Promise.allSettled([
                    getDiseaseTrends(selectedDisease),
                    getDiseaseInsights(selectedDisease),
                    getDiseaseAnalytics(selectedDisease)
                ]);
                if (trendsRes.status === 'fulfilled') setDiseaseTrends(trendsRes.value.data || []);
                if (insightsRes.status === 'fulfilled') setDiseaseInsights(insightsRes.value.data);
                else setDiseaseInsights(null);
                if (analyticsRes.status === 'fulfilled') setDiseaseAnalytics(analyticsRes.value.data);
                else setDiseaseAnalytics(null);
            } catch (error) {
                console.error('Failed to load disease data', error);
            } finally {
                setDiseaseLoading(false);
            }
        };
        loadDiseaseTrends();

        // Subscribe to the disease room so we receive 'new-case' WebSocket events
        // for this disease in real time
        if (selectedDisease) {
            subscribeToRooms([`disease-${selectedDisease}`]);
        }
        return () => {
            if (selectedDisease) {
                unsubscribeFromRooms([`disease-${selectedDisease}`]);
            }
        };
    }, [selectedDisease]);

    // Reload disease data when a new case arrives via WebSocket
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.disease === selectedDisease) {
                // Refresh disease-specific data silently
                if (selectedDisease) {
                    Promise.allSettled([
                        getDiseaseTrends(selectedDisease),
                        getDiseaseAnalytics(selectedDisease)
                    ]).then(([trendsRes, analyticsRes]) => {
                        if (trendsRes.status === 'fulfilled') setDiseaseTrends(trendsRes.value.data || []);
                        if (analyticsRes.status === 'fulfilled') setDiseaseAnalytics(analyticsRes.value.data);
                    });
                }
            }
        };
        window.addEventListener('new-disease-case', handler);
        return () => window.removeEventListener('new-disease-case', handler);
    }, [selectedDisease]);

    useEffect(() => {
        if (canViewAnalytics) {
            loadAnalyticsData();
        }
    }, [canViewAnalytics, refreshTrigger, loadAnalyticsData]);

    const monthsForRange = (range) => (range === '3months' ? 3 : range === '12months' ? 12 : 6);

    const filterMonthlyData = (range = overviewTimeRange) => {
        return monthlyTrends.slice(-monthsForRange(range));
    };

    const processMonthlyChartData = (range = overviewTimeRange) => {
        const filtered = filterMonthlyData(range);
        const chartData = {};
        filtered.forEach(item => {
            const monthKey = `${item._id.year}-${item._id.month}`;
            if (!chartData[monthKey]) {
                chartData[monthKey] = {
                    month: `${months[item._id.month - 1]} ${item._id.year}`,
                    ...item._id
                };
            }
            chartData[monthKey][item._id.disease] = item.count;
        });
        return Object.values(chartData);
    };

    // Province data filtered for selected disease
    const processProvinceChartData = () => {
        if (!selectedDisease || !diseaseAnalytics) {
            return provinceStats.map(prov => ({
                name: prov._id,
                value: prov.total,
                diseases: prov.diseases
            })).sort((a, b) => b.value - a.value);
        }
        return (diseaseAnalytics.provinceBreakdown || []).map(p => ({
            name: p.province,
            value: p.count,
            percentage: p.percentage
        }));
    };

    const calculateTotalCases = () => {
        if (summaryStats?.totalCases != null) return summaryStats.totalCases;
        return systemDiseases.reduce((sum, d) => sum + (d.count || 0), 0);
    };

    // Filter disease trends by time range
    const filterDiseaseTrends = () => {
        if (!diseaseTrends.length) return [];
        return diseaseTrends.slice(-monthsForRange(diseaseTimeRange));
    };

    // Get selected disease stats card values
    const getSelectedDiseaseStats = () => {
        if (!diseaseAnalytics) return null;
        const da = diseaseAnalytics;
        const discharged = da.outcomes?.['Discharged']?.count || 0;
        const admitted = da.outcomes?.['Admitted']?.count || 0;
        const deceased = da.outcomes?.['Deceased']?.count || 0;
        const total = da.totalCases || 1;
        const hotspotInfo = da.hotspot
            ? { label: da.hotspot, hotspots: da.primaryHotspots || [], maxCount: da.hotspotCases ?? 0 }
            : resolvePrimaryHotspots(da.provinceBreakdown);
        return {
            totalCases: da.totalCases,
            growthRate: da.growthRate,
            prevalenceShare: clampPercent(da.prevalenceShare ?? 0),
            recoveryRate: clampPercent((discharged / total) * 100),
            admissionRate: clampPercent((admitted / total) * 100),
            mortalityRate: clampPercent((deceased / total) * 100),
            hotspot: hotspotInfo.label || 'N/A',
            hotspotCases: hotspotInfo.maxCount,
            primaryHotspots: hotspotInfo.hotspots,
            isTiedHotspot: (hotspotInfo.hotspots?.length || 0) > 1
        };
    };

    const filteredDiseaseList = useMemo(() => {
        const q = diseaseSearch.trim().toLowerCase();
        if (!q) return systemDiseases;
        return systemDiseases.filter((d) => d._id?.toLowerCase().includes(q));
    }, [systemDiseases, diseaseSearch]);

    const diseaseHistoricalFull = useMemo(() => {
        if (diseaseAnalytics?.monthlyTrend?.length) return diseaseAnalytics.monthlyTrend;
        return sortMonthlySeries(diseaseTrends);
    }, [diseaseAnalytics, diseaseTrends]);

    const trendChartData = useMemo(() => {
        const rows = buildChartSeriesWithProjections(
            diseaseHistoricalFull,
            monthsForRange(diseaseTimeRange),
            diseaseAnalytics?.projections,
            PROJECTION_HORIZON,
            months
        );
        if (rows.length) return rows;
        return filterDiseaseTrends().map((d) => ({
            label: `${months[(d._id?.month ?? 1) - 1]} ${d._id?.year}`,
            actual: d.count,
            projected: null
        }));
    }, [diseaseHistoricalFull, diseaseTimeRange, diseaseAnalytics, diseaseTrends, months]);

    const topTenDiseases = useMemo(() => pickTopDiseases(systemDiseases), [systemDiseases]);
    const distributionChart = useMemo(
        () => buildDistributionPieData(systemDiseases, TOP_DISEASE_LIMIT),
        [systemDiseases]
    );
    const topTenDiseaseIds = useMemo(() => topTenDiseases.map((d) => d._id), [topTenDiseases]);

    const overviewFullTotals = useMemo(
        () => aggregateMonthlyTotals(monthlyTrends),
        [monthlyTrends]
    );

    const overviewMonthlyTotals = useMemo(
        () => aggregateMonthlyTotals(filterMonthlyData(overviewTimeRange)),
        [monthlyTrends, overviewTimeRange]
    );

    const overviewProjections = useMemo(
        () => buildMonthlyProjections(overviewFullTotals, PROJECTION_HORIZON),
        [overviewFullTotals]
    );

    const overviewLineData = useMemo(() => {
        const rows = buildChartSeriesWithProjections(
            overviewFullTotals,
            monthsForRange(overviewTimeRange),
            overviewProjections,
            PROJECTION_HORIZON,
            months
        );
        return rows.map((r) => ({
            month: r.label,
            actual: r.actual,
            projected: r.projected
        }));
    }, [overviewFullTotals, overviewTimeRange, overviewProjections, months]);

    const stackedMonthlyData = useMemo(
        () => buildStackedMonthlyChartData(filterMonthlyData(overviewTimeRange), topTenDiseaseIds, months),
        [monthlyTrends, overviewTimeRange, topTenDiseaseIds, months]
    );

    const stackedBarKeys = useMemo(() => {
        const keys = [...topTenDiseaseIds];
        if (stackedMonthlyData.some((row) => (row.Other || 0) > 0)) keys.push('Other');
        return keys;
    }, [topTenDiseaseIds, stackedMonthlyData]);

    const diseaseProfile = diseaseInsights?.diseaseProfile || diseaseAnalytics?.diseaseProfile;
    const hasDiseaseProfile = diseaseProfile && (
        diseaseProfile.focusAreas?.length > 0 ||
        diseaseProfile.peakMonth ||
        diseaseProfile.recentGrowth ||
        diseaseProfile.outcomeSummary
    );

    const trendInsightText = diseaseInsights?.summary?.trendInsight ?? diseaseAnalytics?.trendInsight ?? null;
    const overviewInsightText = overviewMonthlyTotals.length >= 1
        ? generateOverviewInsight(overviewMonthlyTotals, overviewProjections)
        : null;
    const recommendationList = diseaseInsights?.recommendations || [];

    const totalCases = calculateTotalCases();
    const activeBurden = clampPercent(prevalenceStats.activeBurden ?? 0);
    const caseGrowth = prevalenceStats.growthRate ?? 0;
    const provinceData = processProvinceChartData();
    const diseaseStats = getSelectedDiseaseStats();

    if (!canViewAnalytics) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 p-[1px]">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-12 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                            <ChartBarIcon className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                        <p className="text-gray-400">You don't have permission to view analytics. Please contact your administrator.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ChartBarIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="max-w-7xl mx-auto px-4 py-8">

            {/* ── HEADER ── */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <ChartBarIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Health Analytics Dashboard</h1>
                                <p className="text-gray-400">Real-time health statistics and AI-powered insights</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Last updated</p>
                                <p className="text-sm text-gray-300">{lastUpdated.toLocaleTimeString()}</p>
                            </div>
                            <button onClick={loadAnalyticsData} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300">
                                <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SYSTEM-WIDE STATS CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 p-5">
                    <p className="text-gray-400 text-xs mb-1">Total Patients</p>
                    <p className="text-3xl font-bold text-white">{patientCount}</p>
                    <UserGroupIcon className="h-5 w-5 text-blue-400 mt-2" />
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-5">
                    <p className="text-gray-400 text-xs mb-1">Total Cases</p>
                    <p className="text-3xl font-bold text-white">{totalCases}</p>
                    <BeakerIcon className="h-5 w-5 text-emerald-400 mt-2" />
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-5">
                    <p className="text-gray-400 text-xs mb-1">Diseases Tracked</p>
                    <p className="text-3xl font-bold text-white">{aiStats?.diseasesTracked || 0}</p>
                    <ChartBarIcon className="h-5 w-5 text-purple-400 mt-2" />
                </div>
                <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 p-5">
                    <p className="text-gray-400 text-xs mb-1">Provinces Active</p>
                    <p className="text-3xl font-bold text-white">{provinceStats.length}</p>
                    <MapIcon className="h-5 w-5 text-orange-400 mt-2" />
                </div>
                <div className="rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 p-5">
                    <p className="text-gray-400 text-xs mb-1">Active Burden Index</p>
                    <p className="text-3xl font-bold text-amber-300">{activeBurden}%</p>
                    <GlobeAltIcon className="h-5 w-5 text-amber-400 mt-2" />
                    <p className="text-[10px] text-gray-500 mt-1">
                        30-day visits / patients · growth {caseGrowth > 0 ? '+' : ''}{caseGrowth}%
                    </p>
                </div>
            </div>

            {/* ── DISEASE INTELLIGENCE ── */}
            <section className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Disease Intelligence</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Select a disease for metrics and AI insights</p>
                    </div>
                </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Disease List */}
                <div className="lg:col-span-1 rounded-xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BeakerIcon className="h-4 w-4 text-purple-400" />
                        Disease Focus
                    </h2>
                    <p className="text-[10px] text-gray-500 mb-3 uppercase tracking-widest">
                        {systemDiseases.length} diseases · default: highest cases
                    </p>
                    <div className="relative mb-3">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={diseaseSearch}
                            onChange={(e) => setDiseaseSearch(e.target.value)}
                            placeholder="Search diseases..."
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                        />
                    </div>
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredDiseaseList.map((disease, idx) => (
                            <button
                                key={disease._id}
                                onClick={() => setSelectedDisease(disease._id)}
                                className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                                    selectedDisease === disease._id
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-xs uppercase tracking-wider">{disease._id}</p>
                                        <p className={`text-[10px] ${selectedDisease === disease._id ? 'text-white/70' : 'text-gray-500'}`}>
                                            {disease.count} cases
                                        </p>
                                    </div>
                                    {systemDiseases[0]?._id === disease._id && selectedDisease !== disease._id && (
                                        <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">TOP</span>
                                    )}
                                    {selectedDisease === disease._id && <SparklesIcon className="h-4 w-4 animate-pulse" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Disease-Specific Stats Cards */}
                <div className="lg:col-span-3">
                    {diseaseLoading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px]">
                            <div className="w-10 h-10 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                        </div>
                    ) : diseaseStats ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">{selectedDisease}</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                                    diseaseInsights?.summary?.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    diseaseInsights?.summary?.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                    {diseaseInsights?.summary?.riskLevel || 'MODERATE'} RISK
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Cases</p>
                                    <p className="text-2xl font-black text-white">{diseaseStats.totalCases}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">All time</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">National Share</p>
                                    <p className="text-2xl font-black text-amber-300">{diseaseStats.prevalenceShare}%</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Of all system cases</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">30-Day Growth</p>
                                    <p className={`text-2xl font-black ${diseaseStats.growthRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {diseaseStats.growthRate > 0 ? '+' : ''}{clampPercent(diseaseStats.growthRate)}%
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">vs prior 30 days</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Recovery Rate</p>
                                    <p className="text-2xl font-black text-green-400">{diseaseStats.recoveryRate}%</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Discharged patients</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Admission Rate</p>
                                    <p className="text-2xl font-black text-yellow-400">{diseaseStats.admissionRate}%</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Required inpatient care</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Mortality Rate</p>
                                    <p className={`text-2xl font-black ${diseaseStats.mortalityRate > 5 ? 'text-red-400' : 'text-gray-300'}`}>
                                        {diseaseStats.mortalityRate}%
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">Case fatality</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                                        Primary Hotspot{diseaseStats.isTiedHotspot ? 's (tied)' : ''}
                                    </p>
                                    <p className="text-lg font-black text-purple-400 uppercase">{diseaseStats.hotspot}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        {diseaseStats.hotspotCases} cases{diseaseStats.isTiedHotspot ? ' each' : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500">
                            <p>Select a disease to view statistics</p>
                        </div>
                    )}
                </div>
            </div>
            </section>

            {/* ── AI DECISION SUPPORT ── */}
            {(diseaseInsights || diseaseAnalytics) && !diseaseLoading && (
                <div className="mb-8">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 p-[1px]">
                        <div className="relative rounded-2xl bg-slate-900/95 backdrop-blur-xl p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 animate-pulse">
                                        <SparklesIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">Neural Analytics Engine · Live Decision Support</p>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">AI Insights: {selectedDisease}</h2>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Confidence</p>
                                        {diseaseInsights?.aiConfidence != null ? (
                                            <p className="text-2xl font-black text-white">{diseaseInsights.aiConfidence.toFixed(1)}%</p>
                                        ) : (
                                            <p className="text-sm text-gray-500">Not available — fewer than 20 cases in model</p>
                                        )}
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl border font-black tracking-widest text-sm ${
                                        diseaseInsights.summary?.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        diseaseInsights.summary?.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    }`}>
                                        {diseaseInsights.summary?.riskLevel} RISK
                                    </div>
                                </div>
                            </div>

                            {/* Summary metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Growth Analysis</p>
                                    <div className={`text-2xl font-black ${diseaseInsights.summary?.growthRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {diseaseInsights.summary?.growthRate > 0 ? '+' : ''}{clampPercent(diseaseInsights.summary?.growthRate)}%
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">vs previous month</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                        Primary Hotspot{(diseaseInsights.summary?.primaryHotspots?.length || 0) > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex items-start gap-2">
                                        <MapIcon className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-lg font-black text-white uppercase leading-tight block">
                                                {diseaseInsights.summary?.hotspot
                                                    || diseaseStats?.hotspot
                                                    || resolvePrimaryHotspots(diseaseAnalytics?.provinceBreakdown).label
                                                    || 'N/A'}
                                            </span>
                                            {(diseaseInsights.summary?.primaryHotspots?.length || 0) > 1 && (
                                                <p className="text-[10px] text-amber-400/90 mt-1">
                                                    Tied — {diseaseInsights.summary.primaryHotspots.length} provinces at {diseaseInsights.summary.hotspotCases} cases each
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Target Demographic</p>
                                    <div className="flex items-center gap-2">
                                        <UserGroupIcon className="h-5 w-5 text-pink-400" />
                                        <span className="text-xl font-black text-white uppercase">{diseaseInsights.summary?.primaryAgeGroup}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Demographic bars */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Age Distribution</h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Pediatric (0-18)', value: diseaseInsights.demographics?.child, color: 'bg-cyan-500' },
                                            { label: 'Adult (19-64)', value: diseaseInsights.demographics?.adult, color: 'bg-purple-500' },
                                            { label: 'Geriatric (65+)', value: diseaseInsights.demographics?.elderly, color: 'bg-pink-500' }
                                        ].map(({ label, value, color }) => (
                                            <div key={label}>
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                                                    <span className="text-gray-400">{label}</span>
                                                    <span className="text-white">{value || 0}%</span>
                                                </div>
                                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                                    <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width: `${value || 0}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Vital signs profile */}
                                {diseaseAnalytics?.vitalsProfile && (
                                    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <HeartIcon className="h-4 w-4 text-red-400" />
                                            Typical Vital Signs Profile
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {diseaseAnalytics.vitalsProfile.temperature && (
                                                <div className="bg-white/5 rounded-lg p-3">
                                                    <p className="text-[10px] text-gray-500 uppercase">Temperature</p>
                                                    <p className={`text-lg font-black ${diseaseAnalytics.vitalsProfile.temperature > 37.5 ? 'text-red-400' : 'text-white'}`}>
                                                        {diseaseAnalytics.vitalsProfile.temperature}°C
                                                    </p>
                                                </div>
                                            )}
                                            {diseaseAnalytics.vitalsProfile.heartRate && (
                                                <div className="bg-white/5 rounded-lg p-3">
                                                    <p className="text-[10px] text-gray-500 uppercase">Heart Rate</p>
                                                    <p className={`text-lg font-black ${diseaseAnalytics.vitalsProfile.heartRate > 100 ? 'text-orange-400' : 'text-white'}`}>
                                                        {diseaseAnalytics.vitalsProfile.heartRate} bpm
                                                    </p>
                                                </div>
                                            )}
                                            {diseaseAnalytics.vitalsProfile.bloodPressure?.systolic && (
                                                <div className="bg-white/5 rounded-lg p-3">
                                                    <p className="text-[10px] text-gray-500 uppercase">Blood Pressure</p>
                                                    <p className={`text-lg font-black ${diseaseAnalytics.vitalsProfile.bloodPressure.systolic > 140 ? 'text-red-400' : 'text-white'}`}>
                                                        {diseaseAnalytics.vitalsProfile.bloodPressure.systolic}/{diseaseAnalytics.vitalsProfile.bloodPressure.diastolic}
                                                    </p>
                                                </div>
                                            )}
                                            {diseaseAnalytics.vitalsProfile.oxygenSaturation && (
                                                <div className="bg-white/5 rounded-lg p-3">
                                                    <p className="text-[10px] text-gray-500 uppercase">O₂ Saturation</p>
                                                    <p className={`text-lg font-black ${diseaseAnalytics.vitalsProfile.oxygenSaturation < 95 ? 'text-red-400' : 'text-white'}`}>
                                                        {diseaseAnalytics.vitalsProfile.oxygenSaturation}%
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-600 mt-3">Based on {diseaseAnalytics.vitalsProfile.sampleSize} records with vitals</p>
                                    </div>
                                )}
                            </div>

                            {/* AI Recommendations */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">
                                    AI Recommended Actions
                                    {recommendationList.length > 0 && (
                                        <span className="ml-2 text-purple-400">({recommendationList.length} from records)</span>
                                    )}
                                </h3>
                                {recommendationList.length === 0 ? (
                                    <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-white/10 rounded-xl">
                                        {NO_DATA} Add medical records for this disease to generate recommendations.
                                    </p>
                                ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                                    {recommendationList.map((rec, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300">
                                            <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                                                rec.type === 'URGENT' || rec.type === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                                rec.type === 'PREVENTION' ? 'bg-green-500/20 text-green-400' :
                                                'bg-purple-500/20 text-purple-400'
                                            }`}>
                                                <SparklesIcon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">{rec.title}</p>
                                                <p className="text-xs text-gray-300 leading-relaxed">{rec.action}</p>
                                                <p className="text-[10px] text-gray-500 mt-1 font-mono">{rec.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {hasDiseaseProfile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {diseaseProfile.recentGrowth && (
                        <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5">
                            <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-2">Recent activity</p>
                            <p className="text-sm text-gray-200">{diseaseProfile.recentGrowth}</p>
                        </div>
                    )}
                    {diseaseProfile.peakMonth && (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Peak month (recorded)</p>
                            <p className="text-sm text-gray-200">{diseaseProfile.peakMonth}</p>
                        </div>
                    )}
                    {diseaseProfile.outcomeSummary && (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Outcomes (recorded)</p>
                            <p className="text-sm text-gray-200">{diseaseProfile.outcomeSummary}</p>
                        </div>
                    )}
                    {diseaseProfile.focusAreas?.length > 0 && (
                        <div className="md:col-span-3 rounded-xl bg-white/5 border border-white/10 p-5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Data-driven focus areas</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {diseaseProfile.focusAreas.map((area) => (
                                    <li key={area} className="text-xs text-purple-300 flex items-start gap-2">
                                        <FireIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                        {area}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* ── CLINICAL ANALYTICS ── */}
            <section className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Clinical Analytics</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Trends, hotspots, and regional burden for {selectedDisease}</p>
                    </div>
                </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Trend Chart */}
                <div className="lg:col-span-2 rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Case Trend — {selectedDisease}</h2>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Actuals + AI 3-month projection</p>
                        </div>
                        <div className="flex gap-2">
                            {['3months', '6months', '12months'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDiseaseTimeRange(range)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                                        diseaseTimeRange === range
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                            : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {range === '3months' ? '3M' : range === '6months' ? '6M' : '12M'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <CpuChipIcon className="h-3.5 w-3.5" /> AI Trend Insight
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {trendInsightText || NO_DATA}
                        </p>
                    </div>
                    {trendChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={trendChartData}>
                                <defs>
                                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35}/>
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="label" stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Area type="monotone" dataKey="actual" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#trendGrad)" name="Actual" connectNulls={false} />
                                <Line type="monotone" dataKey="projected" stroke="#F472B6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="Projected" connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                            <ChartBarIcon className="h-10 w-10 mb-3 opacity-20" />
                            <p className="text-xs font-mono uppercase tracking-widest">No trend data for this period</p>
                        </div>
                    )}
                </div>

                {/* Province Breakdown for Selected Disease */}
                <div className="lg:col-span-1 rounded-xl bg-white/5 border border-white/10 p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">
                        Province Breakdown
                        {selectedDisease && <span className="block text-[10px] text-purple-400 font-normal mt-0.5">{selectedDisease}</span>}
                    </h3>
                    {provinceData.length > 0 ? (
                        <div className="space-y-2">
                            {provinceData.map((prov, idx) => (
                                <div key={prov.name} className="flex items-center gap-3">
                                    <span className="text-[10px] text-gray-500 w-4">{idx + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-0.5">
                                            <span className="text-gray-300 font-medium">{prov.name}</span>
                                            <span className="text-white font-bold">{prov.value}</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${provinceData[0]?.value > 0 ? clampPercent((prov.value / provinceData[0].value) * 100) : 0}%`,
                                                    backgroundColor: COLORS[idx % COLORS.length]
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 text-sm">No regional data</div>
                    )}
                </div>
            </div>

            {/* ── SYMPTOMS + OUTCOMES + VISIT TYPES ── */}
            {diseaseAnalytics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                    {/* Top Symptoms */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                            <ClipboardDocumentListIcon className="h-4 w-4 text-cyan-400" />
                            Top Symptoms
                        </h3>
                        {diseaseAnalytics.topSymptoms?.length > 0 ? (
                            <div className="space-y-2.5">
                                {diseaseAnalytics.topSymptoms.map((s, idx) => (
                                    <div key={s.symptom}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-300 capitalize">{s.symptom}</span>
                                            <span className="text-white font-bold">{s.percentage}%</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                                style={{ width: `${s.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-8">No symptom data</p>
                        )}
                    </div>

                    {/* Outcomes Breakdown */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                            <CheckCircleIcon className="h-4 w-4 text-green-400" />
                            Patient Outcomes
                        </h3>
                        {Object.keys(diseaseAnalytics.outcomes || {}).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(diseaseAnalytics.outcomes).map(([outcome, data]) => {
                                    const color =
                                        outcome === 'Discharged' ? 'from-green-500 to-emerald-500' :
                                        outcome === 'Admitted' ? 'from-yellow-500 to-orange-500' :
                                        outcome === 'Deceased' ? 'from-red-600 to-red-700' :
                                        outcome === 'Transferred' ? 'from-blue-500 to-cyan-500' :
                                        'from-gray-500 to-gray-600';
                                    return (
                                        <div key={outcome}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-300">{outcome}</span>
                                                <span className="text-white font-bold">{data.count} <span className="text-gray-500">({data.percentage}%)</span></span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                                <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${data.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-8">No outcome data</p>
                        )}
                    </div>

                    {/* Visit Types */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                            <BeakerIcon className="h-4 w-4 text-purple-400" />
                            Visit Types
                        </h3>
                        {diseaseAnalytics.visitTypes?.length > 0 ? (
                            <div className="space-y-3">
                                {diseaseAnalytics.visitTypes.map((v, idx) => (
                                    <div key={v.type}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-300">{v.type || 'Unknown'}</span>
                                            <span className="text-white font-bold">{v.count} <span className="text-gray-500">({v.percentage}%)</span></span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${v.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-8">No visit type data</p>
                        )}
                    </div>
                </div>
            )}
            </section>

            {/* ── NATIONAL OVERVIEW ── */}
            <section className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">National Overview</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">System volume, 3-month forecast, top-10 disease mix</p>
                    </div>
                </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Monthly Volume & Forecast</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Total visits with 3-month linear projection</p>
                    </div>
                    <div className="flex gap-2">
                        {['3months', '6months', '12months'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setOverviewTimeRange(range)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                                    overviewTimeRange === range
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                        : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {range === '3months' ? '3M' : range === '6months' ? '6M' : '12M'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mb-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <SparklesIcon className="h-3.5 w-3.5" /> System Forecast Insight
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">{overviewInsightText || NO_DATA}</p>
                </div>
                {(overviewLineData.length > 0 || stackedMonthlyData.length > 0) ? (
                    <>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={overviewLineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Area type="monotone" dataKey="actual" stroke="#06B6D4" strokeWidth={2} fill="#06B6D4" fillOpacity={0.12} name="Total actual" connectNulls={false} />
                            <Line type="monotone" dataKey="projected" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3" name="Projected" connectNulls />
                        </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-6 mb-3">Top {TOP_DISEASE_LIMIT} diseases by month (remainder in Other)</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stackedMonthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} itemStyle={{ fontSize: '11px' }} />
                            <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                            {stackedBarKeys.map((key, idx) => (
                                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[idx % COLORS.length]} name={key} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <ChartBarIcon className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-xs font-mono uppercase tracking-widest">No monthly data available</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {distributionChart.pie.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6 lg:col-span-1">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Overall Disease Distribution</h3>
                        <p className="text-[10px] text-gray-500 mb-4">Top {TOP_DISEASE_LIMIT} only{distributionChart.otherCount > 0 ? ' · Other groups the rest' : ''}</p>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={distributionChart.pie} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" nameKey="name">
                                        {distributionChart.pie.map((entry, index) => (
                                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [`${v} cases`, n]} contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {distributionChart.pie.map((d, idx) => (
                                    <div key={d.name} className="flex justify-between gap-2 text-[10px]">
                                        <span className="text-gray-400 truncate"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />{d.name}</span>
                                        <span className="text-white font-bold tabular-nums">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {diseaseAnalytics?.yearlyTrend?.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Year-over-Year — {selectedDisease}</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={diseaseAnalytics.yearlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="year" stroke="rgba(255,255,255,0.2)" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                                <Bar dataKey="count" name="Cases" radius={[4, 4, 0, 0]}>
                                    {diseaseAnalytics.yearlyTrend.map((entry, index) => (
                                        <Cell key={`yr-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
            </section>

            {/* ── EPIDEMIOLOGICAL RADAR (selected disease) ── */}
            {diseaseInsights?.demographics && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldExclamationIcon className="h-4 w-4 text-orange-400" />
                        Risk Radar — {selectedDisease}
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={[
                            { metric: 'Pediatric', value: clampPercent(diseaseInsights.demographics.child) },
                            { metric: 'Adult', value: clampPercent(diseaseInsights.demographics.adult) },
                            { metric: 'Geriatric', value: clampPercent(diseaseInsights.demographics.elderly) },
                            { metric: 'Growth', value: clampPercent(Math.abs(diseaseInsights.summary?.growthRate || 0)) },
                            { metric: 'Burden', value: clampPercent(diseaseStats?.prevalenceShare || 0) }
                        ]}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.35} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            )}

        </div>
    );
};

export default Analytics;
