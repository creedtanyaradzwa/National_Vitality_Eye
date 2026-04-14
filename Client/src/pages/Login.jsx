import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  ShieldCheckIcon, 
  BeakerIcon,
  SparklesIcon,
  CpuChipIcon,
  HomeIcon,
  UserPlusIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await login(userId, password);
        if (result.success) {
            navigate('/dashboard');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
            
            {/* Navigation Buttons - Top Right */}
            <div className="absolute top-6 right-6 flex items-center space-x-3 z-20">
                <Link 
                    to="/" 
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-300 group"
                >
                    <HomeIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Home</span>
                </Link>
                <Link 
                    to="/register" 
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 group"
                >
                    <UserPlusIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Register</span>
                </Link>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] shadow-2xl">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-8">
                        {/* Logo */}
                        <div className="text-center mb-8">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50 animate-pulse"></div>
                                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                    <ShieldCheckIcon className="h-10 w-10 text-white" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                            <p className="text-gray-400">Sign in to access National Vitality Eye</p>
                        </div>

                        {/* Features Badges */}
                        <div className="flex justify-center space-x-3 mb-8">
                            <div className="flex items-center space-x-1 bg-white/10 rounded-full px-3 py-1">
                                <SparklesIcon className="h-3 w-3 text-purple-400" />
                                <span className="text-xs text-gray-300">AI-Powered</span>
                            </div>
                            <div className="flex items-center space-x-1 bg-white/10 rounded-full px-3 py-1">
                                <BeakerIcon className="h-3 w-3 text-purple-400" />
                                <span className="text-xs text-gray-300">Real-time</span>
                            </div>
                            <div className="flex items-center space-x-1 bg-white/10 rounded-full px-3 py-1">
                                <CpuChipIcon className="h-3 w-3 text-purple-400" />
                                <span className="text-xs text-gray-300">AI Enhanced</span>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">User ID</label>
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                                    placeholder="Enter your User ID"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 pr-12"
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
                                    >
                                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full py-3 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 group"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Logging in...
                                    </div>
                                ) : (
                                    <span className="flex items-center justify-center">
                                        Sign In
                                        <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>
                        </form>
                        
                        {/* Demo Credentials */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 text-sm">Need an account? Contact your hospital administrator</p>
                            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                                <p className="text-gray-500 text-xs mb-2">Demo Admin Credentials</p>
                                <div className="flex justify-center items-center space-x-4 text-sm">
                                    <div>
                                        <p className="text-purple-400 text-xs">User ID</p>
                                        <p className="text-white font-mono text-sm">SYS1000</p>
                                    </div>
                                    <div className="w-px h-8 bg-white/20"></div>
                                    <div>
                                        <p className="text-purple-400 text-xs">Password</p>
                                        <p className="text-white font-mono text-sm">SYS@2026</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-600 text-xs mt-8">
                    © 2024 National Vitality Eye. AI-Powered Healthcare Intelligence.
                </p>
            </div>
        </div>
    );
};

export default Login;