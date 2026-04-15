import React, { useState } from 'react';
import { HeartIcon, PlusIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PregnancyInfo = ({ pregnancyInfo, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        isPregnant: pregnancyInfo?.isPregnant || false,
        dueDate: pregnancyInfo?.dueDate ? pregnancyInfo.dueDate.split('T')[0] : '',
        gravida: pregnancyInfo?.gravida || '',
        para: pregnancyInfo?.para || '',
        abortions: pregnancyInfo?.abortions || '',
        livingChildren: pregnancyInfo?.livingChildren || '',
        lastMenstrualPeriod: pregnancyInfo?.lastMenstrualPeriod ? pregnancyInfo.lastMenstrualPeriod.split('T')[0] : '',
        highRisk: pregnancyInfo?.highRisk || false,
        notes: pregnancyInfo?.notes || ''
    });

    const [antenatalVisits, setAntenatalVisits] = useState(pregnancyInfo?.antenatalVisits || []);
    const [showVisitForm, setShowVisitForm] = useState(false);
    const [newVisit, setNewVisit] = useState({ facility: '', notes: '' });

    const handleSave = async () => {
        try {
            await onUpdate({
                ...formData,
                antenatalVisits
            });
            toast.success('Pregnancy information updated');
            setIsEditing(false);
        } catch  {
            toast.error('Failed to update');
        }
    };

    const addAntenatalVisit = () => {
        if (newVisit.facility) {
            setAntenatalVisits([...antenatalVisits, { ...newVisit, visitDate: new Date() }]);
            setNewVisit({ facility: '', notes: '' });
            setShowVisitForm(false);
        }
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center">
                        <HeartIcon className="h-5 w-5 mr-2" />
                        Pregnancy Information
                    </h3>
                    {canEdit && (
                        <button onClick={() => setIsEditing(true)} className="text-blue-400 hover:text-blue-300 text-sm">
                            Edit
                        </button>
                    )}
                </div>

                {!pregnancyInfo?.isPregnant ? (
                    <p className="text-gray-400">Not pregnant / No pregnancy information recorded</p>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Due Date</p>
                            <p className="text-white font-medium">{pregnancyInfo.dueDate ? new Date(pregnancyInfo.dueDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Gravida (Pregnancies)</p>
                            <p className="text-white font-medium">{pregnancyInfo.gravida || 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Para (Births)</p>
                            <p className="text-white font-medium">{pregnancyInfo.para || 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Living Children</p>
                            <p className="text-white font-medium">{pregnancyInfo.livingChildren || 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Abortions/Miscarriages</p>
                            <p className="text-white font-medium">{pregnancyInfo.abortions || 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Last Menstrual Period</p>
                            <p className="text-white font-medium">{pregnancyInfo.lastMenstrualPeriod ? new Date(pregnancyInfo.lastMenstrualPeriod).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        {pregnancyInfo.highRisk && (
                            <div className="col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <p className="text-sm text-red-400 font-medium">⚠️ High Risk Pregnancy</p>
                                <p className="text-xs text-red-300 mt-1">{pregnancyInfo.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {antenatalVisits.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold text-white mb-2">Antenatal Visits</h4>
                        <div className="space-y-2">
                            {antenatalVisits.map((visit, idx) => (
                                <div key={idx} className="bg-white/5 rounded-lg p-3">
                                    <p className="text-sm text-white">{visit.facility}</p>
                                    <p className="text-xs text-gray-400">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                    {visit.notes && <p className="text-xs text-gray-500 mt-1">{visit.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-400">Edit Pregnancy Information</h3>
            
            <div className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    checked={formData.isPregnant}
                    onChange={(e) => setFormData({ ...formData, isPregnant: e.target.checked })}
                    className="w-4 h-4 rounded"
                />
                <label className="text-white">Currently Pregnant</label>
            </div>

            {formData.isPregnant && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                            <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Last Menstrual Period</label>
                            <input type="date" value={formData.lastMenstrualPeriod} onChange={(e) => setFormData({ ...formData, lastMenstrualPeriod: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Gravida (# of pregnancies)</label>
                            <input type="number" value={formData.gravida} onChange={(e) => setFormData({ ...formData, gravida: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Para (# of births)</label>
                            <input type="number" value={formData.para} onChange={(e) => setFormData({ ...formData, para: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Abortions/Miscarriages</label>
                            <input type="number" value={formData.abortions} onChange={(e) => setFormData({ ...formData, abortions: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Living Children</label>
                            <input type="number" value={formData.livingChildren} onChange={(e) => setFormData({ ...formData, livingChildren: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.highRisk}
                            onChange={(e) => setFormData({ ...formData, highRisk: e.target.checked })}
                            className="w-4 h-4 rounded"
                        />
                        <label className="text-white">High Risk Pregnancy</label>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Notes</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Additional notes..." />
                    </div>

                    {/* Antenatal Visits */}
                    <div className="border-t border-white/10 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-white">Antenatal Visits</h4>
                            <button onClick={() => setShowVisitForm(!showVisitForm)} className="text-purple-400 text-sm flex items-center">
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Visit
                            </button>
                        </div>

                        {showVisitForm && (
                            <div className="bg-white/5 rounded-lg p-3 mb-3 space-y-2">
                                <input type="text" placeholder="Facility Name" value={newVisit.facility} onChange={(e) => setNewVisit({ ...newVisit, facility: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                <textarea placeholder="Notes" value={newVisit.notes} onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                                <div className="flex space-x-2">
                                    <button onClick={addAntenatalVisit} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">Save</button>
                                    <button onClick={() => setShowVisitForm(false)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">Cancel</button>
                                </div>
                            </div>
                        )}

                        {antenatalVisits.map((visit, idx) => (
                            <div key={idx} className="bg-white/5 rounded-lg p-3 mb-2">
                                <p className="text-sm text-white">{visit.facility}</p>
                                <p className="text-xs text-gray-400">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                {visit.notes && <p className="text-xs text-gray-500 mt-1">{visit.notes}</p>}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="flex space-x-3 pt-4">
                <button onClick={handleSave} className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/10 text-white rounded-lg">Cancel</button>
            </div>
        </div>
    );
};

export default PregnancyInfo;