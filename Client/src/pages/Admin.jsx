import React, { useState, useEffect, useCallback } from 'react';
import { 
    getPendingUsers, 
    processApproval, 
    getAllUsers, 
    toggleUserStatus, 
    changeUserRole, 
    getUserDocuments,
    refreshAI,
    getAIStatus
} from '../services/api';
import { useAuth } from '../context/AuthProvider';
import PatientManagement from '../components/admin/PatientManagement';
import {
    UserGroupIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    BuildingOfficeIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ClipboardIcon,
    UsersIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Admin = () => {
    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');
    
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDocuments, setShowDocuments] = useState(false);
    const [documents, setDocuments] = useState(null);
    const [currentDocumentUser, setCurrentDocumentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [credentialsModal, setCredentialsModal] = useState({ 
        show: false, 
        userId: '', 
        password: '', 
        name: '', 
        role: '' 
    });
    const [aiStats, setAiStats] = useState(null);
    const [refreshingAI, setRefreshingAI] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Tabs configuration
    const tabs = [
        { id: 'pending', label: 'Pending Approvals', icon: UserGroupIcon },
        { id: 'all', label: 'All Users', icon: UsersIcon },
        { id: 'patients', label: 'Patient Management', icon: UserGroupIcon },
        { id: 'ai', label: 'AI Control', icon: CpuChipIcon },
    ];

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'pending') {
                const response = await getPendingUsers();
                setPendingUsers(response.data);
            } else if (activeTab === 'all') {
                const response = await getAllUsers();
                setAllUsers(response.data);
            } else if (activeTab === 'ai') {
                const response = await getAIStatus();
                setAiStats(response.data);
            }
            setLastUpdated(new Date());
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (isAdmin && activeTab !== 'patients') {
            loadData();
        }
    }, [isAdmin, activeTab, loadData]);

    const handleViewUserDetails = async (user) => {
        try {
            const docsResponse = await getUserDocuments(user.userId);
            setSelectedUserDetails({
                ...user,
                documents: docsResponse.data
            });
            setShowUserDetailsModal(true);
        } catch {
            setSelectedUserDetails(user);
            setShowUserDetailsModal(true);
        }
    };

    const handleApproval = async (userId, action, role = null) => {
        setProcessingId(userId);
        try {
            if (action === 'approve') {
                const response = await processApproval(userId, { action, role });
                const credentials = response.data.user.credentials;
                setCredentialsModal({
                    show: true,
                    userId: credentials.userId,
                    password: credentials.password,
                    name: response.data.user.name,
                    role: response.data.user.role
                });
                toast.success(`User approved successfully!`, { duration: 5000 });
                loadData();
            } else {
                const reason = prompt('Please enter rejection reason:');
                if (reason) {
                    await processApproval(userId, { action, rejectionReason: reason });
                    toast.success('User rejected');
                    loadData();
                } else {
                    setProcessingId(null);
                    return;
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setProcessingId(null);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
            try {
                await toggleUserStatus(userId);
                toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
                loadData();
            } catch {
                toast.error('Failed to change user status');
            }
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await changeUserRole(userId, newRole);
            toast.success(`User role changed to ${newRole}`);
            loadData();
        } catch {
            toast.error('Failed to change role');
        }
    };

    const handleViewDocuments = async (userId, userName) => {
        try {
            const response = await getUserDocuments(userId);
            setDocuments(response.data);
            setCurrentDocumentUser(userName);
            setShowDocuments(true);
        } catch {
            toast.error('Failed to load documents');
        }
    };

    const handleRefreshAI = async () => {
        if (!window.confirm("Are you sure you want to refresh the AI model? This will retrain the patterns from current medical records.")) return;
        
        setRefreshingAI(true);
        try {
            const res = await refreshAI();
            toast.success(res.data.message || 'AI Model Refreshed Successfully');
            // Reload status
            const response = await getAIStatus();
            setAiStats(response.data);
            setLastUpdated(new Date());
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to refresh AI');
        } finally {
            setRefreshingAI(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    const getRoleBadgeColor = (role) => {
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

    const getStatusBadgeColor = (status) => {
        const colors = {
            approved: 'bg-green-500/20 text-green-400',
            pending: 'bg-yellow-500/20 text-yellow-400',
            rejected: 'bg-red-500/20 text-red-400',
            suspended: 'bg-gray-500/20 text-gray-400'
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400';
    };

    const filteredUsers = (activeTab === 'pending' ? pendingUsers : allUsers).filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 p-[1px]">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-12 text-center">
                        <ShieldCheckIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                        <p className="text-gray-400">Admin access only.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <ShieldCheckIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                                <p className="text-gray-400">Manage users, patients, and system access</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-gray-500">Last updated</p>
                                <p className="text-sm text-gray-300">{lastUpdated.toLocaleTimeString()}</p>
                            </div>
                            {activeTab !== 'patients' && (
                                <button onClick={loadData} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300">
                                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Patient Management Tab */}
            {activeTab === 'patients' ? (
                <PatientManagement />
            ) : activeTab === 'ai' ? (
                <div className="space-y-6">
                    <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-500 p-[1px]">
                        <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-8 text-center">
                            <CpuChipIcon className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Clinical Intelligence Control</h2>
                            <p className="text-gray-400 max-w-lg mx-auto mb-8">
                                Force the AI to retrain its models based on the latest medical records. 
                                This updates disease patterns, province weights, and outbreak detection thresholds.
                            </p>
                            
                            <div className="flex justify-center mb-10">
                                <button 
                                    onClick={handleRefreshAI}
                                    disabled={refreshingAI}
                                    className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all ${
                                        refreshingAI 
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                            : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-xl shadow-cyan-500/20 hover:scale-[1.02] hover:shadow-cyan-500/30'
                                    }`}
                                >
                                    {refreshingAI ? (
                                        <>
                                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                            <span>Rebuilding Neural Map...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CpuChipIcon className="h-5 w-5" />
                                            <span>Initialize Pattern Refresh</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {aiStats && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Diseases Tracked</p>
                                        <p className="text-3xl font-black text-white">{aiStats.diseasesTracked || 0}</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Training Pool</p>
                                        <p className="text-3xl font-black text-white">{aiStats.recordsProcessed || 0}</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">AI Version</p>
                                        <p className="text-3xl font-black text-white">v3.2.0-LTS</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Search Bar */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name, email, user ID, or hospital..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* Users List */}
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                            </div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
                            <UserGroupIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                            <p className="text-gray-400">No users found</p>
                        </div>
                    ) : (
                        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/10">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hospital</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {filteredUsers.map((user) => (
                                            <tr key={user._id} className="hover:bg-white/5 transition-all duration-300">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mr-3">
                                                            <UserIcon className="h-5 w-5 text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{user.firstName} {user.lastName}</p>
                                                            <p className="text-sm text-gray-400">{user.userId}</p>
                                                            <p className="text-xs text-gray-500">{user.position}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-300 flex items-center">
                                                        <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-500" />
                                                        {user.email}
                                                    </p>
                                                    <p className="text-sm text-gray-400 flex items-center mt-1">
                                                        <PhoneIcon className="h-4 w-4 mr-1 text-gray-500" />
                                                        {user.phoneNumber}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-300">{user.hospitalName}</p>
                                                    <p className="text-sm text-gray-400 flex items-center mt-1">
                                                        <MapPinIcon className="h-4 w-4 mr-1 text-gray-500" />
                                                        {user.province}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {activeTab === 'pending' ? (
                                                        <select
                                                            value={user.role === 'pending' ? 'doctor' : user.role}
                                                            onChange={(e) => handleRoleChange(user.userId, e.target.value)}
                                                            className="text-sm rounded-lg bg-white/5 border border-white/10 text-white px-2 py-1 focus:outline-none focus:border-purple-500"
                                                            disabled={processingId === user.userId}
                                                        >
                                                            <option value="doctor">Doctor</option>
                                                            <option value="nurse">Nurse</option>
                                                            <option value="data_entry">Data Entry</option>
                                                            <option value="viewer">Viewer</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                                {user.role}
                                                            </span>
                                                            {user.role !== 'admin' && (
                                                                <select
                                                                    onChange={(e) => handleRoleChange(user.userId, e.target.value)}
                                                                    className="text-xs rounded-lg bg-white/5 border border-white/10 text-white px-1 py-1 focus:outline-none focus:border-purple-500"
                                                                    value={user.role}
                                                                >
                                                                    <option value="doctor">Doctor</option>
                                                                    <option value="nurse">Nurse</option>
                                                                    <option value="data_entry">Data Entry</option>
                                                                    <option value="viewer">Viewer</option>
                                                                </select>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusBadgeColor(user.approvalStatus)}`}>
                                                        {user.approvalStatus}
                                                    </span>
                                                    {!user.isActive && (
                                                        <span className="ml-2 px-2 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400">
                                                            Suspended
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleViewUserDetails(user)}
                                                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all duration-300"
                                                    >
                                                        <EyeIcon className="h-4 w-4 mr-1" />
                                                        View
                                                    </button>
                                                    {activeTab === 'pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleApproval(user.userId, 'approve', user.role === 'pending' ? 'doctor' : user.role)}
                                                                disabled={processingId === user.userId}
                                                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all duration-300 disabled:opacity-50"
                                                            >
                                                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleApproval(user.userId, 'reject')}
                                                                disabled={processingId === user.userId}
                                                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300 disabled:opacity-50"
                                                            >
                                                                <XCircleIcon className="h-4 w-4 mr-1" />
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleViewDocuments(user.userId, `${user.firstName} ${user.lastName}`)}
                                                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all duration-300"
                                                            >
                                                                <DocumentTextIcon className="h-4 w-4 mr-1" />
                                                                Docs
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus(user.userId, user.isActive)}
                                                                className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-all duration-300 ${
                                                                    user.isActive
                                                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                }`}
                                                            >
                                                                {user.isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* User Details Modal */}
            {showUserDetailsModal && selectedUserDetails && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900/95">
                                <h2 className="text-2xl font-bold text-white">User Verification Details</h2>
                                <button onClick={() => setShowUserDetailsModal(false)} className="text-gray-400 hover:text-white transition">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                                        <UserIcon className="h-5 w-5 mr-2" />
                                        Personal Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><p className="text-gray-400">Full Name</p><p className="text-white font-medium">{selectedUserDetails.firstName} {selectedUserDetails.lastName}</p></div>
                                        <div><p className="text-gray-400">Email</p><p className="text-white font-medium">{selectedUserDetails.email}</p></div>
                                        <div><p className="text-gray-400">Phone</p><p className="text-white font-medium">{selectedUserDetails.phoneNumber}</p></div>
                                        <div><p className="text-gray-400">Employee ID</p><p className="text-white font-medium">{selectedUserDetails.employeeId}</p></div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                                        <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                                        Professional Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><p className="text-gray-400">Hospital</p><p className="text-white font-medium">{selectedUserDetails.hospitalName}</p></div>
                                        <div><p className="text-gray-400">Hospital ID</p><p className="text-white font-medium">{selectedUserDetails.hospitalId}</p></div>
                                        <div><p className="text-gray-400">Province</p><p className="text-white font-medium">{selectedUserDetails.province}</p></div>
                                        <div><p className="text-gray-400">Position</p><p className="text-white font-medium">{selectedUserDetails.position}</p></div>
                                    </div>
                                </div>
                                {selectedUserDetails.documents?.documents && Object.keys(selectedUserDetails.documents.documents).length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                                            <DocumentTextIcon className="h-5 w-5 mr-2" />
                                            Verification Documents
                                        </h3>
                                        <div className="space-y-2">
                                            {Object.entries(selectedUserDetails.documents.documents).map(([key, url]) => (
                                                <a key={key} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group">
                                                    <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    <DocumentTextIcon className="h-5 w-5 text-purple-400 group-hover:scale-110 transition" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end">
                                <button onClick={() => setShowUserDetailsModal(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Modal */}
            {credentialsModal.show && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-md">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="h-8 w-8 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-green-400 mb-2">User Approved!</h2>
                            <p className="text-gray-400 text-sm">User credentials generated successfully</p>
                            
                            <div className="space-y-3 my-6">
                                <div className="rounded-xl bg-white/5 p-4">
                                    <p className="text-gray-400 text-sm mb-1">User ID</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-white text-xl font-mono font-bold">{credentialsModal.userId}</p>
                                        <button onClick={() => copyToClipboard(credentialsModal.userId)} className="p-1 rounded-lg text-gray-400 hover:text-purple-400 transition">
                                            <ClipboardIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white/5 p-4">
                                    <p className="text-gray-400 text-sm mb-1">Temporary Password</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-white text-xl font-mono font-bold">{credentialsModal.password}</p>
                                        <button onClick={() => copyToClipboard(credentialsModal.password)} className="p-1 rounded-lg text-gray-400 hover:text-purple-400 transition">
                                            <ClipboardIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-xl bg-purple-500/20 border border-purple-500/30 p-3 mb-6">
                                <p className="text-purple-300 text-xs">
                                    📧 These credentials have been sent to the user's email.
                                    <br />
                                    User will be prompted to change password on first login.
                                </p>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button onClick={() => { copyToClipboard(`User ID: ${credentialsModal.userId}\nPassword: ${credentialsModal.password}`); }} className="flex-1 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
                                    Copy All
                                </button>
                                <button onClick={() => setCredentialsModal({ show: false })} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents Modal */}
            {showDocuments && documents && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900/95">
                                <h2 className="text-2xl font-bold text-white">Verification Documents</h2>
                                <button onClick={() => setShowDocuments(false)} className="text-gray-400 hover:text-white">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-400 text-sm mb-4">{currentDocumentUser} - {documents.userId}</p>
                                {documents.documents && Object.keys(documents.documents).length > 0 ? (
                                    <div className="space-y-3">
                                        {Object.entries(documents.documents).map(([key, url]) => (
                                            <a key={key} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group">
                                                <div>
                                                    <p className="text-white font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Click to view</p>
                                                </div>
                                                <DocumentTextIcon className="h-6 w-6 text-purple-400 group-hover:scale-110 transition" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-center py-8">No verification documents uploaded</p>
                                )}
                            </div>
                            <div className="p-6 border-t border-white/10 flex justify-end">
                                <button onClick={() => setShowDocuments(false)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;