import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area, ReferenceLine
} from 'recharts';
import { getRecordProgress } from '../../services/api';
import { 
    SparklesIcon,
    HeartIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

const RecordProgressChart = ({ recordId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMetrics, setSelectedMetrics] = useState(['hr', 'temp']);

    useEffect(() => {
        const loadProgress = async () => {
            try {
                const res = await getRecordProgress(recordId);
                setData(res.data);
            } catch (err) {
                console.error('Failed to load record progress:', err);
                setError('Failed to load progress data');
            } finally {
                setLoading(false);
            }
        };
        loadProgress();
    }, [recordId]);

    if (loading) return (
        <div className="h-64 rounded-2xl bg-white/5 animate-pulse flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">AI Clinical Intelligence Analysis...</p>
        </div>
    );

    if (error || !data || !data.history || data.history.length === 0) return (
        <div className="p-12 text-center rounded-2xl bg-white/5 border border-dashed border-white/10">
            <InformationCircleIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Baseline Period</p>
            <p className="text-[10px] text-gray-600 mt-2 max-w-xs mx-auto">
                Frequent vitals monitoring not yet established for this record. 
                Log at least two observations to trigger predictive trend analysis.
            </p>
        </div>
    );

    const { analysis, history } = data;

    const chartData = history.map(h => ({
        time: new Date(h.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: h.temperature,
        hr: h.heartRate,
        o2: h.oxygenSaturation,
        rr: h.respiratoryRate,
        intake: h.fluidIntake || 0,
        output: h.fluidOutput || 0,
        systolic: h.bloodPressure?.systolic,
        diastolic: h.bloodPressure?.diastolic,
        state: h.clinicalState,
        fullDate: new Date(h.recordedAt).toLocaleString()
    }));

    const metrics = [
        { id: 'temp', label: 'Temperature', color: '#f59e0b', unit: '°C' },
        { id: 'hr', label: 'Heart Rate', color: '#ef4444', unit: 'bpm' },
        { id: 'o2', label: 'SpO2', color: '#22d3ee', unit: '%' },
        { id: 'rr', label: 'Resp Rate', color: '#10b981', unit: '/min' },
        { id: 'intake', label: 'Fluid Intake', color: '#3b82f6', unit: 'ml' },
        { id: 'output', label: 'Fluid Output', color: '#a855f7', unit: 'ml' }
    ];

    const toggleMetric = (id) => {
        if (selectedMetrics.includes(id)) {
            if (selectedMetrics.length > 1) setSelectedMetrics(selectedMetrics.filter(m => m !== id));
        } else {
            setSelectedMetrics([...selectedMetrics, id]);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'CRITICAL': return 'text-red-500 border-red-500/30 bg-red-500/5';
            case 'DETERIORATING': return 'text-orange-500 border-orange-500/30 bg-orange-500/5';
            case 'RECOVERING': return 'text-green-500 border-green-500/30 bg-green-500/5';
            case 'UNSTABLE': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5';
            default: return 'text-cyan-500 border-cyan-500/30 bg-cyan-500/5';
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-slate-900/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">{dataPoint.fullDate}</p>
                    <div className="space-y-1.5 mb-3">
                        {payload.map((p, i) => (
                            <div key={i} className="flex justify-between items-center space-x-8">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{p.name}</span>
                                <span className="text-sm font-mono font-bold" style={{ color: p.color }}>
                                    {p.value}{metrics.find(m => m.id === p.dataKey)?.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                    {dataPoint.state && (
                        <div className="pt-2 border-t border-white/5">
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></span>
                                Clinical State: {dataPoint.state}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* AI Insight Module */}
            <div className={`p-5 rounded-2xl border ${getStatusColor(analysis.status)} relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <SparklesIcon className="h-16 w-16" />
                </div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">AI Trend Correlation</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest">
                            {analysis.status}
                        </div>
                    </div>
                    <p className="text-lg font-bold leading-tight text-white mb-2">
                        {analysis.message}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {analysis.indicators.map((ind, i) => (
                            <div key={i} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center space-x-2">
                                <span className="text-[8px] font-black text-gray-500 uppercase">{ind.factor}:</span>
                                <span className={`text-[8px] font-black uppercase ${
                                    ind.severity === 'CRITICAL' ? 'text-red-400' :
                                    ind.severity === 'HIGH' ? 'text-orange-400' :
                                    'text-blue-400'
                                }`}>{ind.trend}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metric Selector Bar */}
            <div className="flex flex-wrap gap-2">
                {metrics.map(m => (
                    <button
                        key={m.id}
                        onClick={() => toggleMetric(m.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            selectedMetrics.includes(m.id)
                            ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-white/5'
                            : 'bg-transparent border-white/5 text-gray-600 hover:border-white/10'
                        }`}
                        style={{ borderLeftColor: selectedMetrics.includes(m.id) ? m.color : undefined, borderLeftWidth: selectedMetrics.includes(m.id) ? '4px' : '1px' }}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Main Visualizer */}
            <div className="rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                stroke="#475569" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                padding={{ left: 10, right: 10 }}
                            />
                            <YAxis 
                                stroke="#475569" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                                content={({ payload }) => (
                                    <div className="flex justify-center gap-6 mt-6">
                                        {payload.map((entry, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            />
                            
                            {/* Annotations for state changes */}
                            {chartData.map((d, i) => (
                                d.state && d.state !== 'Stable' ? (
                                    <ReferenceLine 
                                        key={i} 
                                        x={d.time} 
                                        stroke="#8b5cf6" 
                                        strokeDasharray="3 3" 
                                        strokeOpacity={0.3}
                                    />
                                ) : null
                            ))}

                            {selectedMetrics.map(mId => {
                                const m = metrics.find(metric => metric.id === mId);
                                return (
                                    <Line
                                        key={mId}
                                        type="monotone"
                                        dataKey={mId}
                                        name={m.label}
                                        stroke={m.color}
                                        strokeWidth={4}
                                        dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Fluid Balance & Metabolism Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-cyan-500/5 border border-cyan-500/10 p-4 text-center">
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">Total Fluid Intake</p>
                    <p className="text-2xl font-black text-white">{data.totalIntake || chartData.reduce((s,c) => s+c.intake, 0)}ml</p>
                </div>
                <div className="rounded-2xl bg-purple-500/5 border border-purple-500/10 p-4 text-center">
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Total Fluid Output</p>
                    <p className="text-2xl font-black text-white">{data.totalOutput || chartData.reduce((s,c) => s+c.output, 0)}ml</p>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${
                    (data.netBalance || 0) < -1000 ? 'bg-red-500/5 border-red-500/20' : 
                    (data.netBalance || 0) > 2000 ? 'bg-orange-500/5 border-orange-500/20' : 
                    'bg-green-500/5 border-green-500/10'
                }`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                        (data.netBalance || 0) < -1000 ? 'text-red-500' : 'text-green-500'
                    }`}>Net Fluid Balance</p>
                    <p className="text-2xl font-black text-white">{data.netBalance || (chartData.reduce((s,c) => s+c.intake, 0) - chartData.reduce((s,c) => s+c.output, 0))}ml</p>
                </div>
            </div>
        </div>
    );
};

export default RecordProgressChart;
