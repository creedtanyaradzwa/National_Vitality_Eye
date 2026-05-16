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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <button onClick={() => navigate('/patient/dashboard')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
                    <ArrowLeftIcon className="h-5 w-5" /> Back to Dashboard
                </button>

                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                        <div className="flex items-center gap-3">
                            <MagnifyingGlassIcon className="h-8 w-8 text-purple-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Symptom Checker</h1>
                                <p className="text-gray-400 text-sm">AI-powered guidance on when to seek care — not a diagnosis</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input section */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Enter Your Symptoms</h2>

                    {/* Text input */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSymptom(input)}
                            placeholder="Type a symptom and press Enter..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                        />
                        <button
                            onClick={() => addSymptom(input)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg transition-all duration-200"
                        >
                            Add
                        </button>
                    </div>

                    {/* Selected symptoms */}
                    {symptoms.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Selected symptoms:</p>
                            <div className="flex flex-wrap gap-2">
                                {symptoms.map(s => (
                                    <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-sm">
                                        {s}
                                        <button onClick={() => removeSymptom(s)} className="text-purple-400 hover:text-white transition">
                                            <XMarkIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Common symptoms quick-add */}
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Common symptoms (tap to add):</p>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_SYMPTOMS.filter(s => !symptoms.includes(s)).slice(0, 16).map(s => (
                                <button
                                    key={s}
                                    onClick={() => addSymptom(s)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-all duration-200"
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
                        className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 rounded-full animate-spin border-t-white" /> Analysing...</>
                        ) : (
                            <><SparklesIcon className="h-5 w-5" /> Check My Symptoms</>
                        )}
                    </button>
                </div>

                {/* Results */}
                {result && cfg && (
                    <div className="space-y-5">
                        {/* Urgency card */}
                        <div className={`rounded-2xl border p-6 ${cfg.bg}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-3 rounded-xl ${cfg.bg} ${cfg.pulse ? 'animate-pulse' : ''}`}>
                                    <cfg.icon className={`h-7 w-7 ${cfg.text}`} />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black uppercase tracking-tight ${cfg.text}`}>{cfg.label}</h2>
                                    <p className="text-gray-400 text-sm mt-0.5">{result.careAdvice}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Urgency Level</p>
                                    <p className={`text-lg font-black ${cfg.text}`}>{result.urgencyLevel}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Timeframe</p>
                                    <p className={`text-lg font-black ${cfg.text}`}>{result.timeframe}</p>
                                </div>
                            </div>
                        </div>

                        {/* Emergency symptoms flagged */}
                        {result.emergencySymptoms?.length > 0 && (
                            <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-4">
                                <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="h-4 w-4" /> Emergency Symptoms Detected
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.emergencySymptoms.map((s, i) => (
                                        <span key={i} className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold">{s}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Self-care tips */}
                        {result.selfCareTips?.length > 0 && (
                            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CheckCircleIcon className="h-4 w-4 text-green-400" /> Self-Care Tips
                                </h3>
                                <ul className="space-y-2">
                                    {result.selfCareTips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* AI condition patterns */}
                        {result.aiPredictions?.length > 0 && (
                            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-5">
                                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <SparklesIcon className="h-4 w-4" /> Conditions with Similar Patterns
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">Based on similar cases in the health system — for awareness only, not a diagnosis.</p>
                                <div className="space-y-3">
                                    {result.aiPredictions.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{p.condition}</p>
                                                {p.commonIn && <p className="text-xs text-gray-500">{p.commonIn}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 mb-1">Pattern match</p>
                                                <div className="w-24 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                        style={{ width: `${Math.min(p.likelihood, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-purple-400 mt-0.5">{Math.round(p.likelihood)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
                            <InformationCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-500 leading-relaxed">{result.disclaimer}</p>
                        </div>

                        {/* Check again */}
                        <button
                            onClick={() => { setResult(null); setSymptoms([]); }}
                            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
                        >
                            Check Different Symptoms
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AISymptomChecker;
