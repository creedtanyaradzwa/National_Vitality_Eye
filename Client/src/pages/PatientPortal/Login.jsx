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
            const response = await axios.post('http://localhost:5000/api/patient/login', {
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
        
        // Validation
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
            const response = await axios.post('http://localhost:5000/api/patient/register', {
                nationalId: registerData.nationalId,
                email: registerData.email,
                phoneNumber: registerData.phoneNumber,
                password: registerData.password,
                consent: registerData.consent.toString()
            });
            
            toast.success(response.data.message || 'Registration successful! Please check your email to verify your account.');
            
            // Clear form and switch to login
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-md">
                <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                            <UserIcon className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Patient Portal</h1>
                        <p className="text-gray-400">Access your medical records securely</p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex rounded-lg bg-white/10 p-1 mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all duration-300 ${
                                isLogin 
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all duration-300 ${
                                !isLogin 
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Login Form */}
                    {isLogin ? (
                        <form onSubmit={handleLoginSubmit} className="space-y-6">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Email Address</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={loginData.email}
                                        onChange={handleLoginChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={loginData.password}
                                        onChange={handleLoginChange}
                                        className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <Link to="/patient/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition">
                                    Forgot Password?
                                </Link>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </form>
                    ) : (
                        /* Register Form */
                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">National ID *</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        name="nationalId"
                                        value={registerData.nationalId}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="63-123456-A12"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Must match your hospital records</p>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Email *</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={registerData.email}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Phone Number</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={registerData.phoneNumber}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="0771234567"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Password *</label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={registerData.password}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password *</label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={registerData.confirmPassword}
                                        onChange={handleRegisterChange}
                                        className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    name="consent"
                                    checked={registerData.consent}
                                    onChange={handleRegisterChange}
                                    className="w-4 h-4 rounded border-white/30 bg-white/5 checked:bg-purple-500 focus:ring-purple-500"
                                    required
                                />
                                <label className="text-gray-300 text-sm">
                                    I consent to the processing of my medical data
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                            >
                                {loading ? 'Registering...' : 'Register'}
                            </button>
                        </form>
                    )}
                    
                    {/* Footer Note */}
                    <div className="mt-6 pt-4 border-t border-white/10 text-center">
                        <p className="text-xs text-gray-500">
                            By using this portal, you agree to our 
                            <button className="text-purple-400 hover:underline mx-1">Terms of Service</button>
                            and
                            <button className="text-purple-400 hover:underline ml-1">Privacy Policy</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientLogin;