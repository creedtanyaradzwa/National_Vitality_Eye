import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, getPatientRecords, createMedicalRecord, updateMedicalRecord, deleteMedicalRecord } from '../services/api';
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
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const MedicalRecords = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { refreshData } = useDataRefresh();
    const canCreate = hasPermission('create:records');
    const canEdit = hasPermission('edit:records');
    const canDelete = hasPermission('delete:records');
    
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [records, setRecords] = useState([]);
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
        // Physical Exam
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
        // Lab Tests
        labTests: [],
        labTestInput: { testName: '', result: '', referenceRange: '', abnormal: false },
        // Radiology
        radiology: [],
        radiologyInput: { 
            studyType: '', 
            bodyPart: '',
            findings: '', 
            impression: '',
            previewImages: []
        },
        // Vital Signs
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
            province: selectedPatient.province || '',
            notes: '',
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
            primaryDiagnosis: record.primaryDiagnosis?.name || record.diagnosis || '',
            disease: record.disease || '',
            prescribedMedications: record.prescribedMedications || [],
            medicationInput: '',
            treatmentPlan: record.treatmentPlan?.plan || '',
            disposition: record.disposition || 'Discharged',
            dischargeInstructions: record.dischargeInstructions || '',
            province: record.province || selectedPatient?.province || '',
            notes: record.notes || '',
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

    // Image upload handler
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const previewImages = files.map(file => ({
            file: file,
            preview: URL.createObjectURL(file),
            name: file.name
        }));
        
        setFormData(prev => ({
            ...prev,
            radiologyInput: {
                ...prev.radiologyInput,
                previewImages: [...(prev.radiologyInput.previewImages || []), ...previewImages]
            }
        }));
    };

    // Remove preview image
    const removePreviewImage = (index) => {
        setFormData(prev => ({
            ...prev,
            radiologyInput: {
                ...prev.radiologyInput,
                previewImages: prev.radiologyInput.previewImages.filter((_, i) => i !== index)
            }
        }));
    };

    // Remove image from saved radiology study
    const removeImageFromRadiology = (studyIndex, imageIndex) => {
        setFormData(prev => ({
            ...prev,
            radiology: prev.radiology.map((study, idx) => {
                if (idx === studyIndex) {
                    return {
                        ...study,
                        images: study.images.filter((_, i) => i !== imageIndex)
                    };
                }
                return study;
            })
        }));
    };

    // Add radiology study with images
    const addRadiologyWithImages = async () => {
        if (!formData.radiologyInput.studyType) {
            toast.error('Please select a study type');
            return;
        }
        
        const newStudy = {
            studyType: formData.radiologyInput.studyType,
            bodyPart: formData.radiologyInput.bodyPart,
            findings: formData.radiologyInput.findings,
            impression: formData.radiologyInput.impression,
            images: [],
            reportDate: new Date()
        };
        
        // Upload images if any
        if (formData.radiologyInput.previewImages && formData.radiologyInput.previewImages.length > 0) {
            setUploadingImages(true);
            const uploadFormData = new FormData();
            uploadFormData.append('patientId', selectedPatient._id);
            uploadFormData.append('studyType', formData.radiologyInput.studyType);
            
            formData.radiologyInput.previewImages.forEach(img => {
                uploadFormData.append('images', img.file);
            });
            
            try {
                const token = localStorage.getItem('token');
                const uploadRes = await fetch('http://localhost:5000/medical-records/upload-images', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: uploadFormData
                });
                
                const uploadedImages = await uploadRes.json();
                if (uploadedImages.images) {
                    newStudy.images = uploadedImages.images;
                    toast.success(`${uploadedImages.images.length} image(s) uploaded`);
                }
            } catch (error) {
                console.error('Image upload failed:', error);
                toast.error('Failed to upload images');
            } finally {
                setUploadingImages(false);
            }
        }
        
        setFormData(prev => ({
            ...prev,
            radiology: [...prev.radiology, newStudy],
            radiologyInput: { 
                studyType: '', 
                bodyPart: '', 
                findings: '', 
                impression: '', 
                previewImages: [] 
            }
        }));
    };

    const addSymptom = () => {
        if (formData.symptomInput.trim()) {
            setFormData(prev => ({
                ...prev,
                symptoms: [...prev.symptoms, prev.symptomInput.trim()],
                symptomInput: ''
            }));
        }
    };

    const removeSymptom = (index) => {
        setFormData(prev => ({
            ...prev,
            symptoms: prev.symptoms.filter((_, i) => i !== index)
        }));
    };

    const addMedication = () => {
        if (formData.medicationInput.trim()) {
            setFormData(prev => ({
                ...prev,
                prescribedMedications: [...prev.prescribedMedications, formData.medicationInput.trim()],
                medicationInput: ''
            }));
        }
    };

    const removeMedication = (index) => {
        setFormData(prev => ({
            ...prev,
            prescribedMedications: prev.prescribedMedications.filter((_, i) => i !== index)
        }));
    };

    const addDifferentialDiagnosis = () => {
        if (formData.differentialInput.trim()) {
            setFormData(prev => ({
                ...prev,
                differentialDiagnosis: [...prev.differentialDiagnosis, prev.differentialInput.trim()],
                differentialInput: ''
            }));
        }
    };

    const removeDifferentialDiagnosis = (index) => {
        setFormData(prev => ({
            ...prev,
            differentialDiagnosis: prev.differentialDiagnosis.filter((_, i) => i !== index)
        }));
    };

    const addLabTest = () => {
        if (formData.labTestInput.testName) {
            setFormData(prev => ({
                ...prev,
                labTests: [...prev.labTests, { ...formData.labTestInput, orderedDate: new Date() }],
                labTestInput: { testName: '', result: '', referenceRange: '', abnormal: false }
            }));
        }
    };

    const removeLabTest = (index) => {
        setFormData(prev => ({
            ...prev,
            labTests: prev.labTests.filter((_, i) => i !== index)
        }));
    };

    const calculateBMI = (weight, height) => {
        if (weight && height && height > 0) {
            const heightInMeters = height / 100;
            return (weight / (heightInMeters * heightInMeters)).toFixed(1);
        }
        return '';
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

    const handlePhysicalExamChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            physicalExam: { ...prev.physicalExam, [field]: value }
        }));
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
                refreshData();
            } else {
                await createMedicalRecord(recordData);
                toast.success('Medical record created successfully');
                refreshData();
            }
            
            setShowModal(false);
            const response = await getPatientRecords(selectedPatient._id);
            setRecords(response.data);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const getVisitTypeBadge = (type) => {
        const colors = {
            Emergency: 'bg-red-500/20 text-red-400 border-red-500/30',
            Outpatient: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            Inpatient: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            'Follow-up': 'bg-green-500/20 text-green-400 border-green-500/30',
            Consultation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
        return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    const getDispositionBadge = (type) => {
        const colors = {
            Discharged: 'bg-green-500/20 text-green-400 border-green-500/30',
            Admitted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            Transferred: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'Left Against Medical Advice': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            Deceased: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
        return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    const visitTypes = ['Emergency', 'Outpatient', 'Inpatient', 'Follow-up', 'Consultation'];
    const dispositions = ['Discharged', 'Admitted', 'Transferred', 'Left Against Medical Advice', 'Deceased'];
    const provinces = [
        'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
        'Mashonaland East', 'Mashonaland West', 'Masvingo',
        'Matabeleland North', 'Matabeleland South', 'Midlands'
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <DocumentTextIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <DocumentTextIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Medical Records</h1>
                            <p className="text-gray-400">Complete patient medical history with vitals, exams, and investigations</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Patient Search Section */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Select Patient</h2>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by National ID or Name"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-2"
                    >
                        <MagnifyingGlassIcon className="h-5 w-5" />
                        <span>Search</span>
                    </button>
                </div>

                {selectedPatient && (
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <p className="text-sm text-purple-400">Selected Patient</p>
                                <p className="font-semibold text-white text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                <p className="text-sm text-gray-400">National ID: {selectedPatient.nationalId}</p>
                                <p className="text-sm text-gray-400">Province: {selectedPatient.province}</p>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => navigate(`/patients/${selectedPatient._id}/vitals-trend`)}
                                    className="relative px-5 py-2.5 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2"
                                >
                                    <ChartBarIcon className="h-5 w-5" />
                                    <span>View Vitals Trend</span>
                                </button>
                                {canCreate && (
                                    <button
                                        onClick={handleAddRecord}
                                        className="relative px-5 py-2.5 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 flex items-center space-x-2"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                        <span>Add Medical Record</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Medical Records List */}
            {selectedPatient && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">Medical History</h2>
                        <p className="text-sm text-gray-400">{records.length} records found</p>
                    </div>
                    
                    {records.length === 0 ? (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
                            <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-400">No medical records found for this patient</p>
                            <p className="text-sm text-gray-500 mt-1">Click "Add Medical Record" to create one</p>
                        </div>
                    ) : (
                        records.map((record) => {
                            const isExpanded = expandedRecord === record._id;
                            return (
                                <div key={record._id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300">
                                    {/* Card Header */}
                                    <div className="p-5 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-3 flex-wrap gap-2">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getVisitTypeBadge(record.visitType)}`}>
                                                        {record.visitType}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getDispositionBadge(record.disposition)}`}>
                                                        {record.disposition}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                                    <div className="flex items-center space-x-1">
                                                        <CalendarIcon className="h-4 w-4 text-purple-400" />
                                                        <span>{new Date(record.visitDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <BuildingOfficeIcon className="h-4 w-4 text-purple-400" />
                                                        <span>{record.hospital || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <UserIcon className="h-4 w-4 text-purple-400" />
                                                        <span>Dr. {record.doctorName || 'Unknown'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleEditRecord(record)}
                                                        className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all duration-300"
                                                        title="Edit Record"
                                                    >
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteRecord(record)}
                                                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all duration-300"
                                                        title="Delete Record"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setExpandedRecord(isExpanded ? null : record._id)}
                                                    className="p-2 rounded-lg text-gray-400 hover:bg-white/10 transition-all duration-300"
                                                >
                                                    {isExpanded ? '▲' : '▼'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Always Visible Content */}
                                    <div className="p-5">
                                        <div className="mb-4">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <BeakerIcon className="h-4 w-4 text-purple-400" />
                                                <h3 className="font-semibold text-white">Primary Diagnosis</h3>
                                            </div>
                                            <p className="text-gray-300 ml-6">{record.primaryDiagnosis?.name || record.diagnosis || 'N/A'}</p>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
                                            {record.symptoms && record.symptoms.length > 0 && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Symptoms</p>
                                                    <p className="text-sm text-white font-semibold">{record.symptoms.length}</p>
                                                </div>
                                            )}
                                            {record.prescribedMedications && record.prescribedMedications.length > 0 && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Medications</p>
                                                    <p className="text-sm text-white font-semibold">{record.prescribedMedications.length}</p>
                                                </div>
                                            )}
                                            {record.vitalSigns?.temperature && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Temp</p>
                                                    <p className="text-sm text-white font-semibold">{record.vitalSigns.temperature}°C</p>
                                                </div>
                                            )}
                                            {record.vitalSigns?.bloodPressure?.systolic && (
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">BP</p>
                                                    <p className="text-sm text-white font-semibold">{record.vitalSigns.bloodPressure.systolic}/{record.vitalSigns.bloodPressure.diastolic}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="p-5 pt-0 border-t border-white/10 space-y-4">
                                            {/* Symptoms */}
                                            {record.symptoms && record.symptoms.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2 flex items-center">
                                                        <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                                                        Symptoms
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {record.symptoms.map((symptom, idx) => (
                                                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-sm">
                                                                {symptom}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Differential Diagnosis */}
                                            {record.differentialDiagnosis && record.differentialDiagnosis.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-yellow-400 mb-2 flex items-center">
                                                        <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                                                        Differential Diagnosis
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {record.differentialDiagnosis.map((diag, idx) => (
                                                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm">
                                                                {diag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Physical Examination */}
                                            {record.physicalExam && Object.values(record.physicalExam).some(v => v) && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-3 flex items-center">
                                                        <HeartIcon className="h-4 w-4 mr-2" />
                                                        Physical Examination
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {record.physicalExam.general && (
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <p className="text-xs text-gray-500">General</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.general}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.cardiovascular && (
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <p className="text-xs text-gray-500">Cardiovascular</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.cardiovascular}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.respiratory && (
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <p className="text-xs text-gray-500">Respiratory</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.respiratory}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.abdominal && (
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <p className="text-xs text-gray-500">Abdominal</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.abdominal}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.neurological && (
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <p className="text-xs text-gray-500">Neurological</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.neurological}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.musculoskeletal && (
                                                            <div className="bg-white/5 rounded-lg p-2">
                                                                <p className="text-xs text-gray-500">Musculoskeletal</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.musculoskeletal}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Lab Tests */}
                                            {record.investigations?.labTests && record.investigations.labTests.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-3 flex items-center">
                                                        <BeakerIcon className="h-4 w-4 mr-2" />
                                                        Laboratory Tests
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {record.investigations.labTests.map((test, idx) => (
                                                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                                                                <div className="flex justify-between">
                                                                    <div>
                                                                        <p className="font-semibold text-white">{test.testName}</p>
                                                                        <p className="text-sm text-gray-400">Result: {test.result}</p>
                                                                        {test.referenceRange && <p className="text-xs text-gray-500">Reference: {test.referenceRange}</p>}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{new Date(test.orderedDate).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Radiology with Images */}
                                            {record.investigations?.radiology && record.investigations.radiology.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-3 flex items-center">
                                                        <CameraIcon className="h-4 w-4 mr-2" />
                                                        Radiology / Imaging
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {record.investigations.radiology.map((study, idx) => (
                                                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-semibold text-white">{study.studyType}</p>
                                                                        {study.bodyPart && <p className="text-sm text-gray-400">Body Part: {study.bodyPart}</p>}
                                                                        <p className="text-sm text-gray-400">Findings: {study.findings}</p>
                                                                        {study.impression && <p className="text-sm text-gray-500">Impression: {study.impression}</p>}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{new Date(study.reportDate).toLocaleDateString()}</p>
                                                                </div>
                                                                
                                                                {/* Display Images */}
                                                                {study.images && study.images.length > 0 && (
                                                                    <div className="mt-3">
                                                                        <p className="text-xs text-gray-400 mb-2">Attached Images ({study.images.length})</p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {study.images.map((img, imgIdx) => (
                                                                                <img 
                                                                                    key={imgIdx}
                                                                                    src={`http://localhost:5000${img.url}`} 
                                                                                    alt={img.originalName}
                                                                                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                                                                                    onClick={() => window.open(`http://localhost:5000${img.url}`, '_blank')}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Medications */}
                                            {record.prescribedMedications && record.prescribedMedications.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2">Prescribed Medications</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {record.prescribedMedications.map((med, idx) => (
                                                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm">
                                                                {med}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Treatment Plan */}
                                            {record.treatmentPlan?.plan && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2">Treatment Plan</h4>
                                                    <p className="text-gray-300">{record.treatmentPlan.plan}</p>
                                                </div>
                                            )}

                                            {/* Discharge Instructions */}
                                            {record.dischargeInstructions && (
                                                <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                                    <p className="font-semibold text-blue-400 text-sm">Discharge Instructions</p>
                                                    <p className="text-blue-300 text-sm">{record.dischargeInstructions}</p>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {record.notes && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2">Additional Notes</h4>
                                                    <p className="text-gray-300 text-sm">{record.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-5xl mx-4">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-white/10 sticky top-0 bg-slate-900/95">
                                <h2 className="text-2xl font-bold text-white">
                                    {editingRecord ? 'Edit Medical Record' : 'Add Medical Record'}
                                </h2>
                                <p className="text-gray-400 mt-1">
                                    Patient: {selectedPatient?.firstName} {selectedPatient?.lastName}
                                </p>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Hospital *</label>
                                        <input type="text" value={formData.hospital} onChange={(e) => setFormData(prev => ({ ...prev, hospital: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Doctor Name</label>
                                        <input type="text" value={formData.doctorName} onChange={(e) => setFormData(prev => ({ ...prev, doctorName: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Visit Date *</label>
                                        <input type="date" value={formData.visitDate} onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Visit Type</label>
                                        <select value={formData.visitType} onChange={(e) => setFormData(prev => ({ ...prev, visitType: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                                            {visitTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Vital Signs */}
                                <div className="border-t border-white/10 pt-4">
                                    <h3 className="text-lg font-semibold text-purple-400 mb-3">Vital Signs</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Temperature (°C)</label>
                                            <input type="number" step="0.1" value={formData.vitalSigns.temperature} onChange={(e) => handleVitalChange('temperature', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Heart Rate (bpm)</label>
                                            <input type="number" value={formData.vitalSigns.heartRate} onChange={(e) => handleVitalChange('heartRate', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Systolic BP (mmHg)</label>
                                            <input type="number" value={formData.vitalSigns.bloodPressureSystolic} onChange={(e) => handleVitalChange('bloodPressureSystolic', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Diastolic BP (mmHg)</label>
                                            <input type="number" value={formData.vitalSigns.bloodPressureDiastolic} onChange={(e) => handleVitalChange('bloodPressureDiastolic', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
                                            <input type="number" step="0.1" value={formData.vitalSigns.weight} onChange={(e) => handleVitalChange('weight', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Height (cm)</label>
                                            <input type="number" step="0.1" value={formData.vitalSigns.height} onChange={(e) => handleVitalChange('height', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">BMI (auto-calculated)</label>
                                            <input type="text" value={formData.vitalSigns.bmi} disabled className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Pain Score (0-10)</label>
                                            <input type="number" min="0" max="10" value={formData.vitalSigns.painScore} onChange={(e) => handleVitalChange('painScore', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Symptoms */}
                                <div className="border-t border-white/10 pt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Symptoms</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" value={formData.symptomInput} onChange={(e) => setFormData(prev => ({ ...prev, symptomInput: e.target.value }))} onKeyPress={(e) => e.key === 'Enter' && addSymptom()} className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Enter a symptom" />
                                        <button type="button" onClick={addSymptom} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.symptoms.map((symptom, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-sm flex items-center space-x-1">
                                                <span>{symptom}</span>
                                                <button type="button" onClick={() => removeSymptom(idx)} className="text-red-400 ml-1">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Diagnosis */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Primary Diagnosis *</label>
                                        <input type="text" value={formData.primaryDiagnosis} onChange={(e) => setFormData(prev => ({ ...prev, primaryDiagnosis: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Disease Category</label>
                                        <input type="text" value={formData.disease} onChange={(e) => setFormData(prev => ({ ...prev, disease: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                    </div>
                                </div>

                                {/* Differential Diagnosis */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                                        <ExclamationTriangleIcon className="h-4 w-4 mr-1 text-yellow-400" />
                                        Differential Diagnosis
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" value={formData.differentialInput} onChange={(e) => setFormData(prev => ({ ...prev, differentialInput: e.target.value }))} onKeyPress={(e) => e.key === 'Enter' && addDifferentialDiagnosis()} className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Enter differential diagnosis" />
                                        <button type="button" onClick={addDifferentialDiagnosis} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.differentialDiagnosis.map((diag, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm flex items-center space-x-1">
                                                <span>{diag}</span>
                                                <button type="button" onClick={() => removeDifferentialDiagnosis(idx)} className="text-red-400 ml-1">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Physical Examination */}
                                <div>
                                    <h3 className="text-lg font-semibold text-purple-400 mb-3">Physical Examination</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">General Appearance</label>
                                            <textarea value={formData.physicalExam.general} onChange={(e) => handlePhysicalExamChange('general', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="General appearance..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Cardiovascular</label>
                                            <textarea value={formData.physicalExam.cardiovascular} onChange={(e) => handlePhysicalExamChange('cardiovascular', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Heart sounds, murmurs..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Respiratory</label>
                                            <textarea value={formData.physicalExam.respiratory} onChange={(e) => handlePhysicalExamChange('respiratory', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Breath sounds..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Abdominal</label>
                                            <textarea value={formData.physicalExam.abdominal} onChange={(e) => handlePhysicalExamChange('abdominal', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Tenderness, masses..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Neurological</label>
                                            <textarea value={formData.physicalExam.neurological} onChange={(e) => handlePhysicalExamChange('neurological', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="CNS, reflexes..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Musculoskeletal</label>
                                            <textarea value={formData.physicalExam.musculoskeletal} onChange={(e) => handlePhysicalExamChange('musculoskeletal', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Joints, range of motion..." />
                                        </div>
                                    </div>
                                </div>

                                {/* Lab Tests */}
                                <div>
                                    <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                                        <BeakerIcon className="h-4 w-4 mr-2" />
                                        Laboratory Tests
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                                        <input type="text" placeholder="Test Name" value={formData.labTestInput.testName} onChange={(e) => setFormData(prev => ({ ...prev, labTestInput: { ...prev.labTestInput, testName: e.target.value } }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        <input type="text" placeholder="Result" value={formData.labTestInput.result} onChange={(e) => setFormData(prev => ({ ...prev, labTestInput: { ...prev.labTestInput, result: e.target.value } }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        <input type="text" placeholder="Reference Range" value={formData.labTestInput.referenceRange} onChange={(e) => setFormData(prev => ({ ...prev, labTestInput: { ...prev.labTestInput, referenceRange: e.target.value } }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                        <button type="button" onClick={addLabTest} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all">Add Test</button>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {formData.labTests.map((test, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-white">{test.testName}</p>
                                                    <p className="text-sm text-gray-400">Result: {test.result} {test.referenceRange && `(Ref: ${test.referenceRange})`}</p>
                                                </div>
                                                <button type="button" onClick={() => removeLabTest(idx)} className="text-red-400 text-sm">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Radiology with Image Upload */}
                                <div className="border-t border-white/10 pt-4">
                                    <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                                        <CameraIcon className="h-5 w-5 mr-2" />
                                        Radiology / Imaging
                                    </h3>
                                    
                                    {/* Radiology List */}
                                    <div className="space-y-3 mb-4">
                                        {formData.radiology.map((study, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{study.studyType}</p>
                                                        {study.bodyPart && <p className="text-sm text-gray-400">Body Part: {study.bodyPart}</p>}
                                                        <p className="text-sm text-gray-400">Findings: {study.findings}</p>
                                                        {study.impression && <p className="text-sm text-gray-500">Impression: {study.impression}</p>}
                                                    </div>
                                                    <button type="button" onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            radiology: prev.radiology.filter((_, i) => i !== idx)
                                                        }));
                                                    }} className="text-red-400 text-sm">Remove</button>
                                                </div>
                                                
                                                {/* Display Images */}
                                                {study.images && study.images.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-xs text-gray-400 mb-2">Attached Images ({study.images.length})</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {study.images.map((img, imgIdx) => (
                                                                <div key={imgIdx} className="relative group">
                                                                    <img 
                                                                        src={`http://localhost:5000${img.url}`} 
                                                                        alt={img.originalName}
                                                                        className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                                                                        onClick={() => window.open(`http://localhost:5000${img.url}`, '_blank')}
                                                                    />
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => removeImageFromRadiology(idx, imgIdx)}
                                                                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hidden group-hover:block"
                                                                    >
                                                                        <XMarkIcon className="h-3 w-3 text-white" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Add New Radiology Study */}
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <h4 className="font-semibold text-white mb-3">Add New Imaging Study</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <select 
                                                value={formData.radiologyInput.studyType} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, radiologyInput: { ...prev.radiologyInput, studyType: e.target.value } }))}
                                                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                                            >
                                                <option value="">Select Study Type</option>
                                                <option value="X-Ray">X-Ray</option>
                                                <option value="CT Scan">CT Scan</option>
                                                <option value="MRI">MRI</option>
                                                <option value="Ultrasound">Ultrasound</option>
                                                <option value="Mammogram">Mammogram</option>
                                                <option value="PET Scan">PET Scan</option>
                                                <option value="Fluoroscopy">Fluoroscopy</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            
                                            <input 
                                                type="text" 
                                                placeholder="Body Part (e.g., Chest, Knee, Brain)" 
                                                value={formData.radiologyInput.bodyPart || ''} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, radiologyInput: { ...prev.radiologyInput, bodyPart: e.target.value } }))}
                                                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                                            />
                                        </div>
                                        
                                        <textarea 
                                            placeholder="Findings" 
                                            value={formData.radiologyInput.findings || ''} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, radiologyInput: { ...prev.radiologyInput, findings: e.target.value } }))}
                                            rows={2} 
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white mb-3"
                                        />
                                        
                                        <textarea 
                                            placeholder="Impression / Conclusion" 
                                            value={formData.radiologyInput.impression || ''} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, radiologyInput: { ...prev.radiologyInput, impression: e.target.value } }))}
                                            rows={2} 
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white mb-3"
                                        />
                                        
                                        {/* Image Upload */}
                                        <div className="mb-3">
                                            <label className="block text-sm text-gray-400 mb-2">Upload Images (X-ray, CT, MRI, etc.)</label>
                                            <div className="border-2 border-dashed border-white/30 rounded-lg p-4 text-center hover:border-purple-500 transition cursor-pointer"
                                                 onClick={() => document.getElementById('imageUpload').click()}>
                                                <CameraIcon className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                                                <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                                                <p className="text-xs text-gray-500 mt-1">JPG, PNG, DICOM up to 20MB each</p>
                                            </div>
                                            <input 
                                                type="file" 
                                                id="imageUpload"
                                                multiple
                                                accept="image/jpeg,image/png,image/jpg,image/dicom,application/dicom"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                            />
                                            
                                            {/* Preview uploaded images */}
                                            {formData.radiologyInput.previewImages && formData.radiologyInput.previewImages.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {formData.radiologyInput.previewImages.map((img, idx) => (
                                                        <div key={idx} className="relative">
                                                            <img src={img.preview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                                                            <button 
                                                                type="button"
                                                                onClick={() => removePreviewImage(idx)}
                                                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                                                            >
                                                                <XMarkIcon className="h-3 w-3 text-white" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <button 
                                            type="button" 
                                            onClick={addRadiologyWithImages}
                                            disabled={uploadingImages}
                                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all disabled:opacity-50"
                                        >
                                            {uploadingImages ? 'Uploading...' : 'Add Study'}
                                        </button>
                                    </div>
                                </div>

                                {/* Medications */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Prescribed Medications</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" value={formData.medicationInput} onChange={(e) => setFormData(prev => ({ ...prev, medicationInput: e.target.value }))} onKeyPress={(e) => e.key === 'Enter' && addMedication()} className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Enter medication" />
                                        <button type="button" onClick={addMedication} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.prescribedMedications.map((med, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm flex items-center space-x-1">
                                                <span>{med}</span>
                                                <button type="button" onClick={() => removeMedication(idx)} className="text-red-400 ml-1">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Treatment Plan */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Treatment Plan</label>
                                    <textarea value={formData.treatmentPlan} onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))} rows={3} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Describe the treatment plan..." />
                                </div>

                                {/* Disposition & Province */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Disposition</label>
                                        <select value={formData.disposition} onChange={(e) => setFormData(prev => ({ ...prev, disposition: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                                            {dispositions.map(disp => <option key={disp} value={disp}>{disp}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Province</label>
                                        <select value={formData.province} onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                                            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Discharge Instructions */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Discharge Instructions</label>
                                    <textarea value={formData.dischargeInstructions} onChange={(e) => setFormData(prev => ({ ...prev, dischargeInstructions: e.target.value }))} rows={2} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Additional Notes</label>
                                    <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                </div>

                                {/* Form Buttons */}
                                <div className="flex justify-end space-x-3 pt-4 border-t border-white/10 sticky bottom-0 bg-slate-900/95 py-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Cancel</button>
                                    <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg">
                                        {editingRecord ? 'Update' : 'Create'} Medical Record
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalRecords;