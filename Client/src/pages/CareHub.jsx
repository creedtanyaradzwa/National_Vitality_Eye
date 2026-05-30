import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getPatients, 
    getAlerts,
    getGlobalSummary,
    getHospitalHandovers,
    completeHandoverTask,
    getHospitalStaff,
    assignHandoverStaff
} from '../services/api';
import { useAuth } from '../context/AuthProvider';
import { 
    HeartIcon, 
    UserGroupIcon, 
    ExclamationTriangleIcon,
    ArrowTrendingUpIcon,
    BeakerIcon,
    ShieldCheckIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ChevronRightIcon,
    ChatBubbleLeftRightIcon,
    ArrowPathRoundedSquareIcon,
    CheckCircleIcon,
    UserPlusIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CareHub = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [stats, setStats] = useState({
        totalPatients: 0,
        highRiskPatients: 0,
        pendingFollowUps: 0,
        recentAnomalies: 0
    });
    const [highPriorityPatients, setHighPriorityPatients] = useState([]);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedHandover, setSelectedHandover] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [quickSearchTerm, setQuickSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        loadCareData();
        if (currentUser?.role === 'admin') {
            loadStaff();
        }
    }, [currentUser]);

    const handleQuickSearch = async (e) => {
        if (e.key === 'Enter' && quickSearchTerm.trim()) {
            setIsSearching(true);
            try {
                const response = await getPatients(1, 5, quickSearchTerm);
                const patientsList = response.data.patients || [];
                
                if (patientsList.length === 1) {
                    navigate('/records', { state: { selectedPatient: patientsList[0] } });
                    toast.success(`Found patient: ${patientsList[0].firstName} ${patientsList[0].lastName}`);
                } else if (patientsList.length > 1) {
                    navigate('/patients', { state: { initialSearchTerm: quickSearchTerm } });
                    toast.info(`Found ${patientsList.length} matches. Redirecting...`);
                } else {
                    toast.error('No citizen found with that ID or name');
                }
            } catch (error) {
                toast.error('Search failed');
            } finally {
                setIsSearching(false);
            }
        }
    };

    const loadStaff = async () => {
        try {
            const res = await getHospitalStaff();
            setStaffMembers(res.data);
        } catch (err) {
            console.error("Failed to load staff", err);
        }
    };

    const loadCareData = async () => {
        setLoading(true);
        try {
            const [patientsRes, summaryRes, handoversRes] = await Promise.all([
                getPatients(1, 5),
                getGlobalSummary(),
                getHospitalHandovers()
            ]);

            // Filter for high priority/critical patients for the clinical queue
            const allPatients = patientsRes.data?.patients || [];
            setHighPriorityPatients(allPatients);

            // Extract pending tasks from handovers
            const tasks = handoversRes.data.flatMap(h => 
                h.tasks.filter(t => t.status === 'Pending').map(t => ({
                    ...t,
                    handoverId: h._id,
                    type: h.type,
                    patient: h.patientId,
                    creator: h.creatorId,
                    sourceHospital: h.sourceHospital,
                    assignedUsers: h.assignedUsers
                }))
            );
            setPendingTasks(tasks);

            setStats({
                totalPatients: summaryRes.data?.totalPatients || 0,
                highRiskPatients: allPatients.filter(p => p.clinicalProfile?.triageStatus?.priority === 'CRITICAL').length,
                pendingFollowUps: tasks.length, 
                recentAnomalies: 4    // Simulated for now
            });

        } catch (error) {
            console.error('Failed to load care hub data', error);
            toast.error('Clinical data sync failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTask = async (handoverId, taskId) => {
        try {
            await completeHandoverTask(handoverId, taskId);
            toast.success('Task marked as completed');
            loadCareData();
        } catch (err) {
            toast.error('Failed to update task');
        }
    };

    const handleAssignStaff = async () => {
        if (!selectedHandover || selectedStaff.length === 0) return;
        try {
            await assignHandoverStaff(selectedHandover._id, selectedStaff);
            toast.success('Staff assigned to transfer successfully');
            setShowAssignModal(false);
            setSelectedStaff([]);
            loadCareData();
        } catch (err) {
            toast.error('Failed to assign staff');
        }
    };

    const toggleStaffSelection = (id) => {
        setSelectedStaff(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark-950">
                <div className="w-16 h-16 border-4 border-cyber-purple/20 rounded-full animate-spin border-t-cyber-purple" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark-950 pb-20">
            {/* Header */}
            <div className="bg-brand-dark-900/50 border-b border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 rounded-2xl bg-brand-dark-800 border border-cyber-purple/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                                    <HeartIcon className="h-8 w-8 text-cyber-purple" />
                                </div>
                                <h1 className="text-4xl font-bold text-white tracking-tight">Care Continuity Hub</h1>
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-500 ml-16">
                                Individual Patient Management & AI Diagnostics
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => navigate('/patients')}
                                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-all"
                            >
                                <UserGroupIcon className="h-4 w-4 inline mr-2" />
                                Patient Registry
                            </button>
                            <button 
                                onClick={() => navigate('/ai-predictor')}
                                className="px-6 py-3 rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 text-[10px] font-bold uppercase tracking-widest text-cyber-purple hover:bg-cyber-purple hover:text-white transition-all"
                            >
                                <BeakerIcon className="h-4 w-4 inline mr-2" />
                                Neural Diagnostic
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-12 space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Active Care Nodes', value: stats.totalPatients, icon: UserGroupIcon, color: 'text-cyber-blue' },
                        { label: 'Critical Triage', value: stats.highRiskPatients, icon: ExclamationTriangleIcon, color: 'text-red-500' },
                        { label: 'Follow-up Required', value: stats.pendingFollowUps, icon: ClockIcon, color: 'text-orange-500' },
                        { label: 'Vital Anomalies', value: stats.recentAnomalies, icon: ArrowTrendingUpIcon, color: 'text-cyber-green' }
                    ].map((s, i) => (
                        <div key={i} className="glass-card-modern p-6 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <s.icon className={`h-12 w-12 ${s.color}`} />
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-3xl font-black text-white">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Shift & Transfer Queue */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <ChatBubbleLeftRightIcon className="h-5 w-5 text-cyber-blue" />
                            Shift & Transfer Queue
                        </h2>
                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-brand-dark-800 text-cyber-blue border border-cyber-blue/20">
                            {pendingTasks.length} PENDING ACTIONS
                        </span>
                    </div>

                    {pendingTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingTasks.map((task, i) => (
                                <div 
                                    key={i} 
                                    className={`glass-card-modern p-5 border transition-all hover:scale-[1.02] cursor-pointer group ${
                                        task.type === 'Transfer' ? 'border-cyber-purple/30 bg-cyber-purple/5' : 'border-white/5'
                                    }`}
                                    onClick={() => navigate(`/patients/${task.patient._id}`)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${task.type === 'Transfer' ? 'bg-cyber-purple/20 text-cyber-purple' : 'bg-cyber-blue/20 text-cyber-blue'}`}>
                                                {task.type === 'Transfer' ? <ArrowPathRoundedSquareIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white group-hover:text-cyber-blue transition-colors">
                                                    {task.patient?.firstName} {task.patient?.lastName}
                                                </p>
                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                                    {task.type === 'Transfer' ? `From ${task.sourceHospital}` : 'Internal Shift Task'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                            task.priority === 'High' ? 'bg-red-500/20 text-red-500' :
                                            task.priority === 'Medium' ? 'bg-orange-500/20 text-orange-500' :
                                            'bg-blue-500/20 text-blue-500'
                                        }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-300 mb-4 line-clamp-2">"{task.description}"</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-brand-dark-800 flex items-center justify-center text-[8px] font-black text-gray-500">
                                                    {task.creator?.firstName[0]}{task.creator?.lastName[0]}
                                                </div>
                                                <p className="text-[9px] font-bold text-gray-500 uppercase">By {task.creator?.firstName}</p>
                                            </div>
                                            {task.assignedUsers && task.assignedUsers.length > 0 && (
                                                <div className="flex -space-x-2">
                                                    {task.assignedUsers.map((user, idx) => (
                                                        <div key={idx} title={`${user.firstName} ${user.lastName} (${user.role})`} className="w-6 h-6 rounded-full bg-cyber-blue/20 border border-cyber-blue/30 flex items-center justify-center text-[8px] font-black text-cyber-blue">
                                                            {user.firstName[0]}{user.lastName[0]}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {currentUser?.role === 'admin' && task.type === 'Transfer' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedHandover(task);
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="p-2 rounded-lg bg-cyber-purple/10 text-cyber-purple hover:bg-cyber-purple hover:text-white transition-all"
                                                    title="Assign Staff"
                                                >
                                                    <UserPlusIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCompleteTask(task.handoverId, task._id);
                                                }}
                                                className="p-2 rounded-lg bg-white/5 hover:bg-cyber-green/20 hover:text-cyber-green transition-all"
                                            >
                                                <CheckCircleIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card-modern py-12 text-center border border-dashed border-white/10">
                            <ShieldCheckIcon className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">All shift handovers and transfers completed</p>
                        </div>
                    )}
                </div>

                {/* Staff Assignment Modal (For Admins) */}
                {showAssignModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Assign Clinical Team</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                        Incoming: {selectedHandover?.patient?.firstName} {selectedHandover?.patient?.lastName}
                                    </p>
                                </div>
                                <button onClick={() => setShowAssignModal(false)} className="p-2 text-gray-500 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Personnel (Available Specialists)</label>
                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {staffMembers.map((s) => (
                                            <label key={s._id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                                selectedStaff.includes(s._id)
                                                ? 'bg-cyber-blue/10 border-cyber-blue/50'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}>
                                                <div className="flex items-center space-x-3">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedStaff.includes(s._id)}
                                                        onChange={() => toggleStaffSelection(s._id)}
                                                        className="hidden"
                                                    />
                                                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                                                        selectedStaff.includes(s._id) ? 'border-cyber-blue bg-cyber-blue' : 'border-white/30'
                                                    }`}>
                                                        {selectedStaff.includes(s._id) && <CheckCircleIcon className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{s.firstName} {s.lastName}</p>
                                                        <p className="text-[8px] font-black text-gray-500 uppercase">{s.role} - {s.position}</p>
                                                    </div>
                                                </div>
                                                <div className="text-[8px] font-mono text-cyber-blue/60">{s.hospitalName.substring(0, 10)}...</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={handleAssignStaff}
                                    disabled={selectedStaff.length === 0}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyber-blue to-cyber-purple text-white text-xs font-black uppercase tracking-widest hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm Assignment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Clinical Priority Queue */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <ShieldCheckIcon className="h-5 w-5 text-cyber-purple" />
                                Clinical Priority Queue
                            </h2>
                            <button className="text-[10px] font-bold text-gray-500 uppercase hover:text-white transition-colors">View All Patients</button>
                        </div>

                        <div className="space-y-3">
                            {highPriorityPatients.map((p, i) => (
                                <div 
                                    key={i}
                                    onClick={() => navigate(`/patients/${p._id}`)}
                                    className="glass-card-modern p-5 border border-white/5 hover:border-cyber-purple/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-brand-dark-800 border border-white/5 flex items-center justify-center text-xs font-black text-gray-500">
                                                {p.firstName[0]}{p.lastName[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-sm group-hover:text-cyber-purple transition-colors">
                                                    {p.firstName} {p.lastName}
                                                </h3>
                                                <p className="text-[10px] font-mono text-gray-500 uppercase">{p.nationalId}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            {p.clinicalProfile?.vitals?.temperature && (
                                                <div className="text-right hidden xl:block">
                                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Last Temp</p>
                                                    <p className={`text-xs font-black ${p.clinicalProfile.vitals.temperature > 38 ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {p.clinicalProfile.vitals.temperature}°C
                                                    </p>
                                                </div>
                                            )}
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Triage Status</p>
                                                <span className={`text-[10px] font-black uppercase ${p.clinicalProfile?.triageStatus?.priority === 'CRITICAL' ? 'text-red-500' : 'text-cyber-green'}`}>
                                                    {p.clinicalProfile?.triageStatus?.priority || 'STABLE'}
                                                </span>
                                            </div>
                                            <ChevronRightIcon className="h-5 w-5 text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Diagnostics Sidebar */}
                    <div className="space-y-6">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <BeakerIcon className="h-5 w-5 text-cyber-blue" />
                            Continuity Tools
                        </h2>
                        
                        <div className="glass-card-modern p-6 border border-white/5 space-y-6">
                            <button 
                                onClick={() => navigate('/ai-predictor')}
                                className="w-full p-4 rounded-2xl bg-brand-dark-800 border border-white/5 hover:border-cyber-blue/30 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <BeakerIcon className="h-5 w-5 text-cyber-blue" />
                                    <span className="text-xs font-bold text-white uppercase tracking-widest">Neural Predictor</span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">Run symptom-based disease matching and risk assessment for individual care.</p>
                            </button>

                            <button 
                                onClick={() => navigate('/records')}
                                className="w-full p-4 rounded-2xl bg-brand-dark-800 border border-white/5 hover:border-cyber-purple/30 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <ArrowTrendingUpIcon className="h-5 w-5 text-cyber-purple" />
                                    <span className="text-xs font-bold text-white uppercase tracking-widest">Vital Monitoring</span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">Track longitudinal vital signs and detect longitudinal physiological shifts.</p>
                            </button>

                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">Patient Quick Search</p>
                                <div className="relative">
                                    <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isSearching ? 'text-cyber-blue animate-pulse' : 'text-gray-500'}`} />
                                    <input 
                                        type="text" 
                                        placeholder="NAME OR NATIONAL ID..."
                                        value={quickSearchTerm}
                                        onChange={(e) => setQuickSearchTerm(e.target.value)}
                                        onKeyDown={handleQuickSearch}
                                        disabled={isSearching}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-brand-dark-950 border border-white/5 text-xs text-white focus:border-cyber-blue/30 outline-none disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CareHub;
