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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-8">
            {/* Navigation */}
            <div className="mb-10">
                <button 
                    onClick={() => navigate('/patient/dashboard')} 
                    className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition" />
                    <span className="text-xs font-bold uppercase tracking-wider">Back to Home</span>
                </button>
            </div>

            {/* Page Title */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mb-10">
                <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <HeartIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">My Vitals Monitor</h1>
                        <p className="text-slate-400 font-medium mt-1">
                            Tracking <span className="text-emerald-400 font-bold">{vitals.length}</span> physiological metrics over time.
                        </p>
                    </div>
                </div>
            </div>

            {vitals.length === 0 ? (
                <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto mb-4">
                        <HeartIcon className="h-8 w-8 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">No Vitals Recorded</h3>
                    <p className="text-sm text-slate-500">Your vitals data will be visualized here once recorded by your doctor.</p>
                </div>
            ) : (
                <>
                    {/* Latest Snapshot Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {[
                            { label: 'Latest Temperature', value: vitals[0]?.vitalSigns?.temperature ? `${vitals[0].vitalSigns.temperature}°C` : 'N/A', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                            { label: 'Latest Heart Rate', value: vitals[0]?.vitalSigns?.heartRate ? `${vitals[0].vitalSigns.heartRate} BPM` : 'N/A', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                            { label: 'Latest Blood Pressure', value: vitals[0]?.vitalSigns?.bloodPressure?.systolic ? `${vitals[0].vitalSigns.bloodPressure.systolic}/${vitals[0].vitalSigns.bloodPressure.diastolic}` : 'N/A', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                            { label: 'Latest Weight', value: vitals[0]?.vitalSigns?.weight ? `${vitals[0].vitalSigns.weight} KG` : 'N/A', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
                        ].map((card, i) => (
                            <div key={i} className={`p-6 rounded-2xl border ${card.bg} ${card.border}`}>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                                <div className="mt-3 flex items-center text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    AS OF {vitals[0]?.visitDate ? new Date(vitals[0].visitDate).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Analysis */}
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mb-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">Vital Signs Trends</h2>
                                <p className="text-xs text-slate-500 font-medium">Select a metric to view your historical data visualization.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'bloodPressure', label: 'Blood Pressure' },
                                    { id: 'temperature', label: 'Temperature' },
                                    { id: 'heartRate', label: 'Heart Rate' },
                                    { id: 'weight', label: 'Weight' }
                                ].map(btn => (
                                    <button 
                                        key={btn.id}
                                        onClick={() => setSelectedVital(btn.id)} 
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                            selectedVital === btn.id 
                                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                                                : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'
                                        }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {selectedVital === 'bloodPressure' ? (
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                        />
                                        <Area type="monotone" dataKey="systolicBP" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSys)" strokeWidth={3} name="Systolic" />
                                        <Area type="monotone" dataKey="diastolicBP" stroke="#0ea5e9" fillOpacity={0} strokeWidth={3} name="Diastolic" />
                                    </AreaChart>
                                ) : (
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                                        <Line 
                                            type="monotone" 
                                            dataKey={selectedVital} 
                                            stroke={selectedVital === 'heartRate' ? '#f43f5e' : selectedVital === 'temperature' ? '#f59e0b' : '#10b981'} 
                                            strokeWidth={4} 
                                            dot={{ r: 6, fill: '#0f172a', strokeWidth: 2 }} 
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Historical Log</h3>
                            <ChartBarIcon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visit Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temperature</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Blood Pressure</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Heart Rate</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weight</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {vitals.map((v, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-300">{new Date(v.visitDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-white">{v.vitalSigns?.temperature || '--'}<span className="text-[10px] text-slate-500 ml-1">°C</span></td>
                                            <td className="px-6 py-4 text-sm font-bold text-blue-400">{v.vitalSigns?.bloodPressure?.systolic ? `${v.vitalSigns.bloodPressure.systolic}/${v.vitalSigns.bloodPressure.diastolic}` : '--'}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-rose-400">{v.vitalSigns?.heartRate || '--'}<span className="text-[10px] text-slate-500 ml-1">BPM</span></td>
                                            <td className="px-6 py-4 text-sm font-bold text-emerald-400">{v.vitalSigns?.weight || '--'}<span className="text-[10px] text-slate-500 ml-1">KG</span></td>
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