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
            Emergency: 'bg-red-500/20 text-red-400',
            Outpatient: 'bg-blue-500/20 text-blue-400',
            Inpatient: 'bg-purple-500/20 text-purple-400',
            'Follow-up': 'bg-green-500/20 text-green-400',
            Consultation: 'bg-yellow-500/20 text-yellow-400'
        };
        return colors[type] || 'bg-gray-500/20 text-gray-400';
    };

    const getPainScoreColor = (score) => {
        if (!score) return 'text-gray-400';
        if (score <= 3) return 'text-green-400';
        if (score <= 6) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getBMICategory = (bmi) => {
        if (!bmi) return null;
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-400' };
        if (bmi < 25) return { label: 'Normal', color: 'text-green-400' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-orange-400' };
        return { label: 'Obese', color: 'text-red-400' };
    };

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
                            <div className="absolute inset-0 rounded-2xl bg-cyber-purple/20 blur-xl animate-pulse" />
                            <div className="relative w-16 h-16 rounded-2xl bg-brand-dark-900 border border-cyber-purple/30 flex items-center justify-center shadow-2xl">
                                <DocumentTextIcon className="h-8 w-8 text-cyber-purple" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Clinical Archives</h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                                <span className="text-cyber-purple">{records.length}</span> Encrypted Records Identified
                            </p>
                        </div>
                    </div>
                </div>

                {/* Records List */}
                {records.length === 0 ? (
                    <div className="glass-card-modern py-20 text-center border border-white/5">
                        <div className="w-20 h-20 rounded-3xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <DocumentTextIcon className="h-10 w-10 text-gray-700" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Null Data Stream</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No clinical records found in the current node.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {records.map((record, idx) => {
                            const isExpanded = expandedRecord === record._id;
                            const bmiCategory = getBMICategory(record.vitalSigns?.bmi);
                            
                            return (
                                <div key={record._id || idx} className={`glass-card-modern border transition-all duration-500 ${isExpanded ? 'border-cyber-purple/30 shadow-[0_0_30px_rgba(188,19,254,0.1)]' : 'border-white/5'}`}>
                                    {/* Header */}
                                    <div 
                                        className="p-6 cursor-pointer group"
                                        onClick={() => setExpandedRecord(isExpanded ? null : record._id)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-brand-dark-950 border border-white/5 flex items-center justify-center shadow-xl group-hover:border-cyber-purple/30 transition-all duration-500">
                                                    <span className="text-[10px] font-black text-cyber-purple italic">#{records.length - idx}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                                                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getVisitTypeBadge(record.visitType)}`}>
                                                            {record.visitType?.toUpperCase() || 'VISIT'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                                            {record.visitDate ? new Date(record.visitDate).toLocaleDateString().toUpperCase() : 'DATE_N/A'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                                                        {record.primaryDiagnosis?.name || record.disease || 'UNCLASSIFIED VISIT'}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-[10px] font-bold text-cyber-blue uppercase tracking-widest">
                                                            {record.hospital?.toUpperCase() || 'FACILITY_N/A'} 
                                                        </p>
                                                        {record.doctorName && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PROV: DR. {record.doctorName.toUpperCase()}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-10 rounded-xl bg-brand-dark-900 border border-white/5 flex items-center justify-center transition-all duration-500 ${isExpanded ? 'rotate-180 border-cyber-purple/30 text-cyber-purple' : 'text-gray-600 group-hover:text-white'}`}>
                                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="p-8 pt-0 border-t border-white/5 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                                            
                                            {/* Sections Grid */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                
                                                {/* Left Column: Diagnostics & Symptoms */}
                                                <div className="space-y-10">
                                                    {/* Symptoms */}
                                                    {record.symptoms?.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-4">
                                                                <ClipboardDocumentListIcon className="h-5 w-5 text-cyber-purple" />
                                                                <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em] italic">Biometric Indicators</h4>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 ml-8">
                                                                {record.symptoms.map((s, i) => (
                                                                    <span key={i} className="px-4 py-1.5 rounded-xl bg-brand-dark-900 border border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Diagnoses */}
                                                    {(record.secondaryDiagnoses?.length > 0 || record.differentialDiagnosis?.length > 0) && (
                                                        <div className="space-y-6">
                                                            {record.secondaryDiagnoses?.length > 0 && (
                                                                <div className="ml-8 p-6 rounded-2xl bg-brand-dark-900 border border-white/5">
                                                                    <h5 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Secondary Pattern Match</h5>
                                                                    <div className="space-y-2">
                                                                        {record.secondaryDiagnoses.map((diag, i) => (
                                                                            <p key={i} className="text-xs font-bold text-gray-300 uppercase tracking-widest italic flex items-center">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-cyber-purple/50 mr-3"></span>
                                                                                {diag.name || diag}
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {record.differentialDiagnosis?.length > 0 && (
                                                                <div className="ml-8 p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
                                                                    <h5 className="text-[9px] font-bold text-yellow-500/50 uppercase tracking-widest mb-3 italic flex items-center">
                                                                        <ExclamationTriangleIcon className="h-3 w-3 mr-2" />
                                                                        Alternative Hypotheses
                                                                    </h5>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {record.differentialDiagnosis.map((diag, i) => (
                                                                            <span key={i} className="px-3 py-1 rounded-lg bg-brand-dark-950 border border-yellow-500/10 text-[9px] font-bold text-yellow-500 uppercase tracking-widest">
                                                                                {diag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Physical Exam */}
                                                    {record.physicalExam && Object.values(record.physicalExam).some(v => v) && (
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-4">
                                                                <HeartIcon className="h-5 w-5 text-cyber-blue" />
                                                                <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em] italic">Neural Examination Logs</h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-8">
                                                                {Object.entries(record.physicalExam).map(([key, value]) => value && (
                                                                    <div key={key} className="p-4 rounded-2xl bg-brand-dark-900 border border-white/5">
                                                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">{key}</p>
                                                                        <p className="text-xs font-bold text-gray-300 uppercase tracking-tighter leading-relaxed">{value}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Labs, Imaging & Treatment */}
                                                <div className="space-y-10">
                                                    {/* Lab Tests */}
                                                    {record.investigations?.labTests && record.investigations.labTests.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-4">
                                                                <BeakerIcon className="h-5 w-5 text-cyber-green" />
                                                                <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em] italic">Biochemical Assays</h4>
                                                            </div>
                                                            <div className="space-y-3 ml-8">
                                                                {record.investigations.labTests.map((test, i) => (
                                                                    <div key={i} className="p-4 rounded-2xl bg-brand-dark-900 border border-white/5 flex justify-between items-center group/lab hover:border-cyber-green/30 transition-all duration-300">
                                                                        <div>
                                                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{test.testName}</p>
                                                                            <p className={`text-sm font-black italic tracking-tighter ${test.abnormal ? 'text-red-400' : 'text-white'}`}>
                                                                                {test.result}
                                                                                {test.abnormal && <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">ABNORMAL_SIGNAL</span>}
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">{test.resultDate ? new Date(test.resultDate).toLocaleDateString() : 'N/A'}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Radiology */}
                                                    {record.investigations?.radiology && record.investigations.radiology.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-4">
                                                                <CameraIcon className="h-5 w-5 text-cyber-blue" />
                                                                <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em] italic">Imaging Telemetry</h4>
                                                            </div>
                                                            <div className="space-y-4 ml-8">
                                                                {record.investigations.radiology.map((study, i) => (
                                                                    <div key={i} className="p-5 rounded-2xl bg-brand-dark-900 border border-white/5">
                                                                        <div className="flex justify-between mb-4">
                                                                            <h5 className="text-xs font-black text-white uppercase tracking-tighter italic">{study.studyType}</h5>
                                                                            <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">{new Date(study.reportDate).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-4">{study.findings}</p>
                                                                        {study.images?.length > 0 && (
                                                                            <div className="flex flex-wrap gap-3">
                                                                                {study.images.map((img, imgIdx) => (
                                                                                    <div key={imgIdx} className="relative group/img overflow-hidden rounded-xl border border-white/5 cursor-pointer" onClick={() => window.open(`http://localhost:5000${img.url}`, '_blank')}>
                                                                                        <img src={`http://localhost:5000${img.url}`} className="w-16 h-16 object-cover group-hover/img:scale-110 transition-transform duration-500 opacity-50 group-hover/img:opacity-100" />
                                                                                        <div className="absolute inset-0 bg-cyber-blue/10 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Treatment Plan */}
                                                    {(record.treatmentPlan?.plan || record.prescribedMedications?.length > 0) && (
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-4">
                                                                <SparklesIcon className="h-5 w-5 text-cyber-purple" />
                                                                <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em] italic">Recovery Protocol</h4>
                                                            </div>
                                                            <div className="ml-8 space-y-4">
                                                                {record.prescribedMedications?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {record.prescribedMedications.map((med, i) => (
                                                                            <span key={i} className="px-4 py-1.5 rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 text-[10px] font-black text-cyber-purple uppercase tracking-widest italic">
                                                                                {med}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {record.treatmentPlan?.plan && (
                                                                    <div className="p-5 rounded-2xl bg-brand-dark-950 border border-white/5 border-l-cyber-purple/50 border-l-4">
                                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">{record.treatmentPlan.plan}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Vitals Summary Strip */}
                                            {record.vitalSigns && Object.keys(record.vitalSigns).some(k => record.vitalSigns[k]) && (
                                                <div className="pt-10 border-t border-white/5">
                                                    <div className="flex items-center space-x-3 mb-6">
                                                        <ChartBarIcon className="h-5 w-5 text-gray-600" />
                                                        <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em] italic">Vitals Snapshot</h4>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                                                        {[
                                                            { label: 'Temp', val: record.vitalSigns.temperature, unit: '°C' },
                                                            { label: 'HR', val: record.vitalSigns.heartRate, unit: 'BPM' },
                                                            { label: 'RR', val: record.vitalSigns.respiratoryRate, unit: '/MIN' },
                                                            { label: 'O₂', val: record.vitalSigns.oxygenSaturation, unit: '%' },
                                                            { label: 'BP', val: record.vitalSigns.bloodPressure?.systolic ? `${record.vitalSigns.bloodPressure.systolic}/${record.vitalSigns.bloodPressure.diastolic}` : null, unit: '' },
                                                            { label: 'BMI', val: record.vitalSigns.bmi, unit: '' },
                                                            { label: 'Pain', val: record.vitalSigns.painScore, unit: '/10' }
                                                        ].map((v, i) => v.val && (
                                                            <div key={i} className="p-3 rounded-xl bg-brand-dark-900 border border-white/5 text-center group/vital hover:border-white/20 transition-all duration-300 shadow-lg">
                                                                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-1">{v.label}</p>
                                                                <p className="text-sm font-black text-white italic tracking-tighter">{v.val}<span className="text-[9px] text-gray-600 ml-0.5">{v.unit}</span></p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Discharge Instructions Footer */}
                                            {record.dischargeInstructions && (
                                                <div className="mt-8 p-6 rounded-2xl bg-cyber-blue/5 border border-cyber-blue/20 flex items-start gap-4 animate-pulse">
                                                    <div className="p-3 rounded-xl bg-brand-dark-950 border border-cyber-blue/30 shadow-2xl">
                                                        <DocumentTextIcon className="h-6 w-6 text-cyber-blue" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-cyber-blue uppercase tracking-widest mb-1 italic">Post-Encounter Instructions</p>
                                                        <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed italic">{record.dischargeInstructions}</p>
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
        </div>
    );
};

export default PatientMedicalRecords;