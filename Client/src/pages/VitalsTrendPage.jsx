import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, getPatientVitalsHistory } from '../services/api';
import VitalsTrend from '../components/patients/VitalsTrend';
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VitalsTrendPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // FIXED: Wrap loadData in useCallback to prevent recreation on every render
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, vitalsRes] = await Promise.all([
                getPatient(id),
                getPatientVitalsHistory(id)
            ]);
            setPatient(patientRes.data);
            setVitalsHistory(vitalsRes.data);
        } catch (error) {
            console.error('Error loading vitals data:', error);
            toast.error('Failed to load vitals data');
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]); // Only recreate when id or navigate changes

    // FIXED: useEffect with proper dependency
    useEffect(() => {
        loadData();
    }, [loadData]); // Now loadData is stable

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Back Button */}
            <button
                onClick={() => navigate(`/patients/${id}`)}
                className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-white transition-all duration-300 group"
            >
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
                <span>Back to Patient Details</span>
            </button>

            {/* Header */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Vitals Trend Analysis</h1>
                            <p className="text-gray-400">
                                {patient?.firstName} {patient?.lastName} - {patient?.nationalId}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vitals Trend Component */}
            <VitalsTrend 
                vitalsHistory={vitalsHistory} 
                patientName={`${patient?.firstName} ${patient?.lastName}`}
                onRefresh={loadData}
            />
        </div>
    );
};

export default VitalsTrendPage;