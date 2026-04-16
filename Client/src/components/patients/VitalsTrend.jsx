import React, { useState } from 'react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import {
    HeartIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ChartBarIcon,
    PrinterIcon,
    ArrowPathIcon,
    BeakerIcon,
    ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const VitalsTrend = ({ vitalsHistory = [], patientName = '', onRefresh }) => {
    const [selectedVital, setSelectedVital] = useState('bloodPressure');
    const [timeRange, setTimeRange] = useState('all');

    console.log('VitalsTrend received:', vitalsHistory.length, 'records');

    // Filter data based on time range
    const getFilteredData = () => {
        if (!vitalsHistory || vitalsHistory.length === 0) return [];
        
        let filtered = [...vitalsHistory];
        const now = new Date();
        
        if (timeRange === '3months') {
            const cutoff = new Date();
            cutoff.setMonth(now.getMonth() - 3);
            filtered = filtered.filter(v => new Date(v.visitDate) > cutoff);
        } else if (timeRange === '6months') {
            const cutoff = new Date();
            cutoff.setMonth(now.getMonth() - 6);
            filtered = filtered.filter(v => new Date(v.visitDate) > cutoff);
        } else if (timeRange === '12months') {
            const cutoff = new Date();
            cutoff.setFullYear(now.getFullYear() - 1);
            filtered = filtered.filter(v => new Date(v.visitDate) > cutoff);
        }
        
        return filtered.sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate));
    };

    const filteredData = getFilteredData();
    
    // Prepare chart data
    const chartData = filteredData.map(record => ({
        date: new Date(record.visitDate).toLocaleDateString(),
        fullDate: record.visitDate,
        temperature: record.vitalSigns?.temperature,
        heartRate: record.vitalSigns?.heartRate,
        respiratoryRate: record.vitalSigns?.respiratoryRate,
        oxygenSaturation: record.vitalSigns?.oxygenSaturation,
        systolicBP: record.vitalSigns?.bloodPressure?.systolic,
        diastolicBP: record.vitalSigns?.bloodPressure?.diastolic,
        weight: record.vitalSigns?.weight,
        bmi: record.vitalSigns?.bmi,
        painScore: record.vitalSigns?.painScore
    }));

    const getVitalRanges = (vital) => {
        const ranges = {
            temperature: { normal: [36.1, 37.2], low: 36.0, high: 37.3 },
            heartRate: { normal: [60, 100], low: 59, high: 101 },
            respiratoryRate: { normal: [12, 20], low: 11, high: 21 },
            oxygenSaturation: { normal: [95, 100], low: 94, high: 101 },
            systolicBP: { normal: [90, 120], low: 89, high: 121 },
            diastolicBP: { normal: [60, 80], low: 59, high: 81 },
            bmi: { normal: [18.5, 24.9], low: 18.4, high: 25 },
            painScore: { normal: [0, 3], low: -1, high: 4 }
        };
        return ranges[vital] || { normal: [0, 100], low: 0, high: 100 };
    };

    const getStatusColor = (value, vital) => {
        if (!value) return 'text-gray-400';
        const ranges = getVitalRanges(vital);
        if (value < ranges.normal[0]) return 'text-blue-400';
        if (value > ranges.normal[1]) return 'text-orange-400';
        return 'text-green-400';
    };

    const getTrendIcon = (data, key) => {
        if (data.length < 2) return null;
        const first = data[0]?.[key];
        const last = data[data.length - 1]?.[key];
        if (!first || !last) return null;
        if (last > first) return <ArrowTrendingUpIcon className="h-4 w-4 text-red-400" />;
        if (last < first) return <ArrowTrendingDownIcon className="h-4 w-4 text-green-400" />;
        return <ChartBarIcon className="h-4 w-4 text-gray-400" />;
    };

    const getLatestValue = (key) => {
        const latest = vitalsHistory[0];
        if (!latest) return null;
        if (key === 'systolicBP') return latest.vitalSigns?.bloodPressure?.systolic;
        if (key === 'diastolicBP') return latest.vitalSigns?.bloodPressure?.diastolic;
        return latest.vitalSigns?.[key];
    };

    const getBMICategory = (bmi) => {
        if (!bmi) return null;
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-400' };
        if (bmi < 25) return { label: 'Normal', color: 'text-green-400' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-orange-400' };
        return { label: 'Obese', color: 'text-red-400' };
    };

    const getPainScoreColor = (score) => {
        if (!score) return 'text-gray-400';
        if (score <= 3) return 'text-green-400';
        if (score <= 6) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getOxygenStatus = (spo2) => {
        if (!spo2) return null;
        if (spo2 >= 95) return { label: 'Normal', color: 'text-green-400' };
        if (spo2 >= 90) return { label: 'Low', color: 'text-yellow-400' };
        return { label: 'Critical', color: 'text-red-400' };
    };

    const vitals = [
        { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️', normalRange: '36.1-37.2' },
        { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', icon: '❤️', normalRange: '60-100' },
        { key: 'respiratoryRate', label: 'Respiratory Rate', unit: '/min', icon: '🌬️', normalRange: '12-20' },
        { key: 'oxygenSaturation', label: 'O₂ Saturation', unit: '%', icon: '🫁', normalRange: '95-100' },
        { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg', icon: '💓', normalRange: '90-120' },
        { key: 'diastolicBP', label: 'Diastolic BP', unit: 'mmHg', icon: '💓', normalRange: '60-80' },
        { key: 'weight', label: 'Weight', unit: 'kg', icon: '⚖️', normalRange: 'Varies' },
        { key: 'bmi', label: 'BMI', unit: '', icon: '📊', normalRange: '18.5-24.9' },
        { key: 'painScore', label: 'Pain Score', unit: '/10', icon: '😖', normalRange: '0-3' }
    ];

    if (filteredData.length === 0 && vitalsHistory.length > 0) {
        return (
            <div className="text-center py-12">
                <HeartIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">No data for selected time range</p>
                <button onClick={() => setTimeRange('all')} className="mt-4 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all">Show All Time</button>
            </div>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className="text-center py-12">
                <HeartIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">No vital signs recorded yet</p>
                <p className="text-sm text-gray-500 mt-1">Vital signs will appear here after medical visits</p>
                {onRefresh && <button onClick={onRefresh} className="mt-4 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all">Refresh Data</button>}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <HeartIcon className="h-6 w-6 mr-2 text-purple-400" />
                        Vitals Trend Analysis
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Tracking {patientName}'s vital signs over time ({chartData.length} records)
                    </p>
                </div>
                <div className="flex space-x-2">
                    {onRefresh && <button onClick={onRefresh} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"><ArrowPathIcon className="h-5 w-5 text-gray-400" /></button>}
                    <button onClick={() => window.print()} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"><PrinterIcon className="h-5 w-5 text-gray-400" /></button>
                </div>
            </div>

            {/* Time Range Filter */}
            <div className="flex flex-wrap gap-2">
                {[
                    { value: 'all', label: 'All Time' },
                    { value: '3months', label: '3 Months' },
                    { value: '6months', label: '6 Months' },
                    { value: '12months', label: '12 Months' }
                ].map(range => (
                    <button key={range.value} onClick={() => setTimeRange(range.value)} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 ${timeRange === range.value ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                        {range.label}
                    </button>
                ))}
            </div>

            {/* Vital Stats Cards - All 9 vitals */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {vitals.map(vital => {
                    const latestValue = getLatestValue(vital.key);
                    if (!latestValue && vital.key !== 'bmi') return null;
                    return (
                        <div key={vital.key} className="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition-all duration-300 group">
                            <div className="text-2xl mb-1">{vital.icon}</div>
                            <p className="text-xs text-gray-400">{vital.label}</p>
                            <p className={`text-lg font-bold ${getStatusColor(latestValue, vital.key)}`}>
                                {latestValue || '-'}{vital.unit}
                            </p>
                            <div className="flex items-center justify-center mt-1">
                                {getTrendIcon(chartData, vital.key)}
                                <span className="text-xs text-gray-500 ml-1">{vital.normalRange}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Chart Selector - All options */}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedVital('bloodPressure')} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${selectedVital === 'bloodPressure' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    <span>💓</span><span>Blood Pressure</span>
                </button>
                <button onClick={() => setSelectedVital('temperature')} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${selectedVital === 'temperature' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    <span>🌡️</span><span>Temperature</span>
                </button>
                <button onClick={() => setSelectedVital('heartRate')} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${selectedVital === 'heartRate' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    <span>❤️</span><span>Heart Rate</span>
                </button>
                <button onClick={() => setSelectedVital('respiratoryRate')} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${selectedVital === 'respiratoryRate' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    <span>🌬️</span><span>Respiratory Rate</span>
                </button>
                <button onClick={() => setSelectedVital('oxygenSaturation')} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${selectedVital === 'oxygenSaturation' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    <span>🫁</span><span>O₂ Saturation</span>
                </button>
                <button onClick={() => setSelectedVital('weight')} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${selectedVital === 'weight' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    <span>⚖️</span><span>Weight/BMI</span>
                </button>
                <button onClick={() => setSelectedVital('painScore')} className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center space-x-2 ${selectedVital === 'painScore' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    <span>😖</span><span>Pain Score</span>
                </button>
            </div>

            {/* Chart */}
            <div className="bg-white/5 rounded-xl p-4">
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        {selectedVital === 'bloodPressure' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                <YAxis domain={[40, 180]} stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Low', fill: '#3b82f6', fontSize: 10 }} />
                                <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'High', fill: '#ef4444', fontSize: 10 }} />
                                <Line type="monotone" dataKey="systolicBP" stroke="#f59e0b" strokeWidth={2} name="Systolic BP" dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="diastolicBP" stroke="#ec4899" strokeWidth={2} name="Diastolic BP" dot={{ r: 3 }} />
                            </LineChart>
                        ) : selectedVital === 'temperature' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                <YAxis domain={[35, 40]} stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <ReferenceLine y={36.1} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Low', fill: '#3b82f6', fontSize: 10 }} />
                                <ReferenceLine y={37.2} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'High', fill: '#ef4444', fontSize: 10 }} />
                                <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} name="Temperature (°C)" dot={{ r: 3 }} />
                            </LineChart>
                        ) : selectedVital === 'heartRate' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                <YAxis domain={[40, 140]} stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Low', fill: '#3b82f6', fontSize: 10 }} />
                                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'High', fill: '#ef4444', fontSize: 10 }} />
                                <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} name="Heart Rate (bpm)" dot={{ r: 3 }} />
                            </LineChart>
                        ) : selectedVital === 'respiratoryRate' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                <YAxis domain={[8, 30]} stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <ReferenceLine y={12} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Low', fill: '#3b82f6', fontSize: 10 }} />
                                <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'High', fill: '#ef4444', fontSize: 10 }} />
                                <Line type="monotone" dataKey="respiratoryRate" stroke="#06b6d4" strokeWidth={2} name="Respiratory Rate (/min)" dot={{ r: 3 }} />
                            </LineChart>
                        ) : selectedVital === 'oxygenSaturation' ? (
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                <YAxis domain={[80, 100]} stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <ReferenceLine y={95} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Normal', fill: '#3b82f6', fontSize: 10 }} />
                                <Area type="monotone" dataKey="oxygenSaturation" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="O₂ Saturation (%)" />
                            </AreaChart>
                        ) : selectedVital === 'painScore' ? (
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <ReferenceLine y={3} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Mild', fill: '#3b82f6', fontSize: 10 }} />
                                <ReferenceLine y={6} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Severe', fill: '#ef4444', fontSize: 10 }} />
                                <Bar dataKey="painScore" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pain Score (/10)" />
                            </BarChart>
                        ) : (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                <YAxis stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2} name="Weight (kg)" dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="bmi" stroke="#ec4899" strokeWidth={2} name="BMI" dot={{ r: 3 }} />
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Data Table with ALL vitals */}
            <div className="bg-white/5 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <h3 className="font-semibold text-white flex items-center">
                        <ClipboardDocumentListIcon className="h-4 w-4 mr-2 text-purple-400" />
                        Historical Vitals Data
                    </h3>
                </div>
                <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Temp (°C)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">BP</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">HR (bpm)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">RR (/min)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">O₂ (%)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Weight (kg)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">BMI</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Pain</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {chartData.slice().reverse().map((record, idx) => {
                                const bmiCategory = getBMICategory(record.bmi);
                                const oxygenStatus = getOxygenStatus(record.oxygenSaturation);
                                return (
                                    <tr key={idx} className="hover:bg-white/5 transition-all duration-300">
                                        <td className="px-4 py-2 text-sm text-white whitespace-nowrap">{record.date}</td>
                                        <td className={`px-4 py-2 text-sm ${getStatusColor(record.temperature, 'temperature')}`}>{record.temperature?.toFixed(1) || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-white">{record.systolicBP && record.diastolicBP ? `${record.systolicBP}/${record.diastolicBP}` : '-'}</td>
                                        <td className={`px-4 py-2 text-sm ${getStatusColor(record.heartRate, 'heartRate')}`}>{record.heartRate || '-'}</td>
                                        <td className={`px-4 py-2 text-sm ${getStatusColor(record.respiratoryRate, 'respiratoryRate')}`}>{record.respiratoryRate || '-'}</td>
                                        <td className={`px-4 py-2 text-sm ${oxygenStatus?.color || 'text-white'}`}>{record.oxygenSaturation || '-'}%</td>
                                        <td className="px-4 py-2 text-sm text-white">{record.weight || '-'}</td>
                                        <td className={`px-4 py-2 text-sm ${bmiCategory?.color || 'text-white'}`}>{record.bmi?.toFixed(1) || '-'}</td>
                                        <td className={`px-4 py-2 text-sm ${getPainScoreColor(record.painScore)}`}>{record.painScore || '-'}/10</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Avg Heart Rate</p>
                    <p className="text-lg font-bold text-white">
                        {Math.round(chartData.reduce((sum, r) => sum + (r.heartRate || 0), 0) / chartData.filter(r => r.heartRate).length) || '-'} bpm
                    </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Avg Blood Pressure</p>
                    <p className="text-lg font-bold text-white">
                        {Math.round(chartData.reduce((sum, r) => sum + (r.systolicBP || 0), 0) / chartData.filter(r => r.systolicBP).length) || '-'}/
                        {Math.round(chartData.reduce((sum, r) => sum + (r.diastolicBP || 0), 0) / chartData.filter(r => r.diastolicBP).length) || '-'}
                    </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Avg Temperature</p>
                    <p className="text-lg font-bold text-white">
                        {Math.round((chartData.reduce((sum, r) => sum + (r.temperature || 0), 0) / chartData.filter(r => r.temperature).length) * 10) / 10 || '-'} °C
                    </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Total Records</p>
                    <p className="text-lg font-bold text-white">{chartData.length}</p>
                </div>
            </div>
        </div>
    );
};

export default VitalsTrend;