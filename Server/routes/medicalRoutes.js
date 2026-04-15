const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");

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
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: -1 });
        
        if (latestRecord && latestRecord.vitalSigns) {
            await Patient.findByIdAndUpdate(patientId, {
                'clinicalProfile.vitalSigns': latestRecord.vitalSigns,
                'clinicalProfile.vitalSigns.lastUpdated': new Date()
            });
            console.log(`✅ Synced current vitals for patient ${patientId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error syncing current vitals:", error);
        return false;
    }
}

// ============ MEDICAL RECORD MANAGEMENT ============

// POST create medical record - OPTIMIZED (no email)
router.post("/", hasPermission("create:records"), async (req, res) => {
    try {
        // Check if patient exists
        const patient = await Patient.findById(req.body.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const record = new MedicalRecord({
            ...req.body,
            createdBy: req.user._id
        });
        await record.save();
        
        // Run sync in background (non-blocking)
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
        const records = await MedicalRecord.find({ 
            patientId: req.params.patientId 
        })
        .sort({ visitDate: -1 })
        .populate("patientId", "firstName lastName nationalId")
        .populate("doctorId", "firstName lastName");
        
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET vitals history for a patient
router.get("/patient/:patientId/vitals-history", hasPermission("view:records"), async (req, res) => {
    try {
        const vitalsHistory = await MedicalRecord.find(
            { patientId: req.params.patientId },
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

// GET latest vital signs for a patient
router.get("/patient/:patientId/latest-vitals", hasPermission("view:records"), async (req, res) => {
    try {
        const latestRecord = await MedicalRecord.findOne(
            { 
                patientId: req.params.patientId,
                $or: [
                    { 'vitalSigns.temperature': { $exists: true, $ne: null } },
                    { 'vitalSigns.bloodPressure.systolic': { $exists: true, $ne: null } },
                    { 'vitalSigns.heartRate': { $exists: true, $ne: null } }
                ]
            },
            { vitalSigns: 1, visitDate: 1, visitType: 1 }
        ).sort({ visitDate: -1 });
        
        res.json({
            vitalSigns: latestRecord?.vitalSigns || null,
            recordedAt: latestRecord?.visitDate || null,
            visitType: latestRecord?.visitType || null
        });
    } catch (error) {
        console.error("Error fetching latest vitals:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET recent records
router.get("/recent", hasPermission("view:records"), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const records = await MedicalRecord.find()
            .sort({ visitDate: -1 })
            .limit(limit)
            .populate("patientId", "firstName lastName nationalId")
            .populate("doctorId", "firstName lastName");
        
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single record
router.get("/:id", hasPermission("view:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findById(req.params.id)
            .populate("patientId", "firstName lastName nationalId dateOfBirth")
            .populate("doctorId", "firstName lastName");
        
        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update record
router.patch("/:id", hasPermission("edit:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user._id },
            { new: true, runValidators: true }
        ).populate("patientId", "firstName lastName");
        
        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        
        // Auto-sync current vitals after update (background)
        setImmediate(() => {
            syncCurrentVitals(record.patientId._id || record.patientId).catch(console.error);
        });
        
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE record
router.delete("/:id", hasPermission("delete:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        
        // Re-sync current vitals with the next latest record after deletion (background)
        setImmediate(() => {
            syncCurrentVitals(record.patientId).catch(console.error);
        });
        
        res.json({ message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ STATISTICS ENDPOINTS ============

// GET top diseases
router.get("/stats/top-diseases", hasPermission("view:analytics"), async (req, res) => {
    try {
        const stats = await MedicalRecord.aggregate([
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

// GET province statistics
router.get("/stats/by-province", hasPermission("view:analytics"), async (req, res) => {
    try {
        const stats = await MedicalRecord.aggregate([
            {
                $group: {
                    _id: {
                        province: "$province",
                        disease: "$disease"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.province",
                    diseases: {
                        $push: {
                            name: "$_id.disease",
                            cases: "$count"
                        }
                    },
                    total: { $sum: "$count" }
                }
            },
            { $sort: { total: -1 } }
        ]);
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET monthly trends (only complete months)
router.get("/stats/monthly-trends", hasPermission("view:analytics"), async (req, res) => {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        const trends = await MedicalRecord.aggregate([
            {
                $match: {
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
        const trends = await MedicalRecord.aggregate([
            { $match: { disease: req.params.disease } },
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