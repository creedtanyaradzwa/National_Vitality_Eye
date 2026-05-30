import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    UserPlusIcon,
    UserMinusIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ArrowPathIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = 'http://localhost:5000/api/patient';

const roleLabel = (role) => ({
    doctor:     'Doctor',
    nurse:      'Nurse',
    data_entry: 'Data Entry',
    viewer:     'Viewer',
    admin:      'Administrator'
}[role] || role);

const TrustedProviders = () => {
    const navigate = useNavigate();
    const [trusted, setTrusted]     = useState([]);
    const [eligible, setEligible]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [actionId, setActionId]   = useState(null);

    const getHeaders = () => {
        const token = localStorage.getItem('patientToken');
        return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    };

    const load = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }

            const [trustedRes, eligibleRes] = await Promise.all([
                fetch(`${PORTAL_API}/trusted-providers`,          { headers: getHeaders() }),
                fetch(`${PORTAL_API}/trusted-providers/eligible`, { headers: getHeaders() })
            ]);
            const [trustedData, eligibleData] = await Promise.all([
                trustedRes.json(), eligibleRes.json()
            ]);

            if (!trustedRes.ok)  throw new Error(trustedData.error);
            if (!eligibleRes.ok) throw new Error(eligibleData.error);

            setTrusted(trustedData.trusted || []);
            setEligible(eligibleData.eligible || []);
        } catch (err) {
            console.error('Error loading providers:', err);
            toast.error('Could not load providers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const grantAccess = async (userId) => {
        setActionId(userId);
        try {
            const res = await fetch(`${PORTAL_API}/trusted-providers/${userId}`, {
                method: 'POST',
                headers: getHeaders()
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(data.message);
            await load();
        } catch (err) {
            toast.error(err.message || 'Could not grant access');
        } finally {
            setActionId(null);
        }
    };

    const revokeAccess = async (userId, name) => {
        if (!window.confirm(`Remove access for ${name}? They will no longer be able to see your records.`)) return;
        setActionId(userId);
        try {
            const res = await fetch(`${PORTAL_API}/trusted-providers/${userId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(data.message);
            await load();
        } catch (err) {
            toast.error(err.message || 'Could not revoke access');
        } finally {
            setActionId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-8">
            {/* Navigation Header */}
            <div className="mb-10">
                <button 
                    onClick={() => navigate('/patient/dashboard')} 
                    className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition" />
                    <span className="text-xs font-bold uppercase tracking-wider">Back to Home</span>
                </button>
            </div>

            {/* Page Title */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mb-10">
                <div className="flex justify-between items-center flex-wrap gap-6">
                    <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ShieldCheckIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">My Care Team</h1>
                            <p className="text-slate-400 font-medium mt-1">
                                Control which health workers can see your records.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={load} 
                        className="p-3 rounded-xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 text-slate-500 hover:text-emerald-400 transition-all"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Information Banner */}
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 mb-10 flex items-start gap-4">
                <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-400 leading-relaxed">
                    <p className="font-bold text-slate-200 mb-1">How access control works:</p>
                    <p>You can grant specific health workers full access to your medical history. Only workers who have already been involved in your care appear here. When you remove someone, they lose access immediately.</p>
                </div>
            </div>

            {/* Currently Trusted Section */}
            <div className="mb-12">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
                    Granted Full Access ({trusted.length})
                </h2>

                {trusted.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trusted.map(p => (
                            <div key={p._id} className="bg-slate-900/40 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">
                                            {p.firstName} {p.lastName}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {roleLabel(p.role)}{p.position ? ` · ${p.position}` : ''}
                                        </p>
                                        <p className="text-[10px] text-emerald-500/60 font-bold uppercase mt-1">
                                            Full Access Granted
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => revokeAccess(p._id, `${p.firstName} ${p.lastName}`)}
                                    disabled={actionId === p._id}
                                    className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition text-xs font-bold disabled:opacity-50"
                                >
                                    {actionId === p._id ? 'Processing...' : 'Revoke'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl py-12 text-center">
                        <ShieldExclamationIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 font-medium">No health workers have been granted full access yet.</p>
                    </div>
                )}
            </div>

            {/* Eligible Section */}
            <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                    <UserPlusIcon className="h-4 w-4 text-emerald-400" />
                    Health Workers in Your Care Team ({eligible.length})
                </h2>

                {eligible.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {eligible.map(p => (
                            <div key={p._id} className="bg-slate-900/40 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between gap-4 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-emerald-400 font-bold">
                                        {p.firstName?.[0]}{p.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">
                                            {p.firstName} {p.lastName}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {roleLabel(p.role)}{p.position ? ` · ${p.position}` : ''}
                                        </p>
                                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">
                                            {p.hospitalName || 'Medical Facility'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => grantAccess(p._id)}
                                    disabled={actionId === p._id}
                                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition text-xs font-bold disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                                >
                                    {actionId === p._id ? '...' : 'Grant Access'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-900/20 border border-dashed border-white/10 rounded-3xl py-12 text-center">
                        <UserGroupIcon className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 font-medium">
                            {trusted.length > 0
                                ? 'All available health workers have already been granted access.'
                                : 'No other health workers found in your recent care history.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrustedProviders;