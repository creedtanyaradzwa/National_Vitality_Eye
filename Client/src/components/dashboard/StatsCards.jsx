import React from 'react';
import { 
    UserGroupIcon, 
    DocumentTextIcon, 
    BeakerIcon,
    MapIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const StatsCards = ({ stats }) => {
    const cards = [
        {
            title: 'Total Patients',
            value: stats.totalPatients || 0,
            icon: UserGroupIcon,
            gradient: 'from-blue-500 to-cyan-500',
            bgGradient: 'from-blue-500/10 to-cyan-500/5',
            trend: '+12%',
            trendUp: true
        },
        {
            title: 'Total Cases',
            value: stats.totalCases || 0,
            icon: DocumentTextIcon,
            gradient: 'from-emerald-500 to-teal-500',
            bgGradient: 'from-emerald-500/10 to-teal-500/5',
            trend: '+8%',
            trendUp: true
        },
        {
            title: 'Diseases Tracked',
            value: stats.diseasesTracked || 0,
            icon: BeakerIcon,
            gradient: 'from-purple-500 to-pink-500',
            bgGradient: 'from-purple-500/10 to-pink-500/5',
            trend: '+3',
            trendUp: true
        },
        {
            title: 'Active Provinces',
            value: stats.provincesActive || 0,
            icon: MapIcon,
            gradient: 'from-orange-500 to-red-500',
            bgGradient: 'from-orange-500/10 to-red-500/5',
            trend: '10/10',
            trendUp: true
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
                <div key={index} className="stat-card group">
                    {/* Animated Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`stat-icon w-12 h-12 bg-gradient-to-br ${card.gradient}`}>
                                <card.icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex items-center space-x-1">
                                <ArrowTrendingUpIcon className={`h-3 w-3 ${card.trendUp ? 'text-emerald-400' : 'text-red-400'}`} />
                                <span className={`text-xs font-medium ${card.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {card.trend}
                                </span>
                            </div>
                        </div>
                        
                        <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">
                            {card.value.toLocaleString()}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">
                            {card.title}
                        </p>
                        
                        {/* Decorative Line */}
                        <div className="absolute bottom-4 right-4 w-16 h-16 opacity-10">
                            <card.icon className="h-full w-full" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StatsCards;