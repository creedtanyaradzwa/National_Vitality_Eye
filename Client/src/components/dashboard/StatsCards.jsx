import React from 'react';
import { toGrowthIndex, clampPercent } from '../../utils/analyticsHelpers.js';
import { 
    UserGroupIcon, 
    DocumentTextIcon, 
    BeakerIcon,
    MapIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    HeartIcon,
    ShieldExclamationIcon,
    CheckCircleIcon,
    FireIcon
} from '@heroicons/react/24/outline';

const StatsCards = ({ stats, diseaseStats, selectedDisease }) => {
    const systemCards = [
        {
            title: 'Total Patients',
            value: stats.totalPatients || 0,
            icon: UserGroupIcon,
            color: 'text-cyber-blue',
            borderColor: 'border-cyber-blue/20',
            glowColor: 'shadow-cyber-blue/10',
            trend: null
        },
        {
            title: 'Total Clinical Events',
            value: stats.totalClinicalEvents || 0,
            icon: DocumentTextIcon,
            color: 'text-cyber-green',
            borderColor: 'border-cyber-green/20',
            glowColor: 'shadow-cyber-green/10',
            trend: null
        },
        {
            title: 'Diseases Tracked',
            value: stats.diseasesTracked || 0,
            icon: BeakerIcon,
            color: 'text-cyber-purple',
            borderColor: 'border-cyber-purple/20',
            glowColor: 'shadow-cyber-purple/10',
            trend: null
        },
        {
            title: 'Active Provinces',
            value: stats.provincesActive || 0,
            icon: MapIcon,
            color: 'text-cyber-pink',
            borderColor: 'border-cyber-pink/20',
            glowColor: 'shadow-cyber-pink/10',
            trend: null
        }
    ];

    return (
        <div className="space-y-6">
            {/* System-wide cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {systemCards.map((card, index) => (
                    <div key={index} className={`stat-card group hover:scale-[1.02] transition-transform duration-300 border ${card.borderColor}`}>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center justify-center`}>
                                    <card.icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tighter">
                                {card.value.toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">
                                {card.title}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Disease-specific stat cards — shown when a disease is selected */}
            {selectedDisease && diseaseStats && (
                <div className="rounded-2xl bg-brand-dark-900/60 border border-purple-500/20 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <FireIcon className="h-4 w-4 text-purple-400" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                            Disease Focus — {selectedDisease}
                        </p>
                        <span className={`ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            diseaseStats.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            diseaseStats.riskLevel === 'HIGH'     ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                            {diseaseStats.riskLevel} RISK
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Total cases for this disease */}
                        <div className="bg-brand-dark-800/60 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Cases</p>
                            <p className="text-xl font-black text-white">{(diseaseStats.totalCases || 0).toLocaleString()}</p>
                        </div>

                        {/* Monthly growth */}
                        <div className="bg-brand-dark-800/60 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Outbreak index</p>
                            <div className="flex items-center gap-1">
                                {(diseaseStats.growthIndex ?? toGrowthIndex(diseaseStats.growthRate)) >= 55
                                    ? <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                                    : <ArrowTrendingDownIcon className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />}
                                <p className={`text-xl font-black ${
                                    (diseaseStats.growthIndex ?? 50) >= 65 ? 'text-red-400' :
                                    (diseaseStats.growthIndex ?? 50) <= 40 ? 'text-green-400' : 'text-white'
                                }`}>
                                    {clampPercent(diseaseStats.growthIndex ?? toGrowthIndex(diseaseStats.growthRate))}/100
                                </p>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-0.5">50 = stable (0–100)</p>
                        </div>

                        {/* Recovery rate */}
                        <div className="bg-brand-dark-800/60 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Recovery</p>
                            <div className="flex items-center gap-1">
                                <CheckCircleIcon className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                                <p className="text-xl font-black text-green-400">{diseaseStats.recoveryRate}%</p>
                            </div>
                        </div>

                        {/* Admission rate */}
                        <div className="bg-brand-dark-800/60 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Admitted</p>
                            <p className="text-xl font-black text-yellow-400">{diseaseStats.admissionRate}%</p>
                        </div>

                        {/* Mortality */}
                        <div className="bg-brand-dark-800/60 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Mortality</p>
                            <div className="flex items-center gap-1">
                                {diseaseStats.mortalityRate > 5 && <ShieldExclamationIcon className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                                <p className={`text-xl font-black ${diseaseStats.mortalityRate > 5 ? 'text-red-400' : 'text-gray-300'}`}>
                                    {diseaseStats.mortalityRate}%
                                </p>
                            </div>
                        </div>

                        {/* Hotspot */}
                        <div className="bg-brand-dark-800/60 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Hotspot</p>
                            <div className="flex items-center gap-1">
                                <MapIcon className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                                <p className="text-sm font-black text-purple-400 uppercase truncate">{diseaseStats.hotspot}</p>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-0.5">{diseaseStats.hotspotCases} cases</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsCards;
