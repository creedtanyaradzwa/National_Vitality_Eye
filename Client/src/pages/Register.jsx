import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  BuildingOfficeIcon,
  MapPinIcon,
  IdentificationIcon,
  DocumentTextIcon,
  CameraIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  HomeIcon,
  LockClosedIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { registerUser } from '../services/api';
import toast from 'react-hot-toast';

const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        employeeId: '',
        hospitalName: '',
        hospitalId: '',
        province: 'Harare',
        position: '',
        qualifications: ''
    });
    
    const [files, setFiles] = useState({
        nationalId: null,
        employmentLetter: null,
        practicingLicense: null,
        profilePhoto: null
    });
    
    const [uploadProgress, setUploadProgress] = useState({});

    const provinces = [
        'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
        'Mashonaland East', 'Mashonaland West', 'Masvingo',
        'Matabeleland North', 'Matabeleland South', 'Midlands'
    ];

    const positions = [
        'System Administrator',
        'Senior Doctor',
        'Doctor',
        'Registered Nurse',
        'Nurse',
        'Data Entry Clerk',
        'Medical Records Officer',
        'IT Administrator',
        'Hospital Administrator',
        'Viewer'
    ];

    const checkPasswordStrength = (pass) => {
        let strength = 0;
        if (pass.length >= 8) strength += 25;
        if (/[A-Z]/.test(pass)) strength += 25;
        if (/[a-z]/.test(pass)) strength += 25;
        if (/[0-9]/.test(pass)) strength += 25;
        setPasswordStrength(strength);
        return strength;
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        checkPasswordStrength(newPassword);
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files: fileList } = e.target;
        if (fileList && fileList[0]) {
            setFiles(prev => ({ ...prev, [name]: fileList[0] }));
            setUploadProgress(prev => ({ ...prev, [name]: 100 }));
        }
    };

    const validateStep1 = () => {
        if (!formData.firstName) { toast.error('First name is required'); return false; }
        if (!formData.lastName) { toast.error('Last name is required'); return false; }
        if (!formData.email) { toast.error('Email is required'); return false; }
        if (!formData.phoneNumber) { toast.error('Phone number is required'); return false; }
        if (!password) { toast.error('Password is required'); return false; }
        if (password !== confirmPassword) { toast.error('Passwords do not match'); return false; }
        if (passwordStrength < 75) { toast.error('Please use a stronger password'); return false; }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.employeeId) { toast.error('Employee ID is required'); return false; }
        if (!formData.hospitalName) { toast.error('Hospital name is required'); return false; }
        if (!formData.hospitalId) { toast.error('Hospital ID is required'); return false; }
        if (!formData.position) { toast.error('Position is required'); return false; }
        return true;
    };

    const validateStep3 = () => {
        if (!files.nationalId) { toast.error('Please upload your National ID'); return false; }
        if (!files.employmentLetter) { toast.error('Please upload your employment verification letter'); return false; }
        if (!agreeTerms) { toast.error('Please agree to the terms and conditions'); return false; }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1 && validateStep1()) setCurrentStep(2);
        else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep3()) return;
        
        setLoading(true);
        
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) submitData.append(key, formData[key]);
        });
        submitData.append('password', password);
        
        Object.keys(files).forEach(key => {
            if (files[key]) submitData.append(key, files[key]);
        });
        
        try {
            const response = await registerUser(submitData);
            toast.success(response.data.message || 'Registration successful! Please wait for admin approval.');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const StepIndicator = ({ number, title, isActive, isCompleted }) => (
        <div className="flex items-center">
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25' :
                isCompleted ? 'bg-green-500/20 border border-green-500/50' :
                'bg-white/10 border border-white/20'
            }`}>
                {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                ) : (
                    <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>{number}</span>
                )}
            </div>
            <div className="ml-3 hidden md:block">
                <p className={`text-xs ${isActive ? 'text-purple-400' : 'text-gray-500'}`}>Step {number}</p>
                <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{title}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mb-6">
                    <Link to="/" className="flex items-center space-x-2 text-gray-400 hover:text-white transition-all duration-300 group">
                        <HomeIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span>Back to Home</span>
                    </Link>
                    <Link to="/login" className="text-gray-400 hover:text-white transition-all duration-300">
                        Already have an account? <span className="text-purple-400">Sign in</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50 animate-pulse"></div>
                        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <ShieldCheckIcon className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Join National Vitality Eye
                    </h1>
                    <p className="text-gray-400">Register to access Zimbabwe's premier AI-powered health system</p>
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center mb-10">
                    <div className="flex items-center space-x-6 md:space-x-12">
                        <StepIndicator number={1} title="Personal Info" isActive={currentStep === 1} isCompleted={currentStep > 1} />
                        <div className={`w-12 h-px ${currentStep > 1 ? 'bg-purple-500' : 'bg-white/20'}`} />
                        <StepIndicator number={2} title="Professional" isActive={currentStep === 2} isCompleted={currentStep > 2} />
                        <div className={`w-12 h-px ${currentStep > 2 ? 'bg-purple-500' : 'bg-white/20'}`} />
                        <StepIndicator number={3} title="Documents" isActive={currentStep === 3} isCompleted={currentStep > 3} />
                    </div>
                </div>

                {/* Registration Form */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px]">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-6 md:p-8">
                        <form onSubmit={handleSubmit}>
                            {/* Step 1: Personal Information */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                                        <UserIcon className="h-5 w-5 mr-2 text-purple-400" />
                                        Personal Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">First Name *</label>
                                            <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Last Name *</label>
                                            <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Email *</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Phone Number *</label>
                                            <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" placeholder="+263 77 123 4567" required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Password *</label>
                                            <div className="relative">
                                                <input type={showPassword ? "text" : "password"} value={password} onChange={handlePasswordChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 pr-12" required />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            {password && (
                                                <div className="mt-2">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-xs text-gray-400">Password Strength</span>
                                                        <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>{getStrengthText()}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div className={`h-full ${getStrengthColor()} transition-all duration-300 rounded-full`} style={{ width: `${passwordStrength}%` }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password *</label>
                                            <div className="relative">
                                                <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 pr-12" required />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                                                    {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            {confirmPassword && password !== confirmPassword && <p className="mt-1 text-xs text-red-400">Passwords do not match</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Professional Information */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                                        <BuildingOfficeIcon className="h-5 w-5 mr-2 text-purple-400" />
                                        Professional Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Employee ID *</label>
                                            <input type="text" name="employeeId" value={formData.employeeId} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Position *</label>
                                            <select name="position" value={formData.position} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required>
                                                <option value="">Select Position</option>
                                                {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Hospital Name *</label>
                                            <input type="text" name="hospitalName" value={formData.hospitalName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Hospital ID *</label>
                                            <input type="text" name="hospitalId" value={formData.hospitalId} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Province *</label>
                                            <select name="province" value={formData.province} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" required>
                                                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Qualifications</label>
                                            <input type="text" name="qualifications" value={formData.qualifications} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300" placeholder="e.g., MBChB, BSc Nursing" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Documents Upload */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                                        <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-400" />
                                        Verification Documents
                                    </h2>
                                    <p className="text-gray-400 text-sm mb-4">Please upload clear copies of your documents (PDF, JPG, PNG - Max 5MB)</p>
                                    
                                    <div className="space-y-4">
                                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                            <label className="block text-gray-300 text-sm font-medium mb-2">National ID *</label>
                                            <div className="flex items-center space-x-4">
                                                <input type="file" name="nationalId" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="nationalId" required />
                                                <label htmlFor="nationalId" className="flex-1 flex items-center justify-center px-4 py-3 rounded-xl border-2 border-dashed border-white/30 cursor-pointer hover:border-purple-500 transition-all duration-300 group">
                                                    <IdentificationIcon className="h-5 w-5 text-gray-400 mr-2 group-hover:text-purple-400 transition" />
                                                    <span className="text-gray-400 group-hover:text-gray-300 transition">{files.nationalId ? files.nationalId.name : 'Click to upload National ID'}</span>
                                                </label>
                                                {uploadProgress.nationalId === 100 && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Employment Verification Letter *</label>
                                            <div className="flex items-center space-x-4">
                                                <input type="file" name="employmentLetter" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="employmentLetter" required />
                                                <label htmlFor="employmentLetter" className="flex-1 flex items-center justify-center px-4 py-3 rounded-xl border-2 border-dashed border-white/30 cursor-pointer hover:border-purple-500 transition-all duration-300 group">
                                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2 group-hover:text-purple-400 transition" />
                                                    <span className="text-gray-400 group-hover:text-gray-300 transition">{files.employmentLetter ? files.employmentLetter.name : 'Click to upload Employment Letter'}</span>
                                                </label>
                                                {uploadProgress.employmentLetter === 100 && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Practicing License (Optional)</label>
                                            <div className="flex items-center space-x-4">
                                                <input type="file" name="practicingLicense" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="practicingLicense" />
                                                <label htmlFor="practicingLicense" className="flex-1 flex items-center justify-center px-4 py-3 rounded-xl border-2 border-dashed border-white/30 cursor-pointer hover:border-purple-500 transition-all duration-300 group">
                                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2 group-hover:text-purple-400 transition" />
                                                    <span className="text-gray-400 group-hover:text-gray-300 transition">{files.practicingLicense ? files.practicingLicense.name : 'Click to upload Practicing License'}</span>
                                                </label>
                                                {uploadProgress.practicingLicense === 100 && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-purple-500/30 transition-all duration-300">
                                            <label className="block text-gray-300 text-sm font-medium mb-2">Profile Photo (Optional)</label>
                                            <div className="flex items-center space-x-4">
                                                <input type="file" name="profilePhoto" onChange={handleFileChange} accept=".jpg,.jpeg,.png" className="hidden" id="profilePhoto" />
                                                <label htmlFor="profilePhoto" className="flex-1 flex items-center justify-center px-4 py-3 rounded-xl border-2 border-dashed border-white/30 cursor-pointer hover:border-purple-500 transition-all duration-300 group">
                                                    <CameraIcon className="h-5 w-5 text-gray-400 mr-2 group-hover:text-purple-400 transition" />
                                                    <span className="text-gray-400 group-hover:text-gray-300 transition">{files.profilePhoto ? files.profilePhoto.name : 'Click to upload Profile Photo'}</span>
                                                </label>
                                                {uploadProgress.profilePhoto === 100 && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terms and Conditions */}
                                    <div className="mt-6">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-purple-500 focus:ring-purple-500" />
                                            <span className="text-gray-300 text-sm">I agree to the <span className="text-purple-400">Terms of Service</span> and <span className="text-purple-400">Privacy Policy</span></span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                                {currentStep > 1 && (
                                    <button type="button" onClick={handleBack} className="px-6 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300">
                                        Back
                                    </button>
                                )}
                                {currentStep < 3 ? (
                                    <button type="button" onClick={handleNext} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 ml-auto">
                                        Next Step
                                        <ArrowRightIcon className="h-4 w-4 ml-2 inline" />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 ml-auto disabled:opacity-50">
                                        {loading ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Submitting...
                                            </div>
                                        ) : (
                                            <>
                                                Submit Registration
                                                <ArrowRightIcon className="h-4 w-4 ml-2 inline" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>

                        <p className="text-center text-gray-500 text-xs mt-6 pt-4 border-t border-white/10">
                            Your information is encrypted and secure. Documents will be reviewed by administrators.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;