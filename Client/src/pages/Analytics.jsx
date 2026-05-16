﻿import React, { useState, useEffect, useCallback } from 'react';
import {
    getTopDiseases,
    getProvinceStats,
    getMonthlyTrends,
    getAIStats,
    getDiseaseTrends,
    getDiseaseInsights,
    getPatientCount,
    getDiseaseAnalytics
} from '../services/api';
import { useAuth } from '../context/useAuth';
import { useDataRefresh } from '../context/useDataRefresh';
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
    ClipboardDocumentListIcon
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
    const canViewAnalytics = hasPermission('view:analytics');
    
    const [topDiseases, setTopDiseases] = useState([]);
    const [provinceStats, setProvinceStats] = useState([]);
    const [monthlyTrends, setMonthlyTrends] = useState([]);
    const [aiStats, setAiStats] = useState(null);
    const [selectedDisease, setSelectedDisease] = useState('');
    const [diseaseTrends, setDiseaseTrends] = useState([]);
    const [diseaseInsights, setDiseaseInsights] = useState(null);
    const [diseaseAnalytics, setDiseaseAnalytics] = useState(null);
    const [patientCount, setPatientCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [diseaseLoading, setDiseaseLoading] = useState(false);
    const [timeRange, setTimeRange] = useState('6months');
    const [activeChart, setActiveChart] = useState('trends');
    const [cachedGrowthRate, setCachedGrowthRate] = useState(null);
    const [lastDataHash, setLastDataHash] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#F97316', '#6366F1', '#A855F7'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getDataHash = (data) => JSON.stringify(data);

    const calculateGrowthRateFromData = (trendsData) => {
        if (!trendsData || trendsData.length < 2) return 0;
        
        const monthlyTotals = {};
        trendsData.forEach(item => {
            const key = `${item._id.year}-${item._id.month}`;
            monthlyTotals[key] = (monthlyTotals[key] || 0) + item.count;
        });
        
        const months = Object.keys(monthlyTotals).sort();
        if (months.length < 2) return 0;
        
        const lastTotal = monthlyTotals[months[months.length - 1]];
        const prevTotal = monthlyTotals[months[months.length - 2]];
        
        if (prevTotal === 0) return 0;
        return ((lastTotal - prevTotal) / prevTotal * 100).toFixed(1);
    };

    const loadAnalyticsData = useCallback(async () => {
        setLoading(true);
        try {
            const [diseasesRes, provinceRes, trendsRes, statsRes, patientCountRes] = await Promise.all([
                getTopDiseases(),
                getProvinceStats(),
                getMonthlyTrends(),
                getAIStats(),
                getPatientCount()
            ]);
            
            setTopDiseases(diseasesRes.data || []);
            setProvinceStats(provinceRes.data || []);
            setMonthlyTrends(trendsRes.data || []);
            setAiStats(statsRes.data);
            setPatientCount(patientCountRes.data?.count || 0);
            
            const newHash = getDataHash(trendsRes.data);
            if (newHash !== lastDataHash) {
                setCachedGrowthRate(calculateGrowthRateFromData(trendsRes.data));
                setLastDataHash(newHash);
            }
            setLastUpdated(new Date());
            
            if (diseasesRes.data && diseasesRes.data.length > 0 && !selectedDisease) {
                setSelectedDisease(diseasesRes.data[0]._id);
            }
        } catch  {
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    }, [lastDataHash, selectedDisease]);

    useEffect(() => {
        const loadDiseaseTrends = async () => {
            if (!selectedDisease) return;
            setDiseaseLoading(true);
            try {
                const [trendsRes, insightsRes, analyticsRes] = await Promise.all([
                    getDiseaseTrends(selectedDisease),
                    getDiseaseInsights(selectedDisease),
                    getDiseaseAnalytics(selectedDisease)
                ]);
                setDiseaseTrends(trendsRes.data || []);
                setDiseaseInsights(insightsRes.data);
                setDiseaseAnalytics(analyticsRes.data);
            } catch (error) {
                console.error('Failed to load disease data', error);
            } finally {
                setDiseaseLoading(false);
            }
        };
        loadDiseaseTrends();
    }, [selectedDisease]);

    useEffect(() => {
        if (canViewAnalytics) {
            loadAnalyticsData();
        }
    }, [canViewAnalytics, refreshTrigger, loadAnalyticsData]);

    const filterMonthlyData = () => {
        let monthsToShow = 6;
        if (timeRange === '3months') monthsToShow = 3;
        if (timeRange === '6months') monthsToShow = 6;
        if (timeRange === '12months') monthsToShow = 12;
        return monthlyTrends.slice(-monthsToShow);
    };

    const processMonthlyChartData = () => {
        const filtered = filterMonthlyData();
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
        return topDiseases.reduce((sum, d) => sum + d.count, 0);
    };

    // Filter disease trends by time range
    const filterDiseaseTrends = () => {
        if (!diseaseTrends.length) return [];
        let monthsToShow = 6;
        if (timeRange === '3months') monthsToShow = 3;
        if (timeRange === '12months') monthsToShow = 12;
        return diseaseTrends.slice(-monthsToShow).map(d => ({
            ...d,
            label: `${months[d._id.month - 1]} ${d._id.year}`
        }));
    };

    // Get selected disease stats card values
    const getSelectedDiseaseStats = () => {
        if (!diseaseAnalytics) return null;
        const da = diseaseAnalytics;
        const discharged = da.outcomes?.['Discharged']?.count || 0;
        const admitted = da.outcomes?.['Admitted']?.count || 0;
        const deceased = da.outcomes?.['Deceased']?.count || 0;
        const total = da.totalCases || 1;
        return {
            totalCases: da.totalCases,
            growthRate: da.growthRate,
            recoveryRate: Math.round((discharged / total) * 100),
            admissionRate: Math.round((admitted / total) * 100),
            mortalityRate: Math.round((deceased / total) * 100),
            hotspot: da.provinceBreakdown?.[0]?.province || 'N/A',
            hotspotCases: da.provinceBreakdown?.[0]?.count || 0
        };
    };

    const totalCases = calculateTotalCases();
    const growthRate = cachedGrowthRate !== null ? cachedGrowthRate : 0;
    const provinceData = processProvinceChartData();
    const filteredTrends = filterDiseaseTrends();
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
                    <p className="text-gray-400 text-xs mb-1">Prevalence Rate</p>
                    <p className={`text-3xl font-bold ${parseFloat(growthRate) >= 0 ? 'text-red-400' : 'text-green-400'}`}>{growthRate}%</p>
                    {parseFloat(growthRate) >= 0
                        ? <ArrowTrendingUpIcon className="h-5 w-5 text-red-400 mt-2" />
                        : <ArrowTrendingDownIcon className="h-5 w-5 text-green-400 mt-2" />}
                    <p className="text-[10px] text-gray-500 mt-1">vs prev month</p>
                </div>
            </div>

            {/* ── DISEASE SELECTOR + DISEASE-SPECIFIC STATS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">

                {/* Disease List */}
                <div className="lg:col-span-1 rounded-xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BeakerIcon className="h-4 w-4 text-purple-400" />
                        Disease Focus
                    </h2>
                    <p className="text-[10px] text-gray-500 mb-3 uppercase tracking-widest">Default: highest cases</p>
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {topDiseases.map((disease, idx) => (
                            <button
                                key={idx}
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
                                    {idx === 0 && selectedDisease !== disease._id && (
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
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Monthly Growth</p>
                                    <p className={`text-2xl font-black ${diseaseStats.growthRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {diseaseStats.growthRate > 0 ? '+' : ''}{diseaseStats.growthRate}%
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">vs previous month</p>
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
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Primary Hotspot</p>
                                    <p className="text-lg font-black text-purple-400 uppercase">{diseaseStats.hotspot}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{diseaseStats.hotspotCases} cases</p>
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

            {/* ── AI DECISION SUPPORT ── */}
            {diseaseInsights && (
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
                                        <p className="text-2xl font-black text-white">{diseaseInsights.aiConfidence?.toFixed(1)}%</p>
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
                                        {diseaseInsights.summary?.growthRate > 0 ? '+' : ''}{diseaseInsights.summary?.growthRate}%
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">vs previous month</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Primary Hotspot</p>
                                    <div className="flex items-center gap-2">
                                        <MapIcon className="h-5 w-5 text-purple-400" />
                                        <span className="text-xl font-black text-white uppercase">{diseaseInsights.summary?.hotspot}</span>
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
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">AI Recommended Actions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {diseaseInsights.recommendations?.map((rec, idx) => (
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
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TREND CHART + PROVINCE BREAKDOWN ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Trend Chart */}
                <div className="lg:col-span-2 rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Case Trend — {selectedDisease}</h2>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Monthly incident reports</p>
                        </div>
                        <div className="flex gap-2">
                            {['3months', '6months', '12months'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                                        timeRange === range
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                            : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {range === '3months' ? '3M' : range === '6months' ? '6M' : '12M'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {filteredTrends.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={filteredTrends}>
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
                                <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#trendGrad)" name="Cases" />
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
                            {provinceData.slice(0, 8).map((prov, idx) => (
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
                                                    width: `${provinceData[0]?.value > 0 ? (prov.value / provinceData[0].value) * 100 : 0}%`,
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
                                {diseaseAnalytics.topSymptoms.slice(0, 8).map((s, idx) => (
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

            {/* ── YEARLY TREND + DISEASE DISTRIBUTION PIE ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                {/* Yearly Trend Bar Chart */}
                {diseaseAnalytics?.yearlyTrend?.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">
                            Year-over-Year — {selectedDisease}
                        </h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={diseaseAnalytics.yearlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="year" stroke="rgba(255,255,255,0.2)" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} itemStyle={{ color: '#fff' }} />
                                <Bar dataKey="count" name="Cases" radius={[4, 4, 0, 0]}>
                                    {diseaseAnalytics.yearlyTrend.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Disease Distribution Pie */}
                {topDiseases.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">
                            Overall Disease Distribution
                        </h3>
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="50%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={topDiseases.slice(0, 8).map(d => ({ name: d._id, value: d.count }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {topDiseases.slice(0, 8).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-1.5">
                                {topDiseases.slice(0, 8).map((d, idx) => (
                                    <div key={d._id} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        <span className="text-[10px] text-gray-400 truncate flex-1">{d._id}</span>
                                        <span className="text-[10px] text-white font-bold">{d.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── ALL-DISEASES MONTHLY OVERVIEW ── */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
                <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">All-Disease Monthly Overview</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">System-wide case volume across all diseases</p>
                    </div>
                    <div className="flex gap-2">
                        {['3months', '6months', '12months'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                                    timeRange === range
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                        : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {range === '3months' ? '3M' : range === '6months' ? '6M' : '12M'}
                            </button>
                        ))}
                    </div>
                </div>
                {processMonthlyChartData().length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={processMonthlyChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} itemStyle={{ fontSize: '11px' }} />
                            <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                            {topDiseases.slice(0, 5).map((disease, idx) => (
                                <Bar key={disease._id} dataKey={disease._id} stackId="a" fill={COLORS[idx % COLORS.length]} radius={idx === 4 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <ChartBarIcon className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-xs font-mono uppercase tracking-widest">No monthly data available</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Analytics;
