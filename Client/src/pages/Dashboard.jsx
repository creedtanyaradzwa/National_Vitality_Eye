import React, { useState, useEffect } from 'react';
import { getTopDiseases, getProvinceStats, getPatientCount } from '../services/api';
import { useAlerts } from "../context/AlertProvider";
import { useDataRefresh } from '../context/useDataRefresh';
import StatsCards from '../components/dashboard/StatsCards';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import DiseaseChart from '../components/dashboard/DiseaseChart';
import { 
    SparklesIcon, 
    ArrowPathIcon,
    CpuChipIcon,
    MapIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [patientCount, setPatientCount] = useState(0);
    const [totalCases, setTotalCases] = useState(0);
    const [diseasesTracked, setDiseasesTracked] = useState(0);
    const [provincesActive, setProvincesActive] = useState(0);
    const [topDiseases, setTopDiseases] = useState([]);
    const [provinceStats, setProvinceStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const { activeAlerts } = useAlerts();
    const { refreshTrigger, refreshData } = useDataRefresh();

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const patientRes = await getPatientCount();
            setPatientCount(patientRes.data?.count || 0);
            
            const diseasesRes = await getTopDiseases();
            setTopDiseases(diseasesRes.data || []);
            
            const total = (diseasesRes.data || []).reduce((sum, d) => sum + d.count, 0);
            setTotalCases(total);
            
            const provinceRes = await getProvinceStats();
            setProvinceStats(provinceRes.data || []);
            setProvincesActive(provinceRes.data?.length || 0);
            
            const uniqueDiseases = new Set((diseasesRes.data || []).map(d => d._id));
            setDiseasesTracked(uniqueDiseases.size);
            setLastUpdated(new Date());
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [refreshTrigger]);

    const stats = {
        totalPatients: patientCount,
        totalCases: totalCases,
        diseasesTracked: diseasesTracked,
        provincesActive: provincesActive
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <CpuChipIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-white/10">
                {/* Background pattern - simplified to avoid parsing errors */}
                <div className="absolute inset-0 opacity-20" 
                     style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(156, 146, 172, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                <div className="relative max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                    <SparklesIcon className="h-5 w-5 text-white" />
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white">
                                    Health Dashboard
                                </h1>
                            </div>
                            <p className="text-gray-400">
                                Real-time health statistics and AI-powered insights
                                <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                                    <CpuChipIcon className="h-3 w-3 mr-1" />
                                    AI Enhanced
                                </span>
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Last updated</p>
                                <p className="text-sm text-gray-300">{lastUpdated.toLocaleTimeString()}</p>
                            </div>
                            <button
                                onClick={refreshData}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                            >
                                <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <StatsCards stats={stats} />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    <div className="lg:col-span-1">
                        <RecentAlerts alerts={activeAlerts || []} />
                    </div>
                    <div className="lg:col-span-2">
                        <DiseaseChart data={topDiseases || []} />
                    </div>
                </div>
                
                {provinceStats && provinceStats.length > 0 && (
                    <div className="mt-8">
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px]">
                            <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                                    <MapIcon className="h-5 w-5 mr-2 text-purple-400" />
                                    Province Distribution
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {provinceStats.map((prov) => (
                                        <div key={prov._id} className="group relative overflow-hidden rounded-xl p-4 bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="relative">
                                                <h3 className="font-semibold text-gray-300 text-sm">{prov._id}</h3>
                                                <p className="text-2xl font-bold text-white mt-1">{prov.total}</p>
                                                <p className="text-xs text-gray-500">total cases</p>
                                                <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min((prov.total / totalCases) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;