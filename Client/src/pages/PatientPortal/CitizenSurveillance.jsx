import React, { useState, useEffect } from 'react';
import { 
    ChatBubbleLeftRightIcon, 
    ExclamationTriangleIcon, 
    MapPinIcon, 
    BellAlertIcon,
    PlusIcon,
    CheckCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient/surveillance';

const CitizenSurveillance = ({ patient }) => {
    const [alerts, setAlerts] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reportForm, setReportForm] = useState({
        location: {
            province: patient?.province || '',
            district: '',
            ward: '',
            village: ''
        },
        symptoms: [],
        currentSymptom: '',
        isAnonymous: true
    });

    useEffect(() => {
        loadLocalAlerts();
    }, [patient]);

    const loadLocalAlerts = async () => {
        try {
            const province = patient?.province || '';
            const district = patient?.district || '';
            const ward = patient?.ward || '';
            
            let url = `${PORTAL_API}/alerts?province=${province}`;
            if (district) url += `&district=${district}`;
            if (ward) url += `&ward=${ward}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts || []);
            }
        } catch (error) {
            console.error("Failed to load local alerts", error);
        }
    };

    const handleAddSymptom = () => {
        if (reportForm.currentSymptom.trim()) {
            setReportForm(prev => ({
                ...prev,
                symptoms: [...prev.symptoms, prev.currentSymptom.trim()],
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

        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            const res = await fetch(`${PORTAL_API}/report`, {
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
                setReportForm({
                    location: { province: patient?.province || '', district: '', ward: '', village: '' },
                    symptoms: [],
                    currentSymptom: '',
                    isAnonymous: true
                });
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to submit report.");
            }
        } catch (error) {
            toast.error("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Community Health Surveillance</h2>
                <button 
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 text-[10px] font-bold uppercase tracking-widest text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all"
                >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    Report Symptoms
                </button>
            </div>

            {/* Localized Alerts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.length > 0 ? (
                    alerts.map((alert, idx) => (
                        <div key={idx} className="glass-card-modern p-5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-2xl bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                    <BellAlertIcon className="h-6 w-6 text-red-500 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Active Threat: {alert.location?.district || alert.location?.province}</p>
                                        <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest border border-red-500/30">
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-black text-base">{alert.disease} Outbreak Detected</h3>
                                    
                                    {/* Actionable Recommendations */}
                                    {alert.recommendations?.length > 0 ? (
                                        <div className="mt-3 space-y-2">
                                            {alert.recommendations.map((rec, i) => (
                                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                                                    <CheckCircleIcon className="h-3.5 w-3.5 text-cyber-green mt-0.5" />
                                                    <p className="text-[11px] text-gray-300 font-medium">{rec}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-[11px] mt-2 leading-relaxed">
                                            High probability outbreak detected. Follow standard hygiene protocols and report any symptoms immediately.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-card-modern p-6 border border-white/5 flex items-center gap-5 col-span-2">
                        <div className="p-4 rounded-2xl bg-cyber-green/10 border border-cyber-green/20">
                            <CheckCircleIcon className="h-8 w-8 text-cyber-green" />
                        </div>
                        <div>
                            <p className="text-white font-black text-lg">Safe Zone: {patient?.province || 'your area'}</p>
                            <p className="text-[11px] text-gray-500 uppercase tracking-[0.3em] font-bold">No active community threats detected</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Public Health Bot Bridge (Simulated WhatsApp/USSD Experience) */}
            <div className="glass-card-modern p-8 border border-cyber-blue/20 bg-cyber-blue/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyber-blue/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-cyber-blue/10 transition-all duration-700" />
                
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-blue/10 border border-cyber-blue/20">
                            <span className="h-2 w-2 rounded-full bg-cyber-blue animate-pulse" />
                            <span className="text-[10px] font-black text-cyber-blue uppercase tracking-widest">Public Health Bot v2.0</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                            Interactive Surveillance Bridge
                        </h2>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
                            Our AI-integrated bot automatically broadcasts localized water-safety alerts to citizens in affected wards. 
                            Report unusual symptoms directly to Rapid Response Teams via this two-way communication channel.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-brand-dark-900 border border-white/5">
                                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-cyber-blue" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">WhatsApp ID: +263 77 000 0000</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-brand-dark-900 border border-white/5">
                                    <span className="text-[10px] font-bold text-cyber-purple">*123#</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">USSD Access Code</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-auto flex flex-col gap-3">
                        <button 
                            onClick={() => setShowReportModal(true)}
                            className="px-8 py-4 bg-cyber-blue text-brand-dark-950 font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-cyber-blue/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Report Symptoms Now
                        </button>
                        <button 
                            className="px-8 py-4 bg-brand-dark-900 border border-white/10 text-white font-black uppercase tracking-[0.2em] rounded-xl hover:bg-brand-dark-800 transition-all flex items-center justify-center gap-3"
                        >
                            <BellAlertIcon className="h-5 w-5 text-gray-400" />
                            Alert History
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
                    <div className="glass-card-modern w-full max-w-lg border border-white/10 overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 bg-brand-dark-900/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20">
                                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-cyber-blue" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white">Community Report</h2>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Help the AI detect outbreaks early</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <XMarkIcon className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Location Section */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-cyber-blue uppercase tracking-widest">Where are symptoms occurring?</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="District (e.g. Central)"
                                        className="bg-brand-dark-950 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-cyber-blue/30 outline-none"
                                        value={reportForm.location.district}
                                        onChange={e => setReportForm({...reportForm, location: {...reportForm.location, district: e.target.value}})}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Ward/Village"
                                        className="bg-brand-dark-950 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-cyber-blue/30 outline-none"
                                        value={reportForm.location.ward}
                                        onChange={e => setReportForm({...reportForm, location: {...reportForm.location, ward: e.target.value}})}
                                    />
                                </div>
                            </div>

                            {/* Symptoms Section */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-cyber-blue uppercase tracking-widest">What symptoms are being reported?</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add symptom (e.g. Diarrhea, Rash)"
                                        className="flex-1 bg-brand-dark-950 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-cyber-blue/30 outline-none"
                                        value={reportForm.currentSymptom}
                                        onChange={e => setReportForm({...reportForm, currentSymptom: e.target.value})}
                                        onKeyPress={e => e.key === 'Enter' && handleAddSymptom()}
                                    />
                                    <button 
                                        onClick={handleAddSymptom}
                                        className="p-3 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl text-cyber-blue"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {reportForm.symptoms.map((s, i) => (
                                        <span key={i} className="px-3 py-1 bg-brand-dark-900 border border-white/5 rounded-lg text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2 group">
                                            {s}
                                            <XMarkIcon 
                                                className="h-3 w-3 text-gray-600 hover:text-red-500 cursor-pointer" 
                                                onClick={() => handleRemoveSymptom(i)}
                                            />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                                <ExclamationTriangleIcon className="h-4 w-4 text-orange-400" />
                                <p className="text-[9px] text-gray-400 leading-relaxed uppercase tracking-wider">
                                    Reports are verified by AI and health teams. Multiple reports from an area lower the outbreak detection threshold.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-brand-dark-900/50 border-t border-white/5">
                            <button 
                                onClick={handleSubmitReport}
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-cyber-blue to-cyber-purple rounded-xl text-white font-black uppercase tracking-[0.2em] shadow-lg shadow-cyber-blue/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                            >
                                {loading ? 'Transmitting Signal...' : 'Send Community Signal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CitizenSurveillance;
