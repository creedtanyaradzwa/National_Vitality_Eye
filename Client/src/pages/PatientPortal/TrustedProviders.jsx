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
    ArrowPathIcon
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
    const [actionId, setActionId]   = useState(null); // userId currently being actioned

    const headers = () => {
        const token = localStorage.getItem('patientToken');
        return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    };

    const load = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('patientToken');
            if (!token) { navigate('/patient/login'); return; }

            const [trustedRes, eligibleRes] = await Promise.all([
                fetch(`${PORTAL_API}/trusted-providers`,          { headers: headers() }),
                fetch(`${PORTAL_API}/trusted-providers/eligible`, { headers: headers() })
            ]);
            const [trustedData, eligibleData] = await Promise.all([
                trustedRes.json(), eligibleRes.json()
            ]);

            if (!trustedRes.ok)  throw new Error(trustedData.error);
            if (!eligibleRes.ok) throw new Error(eligibleData.error);

            setTrusted(eligibleData.eligible.length > 0 || trustedData.trusted.length > 0
                ? trustedData.trusted
                : []);
            setEligible(eligibleData.eligible || []);
        } catch (err) {
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
                method: 'POST',
                headers: headers()
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
                headers: headers()
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

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <button onClick={() => navigate('/patient/dashboard')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
                    <ArrowLeftIcon className="h-5 w-5" /> Back to Dashboard
                </button>

                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6 flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheckIcon className="h-8 w-8 text-purple-400" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">My Care Team Access</h1>
                                <p className="text-gray-400 text-sm">Control which health workers can see all your records</p>
                            </div>
                        </div>
                        <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* How it works */}
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 mb-6 flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-300 leading-relaxed space-y-1">
                        <p><strong>How this works:</strong> You can grant a health worker full access to all your medical records and health data.</p>
                        <p>Only workers who have already been involved in your care appear here. When you remove someone, they immediately lose access.</p>
                    </div>
                </div>

                {/* Currently trusted */}
                <div className="mb-8">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4 text-green-400" />
                        Currently Trusted ({trusted.length})
                    </h2>

                    {trusted.length > 0 ? (
                        <div className="space-y-3">
                            {trusted.map(p => (
                                <div key={p._id} className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                            <CheckCircleIcon className="h-5 w-5 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">
                                                {p.firstName} {p.lastName}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {roleLabel(p.role)}{p.position ? ` · ${p.position}` : ''}{p.hospitalName ? ` · ${p.hospitalName}` : ''}
                                            </p>
                                            {p.grantedAt && (
                                                <p className="text-[10px] text-gray-600 mt-0.5">
                                                    Access granted {new Date(p.grantedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => revokeAccess(p._id, `${p.firstName} ${p.lastName}`)}
                                        disabled={actionId === p._id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-xs font-medium disabled:opacity-50"
                                    >
                                        {actionId === p._id
                                            ? <div className="w-3 h-3 border border-red-400/30 rounded-full animate-spin border-t-red-400" />
                                            : <UserMinusIcon className="h-3.5 w-3.5" />}
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
                            <ShieldExclamationIcon className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No health workers have been granted full access yet.</p>
                        </div>
                    )}
                </div>

                {/* Eligible to add */}
                <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UserPlusIcon className="h-4 w-4 text-purple-400" />
                        Your Care Team — Available to Add ({eligible.length})
                    </h2>

                    {eligible.length > 0 ? (
                        <div className="space-y-3">
                            {eligible.map(p => (
                                <div key={p._id} className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between gap-4 hover:border-purple-500/30 transition-all duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-purple-400 font-bold text-sm">
                                                {p.firstName?.[0]}{p.lastName?.[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">
                                                {p.firstName} {p.lastName}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {roleLabel(p.role)}{p.position ? ` · ${p.position}` : ''}{p.hospitalName ? ` · ${p.hospitalName}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => grantAccess(p._id)}
                                        disabled={actionId === p._id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition text-xs font-medium disabled:opacity-50"
                                    >
                                        {actionId === p._id
                                            ? <div className="w-3 h-3 border border-purple-400/30 rounded-full animate-spin border-t-purple-400" />
                                            : <UserPlusIcon className="h-3.5 w-3.5" />}
                                        Grant Access
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
                            <InformationCircleIcon className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">
                                {trusted.length > 0
                                    ? 'All health workers from your care team have already been added.'
                                    : 'No health workers found. Workers who have been involved in your care will appear here.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Disclaimer */}
                <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Granting access allows this health worker to view all your medical records, clinical data, and health history.
                        You can remove access at any time. Only workers who have previously been involved in your care can be added.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrustedProviders;
