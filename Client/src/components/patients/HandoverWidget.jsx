import React, { useState, useEffect } from 'react';
import { 
    ClipboardDocumentCheckIcon, 
    PlusIcon, 
    CheckCircleIcon,
    ClockIcon,
    ExclamationCircleIcon,
    ChatBubbleLeftRightIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { createHandover, getPatientHandovers, completeHandoverTask, getHospitalStaff } from '../../services/api';
import toast from 'react-hot-toast';

const HandoverWidget = ({ patientId }) => {
    const [handovers, setHandovers] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        summaryNote: '',
        shiftType: 'Morning',
        type: 'Shift',
        targetHospital: '',
        assignedUsers: [],
        tasks: [{ description: '', priority: 'Medium' }]
    });

    const HOSPITALS = [
        "Parirenyatwa Group of Hospitals",
        "Harare Central Hospital",
        "Mpilo Central Hospital",
        "United Bulawayo Hospitals",
        "Chitungwiza Central Hospital",
        "Mutare Provincial Hospital",
        "Masvingo Provincial Hospital",
        "Gweru Provincial Hospital",
        "Bindura Provincial Hospital",
        "Chinhoyi Provincial Hospital"
    ];

    useEffect(() => {
        loadHandovers();
        loadStaff();
    }, [patientId]);

    const loadHandovers = async () => {
        try {
            const res = await getPatientHandovers(patientId);
            setHandovers(res.data);
        } catch (err) {
            console.error('Error loading handovers:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadStaff = async () => {
        try {
            const res = await getHospitalStaff();
            setStaff(res.data);
        } catch (err) {
            console.error('Error loading staff:', err);
        }
    };

    const handleAddTaskField = () => {
        setFormData({
            ...formData,
            tasks: [...formData.tasks, { description: '', priority: 'Medium' }]
        });
    };

    const handleTaskChange = (index, field, value) => {
        const newTasks = [...formData.tasks];
        newTasks[index][field] = value;
        setFormData({ ...formData, tasks: newTasks });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Filter out empty tasks
            const filteredTasks = formData.tasks.filter(t => t.description.trim() !== '');
            await createHandover({
                patientId,
                ...formData,
                tasks: filteredTasks
            });
            toast.success(formData.type === 'Transfer' ? 'Inter-hospital referral created' : 'Handover checklist created');
            setShowAddModal(false);
            setFormData({
                summaryNote: '',
                shiftType: 'Morning',
                type: 'Shift',
                targetHospital: '',
                assignedUsers: [],
                tasks: [{ description: '', priority: 'Medium' }]
            });
            loadHandovers();
        } catch (err) {
            toast.error('Failed to create handover');
        }
    };

    const handleCompleteTask = async (handoverId, taskId) => {
        try {
            await completeHandoverTask(handoverId, taskId);
            toast.success('Task marked as completed');
            loadHandovers();
        } catch (err) {
            toast.error('Failed to update task');
        }
    };

    // Extract all pending tasks from all handovers
    const pendingTasks = handovers.flatMap(h => 
        h.tasks.filter(t => t.status === 'Pending').map(t => ({ 
            ...t, 
            handoverId: h._id, 
            creator: h.creatorId,
            type: h.type,
            sourceHospital: h.sourceHospital,
            targetHospital: h.targetHospital,
            assignedUsers: h.assignedUsers
        }))
    );

    if (loading) return <div className="animate-pulse h-20 bg-white/5 rounded-2xl" />;

    return (
        <div className="space-y-6">
            {/* Handover Banner */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-cyber-blue to-cyber-purple p-[1px] group">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]"></div>
                <div className="relative rounded-2xl bg-slate-900/90 backdrop-blur-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-cyber-blue/20 text-cyber-blue">
                                <ChatBubbleLeftRightIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Handover & Referral Hub</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cross-Hospital Continuity</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 rounded-xl bg-cyber-blue text-white text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center space-x-2"
                        >
                            <PlusIcon className="h-4 w-4" />
                            <span>New Handover / Transfer</span>
                        </button>
                    </div>

                    {pendingTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingTasks.map((task, i) => (
                                <div key={i} className={`flex items-start justify-between p-4 rounded-xl border transition-all group ${
                                    task.type === 'Transfer' 
                                    ? 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500' 
                                    : 'bg-white/5 border-white/10 hover:border-cyber-blue/30'
                                }`}>
                                    <div className="flex items-start space-x-3">
                                        <button 
                                            onClick={() => handleCompleteTask(task.handoverId, task._id)}
                                            className={`mt-1 h-5 w-5 rounded border flex items-center justify-center transition-all ${
                                                task.type === 'Transfer' ? 'border-purple-500/50 hover:border-purple-500' : 'border-white/20 hover:border-cyber-blue'
                                            }`}
                                        >
                                            <div className={`h-2 w-2 rounded-sm bg-transparent ${
                                                task.type === 'Transfer' ? 'group-hover:bg-purple-500/20' : 'group-hover:bg-cyber-blue/20'
                                            }`}></div>
                                        </button>
                                        <div>
                                            <div className="flex items-center space-x-2 mb-1">
                                                {task.type === 'Transfer' && (
                                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500 text-white">Incoming Transfer</span>
                                                )}
                                                <p className="text-sm font-bold text-gray-200">{task.description}</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                    task.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                                                    task.priority === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                    {task.priority} Priority
                                                </span>
                                                <span className="text-[8px] font-bold text-gray-500 uppercase flex items-center">
                                                    <ClockIcon className="h-3 w-3 mr-1" />
                                                    {task.creator?.firstName} {task.creator?.lastName} ({task.sourceHospital || 'Unknown'})
                                                </span>
                                            </div>
                                            {task.assignedUsers && task.assignedUsers.length > 0 && (
                                                <div className="flex items-center gap-1 mt-2">
                                                    <span className="text-[7px] font-black text-gray-600 uppercase">Forwarded To:</span>
                                                    <div className="flex -space-x-1.5">
                                                        {task.assignedUsers.map((user, idx) => (
                                                            <div key={idx} title={`${user.firstName} ${user.lastName} (${user.role})`} className="w-5 h-5 rounded-full bg-cyber-blue/20 border border-cyber-blue/30 flex items-center justify-center text-[7px] font-black text-cyber-blue">
                                                                {user.firstName[0]}{user.lastName[0]}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                            <CheckCircleIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No pending shift or transfer tasks</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Handover Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex justify-between items-center mb-1">
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Clinical Handover</h2>
                                <div className="flex bg-white/5 rounded-lg p-1">
                                    <button 
                                        onClick={() => setFormData({ ...formData, type: 'Shift' })}
                                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${formData.type === 'Shift' ? 'bg-cyber-blue text-white' : 'text-gray-500'}`}
                                    >
                                        Shift
                                    </button>
                                    <button 
                                        onClick={() => setFormData({ ...formData, type: 'Transfer' })}
                                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${formData.type === 'Transfer' ? 'bg-cyber-purple text-white' : 'text-gray-500'}`}
                                    >
                                        Transfer
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                {formData.type === 'Transfer' ? 'Prepare referral data for another facility' : 'Document critical tasks for the next shift'}
                            </p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {formData.type === 'Shift' ? (
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Shift Period</label>
                                        <select 
                                            value={formData.shiftType}
                                            onChange={(e) => setFormData({ ...formData, shiftType: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyber-blue outline-none transition-all"
                                        >
                                            <option value="Morning">Morning Shift</option>
                                            <option value="Afternoon">Afternoon Shift</option>
                                            <option value="Night">Night Shift</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2 block">Target Destination Hospital</label>
                                        <select 
                                            required
                                            value={formData.targetHospital}
                                            onChange={(e) => setFormData({ ...formData, targetHospital: e.target.value })}
                                            className="w-full bg-white/5 border border-purple-500/20 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-all"
                                        >
                                            <option value="">Select Receiving Facility...</option>
                                            {HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                                    {formData.type === 'Transfer' ? 'Transfer / Referral Summary' : 'Shift Summary Note'}
                                </label>
                                <textarea 
                                    required
                                    value={formData.summaryNote}
                                    onChange={(e) => setFormData({ ...formData, summaryNote: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyber-blue outline-none transition-all"
                                    rows="3"
                                    placeholder={formData.type === 'Transfer' ? "Summarize clinical status and reason for referral..." : "Briefly describe the patient's state during your shift..."}
                                />
                            </div>

                            {/* Assigned Personnel */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                                    <UserGroupIcon className="h-3 w-3 mr-1" />
                                    Assign Personnel (Same Facility)
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                    {staff.map((s) => (
                                        <label key={s._id} className={`flex items-center space-x-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                            formData.assignedUsers.includes(s._id)
                                            ? 'bg-cyber-blue/10 border-cyber-blue/50'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}>
                                            <input 
                                                type="checkbox"
                                                checked={formData.assignedUsers.includes(s._id)}
                                                onChange={(e) => {
                                                    const newAssigned = e.target.checked 
                                                        ? [...formData.assignedUsers, s._id]
                                                        : formData.assignedUsers.filter(id => id !== s._id);
                                                    setFormData({ ...formData, assignedUsers: newAssigned });
                                                }}
                                                className="hidden"
                                            />
                                            <div className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                                                formData.assignedUsers.includes(s._id) ? 'border-cyber-blue bg-cyber-blue' : 'border-white/30'
                                            }`}>
                                                {formData.assignedUsers.includes(s._id) && <div className="h-1 w-1 bg-white rounded-full" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-white truncate">{s.firstName} {s.lastName}</p>
                                                <p className="text-[8px] font-black text-gray-500 uppercase">{s.role} - {s.position}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {staff.length === 0 && (
                                        <p className="col-span-2 text-[10px] text-gray-500 font-bold italic py-2">No other clinical staff found in this facility.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        {formData.type === 'Transfer' ? 'Stabilization & Transport Checklist' : 'Actionable Task Checklist'}
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={handleAddTaskField}
                                        className="text-[10px] font-black text-cyber-blue uppercase tracking-widest flex items-center"
                                    >
                                        <PlusIcon className="h-3 w-3 mr-1" /> Add Action
                                    </button>
                                </div>
                                
                                {formData.tasks.map((task, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={task.description}
                                            onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-cyber-blue outline-none"
                                            placeholder={formData.type === 'Transfer' ? "e.g., Maintain O2 during transport" : "e.g., Change IV bag at 10 PM"}
                                        />
                                        <select 
                                            value={task.priority}
                                            onChange={(e) => handleTaskChange(index, 'priority', e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-[10px] text-white outline-none"
                                        >
                                            <option value="High">High</option>
                                            <option value="Medium">Med</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className={`flex-[2] px-6 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all ${
                                        formData.type === 'Transfer' 
                                        ? 'bg-gradient-to-r from-cyber-purple to-pink-500 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]' 
                                        : 'bg-gradient-to-r from-cyber-blue to-cyber-purple hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                                    }`}
                                >
                                    {formData.type === 'Transfer' ? 'Authorize Inter-Hospital Transfer' : 'Confirm Shift Handover'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HandoverWidget;
