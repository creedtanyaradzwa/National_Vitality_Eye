import React from 'react';
import { 
    ExclamationTriangleIcon, 
    ShieldExclamationIcon, 
    ArrowPathIcon,
    InformationCircleIcon,
    BoltIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';

const TriageAlert = ({ triageData, loading }) => {
    if (loading) {
        return (
            <div className="p-6 rounded-3xl bg-brand-dark-950 border border-white/5 animate-pulse flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-800 rounded-2xl"></div>
                <div className="space-y-2">
                    <div className="h-2 w-32 bg-gray-800 rounded"></div>
                    <div className="h-3 w-48 bg-gray-800 rounded"></div>
                </div>
            </div>
        );
    }

    if (!triageData || triageData.priority === 'NON-URGENT') return null;

    const { priority, score, reasons, color, instructions, isCrisis } = triageData;

    // Map color to Tailwind classes
    const colorClasses = {
        red: 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]',
        orange: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
        yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
        gray: 'bg-gray-500/10 border-gray-500/30 text-gray-500'
    };

    const currentStyle = colorClasses[color] || colorClasses.gray;

    return (
        <div className={`relative overflow-hidden rounded-[2.5rem] border p-8 transition-all duration-500 ${currentStyle} ${isCrisis ? 'animate-triage-pulse' : ''}`}>
            {/* Background Icon Watermark */}
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <ShieldExclamationIcon className="h-32 w-32" />
            </div>

            <div className="relative flex flex-col md:flex-row gap-8 items-start">
                {/* Score Circle */}
                <div className="flex-shrink-0">
                    <div className={`w-20 h-20 rounded-3xl border-2 flex flex-col items-center justify-center ${currentStyle} backdrop-blur-xl`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Score</span>
                        <span className="text-3xl font-black tracking-tighter">{score}</span>
                    </div>
                </div>

                {/* Priority & Details */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl ${isCrisis ? 'bg-red-500 text-white animate-bounce' : 'bg-white/10'}`}>
                            <ExclamationTriangleIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
                                {priority} PRIORITY
                            </h3>
                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.3em] mt-1">
                                Automated Early Warning Triggered
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {reasons.map((reason, idx) => (
                            <div key={idx} className="flex items-start space-x-2 text-xs font-medium opacity-80">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                <span>{reason}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actionable Instructions (The Gap Fix) */}
                <div className="w-full md:w-80 space-y-4">
                    <div className="bg-brand-dark-900/50 backdrop-blur-xl border border-white/5 p-5 rounded-2xl space-y-4">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] flex items-center text-white/40">
                            <BoltIcon className="h-3 w-3 mr-2" />
                            IMMEDIATE_ACTION_PROTOCOL
                        </h4>
                        <div className="space-y-3">
                            {instructions && instructions.length > 0 ? (
                                instructions.map((instruction, idx) => (
                                    <div key={idx} className="flex items-start space-x-3">
                                        <div className="mt-1 p-1 rounded-md bg-white/5 text-white">
                                            <ArrowPathIcon className="h-3 w-3" />
                                        </div>
                                        <p className="text-[11px] font-bold text-white leading-relaxed">
                                            {instruction}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-gray-500 italic">No specific emergency instructions required at this level.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Footer Status */}
            {isCrisis && (
                <div className="mt-6 flex items-center justify-center space-x-4 border-t border-white/5 pt-4">
                    <div className="flex items-center space-x-2">
                        <UserGroupIcon className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Rapid Response Notified</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TriageAlert;
