import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, getPatientRecords, createMedicalRecord, updateMedicalRecord, deleteMedicalRecord, getHospitalStaff } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useDataRefresh } from '../context/useDataRefresh';
import { 
    PlusIcon, 
    MagnifyingGlassIcon, 
    PencilIcon, 
    TrashIcon, 
    DocumentTextIcon,
    CalendarIcon,
    UserIcon,
    BuildingOfficeIcon,
    XMarkIcon,
    HeartIcon,
    BeakerIcon,
    ClipboardDocumentListIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    CameraIcon,
    ArrowPathIcon,
    UserPlusIcon,
    UserMinusIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MapPinIcon,
    ClockIcon,
    IdentificationIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const MedicalRecords = () => {
    const navigate = useNavigate();
    const { hasPermission, user: currentUser } = useAuth();
    const { refreshData } = useDataRefresh();
    const canCreate = hasPermission('create:records');
    const canEdit = hasPermission('edit:records');
    const canDelete = hasPermission('delete:records');
    
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [records, setRecords] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRecord, setExpandedRecord] = useState(null);
    const [uploadingImages, setUploadingImages] = useState(false);
    
    const [formData, setFormData] = useState({
        patientId: '',
        hospital: '',
        doctorName: '',
        visitDate: new Date().toISOString().split('T')[0],
        visitType: 'Outpatient',
        symptoms: [],
        symptomInput: '',
        primaryDiagnosis: '',
        disease: '',
        prescribedMedications: [],
        medicationInput: '',
        treatmentPlan: '',
        disposition: 'Discharged',
        dischargeInstructions: '',
        province: '',
        notes: '',
        taggedUsers: [],
        physicalExam: {
            general: '',
            cardiovascular: '',
            respiratory: '',
            abdominal: '',
            neurological: '',
            musculoskeletal: ''
        },
        differentialDiagnosis: [],
        differentialInput: '',
        labTests: [],
        labTestInput: { testName: '', result: '', referenceRange: '', abnormal: false },
        radiology: [],
        radiologyInput: { 
            studyType: '', 
            bodyPart: '',
            findings: '', 
            impression: '',
            previewImages: []
        },
        vitalSigns: {
            temperature: '',
            bloodPressureSystolic: '',
            bloodPressureDiastolic: '',
            heartRate: '',
            respiratoryRate: '',
            oxygenSaturation: '',
            weight: '',
            height: '',
            bmi: '',
            painScore: ''
        }
    });

    useEffect(() => {
        const loadPatients = async () => {
            try {
                const response = await getPatients();
                setPatients(response.data);
                setLoading(false);
            } catch {
                toast.error('Failed to load patients');
                setLoading(false);
            }
        };
        loadPatients();
    }, []);

    useEffect(() => {
        const loadStaff = async () => {
            try {
                const response = await getHospitalStaff();
                setStaffMembers(response.data);
            } catch (error) {
                console.error("Error loading staff:", error);
            }
        };
        if (currentUser) loadStaff();
    }, [currentUser]);

    useEffect(() => {
        const loadRecords = async () => {
            if (selectedPatient) {
                try {
                    const response = await getPatientRecords(selectedPatient._id);
                    setRecords(response.data);
                } catch {
                    toast.error('Failed to load medical records');
                }
            }
        };
        loadRecords();
    }, [selectedPatient]);

    const handleSearch = () => {
        if (!searchTerm.trim()) {
            setSelectedPatient(null);
            return;
        }
        
        const patient = patients.find(p => 
            p.nationalId === searchTerm || 
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (patient) {
            setSelectedPatient(patient);
        } else {
            toast.info('No patient found');
            setSelectedPatient(null);
        }
    };

    const handleAddRecord = () => {
        if (!selectedPatient) {
            toast.error('Please select a patient first');
            return;
        }
        
        setEditingRecord(null);
        setFormData({
            patientId: selectedPatient._id,
            hospital: currentUser?.hospitalName || '',
            doctorName: `${currentUser?.firstName} ${currentUser?.lastName}`,
            visitDate: new Date().toISOString().split('T')[0],
            visitType: 'Outpatient',
            symptoms: [],
            symptomInput: '',
            primaryDiagnosis: '',
            disease: '',
            prescribedMedications: [],
            medicationInput: '',
            treatmentPlan: '',
            disposition: 'Discharged',
            dischargeInstructions: '',
            province: selectedPatient.province || currentUser?.province || '',
            notes: '',
            taggedUsers: [],
            physicalExam: {
                general: '',
                cardiovascular: '',
                respiratory: '',
                abdominal: '',
                neurological: '',
                musculoskeletal: ''
            },
            differentialDiagnosis: [],
            differentialInput: '',
            labTests: [],
            labTestInput: { testName: '', result: '', referenceRange: '', abnormal: false },
            radiology: [],
            radiologyInput: { 
                studyType: '', 
                bodyPart: '',
                findings: '', 
                impression: '',
                previewImages: []
            },
            vitalSigns: {
                temperature: '',
                bloodPressureSystolic: '',
                bloodPressureDiastolic: '',
                heartRate: '',
                respiratoryRate: '',
                oxygenSaturation: '',
                weight: '',
                height: '',
                bmi: '',
                painScore: ''
            }
        });
        setShowModal(true);
    };

    const handleEditRecord = (record) => {
        setEditingRecord(record);
        setFormData({
            patientId: record.patientId._id || record.patientId,
            hospital: record.hospital || '',
            doctorName: record.doctorName || '',
            visitDate: record.visitDate ? record.visitDate.split('T')[0] : new Date().toISOString().split('T')[0],
            visitType: record.visitType || 'Outpatient',
            symptoms: record.symptoms || [],
            symptomInput: '',
            primaryDiagnosis: record.primaryDiagnosis?.name || record.disease || '',
            disease: record.disease || '',
            prescribedMedications: record.prescribedMedications || [],
            medicationInput: '',
            treatmentPlan: record.treatmentPlan?.plan || '',
            disposition: record.disposition || 'Discharged',
            dischargeInstructions: record.dischargeInstructions || '',
            province: record.province || selectedPatient?.province || '',
            notes: record.notes || '',
            taggedUsers: record.taggedUsers?.map(u => u._id || u) || [],
            physicalExam: record.physicalExam || {
                general: '',
                cardiovascular: '',
                respiratory: '',
                abdominal: '',
                neurological: '',
                musculoskeletal: ''
            },
            differentialDiagnosis: record.differentialDiagnosis || [],
            differentialInput: '',
            labTests: record.investigations?.labTests || [],
            labTestInput: { testName: '', result: '', referenceRange: '', abnormal: false },
            radiology: record.investigations?.radiology || [],
            radiologyInput: { 
                studyType: '', 
                bodyPart: '',
                findings: '', 
                impression: '',
                previewImages: []
            },
            vitalSigns: {
                temperature: record.vitalSigns?.temperature || '',
                bloodPressureSystolic: record.vitalSigns?.bloodPressure?.systolic || '',
                bloodPressureDiastolic: record.vitalSigns?.bloodPressure?.diastolic || '',
                heartRate: record.vitalSigns?.heartRate || '',
                respiratoryRate: record.vitalSigns?.respiratoryRate || '',
                oxygenSaturation: record.vitalSigns?.oxygenSaturation || '',
                weight: record.vitalSigns?.weight || '',
                height: record.vitalSigns?.height || '',
                bmi: record.vitalSigns?.bmi || '',
                painScore: record.vitalSigns?.painScore || ''
            }
        });
        setShowModal(true);
    };

    const handleDeleteRecord = async (record) => {
        if (window.confirm('Are you sure you want to delete this medical record?')) {
            try {
                await deleteMedicalRecord(record._id);
                toast.success('Record deleted successfully');
                refreshData();
                const response = await getPatientRecords(selectedPatient._id);
                setRecords(response.data);
            } catch {
                toast.error('Failed to delete record');
            }
        }
    };

    const toggleTaggedUser = (userId) => {
        setFormData(prev => {
            const isTagged = prev.taggedUsers.includes(userId);
            return {
                ...prev,
                taggedUsers: isTagged 
                    ? prev.taggedUsers.filter(id => id !== userId)
                    : [...prev.taggedUsers, userId]
            };
        });
    };

    const handleVitalChange = (field, value) => {
        const newVitals = { ...formData.vitalSigns, [field]: value };
        
        if (field === 'weight' || field === 'height') {
            const bmi = calculateBMI(
                field === 'weight' ? value : formData.vitalSigns.weight,
                field === 'height' ? value : formData.vitalSigns.height
            );
            if (bmi) newVitals.bmi = bmi;
        }
        
        setFormData(prev => ({ ...prev, vitalSigns: newVitals }));
    };

    const calculateBMI = (weight, height) => {
        if (weight && height && height > 0) {
            const heightInMeters = height / 100;
            return (weight / (heightInMeters * heightInMeters)).toFixed(1);
        }
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const recordData = {
            patientId: formData.patientId,
            hospital: formData.hospital,
            doctorName: formData.doctorName,
            visitDate: formData.visitDate,
            visitType: formData.visitType,
            symptoms: formData.symptoms,
            primaryDiagnosis: { name: formData.primaryDiagnosis },
            disease: formData.disease,
            prescribedMedications: formData.prescribedMedications,
            treatmentPlan: {
                plan: formData.treatmentPlan
            },
            disposition: formData.disposition,
            dischargeInstructions: formData.dischargeInstructions,
            province: formData.province,
            notes: formData.notes,
            taggedUsers: formData.taggedUsers,
            physicalExam: formData.physicalExam,
            differentialDiagnosis: formData.differentialDiagnosis,
            investigations: {
                labTests: formData.labTests,
                radiology: formData.radiology
            },
            vitalSigns: {
                temperature: formData.vitalSigns.temperature ? parseFloat(formData.vitalSigns.temperature) : null,
                bloodPressure: {
                    systolic: formData.vitalSigns.bloodPressureSystolic ? parseInt(formData.vitalSigns.bloodPressureSystolic) : null,
                    diastolic: formData.vitalSigns.bloodPressureDiastolic ? parseInt(formData.vitalSigns.bloodPressureDiastolic) : null
                },
                heartRate: formData.vitalSigns.heartRate ? parseInt(formData.vitalSigns.heartRate) : null,
                respiratoryRate: formData.vitalSigns.respiratoryRate ? parseInt(formData.vitalSigns.respiratoryRate) : null,
                oxygenSaturation: formData.vitalSigns.oxygenSaturation ? parseInt(formData.vitalSigns.oxygenSaturation) : null,
                weight: formData.vitalSigns.weight ? parseFloat(formData.vitalSigns.weight) : null,
                height: formData.vitalSigns.height ? parseFloat(formData.vitalSigns.height) : null,
                bmi: formData.vitalSigns.bmi ? parseFloat(formData.vitalSigns.bmi) : null,
                painScore: formData.vitalSigns.painScore ? parseInt(formData.vitalSigns.painScore) : null
            }
        };
        
        try {
            if (editingRecord) {
                await updateMedicalRecord(editingRecord._id, recordData);
                toast.success('Medical record updated successfully');
            } else {
                await createMedicalRecord(recordData);
                toast.success('Medical record created successfully');
            }
            
            refreshData();
            setShowModal(false);
            const response = await getPatientRecords(selectedPatient._id);
            setRecords(response.data);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark-950">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyber-blue/20 rounded-full animate-spin border-t-cyber-blue"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ClipboardDocumentListIcon className="h-6 w-6 text-cyber-blue animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark-950 pb-20">
            {/* Header Section */}
            <div className="bg-brand-dark-900/50 border-b border-white/5 py-12 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div>
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-3 rounded-2xl bg-brand-dark-800 border border-cyber-blue/30 shadow-[0_0_20px_rgba(0,242,255,0.1)]">
                                    <ClipboardDocumentListIcon className="h-8 w-8 text-cyber-blue" />
                                </div>
                                <h1 className="text-4xl font-bold text-white tracking-tight">Clinical Records</h1>
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-500 ml-16">
                                Precision Healthcare Node v3.0
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="w-full md:w-auto flex items-center space-x-3">
                            <div className="relative flex-1 md:w-96 group">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-cyber-blue transition-colors" />
                                <input
                                    type="text"
                                    placeholder="IDENTIFY PATIENT (ID/NAME)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 font-mono text-sm focus:outline-none focus:border-cyber-blue/50 focus:ring-4 focus:ring-cyber-blue/5 transition-all duration-500"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="px-8 py-4 rounded-2xl bg-white text-brand-dark-950 font-bold text-xs uppercase tracking-widest hover:bg-cyber-blue transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            >
                                Scan
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">
                {!selectedPatient ? (
                    <div className="glass-card-modern p-24 text-center border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyber-blue/5 blur-[100px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyber-purple/5 blur-[100px] pointer-events-none" />
                        
                        <div className="w-24 h-24 rounded-3xl bg-brand-dark-800 border border-white/5 flex items-center justify-center mx-auto mb-8 shadow-2xl group">
                            <UserIcon className="h-10 w-10 text-gray-700 group-hover:text-cyber-blue transition-colors duration-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">INITIALIZE SESSION</h2>
                        <p className="text-gray-500 max-lg mx-auto leading-relaxed text-sm font-medium">
                            Enter a valid patient identifier in the terminal above to decrypt and access clinical histories, biometric data, and diagnostic records.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                        {/* Patient Summary Card */}
                        <div className="lg:col-span-1">
                            <div className="glass-card-modern border border-white/5 overflow-hidden sticky top-28">
                                <div className="bg-gradient-to-br from-cyber-blue/10 via-brand-dark-900 to-transparent p-8 border-b border-white/5">
                                    <div className="text-center mb-8">
                                        <div className="relative w-20 h-20 mx-auto mb-6">
                                            <div className="absolute inset-0 rounded-3xl bg-cyber-blue/20 blur-xl animate-pulse" />
                                            <div className="relative w-20 h-20 rounded-3xl bg-brand-dark-950 border border-cyber-blue/30 flex items-center justify-center text-2xl font-bold text-cyber-blue shadow-2xl">
                                                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white tracking-tight mb-1">
                                            {selectedPatient.firstName} {selectedPatient.lastName}
                                        </h3>
                                        <div className="flex items-center justify-center space-x-2">
                                            <ShieldCheckIcon className="h-3 w-3 text-cyber-green" />
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Verified Citizen</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Identifier', value: selectedPatient.nationalId, icon: IdentificationIcon },
                                            { label: 'Sector', value: selectedPatient.province, icon: MapPinIcon },
                                            { label: 'Origin', value: new Date(selectedPatient.dateOfBirth).toLocaleDateString(), icon: ClockIcon }
                                        ].map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-brand-dark-950/50 border border-white/5 flex items-center space-x-4">
                                                <item.icon className="h-4 w-4 text-gray-600" />
                                                <div>
                                                    <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-700 mb-0.5">{item.label}</p>
                                                    <p className="text-xs text-gray-300 font-bold tracking-wide">{item.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="p-6 bg-brand-dark-900/50">
                                    <button
                                        onClick={handleAddRecord}
                                        disabled={!canCreate}
                                        className="btn-primary-modern w-full py-4 uppercase tracking-[0.2em] text-[10px] font-bold flex items-center justify-center disabled:opacity-20"
                                    >
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Create Record
                                    </button>
                                    
                                    <button
                                        onClick={() => navigate(`/patients/${selectedPatient._id}/vitals-trend`)}
                                        className="w-full mt-3 py-4 rounded-xl bg-brand-dark-800 border border-white/5 text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center hover:text-white hover:bg-brand-dark-700 transition-all duration-300"
                                    >
                                        <ChartBarIcon className="h-4 w-4 mr-2" />
                                        Biometric Trends
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Records List */}
                        <div className="lg:col-span-3">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-purple mr-4 animate-pulse" />
                                    Temporal Timeline
                                </h2>
                                <div className="flex items-center space-x-4">
                                    <span className="px-4 py-1.5 rounded-xl bg-brand-dark-900 border border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        {records.length} ENCRYPTED ENTRIES
                                    </span>
                                </div>
                            </div>

                            {records.length === 0 ? (
                                <div className="glass-card-modern p-20 text-center border border-white/5">
                                    <DocumentTextIcon className="h-12 w-12 mx-auto mb-6 text-brand-dark-800" />
                                    <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">No clinical history detected</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {records.map((record) => (
                                        <div 
                                            key={record._id} 
                                            className={`glass-card-modern border transition-all duration-500 overflow-hidden ${
                                                expandedRecord === record._id 
                                                    ? 'border-cyber-blue/30 bg-brand-dark-900/80' 
                                                    : 'border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <div 
                                                className="p-8 cursor-pointer relative group"
                                                onClick={() => setExpandedRecord(expandedRecord === record._id ? null : record._id)}
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-cyber-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                                                
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                    <div className="flex items-center space-x-6">
                                                        <div className="w-16 h-16 rounded-2xl bg-brand-dark-950 border border-white/5 flex flex-col items-center justify-center shadow-xl">
                                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                                                                {new Date(record.visitDate).toLocaleString('default', { month: 'short' })}
                                                            </span>
                                                            <span className="text-2xl font-bold text-white leading-none tracking-tighter">
                                                                {new Date(record.visitDate).getDate()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <h3 className="text-xl font-bold text-white tracking-tight">
                                                                    {record.primaryDiagnosis?.name || record.disease || 'General Diagnostic'}
                                                                </h3>
                                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border ${
                                                                    record.visitType === 'Emergency' 
                                                                        ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                                                                        : 'bg-cyber-blue/10 border-cyber-blue/20 text-cyber-blue'
                                                                }`}>
                                                                    {record.visitType}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-4">
                                                                <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                                    <BuildingOfficeIcon className="h-3 w-3 mr-2 text-gray-700" />
                                                                    {record.hospital}
                                                                </div>
                                                                <div className="w-1 h-1 rounded-full bg-brand-dark-800" />
                                                                <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                                    <ClockIcon className="h-3 w-3 mr-2 text-gray-700" />
                                                                    {new Date(record.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-8">
                                                        <div className="hidden md:flex flex-col items-end">
                                                            <p className="text-[8px] uppercase tracking-widest font-bold text-gray-700 mb-1">Attending Officer</p>
                                                            <div className="flex items-center space-x-2">
                                                                <UserIcon className="h-3 w-3 text-cyber-purple" />
                                                                <span className="text-xs font-bold text-gray-300">Dr. {record.doctorName || 'Unknown'}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center space-x-3">
                                                            {record.taggedUsers?.length > 0 && (
                                                                <div className="px-3 py-1.5 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center space-x-2">
                                                                    <UserPlusIcon className="h-3.5 w-3.5 text-cyber-blue" />
                                                                    <span className="text-[10px] font-bold text-cyber-blue">{record.taggedUsers.length}</span>
                                                                </div>
                                                            )}
                                                            <div className={`p-2 rounded-xl bg-brand-dark-950 border border-white/5 transition-transform duration-500 ${expandedRecord === record._id ? 'rotate-180' : ''}`}>
                                                                <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable Details Area */}
                                            {expandedRecord === record._id && (
                                                <div className="px-8 pb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                                    <div className="h-px w-full bg-white/5 mb-8" />
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        {/* Symptoms & Diagnosis */}
                                                        <div className="space-y-6">
                                                            <div>
                                                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyber-blue mb-4 flex items-center">
                                                                    <BeakerIcon className="h-4 w-4 mr-3" />
                                                                    Clinical Presentation
                                                                </h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {record.symptoms?.map((s, i) => (
                                                                        <span key={i} className="px-3 py-1.5 rounded-xl bg-brand-dark-950 border border-white/5 text-[11px] text-gray-400 font-medium">
                                                                            {s}
                                                                        </span>
                                                                    )) || <span className="text-xs text-gray-600 italic">No symptoms recorded</span>}
                                                                </div>
                                                            </div>
                                                            
                                                            <div>
                                                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyber-purple mb-4 flex items-center">
                                                                    <DocumentTextIcon className="h-4 w-4 mr-3" />
                                                                    Differential Profile
                                                                </h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {record.differentialDiagnosis?.map((d, i) => (
                                                                        <span key={i} className="px-3 py-1.5 rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 text-[11px] text-cyber-purple font-bold">
                                                                            {d}
                                                                        </span>
                                                                    )) || <span className="text-xs text-gray-600 italic">No differentials documented</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Vital Signs Grid */}
                                                        <div className="md:col-span-2">
                                                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyber-green mb-4 flex items-center">
                                                                <HeartIcon className="h-4 w-4 mr-3" />
                                                                Biometric Telemetry
                                                            </h4>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                {[
                                                                    { label: 'TEMP', value: `${record.vitalSigns?.temperature}°C`, status: 'NOMINAL' },
                                                                    { label: 'BP', value: `${record.vitalSigns?.bloodPressure?.systolic}/${record.vitalSigns?.bloodPressure?.diastolic}`, status: 'NOMINAL' },
                                                                    { label: 'HR', value: `${record.vitalSigns?.heartRate} BPM`, status: 'STABLE' },
                                                                    { label: 'SPO2', value: `${record.vitalSigns?.oxygenSaturation}%`, status: 'NOMINAL' }
                                                                ].map((v, i) => (
                                                                    <div key={i} className="p-4 rounded-2xl bg-brand-dark-950 border border-white/5 hover:border-cyber-green/30 transition-colors group">
                                                                        <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest mb-1 group-hover:text-cyber-green transition-colors">{v.label}</p>
                                                                        <p className="text-lg font-bold text-white tracking-tighter mb-2">{v.value}</p>
                                                                        <div className="flex items-center space-x-1.5">
                                                                            <div className="w-1 h-1 rounded-full bg-cyber-green" />
                                                                            <span className="text-[7px] font-bold text-cyber-green uppercase tracking-widest">{v.status}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Controls */}
                                                    <div className="mt-10 pt-8 border-t border-white/5 flex justify-end space-x-4">
                                                        <button 
                                                            onClick={() => handleEditRecord(record)}
                                                            className="px-6 py-2.5 rounded-xl bg-brand-dark-800 border border-white/5 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-white hover:bg-brand-dark-700 transition-all"
                                                        >
                                                            Modify Entry
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteRecord(record)}
                                                            className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                        >
                                                            Purge
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicalRecords;
