import React, { useState, useEffect } from 'react';
import { SparklesIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Immunizations = ({ immunizations, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [immunizationsList, setImmunizationsList] = useState([]);
    const [newImmunization, setNewImmunization] = useState({
        vaccine: '',
        dateGiven: '',
        nextDueDate: '',
        administeredBy: '',
        notes: ''
    });

    useEffect(() => {
        if (immunizations) {
            setImmunizationsList(immunizations);
        }
    }, [immunizations]);

    const handleSave = async () => {
        try {
            await onUpdate(immunizationsList);
            toast.success('Immunizations updated');
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const addImmunization = () => {
        if (newImmunization.vaccine && newImmunization.dateGiven) {
            setImmunizationsList([...immunizationsList, { ...newImmunization, dateGiven: new Date(newImmunization.dateGiven), nextDueDate: newImmunization.nextDueDate ? new Date(newImmunization.nextDueDate) : null }]);
            setNewImmunization({ vaccine: '', dateGiven: '', nextDueDate: '', administeredBy: '', notes: '' });
        }
    };

    const removeImmunization = (index) => {
        setImmunizationsList(immunizationsList.filter((_, i) => i !== index));
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center">
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Immunizations / Vaccinations
                    </h3>
                    {canEdit && (
                        <button onClick={() => setIsEditing(true)} className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded-lg bg-blue-500/20">
                            Edit
                        </button>
                    )}
                </div>

                {immunizationsList.length === 0 ? (
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <p className="text-gray-400">No immunizations recorded</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {immunizationsList.map((imm, idx) => (
                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-white">{imm.vaccine}</p>
                                        <p className="text-sm text-gray-400">Given: {new Date(imm.dateGiven).toLocaleDateString()}</p>
                                        {imm.nextDueDate && <p className="text-sm text-yellow-400">Next Due: {new Date(imm.nextDueDate).toLocaleDateString()}</p>}
                                        {imm.administeredBy && <p className="text-xs text-gray-500">By: {imm.administeredBy}</p>}
                                        {imm.notes && <p className="text-xs text-gray-500 mt-1">{imm.notes}</p>}
                                    </div>
                                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400">Completed</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-400">Edit Immunizations</h3>
            
            <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-white">Add New Immunization</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="Vaccine Name" value={newImmunization.vaccine} onChange={(e) => setNewImmunization({ ...newImmunization, vaccine: e.target.value })} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                    <input type="date" placeholder="Date Given" value={newImmunization.dateGiven} onChange={(e) => setNewImmunization({ ...newImmunization, dateGiven: e.target.value })} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                    <input type="date" placeholder="Next Due Date (Optional)" value={newImmunization.nextDueDate} onChange={(e) => setNewImmunization({ ...newImmunization, nextDueDate: e.target.value })} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                    <input type="text" placeholder="Administered By" value={newImmunization.administeredBy} onChange={(e) => setNewImmunization({ ...newImmunization, administeredBy: e.target.value })} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
                <textarea placeholder="Notes" value={newImmunization.notes} onChange={(e) => setNewImmunization({ ...newImmunization, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                <button onClick={addImmunization} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition">Add Immunization</button>
            </div>

            {immunizationsList.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-semibold text-white">Current Immunizations ({immunizationsList.length})</h4>
                    {immunizationsList.map((imm, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-white">{imm.vaccine}</p>
                                <p className="text-xs text-gray-400">Given: {new Date(imm.dateGiven).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => removeImmunization(idx)} className="text-red-400 text-sm">Remove</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex space-x-3 pt-4">
                <button onClick={handleSave} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">Cancel</button>
            </div>
        </div>
    );
};

export default Immunizations;