import React, { useState, useEffect } from 'react';
import { UserIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PediatricInfo = ({ pediatricInfo, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        birthWeight: '',
        birthLength: '',
        gestationalAge: '',
        deliveryType: 'Vaginal',
        apgarScore: { oneMinute: '', fiveMinute: '' }
    });
    const [milestones, setMilestones] = useState([]);
    const [showMilestoneForm, setShowMilestoneForm] = useState(false);
    const [newMilestone, setNewMilestone] = useState({ milestone: '', achievedDate: '', notes: '' });

    useEffect(() => {
        if (pediatricInfo) {
            setFormData({
                birthWeight: pediatricInfo.birthWeight || '',
                birthLength: pediatricInfo.birthLength || '',
                gestationalAge: pediatricInfo.gestationalAge || '',
                deliveryType: pediatricInfo.deliveryType || 'Vaginal',
                apgarScore: {
                    oneMinute: pediatricInfo.apgarScore?.oneMinute || '',
                    fiveMinute: pediatricInfo.apgarScore?.fiveMinute || ''
                }
            });
            setMilestones(pediatricInfo.developmentalMilestones || []);
        }
    }, [pediatricInfo]);

    const handleSave = async () => {
        try {
            await onUpdate({
                ...formData,
                developmentalMilestones: milestones
            });
            toast.success('Pediatric information updated');
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const addMilestone = () => {
        if (newMilestone.milestone) {
            setMilestones([...milestones, { ...newMilestone, achievedDate: new Date(newMilestone.achievedDate) }]);
            setNewMilestone({ milestone: '', achievedDate: '', notes: '' });
            setShowMilestoneForm(false);
        }
    };

    const removeMilestone = (index) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center">
                        <UserIcon className="h-5 w-5 mr-2" />
                        Pediatric Information
                    </h3>
                    {canEdit && (
                        <button onClick={() => setIsEditing(true)} className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded-lg bg-blue-500/20">
                            Edit
                        </button>
                    )}
                </div>

                {!pediatricInfo?.birthWeight && !pediatricInfo?.birthLength ? (
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <p className="text-gray-400">No pediatric information recorded</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-lg p-3">
                                <p className="text-xs text-gray-500">Birth Weight</p>
                                <p className="text-white font-medium">{pediatricInfo.birthWeight || 'N/A'} kg</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                                <p className="text-xs text-gray-500">Birth Length</p>
                                <p className="text-white font-medium">{pediatricInfo.birthLength || 'N/A'} cm</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                                <p className="text-xs text-gray-500">Gestational Age</p>
                                <p className="text-white font-medium">{pediatricInfo.gestationalAge || 'N/A'} weeks</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                                <p className="text-xs text-gray-500">Delivery Type</p>
                                <p className="text-white font-medium">{pediatricInfo.deliveryType || 'N/A'}</p>
                            </div>
                            {pediatricInfo.apgarScore?.oneMinute && (
                                <div className="bg-white/5 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Apgar (1 min)</p>
                                    <p className="text-white font-medium">{pediatricInfo.apgarScore.oneMinute}</p>
                                </div>
                            )}
                            {pediatricInfo.apgarScore?.fiveMinute && (
                                <div className="bg-white/5 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Apgar (5 min)</p>
                                    <p className="text-white font-medium">{pediatricInfo.apgarScore.fiveMinute}</p>
                                </div>
                            )}
                        </div>

                        {milestones.length > 0 && (
                            <div className="mt-3">
                                <h4 className="font-semibold text-white mb-2">Developmental Milestones ({milestones.length})</h4>
                                <div className="space-y-2">
                                    {milestones.map((milestone, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-lg p-3">
                                            <p className="text-sm text-white font-medium">{milestone.milestone}</p>
                                            <p className="text-xs text-gray-400">Achieved: {new Date(milestone.achievedDate).toLocaleDateString()}</p>
                                            {milestone.notes && <p className="text-xs text-gray-500 mt-1">{milestone.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-400">Edit Pediatric Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Birth Weight (kg)</label>
                    <input type="number" step="0.1" value={formData.birthWeight} onChange={(e) => setFormData({ ...formData, birthWeight: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Birth Length (cm)</label>
                    <input type="number" step="0.1" value={formData.birthLength} onChange={(e) => setFormData({ ...formData, birthLength: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Gestational Age (weeks)</label>
                    <input type="number" value={formData.gestationalAge} onChange={(e) => setFormData({ ...formData, gestationalAge: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Delivery Type</label>
                    <select value={formData.deliveryType} onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                        <option value="Vaginal">Vaginal</option>
                        <option value="C-Section">C-Section</option>
                        <option value="Assisted">Assisted</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Apgar Score (1 minute)</label>
                    <input type="number" min="0" max="10" value={formData.apgarScore.oneMinute} onChange={(e) => setFormData({ apgarScore: { ...formData.apgarScore, oneMinute: e.target.value } })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Apgar Score (5 minutes)</label>
                    <input type="number" min="0" max="10" value={formData.apgarScore.fiveMinute} onChange={(e) => setFormData({ apgarScore: { ...formData.apgarScore, fiveMinute: e.target.value } })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
            </div>

            {/* Developmental Milestones */}
            <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-white">Developmental Milestones ({milestones.length})</h4>
                    <button onClick={() => setShowMilestoneForm(!showMilestoneForm)} className="text-purple-400 text-sm flex items-center">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Milestone
                    </button>
                </div>

                {showMilestoneForm && (
                    <div className="bg-white/5 rounded-lg p-3 mb-3 space-y-2">
                        <input type="text" placeholder="Milestone (e.g., First steps, First words)" value={newMilestone.milestone} onChange={(e) => setNewMilestone({ ...newMilestone, milestone: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        <input type="date" value={newMilestone.achievedDate} onChange={(e) => setNewMilestone({ ...newMilestone, achievedDate: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        <textarea placeholder="Notes" value={newMilestone.notes} onChange={(e) => setNewMilestone({ ...newMilestone, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        <div className="flex space-x-2">
                            <button onClick={addMilestone} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">Save</button>
                            <button onClick={() => setShowMilestoneForm(false)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">Cancel</button>
                        </div>
                    </div>
                )}

                {milestones.map((milestone, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3 mb-2 flex justify-between items-start">
                        <div>
                            <p className="text-sm text-white font-medium">{milestone.milestone}</p>
                            <p className="text-xs text-gray-400">Achieved: {new Date(milestone.achievedDate).toLocaleDateString()}</p>
                            {milestone.notes && <p className="text-xs text-gray-500 mt-1">{milestone.notes}</p>}
                        </div>
                        <button onClick={() => removeMilestone(idx)} className="text-red-400 text-sm">Remove</button>
                    </div>
                ))}
            </div>

            <div className="flex space-x-3 pt-4">
                <button onClick={handleSave} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">Cancel</button>
            </div>
        </div>
    );
};

export default PediatricInfo;