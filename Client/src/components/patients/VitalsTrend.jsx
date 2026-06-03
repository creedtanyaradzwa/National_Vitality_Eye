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
    ClipboardDocumentListIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const VitalsTrend = ({ vitalsHistory = [], patientName = '', onRefresh }) => {
    const [selectedVital, setSelectedVital] = useState('bloodPressure');
    const [timeRange, setTimeRange] = useState('all');
    const [showForecast, setShowForecast] = useState(false);
    const [showBaseline, setShowBaseline] = useState(false);

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

    // Calculate Personal Baseline (Average of all history)
    const getBaselineValue = (key) => {
        if (!vitalsHistory || vitalsHistory.length === 0) return null;
        let sum = 0;
        let count = 0;
        vitalsHistory.forEach(v => {
            const val = key === 'systolicBP' ? v.vitalSigns?.bloodPressure?.systolic :
                        key === 'diastolicBP' ? v.vitalSigns?.bloodPressure?.diastolic :
                        v.vitalSigns?.[key];
            if (val) {
                sum += val;
                count++;
            }
        });
        return count > 0 ? sum / count : null;
    };

    // Prepare chart data with simulated forecasting
    const chartData = filteredData.map((record, idx) => {
        const dataPoint = {
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
        };

        // Add baseline lines
        if (showBaseline) {
            dataPoint.tempBaseline = getBaselineValue('temperature');
            dataPoint.hrBaseline = getBaselineValue('heartRate');
            dataPoint.bpBaseline = getBaselineValue('systolicBP');
        }

        return dataPoint;
    });

    // Add forecast point if enabled
    if (showForecast && chartData.length > 2) {
        const last = chartData[chartData.length - 1];
        const prev = chartData[chartData.length - 2];
        const forecastPoint = {
            date: 'FORECAST',
            isForecast: true
        };
        
        // Simple linear extrapolation for prototype
        ['temperature', 'heartRate', 'systolicBP', 'diastolicBP'].forEach(key => {
            if (last[key] && prev[key]) {
                const diff = last[key] - prev[key];
                forecastPoint[key] = last[key] + (diff * 0.5); // Predict 50% of last trend
            }
        });
        chartData.push(forecastPoint);
    }

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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center tracking-tight">
                        <HeartIcon className="h-5 w-5 mr-2 text-purple-400" />
                        VITALS_TREND_ANALYSIS
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                        Tracking {patientName}'s vital signs ({chartData.length} entries)
                    </p>
                </div>
                <div className="flex space-x-1.5">
                    {onRefresh && <button onClick={onRefresh} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"><ArrowPathIcon className="h-4 w-4 text-gray-400" /></button>}
                    <button onClick={() => window.print()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"><PrinterIcon className="h-4 w-4 text-gray-400" /></button>
                </div>
            </div>

            {/* Time Range & AI Layer Toggles */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {[
                        { value: 'all', label: 'ALL_TIME' },
                        { value: '3months', label: '3_MONTHS' },
                        { value: '6months', label: '6_MONTHS' },
                        { value: '12months', label: '1_YEAR' }
                    ].map(range => (
                        <button key={range.value} onClick={() => setTimeRange(range.value)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeRange === range.value ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' : 'bg-white/5 text-gray-500 border border-transparent hover:border-white/10 hover:text-gray-300'}`}>
                            {range.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowBaseline(!showBaseline)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showBaseline ? 'bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue' : 'bg-white/5 text-gray-600 border border-transparent'}`}
                    >
                        <ChartBarIcon className="h-3 w-3" />
                        Personal Baseline
                    </button>
                    <button 
                        onClick={() => setShowForecast(!showForecast)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showForecast ? 'bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple' : 'bg-white/5 text-gray-600 border border-transparent'}`}
                    >
                        <SparklesIcon className="h-3 w-3" />
                        Neural Forecast
                    </button>
                </div>
            </div>

            {/* Vital Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {vitals.map(vital => {
                    const latestValue = getLatestValue(vital.key);
                    if (!latestValue && vital.key !== 'bmi') return null;
                    return (
                        <div key={vital.key} className="bg-brand-dark-950/50 rounded-xl p-3 border border-white/5 hover:border-purple-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-lg">{vital.icon}</span>
                                {getTrendIcon(chartData.filter(d => !d.isForecast), vital.key)}
                            </div>
                            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{vital.label}</p>
                            <p className={`text-base font-black tracking-tight ${getStatusColor(latestValue, vital.key)}`}>
                                {latestValue || '-'}{vital.unit}
                            </p>
                            <p className="text-[7px] font-mono text-gray-700 mt-1 uppercase">Norm: {vital.normalRange}</p>
                        </div>
                    );
                })}
            </div>

            {/* Chart Selector */}
            <div className="flex flex-wrap gap-1.5">
                {[
                    { key: 'bloodPressure', label: 'BP', icon: '💓' },
                    { key: 'temperature', label: 'TEMP', icon: '🌡️' },
                    { key: 'heartRate', label: 'HR', icon: '❤️' },
                    { key: 'respiratoryRate', label: 'RR', icon: '🌬️' },
                    { key: 'oxygenSaturation', label: 'SPO2', icon: '🫁' },
                    { key: 'weight', label: 'WEIGHT', icon: '⚖️' },
                    { key: 'painScore', label: 'PAIN', icon: '😖' }
                ].map(opt => (
                    <button 
                        key={opt.key}
                        onClick={() => setSelectedVital(opt.key)} 
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${selectedVital === opt.key ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-white/5 text-gray-500 border border-transparent hover:border-white/10 hover:text-gray-300'}`}
                    >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-brand-dark-950/50 rounded-2xl border border-white/5 p-4">
                <div className="h-64 min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {selectedVital === 'bloodPressure' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <YAxis domain={[40, 180]} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.3} />
                                <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />
                                {showBaseline && <Line type="monotone" dataKey="bpBaseline" stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" name="BASELINE" dot={false} />}
                                <Line type="monotone" dataKey="systolicBP" stroke="#f59e0b" strokeWidth={2} name="SYSTOLIC" dot={(props) => props.payload.isForecast ? <circle cx={props.cx} cy={props.cy} r={4} fill="#f59e0b" stroke="#fff" /> : <circle cx={props.cx} cy={props.cy} r={2} fill="#f59e0b" />} strokeDasharray={(props) => props.payload.isForecast ? "5 5" : "0"} />
                                <Line type="monotone" dataKey="diastolicBP" stroke="#ec4899" strokeWidth={2} name="DIASTOLIC" dot={(props) => props.payload.isForecast ? <circle cx={props.cx} cy={props.cy} r={4} fill="#ec4899" stroke="#fff" /> : <circle cx={props.cx} cy={props.cy} r={2} fill="#ec4899" />} strokeDasharray={(props) => props.payload.isForecast ? "5 5" : "0"} />
                            </LineChart>
                        ) : selectedVital === 'temperature' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <YAxis domain={[35, 40]} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <ReferenceLine y={36.1} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.3} />
                                <ReferenceLine y={37.2} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />
                                {showBaseline && <Line type="monotone" dataKey="tempBaseline" stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" name="BASELINE" dot={false} />}
                                <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} name="TEMP (°C)" dot={(props) => props.payload.isForecast ? <circle cx={props.cx} cy={props.cy} r={4} fill="#f59e0b" stroke="#fff" /> : <circle cx={props.cx} cy={props.cy} r={2} fill="#f59e0b" />} strokeDasharray={(props) => props.payload.isForecast ? "5 5" : "0"} />
                            </LineChart>
                        ) : selectedVital === 'heartRate' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <YAxis domain={[40, 140]} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.3} />
                                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />
                                {showBaseline && <Line type="monotone" dataKey="hrBaseline" stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" name="BASELINE" dot={false} />}
                                <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} name="HR (BPM)" dot={(props) => props.payload.isForecast ? <circle cx={props.cx} cy={props.cy} r={4} fill="#ef4444" stroke="#fff" /> : <circle cx={props.cx} cy={props.cy} r={2} fill="#ef4444" />} strokeDasharray={(props) => props.payload.isForecast ? "5 5" : "0"} />
                            </LineChart>
                        ) : (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey={selectedVital} stroke="#06b6d4" strokeWidth={2} name={selectedVital.toUpperCase()} dot={(props) => props.payload.isForecast ? <circle cx={props.cx} cy={props.cy} r={4} fill="#06b6d4" stroke="#fff" /> : <circle cx={props.cx} cy={props.cy} r={2} fill="#06b6d4" />} strokeDasharray={(props) => props.payload.isForecast ? "5 5" : "0"} />
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Historical Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                    { l: 'AVG_HEART_RATE', v: `${Math.round(chartData.filter(d => !d.isForecast).reduce((sum, r) => sum + (r.heartRate || 0), 0) / chartData.filter(r => r.heartRate && !r.isForecast).length) || '-'} BPM` },
                    { l: 'AVG_BLOOD_PRESSURE', v: `${Math.round(chartData.filter(d => !d.isForecast).reduce((sum, r) => sum + (r.systolicBP || 0), 0) / chartData.filter(r => r.systolicBP && !r.isForecast).length) || '-'}/${Math.round(chartData.filter(d => !d.isForecast).reduce((sum, r) => sum + (r.diastolicBP || 0), 0) / chartData.filter(r => r.diastolicBP && !r.isForecast).length) || '-'}` },
                    { l: 'AVG_TEMPERATURE', v: `${Math.round((chartData.filter(d => !d.isForecast).reduce((sum, r) => sum + (r.temperature || 0), 0) / chartData.filter(r => r.temperature && !r.isForecast).length) * 10) / 10 || '-'} °C` },
                    { l: 'TOTAL_SAMPLING', v: `${chartData.filter(d => !d.isForecast).length} NODES` }
                ].map((s, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                        <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">{s.l}</p>
                        <p className="text-sm font-black text-white tracking-tight">{s.v}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VitalsTrend;