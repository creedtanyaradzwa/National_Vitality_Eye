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
    ClipboardDocumentListIcon
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <button onClick={() => navigate('/patient/dashboard')} className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-white group">
                    <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition" />
                    <span>Back to Dashboard</span>
                </button>

                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                        <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-8 w-8 text-white" />
                            <h1 className="text-2xl font-bold text-white">My Medical Records</h1>
                        </div>
                        <p className="text-gray-400 mt-2">{records.length} records found</p>
                    </div>
                </div>

                {/* Records List */}
                {records.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl">
                        <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400">No medical records found</p>
                        <p className="text-sm text-gray-500 mt-1">Records will appear here after your hospital visits</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {records.map((record, idx) => {
                            const isExpanded = expandedRecord === record._id;
                            const bmiCategory = getBMICategory(record.vitalSigns?.bmi);
                            
                            return (
                                <div key={record._id || idx} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                    {/* Header */}
                                    <div className="p-5 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center space-x-3 mb-3 flex-wrap gap-2">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getVisitTypeBadge(record.visitType)}`}>
                                                        {record.visitType || 'Visit'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {record.visitDate ? new Date(record.visitDate).toLocaleDateString() : 'Date N/A'}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-white">
                                                    {record.primaryDiagnosis?.name || record.disease || 'Medical Visit'}
                                                </h3>
                                                <p className="text-sm text-gray-400">
                                                    {record.hospital || 'Hospital N/A'} 
                                                    {record.doctorName ? ` • Dr. ${record.doctorName}` : ''}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setExpandedRecord(isExpanded ? null : record._id)}
                                                className="p-2 rounded-lg text-gray-400 hover:bg-white/10"
                                            >
                                                {isExpanded ? '▲' : '▼'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Basic Info - Always Visible */}
                                    <div className="p-5">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {record.symptoms?.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-500">Symptoms</p>
                                                    <p className="text-sm text-white">{record.symptoms.length} recorded</p>
                                                </div>
                                            )}
                                            {record.prescribedMedications?.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-500">Medications</p>
                                                    <p className="text-sm text-white">{record.prescribedMedications.length} prescribed</p>
                                                </div>
                                            )}
                                            {record.vitalSigns?.temperature && (
                                                <div>
                                                    <p className="text-xs text-gray-500">Temperature</p>
                                                    <p className="text-sm text-white">{record.vitalSigns.temperature}°C</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs text-gray-500">Status</p>
                                                <p className="text-sm text-white">{record.disposition || 'Completed'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details - ALL FEATURES NOW VISIBLE */}
                                    {isExpanded && (
                                        <div className="p-5 pt-0 border-t border-white/10 space-y-5">
                                            
                                            {/* ===== SYMPTOMS FULL LIST ===== */}
                                            {record.symptoms?.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2 flex items-center">
                                                        <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                                                        Symptoms
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {record.symptoms.map((s, i) => (
                                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-sm">
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== SECONDARY DIAGNOSES (NEW) ===== */}
                                            {record.secondaryDiagnoses && record.secondaryDiagnoses.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2">Secondary Diagnoses</h4>
                                                    <div className="space-y-1 ml-2">
                                                        {record.secondaryDiagnoses.map((diag, i) => (
                                                            <p key={i} className="text-gray-300 text-sm">• {diag.name || diag}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== DIFFERENTIAL DIAGNOSIS (NEW) ===== */}
                                            {record.differentialDiagnosis && record.differentialDiagnosis.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-yellow-400 mb-2 flex items-center">
                                                        <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                                                        Differential Diagnosis
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {record.differentialDiagnosis.map((diag, i) => (
                                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm">
                                                                {diag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== PHYSICAL EXAMINATION (NEW) ===== */}
                                            {record.physicalExam && Object.values(record.physicalExam).some(v => v) && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-3 flex items-center">
                                                        <HeartIcon className="h-4 w-4 mr-2" />
                                                        Physical Examination
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {record.physicalExam.general && (
                                                            <div className="bg-white/5 rounded-lg p-3">
                                                                <p className="text-xs text-gray-500">General</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.general}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.cardiovascular && (
                                                            <div className="bg-white/5 rounded-lg p-3">
                                                                <p className="text-xs text-gray-500">Cardiovascular</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.cardiovascular}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.respiratory && (
                                                            <div className="bg-white/5 rounded-lg p-3">
                                                                <p className="text-xs text-gray-500">Respiratory</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.respiratory}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.abdominal && (
                                                            <div className="bg-white/5 rounded-lg p-3">
                                                                <p className="text-xs text-gray-500">Abdominal</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.abdominal}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.neurological && (
                                                            <div className="bg-white/5 rounded-lg p-3">
                                                                <p className="text-xs text-gray-500">Neurological</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.neurological}</p>
                                                            </div>
                                                        )}
                                                        {record.physicalExam.musculoskeletal && (
                                                            <div className="bg-white/5 rounded-lg p-3">
                                                                <p className="text-xs text-gray-500">Musculoskeletal</p>
                                                                <p className="text-sm text-gray-300">{record.physicalExam.musculoskeletal}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== LABORATORY TESTS (NEW) ===== */}
                                            {record.investigations?.labTests && record.investigations.labTests.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-3 flex items-center">
                                                        <BeakerIcon className="h-4 w-4 mr-2" />
                                                        Laboratory Tests
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {record.investigations.labTests.map((test, i) => (
                                                            <div key={i} className="bg-white/5 rounded-lg p-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-semibold text-white">{test.testName}</p>
                                                                        <p className="text-sm text-gray-400">Result: {test.result}</p>
                                                                        {test.referenceRange && (
                                                                            <p className="text-xs text-gray-500">Reference: {test.referenceRange}</p>
                                                                        )}
                                                                        {test.abnormal && (
                                                                            <p className="text-xs text-red-400 mt-1">⚠️ Abnormal result</p>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{test.resultDate ? new Date(test.resultDate).toLocaleDateString() : 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== RADIOLOGY / IMAGING (NEW) ===== */}
                                            {record.investigations?.radiology && record.investigations.radiology.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-3 flex items-center">
                                                        <CameraIcon className="h-4 w-4 mr-2" />
                                                        Imaging Studies
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {record.investigations.radiology.map((study, i) => (
                                                            <div key={i} className="bg-white/5 rounded-lg p-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-semibold text-white">{study.studyType}</p>
                                                                        {study.bodyPart && <p className="text-sm text-gray-400">Body Part: {study.bodyPart}</p>}
                                                                        <p className="text-sm text-gray-400 mt-1">Findings: {study.findings}</p>
                                                                        {study.impression && <p className="text-sm text-gray-500 mt-1">Impression: {study.impression}</p>}
                                                                        <p className="text-xs text-gray-500 mt-2">{new Date(study.reportDate).toLocaleDateString()}</p>
                                                                    </div>
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
                                                                                    alt="Medical Image"
                                                                                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition border border-purple-500/30"
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

                                            {/* ===== PRESCRIBED MEDICATIONS ===== */}
                                            {record.prescribedMedications && record.prescribedMedications.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2">Prescribed Medications</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {record.prescribedMedications.map((med, i) => (
                                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm">
                                                                {med}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== TREATMENT PLAN ===== */}
                                            {record.treatmentPlan?.plan && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2">Treatment Plan</h4>
                                                    <div className="bg-white/5 rounded-lg p-3">
                                                        <p className="text-gray-300">{record.treatmentPlan.plan}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== DISCHARGE INSTRUCTIONS ===== */}
                                            {record.dischargeInstructions && (
                                                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                                    <p className="font-semibold text-blue-400 text-sm flex items-center">
                                                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                                                        Discharge Instructions
                                                    </p>
                                                    <p className="text-blue-300 text-sm mt-1">{record.dischargeInstructions}</p>
                                                </div>
                                            )}

                                            {/* ===== COMPLETE VITAL SIGNS ===== */}
                                            {record.vitalSigns && Object.keys(record.vitalSigns).some(k => record.vitalSigns[k]) && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-3 flex items-center">
                                                        <HeartIcon className="h-4 w-4 mr-2" />
                                                        Vital Signs
                                                    </h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {record.vitalSigns.temperature && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">Temperature</p>
                                                                <p className="text-sm text-white font-medium">{record.vitalSigns.temperature}°C</p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.heartRate && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">Heart Rate</p>
                                                                <p className="text-sm text-white font-medium">{record.vitalSigns.heartRate} bpm</p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.respiratoryRate && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">Respiratory Rate</p>
                                                                <p className="text-sm text-white font-medium">{record.vitalSigns.respiratoryRate} /min</p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.oxygenSaturation && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">O₂ Saturation</p>
                                                                <p className="text-sm text-white font-medium">{record.vitalSigns.oxygenSaturation}%</p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.bloodPressure?.systolic && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">Blood Pressure</p>
                                                                <p className="text-sm text-white font-medium">{record.vitalSigns.bloodPressure.systolic}/{record.vitalSigns.bloodPressure.diastolic}</p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.weight && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">Weight</p>
                                                                <p className="text-sm text-white font-medium">{record.vitalSigns.weight} kg</p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.height && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">Height</p>
                                                                <p className="text-sm text-white font-medium">{record.vitalSigns.height} cm</p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.bmi && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">BMI</p>
                                                                <p className={`text-sm font-medium ${bmiCategory?.color || 'text-white'}`}>
                                                                    {record.vitalSigns.bmi} {bmiCategory && `(${bmiCategory.label})`}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {record.vitalSigns.painScore !== undefined && (
                                                            <div className="bg-white/5 rounded-lg p-2 text-center">
                                                                <p className="text-xs text-gray-500">Pain Score</p>
                                                                <p className={`text-sm font-medium ${getPainScoreColor(record.vitalSigns.painScore)}`}>
                                                                    {record.vitalSigns.painScore}/10
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== ADDITIONAL NOTES ===== */}
                                            {record.notes && (
                                                <div>
                                                    <h4 className="font-semibold text-purple-400 mb-2">Additional Notes</h4>
                                                    <div className="bg-white/5 rounded-lg p-3">
                                                        <p className="text-gray-300 text-sm">{record.notes}</p>
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