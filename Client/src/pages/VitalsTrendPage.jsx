import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient, getPatientVitalsHistory } from '../services/api';
import VitalsTrend from '../components/patients/VitalsTrend';
import { ArrowLeftIcon, UserIcon, HeartIcon } from '@heroicons/react/24/outline';
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
            
            console.log('Patient:', patientRes.data?.firstName, patientRes.data?.lastName);
            console.log('Vitals records found:', vitalsRes.data?.length);
            
            setPatient(patientRes.data);
            setVitalsHistory(vitalsRes.data || []);
        } catch (error) {
            console.error('Error:', error);
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
                        <HeartIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 p-[1px]">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-12">
                        <p className="text-gray-400">Patient not found</p>
                        <button onClick={() => navigate('/patients')} className="mt-4 px-6 py-2 rounded-lg bg-purple-500/20 text-purple-400">Back to Patients</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <button onClick={() => navigate(`/patients/${id}`)} className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-white group">
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Patient Details</span>
            </button>

            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <HeartIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Vitals Trend Analysis</h1>
                            <p className="text-gray-400">{patient.firstName} {patient.lastName} - {patient.nationalId}</p>
                            <p className="text-xs text-purple-400 mt-1">{vitalsHistory.length} vital sign record{vitalsHistory.length !== 1 ? 's' : ''} found</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pass the data to the component */}
            <VitalsTrend 
                vitalsHistory={vitalsHistory}
                patientName={`${patient.firstName} ${patient.lastName}`}
                onRefresh={loadData}
            />
        </div>
    );
};

export default VitalsTrendPage;