import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getPatients,
    getMedicalRecords,
    getPatientRecords,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    getHospitalStaff,
    uploadRadiologyImages,
    getRecordSnapshot
} from '../services/api';
import { useAuth } from '../context/AuthProvider';
import { useDataRefresh } from '../context/DataRefreshProvider.jsx';
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
    ShieldCheckIcon,
    CommandLineIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
    roundTemperature,
    formatTemperature,
    buildVitalDisplayRows,
    statusColorClass
} from '../utils/vitalSigns';
import ClinicalInvestigationsForm from '../components/medical/ClinicalInvestigationsForm';
import ClinicalProgression from '../components/medical/ClinicalProgression';
import TriageAlert from '../components/ai/TriageAlert';

const MedicalRecords = () => {
    const navigate = useNavigate();
    const location = useLocation();
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
    const [recordSnapshot, setRecordSnapshot] = useState(null);
    const [loadingSnapshot, setLoadingSnapshot] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    
    // Triage State (Gap: Silent Crisis)
    const [triageData, setTriageData] = useState(null);
    const [loadingTriage, setLoadingTriage] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [limit] = useState(10);
    
    const [formData, setFormData] = useState({
        patientId: '',
        hospital: '',
        doctorName: '',
        visitDate: new Date().toISOString().split('T')[0],
        visitType: 'Outpatient',
        visitStatus: 'Active',
        observations: [],
        newObservation: {
            timestamp: new Date().toISOString(),
            vitalSigns: { temperature: '', heartRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', oxygenSaturation: '', respiratoryRate: '' },
            notes: '',
            status: 'Stable'
        },
        symptoms: [],
        symptomInput: '',
        primaryDiagnosis: '',
        disease: '',
        prescribedMedications: [],
        medicationInput: '',
        prescriptions: [],
        prescriptionInput: {
            medication: '',
            dosage: '',
            frequency: '',
            route: 'Oral',
            duration: '',
            notes: ''
        },
        treatmentPlan: '',
        disposition: 'Discharged',
        dischargeInstructions: '',
        province: '',
        district: '',
        department: '',
        historyOfPresentIllness: '',
        doctorNotes: '',
        nursingNotes: '',
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
                const response = await getPatients(1, 1000); // Get more patients for search/select
                const patientList = response.data.patients || [];
                setPatients(patientList);
                
                // Check if a patient was passed in navigation state
                if (location.state?.selectedPatient) {
                    const passedPatient = location.state.selectedPatient;
                    setSelectedPatient(passedPatient);
                    setSearchTerm(passedPatient.nationalId);
                }
                
                setLoading(false);
            } catch {
                toast.error('Failed to load patients');
                setLoading(false);
            }
        };
        loadPatients();
    }, [location.state]);

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
                setLoading(true);
                try {
                    const response = await getPatientRecords(selectedPatient._id);
                    setRecords(response.data);
                } catch {
                    toast.error('Failed to load medical records');
                } finally {
                    setLoading(false);
                }
            } else {
                // Load all accessible records with pagination
                setLoading(true);
                try {
                    const response = await getMedicalRecords(page, limit);
                    setRecords(response.data.records);
                    setTotalPages(response.data.pages);
                    setTotalResults(response.data.total);
                } catch {
                    toast.error('Failed to load medical records');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadRecords();
    }, [selectedPatient, page]);

    useEffect(() => {
        const loadRecordSnapshot = async () => {
            if (expandedRecord) {
                setLoadingSnapshot(true);
                try {
                    const response = await getRecordSnapshot(expandedRecord);
                    setRecordSnapshot(response.data.summary);
                } catch (error) {
                    console.error("Failed to load record snapshot:", error);
                    setRecordSnapshot("AI synthesis unavailable for this record.");
                } finally {
                    setLoadingSnapshot(false);
                }
            } else {
                setRecordSnapshot(null);
            }
        };
        loadRecordSnapshot();
    }, [expandedRecord]);

    // Real-time Triage Analysis (Gap: Silent Crisis)
    useEffect(() => {
        const analyzeTriage = async () => {
            const { temperature, heartRate, bloodPressureSystolic, respiratoryRate, oxygenSaturation } = formData.vitalSigns;
            
            // Only analyze if enough vitals are present to be meaningful
            if (!temperature || !heartRate || !bloodPressureSystolic) {
                setTriageData(null);
                return;
            }

            try {
                // We use the server-side triage logic for consistency
                // In a production app, we'd also mirror this in a local utility for true offline-first
                const response = await getPatientTriage(null, {
                    vitals: formData.vitalSigns,
                    symptoms: formData.symptoms
                });
                setTriageData(response.data);
            } catch (error) {
                console.error("Triage analysis failed:", error);
            }
        };

        const timer = setTimeout(analyzeTriage, 1000); // Debounce
        return () => clearTimeout(timer);
    }, [formData.vitalSigns, formData.symptoms]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSelectedPatient(null);
            return;
        }
        
        setLoading(true);
        try {
            const response = await getPatients(1, 10, searchTerm);
            const results = response.data.patients || [];
            
            if (results.length > 0) {
                // If there's an exact match on National ID, pick it
                const exactMatch = results.find(p => p.nationalId.toLowerCase() === searchTerm.toLowerCase());
                setSelectedPatient(exactMatch || results[0]);
                if (exactMatch || results.length === 1) {
                    toast.success(`Patient selected: ${results[0].firstName} ${results[0].lastName}`);
                } else {
                    toast.info(`Found ${results.length} matches. Selected first one.`);
                }
            } else {
                toast.info('No patient found');
                setSelectedPatient(null);
            }
        } catch {
            toast.error('Search failed');
        } finally {
            setLoading(false);
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
            visitStatus: 'Active',
            observations: [],
            newObservation: {
                timestamp: new Date().toISOString(),
                vitalSigns: { temperature: '', heartRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', oxygenSaturation: '', respiratoryRate: '' },
                fluidBalance: { intake: '', output: '', type: 'IV Fluids' },
                notes: '',
                status: 'Stable'
            },
            symptoms: [],
            symptomInput: '',
            primaryDiagnosis: '',
            disease: '',
            prescribedMedications: [],
            medicationInput: '',
            prescriptions: [],
            prescriptionInput: { medication: '', dosage: '', frequency: '', route: 'Oral', duration: '', notes: '' },
            treatmentPlan: '',
            disposition: 'Discharged',
            dischargeInstructions: '',
            province: selectedPatient.province || currentUser?.province || '',
            district: selectedPatient.district || '',
            department: '',
            historyOfPresentIllness: '',
            doctorNotes: '',
            nursingNotes: '',
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
            visitStatus: record.visitStatus || 'Active',
            observations: record.observations || [],
            newObservation: {
                timestamp: new Date().toISOString(),
                vitalSigns: { temperature: '', heartRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', oxygenSaturation: '', respiratoryRate: '' },
                fluidBalance: { intake: '', output: '', type: 'IV Fluids' },
                notes: '',
                status: 'Stable'
            },
            symptoms: record.symptoms || [],
            symptomInput: '',
            primaryDiagnosis: record.primaryDiagnosis?.name || record.disease || '',
            disease: record.disease || '',
            prescribedMedications: record.prescribedMedications || [],
            medicationInput: '',
            prescriptions: record.treatmentPlan?.medications?.length
                ? record.treatmentPlan.medications
                : (record.prescribedMedications || []).map((m) => ({
                    medication: typeof m === 'string' ? m : m.medication,
                    dosage: '', frequency: '', route: 'Oral', duration: '', notes: ''
                })),
            prescriptionInput: { medication: '', dosage: '', frequency: '', route: 'Oral', duration: '', notes: '' },
            treatmentPlan: record.treatmentPlan?.plan || '',
            disposition: ['Discharged', 'Admitted', 'Transferred', 'Left Against Medical Advice', 'Deceased'].includes(record.disposition)
                ? record.disposition
                : 'Discharged',
            dischargeInstructions: record.dischargeInstructions || '',
            province: record.province || selectedPatient?.province || '',
            district: record.district || record.patientSnapshot?.district || '',
            department: record.department || '',
            historyOfPresentIllness: record.historyOfPresentIllness || '',
            doctorNotes: record.doctorNotes || '',
            nursingNotes: record.nursingNotes || '',
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
                temperature: record.vitalSigns?.temperature != null
                    ? formatTemperature(record.vitalSigns.temperature)
                    : '',
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

    const handleAddSymptom = () => {
        if (formData.symptomInput.trim()) {
            setFormData(prev => ({
                ...prev,
                symptoms: [...prev.symptoms, prev.symptomInput.trim()],
                symptomInput: ''
            }));
        }
    };

    const handleRemoveSymptom = (index) => {
        setFormData(prev => ({
            ...prev,
            symptoms: prev.symptoms.filter((_, i) => i !== index)
        }));
    };

    const handleAddMedication = () => {
        if (formData.medicationInput.trim()) {
            setFormData(prev => ({
                ...prev,
                prescribedMedications: [...prev.prescribedMedications, prev.medicationInput.trim()],
                medicationInput: ''
            }));
        }
    };

    const handleRemoveMedication = (index) => {
        setFormData(prev => ({
            ...prev,
            prescribedMedications: prev.prescribedMedications.filter((_, i) => i !== index)
        }));
    };

    const handleAddPrescription = () => {
        const p = formData.prescriptionInput;
        if (!p.medication?.trim()) {
            toast.error('Medication name is required');
            return;
        }
        const entry = {
            medication: p.medication.trim(),
            dosage: p.dosage?.trim() || '',
            frequency: p.frequency?.trim() || '',
            route: p.route || 'Oral',
            duration: p.duration?.trim() || '',
            notes: p.notes?.trim() || '',
            prescribedBy: formData.doctorName
        };
        setFormData((prev) => ({
            ...prev,
            prescriptions: [...prev.prescriptions, entry],
            prescribedMedications: [...prev.prescribedMedications, p.medication.trim()],
            prescriptionInput: { medication: '', dosage: '', frequency: '', route: 'Oral', duration: '', notes: '' }
        }));
    };

    const handleRemovePrescription = (index) => {
        setFormData((prev) => ({
            ...prev,
            prescriptions: prev.prescriptions.filter((_, i) => i !== index),
            prescribedMedications: prev.prescribedMedications.filter((_, i) => i !== index)
        }));
    };

    const handleAddLabTest = () => {
        const t = formData.labTestInput;
        if (!t.testName?.trim()) {
            toast.error('Lab test name is required');
            return;
        }
        setFormData((prev) => ({
            ...prev,
            labTests: [...prev.labTests, {
                testName: t.testName.trim(),
                result: t.result?.trim() || '',
                referenceRange: t.referenceRange?.trim() || '',
                abnormal: !!t.abnormal,
                orderedDate: new Date().toISOString(),
                notes: ''
            }],
            labTestInput: { testName: '', result: '', referenceRange: '', abnormal: false }
        }));
    };

    const handleRemoveLabTest = (index) => {
        setFormData((prev) => ({
            ...prev,
            labTests: prev.labTests.filter((_, i) => i !== index)
        }));
    };

    const handleRadiologyFiles = (e) => {
        const files = Array.from(e.target.files || []);
        const previews = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }));
        setFormData((prev) => ({
            ...prev,
            radiologyInput: {
                ...prev.radiologyInput,
                previewImages: [...prev.radiologyInput.previewImages, ...previews]
            }
        }));
        e.target.value = '';
    };

    const handleRemoveRadiologyPreview = (index) => {
        setFormData((prev) => {
            const removed = prev.radiologyInput.previewImages[index];
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return {
                ...prev,
                radiologyInput: {
                    ...prev.radiologyInput,
                    previewImages: prev.radiologyInput.previewImages.filter((_, i) => i !== index)
                }
            };
        });
    };

    const handleAddRadiology = () => {
        const r = formData.radiologyInput;
        if (!r.studyType?.trim()) {
            toast.error('Radiology study type is required');
            return;
        }
        const pendingFiles = (r.previewImages || []).filter((p) => p.file).map((p) => p.file);
        const existingImages = (r.previewImages || []).filter((p) => p.url).map((p) => ({
            url: p.url,
            originalName: p.name || 'image',
            filename: p.filename
        }));
        setFormData((prev) => ({
            ...prev,
            radiology: [...prev.radiology, {
                studyType: r.studyType.trim(),
                bodyPart: r.bodyPart?.trim() || '',
                findings: r.findings?.trim() || '',
                impression: r.impression?.trim() || '',
                images: existingImages,
                _pendingFiles: pendingFiles,
                reportDate: new Date().toISOString(),
                orderedBy: prev.doctorName
            }],
            radiologyInput: { studyType: '', bodyPart: '', findings: '', impression: '', previewImages: [] }
        }));
    };

    const handleRemoveRadiology = (index) => {
        setFormData((prev) => ({
            ...prev,
            radiology: prev.radiology.filter((_, i) => i !== index)
        }));
    };

    const resolveRadiologyStudies = async (studies, patientId) => {
        const resolved = [];
        for (const study of studies) {
            const { _pendingFiles, ...rest } = study;
            const entry = { ...rest };
            if (_pendingFiles?.length) {
                setUploadingImages(true);
                try {
                    const uploadRes = await uploadRadiologyImages(patientId, entry.studyType, _pendingFiles);
                    entry.images = [...(entry.images || []), ...(uploadRes.data?.images || [])];
                } finally {
                    setUploadingImages(false);
                }
            }
            resolved.push(entry);
        }
        return resolved;
    };

    const handleVitalChange = (field, value) => {
        let nextValue = value;
        if (field === 'temperature' && value !== '') {
            const rounded = roundTemperature(value);
            if (rounded != null) nextValue = rounded.toFixed(1);
        }

        const newVitals = { ...formData.vitalSigns, [field]: nextValue };
        
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

        if (formData.vitalSigns.temperature === '' || formData.vitalSigns.temperature == null) {
            toast.error('Temperature is required');
            return;
        }

        const temp = roundTemperature(formData.vitalSigns.temperature);
        if (temp == null) {
            toast.error('Enter a valid temperature');
            return;
        }
        
        let radiologyStudies;
        try {
            radiologyStudies = await resolveRadiologyStudies(formData.radiology, formData.patientId);
        } catch (uploadErr) {
            toast.error(uploadErr.response?.data?.error || 'Failed to upload radiology images');
            return;
        }

        const recordData = {
            patientId: formData.patientId,
            hospital: formData.hospital,
            doctorName: formData.doctorName,
            visitDate: formData.visitDate,
            visitType: formData.visitType,
            visitStatus: formData.visitStatus,
            observations: formData.observations,
            symptoms: formData.symptoms,
            primaryDiagnosis: { name: formData.primaryDiagnosis },
            disease: formData.disease,
            prescribedMedications: formData.prescriptions.map((p) => p.medication),
            treatmentPlan: {
                plan: formData.treatmentPlan,
                medications: formData.prescriptions
            },
            disposition: formData.disposition,
            dischargeInstructions: formData.dischargeInstructions,
            province: formData.province,
            district: formData.district,
            department: formData.department,
            historyOfPresentIllness: formData.historyOfPresentIllness,
            doctorNotes: formData.doctorNotes,
            nursingNotes: formData.nursingNotes,
            notes: formData.notes,
            taggedUsers: formData.taggedUsers,
            physicalExam: formData.physicalExam,
            differentialDiagnosis: formData.differentialDiagnosis,
            investigations: {
                labTests: formData.labTests,
                radiology: radiologyStudies
            },
            vitalSigns: {
                temperature: temp,
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
            const patientId = selectedPatient?._id || formData.patientId;
            if (patientId) {
                const response = await getPatientRecords(patientId);
                setRecords(response.data);
            } else {
                const response = await getMedicalRecords(page, limit);
                setRecords(response.data.records);
            }
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Operation failed';
            toast.error(msg);
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
                                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border ${
                                                                    record.visitStatus === 'Active' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                                    record.visitStatus === 'In Admission' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                                                                    'bg-brand-dark-800 border-white/10 text-gray-500'
                                                                }`}>
                                                                    {record.visitStatus === 'Active' ? 'Active Case' : 
                                                                     record.visitStatus === 'Finalized' ? 'Case Closed' : 
                                                                     record.visitStatus}
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
                                                    
                                                    {/* Record-Specific AI Snapshot (Information Sifting Gap Fix) */}
                                                    <div className="mb-10 flex flex-col md:flex-row gap-6">
                                                        <div className="flex-1 p-6 rounded-2xl bg-gradient-to-br from-cyber-blue/5 to-transparent border border-cyber-blue/10 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                <SparklesIcon className="h-10 w-10 text-cyber-blue" />
                                                            </div>
                                                            <h4 className="text-[9px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-3 flex items-center">
                                                                <CommandLineIcon className="h-3 w-3 mr-2" />
                                                                AI_RECORD_SYNTHESIS
                                                            </h4>
                                                            {loadingSnapshot ? (
                                                                <div className="flex items-center space-x-3 animate-pulse">
                                                                    <div className="w-2 h-2 rounded-full bg-cyber-blue" />
                                                                    <div className="h-2 w-48 bg-white/5 rounded" />
                                                                </div>
                                                            ) : (
                                                                <p className="text-gray-200 text-sm leading-relaxed italic">
                                                                    "{recordSnapshot || 'Analyzing clinical encounter patterns...'}"
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Outcome Highlight (Gap: Record Closure & Outcome) */}
                                                        {(record.visitStatus === 'Finalized' || record.visitStatus === 'Discharged') && (
                                                            <div className="md:w-72 p-6 rounded-2xl bg-brand-dark-950 border border-cyber-purple/20 flex flex-col justify-center text-center">
                                                                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-2">Clinical Outcome</p>
                                                                <div className="text-xl font-black text-cyber-purple tracking-tighter uppercase">{record.disposition || 'Finalized'}</div>
                                                                {record.dischargeInstructions && (
                                                                    <p className="text-[9px] text-gray-500 mt-2 italic line-clamp-2">"{record.dischargeInstructions}"</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

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
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                                {buildVitalDisplayRows(record.vitalSigns).map((v, i) => (
                                                                    <div key={i} className="p-4 rounded-2xl bg-brand-dark-950 border border-white/5 hover:border-cyber-green/30 transition-colors group">
                                                                        <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest mb-1 group-hover:text-cyber-green transition-colors">{v.label}</p>
                                                                        <p className="text-lg font-bold text-white tracking-tighter mb-2">{v.value}</p>
                                                                        <div className="flex items-center space-x-1.5">
                                                                            <div className={`w-1 h-1 rounded-full ${
                                                                                v.color === 'red' ? 'bg-red-500' :
                                                                                v.color === 'orange' ? 'bg-orange-500' :
                                                                                v.color === 'yellow' ? 'bg-yellow-500' :
                                                                                v.color === 'green' ? 'bg-cyber-green' : 'bg-gray-500'
                                                                            }`} />
                                                                            <span className={`text-[7px] font-bold uppercase tracking-widest ${statusColorClass(v.color)}`}>{v.status}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {(record.treatmentPlan?.medications?.length > 0 || record.investigations?.labTests?.length > 0 || record.investigations?.radiology?.length > 0) && (
                                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            {record.treatmentPlan?.medications?.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold uppercase text-cyber-blue mb-3">Prescriptions</h4>
                                                                    <ul className="space-y-2 text-xs text-gray-300">
                                                                        {record.treatmentPlan.medications.map((rx, i) => (
                                                                            <li key={i} className="p-2 rounded-lg bg-brand-dark-950 border border-white/5">
                                                                                <span className="font-bold text-white">{rx.medication}</span>
                                                                                {[rx.dosage, rx.frequency, rx.route].filter(Boolean).length > 0 && (
                                                                                    <span className="text-gray-500"> — {[rx.dosage, rx.frequency, rx.route].filter(Boolean).join(' · ')}</span>
                                                                                )}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {record.investigations?.labTests?.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold uppercase text-cyber-purple mb-3">Lab tests</h4>
                                                                    <ul className="space-y-2 text-xs text-gray-300">
                                                                        {record.investigations.labTests.map((t, i) => (
                                                                            <li key={i} className="p-2 rounded-lg bg-brand-dark-950 border border-white/5">
                                                                                {t.testName}: {t.result || 'pending'}
                                                                                {t.abnormal && <span className="text-red-400 ml-1">ABNORMAL</span>}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {record.investigations?.radiology?.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold uppercase text-cyan-400 mb-3">Radiology</h4>
                                                                    {record.investigations.radiology.map((s, i) => (
                                                                        <div key={i} className="p-2 mb-2 rounded-lg bg-brand-dark-950 border border-white/5 text-xs">
                                                                            <p className="font-bold text-white">{s.studyType}{s.bodyPart ? ` · ${s.bodyPart}` : ''}</p>
                                                                            {s.images?.length > 0 && (
                                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                                    {s.images.map((img, j) => (
                                                                                        <a key={j} href={img.url} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded overflow-hidden border border-white/10">
                                                                                            <img src={img.url} alt={img.originalName || 'scan'} className="w-full h-full object-cover" />
                                                                                        </a>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        )}

                                                        {/* Clinical Progression (Admission Progress Support) */}
                                                        {record.observations?.length > 0 && (
                                                        <div className="mt-12 p-8 rounded-[2rem] bg-brand-dark-950/50 border border-cyber-blue/10">
                                                            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyber-blue mb-8 flex items-center">
                                                                <ChartBarIcon className="h-4 w-4 mr-3" />
                                                                Dynamic Clinical Progression
                                                            </h4>
                                                            <ClinicalProgression observations={record.observations} />
                                                        </div>
                                                        )}

                                                        {/* Action Controls */}
                                                    <div className="mt-10 pt-8 border-t border-white/5 flex justify-end space-x-4">
                                                        <button 
                                                            onClick={() => handleEditRecord(record)}
                                                            disabled={!canEdit}
                                                            className="px-6 py-2.5 rounded-xl bg-brand-dark-800 border border-white/5 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-white hover:bg-brand-dark-700 transition-all disabled:opacity-20"
                                                        >
                                                            Modify Entry
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteRecord(record)}
                                                            disabled={!canDelete}
                                                            className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-20"
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

                            {/* Pagination */}
                            {!selectedPatient && totalPages > 1 && (
                                <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-6">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalResults)} of {totalResults} Clinical Records
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-5 py-3 rounded-2xl bg-brand-dark-900 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all font-mono text-[10px] uppercase tracking-widest"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center space-x-1.5">
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => setPage(i + 1)}
                                                    className={`w-11 h-11 rounded-2xl border transition-all font-mono text-[10px] ${page === i + 1 ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue shadow-[0_0_20px_rgba(0,242,255,0.1)]' : 'bg-brand-dark-900 border-white/5 text-gray-500 hover:text-white'}`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="px-5 py-3 rounded-2xl bg-brand-dark-900 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all font-mono text-[10px] uppercase tracking-widest"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Medical Record Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-brand-dark-950/90 backdrop-blur-xl" onClick={() => setShowModal(false)} />
                        
                        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-brand-dark-900 border border-white/5 rounded-[2rem] shadow-2xl flex flex-col">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-brand-dark-900/50 backdrop-blur-md sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center tracking-tight">
                                        <div className="w-10 h-10 rounded-xl bg-cyber-blue/10 flex items-center justify-center mr-4 border border-cyber-blue/20">
                                            {editingRecord ? <PencilIcon className="h-5 w-5 text-cyber-blue" /> : <PlusIcon className="h-5 w-5 text-cyber-blue" />}
                                        </div>
                                        {editingRecord ? 'UPDATE_CLINICAL_NODE' : 'INITIALIZE_MEDICAL_ENTRY'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">
                                        {selectedPatient ? `PATIENT_ID: ${selectedPatient.nationalId}` : 'SELECT_PATIENT_IDENTITY'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="p-3 rounded-xl bg-brand-dark-800 border border-white/5 text-gray-500 hover:text-white transition-all"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {/* Real-time Triage Alert (Gap: Silent Crisis Fix) */}
                                <div className="mb-10">
                                    <TriageAlert triageData={triageData} loading={loadingTriage} />
                                </div>

                                <form id="medical-record-form" onSubmit={handleSubmit} className="space-y-12">
                                    {/* Core Information Section */}
                                    <section>
                                        <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-8 flex items-center">
                                            <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                            CORE_PARAMETERS
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Hospital Node</label>
                                                <div className="relative group">
                                                    <BuildingOfficeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-cyber-blue transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={formData.hospital}
                                                        onChange={(e) => setFormData({...formData, hospital: e.target.value})}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-cyber-blue/30 focus:ring-1 focus:ring-cyber-blue/30 transition-all outline-none"
                                                        placeholder="Enter facility name..."
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Clinical Officer</label>
                                                <div className="relative group">
                                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-cyber-blue transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={formData.doctorName}
                                                        readOnly
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-400 outline-none cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Visit Timeline</label>
                                                <div className="relative group">
                                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-cyber-blue transition-colors" />
                                                    <input
                                                        type="date"
                                                        value={formData.visitDate}
                                                        onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-cyber-blue/30 focus:ring-1 focus:ring-cyber-blue/30 transition-all outline-none"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Encounter Type</label>
                                                <div className="relative group">
                                                    <ClipboardDocumentListIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-cyber-blue transition-colors" />
                                                    <select
                                                        value={formData.visitType}
                                                        onChange={(e) => setFormData({...formData, visitType: e.target.value})}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-cyber-blue/30 focus:ring-1 focus:ring-cyber-blue/30 transition-all outline-none appearance-none"
                                                    >
                                                        <option value="Outpatient">Outpatient</option>
                                                        <option value="Inpatient">Inpatient</option>
                                                        <option value="Emergency">Emergency</option>
                                                        <option value="Telemedicine">Telemedicine</option>
                                                        <option value="Follow-up">Follow-up</option>
                                                        <option value="Consultation">Consultation</option>
                                                        <option value="Home Visit">Home Visit</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Clinical Status</label>
                                                <div className="relative group">
                                                    <CommandLineIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-cyber-blue transition-colors" />
                                                    <select
                                                        value={formData.visitStatus}
                                                        onChange={(e) => setFormData({...formData, visitStatus: e.target.value})}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-cyber-blue/30 focus:ring-1 focus:ring-cyber-blue/30 transition-all outline-none appearance-none"
                                                    >
                                                        <option value="Draft">Draft</option>
                                                        <option value="Active">Active Case</option>
                                                        <option value="In Admission">In Admission</option>
                                                        <option value="Discharged">Discharged</option>
                                                        <option value="Finalized">Closed / Finalized</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Department</label>
                                                <input
                                                    type="text"
                                                    value={formData.department}
                                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                    className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">District</label>
                                                <input
                                                    type="text"
                                                    value={formData.district}
                                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                                    className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {selectedPatient && (
                                        <section className="p-6 rounded-2xl bg-brand-dark-950/80 border border-white/5">
                                            <h3 className="text-[10px] font-bold text-cyber-purple uppercase tracking-[0.3em] mb-4">Patient data (saved on record)</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                <div><p className="text-gray-600 uppercase text-[9px]">National ID</p><p className="text-white font-bold">{selectedPatient.nationalId}</p></div>
                                                <div><p className="text-gray-600 uppercase text-[9px]">Gender</p><p className="text-white font-bold">{selectedPatient.gender}</p></div>
                                                <div><p className="text-gray-600 uppercase text-[9px]">Phone</p><p className="text-white font-bold">{selectedPatient.contactInfo?.phone || '—'}</p></div>
                                                <div><p className="text-gray-600 uppercase text-[9px]">Emergency contact</p><p className="text-white font-bold">{selectedPatient.contactInfo?.emergencyContact?.name || '—'}</p></div>
                                                <div className="md:col-span-2"><p className="text-gray-600 uppercase text-[9px]">Address</p><p className="text-white font-bold">{selectedPatient.contactInfo?.address || '—'}</p></div>
                                                <div><p className="text-gray-600 uppercase text-[9px]">Ward</p><p className="text-white font-bold">{selectedPatient.ward || '—'}</p></div>
                                                <div><p className="text-gray-600 uppercase text-[9px]">Insurance</p><p className="text-white font-bold">{selectedPatient.insuranceInfo?.provider || '—'}</p></div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Symptoms Section */}
                                    <section>
                                        <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-8 flex items-center">
                                            <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                            PRESENTING_SYMPTOMS
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={formData.symptomInput}
                                                    onChange={(e) => setFormData({...formData, symptomInput: e.target.value})}
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSymptom())}
                                                    className="flex-1 bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                                    placeholder="Type symptom and press Enter..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddSymptom}
                                                    className="p-4 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all"
                                                >
                                                    <PlusIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.symptoms.map((symptom, i) => (
                                                    <span key={i} className="px-4 py-2 rounded-xl bg-brand-dark-800 border border-white/5 text-[10px] font-bold text-white uppercase tracking-widest flex items-center group">
                                                        {symptom}
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleRemoveSymptom(i)}
                                                            className="ml-3 text-gray-600 hover:text-red-500 transition-colors"
                                                        >
                                                            <XMarkIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Admission/Active Progress Section (Gap: Information Sifting & Admission Support) */}
                                    {(formData.visitStatus === 'In Admission' || formData.visitStatus === 'Active' || formData.disposition === 'Admitted') && (
                                        <section className="p-8 rounded-[2rem] bg-brand-dark-950 border border-cyber-blue/20 shadow-[0_0_40px_rgba(0,242,255,0.05)]">
                                            <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-8 flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                                    ADMISSION_PROGRESS_TRACKING & LIVE MONITORING
                                                </div>
                                                <span className="px-3 py-1 rounded-lg bg-cyber-blue/10 text-[8px] border border-cyber-blue/20 uppercase tracking-widest font-black">Interactive Dataset Mode</span>
                                            </h3>

                                            {/* Existing Observations Timeline */}
                                            {formData.observations.length > 0 && (
                                                <div className="mb-10 space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                                                    {formData.observations.map((obs, idx) => (
                                                        <div key={idx} className="relative pl-8 pb-4">
                                                            <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5" />
                                                            <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-cyber-blue shadow-[0_0_10px_rgba(0,242,255,0.5)]" />

                                                            <div className="p-4 rounded-2xl bg-brand-dark-900 border border-white/5 flex flex-col md:flex-row justify-between gap-4">
                                                                <div>
                                                                    <div className="flex items-center space-x-3 mb-2">
                                                                        <span className="text-[10px] font-mono text-gray-500">{new Date(obs.timestamp).toLocaleString()}</span>
                                                                        <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                                            obs.status === 'Critical' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                                            obs.status === 'Deteriorating' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                                                                            'bg-green-500/10 border-green-500/20 text-green-500'
                                                                        }`}>{obs.status}</span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-300 italic">"{obs.notes || 'No notes recorded'}"</p>
                                                                </div>
                                                                <div className="flex gap-4">
                                                                    {obs.vitalSigns && Object.entries(obs.vitalSigns).map(([key, val]) => val && (
                                                                        <div key={key} className="text-center">
                                                                            <p className="text-[8px] text-gray-600 uppercase font-bold">{key === 'oxygenSaturation' ? 'SpO2' : key.substring(0, 4)}</p>
                                                                            <p className="text-[10px] text-white font-mono">{val}{key === 'temperature' ? '°' : key === 'oxygenSaturation' ? '%' : ''}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add New Observation Form */}
                                            <div className="p-6 rounded-2xl bg-brand-dark-900 border border-cyber-blue/10">
                                                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-6">Record New Clinical State</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-gray-600 uppercase">Temp</label>
                                                        <input 
                                                            type="number" step="0.1"
                                                            value={formData.newObservation.vitalSigns.temperature}
                                                            onChange={(e) => setFormData({
                                                                ...formData, 
                                                                newObservation: {
                                                                    ...formData.newObservation,
                                                                    vitalSigns: { ...formData.newObservation.vitalSigns, temperature: e.target.value }
                                                                }
                                                            })}
                                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-gray-600 uppercase">Heart Rate</label>
                                                        <input 
                                                            type="number"
                                                            value={formData.newObservation.vitalSigns.heartRate}
                                                            onChange={(e) => setFormData({
                                                                ...formData, 
                                                                newObservation: {
                                                                    ...formData.newObservation,
                                                                    vitalSigns: { ...formData.newObservation.vitalSigns, heartRate: e.target.value }
                                                                }
                                                            })}
                                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-gray-600 uppercase">SpO2 (%)</label>
                                                        <input 
                                                            type="number"
                                                            value={formData.newObservation.vitalSigns.oxygenSaturation}
                                                            onChange={(e) => setFormData({
                                                                ...formData, 
                                                                newObservation: {
                                                                    ...formData.newObservation,
                                                                    vitalSigns: { ...formData.newObservation.vitalSigns, oxygenSaturation: e.target.value }
                                                                }
                                                            })}
                                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-gray-600 uppercase">Patient Status</label>
                                                        <select 
                                                            value={formData.newObservation.status}
                                                            onChange={(e) => setFormData({
                                                                ...formData, 
                                                                newObservation: { ...formData.newObservation, status: e.target.value }
                                                            })}
                                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white"
                                                        >
                                                            <option value="Stable">Stable</option>
                                                            <option value="Improving">Improving</option>
                                                            <option value="Deteriorating">Deteriorating</option>
                                                            <option value="Critical">Critical</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                
                                                {/* Fluid Balance Inputs */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-6 border-t border-white/5">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-gray-600 uppercase">Fluid Intake (ml)</label>
                                                        <input 
                                                            type="number"
                                                            placeholder="e.g. 500"
                                                            value={formData.newObservation.fluidBalance.intake}
                                                            onChange={(e) => setFormData({
                                                                ...formData, 
                                                                newObservation: {
                                                                    ...formData.newObservation,
                                                                    fluidBalance: { ...formData.newObservation.fluidBalance, intake: e.target.value }
                                                                }
                                                            })}
                                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-gray-600 uppercase">Fluid Output (ml)</label>
                                                        <input 
                                                            type="number"
                                                            placeholder="e.g. 200"
                                                            value={formData.newObservation.fluidBalance.output}
                                                            onChange={(e) => setFormData({
                                                                ...formData, 
                                                                newObservation: {
                                                                    ...formData.newObservation,
                                                                    fluidBalance: { ...formData.newObservation.fluidBalance, output: e.target.value }
                                                                }
                                                            })}
                                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-gray-600 uppercase">Intake Type</label>
                                                        <input 
                                                            type="text"
                                                            placeholder="e.g. IV Fluids, Oral"
                                                            value={formData.newObservation.fluidBalance.type}
                                                            onChange={(e) => setFormData({
                                                                ...formData, 
                                                                newObservation: {
                                                                    ...formData.newObservation,
                                                                    fluidBalance: { ...formData.newObservation.fluidBalance, type: e.target.value }
                                                                }
                                                            })}
                                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <textarea 
                                                        placeholder="Clinical notes for this observation..."
                                                        value={formData.newObservation.notes}
                                                        onChange={(e) => setFormData({
                                                            ...formData, 
                                                            newObservation: { ...formData.newObservation, notes: e.target.value }
                                                        })}
                                                        className="flex-1 bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-xs text-white min-h-[60px]"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            if (!formData.newObservation.vitalSigns.temperature && !formData.newObservation.notes) {
                                                                toast.error("Enter at least temperature or a note");
                                                                return;
                                                            }
                                                            setFormData({
                                                                ...formData,
                                                                observations: [...formData.observations, { ...formData.newObservation, timestamp: new Date().toISOString() }],
                                                                newObservation: {
                                                                    timestamp: new Date().toISOString(),
                                                                    vitalSigns: { temperature: '', heartRate: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', oxygenSaturation: '', respiratoryRate: '' },
                                                                    notes: '',
                                                                    status: 'Stable'
                                                                }
                                                            });
                                                            toast.success("Observation added to queue");
                                                        }}
                                                        className="px-6 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue font-bold text-[10px] uppercase hover:bg-cyber-blue hover:text-white transition-all"
                                                    >
                                                        COMMIT STATE
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Diagnosis Section */}
                                    <section>
                                        <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-8 flex items-center">
                                            <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                            DIAGNOSTIC_ANALYSIS
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pathogen/Disease Focus</label>
                                                <input
                                                    type="text"
                                                    value={formData.disease}
                                                    onChange={(e) => setFormData({...formData, disease: e.target.value})}
                                                    className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                                    placeholder="Primary disease focus..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Clinical Outcome</label>
                                                <select
                                                    value={formData.disposition}
                                                    onChange={(e) => setFormData({...formData, disposition: e.target.value})}
                                                    className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all appearance-none"
                                                >
                                                    <option value="Discharged">Discharged</option>
                                                    <option value="Admitted">Admitted</option>
                                                    <option value="Transferred">Transferred</option>
                                                    <option value="Left Against Medical Advice">Left Against Medical Advice</option>
                                                    <option value="Deceased">Deceased</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Diagnosis Summary</label>
                                                <textarea
                                                    value={formData.primaryDiagnosis}
                                                    onChange={(e) => setFormData({...formData, primaryDiagnosis: e.target.value})}
                                                    className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all min-h-[100px]"
                                                    placeholder="Enter primary clinical diagnosis..."
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Biometric Section */}
                                    <section>
                                        <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-8 flex items-center">
                                            <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                            BIOMETRIC_DATA
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {[
                                                { label: 'TEMP (°C) *', field: 'temperature', type: 'number', step: '0.1', required: true },
                                                { label: 'SYSTOLIC', field: 'bloodPressureSystolic', type: 'number' },
                                                { label: 'DIASTOLIC', field: 'bloodPressureDiastolic', type: 'number' },
                                                { label: 'HEART RATE', field: 'heartRate', type: 'number' },
                                                { label: 'RESP RATE', field: 'respiratoryRate', type: 'number' },
                                                { label: 'SPO2 (%)', field: 'oxygenSaturation', type: 'number' },
                                                { label: 'WEIGHT (KG)', field: 'weight', type: 'number' },
                                                { label: 'HEIGHT (CM)', field: 'height', type: 'number' }
                                            ].map((v) => (
                                                <div key={v.field} className="space-y-2">
                                                    <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest ml-1">{v.label}</label>
                                                    <input
                                                        type={v.type}
                                                        step={v.step}
                                                        required={v.required}
                                                        value={formData.vitalSigns[v.field]}
                                                        onChange={(e) => handleVitalChange(v.field, e.target.value)}
                                                        onBlur={v.field === 'temperature' ? (e) => handleVitalChange('temperature', e.target.value) : undefined}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <ClinicalInvestigationsForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        uploadingImages={uploadingImages}
                                        onAddPrescription={handleAddPrescription}
                                        onRemovePrescription={handleRemovePrescription}
                                        onAddLabTest={handleAddLabTest}
                                        onRemoveLabTest={handleRemoveLabTest}
                                        onRadiologyFiles={handleRadiologyFiles}
                                        onRemoveRadiologyPreview={handleRemoveRadiologyPreview}
                                        onAddRadiology={handleAddRadiology}
                                        onRemoveRadiology={handleRemoveRadiology}
                                    />

                                    <section>
                                        <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-6 flex items-center">
                                            <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                            CLINICAL_NOTES
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">History of present illness</label>
                                                <textarea
                                                    value={formData.historyOfPresentIllness}
                                                    onChange={(e) => setFormData({ ...formData, historyOfPresentIllness: e.target.value })}
                                                    className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 min-h-[80px]"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Doctor notes</label>
                                                    <textarea
                                                        value={formData.doctorNotes}
                                                        onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 min-h-[80px]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nursing notes</label>
                                                    <textarea
                                                        value={formData.nursingNotes}
                                                        onChange={(e) => setFormData({ ...formData, nursingNotes: e.target.value })}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 min-h-[80px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Treatment & Consultants Section */}
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-8">
                                            <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] flex items-center">
                                                <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                                THERAPEUTIC_PLAN
                                            </h3>
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Medication Regimen</label>
                                                    <div className="flex gap-3">
                                                        <input
                                                            type="text"
                                                            value={formData.medicationInput}
                                                            onChange={(e) => setFormData({...formData, medicationInput: e.target.value})}
                                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMedication())}
                                                            className="flex-1 bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                                            placeholder="Type medication..."
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddMedication}
                                                            className="p-4 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all"
                                                        >
                                                            <PlusIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {formData.prescribedMedications.map((med, i) => (
                                                            <span key={i} className="px-4 py-2 rounded-xl bg-brand-dark-800 border border-white/5 text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center group">
                                                                {med}
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleRemoveMedication(i)}
                                                                    className="ml-3 text-gray-600 hover:text-red-500 transition-colors"
                                                                >
                                                                    <XMarkIcon className="h-3.5 w-3.5" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Clinical Notes</label>
                                                    <textarea
                                                        value={formData.treatmentPlan}
                                                        onChange={(e) => setFormData({...formData, treatmentPlan: e.target.value})}
                                                        className="w-full bg-brand-dark-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all min-h-[150px]"
                                                        placeholder="Enter detailed treatment plan and clinical notes..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] flex items-center">
                                                <div className="w-2 h-2 bg-cyber-blue rounded-full mr-3 animate-pulse" />
                                                NETWORK_CONSULTANTS
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="p-6 rounded-3xl bg-brand-dark-950 border border-white/5 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    {staffMembers.length > 0 ? (
                                                        staffMembers
                                                            .filter(staff => staff._id !== currentUser?._id)
                                                            .map((staff) => (
                                                            <label key={staff._id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-brand-dark-800 transition-colors cursor-pointer group">
                                                                <div className="flex items-center">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 transition-all ${formData.taggedUsers.includes(staff._id) ? 'bg-cyber-blue text-brand-dark-950' : 'bg-brand-dark-800 text-gray-500'}`}>
                                                                        <UserIcon className="h-4 w-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">{staff.firstName} {staff.lastName}</p>
                                                                        <p className="text-[8px] text-gray-500 uppercase tracking-widest font-mono mt-0.5">{staff.position || 'Specialist'}</p>
                                                                    </div>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.taggedUsers.includes(staff._id)}
                                                                    onChange={() => toggleTaggedUser(staff._id)}
                                                                    className="w-5 h-5 rounded-lg bg-brand-dark-900 border-white/10 text-cyber-blue focus:ring-cyber-blue focus:ring-offset-brand-dark-900 transition-all cursor-pointer"
                                                                />
                                                            </label>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-gray-600 uppercase tracking-widest text-center py-10 font-mono">No available consultants found</p>
                                                    )}
                                                </div>
                                                <p className="text-[8px] text-gray-600 uppercase tracking-widest font-mono px-2">Tagged consultants will receive secure access to this node.</p>
                                            </div>
                                        </div>
                                    </section>
                                </form>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 border-t border-white/5 bg-brand-dark-900/50 backdrop-blur-md flex justify-end space-x-4 sticky bottom-0 z-10">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-8 py-4 rounded-2xl bg-brand-dark-800 border border-white/5 text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-white transition-all"
                                >
                                    ABORT_OPERATION
                                </button>
                                <button
                                    type="submit"
                                    form="medical-record-form"
                                    className="px-10 py-4 rounded-2xl bg-cyber-blue text-brand-dark-950 font-bold text-[10px] uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] transition-all active:scale-95 flex items-center"
                                >
                                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                                    {editingRecord ? 'UPDATE_AND_ENCRYPT' : 'INITIALIZE_ENCRYPTION'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicalRecords;
