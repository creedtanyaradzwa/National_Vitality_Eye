import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChatBubbleLeftRightIcon, 
    ExclamationTriangleIcon, 
    MapPinIcon, 
    BellAlertIcon,
    PlusIcon,
    CheckCircleIcon,
    XMarkIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ShieldExclamationIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const CitizenSurveillance = () => {
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reportForm, setReportForm] = useState({
        location: {
            province: '',
            district: '',
            ward: '',
            village: ''
        },
        symptoms: [],
        currentSymptom: '',
        isAnonymous: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }

            // Load profile for location data
            const profileRes = await fetch(`${PORTAL_API}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const profileData = await profileRes.json();
            
            if (profileRes.ok) {
                const p = profileData.patient;
                setPatient(p);
                setReportForm(prev => ({
                    ...prev,
                    location: { ...prev.location, province: p.province || '' }
                }));

                // Load alerts
                const province = p.province || '';
                const district = p.district || '';
                const ward = p.ward || '';
                
                let url = `${PORTAL_API}/surveillance/alerts?province=${province}`;
                if (district) url += `&district=${district}`;
                if (ward) url += `&ward=${ward}`;

                const alertsRes = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (alertsRes.ok) {
                    const alertData = await alertsRes.json();
                    setAlerts(alertData.alerts || []);
                }
            }
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Could not load surveillance data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSymptom = () => {
        if (reportForm.currentSymptom.trim()) {
            setReportForm(prev => ({
                ...prev,
                symptoms: [...prev.symptoms, prev.currentSymptom.trim().toLowerCase()],
                currentSymptom: ''
            }));
        }
    };

    const handleRemoveSymptom = (index) => {
        setReportForm(prev => ({
            ...prev,
            symptoms: prev.symptoms.filter((_, i) => i !== index)
        }));
    };

    const handleSubmitReport = async () => {
        if (reportForm.symptoms.length === 0) {
            toast.error("Please add at least one symptom.");
            return;
        }
        if (!reportForm.location.district) {
            toast.error("Please provide your district.");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('patientToken');
            const res = await fetch(`${PORTAL_API}/surveillance/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reportForm)
            });

            if (res.ok) {
                toast.success("Community signal submitted. Rapid Response Team notified.");
                setShowReportModal(false);
                setReportForm(prev => ({
                    ...prev,
                    symptoms: [],
                    currentSymptom: '',
                    isAnonymous: true
                }));
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to submit report.");
            }
        } catch (error) {
            toast.error("Connection error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-8">
            {/* Navigation Header */}
            <div className="mb-10">
                <button 
                    onClick={() => navigate('/patient/dashboard')} 
                    className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition" />
                    <span className="text-xs font-bold uppercase tracking-wider">Back to Home</span>
                </button>
            </div>

            {/* Page Title */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mb-10">
                <div className="flex justify-between items-center flex-wrap gap-6">
                    <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <MapPinIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Community Health</h1>
                            <p className="text-slate-400 font-medium mt-1">
                                Real-time health signals and localized alerts for your area.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                        Report Symptoms
                    </button>
                </div>
            </div>

            {/* Localized Alerts Section */}
            <div className="mb-12">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                    <BellAlertIcon className="h-4 w-4 text-emerald-400" />
                    Localized Health Alerts
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {alerts.length > 0 ? (
                        alerts.map((alert, idx) => (
                            <div key={idx} className="bg-slate-900/40 border border-rose-500/20 rounded-3xl p-6 hover:bg-slate-900/60 transition-all">
                                <div className="flex items-start gap-6">
                                    <div className="p-4 rounded-2xl bg-rose-500/10 shadow-inner">
                                        <ExclamationTriangleIcon className="h-8 w-8 text-rose-400 animate-pulse" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                                                Active Alert: {alert.location?.district || alert.location?.province}
                                            </p>
                                            <span className="px-3 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20">
                                                {alert.severity}
                                            </span>
                                        </div>
                                        <h3 className="text-white font-bold text-xl">{alert.disease} Warning</h3>
                                        
                                        {alert.recommendations?.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                {alert.recommendations.map((rec, i) => (
                                                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-white/5">
                                                        <CheckCircleIcon className="h-4 w-4 text-emerald-500 mt-0.5" />
                                                        <p className="text-xs text-slate-300 font-medium leading-relaxed">{rec}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl p-10 flex items-center gap-6 col-span-2">
                            <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-xl">Area Status: Secure</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">No active health threats detected in {patient?.district || patient?.province || 'your area'}.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Health Hub Card */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active Intelligence</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                        Interactive Health Surveillance
                    </h2>
                    <p className="text-slate-400 font-medium leading-relaxed max-w-2xl">
                        Our AI system monitors community signals to detect outbreaks before they spread. 
                        By reporting symptoms in your village or ward, you help protect your community. 
                        Localized water-safety and health alerts are automatically shared with affected areas.
                    </p>
                </div>
                
                <div className="flex flex-col gap-4 w-full md:w-auto">
                    <div className="p-6 rounded-2xl bg-slate-950 border border-white/5 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp Health Bridge</p>
                        <p className="text-lg font-bold text-emerald-400">+263 77 000 0000</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-slate-950 border border-white/5 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">USSD Access Code</p>
                        <p className="text-lg font-bold text-blue-400">*123#</p>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-emerald-500/10">
                                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Report Symptoms</h2>
                                    <p className="text-xs font-medium text-slate-500">Help the system detect local health patterns.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <XMarkIcon className="h-6 w-6 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                            {/* Location Section */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Incident Location</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] text-slate-600 font-bold ml-1">District</p>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Central"
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                                            value={reportForm.location.district}
                                            onChange={e => setReportForm({...reportForm, location: {...reportForm.location, district: e.target.value}})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] text-slate-600 font-bold ml-1">Ward / Village</p>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Ward 4"
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                                            value={reportForm.location.ward}
                                            onChange={e => setReportForm({...reportForm, location: {...reportForm.location, ward: e.target.value}})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Symptoms Section */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Symptoms to Report</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add symptom (e.g. Cough, Fever)"
                                        className="flex-1 bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                                        value={reportForm.currentSymptom}
                                        onChange={e => setReportForm({...reportForm, currentSymptom: e.target.value})}
                                        onKeyPress={e => e.key === 'Enter' && handleAddSymptom()}
                                    />
                                    <button 
                                        onClick={handleAddSymptom}
                                        className="px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                    >
                                        <PlusIcon className="h-6 w-6" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {reportForm.symptoms.map((s, i) => (
                                        <span key={i} className="px-4 py-2 bg-slate-950 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-3 group">
                                            {s}
                                            <XMarkIcon 
                                                className="h-4 w-4 text-slate-600 hover:text-rose-400 cursor-pointer" 
                                                onClick={() => handleRemoveSymptom(i)}
                                            />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-3">
                                <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider font-bold">
                                    Reports are encrypted and verified by AI. Multiple reports from the same area trigger Rapid Response protocols.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5">
                            <button 
                                onClick={handleSubmitReport}
                                disabled={submitting}
                                className="w-full py-4 bg-emerald-500 rounded-2xl text-white font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Transmitting Signal...' : 'Submit Community Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CitizenSurveillance;