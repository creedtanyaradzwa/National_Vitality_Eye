import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getPatient, 
    getPatientRecords, 
    getClinicalProfile,
    getPatientVitalsHistory,
    updatePatient,
    getClinicalSnapshot,
    getClinicalRisk,
    getPatientAnomalies,
    addObservation,
    addChronicCondition,
    addMedication,
    addAllergy,
    updateClinicalProfile,
    predictDisease
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
    MagnifyingGlassIcon,
    ArrowPathRoundedSquareIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import PregnancyInfo from '../components/patients/PregnancyInfo';
import PediatricInfo from '../components/patients/PediatricInfo';
import VitalsTrend from '../components/patients/VitalsTrend';
import HandoverWidget from '../components/patients/HandoverWidget';
import FluidBalanceWidget from '../components/patients/FluidBalanceWidget';
import SpecialNeeds from '../components/patients/SpecialNeeds';
import Immunizations from '../components/patients/Immunizations';

const PatientDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    const [patient, setPatient] = useState(null);
    const [records, setRecords] = useState([]);
    const [clinicalProfile, setClinicalProfile] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [clinicalRisk, setClinicalRisk] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [aiPredictions, setAiPredictions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingRisk, setLoadingRisk] = useState(false);
    const [loadingAnomalies, setLoadingAnomalies] = useState(false);
    const [loadingPredictions, setLoadingPredictions] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [editingField, setEditingField] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});

    const canEdit = currentUser?.role !== 'viewer' && currentUser?.role !== 'patient';
    const activeRecord = records.find(r => r.visitStatus === 'Active' || r.visitStatus === 'In Admission');
    const latestVitals = records.find(r => r.vitalSigns)?.vitalSigns;

    const hereditaryHistory = clinicalProfile?.familyHistory ? [
        ...(clinicalProfile.familyHistory.mother || []),
        ...(clinicalProfile.familyHistory.father || []),
        ...(clinicalProfile.familyHistory.siblings || []),
        ...(clinicalProfile.familyHistory.other || [])
    ] : [];

    const fetchAIPrediction = useCallback(async (currentPatient, currentRecords) => {
        const latestRecord = currentRecords.find(r => r.visitStatus === 'Active' || r.visitStatus === 'In Admission') || currentRecords[0];
        const symptoms = latestRecord?.symptoms || [];
        
        if (symptoms.length === 0) {
            setAiPredictions(null);
            return;
        }

        setLoadingPredictions(true);
        try {
            const requestData = {
                symptoms: symptoms,
                province: currentPatient.province,
                vitals: latestRecord.vitalSigns,
                patientId: currentPatient._id
            };
            const response = await predictDisease(requestData);
            setAiPredictions(response.data);
        } catch (error) {
            console.error('AI Prediction failed', error);
        } finally {
            setLoadingPredictions(false);
        }
    }, [id]);

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
            
            // Immediate Fetch for Intelligence Stack
            fetchClinicalRisk(patientRes.data._id);
            fetchAnomalies(patientRes.data._id);
            fetchAIPrediction(patientRes.data, recordsRes.data);
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

    const fetchClinicalRisk = async (patientId) => {
        setLoadingRisk(true);
        try {
            const res = await getClinicalRisk(patientId || id);
            setClinicalRisk(res.data);
        } catch (err) {
            console.error("Risk assessment failed", err);
        } finally {
            setLoadingRisk(false);
        }
    };

    const fetchAnomalies = async (patientId) => {
        setLoadingAnomalies(true);
        try {
            const res = await getPatientAnomalies(patientId || id);
            setAnomalies(res.data.anomalies || []);
        } catch (err) {
            console.error("Anomaly detection failed", err);
        } finally {
            setLoadingAnomalies(false);
        }
    };

    const handleFluidUpdate = async (newObs) => {
        console.log('[PatientDetailsPage] handleFluidUpdate triggered with:', JSON.stringify(newObs));
        if (!activeRecord) {
            console.error('[PatientDetailsPage] No active record found for fluid update!');
            return;
        }
        try {
            console.log('[PatientDetailsPage] Calling addObservation for record:', activeRecord._id);
            await addObservation(activeRecord._id, newObs);
            console.log('[PatientDetailsPage] Fluid update success. Refreshing data...');
            toast.success('Fluid balance updated');
            fetchData();
        } catch (error) {
            console.error('[PatientDetailsPage] Fluid update failed:', error);
            toast.error('Fluid update failed');
        }
    };

    const handleProfileUpdate = async (data) => {
        try {
            await updateClinicalProfile(id, data);
            toast.success('Clinical profile updated');
            fetchData();
        } catch (error) {
            console.error('Failed to update clinical profile', error);
            toast.error('Update failed');
        }
    };

    const handleAdd = (type) => {
        setModalType(type);
        setFormData({});
        setShowAddModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (modalType === 'condition') {
                res = await addChronicCondition(id, formData);
            } else if (modalType === 'medication') {
                res = await addMedication(id, formData);
            } else if (modalType === 'allergy') {
                res = await addAllergy(id, formData);
            } else if (modalType === 'surgical') {
                // Assuming we use updateClinicalProfile or a specific surgical add
                const updatedHistory = [...(clinicalProfile.surgicalHistory || []), formData];
                res = await updateClinicalProfile(id, { surgicalHistory: updatedHistory });
            } else if (modalType === 'family') {
                const currentFamily = clinicalProfile.familyHistory || {};
                const member = formData.member.toLowerCase();
                const newConditions = [...(currentFamily[member] || []), formData.condition];
                res = await updateClinicalProfile(id, { familyHistory: { ...currentFamily, [member]: newConditions } });
            }

            toast.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} added`);
            setShowAddModal(false);
            fetchData();
        } catch (error) {
            console.error(`Failed to add ${modalType}`, error);
            toast.error(`Addition failed: ${error.response?.data?.error || error.message}`);
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
            {/* 1. ABSOLUTE TOP: AI Clinical Synthesis Hero (High-Visibility Glass HUD) */}
            <div className="sticky top-0 z-50 bg-cyber-blue/10 backdrop-blur-xl border-b border-cyber-blue/30 py-3 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,242,255,0.1)]">
                {/* Visual Glow Layer */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue/5 via-white/5 to-cyber-blue/5 animate-pulse" />
                <div className="absolute -left-20 top-0 w-64 h-full bg-cyber-blue/20 blur-[80px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto px-4 relative z-10 flex items-center gap-6">
                    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1 rounded-lg bg-cyber-blue/20 border border-cyber-blue/30 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                        <SparklesIcon className="h-4 w-4 text-cyber-blue animate-pulse" />
                        <span className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] whitespace-nowrap">NEURAL_SYNTHESIS</span>
                    </div>
                    <div className="h-5 w-px bg-cyber-blue/20 hidden md:block" />
                    <p className="text-sm md:text-base text-white font-black italic leading-tight tracking-tight flex-1 drop-shadow-md">
                        "{snapshot?.summary || 'Synthesizing precision health dataset...'}"
                    </p>
                    <div className="ml-auto hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-blue/10 border border-cyber-blue/20 shadow-inner">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue animate-ping" />
                        <span className="text-[8px] font-black text-cyber-blue uppercase tracking-widest">LIVE_INFERENCE</span>
                    </div>
                </div>
            </div>

            {/* 2. Patient Identity Header */}
            <div className="bg-brand-dark-900 border-b border-white/5 py-6">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-brand-dark-800 border border-white/5 flex items-center justify-center relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <UserIcon className="h-8 w-8 text-gray-400 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tighter mb-1 uppercase">
                                    {patient.firstName} {patient.lastName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-lg bg-brand-dark-800 border border-white/5 text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                        ID: {patient.nationalId}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                                        {calculateAge(patient.dateOfBirth)} YRS / {patient.gender}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${
                                        patient.clinicalProfile?.triageStatus?.priority === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                        patient.clinicalProfile?.triageStatus?.priority === 'EMERGENT' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                                        'bg-cyber-green/10 border-cyber-green/20 text-cyber-green'
                                    }`}>
                                        Triage: {patient.clinicalProfile?.triageStatus?.priority || 'STABLE'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-all">
                                Export PDF
                            </button>
                            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-[9px] font-black uppercase tracking-widest text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                                New Record
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs (Refactored for zero-scroll wrap) */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-6">
                        {[
                            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                            { id: 'vitals', label: 'Vitals', icon: ArrowTrendingUpIcon },
                            { id: 'risk', label: 'Risk', icon: ExclamationTriangleIcon },
                            { id: 'anomaly', label: 'Anomaly', icon: MagnifyingGlassIcon },
                            { id: 'records', label: 'Records', icon: DocumentTextIcon },
                            { id: 'conditions', label: 'Conditions', icon: BeakerIcon },
                            { id: 'medications', label: 'Medications', icon: ClipboardDocumentListIcon },
                            { id: 'allergies', label: 'Allergies', icon: ExclamationTriangleIcon },
                            { id: 'surgical', label: 'Surgical', icon: ShieldCheckIcon },
                            { id: 'immunizations', label: 'Immuno', icon: SparklesIcon },
                            { id: 'family', label: 'Family', icon: UserGroupIcon },
                            { id: 'pregnancy', label: 'Pregnancy', icon: HeartIcon },
                            { id: 'pediatric', label: 'Pediatric', icon: AcademicCapIcon },
                            { id: 'special', label: 'Special', icon: StarIcon }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all duration-300 ${
                                    activeTab === tab.id
                                        ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                        : 'text-gray-500 border border-transparent hover:border-white/10 hover:text-gray-300'
                                }`}
                            >
                                <tab.icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8">
                {/* Overview Tab (Intelligence-First Architecture) */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        
                        {/* 1. Biometric Telemetry Strip (The Status) */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { 
                                    label: 'TEMP', 
                                    value: latestVitals?.temperature, 
                                    unit: '°C',
                                    color: (v) => v > 37.5 ? 'text-red-500' : v < 36 ? 'text-blue-400' : 'text-cyber-green',
                                    bg: (v) => v > 37.5 ? 'bg-red-500/5 border-red-500/20' : 'bg-brand-dark-900 border-white/5'
                                },
                                { 
                                    label: 'BP', 
                                    value: latestVitals?.bloodPressure?.systolic ? `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}` : '—', 
                                    unit: 'mmHg',
                                    color: (v) => 'text-white',
                                    bg: (v) => 'bg-brand-dark-900 border-white/5'
                                },
                                { 
                                    label: 'HR', 
                                    value: latestVitals?.heartRate, 
                                    unit: 'BPM',
                                    color: (v) => v > 100 || v < 60 ? 'text-orange-500' : 'text-cyber-blue',
                                    bg: (v) => v > 100 || v < 60 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-brand-dark-900 border-white/5'
                                },
                                { 
                                    label: 'SPO2', 
                                    value: latestVitals?.oxygenSaturation, 
                                    unit: '%',
                                    color: (v) => v < 94 ? 'text-red-500' : 'text-cyber-green',
                                    bg: (v) => v < 94 ? 'bg-red-500/5 border-red-500/20' : 'bg-brand-dark-900 border-white/5'
                                }
                            ].map((vit, i) => (
                                <div key={i} className={`p-6 rounded-2xl border transition-all ${vit.bg(vit.value)}`}>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2">{vit.label}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`text-4xl font-black tracking-tighter ${vit.color(vit.value)}`}>
                                            {vit.value || '—'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{vit.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 2. Neural Clinical Risk Profiler (Integrated Intelligence) */}
                            <div className="rounded-2xl bg-brand-dark-900 border border-cyber-blue/20 p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,242,255,0.05)]">
                                <div className="absolute top-0 right-0 p-6 opacity-5">
                                    <ShieldCheckIcon className="h-16 w-16 text-cyber-blue" />
                                </div>
                                <h3 className="text-[9px] font-black text-cyber-blue uppercase tracking-[0.4em] mb-6 flex items-center">
                                    <ExclamationTriangleIcon className="h-3.5 w-3.5 mr-2" />
                                    PREDICTIVE_STABILITY_ASSESSMENT
                                </h3>
                                
                                {loadingRisk ? (
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-10 bg-white/5 rounded-xl w-1/4" />
                                        <div className="h-2.5 bg-white/5 rounded-full w-full" />
                                    </div>
                                ) : clinicalRisk ? (
                                    <div className="flex flex-col md:flex-row gap-8">
                                        <div className="text-center md:text-left md:border-r border-white/5 md:pr-8">
                                            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-1">DETERIORATION_POTENTIAL</p>
                                            <p className={`text-5xl font-black tracking-tighter drop-shadow-sm ${
                                                clinicalRisk.riskScore > 75 ? 'text-red-500' : 
                                                clinicalRisk.riskScore > 50 ? 'text-orange-500' : 
                                                'text-white'
                                            }`}>
                                                {clinicalRisk.riskScore > 75 ? 'CRITICAL' : 
                                                 clinicalRisk.riskScore > 50 ? 'ELEVATED' : 
                                                 clinicalRisk.riskScore > 25 ? 'MODERATE' : 'STABLE'}
                                            </p>
                                            <div className={`mt-3 inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                clinicalRisk.riskLevel === 'CRITICAL' ? 'bg-red-500 text-white animate-pulse' :
                                                clinicalRisk.riskLevel === 'HIGH' ? 'bg-orange-500 text-white' :
                                                clinicalRisk.riskLevel === 'MODERATE' ? 'bg-yellow-500 text-slate-900' :
                                                'bg-cyber-green text-white'
                                            }`}>
                                                {clinicalRisk.riskLevel === 'CRITICAL' ? 'Immediate_Action_Required' : 
                                                 clinicalRisk.riskLevel === 'HIGH' ? 'High_Vigilance_Needed' : 
                                                 clinicalRisk.riskLevel === 'MODERATE' ? 'Routine_Monitoring' : 'Optimal_Condition'}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2.5">
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2">CRITICAL_HEALTH_OBSERVATIONS</p>
                                            {clinicalRisk.insights.slice(0, 3).map((insight, idx) => (
                                                <div key={idx} className="flex gap-2 items-start p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                                    <div className="mt-1.5 w-1 h-1 rounded-full bg-cyber-blue flex-shrink-0 shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
                                                    <p className="text-[11px] text-gray-300 leading-tight font-medium">"{insight}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-600 italic uppercase">Awaiting neural health stream...</p>
                                )}
                            </div>

                            {/* 3. Physiological Anomaly Engine (Red Alert Intelligence) */}
                            <div className="rounded-2xl bg-brand-dark-900 border border-red-500/20 p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5">
                                    <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
                                </div>
                                <h3 className="text-[9px] font-black text-red-400 uppercase tracking-[0.4em] mb-6 flex items-center">
                                    <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5 mr-2" />
                                    Anomaly_Deviation_Engine
                                </h3>

                                {loadingAnomalies ? (
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-12 bg-white/5 rounded-xl w-full" />
                                    </div>
                                ) : anomalies.length > 0 ? (
                                    <div className="space-y-3">
                                        {anomalies.slice(0, 2).map((anomaly, idx) => (
                                            <div key={idx} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-4 hover:bg-red-500/10 transition-all cursor-pointer" onClick={() => setActiveTab('anomaly')}>
                                                <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                                                    <ExclamationTriangleIcon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="text-white font-bold text-sm uppercase">{anomaly.vital}_DEVIATION</h4>
                                                        <span className="text-[8px] font-black text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded">
                                                            {anomaly.severity}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-300 leading-snug italic line-clamp-2">"{anomaly.message}"</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 opacity-40">
                                        <ShieldCheckIcon className="h-10 w-10 text-cyber-green mb-2" />
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Stability_Maintained</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- CLINICAL BASELINE SUMMARY --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            {/* Conditions Summary */}
                            <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-5 hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('conditions')}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[9px] font-black text-purple-400 uppercase tracking-[0.3em]">CHRONIC_CONDITIONS</h3>
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-[8px] font-black text-purple-400 border border-purple-500/20">
                                        {clinicalProfile?.chronicConditions?.length || 0} ACTIVE
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {clinicalProfile?.chronicConditions?.slice(0, 3).map((cond, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-purple-500" />
                                            <p className="text-[11px] text-gray-300 font-bold uppercase truncate">{cond.condition}</p>
                                        </div>
                                    )) || <p className="text-[10px] text-gray-600 italic uppercase">No chronic data</p>}
                                    {clinicalProfile?.chronicConditions?.length > 3 && (
                                        <p className="text-[9px] text-purple-400 font-black uppercase mt-1">+{clinicalProfile.chronicConditions.length - 3} MORE</p>
                                    )}
                                </div>
                            </div>

                            {/* Medications Summary */}
                            <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-5 hover:border-cyber-blue/30 transition-all cursor-pointer" onClick={() => setActiveTab('medications')}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[9px] font-black text-cyber-blue uppercase tracking-[0.3em]">ACTIVE_PRESCRIPTIONS</h3>
                                    <span className="px-1.5 py-0.5 rounded bg-cyber-blue/10 text-[8px] font-black text-cyber-blue border border-cyber-blue/20">
                                        {clinicalProfile?.currentMedications?.length || 0} MEDS
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {clinicalProfile?.currentMedications?.slice(0, 3).map((med, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-cyber-blue" />
                                            <p className="text-[11px] text-gray-300 font-bold uppercase truncate">{med.medication}</p>
                                        </div>
                                    )) || <p className="text-[10px] text-gray-600 italic uppercase">No active meds</p>}
                                    {clinicalProfile?.currentMedications?.length > 3 && (
                                        <p className="text-[9px] text-cyber-blue font-black uppercase mt-1">+{clinicalProfile.currentMedications.length - 3} MORE</p>
                                    )}
                                </div>
                            </div>

                            {/* Allergies Summary */}
                            <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-5 hover:border-red-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('allergies')}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[9px] font-black text-red-400 uppercase tracking-[0.3em]">ALLERGY_PROFILE</h3>
                                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-[8px] font-black text-red-400 border border-red-500/20">
                                        {clinicalProfile?.allergies?.length || 0} ALERTS
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {clinicalProfile?.allergies?.slice(0, 3).map((alg, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                            <p className="text-[11px] text-red-400 font-black uppercase truncate">{alg.allergen}</p>
                                        </div>
                                    )) || <p className="text-[10px] text-gray-600 italic uppercase">No allergies known</p>}
                                    {clinicalProfile?.allergies?.length > 3 && (
                                        <p className="text-[9px] text-red-500 font-black uppercase mt-1">+{clinicalProfile.allergies.length - 3} MORE</p>
                                    )}
                                </div>
                            </div>

                            {/* Special Needs Summary */}
                            <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-5 hover:border-amber-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('special')}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.3em]">SPECIAL_NEEDS</h3>
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[8px] font-black text-amber-400 border border-amber-500/20">
                                        {clinicalProfile?.specialNeeds?.length || 0} ACTIVE
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {clinicalProfile?.specialNeeds?.slice(0, 3).map((need, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                                            <p className="text-[11px] text-amber-400 font-black uppercase truncate">{need}</p>
                                        </div>
                                    )) || <p className="text-[10px] text-gray-600 italic uppercase">No special needs</p>}
                                    {clinicalProfile?.specialNeeds?.length > 3 && (
                                        <p className="text-[9px] text-amber-500 font-black uppercase mt-1">+{clinicalProfile.specialNeeds.length - 3} MORE</p>
                                    )}
                                </div>
                            </div>

                            {/* Hereditary Summary */}
                            <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-5 hover:border-cyber-green/30 transition-all cursor-pointer" onClick={() => setActiveTab('family')}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[9px] font-black text-cyber-green uppercase tracking-[0.3em]">HEREDITARY_CONTEXT</h3>
                                    <span className="px-1.5 py-0.5 rounded bg-cyber-green/10 text-[8px] font-black text-cyber-green border border-cyber-green/20">
                                        {hereditaryHistory.length} HITS
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {hereditaryHistory.slice(0, 3).map((cond, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-cyber-green shadow-[0_0_5px_rgba(57,255,20,0.5)]" />
                                            <p className="text-[11px] text-cyber-green font-black uppercase truncate">{cond}</p>
                                        </div>
                                    )) || <p className="text-[10px] text-gray-600 italic uppercase">No hereditary history</p>}
                                    {hereditaryHistory.length > 3 && (
                                        <p className="text-[9px] text-cyber-green font-black uppercase mt-1">+{hereditaryHistory.length - 3} MORE</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 4. AI PREDICTOR HUB (Strategic Decision Support) */}
                        <div className="rounded-2xl bg-brand-dark-900 border border-purple-500/20 p-6 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center">
                                    <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
                                    AI_DIAGNOSTIC_PREDICTOR
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-[8px] font-black text-purple-400 border border-purple-500/20 uppercase">
                                        Clinical_Decision_Support
                                    </span>
                                </div>
                            </div>

                            {loadingPredictions ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                                    <span className="ml-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Running Neural Analysis...</span>
                                </div>
                            ) : aiPredictions ? (
                                <div className="space-y-6">
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-[9px] text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                        <span>Results based on Patient Profile ({patient.province}) + Current Symptoms</span>
                                        <span className="text-purple-400 font-black">AI Model v5.0 — EDLIZ Pre-trained</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {aiPredictions.predictions?.slice(0, 3).map((pred, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-brand-dark-800 border border-white/5 hover:border-purple-500/30 transition-all group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="text-white font-bold text-sm uppercase tracking-tight">{pred.disease}</h4>
                                                    <span className={`text-lg font-black ${pred.confidence > 70 ? 'text-green-400' : pred.confidence > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                        {pred.confidence}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-black/40 rounded-full h-1 mb-3 overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ${pred.confidence > 70 ? 'bg-green-500' : pred.confidence > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${pred.confidence}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-500 italic line-clamp-2">
                                                    {pred.reasons?.[0] || 'Statistical correlation identified from clinical dataset.'}
                                                </p>

                                                {/* Outbreak Status */}
                                                {pred.outbreakStatus && (
                                                    <div className="mt-3 pt-3 border-t border-white/5">
                                                        <p className="text-[9px] font-bold text-orange-400">⚠️ {pred.outbreakStatus}</p>
                                                    </div>
                                                )}

                                                {/* EDLIZ Treatment — compact */}
                                                {pred.dataSource?.edlizTreatment && (
                                                    <div className="mt-2 pt-2 border-t border-white/5">
                                                        <p className="text-[9px] font-bold text-cyan-400 mb-1">💊 EDLIZ First-line:</p>
                                                        <p className="text-[9px] text-gray-400">{pred.dataSource.edlizTreatment}</p>
                                                    </div>
                                                )}

                                                {/* Full treatment lines (expandable) */}
                                                {pred.treatmentRecommendations?.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-white/5">
                                                        <p className="text-[9px] font-bold text-cyan-400 mb-1">Treatment Protocol:</p>
                                                        <div className="max-h-28 overflow-y-auto space-y-0.5">
                                                            {pred.treatmentRecommendations.slice(0, 8).map((line, li) => (
                                                                <p key={li} className={`text-[9px] leading-relaxed ${
                                                                    line.startsWith('💊') ? 'text-cyan-300 font-semibold' :
                                                                    line.startsWith('  •') ? 'text-gray-400 ml-2' : 'text-gray-500'
                                                                }`}>{line}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Prevention lines */}
                                                {pred.preventiveRecommendations?.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-white/5">
                                                        <p className="text-[9px] font-bold text-green-400 mb-1">Prevention:</p>
                                                        <div className="max-h-24 overflow-y-auto space-y-0.5">
                                                            {pred.preventiveRecommendations.slice(0, 6).map((line, li) => (
                                                                <p key={li} className={`text-[9px] leading-relaxed ${
                                                                    line.startsWith('🛡️') ? 'text-green-300 font-semibold' :
                                                                    line.startsWith('  •') ? 'text-gray-400 ml-2' : 'text-gray-500'
                                                                }`}>{line}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )) || (
                                            <div className="col-span-full py-4 text-center text-gray-500 text-[10px] uppercase">
                                                No direct pathology matches identified.
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-[8px] text-yellow-500/70 uppercase tracking-[0.1em] font-medium">
                                        Disclaimer: This is a decision support tool based on historical patterns. Final clinical judgment rests with the attending medical officer.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-gray-700" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        No recent symptoms recorded to run AI prediction
                                    </p>
                                    <p className="text-[8px] text-gray-700 uppercase mt-1 tracking-widest">
                                        Please update the current record with patient symptoms to activate decision support
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 4. Longitudinal Vitals Trend (The Context) */}
                        <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6 shadow-sm">
                            <VitalsTrend 
                                vitalsHistory={records.filter(r => r.vitalSigns)} 
                                patientName={`${patient.firstName} ${patient.lastName}`}
                                onRefresh={fetchData}
                            />
                        </div>

                        {/* --- OPERATIONAL STACK (The Tools) --- */}
                        <div className="pt-6 border-t border-white/5">
                            <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] mb-8 flex items-center">
                                <div className="h-px w-6 bg-gray-800 mr-3" />
                                Operational_Management
                                <div className="h-px flex-1 bg-gray-800 ml-3" />
                            </h2>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    {/* 4. Handover & Referral Hub */}
                                    <div className="rounded-2xl bg-brand-dark-900 border-l-2 border-l-cyber-blue border border-white/5 p-6">
                                        <h3 className="text-[9px] font-black text-cyber-blue uppercase tracking-[0.3em] flex items-center mb-6">
                                            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 mr-2" />
                                            Continuity_Hub
                                        </h3>
                                        <HandoverWidget patientId={id} />
                                    </div>

                                    {/* 5. Fluid Balance Engine (Only if Active) */}
                                    {activeRecord && (
                                        <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                                            <h3 className="text-[9px] font-black text-cyber-purple uppercase tracking-[0.3em] mb-6 flex items-center">
                                                <BeakerIcon className="h-3.5 w-3.5 mr-2" />
                                                Hydration_Telemetry
                                            </h3>
                                            <FluidBalanceWidget 
                                                patientId={id} 
                                                activeRecord={activeRecord} 
                                                onUpdate={handleFluidUpdate} 
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Recent Timeline */}
                                <div className="space-y-4">
                                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center">
                                        <ClockIcon className="h-3.5 w-3.5 mr-2" />
                                        TEMPORAL_LOG
                                    </h3>
                                    <div className="space-y-3">
                                        {records.slice(0, 4).map((record, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                                <div className="flex gap-3 items-center">
                                                    <div className="p-2 rounded-lg bg-brand-dark-800 border border-white/5 text-gray-500 group-hover:text-white transition-colors">
                                                        <DocumentTextIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-sm">{record.disease}</h4>
                                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">{formatDate(record.visitDate)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Anomaly Detection Tab */}
                {activeTab === 'anomaly' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                            <h2 className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] mb-6">
                                PHYSIOLOGICAL_ANOMALY_LOG
                            </h2>
                            
                            {loadingAnomalies ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 bg-white/5 rounded-xl" />
                                    ))}
                                </div>
                            ) : anomalies.length > 0 ? (
                                <div className="space-y-4">
                                    {anomalies.map((anomaly, idx) => (
                                        <div key={idx} className="p-5 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start gap-4">
                                            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500">
                                                <ExclamationTriangleIcon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-white font-bold text-base">{anomaly.vital} Anomaly Detected</h4>
                                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-400/10 px-2 py-0.5 rounded">
                                                        {anomaly.severity} SEVERITY
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-400 mb-3">{anomaly.message}</p>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                        Observed Value: <span className="text-white">{anomaly.value}</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                        Expected Range: <span className="text-white">{anomaly.range}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                                    <ShieldCheckIcon className="h-10 w-10 text-cyber-green mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No physiological anomalies detected in the current stream</p>
                                    <p className="text-[8px] text-gray-700 uppercase mt-1 tracking-widest">Scanning against neural health baseline v4.2</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Conditions Tab */}
                {activeTab === 'conditions' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">
                                CHRONIC_PATHOLOGY_LOG
                            </h2>
                            {canEdit && (
                                <button 
                                    onClick={() => handleAdd('condition')}
                                    className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clinicalProfile?.chronicConditions?.map((cond, i) => (
                                <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all">
                                    <h4 className="text-white font-bold text-base mb-1">{cond.condition}</h4>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Diagnosed: {formatDate(cond.diagnosisDate)}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="px-2 py-1 rounded-md bg-green-500/10 text-[8px] font-black text-green-500 uppercase border border-green-500/20">{cond.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vitals Tab (Restored with Charts and History List) */}
                {activeTab === 'vitals' && (
                    <div className="space-y-8">
                        {/* Vitals Charts Section */}
                        <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                            <VitalsTrend 
                                vitalsHistory={records.filter(r => r.vitalSigns)} 
                                patientName={`${patient.firstName} ${patient.lastName}`}
                                onRefresh={fetchData}
                            />
                        </div>

                        {/* Detailed History Table */}
                        <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                            <h2 className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] mb-6">
                                PHYSIOLOGICAL_STABILITY_TIMELINE
                            </h2>
                            <div className="space-y-3">
                                {records.filter(r => r.vitalSigns).map((record, idx) => (
                                    <div key={idx} className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-cyber-blue/30 transition-all">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-brand-dark-800 text-cyber-blue">
                                                    <ClockIcon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-xs">{formatDate(record.visitDate)}</p>
                                                    <p className="text-[8px] font-mono text-gray-500">REF: {record.visitNumber}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-lg bg-brand-dark-800 border border-white/5 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                                {record.hospital}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {[
                                                { l: 'TEMP', v: `${record.vitalSigns.temperature}°C`, c: record.vitalSigns.temperature > 37.5 ? 'text-red-400' : 'text-white' },
                                                { l: 'BP', v: `${record.vitalSigns.bloodPressure?.systolic || '—'}/${record.vitalSigns.bloodPressure?.diastolic || '—'}`, c: 'text-white' },
                                                { l: 'HEART RATE', v: `${record.vitalSigns.heartRate} BPM`, c: 'text-cyber-blue' },
                                                { l: 'SPO2', v: `${record.vitalSigns.oxygenSaturation}%`, c: record.vitalSigns.oxygenSaturation < 94 ? 'text-orange-400' : 'text-white' },
                                                { l: 'RESP', v: `${record.vitalSigns.respiratoryRate}/MIN`, c: 'text-white' }
                                            ].map((m, i) => (
                                                <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{m.l}</p>
                                                    <p className={`text-base font-black ${m.c}`}>{m.v}</p>
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
                    <div className="space-y-6">
                        <div className="rounded-2xl bg-brand-dark-900 border border-cyber-blue/20 p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ShieldCheckIcon className="h-20 w-20 text-cyber-blue" />
                            </div>
                            <h3 className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] mb-6 flex items-center">
                                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                                AI_DRIVEN_CLINICAL_RISK_PROFILING
                            </h3>
                            
                            {loadingRisk ? (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-24 h-24 bg-white/5 rounded-full" />
                                    <div className="flex-1 space-y-3">
                                        <div className="h-6 bg-white/5 rounded w-1/4" />
                                        <div className="h-4 bg-white/5 rounded w-3/4" />
                                    </div>
                                </div>
                            ) : clinicalRisk ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="text-center lg:text-left lg:border-r border-white/5 lg:pr-8">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">AGGREGATED RISK SCORE</p>
                                        <p className="text-6xl font-black text-white">{clinicalRisk.riskScore}</p>
                                        <div className={`mt-4 inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                                            clinicalRisk.riskLevel === 'CRITICAL' ? 'bg-red-500 text-white' :
                                            clinicalRisk.riskLevel === 'HIGH' ? 'bg-orange-500 text-white' :
                                            clinicalRisk.riskLevel === 'MODERATE' ? 'bg-yellow-500 text-slate-900' :
                                            'bg-cyber-green text-white'
                                        }`}>
                                            {clinicalRisk.riskLevel} CLINICAL POTENTIAL
                                        </div>
                                    </div>
                                    <div className="lg:col-span-2 space-y-3">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">NEURAL_CLINICAL_INSIGHTS</p>
                                        {clinicalRisk.insights.map((insight, idx) => (
                                            <div key={idx} className="flex gap-3 items-start p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyber-blue flex-shrink-0 shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
                                                <p className="text-xs text-gray-300 leading-relaxed font-medium italic">"{insight}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 italic">Assessment engine awaiting clinical data stream...</p>
                            )}
                        </div>

                        {/* Static Lifestyle Factors */}
                        <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">
                                LIFESTYLE_RISK_FACTORS (DATA_INPUTS)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {clinicalProfile?.riskFactors?.map((risk, i) => (
                                    <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/5">
                                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">{risk.factor}</p>
                                        <p className="text-base font-bold text-white">{risk.severity}</p>
                                        <p className="text-[10px] text-gray-500 mt-2">{risk.notes || 'No active clinical observations.'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Medications Tab */}
                {activeTab === 'medications' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em]">Active Prescriptions</h2>
                            {canEdit && (
                                <button 
                                    onClick={() => handleAdd('medication')}
                                    className="p-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clinicalProfile?.currentMedications?.length > 0 ? clinicalProfile.currentMedications.map((med, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-white font-bold">{med.medication}</h4>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{med.dosage} · {med.frequency}</p>
                                    </div>
                                    <span className="text-[9px] font-black text-cyber-green bg-cyber-green/10 px-2 py-0.5 rounded border border-cyber-green/20">{med.status}</span>
                                </div>
                            )) : <p className="text-gray-500 text-xs italic p-8 text-center border border-dashed border-white/5 rounded-xl">No active medications documented.</p>}
                        </div>
                    </div>
                )}

                {/* Allergies Tab */}
                {activeTab === 'allergies' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Immunological Hypersensitivity</h2>
                            {canEdit && (
                                <button 
                                    onClick={() => handleAdd('allergy')}
                                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clinicalProfile?.allergies?.length > 0 ? clinicalProfile.allergies.map((alg, i) => (
                                <div key={i} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-white font-bold">{alg.allergen}</h4>
                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                            alg.severity === 'Severe' ? 'bg-red-500 text-white' : 'bg-orange-500/20 text-orange-500'
                                        }`}>{alg.severity}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">"{alg.reaction}"</p>
                                </div>
                            )) : <p className="text-gray-500 text-xs italic p-8 text-center border border-dashed border-white/5 rounded-xl">No allergies recorded.</p>}
                        </div>
                    </div>
                )}

                {/* Surgical History Tab */}
                {activeTab === 'surgical' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Operative Interventions</h2>
                            {canEdit && (
                                <button 
                                    onClick={() => handleAdd('surgical')}
                                    className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {clinicalProfile?.surgicalHistory?.length > 0 ? clinicalProfile.surgicalHistory.map((surg, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4 items-center">
                                    <div className="w-10 h-10 rounded-lg bg-brand-dark-800 flex items-center justify-center text-purple-400">
                                        <ShieldCheckIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-white font-bold">{surg.procedure}</h4>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{formatDate(surg.date)} · Dr. {surg.surgeon || 'Unknown'}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic max-w-xs">{surg.notes}</p>
                                </div>
                            )) : <p className="text-gray-500 text-xs italic p-8 text-center border border-dashed border-white/5 rounded-xl">No surgical history documented.</p>}
                        </div>
                    </div>
                )}

                {/* Family History Tab */}
                {activeTab === 'family' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Hereditary Clinical Context</h2>
                            {canEdit && (
                                <button 
                                    onClick={() => handleAdd('family')}
                                    className="p-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(clinicalProfile?.familyHistory || {}).map(([member, conditions], i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <h4 className="text-[10px] font-black text-cyber-blue uppercase tracking-widest mb-3">{member} Pathologies</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {conditions.length > 0 ? conditions.map((cond, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded bg-brand-dark-800 text-[10px] text-gray-300 border border-white/5">{cond}</span>
                                        )) : <span className="text-[10px] text-gray-600 italic">No significant pathologies reported.</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Immunizations Tab */}
                {activeTab === 'immunizations' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <Immunizations 
                            immunizations={clinicalProfile?.immunizations || []} 
                            canEdit={canEdit}
                            onUpdate={fetchData}
                        />
                    </div>
                )}

                {/* Records Tab */}
                {activeTab === 'records' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Historical Encounter Log</h2>
                        <div className="space-y-2">
                            {records.map((record, i) => (
                                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex justify-between items-center group cursor-pointer" onClick={() => navigate('/records', { state: { searchId: patient.nationalId } })}>
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] font-mono text-gray-600">{new Date(record.visitDate).toLocaleDateString()}</div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{record.disease}</h4>
                                            <p className="text-[9px] text-gray-500 uppercase tracking-widest">{record.hospital}</p>
                                        </div>
                                    </div>
                                    <ChevronRightIcon className="h-4 w-4 text-gray-700 group-hover:text-white transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pregnancy Tab */}
                {activeTab === 'pregnancy' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <PregnancyInfo 
                            pregnancyInfo={clinicalProfile?.pregnancyInfo} 
                            canEdit={canEdit}
                            onUpdate={handleProfileUpdate} 
                        />
                    </div>
                )}

                {/* Pediatric Tab */}
                {activeTab === 'pediatric' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <PediatricInfo 
                            pediatricInfo={clinicalProfile?.pediatricInfo} 
                            canEdit={canEdit}
                            onUpdate={handleProfileUpdate} 
                        />
                    </div>
                )}

                {/* Special Needs Tab */}
                {activeTab === 'special' && (
                    <div className="rounded-2xl bg-brand-dark-900 border border-white/5 p-6">
                        <SpecialNeeds 
                            specialNeeds={clinicalProfile?.specialNeeds} 
                            canEdit={canEdit}
                            onUpdate={handleProfileUpdate} 
                        />
                    </div>
                )}
            </div>

            {/* Add Record Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="relative w-full max-w-lg bg-brand-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-brand-dark-800/50">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Add {modalType}</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Clinical Record Integration</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {modalType === 'condition' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Condition Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 transition-all outline-none"
                                            placeholder="e.g. Hypertension"
                                            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Diagnosis Date</label>
                                            <input 
                                                type="date" 
                                                required
                                                className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 transition-all outline-none"
                                                onChange={(e) => setFormData({ ...formData, diagnosisDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Status</label>
                                            <select 
                                                className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 transition-all outline-none"
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Stable">Stable</option>
                                                <option value="In Remission">In Remission</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            {modalType === 'medication' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Medication Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyber-blue/50 transition-all outline-none"
                                            placeholder="e.g. Amlodipine"
                                            onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Dosage</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 5mg"
                                                className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyber-blue/50 transition-all outline-none"
                                                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Frequency</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Once daily"
                                                className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyber-blue/50 transition-all outline-none"
                                                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {modalType === 'allergy' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Allergen</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500/50 transition-all outline-none"
                                            placeholder="e.g. Penicillin"
                                            onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Reaction</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500/50 transition-all outline-none"
                                            placeholder="e.g. Anaphylaxis"
                                            onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Severity</label>
                                        <select 
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500/50 transition-all outline-none"
                                            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                        >
                                            <option value="Mild">Mild</option>
                                            <option value="Moderate">Moderate</option>
                                            <option value="Severe">Severe</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {modalType === 'surgical' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Procedure</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 transition-all outline-none"
                                            placeholder="e.g. Appendectomy"
                                            onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Date</label>
                                            <input 
                                                type="date" 
                                                required
                                                className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 transition-all outline-none"
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Surgeon</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 transition-all outline-none"
                                                onChange={(e) => setFormData({ ...formData, surgeon: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Notes</label>
                                        <textarea 
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-purple-500/50 transition-all outline-none h-20"
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {modalType === 'family' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Family Member</label>
                                        <select 
                                            required
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyber-blue/50 transition-all outline-none"
                                            onChange={(e) => setFormData({ ...formData, member: e.target.value })}
                                        >
                                            <option value="">Select Member</option>
                                            <option value="mother">Mother</option>
                                            <option value="father">Father</option>
                                            <option value="siblings">Siblings</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Condition/Pathology</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full bg-brand-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyber-blue/50 transition-all outline-none"
                                            placeholder="e.g. Diabetes Type 2"
                                            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Save Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDetailsPage;