import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const PatientVerify = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Wrap verifyEmail in useCallback to prevent recreation
    const verifyEmail = useCallback(async (token) => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patient/verify?token=${token}`);
            
            if (response.data.success) {
                setSuccess(true);
                toast.success('Email verified successfully! You can now login.');
                
                setTimeout(() => {
                    navigate('/patient/login');
                }, 3000);
            } else {
                setError(response.data.error || 'Verification failed');
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError(error.response?.data?.error || 'Verification failed. The link may have expired.');
        } finally {
            setVerifying(false);
        }
    }, [navigate]);

    useEffect(() => {
        const token = searchParams.get('token');
        
        if (!token) {
            setError('No verification token provided');
            setVerifying(false);
            return;
        }
        
        verifyEmail(token);
    }, [searchParams, verifyEmail]);

    if (verifying) {
        return (
            <div className="min-h-screen bg-brand-dark-950 flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/10 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/10 blur-[120px] rounded-full animate-pulse delay-700" />
                </div>
                <div className="relative z-10 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-cyber-blue/20 animate-spin border-t-cyber-blue"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ArrowPathIcon className="h-8 w-8 text-cyber-blue animate-pulse" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyber-blue italic">Verifying Identity Node...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-brand-dark-950 flex items-center justify-center relative overflow-hidden p-4">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/10 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/10 blur-[120px] rounded-full animate-pulse delay-700" />
                </div>

                <div className="relative z-10 w-full max-w-md">
                    <div className="glass-card-modern p-10 border border-cyber-green/20 shadow-2xl text-center bg-cyber-green/5">
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-3xl bg-cyber-green/20 blur-2xl animate-pulse" />
                            <div className="relative w-24 h-24 rounded-3xl bg-brand-dark-900 border border-cyber-green/30 flex items-center justify-center shadow-2xl">
                                <CheckCircleIcon className="h-12 w-12 text-cyber-green" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-4 uppercase italic">Node Verified</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyber-green/70 mb-10 leading-relaxed">
                            EMAIL IDENTITY PROTOCOL SYNCHRONIZED. REDIRECTING TO CORE INTERFACE...
                        </p>
                        <button
                            onClick={() => navigate('/patient/login')}
                            className="w-full btn-primary-modern group flex items-center justify-center"
                        >
                            <span>ENTER PORTAL</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark-950 flex items-center justify-center relative overflow-hidden p-4">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/10 blur-[120px] rounded-full animate-pulse delay-700" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="glass-card-modern p-10 border border-red-500/20 shadow-2xl text-center bg-red-500/5">
                    <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-3xl bg-red-500/20 blur-2xl animate-pulse" />
                        <div className="relative w-24 h-24 rounded-3xl bg-brand-dark-900 border border-red-500/30 flex items-center justify-center shadow-2xl">
                            <XCircleIcon className="h-12 w-12 text-red-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase italic">Sync Failure</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-300/70 mb-10 leading-relaxed">
                        {error.toUpperCase()}
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={() => navigate('/patient/login')}
                            className="w-full py-4 rounded-2xl bg-brand-dark-900 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white transition-all"
                        >
                            RETURN TO CORE
                        </button>
                        <button
                            onClick={() => navigate('/patient/register')}
                            className="w-full py-4 rounded-2xl bg-brand-dark-950 border border-red-500/30 text-[10px] font-black uppercase tracking-[0.3em] text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            RE-INITIALIZE REGISTRATION
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientVerify;