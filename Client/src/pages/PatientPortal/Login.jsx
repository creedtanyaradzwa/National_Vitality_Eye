import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import axios from 'axios';

const PatientLogin = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Login form state
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });
    
    // Register form state
    const [registerData, setRegisterData] = useState({
        nationalId: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        consent: false
    });

    const handleLoginChange = (e) => {
        setLoginData({
            ...loginData,
            [e.target.name]: e.target.value
        });
    };

    const handleRegisterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRegisterData({
            ...registerData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        
        if (!loginData.email || !loginData.password) {
            toast.error('Please fill in all fields');
            return;
        }
        
        setLoading(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL }/api/patient/login`, {
                email: loginData.email,
                password: loginData.password
            });
            
            localStorage.setItem('patientToken', response.data.token);
            localStorage.setItem('patientUser', JSON.stringify(response.data.user));
            toast.success('Login successful!');
            navigate('/patient/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            const errorMsg = error.response?.data?.error || 'Login failed. Please try again.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        
        if (!registerData.nationalId) {
            toast.error('National ID is required');
            return;
        }
        if (!registerData.email) {
            toast.error('Email is required');
            return;
        }
        if (!registerData.password) {
            toast.error('Password is required');
            return;
        }
        if (registerData.password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        if (registerData.password !== registerData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (!registerData.consent) {
            toast.error('You must consent to data processing');
            return;
        }
        
        setLoading(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/patient/register`, {
                nationalId: registerData.nationalId,
                email: registerData.email,
                phoneNumber: registerData.phoneNumber,
                password: registerData.password,
                consent: registerData.consent.toString()
            });
            
            toast.success(response.data.message || 'Registration successful! Please check your email to verify your account.');
            
            setRegisterData({
                nationalId: '',
                email: '',
                phoneNumber: '',
                password: '',
                confirmPassword: '',
                consent: false
            });
            setIsLogin(true);
        } catch (error) {
            console.error('Registration error:', error);
            const errorMsg = error.response?.data?.error || 'Registration failed. Please try again.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark-950 flex items-center justify-center relative overflow-hidden p-4">
            {/* Futuristic Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-purple/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-blue/10 blur-[120px] rounded-full animate-pulse delay-700" />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-cyber-blue/5 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="glass-card-modern p-10 border border-white/5 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-3xl bg-cyber-purple/20 blur-2xl animate-pulse" />
                            <div className="relative w-24 h-24 rounded-3xl bg-brand-dark-900 border border-cyber-purple/30 flex items-center justify-center shadow-2xl">
                                <UserIcon className="h-12 w-12 text-cyber-purple" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tighter mb-2">PATIENT PORTAL</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Secure Health Access Protocol</p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex rounded-2xl bg-brand-dark-950 p-1.5 mb-8 border border-white/5">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                                isLogin 
                                    ? 'bg-brand-dark-800 text-white shadow-lg border border-white/10'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                                !isLogin 
                                    ? 'bg-brand-dark-800 text-white shadow-lg border border-white/10'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Login Form */}
                    {isLogin ? (
                        <form onSubmit={handleLoginSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Email Identifier</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={loginData.email}
                                        onChange={handleLoginChange}
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500"
                                        placeholder="user@health.node"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Access Key</label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={loginData.password}
                                        onChange={handleLoginChange}
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
                            </div>
                            <div className="text-right">
                                <Link to="/patient/forgot-password" name="email" className="text-[10px] font-bold uppercase tracking-widest text-cyber-purple hover:text-cyber-blue transition-colors">
                                    Reset Protocol
                                </Link>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary-modern group"
                            >
                                <span>{loading ? 'PROCESSING...' : 'INITIALIZE ACCESS'}</span>
                            </button>
                        </form>
                    ) : (
                        /* Register Form */
                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">National ID Node</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        name="nationalId"
                                        value={registerData.nationalId}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500"
                                        placeholder="00-000000-X00"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Email Identifier</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={registerData.email}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500"
                                        placeholder="user@health.node"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">New Access Key</label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={registerData.password}
                                        onChange={handleRegisterChange}
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
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Confirm Key</label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={registerData.confirmPassword}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 focus:outline-none focus:border-cyber-purple/50 focus:ring-4 focus:ring-cyber-purple/5 transition-all duration-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-2">
                                <input
                                    type="checkbox"
                                    name="consent"
                                    id="consent"
                                    checked={registerData.consent}
                                    onChange={handleRegisterChange}
                                    className="w-5 h-5 rounded-lg border-white/10 bg-brand-dark-950 text-cyber-purple focus:ring-cyber-purple/20 focus:ring-offset-0 transition-all cursor-pointer"
                                    required
                                />
                                <label htmlFor="consent" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 cursor-pointer">
                                    Authorize Data Processing Protocol
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary-modern group mt-2"
                            >
                                <span>{loading ? 'REGISTERING...' : 'CREATE ACCOUNT'}</span>
                            </button>
                        </form>
                    )}
                    
                    <div className="mt-10 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                            System Node: <span className="text-cyber-blue">NV-EYE-PT-01</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientLogin;