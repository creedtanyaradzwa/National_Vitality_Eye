import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, createPatient, updatePatient, deletePatient, getPatientByNationalId } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useDataRefresh } from '../context/useDataRefresh';
import { 
    PlusIcon, 
    MagnifyingGlassIcon, 
    PencilIcon, 
    TrashIcon, 
    EyeIcon,
    UserGroupIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Patients = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { refreshData } = useDataRefresh();
    const canEdit = hasPermission('edit:patients');
    const canCreate = hasPermission('create:patients');
    const canDelete = hasPermission('delete:patients');
    
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
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
    }, []);

    const loadPatients = async () => {
        try {
            const response = await getPatients();
            setPatients(response.data);
        } catch {
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            loadPatients();
            return;
        }
        
        try {
            const response = await getPatientByNationalId(searchTerm);
            if (response.data) {
                setPatients([response.data]);
            } else {
                setPatients([]);
                toast.info('No patient found with that National ID');
            }
        } catch (error) {
            if (error.response?.status === 404) {
                setPatients([]);
                toast.info('No patient found with that National ID');
            } else {
                toast.error('Search failed');
            }
        }
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

    const provinces = [
        'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
        'Mashonaland East', 'Mashonaland West', 'Masvingo',
        'Matabeleland North', 'Matabeleland South', 'Midlands'
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <UserGroupIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <UserGroupIcon className="h-5 w-5 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white">Patients</h1>
                        </div>
                        <p className="text-gray-400">Manage patient records and medical history</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={handleAddNew}
                            className="relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 group bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 flex items-center space-x-2"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>Add Patient</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-6">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-4">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search by National ID (e.g., 63-123456-A12)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all duration-300 flex items-center space-x-2"
                        >
                            <MagnifyingGlassIcon className="h-5 w-5" />
                            <span>Search</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Patients Table */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px]">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">National ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Gender</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date of Birth</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Province</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {patients.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                                            No patients found
                                        </td>
                                    </tr>
                                ) : (
                                    patients.map((patient) => (
                                        <tr key={patient._id} className="hover:bg-white/5 transition-colors duration-300">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                {patient.nationalId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {patient.firstName} {patient.lastName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {patient.gender}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {patient.province}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {patient.contactInfo?.phone || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => navigate(`/patients/${patient._id}`)}
                                                        className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-all duration-300"
                                                        title="View Patient Details"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(patient)}
                                                        disabled={!canEdit}
                                                        className={`p-2 rounded-lg transition-all duration-300 ${canEdit ? 'text-blue-400 hover:bg-blue-500/20' : 'text-gray-600 cursor-not-allowed'}`}
                                                    >
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(patient)}
                                                        disabled={!canDelete}
                                                        className={`p-2 rounded-lg transition-all duration-300 ${canDelete ? 'text-red-400 hover:bg-red-500/20' : 'text-gray-600 cursor-not-allowed'}`}
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
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl">
                            <div className="p-6 border-b border-white/10 sticky top-0 bg-slate-900/90">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-white">
                                        {editingPatient ? 'Edit Patient' : 'Add New Patient'}
                                    </h2>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">National ID *</label>
                                        <input
                                            type="text"
                                            name="nationalId"
                                            value={formData.nationalId}
                                            onChange={handleInputChange}
                                            placeholder="63-123456-A12"
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                                            required
                                            disabled={!!editingPatient}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">First Name *</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Last Name *</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            name="dateOfBirth"
                                            value={formData.dateOfBirth}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all duration-300"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Gender</label>
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all duration-300"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Province</label>
                                        <select
                                            name="province"
                                            value={formData.province}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all duration-300"
                                        >
                                            {provinces.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="border-t border-white/10 pt-4 mt-2">
                                    <h3 className="font-semibold text-white mb-3">Contact Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                name="contactInfo.phone"
                                                value={formData.contactInfo.phone}
                                                onChange={handleInputChange}
                                                placeholder="+263771234567"
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                            <input
                                                type="email"
                                                name="contactInfo.email"
                                                value={formData.contactInfo.email}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                                            />
                                        </div>
                                        
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                                            <input
                                                type="text"
                                                name="contactInfo.address"
                                                value={formData.contactInfo.address}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-all duration-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                                    >
                                        {editingPatient ? 'Update' : 'Create'} Patient
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Patients;