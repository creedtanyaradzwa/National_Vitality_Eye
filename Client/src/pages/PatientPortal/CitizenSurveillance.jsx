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
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = `${import.meta.env.VITE_API_URL}/api/patient`;

const CitizenSurveillance = () => {
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reportForm, setReportForm] = useState({
        location: { province: '', district: '', ward: '', village: '' },
        symptoms: [],
        currentSymptom: '',
        isAnonymous: true,
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const h = { Authorization: `Bearer ${token}` };

            const profileRes = await fetch(`${PORTAL_API}/profile`, { headers: h });
            const profileData = await profileRes.json();
            if (profileRes.ok) {
                const p = profileData.patient;
                setPatient(p);
                setReportForm(prev => ({ ...prev, location: { ...prev.location, province: p.province || '' } }));

                const province  = p.province  || '';
                const district  = p.district  || '';
                const ward      = p.ward      || '';
                let url = `${PORTAL_API}/surveillance/alerts?province=${province}`;
                if (district) url += `&district=${district}`;
                if (ward)     url += `&ward=${ward}`;

                const alertsRes = await fetch(url, { headers: h });
                if (alertsRes.ok) {
                    const alertData = await alertsRes.json();
                    setAlerts(alertData.alerts || []);
                }
            }
        } catch (error) {
            console.error('Failed to load data', error);
            toast.error('Could not load surveillance data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSymptom = () => {
        const s = reportForm.currentSymptom.trim();
        if (s) {
            setReportForm(prev => ({ ...prev, symptoms: [...prev.symptoms, s.toLowerCase()], currentSymptom: '' }));
        }
    };

    const handleRemoveSymptom = (index) => {
        setReportForm(prev => ({ ...prev, symptoms: prev.symptoms.filter((_, i) => i !== index) }));
    };

    const handleSubmitReport = async () => {
        if (reportForm.symptoms.length === 0) { toast.error('Please add at least one symptom.'); return; }
        if (!reportForm.location.district)    { toast.error('Please provide your district.'); return; }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('patientToken');
            const res = await fetch(`${PORTAL_API}/surveillance/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(reportForm),
            });
            if (res.ok) {
                toast.success('Community signal submitted. Rapid Response Team notified.');
                setShowReportModal(false);
                setReportForm(prev => ({ ...prev, symptoms: [], currentSymptom: '', isAnonymous: true }));
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to submit report.');
            }
        } catch {
            toast.error('Connection error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-cyber-blue/20 border-t-cyber-blue animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8">
            {/* Back */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/patient/dashboard')}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Home</span>
                </button>
            </div>

            {/* Header */}
            <div className="bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 mb-8">
                <div className="flex justify-between items-center flex-wrap gap-6">
                    <div className="flex items-center gap-5">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 rounded-xl bg-cyber-blue/20 blur-lg" />
                            <div className="relative w-14 h-14 rounded-xl bg-brand-dark-950 border border-cyber-blue/30 flex items-center justify-center">
                                <MapPinIcon className="h-7 w-7 text-cyber-blue" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Community Health</h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">
                                Real-time health signals and localized alerts for your area
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20 hover:bg-cyber-blue/20 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        Report Symptoms
                    </button>
                </div>
            </div>

            {/* AI assistant intro */}
            <div className="bg-cyber-blue/5 border border-cyber-blue/10 rounded-xl p-5 mb-8 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center flex-shrink-0">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-cyber-blue" />
                </div>
                <div>
                    <h3 className="text-[9px] font-black text-cyber-blue uppercase tracking-[0.2em] mb-1">Public Health Assistant</h3>
                    <p className="text-gray-300 text-sm leading-relaxed font-medium">
                        "I monitor environmental signals and community reports to keep you safe. Below are active alerts for{' '}
                        <span className="text-white font-black">{patient?.district || patient?.province || 'your region'}</span>.
                        You can also report symptoms anonymously to help our Rapid Response teams."
                    </p>
                </div>
            </div>

            {/* Localized alerts */}
            <div className="mb-8">
                <h2 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                    <BellAlertIcon className="h-4 w-4 text-cyber-blue" />
                    Localized Health Alerts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.length > 0 ? alerts.map((alert, idx) => (
                        <div key={idx} className="bg-brand-dark-900/60 border border-red-500/20 rounded-2xl p-6 hover:bg-brand-dark-900/80 transition-all">
                            <div className="flex items-start gap-5">
                                <div className="p-3 rounded-xl bg-red-500/10 flex-shrink-0">
                                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                                            Active Alert: {alert.location?.district || alert.location?.province}
                                        </p>
                                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-wider border border-red-500/20">
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-black text-base tracking-tight">{alert.disease} Warning</h3>
                                    {alert.recommendations?.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            {alert.recommendations.map((rec, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-brand-dark-950 border border-white/5">
                                                    <CheckCircleIcon className="h-4 w-4 text-cyber-green mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-gray-300 font-medium leading-relaxed">{rec}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 bg-brand-dark-900/40 border border-dashed border-white/10 rounded-2xl p-10 flex items-center gap-6">
                            <div className="p-4 rounded-xl bg-cyber-green/10 border border-cyber-green/20">
                                <CheckCircleIcon className="h-8 w-8 text-cyber-green" />
                            </div>
                            <div>
                                <p className="text-white font-black text-base uppercase tracking-tight">Area Status: Secure</p>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    No active health threats detected in {patient?.district || patient?.province || 'your area'}.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info hub */}
            <div className="bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-blue/10 border border-cyber-blue/20 mb-5">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyber-blue animate-pulse" />
                        <span className="text-[9px] font-black text-cyber-blue uppercase tracking-widest">Active Intelligence</span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter mb-3 uppercase">Interactive Health Surveillance</h2>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-2xl">
                        Our AI system monitors community signals to detect outbreaks before they spread.
                        By reporting symptoms in your village or ward, you help protect your community.
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto flex-shrink-0">
                    <div className="p-5 rounded-xl bg-brand-dark-950 border border-white/5 text-center">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">WhatsApp Health Bridge</p>
                        <p className="text-base font-black text-cyber-blue">+263 77 000 0000</p>
                    </div>
                    <div className="p-5 rounded-xl bg-brand-dark-950 border border-white/5 text-center">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">USSD Access Code</p>
                        <p className="text-base font-black text-cyber-purple">*123#</p>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-brand-dark-950/80">
                    <div className="bg-brand-dark-900 border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20">
                                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-cyber-blue" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white uppercase tracking-tight">Report Symptoms</h2>
                                    <p className="text-xs font-medium text-gray-500">Help detect local health patterns.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <XMarkIcon className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            {/* Location */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Incident Location</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[9px] text-gray-600 font-black mb-1 ml-1">District</p>
                                        <input
                                            type="text"
                                            placeholder="e.g. Central"
                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                            value={reportForm.location.district}
                                            onChange={e => setReportForm({ ...reportForm, location: { ...reportForm.location, district: e.target.value } })}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-gray-600 font-black mb-1 ml-1">Ward / Village</p>
                                        <input
                                            type="text"
                                            placeholder="e.g. Ward 4"
                                            className="w-full bg-brand-dark-950 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                            value={reportForm.location.ward}
                                            onChange={e => setReportForm({ ...reportForm, location: { ...reportForm.location, ward: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Symptoms */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Symptoms to Report</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. Cough, Fever"
                                        className="flex-1 bg-brand-dark-950 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-cyber-blue/30 transition-all"
                                        value={reportForm.currentSymptom}
                                        onChange={e => setReportForm({ ...reportForm, currentSymptom: e.target.value })}
                                        onKeyPress={e => e.key === 'Enter' && handleAddSymptom()}
                                    />
                                    <button
                                        onClick={handleAddSymptom}
                                        className="px-4 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl text-cyber-blue hover:bg-cyber-blue/20 transition-all"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {reportForm.symptoms.map((s, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-brand-dark-950 border border-white/5 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            {s}
                                            <XMarkIcon className="h-3 w-3 text-gray-600 hover:text-red-400 cursor-pointer" onClick={() => handleRemoveSymptom(i)} />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-cyber-blue/5 rounded-xl border border-cyber-blue/10 flex items-start gap-3">
                                <InformationCircleIcon className="h-4 w-4 text-cyber-blue flex-shrink-0 mt-0.5" />
                                <p className="text-[9px] text-gray-500 leading-relaxed uppercase tracking-wider font-black">
                                    Reports are encrypted and verified by AI. Multiple reports from the same area trigger Rapid Response protocols.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5">
                            <button
                                onClick={handleSubmitReport}
                                disabled={submitting}
                                className="w-full py-3.5 bg-cyber-blue/10 border border-cyber-blue/30 rounded-xl text-cyber-blue font-black text-xs uppercase tracking-widest hover:bg-cyber-blue/20 transition-all disabled:opacity-50"
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
