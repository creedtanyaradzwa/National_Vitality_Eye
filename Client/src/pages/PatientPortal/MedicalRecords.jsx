import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeftIcon, 
    DocumentTextIcon, 
    BeakerIcon, 
    CameraIcon,
    CalendarIcon,
    BuildingOfficeIcon,
    UserIcon,
    HeartIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentListIcon,
    SparklesIcon,
    ChartBarIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PatientMedicalRecords = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRecord, setExpandedRecord] = useState(null);

    useEffect(() => {
        loadRecords();
    }, []);

    const loadRecords = async () => {
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) {
                navigate('/patient/login');
                return;
            }
            
            const response = await fetch('http://localhost:5000/api/patient/records', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                if (Array.isArray(data)) {
                    setRecords(data);
                } else if (data.records && Array.isArray(data.records)) {
                    setRecords(data.records);
                } else {
                    setRecords([]);
                }
            } else {
                toast.error(data.error || 'Failed to load records');
            }
        } catch (error) {
            console.error('Error loading records:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getVisitTypeBadge = (type) => {
        const colors = {
            Emergency: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            Outpatient: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            Inpatient: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'Follow-up': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
            Consultation: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
        return colors[type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    };

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
            {/* Navigation Header */}
            <div className="mb-10 flex items-center justify-between">
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
                        <DocumentTextIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">My Visit History</h1>
                        <p className="text-slate-400 font-medium mt-1">
                            You have <span className="text-emerald-400 font-bold">{records.length}</span> documented medical visits.
                        </p>
                    </div>
                </div>
            </div>

            {/* Records List */}
            {records.length === 0 ? (
                <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto mb-4">
                        <DocumentTextIcon className="h-8 w-8 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">No Records Found</h3>
                    <p className="text-sm text-slate-500">Your medical history will appear here once your provider adds a visit.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {records.map((record, idx) => {
                        const isExpanded = expandedRecord === record._id;
                        
                        return (
                            <div key={record._id || idx} className={`bg-slate-900/40 border transition-all duration-300 rounded-3xl overflow-hidden ${isExpanded ? 'border-emerald-500/30' : 'border-white/5'}`}>
                                {/* List Item Header */}
                                <div 
                                    className="p-6 cursor-pointer group hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedRecord(isExpanded ? null : record._id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-xs font-bold text-slate-500">
                                                #{records.length - idx}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-3 mb-1.5 flex-wrap gap-2">
                                                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getVisitTypeBadge(record.visitType)}`}>
                                                        {record.visitType || 'Visit'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        {record.visitDate ? new Date(record.visitDate).toLocaleDateString() : 'Unknown Date'}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white">
                                                    {record.primaryDiagnosis?.name || record.disease || 'Medical Visit'}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <BuildingOfficeIcon className="h-3 w-3 text-emerald-400" />
                                                    <p className="text-xs font-bold text-slate-400">
                                                        {record.hospital || 'Medical Center'} 
                                                    </p>
                                                    {record.doctorName && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-slate-700 mx-1"></span>
                                                            <p className="text-xs text-slate-500 font-medium">Dr. {record.doctorName}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-400' : 'text-slate-600'}`}>
                                            <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed View */}
                                {isExpanded && (
                                    <div className="p-8 pt-0 border-t border-white/5 space-y-8 animate-in fade-in slide-in-from-top-2">
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                            
                                            {/* Symptoms & Exam */}
                                            <div className="space-y-8">
                                                {record.symptoms?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                                                            <InformationCircleIcon className="h-3 w-3 mr-2 text-emerald-400" />
                                                            Symptoms Reported
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2 ml-5">
                                                            {record.symptoms.map((s, i) => (
                                                                <span key={i} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {record.physicalExam && Object.values(record.physicalExam).some(v => v) && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                                                            <HeartIcon className="h-3 w-3 mr-2 text-blue-400" />
                                                            Physical Examination
                                                        </h4>
                                                        <div className="grid grid-cols-1 gap-3 ml-5">
                                                            {Object.entries(record.physicalExam).map(([key, value]) => value && (
                                                                <div key={key} className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                                                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{key}</p>
                                                                    <p className="text-sm text-slate-200 font-medium leading-relaxed">{value}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Labs & Treatment */}
                                            <div className="space-y-8">
                                                {record.investigations?.labTests?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                                                            <BeakerIcon className="h-3 w-3 mr-2 text-emerald-400" />
                                                            Laboratory Results
                                                        </h4>
                                                        <div className="space-y-3 ml-5">
                                                            {record.investigations.labTests.map((test, i) => (
                                                                <div key={i} className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{test.testName}</p>
                                                                        <p className={`text-base font-bold ${test.abnormal ? 'text-rose-400' : 'text-white'}`}>
                                                                            {test.result}
                                                                            {test.abnormal && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">Abnormal</span>}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {(record.treatmentPlan?.plan || record.prescribedMedications?.length > 0) && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                                                            <SparklesIcon className="h-3 w-3 mr-2 text-emerald-400" />
                                                            Care & Treatment Plan
                                                        </h4>
                                                        <div className="ml-5 space-y-4">
                                                            {record.prescribedMedications?.length > 0 && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {record.prescribedMedications.map((med, i) => (
                                                                        <span key={i} className="px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                                                                            {med}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {record.treatmentPlan?.plan && (
                                                                <div className="p-5 rounded-2xl bg-slate-900 border-l-4 border-l-emerald-500 border-y border-r border-white/5">
                                                                    <p className="text-sm text-slate-300 font-medium leading-relaxed">{record.treatmentPlan.plan}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Vitals Summary */}
                                        {record.vitalSigns && Object.keys(record.vitalSigns).some(k => record.vitalSigns[k]) && (
                                            <div className="pt-8 border-t border-white/5">
                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Recorded Vitals</h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                                                    {[
                                                        { label: 'Temp', val: record.vitalSigns.temperature, unit: '°C' },
                                                        { label: 'HR', val: record.vitalSigns.heartRate, unit: 'bpm' },
                                                        { label: 'O₂ Sat', val: record.vitalSigns.oxygenSaturation, unit: '%' },
                                                        { label: 'BP', val: record.vitalSigns.bloodPressure?.systolic ? `${record.vitalSigns.bloodPressure.systolic}/${record.vitalSigns.bloodPressure.diastolic}` : null, unit: '' },
                                                        { label: 'BMI', val: record.vitalSigns.bmi, unit: '' },
                                                        { label: 'Pain', val: record.vitalSigns.painScore, unit: '/10' }
                                                    ].map((v, i) => v.val && (
                                                        <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-white/5 text-center">
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{v.label}</p>
                                                            <p className="text-lg font-bold text-white">{v.val}<span className="text-xs text-slate-500 ml-0.5">{v.unit}</span></p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PatientMedicalRecords;