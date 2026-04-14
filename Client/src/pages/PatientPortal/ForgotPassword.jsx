import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/patient/forgot-password', { email });
            setSubmitted(true);
        } catch  {
            toast.error('Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-md">
                <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-8">
                    <h1 className="text-2xl font-bold text-white text-center mb-6">Forgot Password</h1>
                    
                    {submitted ? (
                        <div className="text-center">
                            <p className="text-green-400 mb-4">If an account exists with that email, you will receive a password reset link.</p>
                            <Link to="/patient/login" className="text-purple-400 hover:underline">Back to Login</Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                            <p className="text-center text-gray-400 text-sm">
                                Remember your password?{' '}
                                <Link to="/patient/login" className="text-purple-400 hover:underline">
                                    Login
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;