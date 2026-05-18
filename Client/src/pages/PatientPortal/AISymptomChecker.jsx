import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XMarkIcon,
    SparklesIcon,
    InformationCircleIcon,
    ClockIcon,
    ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const COMMON_SYMPTOMS = [
    'fever', 'headache', 'cough', 'fatigue', 'nausea', 'vomiting',
    'diarrhea', 'stomach pain', 'chest pain', 'difficulty breathing',
    'dizziness', 'rash', 'joint pain', 'muscle pain', 'sore throat',
    'runny nose', 'loss of appetite', 'sweating', 'chills', 'back pain',
    'blurred vision', 'swollen feet', 'weight loss', 'night sweats'
];

const urgencyConfig = {
    EMERGENCY: {
        bg:     'bg-red-500/20 border-red-500/40',
        text:   'text-red-400',
        icon:   ExclamationTriangleIcon,
        pulse:  true,
        label:  '🚨 Emergency — Seek Immediate Care'
    },
    URGENT: {
        bg:     'bg-orange-500/20 border-orange-500/40',
        text:   'text-orange-400',
        icon:   ShieldExclamationIcon,
        pulse:  false,
        label:  '⚠️ Urgent — See a Doctor Today'
    },
    SOON: {
        bg:     'bg-yellow-500/20 border-yellow-500/40',
        text:   'text-yellow-400',
        icon:   ClockIcon,
        pulse:  false,
        label:  '🕐 Schedule an Appointment Soon'
    },
    MONITOR: {
        bg:     'bg-blue-500/20 border-blue-500/40',
        text:   'text-blue-400',
        icon:   CheckCircleIcon,
        pulse:  false,
        label:  '👁 Monitor Your Symptoms'
    }
};

const AISymptomChecker = () => {
    const navigate = useNavigate();
    const [symptoms, setSymptoms] = useState([]);
    const [input, setInput] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const addSymptom = (s) => {
        const clean = s.trim().toLowerCase();
        if (clean && !symptoms.includes(clean)) {
            setSymptoms(prev => [...prev, clean]);
        }
        setInput('');
    };

    const removeSymptom = (s) => setSymptoms(prev => prev.filter(x => x !== s));

    const handleCheck = async () => {
        if (symptoms.length === 0) { toast.error('Please add at least one symptom'); return; }
        setLoading(true);
        setResult(null);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const res = await fetch(`${PORTAL_API}/ai/symptom-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ symptoms })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
        } catch (err) {
            toast.error('Could not complete symptom check');
        } finally {
            setLoading(false);
        }
    };

    const cfg = result ? urgencyConfig[result.urgencyLevel] || urgencyConfig.MONITOR : null;

    return (
        <div className="min-h-screen bg-brand-dark-950 text-gray-200">
            {/* Futuristic Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/patient/dashboard')} 
                    className="mb-8 flex items-center space-x-3 text-gray-500 hover:text-white group transition-all duration-300"
                >
                    <div className="p-2 rounded-xl bg-brand-dark-900 border border-white/5 group-hover:border-cyber-purple/30 transition-all">
                        <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Return to Core</span>
                </button>

                {/* Header */}
                <div className="glass-card-modern p-8 mb-10 border border-white/5">
                    <div className="flex items-center space-x-6">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-2xl bg-cyber-blue/20 blur-xl animate-pulse" />
                            <div className="relative w-16 h-16 rounded-2xl bg-brand-dark-900 border border-cyber-blue/30 flex items-center justify-center shadow-2xl">
                                <MagnifyingGlassIcon className="h-8 w-8 text-cyber-blue" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Neural Triage Core</h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                                AI-guided emergent symptom assessment protocol
                            </p>
                        </div>
                    </div>
                </div>

                {/* Input section */}
                <div className="glass-card-modern p-8 mb-10 border border-white/5">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 italic flex items-center gap-3">
                        <div className="w-1 h-1 rounded-full bg-cyber-purple" />
                        BIOMETRIC INPUT INTERFACE
                    </h2>

                    {/* Text input */}
                    <div className="flex gap-4 mb-8">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-700" />
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addSymptom(input)}
                                placeholder="IDENTIFY SYMPTOM NODE..."
                                className="w-full pl-14 pr-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-800 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500 text-xs font-bold tracking-widest"
                            />
                        </div>
                        <button
                            onClick={() => addSymptom(input)}
                            className="px-8 rounded-2xl bg-brand-dark-900 border border-white/5 text-[10px] font-black uppercase tracking-widest text-cyber-purple hover:bg-cyber-purple/10 hover:border-cyber-purple/30 transition-all duration-300"
                        >
                            APPEND
                        </button>
                    </div>

                    {/* Selected symptoms */}
                    {symptoms.length > 0 && (
                        <div className="mb-8 animate-in fade-in zoom-in duration-300">
                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">ACTIVE_STREAM_NODES:</p>
                            <div className="flex flex-wrap gap-3">
                                {symptoms.map(s => (
                                    <span key={s} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-brand-dark-900 border border-cyber-purple/20 text-cyber-purple text-[10px] font-black uppercase tracking-widest italic group">
                                        {s}
                                        <button onClick={() => removeSymptom(s)} className="text-gray-600 hover:text-red-400 transition-colors">
                                            <XMarkIcon className="h-4 w-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Common symptoms quick-add */}
                    <div>
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">COMMON_NODE_TEMPLATES:</p>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_SYMPTOMS.filter(s => !symptoms.includes(s)).slice(0, 16).map(s => (
                                <button
                                    key={s}
                                    onClick={() => addSymptom(s)}
                                    className="px-4 py-2 rounded-xl bg-brand-dark-950 border border-white/5 text-[9px] font-bold text-gray-500 uppercase tracking-widest hover:border-cyber-blue/30 hover:text-cyber-blue transition-all duration-300"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Check button */}
                    <button
                        onClick={handleCheck}
                        disabled={loading || symptoms.length === 0}
                        className="mt-10 btn-primary-modern w-full group"
                    >
                        <span>{loading ? 'PROCESSING NEURAL TRIAGE...' : 'INITIALIZE ASSESSMENT'}</span>
                    </button>
                </div>

                {/* Results */}
                {result && cfg && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-6 duration-700">
                        {/* Urgency card */}
                        <div className={`glass-card-modern p-8 border transition-all duration-500 ${cfg.bg}`}>
                            <div className="flex items-center gap-8 mb-8">
                                <div className={`p-4 rounded-2xl bg-brand-dark-950 border ${cfg.pulse ? 'animate-pulse' : ''} ${cfg.text.replace('text-', 'border-')}/30 shadow-2xl`}>
                                    <cfg.icon className={`h-8 w-8 ${cfg.text}`} />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-black uppercase tracking-tighter italic ${cfg.text}`}>{cfg.label.toUpperCase()}</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 leading-relaxed italic">{result.careAdvice}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-brand-dark-950/50 rounded-2xl p-6 border border-white/5">
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">URGENCY_LEVEL</p>
                                    <p className={`text-2xl font-black italic tracking-tighter ${cfg.text}`}>{result.urgencyLevel}</p>
                                </div>
                                <div className="bg-brand-dark-950/50 rounded-2xl p-6 border border-white/5">
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">RESPONSE_TIMEFRAME</p>
                                    <p className={`text-2xl font-black italic tracking-tighter ${cfg.text}`}>{result.timeframe.toUpperCase()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Emergency symptoms flagged */}
                        {result.emergencySymptoms?.length > 0 && (
                            <div className="glass-card-modern p-6 border border-red-500/20 bg-red-500/5 animate-pulse">
                                <h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3 italic">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> CRITICAL NODES DETECTED
                                </h3>
                                <div className="flex flex-wrap gap-3 ml-7">
                                    {result.emergencySymptoms.map((s, i) => (
                                        <span key={i} className="px-4 py-1.5 rounded-xl bg-brand-dark-950 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest italic">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Self-care tips */}
                        {result.selfCareTips?.length > 0 && (
                            <div className="glass-card-modern p-8 border border-white/5">
                                <h3 className="text-[10px] font-black text-cyber-green uppercase tracking-[0.2em] mb-6 flex items-center gap-3 italic">
                                    <CheckCircleIcon className="h-4 w-4 text-cyber-green" /> MITIGATION PROTOCOLS
                                </h3>
                                <ul className="space-y-4 ml-7">
                                    {result.selfCareTips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed italic opacity-80">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyber-green/50 flex-shrink-0" />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* AI condition patterns */}
                        {result.aiPredictions?.length > 0 && (
                            <div className="glass-card-modern p-8 border border-cyber-purple/20 bg-cyber-purple/5">
                                <h3 className="text-[10px] font-black text-cyber-purple uppercase tracking-[0.2em] mb-4 flex items-center gap-3 italic">
                                    <SparklesIcon className="h-4 w-4" /> NEURAL PATTERN CLASSIFICATION
                                </h3>
                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-8 ml-7 italic">CROSS-REFERENCE WITH GLOBAL ARCHIVES — Awareness Only</p>
                                <div className="space-y-6 ml-7">
                                    {result.aiPredictions.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-brand-dark-950/80 border border-white/5 hover:border-cyber-purple/30 transition-all duration-300">
                                            <div>
                                                <p className="text-sm font-black text-white uppercase tracking-tighter italic mb-1">{p.condition}</p>
                                                {p.commonIn && <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{p.commonIn.toUpperCase()}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">PATTERN_MATCH</p>
                                                <div className="w-32 bg-brand-dark-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-cyber-purple to-cyber-blue transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.min(p.likelihood, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs font-black text-cyber-purple mt-2 italic">{Math.round(p.likelihood)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="p-6 rounded-2xl bg-brand-dark-900 border border-white/5 border-l-cyber-blue border-l-4 flex items-start gap-4">
                            <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed italic">
                                NEURAL TRIAGE DISCLAIMER: {result.disclaimer.toUpperCase()}
                            </p>
                        </div>

                        {/* Check again */}
                        <button
                            onClick={() => { setResult(null); setSymptoms([]); }}
                            className="w-full py-4 rounded-2xl bg-brand-dark-900 border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-white hover:border-white/20 transition-all duration-300"
                        >
                            RESET_TRIAGE_PROTOCOL
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AISymptomChecker;
