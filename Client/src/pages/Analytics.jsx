import React, { useState, useEffect, useCallback } from 'react';
import {
    getTopDiseases,
    getProvinceStats,
    getMonthlyTrends,
    getAIStats,
    getDiseaseTrends,
    getPatientCount
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
    CpuChipIcon
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
    Pie
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
    const [patientCount, setPatientCount] = useState(0);
    const [loading, setLoading] = useState(true);
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
            try {
                const response = await getDiseaseTrends(selectedDisease);
                setDiseaseTrends(response.data || []);
            } catch (error) {
                console.error('Failed to load disease trends', error);
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

    const processProvinceChartData = () => {
        return provinceStats.map(prov => ({
            name: prov._id,
            value: prov.total,
            diseases: prov.diseases
        })).sort((a, b) => b.value - a.value);
    };

    const calculateTotalCases = () => {
        return topDiseases.reduce((sum, d) => sum + d.count, 0);
    };

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

    const totalCases = calculateTotalCases();
    const growthRate = cachedGrowthRate !== null ? cachedGrowthRate : 0;
    const provinceData = processProvinceChartData();
    const monthlyChartData = processMonthlyChartData();

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
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
                            <button
                                onClick={loadAnalyticsData}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                            >
                                <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div><p className="text-gray-400 text-sm">Total Patients</p><p className="text-3xl font-bold text-white">{patientCount}</p></div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><UserGroupIcon className="h-6 w-6 text-blue-400" /></div>
                    </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div><p className="text-gray-400 text-sm">Total Cases</p><p className="text-3xl font-bold text-white">{totalCases}</p></div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center"><BeakerIcon className="h-6 w-6 text-emerald-400" /></div>
                    </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div><p className="text-gray-400 text-sm">Diseases Tracked</p><p className="text-3xl font-bold text-white">{aiStats?.diseasesTracked || 0}</p></div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center"><ChartBarIcon className="h-6 w-6 text-purple-400" /></div>
                    </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div><p className="text-gray-400 text-sm">Provinces Active</p><p className="text-3xl font-bold text-white">{provinceStats.length}</p></div>
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center"><MapIcon className="h-6 w-6 text-orange-400" /></div>
                    </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div><p className="text-gray-400 text-sm">Disease Prevalance Rate</p><p className={`text-3xl font-bold ${parseFloat(growthRate) >= 0 ? 'text-red-400' : 'text-green-400'}`}>{growthRate}%</p></div>
                        <div className={`w-12 h-12 rounded-xl ${parseFloat(growthRate) >= 0 ? 'bg-red-500/20' : 'bg-green-500/20'} flex items-center justify-center`}>
                            {parseFloat(growthRate) >= 0 ? <ArrowTrendingUpIcon className="h-6 w-6 text-red-400" /> : <ArrowTrendingDownIcon className="h-6 w-6 text-green-400" />}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">vs previous month</p>
                </div>
            </div>

            {/* Chart Type Selector */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-1 mb-6 inline-flex">
                {[
                    { id: 'trends', label: 'Time Trends', icon: '📈' },
                    { id: 'diseases', label: 'Disease Distribution', icon: '🏥' },
                    { id: 'geography', label: 'Geographic Distribution', icon: '🗺️' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveChart(tab.id)}
                        className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                            activeChart === tab.id
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Time Trends Chart */}
            {activeChart === 'trends' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <h2 className="text-xl font-bold text-white">Disease Trends Over Time</h2>
                        <div className="flex space-x-2">
                            {['3months', '6months', '12months'].map((range) => (
                                <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 ${timeRange === range ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                                    {range === '3months' ? '3 Months' : range === '6months' ? '6 Months' : '12 Months'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {monthlyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={monthlyChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" />
                                <YAxis stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                {topDiseases.slice(0, 5).map((disease, idx) => (
                                    <Line key={disease._id} type="monotone" dataKey={disease._id} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <div className="text-center py-12 text-gray-400">No trend data available</div>}
                </div>
            )}

            {/* Disease Distribution */}
            {activeChart === 'diseases' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Top 10 Diseases</h2>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={topDiseases.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="rgba(255,255,255,0.3)" />
                                <YAxis type="category" dataKey="_id" width={100} stroke="rgba(255,255,255,0.3)" tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                    {topDiseases.slice(0, 10).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Disease Selector</h2>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Select Disease</label>
                            <select value={selectedDisease} onChange={(e) => setSelectedDisease(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                {topDiseases.map(disease => <option key={disease._id} value={disease._id}>{disease._id} ({disease.count} cases)</option>)}
                            </select>
                        </div>
                        {diseaseTrends.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-white mb-3">Monthly Trend for {selectedDisease}</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={diseaseTrends}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="_id.month" tickFormatter={(value) => months[value - 1]} stroke="rgba(255,255,255,0.3)" />
                                        <YAxis stroke="rgba(255,255,255,0.3)" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                        <Area type="monotone" dataKey="count" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Geographic Distribution */}
            {activeChart === 'geography' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Cases by Province</h2>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={provinceData} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="rgba(255,255,255,0.3)" />
                                <YAxis type="category" dataKey="name" width={100} stroke="rgba(255,255,255,0.3)" tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {provinceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Disease Breakdown by Province</h2>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            {provinceData.slice(0, 6).map(province => (
                                <div key={province.name} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                    <h3 className="font-semibold text-purple-400 mb-2">{province.name}</h3>
                                    <div className="space-y-1">
                                        {province.diseases?.slice(0, 3).map((disease, idx) => (
                                            <div key={idx} className="flex justify-between text-sm"><span className="text-gray-400">{disease.name}</span><span className="text-white font-medium">{disease.cases} cases</span></div>
                                        ))}
                                        {province.diseases?.length > 3 && <p className="text-xs text-gray-500">+{province.diseases.length - 3} more diseases</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;