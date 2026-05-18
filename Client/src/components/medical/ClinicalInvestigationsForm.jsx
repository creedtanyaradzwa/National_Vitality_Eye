import React from 'react';
import { BeakerIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ClinicalInvestigationsForm = ({
    formData,
    setFormData,
    uploadingImages,
    onAddPrescription,
    onRemovePrescription,
    onAddLabTest,
    onRemoveLabTest,
    onRadiologyFiles,
    onRemoveRadiologyPreview,
    onAddRadiology,
    onRemoveRadiology
}) => (
    <>
        <section>
            <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-6">Prescriptions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {['medication', 'dosage', 'frequency'].map((field) => (
                    <input
                        key={field}
                        type="text"
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                        value={formData.prescriptionInput[field]}
                        onChange={(e) => setFormData({
                            ...formData,
                            prescriptionInput: { ...formData.prescriptionInput, [field]: e.target.value }
                        })}
                        className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-cyber-blue/30"
                    />
                ))}
                <select
                    value={formData.prescriptionInput.route}
                    onChange={(e) => setFormData({
                        ...formData,
                        prescriptionInput: { ...formData.prescriptionInput, route: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white"
                >
                    {['Oral', 'IV', 'IM', 'Topical', 'Inhaled', 'Sublingual'].map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Duration"
                    value={formData.prescriptionInput.duration}
                    onChange={(e) => setFormData({
                        ...formData,
                        prescriptionInput: { ...formData.prescriptionInput, duration: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none"
                />
                <input
                    type="text"
                    placeholder="Notes"
                    value={formData.prescriptionInput.notes}
                    onChange={(e) => setFormData({
                        ...formData,
                        prescriptionInput: { ...formData.prescriptionInput, notes: e.target.value }
                    })}
                    className="md:col-span-2 bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none"
                />
                <button
                    type="button"
                    onClick={onAddPrescription}
                    className="py-3 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-xs font-bold uppercase tracking-widest hover:bg-cyber-blue hover:text-brand-dark-950"
                >
                    Add prescription
                </button>
            </div>
            {formData.prescriptions?.length > 0 && (
                <div className="space-y-2">
                    {formData.prescriptions.map((rx, i) => (
                        <div key={i} className="flex justify-between items-start p-4 rounded-xl bg-brand-dark-950 border border-white/5 text-sm">
                            <div>
                                <p className="font-bold text-white">{rx.medication}</p>
                                <p className="text-gray-500 text-xs mt-1">
                                    {[rx.dosage, rx.frequency, rx.route, rx.duration].filter(Boolean).join(' · ')}
                                </p>
                                {rx.notes && <p className="text-gray-600 text-xs mt-1">{rx.notes}</p>}
                            </div>
                            <button type="button" onClick={() => onRemovePrescription(i)} className="text-gray-600 hover:text-red-400">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>

        <section>
            <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-6 flex items-center">
                <BeakerIcon className="h-4 w-4 mr-2 text-cyber-blue" />
                Laboratory tests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <input
                    type="text"
                    placeholder="Test name *"
                    value={formData.labTestInput.testName}
                    onChange={(e) => setFormData({
                        ...formData,
                        labTestInput: { ...formData.labTestInput, testName: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none"
                />
                <input
                    type="text"
                    placeholder="Result"
                    value={formData.labTestInput.result}
                    onChange={(e) => setFormData({
                        ...formData,
                        labTestInput: { ...formData.labTestInput, result: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none"
                />
                <input
                    type="text"
                    placeholder="Reference range"
                    value={formData.labTestInput.referenceRange}
                    onChange={(e) => setFormData({
                        ...formData,
                        labTestInput: { ...formData.labTestInput, referenceRange: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none"
                />
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                        <input
                            type="checkbox"
                            checked={formData.labTestInput.abnormal}
                            onChange={(e) => setFormData({
                                ...formData,
                                labTestInput: { ...formData.labTestInput, abnormal: e.target.checked }
                            })}
                        />
                        Abnormal
                    </label>
                    <button
                        type="button"
                        onClick={onAddLabTest}
                        className="flex-1 py-3 rounded-xl bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple text-xs font-bold uppercase"
                    >
                        Add
                    </button>
                </div>
            </div>
            {formData.labTests?.map((test, i) => (
                <div key={i} className="flex justify-between p-3 mb-2 rounded-xl bg-brand-dark-950 border border-white/5 text-sm">
                    <span className="text-white">
                        <strong>{test.testName}</strong>
                        {test.result && <span className="text-gray-400"> — {test.result}</span>}
                        {test.referenceRange && <span className="text-gray-600 text-xs"> (ref: {test.referenceRange})</span>}
                        {test.abnormal && <span className="ml-2 text-red-400 text-xs font-bold">ABNORMAL</span>}
                    </span>
                    <button type="button" onClick={() => onRemoveLabTest(i)} className="text-gray-600 hover:text-red-400">
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </section>

        <section>
            <h3 className="text-[10px] font-bold text-cyber-blue uppercase tracking-[0.3em] mb-6 flex items-center">
                <CameraIcon className="h-4 w-4 mr-2 text-cyber-blue" />
                Radiology & imaging
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                    type="text"
                    placeholder="Study type * (X-Ray, CT, MRI...)"
                    value={formData.radiologyInput.studyType}
                    onChange={(e) => setFormData({
                        ...formData,
                        radiologyInput: { ...formData.radiologyInput, studyType: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none"
                />
                <input
                    type="text"
                    placeholder="Body part"
                    value={formData.radiologyInput.bodyPart}
                    onChange={(e) => setFormData({
                        ...formData,
                        radiologyInput: { ...formData.radiologyInput, bodyPart: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white outline-none"
                />
                <textarea
                    placeholder="Findings"
                    value={formData.radiologyInput.findings}
                    onChange={(e) => setFormData({
                        ...formData,
                        radiologyInput: { ...formData.radiologyInput, findings: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white min-h-[70px] outline-none"
                />
                <textarea
                    placeholder="Impression"
                    value={formData.radiologyInput.impression}
                    onChange={(e) => setFormData({
                        ...formData,
                        radiologyInput: { ...formData.radiologyInput, impression: e.target.value }
                    })}
                    className="bg-brand-dark-950 border border-white/5 rounded-xl py-3 px-4 text-sm text-white min-h-[70px] outline-none"
                />
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
                <label className="cursor-pointer px-4 py-3 rounded-xl bg-brand-dark-950 border border-dashed border-cyber-blue/40 text-cyber-blue text-xs font-bold uppercase flex items-center gap-2 hover:bg-cyber-blue/10">
                    <CameraIcon className="h-4 w-4" />
                    Upload images
                    <input type="file" accept="image/*,.dcm,.dicom" multiple className="hidden" onChange={onRadiologyFiles} />
                </label>
                <button
                    type="button"
                    onClick={onAddRadiology}
                    className="px-6 py-3 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-xs font-bold uppercase"
                >
                    Add study
                </button>
                {uploadingImages && <span className="text-xs text-cyber-blue animate-pulse">Uploading…</span>}
            </div>
            {formData.radiologyInput.previewImages?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {formData.radiologyInput.previewImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                            <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onRemoveRadiologyPreview(idx)}
                                className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-white opacity-0 group-hover:opacity-100"
                            >
                                <XMarkIcon className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {formData.radiology?.map((study, i) => (
                <div key={i} className="p-4 mb-2 rounded-xl bg-brand-dark-950 border border-white/5">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-white text-sm">
                            {study.studyType}
                            {study.bodyPart && <span className="text-gray-500 font-normal"> · {study.bodyPart}</span>}
                        </p>
                        <button type="button" onClick={() => onRemoveRadiology(i)} className="text-gray-600 hover:text-red-400">
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                    {study.findings && <p className="text-xs text-gray-400 mt-2">Findings: {study.findings}</p>}
                    {study.impression && <p className="text-xs text-gray-500 mt-1">Impression: {study.impression}</p>}
                    <p className="text-[10px] text-cyber-blue mt-2">
                        {(study.images?.length || 0) + (study._pendingFiles?.length || 0)} image(s) attached
                    </p>
                </div>
            ))}
        </section>
    </>
);

export default ClinicalInvestigationsForm;
