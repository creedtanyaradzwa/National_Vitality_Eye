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
    ShieldExclamationIcon,
    HeartIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = `${import.meta.env.VITE_API_URL }/api/patient`;

const COMMON_SYMPTOMS = [
    'fever', 'headache', 'cough', 'fatigue', 'nausea', 'vomiting',
    'diarrhea', 'stomach pain', 'chest pain', 'difficulty breathing',
    'dizziness', 'rash', 'joint pain', 'muscle pain', 'sore throat',
    'runny nose', 'loss of appetite', 'sweating', 'chills', 'back pain',
    'blurred vision', 'swollen feet', 'weight loss', 'night sweats'
];

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
            console.error('Error during symptom check:', err);
            toast.error('Could not complete symptom check');
        } finally {
            setLoading(false);
        }
    };

    const getUrgencyStyles = (level) => {
        switch(level) {
            case 'EMERGENCY': return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: ExclamationTriangleIcon, label: 'Immediate Action Required' };
            case 'URGENT': return { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: ShieldExclamationIcon, label: 'Seek Medical Attention Today' };
            case 'SOON': return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: ClockIcon, label: 'Schedule an Appointment Soon' };
            case 'MONITOR': return { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: CheckCircleIcon, label: 'Monitor Your Symptoms' };
            default: return { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', icon: InformationCircleIcon, label: 'Assessment Complete' };
        }
    };

    const urgency = result ? getUrgencyStyles(result.urgencyLevel) : null;

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
                <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <MagnifyingGlassIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Symptom Checker</h1>
                        <p className="text-slate-400 font-medium mt-1">
                            AI-guided assessment to help you understand your symptoms.
                        </p>
                    </div>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 mb-10">
                <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Describe how you feel</h2>
                
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSymptom(input)}
                            placeholder="Type a symptom (e.g. headache, fever)..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/50 transition-all text-sm font-medium"
                        />
                    </div>
                    <button
                        onClick={() => addSymptom(input)}
                        className="px-8 py-3 rounded-2xl bg-slate-900 border border-white/10 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    >
                        Add
                    </button>
                </div>

                {/* Selected Tags */}
                {symptoms.length > 0 && (
                    <div className="mb-8">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Added Symptoms:</p>
                        <div className="flex flex-wrap gap-2">
                            {symptoms.map(s => (
                                <span key={s} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                    {s}
                                    <button onClick={() => removeSymptom(s)} className="text-slate-500 hover:text-rose-400 transition-colors">
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Suggestions */}
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Common Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                        {COMMON_SYMPTOMS.filter(s => !symptoms.includes(s)).slice(0, 12).map(s => (
                            <button
                                key={s}
                                onClick={() => addSymptom(s)}
                                className="px-4 py-2 rounded-xl bg-slate-900/40 border border-white/5 text-[10px] font-bold text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Check Button */}
                <button
                    onClick={handleCheck}
                    disabled={loading || symptoms.length === 0}
                    className="mt-10 w-full py-4 rounded-3xl bg-emerald-500 text-white font-bold uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Analyzing Symptoms...' : 'Start Assessment'}
                </button>
            </div>

            {/* Assessment Results */}
            {result && urgency && (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    
                    {/* Urgency Level Card */}
                    <div className={`p-8 rounded-3xl border ${urgency.bg}`}>
                        <div className="flex items-center gap-6 mb-8">
                            <div className={`p-4 rounded-2xl bg-slate-950 border ${urgency.color.replace('text-', 'border-')}/30`}>
                                <urgency.icon className={`h-8 w-8 ${urgency.color}`} />
                            </div>
                            <div>
                                <h2 className={`text-2xl font-bold ${urgency.color}`}>{urgency.label}</h2>
                                <p className="text-sm text-slate-300 font-medium mt-1 leading-relaxed">{result.careAdvice}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-950/40 rounded-2xl p-6 border border-white/5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Severity Assessment</p>
                                <p className={`text-xl font-bold ${urgency.color}`}>{result.urgencyLevel}</p>
                            </div>
                            <div className="bg-slate-950/40 rounded-2xl p-6 border border-white/5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Recommended Action</p>
                                <p className={`text-xl font-bold ${urgency.color}`}>{result.timeframe}</p>
                            </div>
                        </div>
                    </div>

                    {/* Critical Alerts */}
                    {result.emergencySymptoms?.length > 0 && (
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6 flex items-start gap-4">
                            <ExclamationTriangleIcon className="h-6 w-6 text-rose-400 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-rose-400 mb-2 uppercase tracking-wider">Critical Symptoms Identified</h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.emergencySymptoms.map((s, i) => (
                                        <span key={i} className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Self Care Tips */}
                    {result.selfCareTips?.length > 0 && (
                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8">
                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <CheckCircleIcon className="h-5 w-5" /> Recommended Self-Care
                            </h3>
                            <ul className="space-y-4">
                                {result.selfCareTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium leading-relaxed">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/40 flex-shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Potential Patterns */}
                    {result.aiPredictions?.length > 0 && (
                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5 text-emerald-400" /> Pattern Recognition
                            </h3>
                            <div className="space-y-6">
                                {result.aiPredictions.map((p, i) => (
                                    <div key={i} className="p-5 rounded-2xl bg-slate-950 border border-white/5">
                                        {/* Header row */}
                                        <div className="flex items-center justify-between gap-6 mb-4">
                                            <div>
                                                <p className="text-lg font-bold text-white capitalize">{p.condition}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {p.icd11Code && (
                                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">
                                                            ICD-11: {p.icd11Code}
                                                        </span>
                                                    )}
                                                    {p.severity && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            p.severity === 'Emergency' ? 'bg-red-500/20 text-red-400' :
                                                            p.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                            {p.severity}
                                                        </span>
                                                    )}
                                                    {p.commonIn && (
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.commonIn}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end flex-shrink-0">
                                                <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.likelihood}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-emerald-400 mt-2">{Math.round(p.likelihood)}% Correlation</span>
                                            </div>
                                        </div>

                                        {/* Outbreak status */}
                                        {p.outbreakStatus && (
                                            <div className="mb-4 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                                <p className="text-xs font-bold text-orange-400">⚠️ {p.outbreakStatus}</p>
                                            </div>
                                        )}

                                        {/* EDLIZ first-line treatment */}
                                        {p.edlizTreatment && (
                                            <div className="mb-4 px-4 py-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                                                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">💊 EDLIZ First-line Treatment</p>
                                                <p className="text-xs text-slate-300">{p.edlizTreatment}</p>
                                            </div>
                                        )}

                                        {/* Full treatment protocol */}
                                        {p.treatmentRecommendations?.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Treatment Protocol</p>
                                                <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3 max-h-40 overflow-y-auto space-y-0.5">
                                                    {p.treatmentRecommendations.map((line, li) => (
                                                        <p key={li} className={`text-xs leading-relaxed ${
                                                            line.startsWith('💊') ? 'text-cyan-300 font-semibold mt-1' :
                                                            line.startsWith('  •') ? 'text-slate-300 ml-3' :
                                                            'text-slate-400'
                                                        }`}>{line}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Prevention protocol */}
                                        {p.preventiveRecommendations?.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">🛡️ Prevention Measures</p>
                                                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 max-h-36 overflow-y-auto space-y-0.5">
                                                    {p.preventiveRecommendations.map((line, li) => (
                                                        <p key={li} className={`text-xs leading-relaxed ${
                                                            line.startsWith('🛡️') ? 'text-emerald-300 font-semibold mt-1' :
                                                            line.startsWith('  •') ? 'text-slate-300 ml-3' :
                                                            'text-slate-400'
                                                        }`}>{line}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="bg-slate-900/20 border-l-4 border-blue-500 rounded-2xl p-6 flex items-start gap-4">
                        <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            Disclaimer: This tool is for informational purposes only and is not a substitute for professional medical advice, 
                            diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any 
                            questions you may have regarding a medical condition.
                        </p>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={() => { setResult(null); setSymptoms([]); }}
                        className="w-full py-4 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Start a new assessment
                    </button>
                </div>
            )}
        </div>
    );
};

export default AISymptomChecker;