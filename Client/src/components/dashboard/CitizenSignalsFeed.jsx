import React from 'react';
import { 
    ChatBubbleLeftRightIcon, 
    MapPinIcon, 
    CalendarIcon,
    UserCircleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

const CitizenSignalsFeed = ({ signals, loading }) => {
    if (loading) {
        return (
            <div className="glass-card-modern p-6 border border-white/5 h-full">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-white/5 rounded w-1/4"></div>
                    <div className="space-y-3">
                        <div className="h-20 bg-white/5 rounded-2xl"></div>
                        <div className="h-20 bg-white/5 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card-modern border border-white/5 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-brand-dark-900/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-dark-800 border border-cyber-blue/30 flex items-center justify-center">
                            <ChatBubbleLeftRightIcon className="h-5 w-5 text-cyber-blue" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">Citizen Signals</h2>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
                                {signals?.length || 0} community reports
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {signals?.length > 0 ? (
                    signals.map((signal, index) => (
                        <div 
                            key={index}
                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyber-blue/20 transition-all duration-300 group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-cyber-blue/10">
                                        <MapPinIcon className="h-3.5 w-3.5 text-cyber-blue" />
                                    </div>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                                        {signal.location?.district}, {signal.location?.province}
                                    </span>
                                </div>
                                <span className="text-[9px] font-mono text-gray-600">
                                    {new Date(signal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {signal.symptoms?.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-md bg-brand-dark-950 border border-white/5 text-[9px] font-bold text-gray-400 uppercase">
                                        {s}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                    <UserCircleIcon className="h-3 w-3" />
                                    <span>{signal.reportedBy ? `${signal.reportedBy.firstName} ${signal.reportedBy.lastName}` : 'Anonymous'}</span>
                                </div>
                                {signal.location?.ward && (
                                    <span className="text-[9px] text-gray-600 font-medium italic">
                                        {signal.location.ward}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3 py-10">
                        <InformationCircleIcon className="h-10 w-10 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No community signals recorded</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CitizenSignalsFeed;
