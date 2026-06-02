import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getPatient, 
    getPatientRecords, 
    getClinicalProfile,
    getPatientVitalsHistory,
    updatePatient,
    getClinicalSnapshot,
    getClinicalRisk
} from '../services/api';
import { useAuth } from '../context/AuthProvider';
import { 
    UserIcon, 
    UserGroupIcon,
    HeartIcon, 
    ClipboardDocumentListIcon, 
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CalendarIcon,
    ArrowTrendingUpIcon,
    BeakerIcon,
    ClockIcon,
    DocumentTextIcon,
    PlusIcon,
    ChatBubbleLeftRightIcon,
    ChevronRightIcon,
    SparklesIcon,
    ChartBarIcon,
    AcademicCapIcon,
    StarIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import PregnancyInfo from '../components/patients/PregnancyInfo';
import PediatricInfo from '../components/patients/PediatricInfo';
import SpecialNeeds from '../components/patients/SpecialNeeds';
import VitalsTrend from '../components/patients/VitalsTrend';

const PatientDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    const [patient, setPatient] = useState(null);
    const [records, setRecords] = useState([]);
    const [clinicalProfile, setClinicalProfile] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [clinicalRisk, setClinicalRisk] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingRisk, setLoadingRisk] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [editingField, setEditingField] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});

    const canEdit = currentUser?.role !== 'viewer' && currentUser?.role !== 'patient';

    const fetchData = useCallback(async () => {
        try {
            const [patientRes, recordsRes, profileRes, snapshotRes] = await Promise.all([
                getPatient(id),
                getPatientRecords(id),
                getClinicalProfile(id),
                getClinicalSnapshot(id)
            ]);
            setPatient(patientRes.data);
            setRecords(recordsRes.data);
            setClinicalProfile(profileRes.data);
            setSnapshot(snapshotRes.data);
        } catch (error) {
            console.error('Failed to fetch patient data', error);
            toast.error('Clinical data sync failed');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (activeTab === 'risk' && patient?._id) {
            fetchClinicalRisk();
        }
    }, [activeTab, patient?._id]);

    const fetchClinicalRisk = async () => {
        setLoadingRisk(true);
        try {
            const res = await getClinicalRisk(patient._id);
            setClinicalRisk(res.data);
        } catch (err) {
            console.error("Risk assessment failed", err);
        } finally {
            setLoadingRisk(false);
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

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark-950">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark-950 px-4">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tighter mb-2 uppercase">Record Not Found</h1>
                <p className="text-gray-500 text-sm max-w-md text-center mb-8">
                    The requested clinical record could not be retrieved from the central health database. It may have been purged or the link is invalid.
                </p>
                <button 
                    onClick={() => navigate('/patients')}
                    className="px-8 py-3 rounded-xl bg-brand-dark-900 border border-white/5 text-white hover:bg-brand-dark-800 transition-all font-mono text-[10px] uppercase tracking-widest"
                >
                    Back to Registry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark-950 pb-20">
            {/* Clinical Header */}
            <div className="bg-brand-dark-900 border-b border-white/5 pt-12 pb-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-[2rem] bg-brand-dark-800 border border-white/5 flex items-center justify-center relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <UserIcon className="h-12 w-12 text-gray-400 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                                    {patient.firstName} {patient.lastName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="px-3 py-1 rounded-lg bg-brand-dark-800 border border-white/5 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                        ID: {patient.nationalId}
                                    </span>
                                    <span className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                                        {calculateAge(patient.dateOfBirth)} YRS / {patient.gender}
                                    </span>
                                    <span className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${
                                        patient.clinicalProfile?.triageStatus?.priority === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                        patient.clinicalProfile?.triageStatus?.priority === 'EMERGENT' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                                        'bg-cyber-green/10 border-cyber-green/20 text-cyber-green'
                                    }`}>
                                        Triage: {patient.clinicalProfile?.triageStatus?.priority || 'STABLE'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-all">
                                Export PDF
                            </button>
                            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] font-bold uppercase tracking-widest text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                                New Record
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 mt-12 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                            { id: 'conditions', label: 'Conditions', icon: BeakerIcon },
                            { id: 'medications', label: 'Medications', icon: ClipboardDocumentListIcon },
                            { id: 'allergies', label: 'Allergies', icon: ExclamationTriangleIcon },
                            { id: 'surgical', label: 'Surgical', icon: ShieldCheckIcon },
                            { id: 'family', label: 'Family', icon: UserGroupIcon },
                            { id: 'immunizations', label: 'Immunizations', icon: SparklesIcon },
                            { id: 'vitals', label: 'Vitals', icon: ArrowTrendingUpIcon },
                            { id: 'records', label: 'Records', icon: DocumentTextIcon },
                            { id: 'risk', label: 'Risk', icon: ExclamationTriangleIcon },
                            { id: 'pregnancy', label: 'Pregnancy', icon: HeartIcon },
                            { id: 'pediatric', label: 'Pediatric', icon: AcademicCapIcon },
                            { id: 'special', label: 'Special Needs', icon: StarIcon },
                            { id: 'anomaly', label: 'Anomaly Detection', icon: MagnifyingGlassIcon }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${
                                    activeTab === tab.id
                                        ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                        : 'text-gray-500 border border-transparent hover:border-white/10 hover:text-gray-300'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-12">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* AI Clinical Snapshot */}
                            <div className="rounded-[2rem] bg-brand-dark-900 border border-white/5 p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <SparklesIcon className="h-20 w-24 text-purple-500" />
                                </div>
                                <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-6 flex items-center">
                                    <SparklesIcon className="h-4 w-4 mr-2" />
                                    AI_CLINICAL_SYNTHESIS
                                </h3>
                                <p className="text-xl text-gray-200 leading-relaxed font-medium italic">
                                    "{snapshot?.summary || 'Synthesizing patient history...'}"
                                </p>
                            </div>

                            {/* Recent Timeline */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center">
                                    <ClockIcon className="h-4 w-4 mr-2" />
                                    RECENT_CLINICAL_EVENTS
                                </h3>
                                <div className="space-y-4">
                                    {records.slice(0, 3).map((record, i) => (
                                        <div key={i} className="glass-card-modern p-6 border border-white/5 hover:border-white/10 transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-4">
                                                    <div className="p-3 rounded-2xl bg-brand-dark-800 border border-white/5 text-gray-400">
                                                        <DocumentTextIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg">{record.disease}</h4>
                                                        <p className="text-xs text-gray-500">{formatDate(record.visitDate)} @ {record.hospital}</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest border border-white/5">
                                                    {record.visitType}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Biometric Vitals Card */}
                            <div className="rounded-[2rem] bg-brand-dark-900 border border-white/5 p-8">
                                <h3 className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] mb-8">
                                    LATEST_BIOMETRICS
                                </h3>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Temp', value: `${clinicalProfile?.vitalSigns?.temperature || '—'}°C`, color: 'text-red-400' },
                                        { label: 'BP', value: `${clinicalProfile?.vitalSigns?.bloodPressure?.systolic || '—'}/${clinicalProfile?.vitalSigns?.bloodPressure?.diastolic || '—'}`, color: 'text-white' },
                                        { label: 'HR', value: `${clinicalProfile?.vitalSigns?.heartRate || '—'} bpm`, color: 'text-cyber-blue' },
                                        { label: 'SpO2', value: `${clinicalProfile?.vitalSigns?.oxygenSaturation || '—'}%`, color: 'text-cyber-green' }
                                    ].map((vit, i) => (
                                        <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{vit.label}</span>
                                            <span className={`text-lg font-black ${vit.color}`}>{vit.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rapid Actions */}
                            <div className="rounded-[2rem] bg-brand-dark-900 border border-white/5 p-8">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">
                                    CONTINUITY_ACTIONS
                                </h3>
                                <div className="space-y-3">
                                    <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                        Initiate Handover
                                    </button>
                                    <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                                        <ChevronRightIcon className="h-4 w-4" />
                                        Schedule Follow-up
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Conditions Tab */}
                {activeTab === 'conditions' && (
                    <div className="rounded-[2rem] bg-brand-dark-900 border border-white/5 p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">
                                CHRONIC_PATHOLOGY_LOG
                            </h2>
                            {canEdit && (
                                <button className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all">
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clinicalProfile?.chronicConditions?.map((cond, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all">
                                    <h4 className="text-white font-bold text-lg mb-1">{cond.condition}</h4>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Diagnosed: {formatDate(cond.diagnosisDate)}</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        <span className="px-2 py-1 rounded-md bg-green-500/10 text-[8px] font-black text-green-500 uppercase border border-green-500/20">{cond.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vitals Tab (Restored with Full History List) */}
                {activeTab === 'vitals' && (
                    <div className="space-y-8">
                        <div className="rounded-[2rem] bg-brand-dark-900 border border-white/5 p-8">
                            <h2 className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] mb-8">
                                PHYSIOLOGICAL_STABILITY_TIMELINE
                            </h2>
                            <div className="space-y-4">
                                {records.filter(r => r.vitalSigns).map((record, idx) => (
                                    <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-cyber-blue/30 transition-all">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-xl bg-brand-dark-800 text-cyber-blue">
                                                    <ClockIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{formatDate(record.visitDate)}</p>
                                                    <p className="text-[9px] font-mono text-gray-500">REF: {record.visitNumber}</p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 rounded-lg bg-brand-dark-800 border border-white/5 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                                {record.hospital}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            {[
                                                { l: 'TEMP', v: `${record.vitalSigns.temperature}°C`, c: record.vitalSigns.temperature > 37.5 ? 'text-red-400' : 'text-white' },
                                                { l: 'BP', v: `${record.vitalSigns.bloodPressure?.systolic || '—'}/${record.vitalSigns.bloodPressure?.diastolic || '—'}`, c: 'text-white' },
                                                { l: 'HEART RATE', v: `${record.vitalSigns.heartRate} BPM`, c: 'text-cyber-blue' },
                                                { l: 'SPO2', v: `${record.vitalSigns.oxygenSaturation}%`, c: record.vitalSigns.oxygenSaturation < 94 ? 'text-orange-400' : 'text-white' },
                                                { l: 'RESP', v: `${record.vitalSigns.respiratoryRate}/MIN`, c: 'text-white' }
                                            ].map((m, i) => (
                                                <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase mb-2 tracking-widest">{m.l}</p>
                                                    <p className={`text-lg font-black ${m.c}`}>{m.v}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Risk Tab (Dynamic AI Assessment) */}
                {activeTab === 'risk' && (
                    <div className="space-y-8">
                        <div className="rounded-[2rem] bg-brand-dark-900 border border-cyber-blue/20 p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ShieldCheckIcon className="h-24 w-24 text-cyber-blue" />
                            </div>
                            <h3 className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] mb-8 flex items-center">
                                <ExclamationTriangleIcon className="h-4 w-4 mr-3" />
                                AI_DRIVEN_CLINICAL_RISK_PROFILING
                            </h3>
                            
                            {loadingRisk ? (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-32 h-32 bg-white/5 rounded-full" />
                                    <div className="flex-1 space-y-4">
                                        <div className="h-8 bg-white/5 rounded w-1/4" />
                                        <div className="h-4 bg-white/5 rounded w-3/4" />
                                    </div>
                                </div>
                            ) : clinicalRisk ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                    <div className="text-center lg:text-left lg:border-r border-white/5 lg:pr-12">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">AGGREGATED RISK SCORE</p>
                                        <p className="text-7xl font-black text-white">{clinicalRisk.riskScore}</p>
                                        <div className={`mt-6 inline-block px-6 py-2 rounded-full text-xs font-black uppercase ${
                                            clinicalRisk.riskLevel === 'CRITICAL' ? 'bg-red-500 text-white' :
                                            clinicalRisk.riskLevel === 'HIGH' ? 'bg-orange-500 text-white' :
                                            clinicalRisk.riskLevel === 'MODERATE' ? 'bg-yellow-500 text-slate-900' :
                                            'bg-cyber-green text-white'
                                        }`}>
                                            {clinicalRisk.riskLevel} CLINICAL POTENTIAL
                                        </div>
                                    </div>
                                    <div className="lg:col-span-2 space-y-4">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">NEURAL_CLINICAL_INSIGHTS</p>
                                        {clinicalRisk.insights.map((insight, idx) => (
                                            <div key={idx} className="flex gap-4 items-start p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyber-blue flex-shrink-0 shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
                                                <p className="text-sm text-gray-300 leading-relaxed font-medium italic">"{insight}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 italic">Assessment engine awaiting clinical data stream...</p>
                            )}
                        </div>

                        {/* Static Lifestyle Factors */}
                        <div className="rounded-[2rem] bg-brand-dark-900 border border-white/5 p-8">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8">
                                LIFESTYLE_RISK_FACTORS (DATA_INPUTS)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {clinicalProfile?.riskFactors?.map((risk, i) => (
                                    <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">{risk.factor}</p>
                                        <p className="text-lg font-bold text-white">{risk.severity}</p>
                                        <p className="text-xs text-gray-500 mt-2">{risk.notes || 'No active clinical observations.'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Placeholder for other tabs to keep UI consistent */}
                {['medications', 'allergies', 'surgical', 'family', 'immunizations', 'records', 'pregnancy', 'pediatric', 'special', 'anomaly'].includes(activeTab) && (
                    <div className="rounded-[2rem] bg-brand-dark-900 border border-white/5 p-12 text-center">
                        <DocumentTextIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Tab content currently being synchronized with high-fidelity dataset...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDetailsPage;