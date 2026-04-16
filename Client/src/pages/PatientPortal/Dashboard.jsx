import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    UserIcon, 
    DocumentTextIcon, 
    HeartIcon, 
    ArrowRightIcon, 
    CalendarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PatientDashboard = () => {
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [recentRecords, setRecentRecords] = useState([]);
    const [stats, setStats] = useState({ totalRecords: 0, lastVisitDate: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const patientData = localStorage.getItem('patient');
        if (patientData) {
            try {
                setPatient(JSON.parse(patientData));
            } catch (e) {
                console.error('Error parsing patient data:', e);
            }
        }
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const token = localStorage.getItem('patientToken');
            
            if (!token) {
                console.log('No token found, redirecting to login');
                navigate('/patient/login');
                return;
            }
            
            // Load profile stats
            try {
                const profileRes = await fetch('http://localhost:5000/api/patient/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    if (profileData.stats) {
                        setStats(profileData.stats);
                    }
                }
            } catch (err) {
                console.error('Error loading profile:', err);
            }
            
            // Load recent records
            try {
                const recordsRes = await fetch('http://localhost:5000/api/patient/records', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const recordsData = await recordsRes.json();
                if (recordsRes.ok && Array.isArray(recordsData)) {
                    setRecentRecords(recordsData.slice(0, 3));
                    // Also update total records count if stats didn't have it
                    if (!stats.totalRecords && recordsData.length) {
                        setStats(prev => ({ ...prev, totalRecords: recordsData.length }));
                    }
                } else if (recordsRes.ok && recordsData.records) {
                    // Handle case where response has records property
                    const records = Array.isArray(recordsData.records) ? recordsData.records : [];
                    setRecentRecords(records.slice(0, 3));
                }
            } catch (err) {
                console.error('Error loading records:', err);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patient');
        navigate('/patient/login');
    };

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
                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Patient Portal</h1>
                                <p className="text-gray-400">Welcome back, {patient?.firstName || 'Patient'} {patient?.lastName || ''}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Records</p>
                                <p className="text-3xl font-bold text-white">{stats.totalRecords || recentRecords.length || 0}</p>
                            </div>
                            <DocumentTextIcon className="h-10 w-10 text-purple-400" />
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Last Visit</p>
                                <p className="text-lg font-bold text-white">
                                    {stats.lastVisitDate ? new Date(stats.lastVisitDate).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                            <CalendarIcon className="h-10 w-10 text-purple-400" />
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Profile Status</p>
                                <p className="text-lg font-bold text-white">Active</p>
                            </div>
                            <UserIcon className="h-10 w-10 text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Medical Records Card */}
                    <div 
                        className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/30 transition cursor-pointer group"
                        onClick={() => navigate('/patient/records')}
                    >
                        <DocumentTextIcon className="h-12 w-12 text-purple-400 mb-4 group-hover:scale-110 transition" />
                        <h3 className="text-xl font-semibold text-white mb-2">Medical Records</h3>
                        <p className="text-gray-400">View your complete medical history including diagnoses, lab results, and imaging</p>
                        <ArrowRightIcon className="h-5 w-5 text-purple-400 mt-4 group-hover:translate-x-1 transition" />
                    </div>
                    
                    {/* Vital Signs Card */}
                    <div 
                        className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/30 transition cursor-pointer group"
                        onClick={() => navigate('/patient/vitals')}
                    >
                        <HeartIcon className="h-12 w-12 text-purple-400 mb-4 group-hover:scale-110 transition" />
                        <h3 className="text-xl font-semibold text-white mb-2">Vital Signs</h3>
                        <p className="text-gray-400">Track your health metrics over time with interactive charts</p>
                        <ArrowRightIcon className="h-5 w-5 text-purple-400 mt-4 group-hover:translate-x-1 transition" />
                    </div>
                </div>

                {/* Recent Records Section */}
                {recentRecords.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Recent Medical Records</h2>
                        <div className="space-y-3">
                            {recentRecords.map((record, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                                    onClick={() => navigate('/patient/records')}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white">{record.disease || record.primaryDiagnosis?.name || 'Medical Visit'}</p>
                                            <p className="text-sm text-gray-400">{record.visitDate ? new Date(record.visitDate).toLocaleDateString() : 'Date N/A'}</p>
                                            <p className="text-xs text-gray-500">{record.hospital || 'Hospital N/A'}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                            record.disposition === 'Discharged' ? 'bg-green-500/20 text-green-400' : 
                                            record.disposition === 'Admitted' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                            {record.disposition || 'Completed'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDashboard;