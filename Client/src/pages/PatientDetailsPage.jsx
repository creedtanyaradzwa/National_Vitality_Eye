import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getPatient, 
    getPatientRecords, 
    getClinicalProfile,
    updateClinicalProfile,
    addChronicCondition,
    addMedication,
    updateVitalSigns,
    addRiskFactor
} from '../services/api';
import { useAuth } from '../context/useAuth';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    CalendarIcon,
    BeakerIcon,
    PlusIcon,
    XMarkIcon,
    BuildingOfficeIcon,
    PencilIcon,
    ShieldCheckIcon,
    DocumentTextIcon,
    HeartIcon,
    ClipboardDocumentListIcon,
    ArrowLeftIcon,
    SparklesIcon,
    CpuChipIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import PregnancyInfo from '../components/patients/PregnancyInfo';
import PediatricInfo from '../components/patients/PediatricInfo';
import SpecialNeeds from '../components/patients/SpecialNeeds';

const PatientDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('edit:patients');
    
    const [patient, setPatient] = useState(null);
    const [records, setRecords] = useState([]);
    const [clinicalProfile, setClinicalProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [editingField, setEditingField] = useState(null);
    const [formData, setFormData] = useState({});

    const loadPatientData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, recordsRes, clinicalRes] = await Promise.all([
                getPatient(id),
                getPatientRecords(id),
                getClinicalProfile(id)
            ]);
            setPatient(patientRes.data);
            setRecords(recordsRes.data);
            setClinicalProfile(clinicalRes.data || {});
        } catch {
            toast.error('Failed to load patient data');
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadPatientData();
    }, [loadPatientData]);

    // Handler for updating pregnancy info
    const handleUpdatePregnancy = async (data) => {
        try {
            const updatedProfile = { ...clinicalProfile, pregnancyInfo: data };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Pregnancy information updated');
            loadPatientData();
        } catch {
            toast.error('Failed to update pregnancy information');
        }
    };

    // Handler for updating pediatric info
    const handleUpdatePediatric = async (data) => {
        try {
            const updatedProfile = { ...clinicalProfile, pediatricInfo: data };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Pediatric information updated');
            loadPatientData();
        } catch {
            toast.error('Failed to update pediatric information');
        }
    };

    // Handler for updating special needs
    const handleUpdateSpecialNeeds = async (data) => {
        try {
            const updatedProfile = { ...clinicalProfile, specialNeeds: data };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Special needs information updated');
            loadPatientData();
        } catch {
            toast.error('Failed to update special needs information');
        }
    };

    const handleAddChronicCondition = async (data) => {
        try {
            await addChronicCondition(id, data);
            toast.success('Chronic condition added');
            loadPatientData();
            setShowAddModal(false);
        } catch {
            toast.error('Failed to add condition');
        }
    };

    const handleAddMedication = async (data) => {
        try {
            await addMedication(id, data);
            toast.success('Medication added');
            loadPatientData();
            setShowAddModal(false);
        } catch {
            toast.error('Failed to add medication');
        }
    };

    const handleUpdateVitals = async (data) => {
        try {
            await updateVitalSigns(id, data);
            toast.success('Vital signs updated');
            loadPatientData();
            setEditingField(null);
        } catch {
            toast.error('Failed to update vital signs');
        }
    };

    const handleAddRiskFactor = async (data) => {
        try {
            await addRiskFactor(id, data);
            toast.success('Risk factor added');
            loadPatientData();
            setShowAddModal(false);
        } catch {
            toast.error('Failed to add risk factor');
        }
    };

    const handleUpdateBloodType = async (bloodType) => {
        try {
            const updatedProfile = { ...clinicalProfile, bloodType };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Blood type updated');
            loadPatientData();
            setEditingField(null);
        } catch {
            toast.error('Failed to update blood type');
        }
    };

    const handleAddAllergy = async (data) => {
        try {
            const allergies = [...(clinicalProfile?.allergies || []), data];
            const updatedProfile = { ...clinicalProfile, allergies };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Allergy added');
            loadPatientData();
            setShowAddModal(false);
        } catch {
            toast.error('Failed to add allergy');
        }
    };

    const handleAddSurgery = async (data) => {
        try {
            const surgicalHistory = [...(clinicalProfile?.surgicalHistory || []), data];
            const updatedProfile = { ...clinicalProfile, surgicalHistory };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Surgery added');
            loadPatientData();
            setShowAddModal(false);
        } catch {
            toast.error('Failed to add surgery');
        }
    };

    const handleAddFamilyHistory = async (data) => {
        try {
            const currentFamilyHistory = clinicalProfile?.familyHistory || { mother: [], father: [], siblings: [], notes: '' };
            
            if (data.member === 'mother') {
                const motherConditions = currentFamilyHistory.mother || [];
                if (data.condition && !motherConditions.includes(data.condition)) {
                    currentFamilyHistory.mother = [...motherConditions, data.condition];
                }
            } else if (data.member === 'father') {
                const fatherConditions = currentFamilyHistory.father || [];
                if (data.condition && !fatherConditions.includes(data.condition)) {
                    currentFamilyHistory.father = [...fatherConditions, data.condition];
                }
            } else if (data.member === 'siblings') {
                const siblingConditions = currentFamilyHistory.siblings || [];
                if (data.condition && !siblingConditions.includes(data.condition)) {
                    currentFamilyHistory.siblings = [...siblingConditions, data.condition];
                }
            }
            
            if (data.notes) {
                currentFamilyHistory.notes = data.notes;
            }
            
            const updatedProfile = { ...clinicalProfile, familyHistory: currentFamilyHistory };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Family history updated');
            loadPatientData();
            setShowAddModal(false);
        } catch {
            toast.error('Failed to update family history');
        }
    };

    const handleAddImmunization = async (data) => {
        try {
            const immunizations = [...(clinicalProfile?.immunizations || []), data];
            const updatedProfile = { ...clinicalProfile, immunizations };
            await updateClinicalProfile(id, updatedProfile);
            toast.success('Immunization added');
            loadPatientData();
            setShowAddModal(false);
        } catch {
            toast.error('Failed to add immunization');
        }
    };

    const getAge = (dateOfBirth) => {
        if (!dateOfBirth) return 'N/A';
        const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
        return `${age} years`;
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString();
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: UserIcon },
        { id: 'conditions', label: 'Conditions', icon: BeakerIcon },
        { id: 'medications', label: 'Medications', icon: ClipboardDocumentListIcon },
        { id: 'allergies', label: 'Allergies', icon: ShieldCheckIcon },
        { id: 'surgical', label: 'Surgical', icon: DocumentTextIcon },
        { id: 'family', label: 'Family', icon: HeartIcon },
        { id: 'immunizations', label: 'Immunizations', icon: SparklesIcon },
        { id: 'vitals', label: 'Vitals', icon: HeartIcon },
        { id: 'records', label: 'Records', icon: DocumentTextIcon },
        { id: 'risk', label: 'Risk', icon: ExclamationTriangleIcon },
        { id: 'pregnancy', label: 'Pregnancy', icon: HeartIcon },
        { id: 'pediatric', label: 'Pediatric', icon: UserIcon },
        { id: 'special-needs', label: 'Special Needs', icon: ShieldCheckIcon }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Patient not found</p>
            </div>
        );
    }

    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Back Button */}
            <button
                onClick={() => navigate('/patients')}
                className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-white transition-all duration-300 group"
            >
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
                <span>Back to Patients</span>
            </button>

            {/* Header with Patient Info */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-5">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <UserIcon className="h-10 w-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    {patient.firstName} {patient.lastName}
                                </h1>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center space-x-2 text-gray-300">
                                        <span className="text-purple-400">National ID:</span>
                                        <span>{patient.nationalId}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-gray-300">
                                        <CalendarIcon className="h-4 w-4 text-purple-400" />
                                        <span>{formatDate(patient.dateOfBirth)} ({getAge(patient.dateOfBirth)})</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-gray-300">
                                        <span className="text-purple-400">Gender:</span>
                                        <span>{patient.gender}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-gray-300">
                                        <MapPinIcon className="h-4 w-4 text-purple-400" />
                                        <span>{patient.province}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Information Card */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-8">
                <h3 className="font-semibold text-white mb-4 flex items-center">
                    <EnvelopeIcon className="h-5 w-5 mr-2 text-purple-400" />
                    Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {patient.contactInfo?.phone && (
                        <div className="flex items-center text-sm text-gray-300">
                            <PhoneIcon className="h-4 w-4 text-purple-400 mr-2" />
                            <span>{patient.contactInfo.phone}</span>
                        </div>
                    )}
                    {patient.contactInfo?.email && (
                        <div className="flex items-center text-sm text-gray-300">
                            <EnvelopeIcon className="h-4 w-4 text-purple-400 mr-2" />
                            <span>{patient.contactInfo.email}</span>
                        </div>
                    )}
                    {patient.contactInfo?.address && (
                        <div className="flex items-center text-sm text-gray-300">
                            <MapPinIcon className="h-4 w-4 text-purple-400 mr-2" />
                            <span>{patient.contactInfo.address}</span>
                        </div>
                    )}
                    {patient.contactInfo?.emergencyContact?.name && (
                        <div className="flex items-center text-sm text-gray-300">
                            <ShieldCheckIcon className="h-4 w-4 text-purple-400 mr-2" />
                            <span>Emergency: {patient.contactInfo.emergencyContact.name} ({patient.contactInfo.emergencyContact.phone})</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Blood Type Section */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <BeakerIcon className="h-5 w-5 mr-2 text-purple-400" />
                                Blood Type
                            </h2>
                            {canEdit && (
                                <button
                                    onClick={() => setEditingField('bloodType')}
                                    className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-all duration-300"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-center p-6">
                            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50">
                                <p className="text-4xl font-bold text-purple-400">
                                    {clinicalProfile?.bloodType || 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Summary Stats */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <CpuChipIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Clinical Summary
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="rounded-xl bg-white/5 p-4 text-center">
                                <p className="text-sm text-gray-400">Chronic Conditions</p>
                                <p className="text-2xl font-bold text-white">
                                    {clinicalProfile?.chronicConditions?.length || 0}
                                </p>
                            </div>
                            <div className="rounded-xl bg-white/5 p-4 text-center">
                                <p className="text-sm text-gray-400">Allergies</p>
                                <p className="text-2xl font-bold text-white">
                                    {clinicalProfile?.allergies?.length || 0}
                                </p>
                            </div>
                            <div className="rounded-xl bg-white/5 p-4 text-center">
                                <p className="text-sm text-gray-400">Current Medications</p>
                                <p className="text-2xl font-bold text-white">
                                    {clinicalProfile?.currentMedications?.filter(m => m.active !== false).length || 0}
                                </p>
                            </div>
                            <div className="rounded-xl bg-white/5 p-4 text-center">
                                <p className="text-sm text-gray-400">Surgeries</p>
                                <p className="text-2xl font-bold text-white">
                                    {clinicalProfile?.surgicalHistory?.length || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Medical Records */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Recent Medical Visits</h2>
                        {records.slice(0, 5).length === 0 ? (
                            <p className="text-gray-400">No medical records found</p>
                        ) : (
                            <div className="space-y-3">
                                {records.slice(0, 5).map((record) => (
                                    <div key={record._id} className="rounded-xl bg-white/5 p-4 hover:bg-white/10 transition-all duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-white">{record.disease || record.primaryDiagnosis?.name}</p>
                                                <p className="text-sm text-gray-400">{record.hospital}</p>
                                                <p className="text-xs text-gray-500">{formatDate(record.visitDate)}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                                record.disposition === 'Discharged' ? 'bg-green-500/20 text-green-400' :
                                                record.disposition === 'Admitted' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {record.disposition}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Pregnancy Tab */}
            {activeTab === 'pregnancy' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <PregnancyInfo 
                        pregnancyInfo={clinicalProfile?.pregnancyInfo} 
                        onUpdate={handleUpdatePregnancy}
                        canEdit={canEdit}
                    />
                </div>
            )}

            {/* Pediatric Tab */}
            {activeTab === 'pediatric' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <PediatricInfo 
                        pediatricInfo={clinicalProfile?.pediatricInfo} 
                        onUpdate={handleUpdatePediatric}
                        canEdit={canEdit}
                    />
                </div>
            )}

            {/* Special Needs Tab */}
            {activeTab === 'special-needs' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <SpecialNeeds 
                        specialNeeds={clinicalProfile?.specialNeeds} 
                        onUpdate={handleUpdateSpecialNeeds}
                        canEdit={canEdit}
                    />
                </div>
            )}

            {/* Allergies Tab */}
            {activeTab === 'allergies' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <ShieldCheckIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Allergies
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setModalType('allergy');
                                    setFormData({ allergen: '', reaction: '', severity: 'Moderate' });
                                    setShowAddModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-1"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Allergy</span>
                            </button>
                        )}
                    </div>
                    {clinicalProfile?.allergies?.length === 0 ? (
                        <p className="text-gray-400">No allergies recorded</p>
                    ) : (
                        <div className="space-y-3">
                            {clinicalProfile?.allergies?.map((allergy, idx) => (
                                <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-white">{allergy.allergen}</h3>
                                            <p className="text-sm text-gray-400">Reaction: {allergy.reaction || 'Not specified'}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                            allergy.severity === 'Severe' || allergy.severity === 'Life-Threatening' ? 'bg-red-500/20 text-red-400' :
                                            allergy.severity === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`}>
                                            {allergy.severity || 'Moderate'}
                                        </span>
                                    </div>
                                    {allergy.notes && <p className="text-sm text-gray-400 mt-2">{allergy.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Surgical History Tab */}
            {activeTab === 'surgical' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Surgical History
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setModalType('surgery');
                                    setFormData({ procedure: '', date: '', hospital: '', surgeon: '', notes: '' });
                                    setShowAddModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-1"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Surgery</span>
                            </button>
                        )}
                    </div>
                    {clinicalProfile?.surgicalHistory?.length === 0 ? (
                        <p className="text-gray-400">No surgical history recorded</p>
                    ) : (
                        <div className="space-y-3">
                            {clinicalProfile?.surgicalHistory?.map((surgery, idx) => (
                                <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                    <h3 className="font-semibold text-white">{surgery.procedure}</h3>
                                    <p className="text-sm text-gray-400">Date: {formatDate(surgery.date)}</p>
                                    {surgery.hospital && <p className="text-sm text-gray-400">Hospital: {surgery.hospital}</p>}
                                    {surgery.surgeon && <p className="text-sm text-gray-400">Surgeon: {surgery.surgeon}</p>}
                                    {surgery.notes && <p className="text-sm text-gray-400 mt-2">{surgery.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Family History Tab */}
            {activeTab === 'family' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <HeartIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Family Medical History
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setModalType('family');
                                    setFormData({ member: '', condition: '', notes: '' });
                                    setShowAddModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-1"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Family History</span>
                            </button>
                        )}
                    </div>
                    
                    {clinicalProfile?.familyHistory && (clinicalProfile.familyHistory.mother?.length > 0 || clinicalProfile.familyHistory.father?.length > 0 || clinicalProfile.familyHistory.siblings?.length > 0) ? (
                        <div className="space-y-4">
                            {clinicalProfile.familyHistory.mother?.length > 0 && (
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <h3 className="font-semibold text-purple-400 mb-2">Mother</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {clinicalProfile.familyHistory.mother.map((condition, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-sm">{condition}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {clinicalProfile.familyHistory.father?.length > 0 && (
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <h3 className="font-semibold text-purple-400 mb-2">Father</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {clinicalProfile.familyHistory.father.map((condition, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-sm">{condition}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {clinicalProfile.familyHistory.siblings?.length > 0 && (
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <h3 className="font-semibold text-purple-400 mb-2">Siblings</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {clinicalProfile.familyHistory.siblings.map((condition, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-sm">{condition}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {clinicalProfile.familyHistory.notes && (
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <h3 className="font-semibold text-purple-400 mb-2">Additional Notes</h3>
                                    <p className="text-sm text-gray-400">{clinicalProfile.familyHistory.notes}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-400">No family history recorded</p>
                    )}
                </div>
            )}

            {/* Immunizations Tab */}
            {activeTab === 'immunizations' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <SparklesIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Immunizations / Vaccinations
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setModalType('immunization');
                                    setFormData({ vaccine: '', dateGiven: '', nextDueDate: '', administeredBy: '', notes: '' });
                                    setShowAddModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-1"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Immunization</span>
                            </button>
                        )}
                    </div>
                    {clinicalProfile?.immunizations?.length === 0 ? (
                        <p className="text-gray-400">No immunizations recorded</p>
                    ) : (
                        <div className="space-y-3">
                            {clinicalProfile?.immunizations?.map((immunization, idx) => (
                                <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-white">{immunization.vaccine}</h3>
                                            <p className="text-sm text-gray-400">Date Given: {formatDate(immunization.dateGiven)}</p>
                                            {immunization.nextDueDate && (
                                                <p className="text-sm text-yellow-400">Next Due: {formatDate(immunization.nextDueDate)}</p>
                                            )}
                                            {immunization.administeredBy && (
                                                <p className="text-sm text-gray-400">Administered By: {immunization.administeredBy}</p>
                                            )}
                                        </div>
                                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400">
                                            Completed
                                        </span>
                                    </div>
                                    {immunization.notes && <p className="text-sm text-gray-400 mt-2">{immunization.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Conditions Tab */}
            {activeTab === 'conditions' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <BeakerIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Chronic Conditions
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setModalType('condition');
                                    setFormData({ condition: '', status: 'Active', severity: 'Moderate' });
                                    setShowAddModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-1"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Condition</span>
                            </button>
                        )}
                    </div>
                    {clinicalProfile?.chronicConditions?.length === 0 ? (
                        <p className="text-gray-400">No chronic conditions recorded</p>
                    ) : (
                        <div className="space-y-3">
                            {clinicalProfile?.chronicConditions?.map((condition, idx) => (
                                <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-white">{condition.condition}</h3>
                                            <p className="text-sm text-gray-400">Diagnosed: {formatDate(condition.diagnosisDate)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                                condition.status === 'Controlled' ? 'bg-green-500/20 text-green-400' :
                                                condition.status === 'Active' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {condition.status}
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">Severity: {condition.severity}</p>
                                        </div>
                                    </div>
                                    {condition.notes && <p className="text-sm text-gray-400 mt-2">{condition.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Medications Tab */}
            {activeTab === 'medications' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Current Medications
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setModalType('medication');
                                    setFormData({ medication: '', dosage: '', frequency: '', active: true });
                                    setShowAddModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-1"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Medication</span>
                            </button>
                        )}
                    </div>
                    {clinicalProfile?.currentMedications?.filter(m => m.active !== false).length === 0 ? (
                        <p className="text-gray-400">No current medications</p>
                    ) : (
                        <div className="space-y-3">
                            {clinicalProfile?.currentMedications?.filter(m => m.active !== false).map((med, idx) => (
                                <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex justify-between">
                                        <div>
                                            <h3 className="font-semibold text-white">{med.medication}</h3>
                                            <p className="text-sm text-gray-400">{med.dosage} - {med.frequency}</p>
                                            <p className="text-xs text-gray-500">Prescribed: {formatDate(med.prescribedDate)}</p>
                                        </div>
                                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Vital Signs Tab */}
            {activeTab === 'vitals' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <HeartIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Vital Signs
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setEditingField('vitals');
                                    setFormData(clinicalProfile?.vitalSigns || {});
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                            >
                                Update Vitals
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <p className="text-sm text-gray-400">Height</p>
                            <p className="text-xl font-bold text-white">{clinicalProfile?.vitalSigns?.height || '-'} cm</p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <p className="text-sm text-gray-400">Weight</p>
                            <p className="text-xl font-bold text-white">{clinicalProfile?.vitalSigns?.weight || '-'} kg</p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <p className="text-sm text-gray-400">BMI</p>
                            <p className="text-xl font-bold text-white">{clinicalProfile?.vitalSigns?.bmi || '-'}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <p className="text-sm text-gray-400">Blood Pressure</p>
                            <p className="text-xl font-bold text-white">
                                {clinicalProfile?.vitalSigns?.bloodPressure?.systolic || '-'}/{clinicalProfile?.vitalSigns?.bloodPressure?.diastolic || '-'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <p className="text-sm text-gray-400">Heart Rate</p>
                            <p className="text-xl font-bold text-white">{clinicalProfile?.vitalSigns?.heartRate || '-'} bpm</p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <p className="text-sm text-gray-400">Temperature</p>
                            <p className="text-xl font-bold text-white">{clinicalProfile?.vitalSigns?.temperature || '-'} °C</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Records Tab */}
            {activeTab === 'records' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-400" />
                        Medical History
                    </h2>
                    {records.length === 0 ? (
                        <p className="text-gray-400">No medical records found</p>
                    ) : (
                        <div className="space-y-4">
                            {records.map((record) => (
                                <div key={record._id} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all duration-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-white">
                                                {record.disease || record.primaryDiagnosis?.name || 'Unknown Diagnosis'}
                                            </h3>
                                            <p className="text-sm text-gray-400 flex items-center mt-1">
                                                <BuildingOfficeIcon className="h-4 w-4 mr-1 text-purple-400" />
                                                {record.hospital || 'Unknown Hospital'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">{formatDate(record.visitDate)}</p>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                                record.disposition === 'Discharged' ? 'bg-green-500/20 text-green-400' :
                                                record.disposition === 'Admitted' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {record.disposition || 'Discharged'}
                                            </span>
                                        </div>
                                    </div>
                                    {record.symptoms && record.symptoms.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm font-medium text-gray-300">Symptoms:</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {record.symptoms.map((symptom, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-white/10 text-gray-400 text-xs">
                                                        {symptom}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {record.prescribedMedications && record.prescribedMedications.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm font-medium text-gray-300">Prescribed:</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {record.prescribedMedications.map((med, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs">
                                                        {med}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Risk Factors Tab */}
            {activeTab === 'risk' && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Risk Factors
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setModalType('risk');
                                    setFormData({ factor: '', status: 'Current', details: '' });
                                    setShowAddModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-1"
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Risk Factor</span>
                            </button>
                        )}
                    </div>
                    {clinicalProfile?.riskFactors?.length === 0 ? (
                        <p className="text-gray-400">No risk factors recorded</p>
                    ) : (
                        <div className="space-y-3">
                            {clinicalProfile?.riskFactors?.map((risk, idx) => (
                                <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex justify-between">
                                        <div>
                                            <h3 className="font-semibold text-white">{risk.factor}</h3>
                                            <p className="text-sm text-gray-400">{risk.details}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                            risk.status === 'Current' ? 'bg-red-500/20 text-red-400' :
                                            risk.status === 'Former' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`}>
                                            {risk.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add Modals - same as before with modern styling */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-md mx-4">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            <div className="p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white">
                                    {modalType === 'condition' && 'Add Chronic Condition'}
                                    {modalType === 'medication' && 'Add Medication'}
                                    {modalType === 'allergy' && 'Add Allergy'}
                                    {modalType === 'surgery' && 'Add Surgery'}
                                    {modalType === 'family' && 'Add Family History'}
                                    {modalType === 'immunization' && 'Add Immunization'}
                                    {modalType === 'risk' && 'Add Risk Factor'}
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                {modalType === 'condition' && (
                                    <>
                                        <input type="text" placeholder="Condition Name" value={formData.condition || ''} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <select value={formData.status || 'Active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                            <option value="Active">Active</option><option value="Controlled">Controlled</option><option value="Remission">Remission</option>
                                        </select>
                                        <select value={formData.severity || 'Moderate'} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                            <option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option>
                                        </select>
                                        <textarea placeholder="Notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" rows="3" />
                                    </>
                                )}
                                {modalType === 'medication' && (
                                    <>
                                        <input type="text" placeholder="Medication Name" value={formData.medication || ''} onChange={(e) => setFormData({ ...formData, medication: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <input type="text" placeholder="Dosage (e.g., 10mg)" value={formData.dosage || ''} onChange={(e) => setFormData({ ...formData, dosage: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <input type="text" placeholder="Frequency (e.g., Once daily)" value={formData.frequency || ''} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                    </>
                                )}
                                {modalType === 'allergy' && (
                                    <>
                                        <input type="text" placeholder="Allergen (e.g., Penicillin, Peanuts)" value={formData.allergen || ''} onChange={(e) => setFormData({ ...formData, allergen: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <input type="text" placeholder="Reaction (e.g., Rash, Swelling)" value={formData.reaction || ''} onChange={(e) => setFormData({ ...formData, reaction: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <select value={formData.severity || 'Moderate'} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                            <option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option><option value="Life-Threatening">Life-Threatening</option>
                                        </select>
                                        <textarea placeholder="Notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" rows="2" />
                                    </>
                                )}
                                {modalType === 'surgery' && (
                                    <>
                                        <input type="text" placeholder="Procedure Name" value={formData.procedure || ''} onChange={(e) => setFormData({ ...formData, procedure: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <input type="date" placeholder="Date" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                                        <input type="text" placeholder="Hospital" value={formData.hospital || ''} onChange={(e) => setFormData({ ...formData, hospital: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <input type="text" placeholder="Surgeon" value={formData.surgeon || ''} onChange={(e) => setFormData({ ...formData, surgeon: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <textarea placeholder="Notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" rows="2" />
                                    </>
                                )}
                                {modalType === 'family' && (
                                    <>
                                        <select value={formData.member || ''} onChange={(e) => setFormData({ ...formData, member: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                            <option value="">Select Family Member</option><option value="mother">Mother</option><option value="father">Father</option><option value="siblings">Siblings</option>
                                        </select>
                                        <input type="text" placeholder="Condition (e.g., Diabetes, Hypertension)" value={formData.condition || ''} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <textarea placeholder="Additional Notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" rows="2" />
                                    </>
                                )}
                                {modalType === 'immunization' && (
                                    <>
                                        <input type="text" placeholder="Vaccine Name" value={formData.vaccine || ''} onChange={(e) => setFormData({ ...formData, vaccine: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <input type="date" placeholder="Date Given" value={formData.dateGiven || ''} onChange={(e) => setFormData({ ...formData, dateGiven: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                                        <input type="date" placeholder="Next Due Date (Optional)" value={formData.nextDueDate || ''} onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                                        <input type="text" placeholder="Administered By" value={formData.administeredBy || ''} onChange={(e) => setFormData({ ...formData, administeredBy: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <textarea placeholder="Notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" rows="2" />
                                    </>
                                )}
                                {modalType === 'risk' && (
                                    <>
                                        <select value={formData.factor || ''} onChange={(e) => setFormData({ ...formData, factor: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                            <option value="">Select Risk Factor</option><option value="Smoking">Smoking</option><option value="Alcohol Use">Alcohol Use</option><option value="Obesity">Obesity</option><option value="Sedentary Lifestyle">Sedentary Lifestyle</option><option value="Family History">Family History</option>
                                        </select>
                                        <input type="text" placeholder="Details" value={formData.details || ''} onChange={(e) => setFormData({ ...formData, details: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                        <select value={formData.status || 'Current'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                            <option value="Current">Current</option><option value="Former">Former</option><option value="Never">Never</option>
                                        </select>
                                    </>
                                )}
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end space-x-3">
                                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300">Cancel</button>
                                <button onClick={() => {
                                    if (modalType === 'condition') handleAddChronicCondition(formData);
                                    if (modalType === 'medication') handleAddMedication(formData);
                                    if (modalType === 'allergy') handleAddAllergy(formData);
                                    if (modalType === 'surgery') handleAddSurgery(formData);
                                    if (modalType === 'family') handleAddFamilyHistory(formData);
                                    if (modalType === 'immunization') handleAddImmunization(formData);
                                    if (modalType === 'risk') handleAddRiskFactor(formData);
                                }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Blood Type Edit Modal */}
            {editingField === 'bloodType' && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-md mx-4">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            <div className="p-6 border-b border-white/10"><h2 className="text-xl font-bold text-white">Update Blood Type</h2></div>
                            <div className="p-6">
                                <select value={clinicalProfile?.bloodType || 'Unknown'} onChange={(e) => handleUpdateBloodType(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                                    {bloodTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                </select>
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end">
                                <button onClick={() => setEditingField(null)} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Vitals Modal */}
            {editingField === 'vitals' && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-md mx-4">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            <div className="p-6 border-b border-white/10"><h2 className="text-xl font-bold text-white">Update Vital Signs</h2></div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-gray-400 mb-1">Height (cm)</label><input type="number" value={formData.height || ''} onChange={(e) => setFormData({ ...formData, height: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" /></div>
                                    <div><label className="block text-sm text-gray-400 mb-1">Weight (kg)</label><input type="number" value={formData.weight || ''} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-gray-400 mb-1">Systolic BP</label><input type="number" value={formData.bloodPressure?.systolic || ''} onChange={(e) => setFormData({ ...formData, bloodPressure: { ...formData.bloodPressure, systolic: e.target.value } })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" /></div>
                                    <div><label className="block text-sm text-gray-400 mb-1">Diastolic BP</label><input type="number" value={formData.bloodPressure?.diastolic || ''} onChange={(e) => setFormData({ ...formData, bloodPressure: { ...formData.bloodPressure, diastolic: e.target.value } })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-gray-400 mb-1">Heart Rate (bpm)</label><input type="number" value={formData.heartRate || ''} onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" /></div>
                                    <div><label className="block text-sm text-gray-400 mb-1">Temperature (°C)</label><input type="number" step="0.1" value={formData.temperature || ''} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500" /></div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end space-x-3">
                                <button onClick={() => setEditingField(null)} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300">Cancel</button>
                                <button onClick={() => handleUpdateVitals(formData)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDetailsPage;