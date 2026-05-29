const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");
const { uploadMedicalImages } = require("../middleware/upload");
const { predictTriagePriority } = require("../utils/triageAI");
const { normaliseDisease } = require("../utils/normalise");
const { buildPatientSnapshot, normalizeVitalSigns } = require("../utils/vitalSigns");
const {
    clampPercent,
    buildDiseaseProfileFromData,
    buildMapProvinceStats,
    buildDiseasePeriodAnalytics,
    periodMatches
} = require("../utils/analyticsHelpers");
const fs = require("fs");
const path = require("path");

// ============ HELPER FUNCTIONS ============

/**
 * Generates a MongoDB filter based on user role and permissions.
 * Ensures users only see records they are authorized to access.
 *
 * Access is granted when ANY of these is true:
 *  1. User is admin
 *  2. User created the record
 *  3. User is tagged in the record
 *  4. The patient has added this user to their trustedProviders list
 *     (patient-initiated full-access grant from the patient portal)
 */
async function getRecordAccessFilter(user) {
    if (!user) return { _id: null };
    if (user.role === 'admin') return {};
    if (user.role === 'patient') return { patientId: user._id };

    // Find all patients who have explicitly trusted this provider
    const trustedPatients = await Patient.find(
        { 'portalAccount.trustedProviders.userId': user._id },
        { _id: 1 }
    ).lean();
    const trustedPatientIds = trustedPatients.map(p => p._id);

    const conditions = [
        { createdBy: user._id },
        { taggedUsers: user._id }
    ];
    if (trustedPatientIds.length > 0) {
        conditions.push({ patientId: { $in: trustedPatientIds } });
    }

    return { $or: conditions };
}

/**
 * Syncs the latest vitals from medical records to the patient's clinical profile
 * Also updates the triage status using AI
 */
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
            return true;
        }
        return false;
    } catch (error) {
        console.error("[Vitals Sync Error]:", error);
        return false;
    }
}

// All routes require authentication and approval
router.use(protect, isApproved);

// ============ STATISTICS ENDPOINTS ============

// GET global summary stats
router.get("/stats/summary", hasPermission("view:analytics"), async (req, res) => {
    try {
        const filter = {}; // Global for analytics
        const totalCases = await MedicalRecord.countDocuments(filter);
        const diseases = await MedicalRecord.distinct("disease", filter);
        const provinces = await MedicalRecord.distinct("province", filter);
        
        res.json({
            totalCases,
            diseasesTracked: diseases.length,
            provincesActive: provinces.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET system load factor — all indices 0–100, DB-calculated
router.get("/stats/system-load", hasPermission("view:analytics"), async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalStaff,
            activeStaffIds,
            totalPatients,
            recentRecords,
            emergencyRecords,
            completeRecords
        ] = await Promise.all([
            User.countDocuments({ role: { $in: ['doctor', 'nurse', 'data_entry'] }, isActive: { $ne: false } }),
            MedicalRecord.distinct('createdBy', { visitDate: { $gte: thirtyDaysAgo } }),
            Patient.countDocuments({ isActive: { $ne: false } }),
            MedicalRecord.countDocuments({ visitDate: { $gte: sevenDaysAgo } }),
            MedicalRecord.countDocuments({ visitType: 'Emergency', visitDate: { $gte: sevenDaysAgo } }),
            MedicalRecord.countDocuments({
                visitDate: { $gte: sevenDaysAgo },
                disease: { $exists: true, $nin: [null, ''] },
                'vitalSigns.temperature': { $exists: true, $ne: null },
                'vitalSigns.bloodPressure.systolic': { $exists: true, $ne: null }
            })
        ]);

        const activeStaffCount = activeStaffIds.length;
        const personnelEngagement = clampPercent(
            totalStaff > 0 ? (activeStaffCount / totalStaff) * 100 : 0
        );
        const clinicalCapacity = clampPercent(
            (recentRecords / Math.max(totalStaff || 1, 1) / 35) * 100
        );
        const emergencyLoadIndex = clampPercent(
            recentRecords > 0 ? (emergencyRecords / recentRecords) * 100 : 0
        );
        const recordCompletenessIndex = clampPercent(
            recentRecords > 0 ? (completeRecords / recentRecords) * 100 : 0
        );
        const weeklyRecordsPerStaff = activeStaffCount > 0
            ? Math.round((recentRecords / activeStaffCount) * 10) / 10
            : recentRecords;

        res.json({
            personnelEngagement,
            clinicalCapacity,
            emergencyLoadIndex,
            recordCompletenessIndex,
            staffingRatio: `1:${totalStaff > 0 ? Math.round(totalPatients / totalStaff) : totalPatients}`,
            weeklyRecordsPerStaff,
            recordsLast7Days: recentRecords,
            activeStaffCount,
            totalStaffCount: totalStaff
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET top diseases
router.get("/stats/top-diseases", hasPermission("view:analytics"), async (req, res) => {
    try {
        const stats = await MedicalRecord.aggregate([
            { $group: { _id: "$disease", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all diseases
router.get("/stats/all-diseases", hasPermission("view:analytics"), async (req, res) => {
    try {
        const diseases = await MedicalRecord.aggregate([
            { $group: { _id: "$disease", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json(diseases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET by province — map-ready rows + summary (period + disease filters)
router.get("/stats/by-province", hasPermission("view:analytics"), async (req, res) => {
    try {
        const { disease, period = 'all' } = req.query;
        const matchFilter = {};
        if (disease && disease !== 'All Diseases') {
            const raw = decodeURIComponent(disease);
            const normalized = normaliseDisease(raw);
            matchFilter.$or = [
                { disease: raw },
                { disease: normalized },
                { disease: { $regex: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
            ];
        }

        const result = await buildMapProvinceStats({
            MedicalRecord,
            matchFilter,
            period
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET disease analytics — respects ?period=30days|90days|year|all
router.get("/stats/disease-analytics/:disease", hasPermission("view:analytics"), async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.disease);
        const period = req.query.period || 'all';
        const norm = normaliseDisease(raw);
        const baseMatch = {
            $or: [
                { disease: raw },
                { disease: norm },
                { disease: { $regex: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
            ]
        };

        const analytics = await buildDiseasePeriodAnalytics({
            MedicalRecord,
            baseMatch,
            period,
            diseaseLabel: raw
        });

        const { current } = periodMatches(baseMatch, period);
        const yearlyAgg = await MedicalRecord.aggregate([
            { $match: current },
            { $group: { _id: { year: { $year: '$visitDate' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1 } }
        ]);
        const yearlyTrend = yearlyAgg.map((y) => ({ year: y._id.year, count: y.count }));

        const diseaseProfile = buildDiseaseProfileFromData({
            monthlyTrend: analytics.monthlyTrend,
            provinceBreakdown: analytics.provinceBreakdown,
            topSymptoms: analytics.topSymptoms,
            outcomes: analytics.outcomes,
            total: analytics.totalCases,
            growthRate: analytics.growthRate,
            currentPeriodCount: analytics.currentPeriodCases,
            previousPeriodCount: analytics.previousPeriodCases
        });

        res.json({
            disease: raw,
            period,
            ...analytics,
            yearlyTrend,
            diseaseProfile,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Error fetching disease analytics:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET disease trends
router.get("/stats/disease-trends/:disease", hasPermission("view:analytics"), async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.disease);
        const norm = normaliseDisease(raw);
        const baseMatch = { $or: [{ disease: raw }, { disease: norm }, { disease: { $regex: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }] };
        const trends = await MedicalRecord.aggregate([
            { $match: baseMatch },
            { $group: { _id: { year: { $year: "$visitDate" }, month: { $month: "$visitDate" } }, count: { $sum: 1 } } },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        res.json(trends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET monthly trends (all diseases, grouped by year/month/disease)
// Used by Analytics page for the multi-disease trend chart.
// Includes the current month so growth rate is always up to date.
router.get("/stats/monthly-trends", hasPermission("view:analytics"), async (req, res) => {
    try {
        const trends = await MedicalRecord.aggregate([
            {
                $group: {
                    _id: {
                        year:    { $year:  "$visitDate" },
                        month:   { $month: "$visitDate" },
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

// GET prevalence metrics (0–100) + growth for Analytics dashboard
router.get("/stats/prevalence", hasPermission("view:analytics"), async (req, res) => {
    try {
        const now = new Date();
        const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const [totalCases, totalPatients, recentCases, previousCases, topDisease] = await Promise.all([
            MedicalRecord.countDocuments(),
            Patient.countDocuments(),
            MedicalRecord.countDocuments({ visitDate: { $gte: thirtyAgo } }),
            MedicalRecord.countDocuments({ visitDate: { $gte: sixtyAgo, $lt: thirtyAgo } }),
            MedicalRecord.aggregate([
                { $group: { _id: "$disease", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ])
        ]);

        let growthRate = 0;
        if (previousCases > 0) {
            growthRate = parseFloat(((recentCases - previousCases) / previousCases * 100).toFixed(1));
        } else if (recentCases > 0) {
            growthRate = 100;
        }

        const activeBurden = totalPatients > 0
            ? clampPercent((recentCases / totalPatients) * 100)
            : 0;
        const top = topDisease[0];
        const topDiseaseShare = top && totalCases > 0
            ? clampPercent((top.count / totalCases) * 100)
            : 0;

        res.json({
            activeBurden,
            topDiseaseShare,
            topDisease: top?._id || null,
            growthRate,
            recentCases,
            previousCases,
            totalCases,
            totalPatients
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET global growth rate — compares last 30 days vs previous 30 days across ALL diseases
router.get("/stats/growth-rate", hasPermission("view:analytics"), async (req, res) => {
    try {
        const now          = new Date();
        const thirtyAgo    = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
        const sixtyAgo     = new Date(now.getTime() - 60  * 24 * 60 * 60 * 1000);

        const [current, previous] = await Promise.all([
            MedicalRecord.countDocuments({ visitDate: { $gte: thirtyAgo } }),
            MedicalRecord.countDocuments({ visitDate: { $gte: sixtyAgo, $lt: thirtyAgo } })
        ]);

        let growthRate = 0;
        if (previous > 0) {
            growthRate = parseFloat(((current - previous) / previous * 100).toFixed(1));
        } else if (current > 0) {
            growthRate = 100;
        }

        res.json({ growthRate, currentPeriod: current, previousPeriod: previous });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MEDICAL RECORD MANAGEMENT ============

// GET all records (Paginated & Filtered)
router.get("/", hasPermission("view:records"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filter = await getRecordAccessFilter(req.user);
        
        console.log(`[GET /medical-records] User: ${req.user?._id} (${req.user?.role})`);
        console.log(`[GET /medical-records] Filter:`, JSON.stringify(filter));

        const [records, total] = await Promise.all([
            MedicalRecord.find(filter)
                .sort({ visitDate: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("patientId", "firstName lastName nationalId")
                .populate("doctorId", "firstName lastName")
                .populate("taggedUsers", "firstName lastName position"),
            MedicalRecord.countDocuments(filter)
        ]);

        console.log(`[GET /medical-records] Found ${records.length} records out of ${total}`);
        res.json({ records, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        console.error(`[GET /medical-records] Error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// GET staff for tagging
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

// POST radiology image upload (before /:id routes)
router.post("/upload/radiology-images", hasPermission("create:records"), (req, res) => {
    uploadMedicalImages(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Image upload failed' });
        }
        try {
            const images = (req.files || []).map((f) => {
                const normalized = f.path.replace(/\\/g, '/');
                const url = normalized.includes('uploads/')
                    ? `/uploads/${normalized.split('uploads/')[1]}`
                    : `/uploads/medical-images/${f.filename}`;
                return {
                    filename: f.filename,
                    originalName: f.originalname,
                    path: f.path,
                    url,
                    fileSize: f.size,
                    mimeType: f.mimetype,
                    uploadedAt: new Date(),
                    uploadedBy: req.user._id
                };
            });
            res.json({ images });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

// POST new record
router.post("/", hasPermission("create:records"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.body.patientId);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        let vitalSigns;
        try {
            vitalSigns = normalizeVitalSigns(req.body.vitalSigns || {});
        } catch (vitalErr) {
            return res.status(400).json({ error: vitalErr.message });
        }

        const visitDate = req.body.visitDate ? new Date(req.body.visitDate) : new Date();
        const record = new MedicalRecord({
            ...req.body,
            vitalSigns,
            patientSnapshot: buildPatientSnapshot(patient, visitDate),
            createdBy: req.user._id,
            doctorId: req.user._id,
            hospital: req.body.hospital || req.user.hospitalName,
            province: req.body.province || patient.province || req.user.province,
            district: req.body.district || patient.district
        });
        await record.save();
        
        setImmediate(() => syncCurrentVitals(req.body.patientId).catch(console.error));
        
        res.status(201).json(await MedicalRecord.findById(record._id)
            .populate("patientId", "firstName lastName nationalId")
            .populate("doctorId", "firstName lastName")
            .populate("taggedUsers", "firstName lastName position"));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET specific record
router.get("/:id", hasPermission("view:records"), async (req, res) => {
    try {
        console.log(`[GET /medical-records/${req.params.id}] User: ${req.user?._id} (${req.user?.role})`);
        
        const filter = { _id: req.params.id, ...await getRecordAccessFilter(req.user) };
        console.log(`[GET /medical-records/${req.params.id}] Access Filter:`, JSON.stringify(filter));

        const record = await MedicalRecord.findOne(filter)
            .populate("patientId", "firstName lastName nationalId dateOfBirth")
            .populate("doctorId", "firstName lastName")
            .populate("taggedUsers", "firstName lastName position");
            
        if (!record) {
            console.log(`[GET /medical-records/${req.params.id}] Record not found or access denied`);
            return res.status(404).json({ error: "Record not found" });
        }
        
        res.json(record);
    } catch (error) {
        console.error(`[GET /medical-records/${req.params.id}] Error:`, error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// PATCH update record
router.patch("/:id", hasPermission("edit:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({ _id: req.params.id, ...await getRecordAccessFilter(req.user) });
        if (!record) return res.status(404).json({ error: "Record not found" });
        
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.createdBy;
        delete updateData.patientId;

        if (updateData.vitalSigns) {
            try {
                updateData.vitalSigns = normalizeVitalSigns(updateData.vitalSigns);
            } catch (vitalErr) {
                return res.status(400).json({ error: vitalErr.message });
            }
        }

        const patient = await Patient.findById(record.patientId);
        if (patient) {
            updateData.patientSnapshot = buildPatientSnapshot(
                patient,
                updateData.visitDate ? new Date(updateData.visitDate) : record.visitDate
            );
        }

        record.set(updateData);
        record.updatedBy = req.user._id;
        await record.save();
        
        if (record.patientId) {
            setImmediate(() => syncCurrentVitals(record.patientId).catch(console.error));
        }
        
        res.json(await MedicalRecord.findById(record._id)
            .populate("patientId", "firstName lastName nationalId")
            .populate("doctorId", "firstName lastName")
            .populate("taggedUsers", "firstName lastName position"));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE record
router.delete("/:id", hasPermission("delete:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findOneAndDelete({ _id: req.params.id, ...await getRecordAccessFilter(req.user) });
        if (!record) return res.status(404).json({ error: "Record not found" });
        res.json({ message: "Record deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET patient history
router.get("/patient/:patientId", hasPermission("view:records"), async (req, res) => {
    try {
        const records = await MedicalRecord.find({ patientId: req.params.patientId, ...await getRecordAccessFilter(req.user) })
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
        const records = await MedicalRecord.find(
            { patientId: req.params.patientId, ...await getRecordAccessFilter(req.user) },
            { visitDate: 1, visitType: 1, vitalSigns: 1, hospital: 1 }
        ).sort({ visitDate: 1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET latest vital signs for a patient
router.get("/patient/:patientId/latest-vitals", hasPermission("view:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findOne(
            { 
                patientId: req.params.patientId, 
                ...await getRecordAccessFilter(req.user),
                'vitalSigns.temperature': { $ne: null }
            },
            { visitDate: 1, vitalSigns: 1, hospital: 1 }
        ).sort({ visitDate: -1 });
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
