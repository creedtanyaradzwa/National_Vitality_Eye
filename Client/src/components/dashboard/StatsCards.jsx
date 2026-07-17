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
        <div>
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
        </div>
    );
};

export default StatsCards;
