import React, { useState, useEffect } from 'react';
import { getTopDiseases, getProvinceStats, getPatientCount } from '../services/api';
import { useAlerts } from '../context/useAlerts';
import { useDataRefresh } from '../context/useDataRefresh';
import StatsCards from '../components/dashboard/StatsCards';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import DiseaseChart from '../components/dashboard/DiseaseChart';
import { ArrowPathIcon, MapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [patientCount, setPatientCount] = useState(0);
    const [totalCases, setTotalCases] = useState(0);
    const [diseasesTracked, setDiseasesTracked] = useState(0);
    const [provincesActive, setProvincesActive] = useState(0);
    const [topDiseases, setTopDiseases] = useState([]);
    const [provinceStats, setProvinceStats] = useState([]);
    const [loading, setLoading] = useState(true);
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
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Health Dashboard</h1>
                    <p className="text-gray-400">Real-time health statistics and AI-powered insights</p>
                </div>
                <button
                    onClick={refreshData}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

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
                <div className="mt-8 bg-white/5 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <MapIcon className="h-5 w-5 mr-2 text-purple-400" />
                        Province Distribution
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {provinceStats.map((prov) => (
                            <div key={prov._id} className="bg-white/10 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-300 text-sm">{prov._id}</h3>
                                <p className="text-2xl font-bold text-white mt-1">{prov.total}</p>
                                <p className="text-xs text-gray-500">total cases</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;