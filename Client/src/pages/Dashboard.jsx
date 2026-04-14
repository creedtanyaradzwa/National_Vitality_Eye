import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    DocumentTextIcon, 
    UserIcon, 
    CalendarIcon, 
    ArrowLeftOnRectangleIcon,
    ShieldCheckIcon,
    EyeIcon,
    ClockIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base URL and interceptors
const api = axios.create({
    baseURL: 'http://localhost:5000/api/patient'
});

// Add token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('patientToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('patientToken');
            localStorage.removeItem('patientUser');
            window.location.href = '/patient/login';
            toast.error('Session expired. Please login again.');
        }
        return Promise.reject(error);
    }
);

const PatientDashboard = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [downloading, setDownloading] = useState(false);

    const token = localStorage.getItem('patientToken');

    // Check if user is logged in
    useEffect(() => {
        if (!token) {
            navigate('/patient/login');
        }
    }, [token, navigate]);

    // Load profile and records
    const loadData = useCallback(async () => {
        if (!token) return;
        
        setLoading(true);
        try {
            const [profileRes, recordsRes] = await Promise.all([
                api.get('/profile'),
                api.get('/records')
            ]);
            setProfile(profileRes.data);
            setRecords(recordsRes.data.records || []);
        } catch (error) {
            console.error('Error loading data:', error);
            if (error.response?.status !== 401) {
                toast.error('Failed to load data');
            }
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientUser');
        navigate('/patient/login');
        toast.success('Logged out successfully');
    };

    const handleDownloadPDF = async () => {
        setDownloading(true);
        try {
            const response = await api.get('/records/download/pdf', {
                responseType: 'blob'
            });
            
            // Create blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `medical_report_${profile?.nationalId || 'patient'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download report');
        } finally {
            setDownloading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ShieldCheckIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <nav className="bg-slate-900/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <ShieldCheckIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <span className="text-xl font-bold text-white">Patient Portal</span>
                                <p className="text-xs text-gray-400">Access your medical records securely</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">{profile?.name || 'Patient'}</p>
                                <p className="text-xs text-gray-400">ID: {profile?.nationalId || 'N/A'}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-xl hover:bg-white/10 transition-all duration-300 group"
                                title="Logout"
                            >
                                <ArrowLeftOnRectangleIcon className="h-5 w-5 text-gray-400 group-hover:text-red-400 transition" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Welcome Banner */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                    <UserIcon className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">Welcome back, {profile?.name?.split(' ')[0] || 'Patient'}!</h1>
                                    <p className="text-gray-400 text-sm">Here's a summary of your medical information</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2 text-sm text-gray-400">
                                    <ClockIcon className="h-4 w-4" />
                                    <span>Last updated: {new Date().toLocaleDateString()}</span>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={downloading || records.length === 0}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DocumentArrowDownIcon className="h-5 w-5" />
                                    <span>{downloading ? 'Generating...' : 'Download PDF Report'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Medical Records</p>
                                <p className="text-3xl font-bold text-white">{records.length}</p>
                            </div>
                            <DocumentTextIcon className="h-8 w-8 text-purple-400" />
                        </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Account Status</p>
                                <p className="text-3xl font-bold text-green-400">Active</p>
                            </div>
                            <ShieldCheckIcon className="h-8 w-8 text-blue-400" />
                        </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Data Access</p>
                                <p className="text-3xl font-bold text-white">Read-Only</p>
                            </div>
                            <CalendarIcon className="h-8 w-8 text-emerald-400" />
                        </div>
                    </div>
                </div>

                {/* Medical Records Section */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    <div className="p-5 border-b border-white/10 bg-white/5">
                        <div>
                            <h2 className="text-xl font-bold text-white">Your Medical Records</h2>
                            <p className="text-gray-400 text-sm mt-1">Click on any record to view full details</p>
                        </div>
                    </div>

                    {records.length === 0 ? (
                        <div className="p-12 text-center">
                            <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-400">No medical records found</p>
                            <p className="text-sm text-gray-500 mt-1">When you visit a doctor, your records will appear here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {records.map((record) => (
                                <div 
                                    key={record._id} 
                                    className="p-5 hover:bg-white/5 transition-all duration-300 cursor-pointer group"
                                    onClick={() => setSelectedRecord(record)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="font-semibold text-white group-hover:text-purple-400 transition">
                                                    {record.disease || record.primaryDiagnosis?.name || 'Medical Visit'}
                                                </h3>
                                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-white/10 text-gray-300">
                                                    {record.visitType || 'Outpatient'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400">{record.hospital || 'Unknown Hospital'}</p>
                                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                                <span>📅 {formatDate(record.visitDate)}</span>
                                                {record.doctorName && <span>👨‍⚕️ Dr. {record.doctorName}</span>}
                                            </div>
                                        </div>
                                        <button className="p-2 rounded-lg text-gray-400 group-hover:text-purple-400 group-hover:bg-purple-500/20 transition-all duration-300">
                                            <EyeIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Security Notice */}
                <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start space-x-3">
                        <ShieldCheckIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-yellow-400 text-sm">Security Notice</h4>
                            <p className="text-xs text-gray-400 mt-1">
                                This is a read-only view of your medical records. If you notice any errors, please contact your healthcare provider.
                                All access to your data is logged and monitored for security purposes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Record Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-slate-900/95 p-5 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Medical Record Details</h2>
                                <button 
                                    onClick={() => setSelectedRecord(null)} 
                                    className="w-8 h-8 rounded-lg bg-white/10 text-gray-400 hover:text-white hover:bg-white/20 transition-all duration-300"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="p-5 space-y-4">
                                {/* Visit Information */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Visit Date</p>
                                        <p className="text-white font-medium">{formatDate(selectedRecord.visitDate)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Visit Type</p>
                                        <p className="text-white font-medium">{selectedRecord.visitType || 'Outpatient'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Hospital</p>
                                        <p className="text-white font-medium">{selectedRecord.hospital || 'Not recorded'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Doctor</p>
                                        <p className="text-white font-medium">Dr. {selectedRecord.doctorName || 'Not recorded'}</p>
                                    </div>
                                </div>

                                {/* Diagnosis */}
                                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-xs text-purple-400">Diagnosis</p>
                                    <p className="text-white font-medium mt-1">{selectedRecord.primaryDiagnosis?.name || selectedRecord.diagnosis || 'Not recorded'}</p>
                                    {selectedRecord.disease && (
                                        <p className="text-sm text-gray-400 mt-1">Category: {selectedRecord.disease}</p>
                                    )}
                                </div>

                                {/* Secondary Diagnoses */}
                                {selectedRecord.secondaryDiagnoses?.length > 0 && (
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Secondary Diagnoses</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedRecord.secondaryDiagnoses.map((d, i) => (
                                                <span key={i} className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs">
                                                    {d.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Symptoms */}
                                {selectedRecord.symptoms?.length > 0 && (
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Symptoms</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedRecord.symptoms.map((symptom, i) => (
                                                <span key={i} className="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-xs">
                                                    {symptom}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Medications */}
                                {selectedRecord.prescribedMedications?.length > 0 && (
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Prescribed Medications</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedRecord.prescribedMedications.map((med, i) => (
                                                <span key={i} className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs">
                                                    {med}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Vital Signs */}
                                {selectedRecord.vitalSigns && Object.values(selectedRecord.vitalSigns).some(v => v) && (
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Vital Signs</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                                            {selectedRecord.vitalSigns.temperature && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Temperature</p>
                                                    <p className="text-white font-medium">{selectedRecord.vitalSigns.temperature}°C</p>
                                                </div>
                                            )}
                                            {selectedRecord.vitalSigns.bloodPressure?.systolic && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Blood Pressure</p>
                                                    <p className="text-white font-medium">{selectedRecord.vitalSigns.bloodPressure.systolic}/{selectedRecord.vitalSigns.bloodPressure.diastolic}</p>
                                                </div>
                                            )}
                                            {selectedRecord.vitalSigns.heartRate && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Heart Rate</p>
                                                    <p className="text-white font-medium">{selectedRecord.vitalSigns.heartRate} bpm</p>
                                                </div>
                                            )}
                                            {selectedRecord.vitalSigns.weight && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Weight</p>
                                                    <p className="text-white font-medium">{selectedRecord.vitalSigns.weight} kg</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Treatment Plan */}
                                {selectedRecord.treatmentPlan?.plan && (
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-xs text-gray-500">Treatment Plan</p>
                                        <p className="text-gray-300 text-sm mt-1">{selectedRecord.treatmentPlan.plan}</p>
                                        {selectedRecord.treatmentPlan.lifestyleAdvice?.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-500">Lifestyle Advice</p>
                                                <ul className="list-disc list-inside text-sm text-gray-400 mt-1">
                                                    {selectedRecord.treatmentPlan.lifestyleAdvice.map((advice, i) => (
                                                        <li key={i}>{advice}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Discharge Instructions */}
                                {selectedRecord.dischargeInstructions && (
                                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <p className="text-xs text-blue-400">Discharge Instructions</p>
                                        <p className="text-blue-300 text-sm mt-1">{selectedRecord.dischargeInstructions}</p>
                                    </div>
                                )}

                                {/* Clinical Notes */}
                                {selectedRecord.notes && (
                                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                        <p className="text-xs text-yellow-400">Clinical Notes</p>
                                        <p className="text-yellow-300 text-sm mt-1">{selectedRecord.notes}</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="sticky bottom-0 bg-slate-900/95 p-5 border-t border-white/10">
                                <button 
                                    onClick={() => setSelectedRecord(null)} 
                                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all duration-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;