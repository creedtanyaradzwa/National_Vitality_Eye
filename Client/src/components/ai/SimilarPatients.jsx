import React, { useState } from 'react';
import { UserGroupIcon, UserIcon, MapPinIcon, CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getSimilarPatients } from '../../services/api';
import toast from 'react-hot-toast';

const SimilarPatients = ({ patientId }) => {
    const [similarPatients, setSimilarPatients] = useState(null);
    const [loading, setLoading] = useState(false);

    const findSimilarPatients = async () => {
        setLoading(true);
        try {
            const response = await getSimilarPatients(patientId, 10);
            setSimilarPatients(response.data);
        } catch (error) {
            console.error('Similar patients error:', error);
            toast.error('Failed to find similar patients');
        } finally {
            setLoading(false);
        }
    };

    const getSimilarityColor = (score) => {
        if (score >= 70) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getOutcomeBadge = (outcome) => {
        if (outcome === 'Discharged') return 'bg-green-500/20 text-green-400';
        if (outcome === 'Admitted') return 'bg-yellow-500/20 text-yellow-400';
        if (outcome === 'Deceased') return 'bg-red-500/20 text-red-400';
        return 'bg-gray-500/20 text-gray-400';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-purple-400 flex items-center">
                    <UserGroupIcon className="h-5 w-5 mr-2" />
                    Similar Patients
                </h3>
                <button
                    onClick={findSimilarPatients}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg transition-all"
                >
                    {loading ? 'Searching...' : 'Find Similar Patients'}
                </button>
            </div>

            {similarPatients && (
                <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-400">Similar Patients Found</p>
                            <p className="text-2xl font-bold text-white">{similarPatients.totalSimilarFound}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-400">Average Similarity</p>
                            <p className="text-2xl font-bold text-white">{similarPatients.summary?.averageSimilarity || 0}%</p>
                        </div>
                    </div>

                    {/* Success Rate */}
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-sm text-gray-400 mb-1">Success Rate Among Similar Patients</p>
                        <div className="flex items-center space-x-3">
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                    style={{ width: `${similarPatients.summary?.successRateAmongSimilar || 0}%` }}
                                />
                            </div>
                            <span className="text-white font-bold">{similarPatients.summary?.successRateAmongSimilar || 0}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Percentage of similar patients who were discharged successfully</p>
                    </div>

                    {/* Similar Patients List */}
                    {similarPatients.similarPatients && similarPatients.similarPatients.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            <h4 className="font-semibold text-white">Top Matches</h4>
                            {similarPatients.similarPatients.map((patient, idx) => (
                                <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-2">
                                            <UserIcon className="h-5 w-5 text-purple-400" />
                                            <p className="font-semibold text-white">Patient Profile</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-lg font-bold ${getSimilarityColor(patient.similarity)}`}>
                                                {patient.similarity}%
                                            </span>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getOutcomeBadge(patient.outcome)}`}>
                                                {patient.outcome}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                        <div className="flex items-center space-x-1 text-gray-400">
                                            <UserIcon className="h-3 w-3" />
                                            <span>{patient.ageGroup}</span>
                                        </div>
                                        <div className="flex items-center space-x-1 text-gray-400">
                                            <MapPinIcon className="h-3 w-3" />
                                            <span>{patient.province}</span>
                                        </div>
                                        {patient.lastVisit && (
                                            <div className="flex items-center space-x-1 text-gray-400">
                                                <CalendarIcon className="h-3 w-3" />
                                                <span>{new Date(patient.lastVisit).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {patient.matchingFactors && patient.matchingFactors.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                            <p className="text-xs text-purple-400 mb-1">Matching Factors:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {patient.matchingFactors.map((factor, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                                                        {factor}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-white/5 rounded-xl">
                            <UserGroupIcon className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                            <p className="text-gray-400">No similar patients found</p>
                            <p className="text-xs text-gray-500 mt-1">Try adjusting search criteria</p>
                        </div>
                    )}

                    {/* Insight */}
                    {similarPatients.summary?.successRateAmongSimilar > 70 && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                            <p className="text-sm text-green-400">💡 Insight: Similar patients have shown positive outcomes with current treatment approaches.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SimilarPatients;