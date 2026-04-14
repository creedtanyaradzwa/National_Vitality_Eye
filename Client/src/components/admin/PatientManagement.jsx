import React, { useState, useEffect } from 'react';
import { 
    UserGroupIcon, 
    MagnifyingGlassIcon,
    EyeIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ArrowPathIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { 
    getAllPatientsWithPortal, 
    suspendPatientPortal, 
    reactivatePatientPortal,
    deactivatePatient,
    reactivatePatient,
    getPatientAuditLog
} from '../../services/api';
import toast from 'react-hot-toast';

const PatientManagement = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditLog, setAuditLog] = useState([]);
    const [suspendData, setSuspendData] = useState({ reason: '', duration: '' });
    const [deactivateData, setDeactivateData] = useState({ reason: '' });
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        setLoading(true);
        try {
            const response = await getAllPatientsWithPortal();
            setPatients(response.data);
        } catch  {
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspendPortal = async () => {
        if (!suspendData.reason) {
            toast.error('Please provide a reason for suspension');
            return;
        }
        
        try {
            await suspendPatientPortal(
                selectedPatient._id, 
                suspendData.reason, 
                suspendData.duration ? parseInt(suspendData.duration) : null
            );
            toast.success('Portal access suspended successfully');
            setShowSuspendModal(false);
            setSuspendData({ reason: '', duration: '' });
            loadPatients();
        } catch  {
            toast.error('Failed to suspend portal access');
        }
    };

    const handleReactivatePortal = async (patientId) => {
        if (window.confirm('Are you sure you want to reactivate portal access for this patient?')) {
            try {
                await reactivatePatientPortal(patientId);
                toast.success('Portal access reactivated');
                loadPatients();
            } catch  {
                toast.error('Failed to reactivate portal access');
            }
        }
    };

    const handleDeactivatePatient = async () => {
        if (!deactivateData.reason) {
            toast.error('Please provide a reason for deactivation');
            return;
        }
        
        if (window.confirm('WARNING: This will deactivate the patient account entirely. They will no longer be able to access any part of the system. Continue?')) {
            try {
                await deactivatePatient(selectedPatient._id, deactivateData.reason);
                toast.success('Patient account deactivated');
                setShowDeactivateModal(false);
                setDeactivateData({ reason: '' });
                loadPatients();
            } catch  {
                toast.error('Failed to deactivate patient');
            }
        }
    };

    const handleReactivatePatient = async (patientId) => {
        if (window.confirm('Are you sure you want to reactivate this patient account?')) {
            try {
                await reactivatePatient(patientId);
                toast.success('Patient account reactivated');
                loadPatients();
            } catch  {
                toast.error('Failed to reactivate patient');
            }
        }
    };

    const handleViewAudit = async (patient) => {
        try {
            const response = await getPatientAuditLog(patient._id);
            setAuditLog(response.data);
            setSelectedPatient(patient);
            setShowAuditModal(true);
        } catch  {
            toast.error('Failed to load audit log');
        }
    };

    const filteredPatients = patients.filter(patient => 
        patient.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.nationalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.portal?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (patient) => {
        if (!patient.isActive) {
            return { color: 'bg-red-500/20 text-red-400', text: 'Deactivated' };
        }
        if (patient.portal?.hasPortalAccount && !patient.portal?.portalActive) {
            return { color: 'bg-orange-500/20 text-orange-400', text: 'Portal Suspended' };
        }
        if (patient.portal?.hasPortalAccount) {
            return { color: 'bg-green-500/20 text-green-400', text: 'Portal Active' };
        }
        return { color: 'bg-gray-500/20 text-gray-400', text: 'No Portal Account' };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                    <UserGroupIcon className="h-6 w-6 mr-2 text-purple-400" />
                    Patient Management
                </h2>
                <p className="text-gray-400 mt-1">Manage patient accounts and portal access</p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name, national ID, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            {/* Refresh Button */}
            <div className="mb-4 flex justify-end">
                <button onClick={loadPatients} className="flex items-center space-x-2 text-gray-400 hover:text-white transition">
                    <ArrowPathIcon className="h-4 w-4" />
                    <span className="text-sm">Refresh</span>
                </button>
            </div>

            {/* Patients Table */}
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Patient</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">National ID</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Portal Status</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Last Login</th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        No patients found
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => {
                                    const status = getStatusBadge(patient);
                                    return (
                                        <tr key={patient._id} className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                                                        <UserGroupIcon className="h-4 w-4 text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{patient.firstName} {patient.lastName}</p>
                                                        <p className="text-xs text-gray-500">{patient.gender} • {patient.province}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                {patient.nationalId}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-300">{patient.contactInfo?.phone || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{patient.portal?.email || 'No portal email'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${status.color}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-400">
                                                {patient.portal?.lastLogin ? new Date(patient.portal.lastLogin).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleViewAudit(patient)}
                                                    className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition"
                                                    title="View Audit Log"
                                                >
                                                    <DocumentTextIcon className="h-5 w-5" />
                                                </button>
                                                
                                                {patient.portal?.hasPortalAccount && (
                                                    patient.portal.portalActive ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPatient(patient);
                                                                setShowSuspendModal(true);
                                                            }}
                                                            className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/20 transition"
                                                            title="Suspend Portal Access"
                                                        >
                                                            <XCircleIcon className="h-5 w-5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleReactivatePortal(patient._id)}
                                                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition"
                                                            title="Reactivate Portal Access"
                                                        >
                                                            <CheckCircleIcon className="h-5 w-5" />
                                                        </button>
                                                    )
                                                )}
                                                
                                                {patient.isActive ? (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPatient(patient);
                                                            setShowDeactivateModal(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition"
                                                        title="Deactivate Patient"
                                                    >
                                                        <ExclamationTriangleIcon className="h-5 w-5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReactivatePatient(patient._id)}
                                                        className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition"
                                                        title="Reactivate Patient"
                                                    >
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Suspend Modal */}
            {showSuspendModal && selectedPatient && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 p-[1px] w-full max-w-md">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Suspend Portal Access</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Suspending access for {selectedPatient.firstName} {selectedPatient.lastName}
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Reason for suspension *</label>
                                    <textarea
                                        value={suspendData.reason}
                                        onChange={(e) => setSuspendData({ ...suspendData, reason: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        rows="3"
                                        placeholder="Enter reason..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Suspension duration (days, optional)</label>
                                    <input
                                        type="number"
                                        value={suspendData.duration}
                                        onChange={(e) => setSuspendData({ ...suspendData, duration: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                        placeholder="Leave empty for indefinite"
                                        min="1"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setShowSuspendModal(false)}
                                    className="flex-1 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSuspendPortal}
                                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:shadow-lg transition"
                                >
                                    Suspend Access
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivate Modal */}
            {showDeactivateModal && selectedPatient && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-500 to-red-700 p-[1px] w-full max-w-md">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Deactivate Patient</h3>
                            </div>
                            <p className="text-gray-300 text-sm mb-4">
                                You are about to deactivate <span className="text-white font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>.
                                This will prevent all access to the system, including portal and clinical records.
                            </p>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Reason for deactivation *</label>
                                <textarea
                                    value={deactivateData.reason}
                                    onChange={(e) => setDeactivateData({ ...deactivateData, reason: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                    rows="3"
                                    placeholder="Enter reason..."
                                    required
                                />
                            </div>
                            
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setShowDeactivateModal(false)}
                                    className="flex-1 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeactivatePatient}
                                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold hover:shadow-lg transition"
                                >
                                    Deactivate Patient
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Log Modal */}
            {showAuditModal && selectedPatient && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl">
                            <div className="p-5 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900/95">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Audit Log</h3>
                                    <p className="text-gray-400 text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                </div>
                                <button onClick={() => setShowAuditModal(false)} className="text-gray-400 hover:text-white">
                                    ✕
                                </button>
                            </div>
                            <div className="p-5">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm p-2 rounded-lg bg-white/5">
                                        <span className="text-gray-400">Account Status:</span>
                                        <span className={auditLog.isActive ? 'text-green-400' : 'text-red-400'}>
                                            {auditLog.isActive ? 'Active' : 'Deactivated'}
                                        </span>
                                    </div>
                                    {auditLog.deactivationReason && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <p className="text-xs text-red-400">Deactivation Reason</p>
                                            <p className="text-sm text-gray-300">{auditLog.deactivationReason}</p>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm p-2 rounded-lg bg-white/5">
                                        <span className="text-gray-400">Failed Login Attempts:</span>
                                        <span className="text-white">{auditLog.loginAttempts || 0}</span>
                                    </div>
                                    {auditLog.lockedUntil && (
                                        <div className="flex justify-between text-sm p-2 rounded-lg bg-yellow-500/10">
                                            <span className="text-gray-400">Locked Until:</span>
                                            <span className="text-yellow-400">{new Date(auditLog.lockedUntil).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-white mb-3">Access History</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {auditLog.auditLog?.length === 0 ? (
                                                <p className="text-gray-400 text-sm">No access records found</p>
                                            ) : (
                                                auditLog.auditLog?.map((log, idx) => (
                                                    <div key={idx} className="p-3 rounded-lg bg-white/5 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-purple-400">{log.action}</span>
                                                            <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                                                        </div>
                                                        {log.ipAddress && (
                                                            <p className="text-xs text-gray-500 mt-1">IP: {log.ipAddress}</p>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-white/10">
                                <button onClick={() => setShowAuditModal(false)} className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
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

export default PatientManagement;