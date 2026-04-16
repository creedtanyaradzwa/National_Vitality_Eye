import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SpecialNeeds = ({ specialNeeds, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        hasDisability: false,
        disabilityType: '',
        requiresAssistance: false,
        notes: ''
    });

    useEffect(() => {
        if (specialNeeds) {
            setFormData({
                hasDisability: specialNeeds.hasDisability || false,
                disabilityType: specialNeeds.disabilityType || '',
                requiresAssistance: specialNeeds.requiresAssistance || false,
                notes: specialNeeds.notes || ''
            });
        }
    }, [specialNeeds]);

    const handleSave = async () => {
        try {
            await onUpdate(formData);
            toast.success('Special needs information updated');
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center">
                        <ShieldCheckIcon className="h-5 w-5 mr-2" />
                        Special Needs / Disabilities
                    </h3>
                    {canEdit && (
                        <button onClick={() => setIsEditing(true)} className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded-lg bg-blue-500/20">
                            Edit
                        </button>
                    )}
                </div>

                {!specialNeeds?.hasDisability ? (
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <p className="text-gray-400">No special needs or disabilities recorded</p>
                    </div>
                ) : (
                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                        <p><span className="text-gray-400">Type:</span> <span className="text-white">{specialNeeds.disabilityType || 'Not specified'}</span></p>
                        <p><span className="text-gray-400">Requires Assistance:</span> <span className="text-white">{specialNeeds.requiresAssistance ? 'Yes' : 'No'}</span></p>
                        {specialNeeds.notes && <p><span className="text-gray-400">Notes:</span> <span className="text-white">{specialNeeds.notes}</span></p>}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-400">Edit Special Needs Information</h3>
            
            <div className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    checked={formData.hasDisability}
                    onChange={(e) => setFormData({ ...formData, hasDisability: e.target.checked })}
                    className="w-4 h-4 rounded"
                />
                <label className="text-white">Has Disability / Special Need</label>
            </div>

            {formData.hasDisability && (
                <>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Disability/Special Need Type</label>
                        <input type="text" value={formData.disabilityType} onChange={(e) => setFormData({ ...formData, disabilityType: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="e.g., Physical disability, Visual impairment, etc." />
                    </div>

                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.requiresAssistance}
                            onChange={(e) => setFormData({ ...formData, requiresAssistance: e.target.checked })}
                            className="w-4 h-4 rounded"
                        />
                        <label className="text-white">Requires Assistance</label>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Additional Notes</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Any additional information..." />
                    </div>
                </>
            )}

            <div className="flex space-x-3 pt-4">
                <button onClick={handleSave} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">Cancel</button>
            </div>
        </div>
    );
};

export default SpecialNeeds;