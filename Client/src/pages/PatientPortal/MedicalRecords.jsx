import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    DocumentTextIcon,
    BeakerIcon,
    BuildingOfficeIcon,
    HeartIcon,
    ExclamationTriangleIcon,
    SparklesIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PatientMedicalRecords = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRecord, setExpandedRecord] = useState(null);

    useEffect(() => { loadRecords(); }, []);

    const loadRecords = async () => {
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const response = await fetch(`${import.meta.env.VITE_API_URL }/api/patient/records`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setRecords(Array.isArray(data) ? data : (data.records || []));
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
            Emergency:    'bg-red-500/10 text-red-400 border-red-500/20',
            Outpatient:   'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20',
            Inpatient:    'bg-cyber-purple/10 text-cyber-purple border-cyber-purple/20',
            'Follow-up':  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            Consultation: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
        return colors[type] || 'bg-white/5 text-gray-400 border-white/10';
    };

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
                            <DocumentTextIcon className="h-7 w-7 text-cyber-blue" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">My Visit History</h1>
                        <p className="text-gray-400 text-sm font-medium mt-1">
                            <span className="text-cyber-blue font-black">{records.length}</span> documented medical visit{records.length !== 1 ? 's' : ''} on file
                        </p>
                    </div>
                </div>
            </div>

            {/* Records */}
            {records.length === 0 ? (
                <div className="bg-brand-dark-900/40 border border-dashed border-white/10 rounded-2xl py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-4">
                        <DocumentTextIcon className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">No Records Found</h3>
                    <p className="text-sm text-gray-500 font-medium">Your medical history will appear here once your provider adds a visit.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {records.map((record, idx) => {
                        const isExpanded = expandedRecord === record._id;
                        return (
                            <div
                                key={record._id || idx}
                                className={`bg-brand-dark-900/60 border rounded-2xl overflow-hidden transition-all duration-300 ${
                                    isExpanded ? 'border-cyber-blue/30' : 'border-white/5 hover:border-white/10'
                                }`}
                            >
                                {/* Header row */}
                                <div
                                    className="p-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                    onClick={() => setExpandedRecord(isExpanded ? null : record._id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center justify-center text-xs font-black text-gray-500">
                                                #{records.length - idx}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getVisitTypeBadge(record.visitType)}`}>
                                                        {record.visitType || 'Visit'}
                                                    </span>
                                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                                        {record.visitDate ? new Date(record.visitDate).toLocaleDateString() : 'Unknown Date'}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-black text-white tracking-tight">
                                                    {record.primaryDiagnosis?.name || record.disease || 'Medical Visit'}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <BuildingOfficeIcon className="h-3 w-3 text-cyber-blue" />
                                                    <p className="text-xs font-bold text-gray-400">
                                                        {record.hospital || 'Medical Center'}
                                                    </p>
                                                    {record.doctorName && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                            <p className="text-xs text-gray-500">Dr. {record.doctorName}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-cyber-blue' : 'text-gray-600'}`}>
                                            <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="px-6 pb-8 pt-2 border-t border-white/5 space-y-8">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                                            {/* Left: Symptoms & Exam */}
                                            <div className="space-y-6">
                                                {record.symptoms?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                            <InformationCircleIcon className="h-3 w-3 text-cyber-blue" />
                                                            Symptoms Reported
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {record.symptoms.map((s, i) => (
                                                                <span key={i} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300 font-medium">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {record.physicalExam && Object.values(record.physicalExam).some(v => v) && (
                                                    <div>
                                                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                            <HeartIcon className="h-3 w-3 text-cyber-purple" />
                                                            Physical Examination
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {Object.entries(record.physicalExam).map(([key, value]) => value && (
                                                                <div key={key} className="p-4 rounded-xl bg-brand-dark-950/50 border border-white/5">
                                                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{key}</p>
                                                                    <p className="text-sm text-gray-200 font-medium leading-relaxed">{value}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Labs & Treatment */}
                                            <div className="space-y-6">
                                                {record.investigations?.labTests?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                            <BeakerIcon className="h-3 w-3 text-cyber-blue" />
                                                            Laboratory Results
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {record.investigations.labTests.map((test, i) => (
                                                                <div key={i} className="p-4 rounded-xl bg-brand-dark-950/50 border border-white/5 flex justify-between items-center">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-gray-500 uppercase mb-1">{test.testName}</p>
                                                                        <p className={`text-base font-black ${test.abnormal ? 'text-red-400' : 'text-white'}`}>
                                                                            {test.result}
                                                                            {test.abnormal && (
                                                                                <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">Abnormal</span>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {(record.treatmentPlan?.plan || record.prescribedMedications?.length > 0) && (
                                                    <div>
                                                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                            <SparklesIcon className="h-3 w-3 text-cyber-blue" />
                                                            Care & Treatment Plan
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {record.prescribedMedications?.length > 0 && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {record.prescribedMedications.map((med, i) => (
                                                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-cyber-blue/10 border border-cyber-blue/20 text-xs font-black text-cyber-blue uppercase tracking-tight">
                                                                            {med}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {record.treatmentPlan?.plan && (
                                                                <div className="p-4 rounded-xl bg-brand-dark-950 border-l-4 border-l-cyber-blue border-y border-r border-white/5">
                                                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">{record.treatmentPlan.plan}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Vitals */}
                                        {record.vitalSigns && Object.keys(record.vitalSigns).some(k => record.vitalSigns[k]) && (
                                            <div className="pt-6 border-t border-white/5">
                                                <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Recorded Vitals</h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                                    {[
                                                        { label: 'Temp', val: record.vitalSigns.temperature, unit: '°C' },
                                                        { label: 'HR', val: record.vitalSigns.heartRate, unit: 'bpm' },
                                                        { label: 'O₂ Sat', val: record.vitalSigns.oxygenSaturation, unit: '%' },
                                                        { label: 'BP', val: record.vitalSigns.bloodPressure?.systolic ? `${record.vitalSigns.bloodPressure.systolic}/${record.vitalSigns.bloodPressure.diastolic}` : null, unit: '' },
                                                        { label: 'BMI', val: record.vitalSigns.bmi, unit: '' },
                                                        { label: 'Pain', val: record.vitalSigns.painScore, unit: '/10' },
                                                    ].map((v, i) => v.val && (
                                                        <div key={i} className="p-4 rounded-xl bg-brand-dark-950 border border-white/5 text-center">
                                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{v.label}</p>
                                                            <p className="text-lg font-black text-white">{v.val}<span className="text-xs text-gray-500 ml-0.5">{v.unit}</span></p>
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
