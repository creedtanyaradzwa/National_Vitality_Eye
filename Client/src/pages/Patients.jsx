import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPatients, createPatient, updatePatient, deletePatient, getPatientByNationalId } from '../services/api';
import { useAuth } from '../context/AuthProvider';
import { useDataRefresh } from '../context/DataRefreshProvider.jsx';
import { 
    PlusIcon, 
    MagnifyingGlassIcon, 
    PencilIcon, 
    TrashIcon, 
    EyeIcon,
    UserGroupIcon,
    XMarkIcon,
    SparklesIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CommandLineIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Patients = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission } = useAuth();
    const { refreshData } = useDataRefresh();
    const canEdit = hasPermission('edit:patients');
    const canCreate = hasPermission('create:patients');
    const canDelete = hasPermission('delete:patients');
    
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(location.state?.initialSearchTerm || '');
    const [showModal, setShowModal] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [limit] = useState(10);
    
    const [formData, setFormData] = useState({
        nationalId: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'Male',
        province: 'Harare',
        contactInfo: {
            phone: '',
            email: '',
            address: ''
        }
    });

    useEffect(() => {
        loadPatients();
    }, [page]);

    const loadPatients = async () => {
        setLoading(true);
        try {
            const response = await getPatients(page, limit, searchTerm);
            setPatients(response.data.patients);
            setTotalPages(response.data.pages);
            setTotalResults(response.data.total);
        } catch {
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadPatients();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (editingPatient) {
                await updatePatient(editingPatient._id, formData);
                toast.success('Patient updated successfully');
                refreshData();
            } else {
                await createPatient(formData);
                toast.success('Patient created successfully');
                refreshData();
            }
            
            setShowModal(false);
            setEditingPatient(null);
            setFormData({
                nationalId: '',
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                gender: 'Male',
                province: 'Harare',
                contactInfo: { phone: '', email: '', address: '' }
            });
            loadPatients();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleEdit = (patient) => {
        setEditingPatient(patient);
        setFormData({
            nationalId: patient.nationalId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
            gender: patient.gender,
            province: patient.province,
            contactInfo: {
                phone: patient.contactInfo?.phone || '',
                email: patient.contactInfo?.email || '',
                address: patient.contactInfo?.address || ''
            }
        });
        setShowModal(true);
    };

    const handleDelete = async (patient) => {
        if (window.confirm(`Are you sure you want to delete ${patient.firstName} ${patient.lastName}?`)) {
            try {
                await deletePatient(patient._id);
                toast.success('Patient deleted successfully');
                refreshData();
                loadPatients();
            } catch {
                toast.error('Failed to delete patient');
            }
        }
    };

    const handleAddNew = () => {
        setEditingPatient(null);
        setFormData({
            nationalId: '',
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: 'Male',
            province: 'Harare',
            contactInfo: { phone: '', email: '', address: '' }
        });
        setShowModal(true);
    };

    const getTriageStyles = (priority) => {
        switch(priority) {
            case 'CRITICAL': return 'bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            case 'EMERGENT': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
            case 'URGENT': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case 'STABLE': return 'bg-cyber-green/20 text-cyber-green border-cyber-green/30';
            default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark-950">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyber-blue/20 rounded-full animate-spin border-t-cyber-blue"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <UserGroupIcon className="h-6 w-6 text-cyber-blue animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark-950 pb-20">
            {/* Header Section */}
            <div className="bg-brand-dark-900/50 border-b border-white/5 py-12 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div>
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-3 rounded-2xl bg-brand-dark-800 border border-cyber-blue/30 shadow-[0_0_20px_rgba(0,242,255,0.1)]">
                                    <UserGroupIcon className="h-8 w-8 text-cyber-blue" />
                                </div>
                                <h1 className="text-4xl font-bold text-white tracking-tight">Citizen Registry</h1>
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-500 ml-16">
                                National Health Database v3.0
                            </p>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="relative group">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-cyber-blue transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH BY NAME OR ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-700 font-mono text-sm focus:outline-none focus:border-cyber-blue/50 focus:ring-4 focus:ring-cyber-blue/5 transition-all duration-500"
                                />
                            </div>
                            {canCreate && (
                                <button
                                    onClick={handleAddNew}
                                    className="btn-primary-modern px-8 py-4 uppercase tracking-[0.2em] text-[10px] font-bold flex items-center"
                                >
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Register Citizen
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">
                <div className="glass-card-modern border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-brand-dark-900/50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Priority</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">National ID</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Name</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Sector (Province)</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Contact</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-transparent">
                                {patients.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <UserGroupIcon className="h-12 w-12 text-brand-dark-800 mb-4" />
                                                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">No records detected in local cache</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    patients.map((patient) => (
                                        <tr key={patient._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${getTriageStyles(patient.clinicalProfile?.triageStatus?.priority)}`}>
                                                    {patient.clinicalProfile?.triageStatus?.priority === 'CRITICAL' && (
                                                        <span className="relative flex h-2 w-2 mr-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                        </span>
                                                    )}
                                                    {patient.clinicalProfile?.triageStatus?.priority || 'STABLE'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <span className="text-sm font-mono text-gray-400 group-hover:text-cyber-blue transition-colors">
                                                    {patient.nationalId}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-lg bg-brand-dark-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 mr-3">
                                                        {patient.firstName[0]}{patient.lastName[0]}
                                                    </div>
                                                    <span className="text-sm font-bold text-white tracking-tight">
                                                        {patient.firstName} {patient.lastName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                                                {patient.province}
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                {patient.contactInfo?.phone || 'SECURE_NODE'}
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => navigate('/records', { state: { selectedPatient: patient } })}
                                                        className="p-2.5 rounded-xl bg-brand-dark-800 border border-white/5 text-gray-500 hover:text-cyber-blue hover:border-cyber-blue/30 transition-all duration-300"
                                                        title="ACCESS_NODE"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(patient)}
                                                        disabled={!canEdit}
                                                        className="p-2.5 rounded-xl bg-brand-dark-800 border border-white/5 text-gray-500 hover:text-cyber-purple hover:border-cyber-purple/30 transition-all duration-300 disabled:opacity-10"
                                                        title="MODIFY_ENTRY"
                                                    >
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(patient)}
                                                        disabled={!canDelete}
                                                        className="p-2.5 rounded-xl bg-brand-dark-800 border border-white/5 text-gray-500 hover:text-red-500 hover:border-red-500/30 transition-all duration-300 disabled:opacity-10"
                                                        title="PURGE_RECORD"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalResults)} of {totalResults} Citizens
                        </p>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-xl bg-brand-dark-900 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all font-mono text-xs uppercase tracking-widest"
                            >
                                Previous
                            </button>
                            <div className="flex items-center space-x-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-10 h-10 rounded-xl border transition-all font-mono text-xs ${page === i + 1 ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue shadow-[0_0_15px_rgba(0,242,255,0.1)]' : 'bg-brand-dark-900 border-white/5 text-gray-500 hover:text-white'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 rounded-xl bg-brand-dark-900 border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all font-mono text-xs uppercase tracking-widest"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-dark-950/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-2xl glass-card-modern border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 bg-brand-dark-900/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
                                    <ShieldCheckIcon className="h-6 w-6 mr-3 text-cyber-blue" />
                                    {editingPatient ? 'MODIFY CITIZEN RECORD' : 'NEW CITIZEN REGISTRATION'}
                                </h2>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-1">Biometric & Identity Initialization</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                                <XMarkIcon className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">National Identifier</label>
                                    <input
                                        type="text"
                                        name="nationalId"
                                        value={formData.nationalId}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-white placeholder-gray-800 font-mono text-sm focus:outline-none focus:border-cyber-blue/50 transition-all"
                                        placeholder="00-000000X00"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">Province Sector</label>
                                    <select
                                        name="province"
                                        value={formData.province}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-white focus:outline-none focus:border-cyber-blue/50 transition-all appearance-none"
                                    >
                                        {[
                                            'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
                                            'Mashonaland East', 'Mashonaland West', 'Masvingo',
                                            'Matabeleland North', 'Matabeleland South', 'Midlands'
                                        ].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-white focus:outline-none focus:border-cyber-blue/50 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-white focus:outline-none focus:border-cyber-blue/50 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">Birth Date</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-white focus:outline-none focus:border-cyber-blue/50 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">Gender</label>
                                    <div className="flex gap-4 p-1 bg-brand-dark-950 rounded-xl border border-white/5">
                                        {['Male', 'Female', 'Other'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${formData.gender === g ? 'bg-cyber-blue text-brand-dark-950 shadow-lg shadow-cyber-blue/20' : 'text-gray-600 hover:text-white'}`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center">
                                    <CommandLineIcon className="h-4 w-4 mr-2" />
                                    Communication Link
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">Secure Phone</label>
                                        <input
                                            type="text"
                                            name="contactInfo.phone"
                                            value={formData.contactInfo.phone}
                                            onChange={handleInputChange}
                                            className="w-full px-5 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 ml-1">Encrypted Email</label>
                                        <input
                                            type="email"
                                            name="contactInfo.email"
                                            value={formData.contactInfo.email}
                                            onChange={handleInputChange}
                                            className="w-full px-5 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-8 py-4 rounded-2xl bg-brand-dark-900 border border-white/5 text-gray-500 font-bold text-[10px] uppercase tracking-widest hover:text-white hover:bg-brand-dark-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary-modern px-10 py-4 uppercase tracking-[0.2em] text-[10px] font-bold"
                                >
                                    {editingPatient ? 'Update Node' : 'Initialize Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Patients;
