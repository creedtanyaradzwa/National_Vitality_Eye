import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, HeartIcon, ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';

const PatientVitals = () => {
    const navigate = useNavigate();
    const [vitals, setVitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVital, setSelectedVital] = useState('bloodPressure');

    useEffect(() => { loadVitals(); }, []);

    const loadVitals = async () => {
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patient/vitals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setVitals(Array.isArray(data) ? data : (data.vitals || []));
            } else {
                toast.error(data.error || 'Failed to load vitals');
            }
        } catch (error) {
            console.error('Error loading vitals:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const chartData = [...vitals].reverse().map(v => ({
        date: new Date(v.visitDate).toLocaleDateString(),
        temperature: v.vitalSigns?.temperature,
        heartRate: v.vitalSigns?.heartRate,
        systolicBP: v.vitalSigns?.bloodPressure?.systolic,
        diastolicBP: v.vitalSigns?.bloodPressure?.diastolic,
        weight: v.vitalSigns?.weight,
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-cyber-blue/20 border-t-cyber-blue animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const vitalButtons = [
        { id: 'bloodPressure', label: 'Blood Pressure' },
        { id: 'temperature',   label: 'Temperature' },
        { id: 'heartRate',     label: 'Heart Rate' },
        { id: 'weight',        label: 'Weight' },
    ];

    const lineColor = {
        heartRate:    '#f43f5e',
        temperature:  '#f59e0b',
        weight:       '#00f2ff',
        bloodPressure:'#00f2ff',
    };

    return (
        <div className="py-8">
            {/* Back */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/patient/dashboard')}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Home</span>
                </button>
            </div>

            {/* Header */}
            <div className="bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 mb-8">
                <div className="flex items-center space-x-5">
                    <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-cyber-blue/20 blur-lg" />
                        <div className="relative w-14 h-14 rounded-xl bg-brand-dark-950 border border-cyber-blue/30 flex items-center justify-center">
                            <HeartIcon className="h-7 w-7 text-cyber-blue" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">My Vitals Monitor</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">
                            Tracking <span className="text-cyber-blue font-black">{vitals.length}</span> physiological metrics over time
                        </p>
                    </div>
                </div>
            </div>

            {vitals.length === 0 ? (
                <div className="bg-brand-dark-900/40 border border-dashed border-white/10 rounded-2xl py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-4">
                        <HeartIcon className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">No Vitals Recorded</h3>
                    <p className="text-sm text-gray-500 font-medium">Your vitals data will be visualized here once recorded by your doctor.</p>
                </div>
            ) : (
                <>
                    {/* Snapshot cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Temperature',    value: vitals[0]?.vitalSigns?.temperature ? `${vitals[0].vitalSigns.temperature}°C` : 'N/A',    color: 'text-amber-400',    border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
                            { label: 'Heart Rate',     value: vitals[0]?.vitalSigns?.heartRate ? `${vitals[0].vitalSigns.heartRate} BPM` : 'N/A',       color: 'text-red-400',      border: 'border-red-500/20',   bg: 'bg-red-500/5' },
                            { label: 'Blood Pressure', value: vitals[0]?.vitalSigns?.bloodPressure?.systolic ? `${vitals[0].vitalSigns.bloodPressure.systolic}/${vitals[0].vitalSigns.bloodPressure.diastolic}` : 'N/A', color: 'text-cyber-blue', border: 'border-cyber-blue/20', bg: 'bg-cyber-blue/5' },
                            { label: 'Weight',         value: vitals[0]?.vitalSigns?.weight ? `${vitals[0].vitalSigns.weight} KG` : 'N/A',              color: 'text-cyber-purple', border: 'border-cyber-purple/20', bg: 'bg-cyber-purple/5' },
                        ].map((card, i) => (
                            <div key={i} className={`p-5 rounded-xl border ${card.bg} ${card.border}`}>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{card.label}</p>
                                <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                                <div className="mt-3 flex items-center text-[9px] font-black text-gray-600 uppercase tracking-tight">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    {vitals[0]?.visitDate ? new Date(vitals[0].visitDate).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    <div className="bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 mb-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-1">Vital Signs Trends</h2>
                                <p className="text-xs text-gray-500 font-medium">Select a metric to view your historical data.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {vitalButtons.map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setSelectedVital(btn.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                            selectedVital === btn.id
                                                ? 'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30'
                                                : 'bg-brand-dark-950 text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300'
                                        }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {selectedVital === 'bloodPressure' ? (
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#00f2ff" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', color: '#fff' }} />
                                        <Area type="monotone" dataKey="systolicBP" stroke="#00f2ff" fillOpacity={1} fill="url(#colorSys)" strokeWidth={3} name="Systolic" />
                                        <Area type="monotone" dataKey="diastolicBP" stroke="#a855f7" fillOpacity={0} strokeWidth={3} name="Diastolic" />
                                    </AreaChart>
                                ) : (
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', color: '#fff' }} />
                                        <Line
                                            type="monotone"
                                            dataKey={selectedVital}
                                            stroke={lineColor[selectedVital] || '#00f2ff'}
                                            strokeWidth={3}
                                            dot={{ r: 5, fill: '#0a0a0b', strokeWidth: 2 }}
                                            activeDot={{ r: 7 }}
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Historical table */}
                    <div className="bg-brand-dark-900/60 border border-white/5 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-black text-white uppercase tracking-tighter">Historical Log</h3>
                            <ChartBarIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-brand-dark-950/50">
                                    <tr>
                                        {['Visit Date', 'Temperature', 'Blood Pressure', 'Heart Rate', 'Weight'].map(h => (
                                            <th key={h} className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {vitals.map((v, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-xs font-bold text-gray-300">{new Date(v.visitDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm font-black text-white">{v.vitalSigns?.temperature || '--'}<span className="text-[10px] text-gray-500 ml-1">°C</span></td>
                                            <td className="px-6 py-4 text-sm font-black text-cyber-blue">{v.vitalSigns?.bloodPressure?.systolic ? `${v.vitalSigns.bloodPressure.systolic}/${v.vitalSigns.bloodPressure.diastolic}` : '--'}</td>
                                            <td className="px-6 py-4 text-sm font-black text-red-400">{v.vitalSigns?.heartRate || '--'}<span className="text-[10px] text-gray-500 ml-1">BPM</span></td>
                                            <td className="px-6 py-4 text-sm font-black text-cyber-purple">{v.vitalSigns?.weight || '--'}<span className="text-[10px] text-gray-500 ml-1">KG</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PatientVitals;
