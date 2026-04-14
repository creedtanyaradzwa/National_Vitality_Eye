import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { getProfile, changePassword } from '../services/api';
import { 
    UserIcon, 
    EnvelopeIcon, 
    PhoneIcon, 
    BuildingOfficeIcon, 
    MapPinIcon, 
    KeyIcon, 
    ShieldCheckIcon, 
    CheckCircleIcon, 
    ExclamationTriangleIcon, 
    EyeIcon, 
    EyeSlashIcon, 
    SparklesIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Profile = () => {
    const { logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [passwordErrors, setPasswordErrors] = useState([]);

    useEffect(() => { 
        loadProfile(); 
    }, []);

    const loadProfile = async () => {
        try {
            const response = await getProfile();
            setProfile(response.data.user);
        } catch { 
            toast.error('Failed to load profile'); 
        } finally { 
            setLoading(false); 
        }
    };

    const checkPasswordStrength = (password) => {
        let strength = 0;
        const errors = [];
        if (password.length >= 8) strength += 25; else errors.push('At least 8 characters');
        if (/[A-Z]/.test(password)) strength += 25; else errors.push('At least one uppercase letter');
        if (/[a-z]/.test(password)) strength += 25; else errors.push('At least one lowercase letter');
        if (/[0-9]/.test(password)) strength += 25; else errors.push('At least one number');
        setPasswordStrength(strength);
        setPasswordErrors(errors);
        return strength >= 75;
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        if (name === 'newPassword') checkPasswordStrength(value);
    };

    const handleSubmitPassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) { 
            toast.error('New passwords do not match'); 
            return; 
        }
        if (!checkPasswordStrength(passwordData.newPassword)) { 
            toast.error('Password does not meet requirements'); 
            return; 
        }
        try {
            await changePassword({ 
                currentPassword: passwordData.currentPassword, 
                newPassword: passwordData.newPassword 
            });
            toast.success('Password changed successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordForm(false);
            setPasswordStrength(0);
        } catch (error) { 
            toast.error(error.response?.data?.error || 'Failed to change password'); 
        }
    };

    const getRoleBadge = (role) => {
        const colors = { 
            admin: 'bg-purple-500/20 text-purple-400', 
            doctor: 'bg-blue-500/20 text-blue-400', 
            nurse: 'bg-green-500/20 text-green-400', 
            data_entry: 'bg-yellow-500/20 text-yellow-400', 
            viewer: 'bg-gray-500/20 text-gray-400', 
            pending: 'bg-orange-500/20 text-orange-400' 
        };
        return colors[role] || 'bg-gray-500/20 text-gray-400';
    };

    const getStrengthColor = () => { 
        if (passwordStrength >= 75) return 'bg-green-500'; 
        if (passwordStrength >= 50) return 'bg-yellow-500'; 
        if (passwordStrength >= 25) return 'bg-orange-500'; 
        return 'bg-red-500'; 
    };
    
    const getStrengthText = () => { 
        if (passwordStrength >= 75) return 'Strong'; 
        if (passwordStrength >= 50) return 'Medium'; 
        if (passwordStrength >= 25) return 'Weak'; 
        return 'Very Weak'; 
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">My Profile</h1>
                            <p className="text-gray-400">Manage your account settings and preferences</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl font-bold text-white">{profile?.firstName?.[0]}{profile?.lastName?.[0]}</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">{profile?.firstName} {profile?.lastName}</h2>
                        <p className="text-gray-400 text-sm mt-1">{profile?.userId}</p>
                        <div className="mt-3">
                            <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-medium ${getRoleBadge(profile?.role)}`}>
                                {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-center text-sm text-gray-400">
                                <ShieldCheckIcon className="h-4 w-4 mr-1 text-green-400" />
                                <span>Status: </span>
                                <span className={`ml-1 font-medium ${profile?.approvalStatus === 'approved' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {profile?.approvalStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6 mt-6">
                        <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
                        <button 
                            onClick={() => setShowPasswordForm(!showPasswordForm)} 
                            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 mb-2"
                        >
                            <span className="flex items-center">
                                <KeyIcon className="h-4 w-4 text-purple-400 mr-2" />
                                Change Password
                            </span>
                            <span className="text-gray-500">→</span>
                        </button>
                        <button 
                            onClick={logout} 
                            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all duration-300 text-red-400"
                        >
                            <span className="flex items-center">
                                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                                Logout
                            </span>
                            <span className="text-red-500">→</span>
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <UserIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">First Name</label>
                                <p className="text-white font-medium">{profile?.firstName}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Last Name</label>
                                <p className="text-white font-medium">{profile?.lastName}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 flex items-center">
                                    <EnvelopeIcon className="h-4 w-4 mr-1 text-purple-400" />
                                    Email
                                </label>
                                <p className="text-white font-medium">{profile?.email}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 flex items-center">
                                    <PhoneIcon className="h-4 w-4 mr-1 text-purple-400" />
                                    Phone
                                </label>
                                <p className="text-white font-medium">{profile?.phoneNumber}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <BuildingOfficeIcon className="h-5 w-5 mr-2 text-purple-400" />
                            Professional Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Hospital</label>
                                <p className="text-white font-medium">{profile?.hospitalName}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Hospital ID</label>
                                <p className="text-white font-medium">{profile?.hospitalId}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 flex items-center">
                                    <MapPinIcon className="h-4 w-4 mr-1 text-purple-400" />
                                    Province
                                </label>
                                <p className="text-white font-medium">{profile?.province}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Position</label>
                                <p className="text-white font-medium">{profile?.position}</p>
                            </div>
                        </div>
                    </div>

                    {showPasswordForm && (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <KeyIcon className="h-5 w-5 mr-2 text-purple-400" />
                                Change Password
                            </h3>
                            <form onSubmit={handleSubmitPassword} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-300 mb-1">Current Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showCurrentPassword ? "text" : "password"} 
                                            name="currentPassword" 
                                            value={passwordData.currentPassword} 
                                            onChange={handlePasswordChange} 
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 pr-10" 
                                            required 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        >
                                            {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-300 mb-1">New Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showNewPassword ? "text" : "password"} 
                                            name="newPassword" 
                                            value={passwordData.newPassword} 
                                            onChange={handlePasswordChange} 
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 pr-10" 
                                            required 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowNewPassword(!showNewPassword)} 
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        >
                                            {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {passwordData.newPassword && (
                                        <div className="mt-2">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs text-gray-400">Password Strength</span>
                                                <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>{getStrengthText()}</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div className={`h-full ${getStrengthColor()} transition-all duration-300`} style={{ width: `${passwordStrength}%` }} />
                                            </div>
                                            {passwordErrors.length > 0 && passwordStrength < 75 && (
                                                <ul className="mt-2 text-xs text-red-400 space-y-1">
                                                    {passwordErrors.map((err, idx) => (<li key={idx}>• {err}</li>))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            name="confirmPassword" 
                                            value={passwordData.confirmPassword} 
                                            onChange={handlePasswordChange} 
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 pr-10" 
                                            required 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        >
                                            {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && 
                                        <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                                    }
                                </div>
                                <div className="flex space-x-3">
                                    <button type="submit" className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all duration-300">
                                        Update Password
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { 
                                            setShowPasswordForm(false); 
                                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); 
                                            setPasswordStrength(0); 
                                        }} 
                                        className="flex-1 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-4">
                        <div className="flex items-start">
                            <ShieldCheckIcon className="h-5 w-5 text-purple-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-semibold text-purple-400">Security Tips</h4>
                                <p className="text-sm text-gray-300 mt-1">
                                    • Never share your password with anyone<br />
                                    • Use a strong, unique password<br />
                                    • Contact admin if you suspect unauthorized access
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;