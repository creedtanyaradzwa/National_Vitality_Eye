import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        if (!tokenParam) {
            setError('No reset token provided');
        } else {
            setToken(tokenParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!password || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }
        
        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/patient/reset-password', {
                token,
                newPassword: password
            });
            setResetSuccess(true);
            toast.success('Password reset successfully!');
            
            setTimeout(() => {
                navigate('/patient/login');
            }, 3000);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to reset password';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (error && !resetSuccess) {
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
                                <LockClosedIcon className="h-12 w-12 text-red-400" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase italic">Token Corruption</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-300/70 mb-8 leading-relaxed">
                            {error.toUpperCase()}
                        </p>
                        <Link
                            to="/patient/forgot-password"
                            className="w-full py-4 rounded-2xl bg-brand-dark-900 border border-red-500/30 text-[10px] font-black uppercase tracking-[0.3em] text-red-400 hover:bg-red-500/10 transition-all duration-300 inline-block"
                        >
                            RE-INITIALIZE RECOVERY
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (resetSuccess) {
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
                        <h1 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase italic">Key Re-Generated</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyber-green/70 mb-8 leading-relaxed">
                            ACCESS PROTOCOLS UPDATED SUCCESSFULLY. REDIRECTING TO CORE INTERFACE...
                        </p>
                        <Link
                            to="/patient/login"
                            className="w-full btn-primary-modern group flex items-center justify-center"
                        >
                            <span>MANUAL OVERRIDE</span>
                        </Link>
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
                <div className="glass-card-modern p-10 border border-white/5 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-3xl bg-cyber-purple/20 blur-2xl animate-pulse" />
                            <div className="relative w-24 h-24 rounded-3xl bg-brand-dark-900 border border-cyber-purple/30 flex items-center justify-center shadow-2xl">
                                <LockClosedIcon className="h-12 w-12 text-cyber-purple" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase italic">New Access Key</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Configure high-entropy credentials</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">New Access Identifier</label>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-14 pr-14 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest ml-1">MIN_ENTROPY: 8 CHARACTERS</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Confirm Identifier</label>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary-modern group mt-4"
                        >
                            <span>{loading ? 'GENERATING...' : 'RESET ACCESS KEY'}</span>
                        </button>

                        <div className="text-center pt-4">
                            <Link to="/patient/login" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-cyber-purple transition-all flex items-center justify-center gap-2">
                                <ArrowLeftIcon className="h-3 w-3" />
                                RETURN_TO_CORE
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;