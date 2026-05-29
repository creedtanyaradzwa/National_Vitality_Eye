import React from 'react';
import { 
    ExclamationTriangleIcon, 
    InformationCircleIcon, 
    ShieldCheckIcon,
    BoltIcon
} from '@heroicons/react/24/outline';
import { predictTriagePriority } from '../../utils/vitalSigns';

const TriageAlert = ({ vitals, symptoms = [] }) => {
    const triage = predictTriagePriority(vitals, symptoms);
    
    if (triage.score === 0 && triage.priority === 'STABLE') return null;

    const colorClasses = {
        red: 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
        orange: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
        yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
        blue: 'bg-cyber-blue/10 border-cyber-blue/30 text-cyber-blue',
        green: 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green'
    };

    const iconClasses = {
        red: <ExclamationTriangleIcon className="h-6 w-6 animate-pulse" />,
        orange: <ExclamationTriangleIcon className="h-6 w-6" />,
        yellow: <InformationCircleIcon className="h-6 w-6" />,
        blue: <InformationCircleIcon className="h-6 w-6" />,
        green: <ShieldCheckIcon className="h-6 w-6" />
    };

    return (
        <div className={`rounded-2xl border p-5 mb-6 transition-all duration-500 ${colorClasses[triage.color] || colorClasses.blue}`}>
            <div className="flex items-start gap-4">
                <div className="mt-1">
                    {iconClasses[triage.color] || iconClasses.blue}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-black uppercase tracking-[0.2em]">
                            Automated Triage Alert: {triage.priority}
                        </h4>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/20">
                            NEWS2 SCORE: {triage.score}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {triage.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {triage.reasons.map((reason, i) => (
                                    <span key={i} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-black/10 border border-white/5">
                                        {reason}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex items-center">
                                <BoltIcon className="h-3 w-3 mr-2" />
                                Actionable Clinical Instructions
                            </p>
                            <ul className="space-y-1.5">
                                {triage.instructions.map((inst, i) => (
                                    <li key={i} className="text-xs font-bold leading-relaxed flex items-start">
                                        <span className="mr-2 opacity-50">•</span>
                                        {inst}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TriageAlert;
