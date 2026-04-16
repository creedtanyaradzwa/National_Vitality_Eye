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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <button onClick={() => navigate('/patient/dashboard')} className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-white">
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Back to Dashboard</span>
                </button>

                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                        <div className="flex items-center space-x-3">
                            <HeartIcon className="h-8 w-8 text-white" />
                            <h1 className="text-2xl font-bold text-white">My Vital Signs</h1>
                        </div>
                        <p className="text-gray-400 mt-2">{vitals.length} vital sign records found</p>
                    </div>
                </div>

                {vitals.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl">
                        <HeartIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400">No vital signs recorded yet</p>
                        <p className="text-sm text-gray-500 mt-1">Vital signs will appear here after your medical visits</p>
                    </div>
                ) : (
                    <>
                        {/* Latest Vitals Cards - Most recent first */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-400">Latest Temperature</p>
                                <p className="text-2xl font-bold text-white">{vitals[0]?.vitalSigns?.temperature || '-'}°C</p>
                                <p className="text-xs text-gray-500 mt-1">{vitals[0]?.visitDate ? new Date(vitals[0].visitDate).toLocaleDateString() : ''}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-400">Latest Heart Rate</p>
                                <p className="text-2xl font-bold text-white">{vitals[0]?.vitalSigns?.heartRate || '-'} bpm</p>
                                <p className="text-xs text-gray-500 mt-1">{vitals[0]?.visitDate ? new Date(vitals[0].visitDate).toLocaleDateString() : ''}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-400">Latest BP</p>
                                <p className="text-2xl font-bold text-white">{vitals[0]?.vitalSigns?.bloodPressure?.systolic || '-'}/{vitals[0]?.vitalSigns?.bloodPressure?.diastolic || '-'}</p>
                                <p className="text-xs text-gray-500 mt-1">{vitals[0]?.visitDate ? new Date(vitals[0].visitDate).toLocaleDateString() : ''}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-400">Latest Weight</p>
                                <p className="text-2xl font-bold text-white">{vitals[0]?.vitalSigns?.weight || '-'} kg</p>
                                <p className="text-xs text-gray-500 mt-1">{vitals[0]?.visitDate ? new Date(vitals[0].visitDate).toLocaleDateString() : ''}</p>
                            </div>
                        </div>

                        {/* Chart Selector */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            <button onClick={() => setSelectedVital('bloodPressure')} className={`px-4 py-2 rounded-lg text-sm ${selectedVital === 'bloodPressure' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}>Blood Pressure</button>
                            <button onClick={() => setSelectedVital('temperature')} className={`px-4 py-2 rounded-lg text-sm ${selectedVital === 'temperature' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}>Temperature</button>
                            <button onClick={() => setSelectedVital('heartRate')} className={`px-4 py-2 rounded-lg text-sm ${selectedVital === 'heartRate' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}>Heart Rate</button>
                            <button onClick={() => setSelectedVital('weight')} className={`px-4 py-2 rounded-lg text-sm ${selectedVital === 'weight' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}>Weight</button>
                        </div>

                        {/* Chart - Oldest to newest (left to right) */}
                        <div className="bg-white/5 rounded-xl p-4 h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                {selectedVital === 'bloodPressure' ? (
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                        <YAxis stroke="rgba(255,255,255,0.3)" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                        <Line type="monotone" dataKey="systolicBP" stroke="#f59e0b" name="Systolic BP" />
                                        <Line type="monotone" dataKey="diastolicBP" stroke="#ec4899" name="Diastolic BP" />
                                    </LineChart>
                                ) : selectedVital === 'temperature' ? (
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                        <YAxis stroke="rgba(255,255,255,0.3)" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                        <Line type="monotone" dataKey="temperature" stroke="#f59e0b" name="Temperature (°C)" />
                                    </LineChart>
                                ) : selectedVital === 'heartRate' ? (
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                        <YAxis stroke="rgba(255,255,255,0.3)" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                        <Line type="monotone" dataKey="heartRate" stroke="#ef4444" name="Heart Rate (bpm)" />
                                    </LineChart>
                                ) : (
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                                        <YAxis stroke="rgba(255,255,255,0.3)" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                        <Line type="monotone" dataKey="weight" stroke="#8b5cf6" name="Weight (kg)" />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>

                        {/* Data Table - Newest to oldest (latest first) */}
                        <div className="bg-white/5 rounded-xl overflow-hidden mt-6">
                            <div className="p-4 border-b border-white/10">
                                <h3 className="font-semibold text-white">Vitals History (Latest First)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs text-gray-400">Date</th>
                                            <th className="px-4 py-3 text-left text-xs text-gray-400">Temp</th>
                                            <th className="px-4 py-3 text-left text-xs text-gray-400">BP</th>
                                            <th className="px-4 py-3 text-left text-xs text-gray-400">HR</th>
                                            <th className="px-4 py-3 text-left text-xs text-gray-400">Weight</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.map((v, i) => (
                                            <tr key={i} className="border-t border-white/10">
                                                <td className="px-4 py-2 text-sm text-white">{v.date}</td>
                                                <td className="px-4 py-2 text-sm text-white">{v.temperature || '-'}°C</td>
                                                <td className="px-4 py-2 text-sm text-white">{v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : '-'}</td>
                                                <td className="px-4 py-2 text-sm text-white">{v.heartRate || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-white">{v.weight || '-'} kg</td>
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