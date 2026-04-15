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

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            console.log('Loading vitals for patient ID:', id);
            
            const [patientRes, vitalsRes] = await Promise.all([
                getPatient(id),
                getPatientVitalsHistory(id)
            ]);
            
            console.log('Patient data loaded:', patientRes.data?.firstName, patientRes.data?.lastName);
            console.log('Vitals history count:', vitalsRes.data?.length);
            
            setPatient(patientRes.data);
            setVitalsHistory(vitalsRes.data || []);
        } catch (error) {
            console.error('Error loading vitals data:', error);
            toast.error('Failed to load vitals data');
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

    if (!patient) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Patient not found</p>
                <button onClick={() => navigate('/patients')} className="mt-4 text-purple-400 hover:underline">
                    Back to Patients
                </button>
            </div>
        );
    }

    // Debug - log what we're passing to VitalsTrend
    console.log('Passing to VitalsTrend:', {
        vitalsHistoryLength: vitalsHistory.length,
        patientName: `${patient.firstName} ${patient.lastName}`,
        firstRecordVitals: vitalsHistory[0]?.vitalSigns
    });

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
                                {patient.firstName} {patient.lastName} - {patient.nationalId}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vitals Trend Component */}
            <VitalsTrend 
                vitalsHistory={vitalsHistory}
                patientName={`${patient.firstName} ${patient.lastName}`}
                onRefresh={loadData}
            />
        </div>
    );
};

export default VitalsTrendPage;