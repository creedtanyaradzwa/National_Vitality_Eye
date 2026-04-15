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
            const response = await axios.get(`http://localhost:5000/api/patient/verify?token=${token}`);
            
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500 mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ArrowPathIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-gray-400 mt-4">Verifying your email...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500 p-[1px] w-full max-w-md">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircleIcon className="h-10 w-10 text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
                        <p className="text-gray-400 mb-6">
                            Your email has been successfully verified. You can now login to your patient portal.
                        </p>
                        <button
                            onClick={() => navigate('/patient/login')}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg transition-all duration-300"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-500 to-pink-500 p-[1px] w-full max-w-md">
                <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <XCircleIcon className="h-10 w-10 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/patient/login')}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all duration-300"
                        >
                            Go to Login
                        </button>
                        <button
                            onClick={() => navigate('/patient/register')}
                            className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all duration-300"
                        >
                            Register Again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientVerify;