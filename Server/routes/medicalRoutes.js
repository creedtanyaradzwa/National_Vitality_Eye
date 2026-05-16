const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");
const { uploadMedicalImages } = require("../middleware/upload");
const { predictTriagePriority } = require("../utils/triageAI");
const fs = require("fs");
const path = require("path");

// All routes require authentication and approval
router.use(protect, isApproved);

// ============ HELPER FUNCTION ============
async function syncCurrentVitals(patientId) {
    try {
        const latestRecord = await MedicalRecord.findOne(
            { 
                patientId: patientId,
                $or: [
                    { 'vitalSigns.temperature': { $exists: true, $ne: null } },
                    { 'vitalSigns.bloodPressure.systolic': { $exists: true, $ne: null } },
                    { 'vitalSigns.heartRate': { $exists: true, $ne: null } }
                ]
            },
            { vitalSigns: 1, symptoms: 1, visitDate: 1 }
        ).sort({ visitDate: -1 });
        
        if (latestRecord && latestRecord.vitalSigns) {
            // Calculate Predictive Triage
            const triage = predictTriagePriority(latestRecord.vitalSigns, latestRecord.symptoms);
            
            await Patient.findByIdAndUpdate(patientId, {
                'clinicalProfile.vitalSigns': latestRecord.vitalSigns,
                'clinicalProfile.vitalSigns.lastUpdated': new Date(),
                'clinicalProfile.triageStatus': {
                    priority: triage.priority,
                    score: triage.score,
                    reasons: triage.reasons,
                    color: triage.color,
                    lastAssessment: new Date()
                }
            });
            console.log(`✅ Synced current vitals and triage for patient ${patientId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error syncing current vitals:", error);
        return false;
    }
}

// ============ MEDICAL RECORD MANAGEMENT ============

// Helper to get access filter for medical records
const getRecordAccessFilter = (user) => {
    // If user is a patient, they get global access to all their own records
    if (user.role === "patient") {
        return { patientId: user._id };
    }
    
    // For doctors/nurses, only show records they created or are tagged in
    return {
        $or: [
            { createdBy: user._id },
            { taggedUsers: user._id }
        ]
    };
};

// GET hospital staff for tagging
router.get("/staff", async (req, res) => {
    try {
        const staff = await User.find({
            hospitalId: req.user.hospitalId,
            _id: { $ne: req.user._id },
            approvalStatus: "approved",
            isActive: true,
            role: { $in: ["doctor", "nurse", "data_entry"] }
        }).select("firstName lastName position role");
        
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create medical record
router.post("/", hasPermission("create:records"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.body.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        // Validate tagged users are in the same hospital
        if (req.body.taggedUsers && req.body.taggedUsers.length > 0) {
            const taggedStaff = await User.find({
                _id: { $in: req.body.taggedUsers },
                hospitalId: req.user.hospitalId
            });
            
            if (taggedStaff.length !== req.body.taggedUsers.length) {
                return res.status(400).json({ error: "Some tagged users are invalid or from a different hospital" });
            }
        }
        
        const record = new MedicalRecord({
            ...req.body,
            createdBy: req.user._id,
            hospital: req.user.hospitalName, // Ensure hospital matches creator
            province: req.user.province      // Ensure province matches creator
        });
        await record.save();
        
        // Run sync in background
        setImmediate(() => {
            syncCurrentVitals(req.body.patientId).catch(console.error);
        });
        
        const populatedRecord = await MedicalRecord.findById(record._id)
            .populate("patientId", "firstName lastName nationalId");
        
        res.status(201).json(populatedRecord);
    } catch (error) {
        console.error("Error creating medical record:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET patient's records
router.get("/patient/:patientId", hasPermission("view:records"), async (req, res) => {
    try {
        // Patient can only see their own records
        if (req.user.role === 'patient' && req.user._id.toString() !== req.params.patientId) {
            return res.status(403).json({ error: "Access denied. You can only view your own records." });
        }
        
        const records = await MedicalRecord.find({ 
            patientId: req.params.patientId,
            ...getRecordAccessFilter(req.user)
        })
        .sort({ visitDate: -1 })
        .populate("patientId", "firstName lastName nationalId")
        .populate("doctorId", "firstName lastName")
        .populate("taggedUsers", "firstName lastName position");
        
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET vitals history for a patient
router.get("/patient/:patientId/vitals-history", hasPermission("view:records"), async (req, res) => {
    try {
        // Patient can only see their own records
        if (req.user.role === 'patient' && req.user._id.toString() !== req.params.patientId) {
            return res.status(403).json({ error: "Access denied. You can only view your own records." });
        }
        
        const vitalsHistory = await MedicalRecord.find(
            { 
                patientId: req.params.patientId,
                ...getRecordAccessFilter(req.user)
            },
            { 
                visitDate: 1, 
                visitType: 1,
                'vitalSigns.temperature': 1,
                'vitalSigns.bloodPressure': 1,
                'vitalSigns.heartRate': 1,
                'vitalSigns.respiratoryRate': 1,
                'vitalSigns.oxygenSaturation': 1,
                'vitalSigns.weight': 1,
                'vitalSigns.height': 1,
                'vitalSigns.bmi': 1,
                'vitalSigns.painScore': 1
            }
        ).sort({ visitDate: -1 });
        
        res.json(vitalsHistory);
    } catch (error) {
        console.error("Error fetching vitals history:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET recent records
router.get("/recent", hasPermission("view:records"), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const filter = {
            ...getRecordAccessFilter(req.user),
            isConfidential: { $ne: true }
        };

        const records = await MedicalRecord.find(filter)
            .sort({ visitDate: -1 })
            .limit(limit)
            .populate("patientId", "firstName lastName nationalId")
            .populate("doctorId", "firstName lastName")
            .populate("taggedUsers", "firstName lastName position");

        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single record
router.get("/:id", hasPermission("view:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({
            _id: req.params.id,
            ...getRecordAccessFilter(req.user)
        })
            .populate("patientId", "firstName lastName nationalId dateOfBirth")
            .populate("doctorId", "firstName lastName")
            .populate("taggedUsers", "firstName lastName position");
        
        if (!record) {
            return res.status(404).json({ error: "Record not found or access denied" });
        }
        
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update record
router.patch("/:id", hasPermission("edit:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({
            _id: req.params.id,
            ...getRecordAccessFilter(req.user)
        });
        
        if (!record) {
            return res.status(404).json({ error: "Record not found or access denied" });
        }
        
        // Validate tagged users if they are being updated
        if (req.body.taggedUsers) {
            const taggedStaff = await User.find({
                _id: { $in: req.body.taggedUsers },
                hospitalId: req.user.hospitalId
            });
            
            if (taggedStaff.length !== req.body.taggedUsers.length) {
                return res.status(400).json({ error: "Some tagged users are invalid or from a different hospital" });
            }
        }
        
        // Update only the fields that are provided
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                record[key] = req.body[key];
            }
        });
        record.updatedBy = req.user._id;
        
        await record.save();
        
        const populatedRecord = await MedicalRecord.findById(record._id)
            .populate("patientId", "firstName lastName")
            .populate("taggedUsers", "firstName lastName position");
        
        // Run sync in background
        setImmediate(() => {
            syncCurrentVitals(record.patientId).catch(console.error);
        });
        
        res.json(populatedRecord);
    } catch (error) {
        console.error("Error updating medical record:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE record
router.delete("/:id", hasPermission("delete:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findOneAndDelete({
            _id: req.params.id,
            ...getRecordAccessFilter(req.user)
        });
        
        if (!record) {
            return res.status(404).json({ error: "Record not found or access denied" });
        }
        
        // Run sync in background
        setImmediate(() => {
            syncCurrentVitals(record.patientId).catch(console.error);
        });
        
        res.json({ message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ IMAGE UPLOAD ENDPOINT ============

router.post("/upload-images", (req, res) => {
    uploadMedicalImages(req, res, async (err) => {
        if (err) {
            console.error("Upload error:", err);
            return res.status(400).json({ error: err.message });
        }
        
        try {
            const uploadedImages = [];
            
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const relativePath = file.path.replace(/\\/g, '/');
                    
                    uploadedImages.push({
                        filename: file.filename,
                        originalName: file.originalname,
                        path: file.path,
                        url: `/${relativePath}`,
                        fileSize: file.size,
                        mimeType: file.mimetype,
                        uploadedAt: new Date(),
                        uploadedBy: req.user._id
                    });
                }
            }
            
            res.json({ 
                success: true, 
                images: uploadedImages,
                message: `${uploadedImages.length} image(s) uploaded successfully`
            });
        } catch (error) {
            console.error("Error processing upload:", error);
            res.status(500).json({ error: error.message });
        }
    });
});

// ============ STATISTICS ENDPOINTS ============
// All stats are scoped to the requesting user's hospital to prevent
// cross-hospital data leakage. ALL records (including confidential ones)
// feed analytics — confidentiality only controls patient portal visibility,
// not aggregate statistical analysis. No individual patient identifiers
// are returned by any of these endpoints.

// GET top diseases
router.get("/stats/top-diseases", hasPermission("view:analytics"), async (req, res) => {
    try {
        const hospitalFilter = req.user.hospitalName ? { hospital: req.user.hospitalName } : {};
        const stats = await MedicalRecord.aggregate([
            { $match: hospitalFilter },
            {
                $group: {
                    _id: "$disease",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET province statistics (with optional time period and disease filter)
router.get("/stats/by-province", hasPermission("view:analytics"), async (req, res) => {
    try {
        const { period, disease } = req.query;
        const hospitalFilter = req.user.hospitalName ? { hospital: req.user.hospitalName } : {};

        // Build match stage — hospital-scoped, all records regardless of confidentiality
        const matchStage = { ...hospitalFilter };
        if (period && period !== 'all') {
            const now = new Date();
            let startDate;
            if (period === '30days') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            else if (period === '90days') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            else if (period === 'year') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            if (startDate) matchStage.visitDate = { $gte: startDate };
        }
        if (disease && disease !== 'All Diseases') matchStage.disease = disease;

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: { province: "$province", disease: "$disease" },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.province",
                    diseases: { $push: { name: "$_id.disease", cases: "$count" } },
                    total: { $sum: "$count" }
                }
            },
            { $sort: { total: -1 } }
        ];

        const stats = await MedicalRecord.aggregate(pipeline);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET deep analytics for a specific disease
router.get("/stats/disease-analytics/:disease", hasPermission("view:analytics"), async (req, res) => {
    try {
        const disease = req.params.disease;
        const hospitalFilter = req.user.hospitalName ? { hospital: req.user.hospitalName } : {};
        // All records for this disease at this hospital — confidentiality is not a filter here,
        // only patient names/IDs are excluded (aggregations return counts/averages only)
        const baseMatch = { ...hospitalFilter, disease };

        const [
            provinceBreakdown,
            outcomeBreakdown,
            visitTypeBreakdown,
            monthlyTrend,
            symptomFrequency,
            vitalsAverages,
            yearlyTrend
        ] = await Promise.all([
            MedicalRecord.aggregate([
                { $match: baseMatch },
                { $group: { _id: "$province", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            MedicalRecord.aggregate([
                { $match: baseMatch },
                { $group: { _id: "$disposition", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            MedicalRecord.aggregate([
                { $match: baseMatch },
                { $group: { _id: "$visitType", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            MedicalRecord.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: { year: { $year: "$visitDate" }, month: { $month: "$visitDate" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
                { $limit: 24 }
            ]),
            MedicalRecord.aggregate([
                { $match: { ...baseMatch, symptoms: { $exists: true, $ne: [] } } },
                { $unwind: "$symptoms" },
                { $match: { symptoms: { $ne: null, $ne: "" } } },
                { $group: { _id: "$symptoms", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            MedicalRecord.aggregate([
                {
                    $match: {
                        ...baseMatch,
                        $or: [
                            { "vitalSigns.temperature": { $exists: true, $ne: null } },
                            { "vitalSigns.heartRate": { $exists: true, $ne: null } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTemperature:    { $avg: "$vitalSigns.temperature" },
                        avgHeartRate:      { $avg: "$vitalSigns.heartRate" },
                        avgSystolic:       { $avg: "$vitalSigns.bloodPressure.systolic" },
                        avgDiastolic:      { $avg: "$vitalSigns.bloodPressure.diastolic" },
                        avgOxygenSat:      { $avg: "$vitalSigns.oxygenSaturation" },
                        avgRespiratoryRate:{ $avg: "$vitalSigns.respiratoryRate" },
                        avgBMI:            { $avg: "$vitalSigns.bmi" },
                        count: { $sum: 1 }
                    }
                }
            ]),
            MedicalRecord.aggregate([
                { $match: baseMatch },
                { $group: { _id: { $year: "$visitDate" }, count: { $sum: 1 } } },
                { $sort: { "_id": 1 } }
            ])
        ]);

        const totalCases = provinceBreakdown.reduce((sum, p) => sum + p.count, 0);
        let growthRate = 0;
        if (monthlyTrend.length >= 2) {
            const last = monthlyTrend[monthlyTrend.length - 1].count;
            const prev = monthlyTrend[monthlyTrend.length - 2].count;
            if (prev > 0) growthRate = Math.round(((last - prev) / prev) * 100);
        }

        const totalOutcomes = outcomeBreakdown.reduce((sum, o) => sum + o.count, 0);
        const outcomes = {};
        outcomeBreakdown.forEach(o => {
            outcomes[o._id || 'Unknown'] = {
                count: o.count,
                percentage: totalOutcomes > 0 ? Math.round((o.count / totalOutcomes) * 100) : 0
            };
        });

        res.json({
            disease,
            totalCases,
            growthRate,
            provinceBreakdown: provinceBreakdown.map(p => ({
                province: p._id,
                count: p.count,
                percentage: totalCases > 0 ? Math.round((p.count / totalCases) * 100) : 0
            })),
            outcomes,
            visitTypes: visitTypeBreakdown.map(v => ({
                type: v._id || 'Unknown',
                count: v.count,
                percentage: totalCases > 0 ? Math.round((v.count / totalCases) * 100) : 0
            })),
            monthlyTrend,
            yearlyTrend: yearlyTrend.map(y => ({ year: y._id, count: y.count })),
            topSymptoms: symptomFrequency.map(s => ({
                symptom: s._id,
                count: s.count,
                percentage: totalCases > 0 ? Math.round((s.count / totalCases) * 100) : 0
            })),
            vitalsProfile: vitalsAverages[0] ? {
                temperature:      vitalsAverages[0].avgTemperature     ? Math.round(vitalsAverages[0].avgTemperature * 10) / 10 : null,
                heartRate:        vitalsAverages[0].avgHeartRate        ? Math.round(vitalsAverages[0].avgHeartRate) : null,
                bloodPressure: {
                    systolic:  vitalsAverages[0].avgSystolic  ? Math.round(vitalsAverages[0].avgSystolic)  : null,
                    diastolic: vitalsAverages[0].avgDiastolic ? Math.round(vitalsAverages[0].avgDiastolic) : null
                },
                oxygenSaturation: vitalsAverages[0].avgOxygenSat       ? Math.round(vitalsAverages[0].avgOxygenSat * 10) / 10 : null,
                respiratoryRate:  vitalsAverages[0].avgRespiratoryRate  ? Math.round(vitalsAverages[0].avgRespiratoryRate) : null,
                bmi:              vitalsAverages[0].avgBMI              ? Math.round(vitalsAverages[0].avgBMI * 10) / 10 : null,
                sampleSize: vitalsAverages[0].count
            } : null,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Error fetching disease analytics:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET monthly trends
router.get("/stats/monthly-trends", hasPermission("view:analytics"), async (req, res) => {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const hospitalFilter = req.user.hospitalName ? { hospital: req.user.hospitalName } : {};

        const trends = await MedicalRecord.aggregate([
            {
                $match: {
                    ...hospitalFilter,
                    // All records feed trends — no isConfidential filter
                    $expr: {
                        $or: [
                            { $lt: [{ $year: "$visitDate" }, currentYear] },
                            {
                                $and: [
                                    { $eq: [{ $year: "$visitDate" }, currentYear] },
                                    { $lt: [{ $month: "$visitDate" }, currentMonth] }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$visitDate" },
                        month: { $month: "$visitDate" },
                        disease: "$disease"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.disease": 1 } }
        ]);

        res.json(trends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET disease trends over time
router.get("/stats/disease-trends/:disease", hasPermission("view:analytics"), async (req, res) => {
    try {
        const hospitalFilter = req.user.hospitalName ? { hospital: req.user.hospitalName } : {};
        // All records for this disease — no isConfidential filter on analytics
        const trends = await MedicalRecord.aggregate([
            { $match: { ...hospitalFilter, disease: req.params.disease } },
            {
                $group: {
                    _id: {
                        year: { $year: "$visitDate" },
                        month: { $month: "$visitDate" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        res.json(trends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;