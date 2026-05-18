import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';


const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error('Please enter your email');
            return;
        }
        
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/patient/forgot-password', { email });
            setSubmitted(true);
            toast.success('If an account exists, a reset link has been sent');
        } catch  {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-brand-dark-950 flex items-center justify-center relative overflow-hidden p-4">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/10 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/10 blur-[120px] rounded-full animate-pulse delay-700" />
                </div>

                <div className="relative z-10 w-full max-w-md">
                    <div className="glass-card-modern p-10 border border-white/5 shadow-2xl text-center">
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-3xl bg-cyber-blue/20 blur-2xl animate-pulse" />
                            <div className="relative w-24 h-24 rounded-3xl bg-brand-dark-900 border border-cyber-blue/30 flex items-center justify-center shadow-2xl">
                                <EnvelopeIcon className="h-12 w-12 text-cyber-blue" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-4 uppercase italic">Archive Sync</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-8 leading-relaxed">
                            Password reset protocol initialized for identifier:<br/>
                            <span className="text-cyber-blue mt-2 block">{email}</span>
                        </p>
                        <div className="p-5 rounded-2xl bg-brand-dark-900 border border-white/5 mb-10">
                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] leading-relaxed">
                                VERIFY INBOX FOR ACCESS KEY RESET DE-CRYPTIONS. IF NULL, CHECK SPAM-NODES.
                            </p>
                        </div>
                        <Link
                            to="/patient/login"
                            className="w-full btn-primary-modern group flex items-center justify-center"
                        >
                            <span>BACK TO CORE</span>
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
                                <EnvelopeIcon className="h-12 w-12 text-cyber-purple" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase italic">Lost Access?</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Initiate identity recovery protocol</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Email Identifier</label>
                            <div className="relative">
                                <EnvelopeIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500"
                                    placeholder="user@health.node"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary-modern group"
                        >
                            <span>{loading ? 'SYNCING...' : 'INITIATE RESET'}</span>
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

export default ForgotPassword;