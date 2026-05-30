import React, { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    ReferenceLine,
    BarChart,
    Bar,
    ComposedChart,
    Legend
} from 'recharts';

const ClinicalProgression = ({ observations }) => {
    const [viewMode, setViewMode] = useState('full'); // 'full' or '24h'

    if (!observations || observations.length < 2) {
        return (
            <div className="p-12 rounded-3xl bg-brand-dark-950 border border-white/5 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-dark-900 border border-white/5 flex items-center justify-center mb-4">
                    <ChartBarIcon className="h-6 w-6 text-gray-700" />
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Insufficient data points for trend analysis</p>
                <p className="text-[10px] text-gray-700 mt-2 uppercase">Record at least 2 observations to generate progression charts</p>
            </div>
        );
    }

    // Filter data if in 24h mode
    const filteredObservations = viewMode === '24h' 
        ? observations.filter(obs => {
            const obsDate = new Date(obs.timestamp);
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return obsDate >= twentyFourHoursAgo;
          })
        : observations;

    const data = filteredObservations.map(obs => ({
        time: new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullTime: new Date(obs.timestamp).toLocaleString(),
        temp: obs.vitalSigns?.temperature,
        hr: obs.vitalSigns?.heartRate,
        spo2: obs.vitalSigns?.oxygenSaturation,
        intake: obs.fluidBalance?.intake || 0,
        output: obs.fluidBalance?.output || 0,
        status: obs.status
    })).sort((a, b) => new Date(a.fullTime) - new Date(b.fullTime));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-brand-dark-900 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                    <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase">{payload[0].payload.fullTime}</p>
                    {payload.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: entry.color }}>
                                {entry.name}:
                            </span>
                            <span className="text-xs font-mono text-white">
                                {entry.value}{
                                    entry.name === 'temp' ? '°C' : 
                                    entry.name === 'spo2' ? '%' : 
                                    entry.name === 'intake' || entry.name === 'output' ? 'ml' : ' bpm'
                                }
                            </span>
                        </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-white/5">
                        <p className="text-[9px] font-bold text-cyber-blue uppercase tracking-widest">
                            Status: {payload[0].payload.status}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center px-4">
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setViewMode('full')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'full' ? 'bg-cyber-blue text-brand-dark-950' : 'bg-brand-dark-900 text-gray-500 border border-white/5'}`}
                    >
                        Full Course
                    </button>
                    <button 
                        onClick={() => setViewMode('24h')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === '24h' ? 'bg-cyber-blue text-brand-dark-950 shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'bg-brand-dark-900 text-gray-500 border border-white/5'}`}
                    >
                        Last 24h Focus
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-gray-600 uppercase">Live Telemetry Active</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Thermal Stability Trend */}
                <div className="p-6 rounded-3xl bg-brand-dark-950 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FireIcon className="h-12 w-12 text-red-500" />
                    </div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-3 animate-pulse" />
                        Thermal Stability Trend
                    </h4>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis domain={[35, 42]} stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="temp" 
                                    name="temp"
                                    stroke="#ef4444" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorTemp)" 
                                    animationDuration={1500}
                                />
                                <ReferenceLine y={37.5} stroke="#ffffff10" strokeDasharray="3 3" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fluid-Response Overlay Chart (Gap: Passive Charting Fix) */}
                <div className="p-6 rounded-3xl bg-brand-dark-950 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BeakerIcon className="h-12 w-12 text-cyber-blue" />
                    </div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue mr-3 animate-pulse" />
                        Fluid-Response Dynamic (HR vs Intake)
                    </h4>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="hr" orientation="left" stroke="#00f2ff" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="fluid" orientation="right" stroke="#8b5cf6" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar 
                                    yAxisId="fluid"
                                    dataKey="intake" 
                                    name="intake"
                                    fill="#8b5cf630" 
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                                <Line 
                                    yAxisId="hr"
                                    type="monotone" 
                                    dataKey="hr" 
                                    name="hr"
                                    stroke="#00f2ff" 
                                    strokeWidth={3}
                                    dot={{ fill: '#00f2ff', r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex justify-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-cyber-blue" />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Heart Rate (bpm)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-cyber-purple/50" />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Fluid Intake (ml)</span>
                        </div>
                    </div>
                </div>

                {/* Respiratory Progression */}
                <div className="p-6 rounded-3xl bg-brand-dark-950 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ClockIcon className="h-12 w-12 text-cyan-400" />
                    </div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-3 animate-pulse" />
                        Respiratory & Saturation Progression
                    </h4>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis domain={[80, 100]} stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line 
                                    type="monotone" 
                                    dataKey="spo2" 
                                    name="spo2"
                                    stroke="#22d3ee" 
                                    strokeWidth={3}
                                    dot={{ fill: '#22d3ee', r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                                <ReferenceLine y={94} stroke="#ef444440" strokeDasharray="3 3" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fluid Balance Overview */}
                <div className="p-6 rounded-3xl bg-brand-dark-950 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CommandLineIcon className="h-12 w-12 text-gray-500" />
                    </div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-3 animate-pulse" />
                        Net Fluid Balance (I/O)
                    </h4>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="intake" name="intake" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="output" name="output" fill="#64748b" radius={[4, 4, 0, 0]} />
                                <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', marginTop: '20px' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Import necessary icons
import { ChartBarIcon, FireIcon, HeartIcon, BeakerIcon, ClockIcon, CommandLineIcon } from '@heroicons/react/24/outline';

export default ClinicalProgression;

