import React, { useState } from 'react';
import { useAuth } from '../context/AuthProvider';
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
  EyeSlashIcon,
  ArrowPathIcon
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
        <div className="min-h-screen bg-brand-dark-950 flex items-center justify-center relative overflow-hidden">
            {/* Futuristic Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/10 blur-[120px] rounded-full animate-pulse delay-700" />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-cyber-blue/5 blur-[100px] rounded-full" />
            </div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
            
            {/* Navigation Buttons - Top Right */}
            <div className="absolute top-8 right-8 flex items-center space-x-4 z-20">
                <Link 
                    to="/" 
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-dark-900 border border-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all duration-300 group"
                >
                    <HomeIcon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Home</span>
                </Link>
                <Link 
                    to="/register" 
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-white text-brand-dark-950 font-bold hover:bg-cyber-blue transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                    <UserPlusIcon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Register</span>
                </Link>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                <div className="glass-card-modern p-10 border border-white/5 shadow-2xl">
                    {/* Logo */}
                    <div className="text-center mb-10">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-3xl bg-cyber-blue/20 blur-2xl animate-pulse" />
                            <div className="relative w-24 h-24 rounded-3xl bg-brand-dark-900 border border-cyber-blue/30 flex items-center justify-center shadow-2xl">
                                <ShieldCheckIcon className="h-12 w-12 text-cyber-blue" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tighter mb-2">SYSTEM ACCESS</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Authentication Protocol required</p>
                    </div>

                    {/* Features Badges */}
                    <div className="flex justify-center gap-2 mb-10">
                        {['AI-CORE', 'ENCRYPTED', 'REAL-TIME'].map((tag) => (
                            <div key={tag} className="px-3 py-1 rounded-full bg-brand-dark-950 border border-white/5 flex items-center">
                                <span className="w-1 h-1 rounded-full bg-cyber-blue mr-2 animate-pulse" />
                                <span className="text-[8px] font-bold text-gray-500 tracking-widest">{tag}</span>
                            </div>
                        ))}
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Terminal ID</label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full px-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-blue/50 focus:ring-4 focus:ring-cyber-blue/5 transition-all duration-500"
                                placeholder="NODE_IDENTIFIER"
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Access Key</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-blue/50 focus:ring-4 focus:ring-cyber-blue/5 transition-all duration-500 pr-14"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyber-blue transition-colors"
                                >
                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary-modern w-full py-4 uppercase tracking-[0.2em] text-xs font-bold"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-3" />
                                    Authorizing...
                                </div>
                            ) : (
                                <span className="flex items-center justify-center">
                                    Initiate Login
                                    <ArrowRightIcon className="h-4 w-4 ml-3" />
                                </span>
                            )}
                        </button>
                    </form>
                    
                    {/* Demo Credentials */}
                    <div className="mt-10 pt-8 border-t border-white/5">
                        <div className="p-5 rounded-2xl bg-brand-dark-950 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <CpuChipIcon className="h-12 w-12" />
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-4">Debug Mode Credentials</p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[8px] font-bold text-cyber-blue/50 uppercase mb-1">Node ID</p>
                                    <p className="text-sm font-mono text-white tracking-wider">CHE9376</p>
                                </div>
                                <div className="h-8 w-px bg-white/5" />
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-cyber-blue/50 uppercase mb-1">Access Key</p>
                                    <p className="text-sm font-mono text-white tracking-wider">Staff@2026</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-center px-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">© 2026 Clinical Intelligence Node</p>
                    <div className="flex space-x-4">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-700">v5.0.0-LTS</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;