import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    UserPlusIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ArrowPathIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PORTAL_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/patient`;

const roleLabel = (role) => ({
    doctor:     'Doctor',
    nurse:      'Nurse',
    data_entry: 'Data Entry',
    viewer:     'Viewer',
    admin:      'Administrator',
}[role] || role);

const TrustedProviders = () => {
    const navigate = useNavigate();
    const [trusted, setTrusted]   = useState([]);
    const [eligible, setEligible] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [actionId, setActionId] = useState(null);

    const getHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('patientToken')}`,
        'Content-Type': 'application/json',
    });

    const load = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }
            const [trustedRes, eligibleRes] = await Promise.all([
                fetch(`${PORTAL_API}/trusted-providers`,          { headers: getHeaders() }),
                fetch(`${PORTAL_API}/trusted-providers/eligible`, { headers: getHeaders() }),
            ]);
            const [trustedData, eligibleData] = await Promise.all([trustedRes.json(), eligibleRes.json()]);
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

    useEffect(() => { load(); }, []);

    const grantAccess = async (userId) => {
        setActionId(userId);
        try {
            const res = await fetch(`${PORTAL_API}/trusted-providers/${userId}`, {
                method: 'POST', headers: getHeaders(),
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
        if (!window.confirm(`Remove access for ${name}? They will no longer see your records.`)) return;
        setActionId(userId);
        try {
            const res = await fetch(`${PORTAL_API}/trusted-providers/${userId}`, {
                method: 'DELETE', headers: getHeaders(),
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-cyber-blue/20 border-t-cyber-blue animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8">
            {/* Back */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/patient/dashboard')}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Home</span>
                </button>
            </div>

            {/* Header */}
            <div className="bg-brand-dark-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 mb-8">
                <div className="flex justify-between items-center flex-wrap gap-6">
                    <div className="flex items-center space-x-5">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 rounded-xl bg-cyber-blue/20 blur-lg" />
                            <div className="relative w-14 h-14 rounded-xl bg-brand-dark-950 border border-cyber-blue/30 flex items-center justify-center">
                                <ShieldCheckIcon className="h-7 w-7 text-cyber-blue" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">My Care Team</h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">Control which health workers can see your records</p>
                        </div>
                    </div>
                    <button
                        onClick={load}
                        className="p-3 rounded-xl bg-brand-dark-950 border border-white/5 hover:border-cyber-blue/30 text-gray-500 hover:text-cyber-blue transition-all"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-cyber-blue/5 border border-cyber-blue/10 rounded-xl p-5 mb-8 flex items-start gap-4">
                <InformationCircleIcon className="h-5 w-5 text-cyber-blue flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400 leading-relaxed">
                    <p className="font-black text-white mb-1">How access control works</p>
                    <p className="text-xs font-medium">Only workers who have already been involved in your care appear here. When you remove someone, they lose access immediately.</p>
                </div>
            </div>

            {/* Trusted section */}
            <div className="mb-10">
                <h2 className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-cyber-blue" />
                    Granted Full Access ({trusted.length})
                </h2>

                {trusted.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trusted.map(p => (
                            <div key={p._id} className="bg-brand-dark-900/60 border border-cyber-blue/20 rounded-xl p-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center">
                                        <CheckCircleIcon className="h-5 w-5 text-cyber-blue" />
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-sm">{p.firstName} {p.lastName}</p>
                                        <p className="text-xs text-gray-500 font-medium">{roleLabel(p.role)}{p.position ? ` · ${p.position}` : ''}</p>
                                        <p className="text-[9px] text-cyber-blue/50 font-black uppercase mt-0.5">Full Access Granted</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => revokeAccess(p._id, `${p.firstName} ${p.lastName}`)}
                                    disabled={actionId === p._id}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-xs font-black disabled:opacity-50"
                                >
                                    {actionId === p._id ? '...' : 'Revoke'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-brand-dark-900/40 border border-dashed border-white/10 rounded-xl py-10 text-center">
                        <ShieldExclamationIcon className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No health workers have been granted full access yet.</p>
                    </div>
                )}
            </div>

            {/* Eligible section */}
            <div>
                <h2 className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                    <UserPlusIcon className="h-4 w-4 text-cyber-blue" />
                    Health Workers in Your Care History ({eligible.length})
                </h2>

                {eligible.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {eligible.map(p => (
                            <div key={p._id} className="bg-brand-dark-900/60 border border-white/5 hover:border-cyber-blue/20 rounded-xl p-5 flex items-center justify-between gap-4 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-brand-dark-950 border border-white/10 group-hover:border-cyber-blue/20 flex items-center justify-center text-[10px] font-black text-white uppercase transition-all">
                                        {p.firstName?.[0]}{p.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-sm">{p.firstName} {p.lastName}</p>
                                        <p className="text-xs text-gray-500 font-medium">{roleLabel(p.role)}{p.position ? ` · ${p.position}` : ''}</p>
                                        <p className="text-[9px] text-gray-600 font-black uppercase mt-0.5">{p.hospitalName || 'Medical Facility'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => grantAccess(p._id)}
                                    disabled={actionId === p._id}
                                    className="px-3 py-1.5 rounded-lg bg-cyber-blue/10 text-cyber-blue hover:bg-cyber-blue/20 border border-cyber-blue/20 transition text-xs font-black disabled:opacity-50"
                                >
                                    {actionId === p._id ? '...' : 'Grant Access'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-brand-dark-900/40 border border-dashed border-white/10 rounded-xl py-10 text-center">
                        <UserGroupIcon className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">
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
