import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, HeartIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const PatientVitals = () => {
    const navigate = useNavigate();
    const [vitals, setVitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVital, setSelectedVital] = useState('bloodPressure');

    useEffect(() => {
        loadVitals();
    }, []);

    const loadVitals = async () => {
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) {
                navigate('/patient/login');
                return;
            }
            
            const response = await fetch('http://localhost:5000/api/patient/vitals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                if (Array.isArray(data)) {
                    setVitals(data);
                } else if (data.vitals && Array.isArray(data.vitals)) {
                    setVitals(data.vitals);
                } else {
                    setVitals([]);
                }
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

    // For chart: oldest to newest (left to right)
    const chartData = [...vitals].reverse().map(v => ({
        date: new Date(v.visitDate).toLocaleDateString(),
        temperature: v.vitalSigns?.temperature,
        heartRate: v.vitalSigns?.heartRate,
        systolicBP: v.vitalSigns?.bloodPressure?.systolic,
        diastolicBP: v.vitalSigns?.bloodPressure?.diastolic,
        weight: v.vitalSigns?.weight
    }));

    // For table: newest to oldest (latest first)
    const tableData = vitals.map(v => ({
        date: new Date(v.visitDate).toLocaleDateString(),
        temperature: v.vitalSigns?.temperature,
        heartRate: v.vitalSigns?.heartRate,
        systolicBP: v.vitalSigns?.bloodPressure?.systolic,
        diastolicBP: v.vitalSigns?.bloodPressure?.diastolic,
        weight: v.vitalSigns?.weight
    }));

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark-950 text-gray-200">
            {/* Futuristic Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/patient/dashboard')} 
                    className="mb-8 flex items-center space-x-3 text-gray-500 hover:text-white group transition-all duration-300"
                >
                    <div className="p-2 rounded-xl bg-brand-dark-900 border border-white/5 group-hover:border-cyber-purple/30 transition-all">
                        <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Return to Core</span>
                </button>

                {/* Header */}
                <div className="glass-card-modern p-8 mb-10 border border-white/5">
                    <div className="flex items-center space-x-6">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-2xl bg-cyber-blue/20 blur-xl animate-pulse" />
                            <div className="relative w-16 h-16 rounded-2xl bg-brand-dark-900 border border-cyber-blue/30 flex items-center justify-center shadow-2xl">
                                <HeartIcon className="h-8 w-8 text-cyber-blue" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Vitals Monitor</h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                                <span className="text-cyber-blue">{vitals.length}</span> Physiological Data Streams Active
                            </p>
                        </div>
                    </div>
                </div>

                {vitals.length === 0 ? (
                    <div className="glass-card-modern py-20 text-center border border-white/5">
                        <div className="w-20 h-20 rounded-3xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <HeartIcon className="h-10 w-10 text-gray-700" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">No Biometric Feed</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Awaiting initial physiological assessment logs.</p>
                    </div>
                ) : (
                    <>
                        {/* Latest Vitals Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {[
                                { label: 'Temperature', value: `${vitals[0]?.vitalSigns?.temperature || '-'}°C`, color: 'text-orange-400', border: 'border-orange-500/20' },
                                { label: 'Heart Rate', value: `${vitals[0]?.vitalSigns?.heartRate || '-'} BPM`, color: 'text-red-400', border: 'border-red-500/20' },
                                { label: 'Blood Pressure', value: vitals[0]?.vitalSigns?.bloodPressure?.systolic ? `${vitals[0].vitalSigns.bloodPressure.systolic}/${vitals[0].vitalSigns.bloodPressure.diastolic}` : '-', color: 'text-cyber-purple', border: 'border-cyber-purple/20' },
                                { label: 'Body Weight', value: `${vitals[0]?.vitalSigns?.weight || '-'} KG`, color: 'text-cyber-blue', border: 'border-cyber-blue/20' }
                            ].map((card, i) => (
                                <div key={i} className={`stat-card border ${card.border}`}>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{card.label}</p>
                                    <p className={`text-3xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
                                    <p className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.2em] mt-3">
                                        FEED: {vitals[0]?.visitDate ? new Date(vitals[0].visitDate).toLocaleDateString().toUpperCase() : ''}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Analysis Section */}
                        <div className="glass-card-modern p-8 border border-white/5 mb-10">
                            {/* Chart Selector */}
                            <div className="flex flex-wrap gap-3 mb-10">
                                {[
                                    { id: 'bloodPressure', label: 'Biometric Pressure' },
                                    { id: 'temperature', label: 'Thermal Profile' },
                                    { id: 'heartRate', label: 'Cardiac Rhythm' },
                                    { id: 'weight', label: 'Mass Matrix' }
                                ].map(btn => (
                                    <button 
                                        key={btn.id}
                                        onClick={() => setSelectedVital(btn.id)} 
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                                            selectedVital === btn.id 
                                                ? 'bg-brand-dark-800 text-cyber-blue border-cyber-blue/30 shadow-[0_0_20px_rgba(0,242,255,0.1)]' 
                                                : 'bg-brand-dark-950 text-gray-600 border-white/5 hover:text-gray-400'
                                        }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            {/* Chart */}
                            <div className="h-[400px] w-full bg-brand-dark-950/50 rounded-2xl p-6 border border-white/5">
                                <ResponsiveContainer width="100%" height="100%">
                                    {selectedVital === 'bloodPressure' ? (
                                        <LineChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#bc13fe" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#bc13fe" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                                                itemStyle={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                            />
                                            <Line type="monotone" dataKey="systolicBP" stroke="#bc13fe" strokeWidth={3} dot={{ r: 4, fill: '#0a0a0b', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} name="SYSTOLIC" />
                                            <Line type="monotone" dataKey="diastolicBP" stroke="#00f2ff" strokeWidth={3} dot={{ r: 4, fill: '#0a0a0b', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} name="DIASTOLIC" />
                                        </LineChart>
                                    ) : selectedVital === 'temperature' ? (
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                            <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#0a0a0b', strokeWidth: 2 }} name="TEMP_CELSIUS" />
                                        </LineChart>
                                    ) : selectedVital === 'heartRate' ? (
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                            <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#0a0a0b', strokeWidth: 2 }} name="HEART_RATE_BPM" />
                                        </LineChart>
                                    ) : (
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                            <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#0a0a0b', strokeWidth: 2 }} name="MASS_KG" />
                                        </LineChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Historical Log */}
                        <div className="glass-card-modern border border-white/5 overflow-hidden">
                            <div className="p-6 border-b border-white/5 bg-brand-dark-900/50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Biometric Log History</h3>
                                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest italic">Encrypted Sequential Stream</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-brand-dark-950">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Timestamp</th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Thermal</th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Pressure</th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Cardiac</th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Mass</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {tableData.map((v, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v.date.toUpperCase()}</td>
                                                <td className="px-6 py-4 text-xs font-black text-white italic">{v.temperature || '--'}<span className="text-[9px] text-gray-600 ml-0.5">°C</span></td>
                                                <td className="px-6 py-4 text-xs font-black text-cyber-purple italic">{v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : '--'}</td>
                                                <td className="px-6 py-4 text-xs font-black text-red-400 italic">{v.heartRate || '--'}<span className="text-[9px] text-gray-600 ml-0.5">BPM</span></td>
                                                <td className="px-6 py-4 text-xs font-black text-cyber-blue italic">{v.weight || '--'}<span className="text-[9px] text-gray-600 ml-0.5">KG</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PatientVitals;