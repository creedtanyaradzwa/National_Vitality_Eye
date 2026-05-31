import React, { useState, useEffect } from 'react';
import { predictDisease, getPatientRisk, getPatientByNationalId, getPatients, getAIStatus, getAISymptoms } from '../services/api';
import { useAuth } from '../context/AuthProvider';
import { 
    BeakerIcon, 
    MagnifyingGlassIcon,
    UserIcon,
    ChartBarIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XMarkIcon,
    SparklesIcon,
    CpuChipIcon,
    ArrowPathIcon,
    HeartIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    TagIcon,
    FunnelIcon,
    Squares2X2Icon,
    ListBulletIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AIPredictor = () => {
    const { hasPermission } = useAuth();
    const canUseAI = hasPermission('use:ai_predictor');
    
    const [symptoms, setSymptoms] = useState([]);
    const [allSymptoms, setAllSymptoms] = useState([]);
    const [symptomSearch, setSymptomSearch] = useState('');
    const [viewMode, setViewMode] = useState('common'); // 'common' or 'all'
    const [symptomInput, setSymptomInput] = useState('');
    const [province, setProvince] = useState('Harare');
    const [_patientId, setPatientId] = useState('');
    const [patientSearch, setPatientSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [riskAssessment, setRiskAssessment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('predict');
    const [vitals, setVitals] = useState({
        temperature: '',
        heartRate: '',
        systolicBP: '',
        diastolicBP: '',
        oxygenSaturation: '',
        respiratoryRate: ''
    });

    const provinces = [
        'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
        'Mashonaland East', 'Mashonaland West', 'Masvingo',
        'Matabeleland North', 'Matabeleland South', 'Midlands'
    ];

    const commonSymptoms = [
        'cough', 'fever', 'blurred vision', 'vomiting', 'dizziness', 
        'shortness of breath', 'unexplained weight loss', 'headache',
        'diarrhoea', 'abdominal pain', 'skin redness', 'heartburn',
        'pallor', 'itching', 'wheezing', 'excessive thirst',
        'nausea', 'constipation', 'bloating', 'fatigue'
    ];

    useEffect(() => {
        loadAIStatus();
        loadAllSymptoms();
    }, []);

    const loadAIStatus = async () => {
        try {
            const response = await getAIStatus();
            setAiStatus(response.data);
        } catch (error) {
            console.error('Failed to load AI status', error);
        }
    };

    const loadAllSymptoms = async () => {
        try {
            const response = await getAISymptoms();
            if (response.data.symptoms) {
                setAllSymptoms(response.data.symptoms);
            }
        } catch (error) {
            console.error('Failed to load symptoms', error);
        }
    };

    const filteredSymptoms = allSymptoms.filter(s => 
        s.toLowerCase().includes(symptomSearch.toLowerCase())
    );

    const addSymptom = () => {
        if (symptomInput.trim() && !symptoms.includes(symptomInput.trim().toLowerCase())) {
            setSymptoms([...symptoms, symptomInput.trim().toLowerCase()]);
            setSymptomInput('');
        }
    };

    const removeSymptom = (symptom) => {
        setSymptoms(symptoms.filter(s => s !== symptom));
    };

    const handleVitalsChange = (e) => {
        const { name, value } = e.target;
        setVitals(prev => ({ ...prev, [name]: value }));
    };

    const handlePredict = async () => {
        if (symptoms.length === 0) {
            toast.error('Please add at least one symptom');
            return;
        }

        setLoading(true);
        try {
            // Convert vitals to numbers where possible
            const formattedVitals = {};
            Object.entries(vitals).forEach(([key, val]) => {
                if (val !== '') formattedVitals[key] = parseFloat(val);
            });

            const requestData = {
                symptoms: symptoms,
                province: province,
                vitals: formattedVitals
            };
            
            if (selectedPatient) {
                requestData.patientId = selectedPatient._id;
            }
            
            const response = await predictDisease(requestData);
            setPredictions(response.data);
            toast.success('AI prediction complete!');
        } catch (error) {
            toast.error('Failed to get prediction');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const searchPatient = async () => {
        if (!patientSearch.trim()) {
            toast.error('Please enter a name or National ID');
            return;
        }
        
        setLoading(true);
        try {
            const response = await getPatients(1, 10, patientSearch);
            const results = response.data.patients || [];
            
            if (results.length > 0) {
                // If there's an exact match on National ID, pick it
                const exactMatch = results.find(p => p.nationalId.toLowerCase() === patientSearch.toLowerCase());
                const patient = exactMatch || results[0];
                
                setSelectedPatient(patient);
                setPatientId(patient._id);
                
                if (exactMatch || results.length === 1) {
                    toast.success(`Patient found: ${patient.firstName} ${patient.lastName}`);
                } else {
                    toast.info(`Found ${results.length} matches. Selected: ${patient.firstName} ${patient.lastName}`);
                }
                
                const riskResponse = await getPatientRisk(patient._id);
                setRiskAssessment(riskResponse.data);
            } else {
                toast.error('Patient not found');
                setSelectedPatient(null);
                setRiskAssessment(null);
            }
        } catch (error) {
            toast.error('Error searching for patient');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const clearPatient = () => {
        setSelectedPatient(null);
        setPatientSearch('');
        setPatientId('');
        setRiskAssessment(null);
    };

    const getRiskColor = (level) => {
        switch(level) {
            case 'CRITICAL': return 'from-red-600 to-red-700';
            case 'HIGH': return 'from-orange-500 to-red-500';
            case 'MODERATE': return 'from-yellow-500 to-orange-500';
            case 'LOW': return 'from-green-500 to-emerald-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getConfidenceBarColor = (confidence) => {
        if (confidence >= 70) return 'bg-gradient-to-r from-green-500 to-emerald-500';
        if (confidence >= 50) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
        if (confidence >= 30) return 'bg-gradient-to-r from-orange-500 to-red-500';
        return 'bg-gradient-to-r from-red-500 to-pink-500';
    };

    const getConfidenceTextColor = (confidence) => {
        if (confidence >= 70) return 'text-green-400';
        if (confidence >= 50) return 'text-yellow-400';
        if (confidence >= 30) return 'text-orange-400';
        return 'text-red-400';
    };

    if (!canUseAI) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 p-[1px]">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-12 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                            <ShieldCheckIcon className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                        <p className="text-gray-400">
                            You don't have permission to use the AI Predictor.
                            Please contact your administrator to upgrade your role.
                        </p>
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
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <BeakerIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">AI Disease Predictor</h1>
                                <p className="text-gray-400">Powered by real-time machine learning with Vital Signs, Chronic Conditions & Family History</p>
                            </div>
                        </div>
                        <button 
                            onClick={loadAIStatus}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                        >
                            <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Status Banner */}
            {aiStatus && (
                <div className="rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-4 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className={`w-3 h-3 rounded-full ${aiStatus.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                    {aiStatus.status === 'active' && (
                                        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">
                                    AI Status: <span className={aiStatus.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>
                                        {aiStatus.status === 'active' ? 'Active' : 'Initializing'}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-400">
                                    Learning from {aiStatus.stats?.totalRecords || 0} medical records • 
                                    Tracking {aiStatus.stats?.diseasesTracked || 0} diseases
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CpuChipIcon className="h-4 w-4 text-purple-400" />
                            <span className="text-xs text-purple-400">Enhanced: Vital Signs + Chronic Conditions + Family History</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab('predict')}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                        activeTab === 'predict'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                >
                    <BeakerIcon className="h-5 w-5" />
                    <span>Disease Prediction</span>
                </button>
                <button
                    onClick={() => setActiveTab('risk')}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                        activeTab === 'risk'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                >
                    <ShieldCheckIcon className="h-5 w-5" />
                    <span>Risk Assessment</span>
                </button>
            </div>

            {/* Disease Prediction Tab */}
            {activeTab === 'predict' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <ClipboardDocumentListIcon className="h-4 w-4 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Enter Symptoms</h2>
                        </div>
                        
                        {/* Patient Context */}
                        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Optional: Link to Patient (for better accuracy)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search by Name or National ID"
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && searchPatient()}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    onClick={searchPatient}
                                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
                                >
                                    <MagnifyingGlassIcon className="h-5 w-5" />
                                </button>
                            </div>
                            {selectedPatient && (
                                <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-purple-400">Selected Patient</p>
                                        <p className="font-semibold text-white">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                        <p className="text-xs text-gray-400">ID: {selectedPatient.nationalId}</p>
                                        {selectedPatient.clinicalProfile?.chronicConditions?.length > 0 && (
                                            <p className="text-xs text-orange-400 mt-1">
                                                ⚠️ {selectedPatient.clinicalProfile.chronicConditions.length} chronic condition(s)
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={clearPatient}
                                        className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-all duration-300"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Symptoms Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-sm font-medium text-gray-300">Add Symptoms</label>
                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => setViewMode('common')}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-300 flex items-center ${
                                            viewMode === 'common' 
                                                ? 'bg-purple-500 text-white shadow-sm' 
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <Squares2X2Icon className="h-3 w-3 mr-1" />
                                        Common
                                    </button>
                                    <button
                                        onClick={() => setViewMode('all')}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-300 flex items-center ${
                                            viewMode === 'all' 
                                                ? 'bg-purple-500 text-white shadow-sm' 
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <ListBulletIcon className="h-3 w-3 mr-1" />
                                        All ({allSymptoms.length})
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Direct Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={symptomInput}
                                        onChange={(e) => setSymptomInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                                        className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="Type a symptom..."
                                    />
                                    <button
                                        onClick={addSymptom}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Symptom Selection Area */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 min-h-[160px]">
                                    {viewMode === 'all' && (
                                        <div className="relative mb-3">
                                            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Search all recorded symptoms..."
                                                value={symptomSearch}
                                                onChange={(e) => setSymptomSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {viewMode === 'common' ? (
                                            commonSymptoms.map((symptom) => (
                                                <button
                                                    key={symptom}
                                                    onClick={() => {
                                                        if (!symptoms.includes(symptom.toLowerCase())) {
                                                            setSymptoms([...symptoms, symptom.toLowerCase()]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                                                        symptoms.includes(symptom.toLowerCase())
                                                            ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                                            : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {symptom}
                                                </button>
                                            ))
                                        ) : (
                                            filteredSymptoms.length > 0 ? (
                                                filteredSymptoms.map((symptom) => (
                                                    <button
                                                        key={symptom}
                                                        onClick={() => {
                                                            if (!symptoms.includes(symptom.toLowerCase())) {
                                                                setSymptoms([...symptoms, symptom.toLowerCase()]);
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                                                            symptoms.includes(symptom.toLowerCase())
                                                                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                                                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
                                                        }`}
                                                    >
                                                        {symptom}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="w-full py-8 text-center">
                                                    <FunnelIcon className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                                                    <p className="text-gray-500 text-xs">No symptoms matching "{symptomSearch}"</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Selected Symptoms Chips */}
                        {symptoms.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center space-x-2 mb-3">
                                    <TagIcon className="h-4 w-4 text-purple-400" />
                                    <label className="text-sm font-medium text-gray-300">Current Assessment ({symptoms.length})</label>
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                    {symptoms.map((symptom, idx) => (
                                        <span key={idx} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-sm flex items-center border border-purple-500/20">
                                            {symptom}
                                            <button
                                                onClick={() => removeSymptom(symptom)}
                                                className="ml-2 hover:text-white transition-colors"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        </span>
                                    ))}
                                    <button 
                                        onClick={() => setSymptoms([])}
                                        className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Vital Signs Section */}
                        <div className="mb-6">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                    <HeartIcon className="h-4 w-4 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Vital Signs</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Temp (°C)</label>
                                    <input
                                        type="number"
                                        name="temperature"
                                        value={vitals.temperature}
                                        onChange={handleVitalsChange}
                                        step="0.1"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                                        placeholder="36.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Heart Rate (bpm)</label>
                                    <input
                                        type="number"
                                        name="heartRate"
                                        value={vitals.heartRate}
                                        onChange={handleVitalsChange}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                                        placeholder="72"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Systolic BP</label>
                                    <input
                                        type="number"
                                        name="systolicBP"
                                        value={vitals.systolicBP}
                                        onChange={handleVitalsChange}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                                        placeholder="120"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Diastolic BP</label>
                                    <input
                                        type="number"
                                        name="diastolicBP"
                                        value={vitals.diastolicBP}
                                        onChange={handleVitalsChange}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                                        placeholder="80"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">SpO₂ (%)</label>
                                    <input
                                        type="number"
                                        name="oxygenSaturation"
                                        value={vitals.oxygenSaturation}
                                        onChange={handleVitalsChange}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                                        placeholder="98"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Resp Rate</label>
                                    <input
                                        type="number"
                                        name="respiratoryRate"
                                        value={vitals.respiratoryRate}
                                        onChange={handleVitalsChange}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                                        placeholder="16"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Province */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Province</label>
                            <select
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                            >
                                {provinces.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Predict Button */}
                        <button
                            onClick={handlePredict}
                            disabled={loading || symptoms.length === 0}
                            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Analyzing...
                                </div>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <SparklesIcon className="h-5 w-5 mr-2" />
                                    Predict Disease
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Results Section */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <ChartBarIcon className="h-4 w-4 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white">AI Predictions</h2>
                        </div>
                        
                        {predictions ? (
                            <div>
                                <div className="mb-4 p-3 rounded-lg bg-white/5 text-sm text-gray-400 flex items-center justify-between">
                                    <span>Based on {predictions.basedOnRecords} medical records</span>
                                    <span className="text-xs text-purple-400">{predictions.enhancedWith?.join(' + ') || 'AI Model v3.0'}</span>
                                </div>
                                
                                {predictions.predictions.map((pred, index) => (
                                    <div key={index} className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-lg font-bold text-white">{pred.disease}</h3>
                                            <span className={`text-2xl font-bold ${getConfidenceTextColor(pred.confidence)}`}>
                                                {pred.confidence}%
                                            </span>
                                        </div>
                                        
                                        <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                                            <div 
                                                className={`${getConfidenceBarColor(pred.confidence)} rounded-full h-2 transition-all duration-500`}
                                                style={{ width: `${pred.confidence}%` }}
                                            />
                                        </div>
                                        
                                        <div className="text-sm text-gray-400 space-y-2">
                                            <p className="flex items-center">
                                                <ChartBarIcon className="h-4 w-4 mr-2 text-purple-400" />
                                                Cases in database: {pred.totalCases}
                                            </p>
                                            {pred.outcomeRates && (
                                                <p className="flex items-center">
                                                    <CheckCircleIcon className="h-4 w-4 mr-2 text-green-400" />
                                                    Recovery rate: {pred.outcomeRates.recoveryRate}%
                                                </p>
                                            )}
                                            
                                            {/* Expected Vital Signs */}
                                            {pred.expectedVitalSigns && pred.expectedVitalSigns.temperature && (
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <p className="font-semibold text-purple-400 text-xs mb-2 flex items-center">
                                                        <HeartIcon className="h-3 w-3 mr-1" />
                                                        Typical Vital Signs for this condition:
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        {pred.expectedVitalSigns.temperature && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Temperature:</span>
                                                                <span className="text-white">{pred.expectedVitalSigns.temperature.toFixed(1)}°C</span>
                                                            </div>
                                                        )}
                                                        {pred.expectedVitalSigns.heartRate && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Heart Rate:</span>
                                                                <span className="text-white">{pred.expectedVitalSigns.heartRate.toFixed(0)} bpm</span>
                                                            </div>
                                                        )}
                                                        {pred.expectedVitalSigns.bloodPressure?.systolic && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Blood Pressure:</span>
                                                                <span className="text-white">{pred.expectedVitalSigns.bloodPressure.systolic.toFixed(0)}/{pred.expectedVitalSigns.bloodPressure.diastolic?.toFixed(0)}</span>
                                                            </div>
                                                        )}
                                                        {pred.expectedVitalSigns.oxygenSaturation && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">O₂ Saturation:</span>
                                                                <span className="text-white">{pred.expectedVitalSigns.oxygenSaturation.toFixed(0)}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Common Chronic Conditions */}
                                            {pred.commonChronicConditions && pred.commonChronicConditions.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <p className="font-semibold text-purple-400 text-xs mb-2 flex items-center">
                                                        <DocumentTextIcon className="h-3 w-3 mr-1" />
                                                        Commonly associated with:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {pred.commonChronicConditions.map((cc, i) => (
                                                            <span key={i} className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                                                                {cc.condition} ({cc.prevalence}%)
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {pred.reasons && pred.reasons.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <p className="font-semibold text-gray-300 mb-2">Why:</p>
                                                    <ul className="list-disc list-inside text-xs text-gray-500 space-y-1">
                                                        {pred.reasons.slice(0, 4).map((reason, i) => (
                                                            <li key={i}>{reason}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
                                    <p>⚠️ This is an AI-assisted prediction based on historical data including vital signs, chronic conditions, and family history.</p>
                                    <p>Always verify with clinical diagnosis and professional medical judgment.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <BeakerIcon className="h-10 w-10 text-gray-600" />
                                </div>
                                <p className="text-gray-400">Enter symptoms and click "Predict Disease"</p>
                                <p className="text-sm text-gray-500 mt-1">AI will analyze symptoms, vital signs, chronic conditions & family history</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Risk Assessment Tab */}
            {activeTab === 'risk' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Patient Search */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Patient Risk Assessment</h2>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Search Patient by Name or National ID</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter name or ID"
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && searchPatient()}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    onClick={searchPatient}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                                >
                                    <MagnifyingGlassIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {selectedPatient && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h3 className="font-semibold text-white mb-3">Patient Information</h3>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-gray-400">Name:</span> <span className="text-white">{selectedPatient.firstName} {selectedPatient.lastName}</span></p>
                                    <p><span className="text-gray-400">National ID:</span> <span className="text-white">{selectedPatient.nationalId}</span></p>
                                    <p><span className="text-gray-400">Age:</span> <span className="text-white">{selectedPatient.age || 'N/A'}</span></p>
                                    <p><span className="text-gray-400">Gender:</span> <span className="text-white">{selectedPatient.gender}</span></p>
                                    <p><span className="text-gray-400">Province:</span> <span className="text-white">{selectedPatient.province}</span></p>
                                    
                                    {/* Display chronic conditions if any */}
                                    {selectedPatient.clinicalProfile?.chronicConditions?.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                            <p className="text-orange-400 text-xs font-semibold">Chronic Conditions:</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {selectedPatient.clinicalProfile.chronicConditions.map((c, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                                                        {c.condition}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Display family history if any */}
                                    {(selectedPatient.clinicalProfile?.familyHistory?.mother?.length > 0 || 
                                      selectedPatient.clinicalProfile?.familyHistory?.father?.length > 0 ||
                                      selectedPatient.clinicalProfile?.familyHistory?.siblings?.length > 0) && (
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                            <p className="text-purple-400 text-xs font-semibold">Family History:</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {[...(selectedPatient.clinicalProfile.familyHistory.mother || []),
                                                  ...(selectedPatient.clinicalProfile.familyHistory.father || []),
                                                  ...(selectedPatient.clinicalProfile.familyHistory.siblings || [])].map((condition, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                                                        {condition}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Risk Results */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <HeartIcon className="h-4 w-4 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Risk Assessment Results</h2>
                        </div>
                        
                        {riskAssessment ? (
                            <div>
                                <div className={`p-6 rounded-xl text-center mb-6 bg-gradient-to-r ${getRiskColor(riskAssessment.riskLevel)}`}>
                                    <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-3 text-white" />
                                    <h3 className="text-2xl font-bold text-white">{riskAssessment.riskLevel}</h3>
                                    <p className="text-white/90 text-lg mt-1">Risk Score: {riskAssessment.riskScore}</p>
                                    {riskAssessment.enhancedAnalysis && (
                                        <p className="text-white/70 text-xs mt-2">Enhanced with Vital Signs & Chronic Conditions</p>
                                    )}
                                </div>
                                
                                {riskAssessment.riskFactors && riskAssessment.riskFactors.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-white mb-3">Risk Factors</h3>
                                        <ul className="space-y-2">
                                            {riskAssessment.riskFactors.slice(0, 8).map((factor, idx) => (
                                                <li key={idx} className="text-sm text-gray-400 flex items-start">
                                                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                                                    {factor}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {riskAssessment.recommendations && riskAssessment.recommendations.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-white mb-3">Recommendations</h3>
                                        <ul className="space-y-2">
                                            {riskAssessment.recommendations.map((rec, idx) => (
                                                <li key={idx} className="text-sm text-green-400 flex items-start">
                                                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="mt-4 p-3 rounded-xl bg-white/5 text-xs text-gray-500 space-y-1">
                                    <p>📊 Based on {riskAssessment.basedOnRecords} medical records</p>
                                    <p>📅 Last visit: {riskAssessment.lastVisit ? new Date(riskAssessment.lastVisit).toLocaleDateString() : 'N/A'}</p>
                                    {riskAssessment.chronicConditionsCount > 0 && (
                                        <p>🏥 Chronic conditions: {riskAssessment.chronicConditionsCount}</p>
                                    )}
                                    {riskAssessment.familyHistoryCount > 0 && (
                                        <p>👨‍👩‍👧‍👦 Family history conditions: {riskAssessment.familyHistoryCount}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <ShieldCheckIcon className="h-10 w-10 text-gray-600" />
                                </div>
                                <p className="text-gray-400">Search for a patient to see risk assessment</p>
                                <p className="text-sm text-gray-500 mt-1">AI will analyze patient history including vital signs, chronic conditions, and family history</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIPredictor;