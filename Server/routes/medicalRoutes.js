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
const {
    clampPercent,
    buildMonthlyProjections,
    generateTrendInsight,
    buildDiseaseProfileFromData,
    resolvePrimaryHotspots,
    toGrowthIndex,
    buildMapProvinceStats
} = require("../utils/analyticsHelpers");
const fs = require("fs");
const path = require("path");

// ============ HELPER FUNCTIONS ============

/**
 * Generates a MongoDB filter based on user role and permissions
 * Ensures users only see records they are authorized to access
 */
function getRecordAccessFilter(user) {
    if (!user) return { _id: null }; // Deny all if no user
    
    // System Admins can see everything
    if (user.role === "admin") return {};
    
    // Patients can only see their own records
    if (user.role === "patient") return { patientId: user._id };
    
    // Staff (Doctors, Nurses, etc.) see records they created or are tagged in
    return {
        $or: [
            { createdBy: user._id },
            { taggedUsers: user._id }
        ]
    };
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

// GET system load factor
router.get("/stats/system-load", hasPermission("view:analytics"), async (req, res) => {
    try {
        const filter = {};
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [totalStaff, activeStaff, totalPatients, recentRecords, emergencyRecords] = await Promise.all([
            User.countDocuments({ role: { $in: ['doctor', 'nurse'] } }),
            MedicalRecord.distinct('createdBy', { visitDate: { $gte: thirtyDaysAgo } }),
            Patient.countDocuments({}),
            MedicalRecord.countDocuments({ visitDate: { $gte: sevenDaysAgo } }),
            MedicalRecord.countDocuments({ visitType: 'Emergency', visitDate: { $gte: sevenDaysAgo } })
        ]);

        const engagement = totalStaff > 0 ? Math.round((activeStaff.length / totalStaff) * 100) : 0;
        const capacity = Math.min(100, Math.round((recentRecords / ((totalStaff || 1) * 35)) * 100));
        
        res.json({
            personnelEngagement: engagement,
            clinicalCapacity: capacity,
            staffingRatio: `1:${totalStaff > 0 ? Math.round(totalPatients / totalStaff) : totalPatients}`,
            responseTime: `${Math.round(10 + ((recentRecords > 0 ? (emergencyRecords / recentRecords) : 0) * 20))}m`,
            activeStaffCount: activeStaff.length,
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

// GET disease analytics (Deep Insight) — includes proper growth rate
router.get("/stats/disease-analytics/:disease", hasPermission("view:analytics"), async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.disease);
        const norm = normaliseDisease(raw);
        const baseMatch = {
            $or: [
                { disease: raw },
                { disease: norm },
                { disease: { $regex: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
            ]
        };

        // Date windows for growth rate: last 30 days vs the 30 days before that
        const now = new Date();
        const thirtyDaysAgo  = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo   = new Date(now.getTime() - 60  * 24 * 60 * 60 * 1000);

        const [provinces, outcomes, visitTypes, symptoms, vitals, monthlyTrend,
               currentPeriodCount, previousPeriodCount] = await Promise.all([
            MedicalRecord.aggregate([{ $match: baseMatch }, { $group: { _id: "$province", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            MedicalRecord.aggregate([{ $match: baseMatch }, { $group: { _id: "$disposition", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            MedicalRecord.aggregate([{ $match: baseMatch }, { $group: { _id: "$visitType", count: { $sum: 1 } } }]),
            MedicalRecord.aggregate([
                { $match: { ...baseMatch, symptoms: { $exists: true, $ne: [] } } },
                { $unwind: "$symptoms" },
                { $group: { _id: "$symptoms", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            MedicalRecord.aggregate([
                { $match: baseMatch },
                { $group: {
                    _id: null,
                    avgTemperature:     { $avg: "$vitalSigns.temperature" },
                    avgHeartRate:       { $avg: "$vitalSigns.heartRate" },
                    avgSystolic:        { $avg: "$vitalSigns.bloodPressure.systolic" },
                    avgDiastolic:       { $avg: "$vitalSigns.bloodPressure.diastolic" },
                    avgOxygenSat:       { $avg: "$vitalSigns.oxygenSaturation" },
                    avgRespiratoryRate: { $avg: "$vitalSigns.respiratoryRate" },
                    avgBMI:             { $avg: "$vitalSigns.bmi" },
                    count: { $sum: 1 }
                }}
            ]),
            // Monthly trend for chart (last 24 months, sorted oldest→newest)
            MedicalRecord.aggregate([
                { $match: baseMatch },
                { $group: { _id: { year: { $year: "$visitDate" }, month: { $month: "$visitDate" } }, count: { $sum: 1 } } },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]),
            // Current 30-day window
            MedicalRecord.countDocuments({ $or: baseMatch.$or, visitDate: { $gte: thirtyDaysAgo } }),
            // Previous 30-day window
            MedicalRecord.countDocuments({ $or: baseMatch.$or, visitDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } })
        ]);

        // Growth rate: (current30 - prev30) / prev30 * 100
        // Allow negative (improvement) — do NOT clamp to 0
        const total = await MedicalRecord.countDocuments({ $or: baseMatch.$or });
        let growthRate = 0;
        if (previousPeriodCount > 0) {
            growthRate = Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100);
        } else if (currentPeriodCount > 0) {
            growthRate = 100; // New cases with no prior baseline = 100% growth
        }

        const totalOutcomes = outcomes.reduce((s, o) => s + o.count, 0);
        const totalRecords = await MedicalRecord.countDocuments();
        const prevalenceShare = totalRecords > 0 ? clampPercent((total / totalRecords) * 100) : 0;

        const projections = buildMonthlyProjections(monthlyTrend, 3);
        const trendInsight = generateTrendInsight(monthlyTrend, projections, raw);

        const provinceBreakdown = provinces.map(p => ({
            province: p._id,
            count: p.count,
            percentage: total > 0 ? clampPercent((p.count / total) * 100) : 0
        }));
        const topSymptomsList = symptoms.map(s => ({
            symptom: s._id,
            count: s.count,
            percentage: total > 0 ? clampPercent((s.count / total) * 100) : 0
        }));
        const outcomesMap = outcomes.reduce((acc, o) => {
            acc[o._id || 'Unknown'] = {
                count: o.count,
                percentage: totalOutcomes > 0 ? clampPercent((o.count / totalOutcomes) * 100) : 0
            };
            return acc;
        }, {});
        const visitTypesList = visitTypes.map(v => ({
            type: v._id || 'Unknown',
            count: v.count,
            percentage: total > 0 ? clampPercent((v.count / total) * 100) : 0
        }));

        const yearlyAgg = await MedicalRecord.aggregate([
            { $match: baseMatch },
            { $group: { _id: { year: { $year: "$visitDate" } }, count: { $sum: 1 } } },
            { $sort: { "_id.year": 1 } }
        ]);
        const yearlyTrend = yearlyAgg.map((y) => ({ year: y._id.year, count: y.count }));

        const primaryHotspotInfo = resolvePrimaryHotspots(provinceBreakdown);

        const diseaseProfile = buildDiseaseProfileFromData({
            monthlyTrend,
            provinceBreakdown,
            topSymptoms: topSymptomsList,
            outcomes: outcomesMap,
            total,
            growthRate,
            currentPeriodCount,
            previousPeriodCount
        });

        res.json({
            disease: raw,
            totalCases: total,
            primaryHotspots: primaryHotspotInfo.hotspots,
            hotspot: primaryHotspotInfo.label,
            hotspotCases: primaryHotspotInfo.maxCount,
            growthRate,
            growthIndex: toGrowthIndex(growthRate),
            prevalenceShare,
            currentPeriodCases:  currentPeriodCount,
            previousPeriodCases: previousPeriodCount,
            provinceBreakdown,
            outcomes: outcomesMap,
            visitTypes: visitTypesList,
            topSymptoms: topSymptomsList,
            monthlyTrend,
            projections,
            trendInsight,
            yearlyTrend,
            diseaseProfile,
            vitalsProfile: vitals[0] ? {
                temperature:      vitals[0].avgTemperature     ? Math.round(vitals[0].avgTemperature * 10) / 10 : null,
                heartRate:        vitals[0].avgHeartRate        ? Math.round(vitals[0].avgHeartRate) : null,
                bloodPressure: {
                    systolic:  vitals[0].avgSystolic  ? Math.round(vitals[0].avgSystolic)  : null,
                    diastolic: vitals[0].avgDiastolic ? Math.round(vitals[0].avgDiastolic) : null
                },
                oxygenSaturation: vitals[0].avgOxygenSat       ? Math.round(vitals[0].avgOxygenSat * 10) / 10 : null,
                respiratoryRate:  vitals[0].avgRespiratoryRate  ? Math.round(vitals[0].avgRespiratoryRate) : null,
                bmi:              vitals[0].avgBMI              ? Math.round(vitals[0].avgBMI * 10) / 10 : null,
                sampleSize: vitals[0].count
            } : null,
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
        const filter = getRecordAccessFilter(req.user);
        
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

// POST new record
router.post("/", hasPermission("create:records"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.body.patientId);
        if (!patient) return res.status(404).json({ error: "Patient not found" });
        
        const record = new MedicalRecord({
            ...req.body,
            createdBy: req.user._id,
            doctorId: req.user._id,
            hospital: req.user.hospitalName,
            province: req.user.province
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
        
        const filter = { _id: req.params.id, ...getRecordAccessFilter(req.user) };
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
        const record = await MedicalRecord.findOne({ _id: req.params.id, ...getRecordAccessFilter(req.user) });
        if (!record) return res.status(404).json({ error: "Record not found" });
        
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.createdBy;
        delete updateData.patientId;
        
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
        const record = await MedicalRecord.findOneAndDelete({ _id: req.params.id, ...getRecordAccessFilter(req.user) });
        if (!record) return res.status(404).json({ error: "Record not found" });
        res.json({ message: "Record deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET patient history
router.get("/patient/:patientId", hasPermission("view:records"), async (req, res) => {
    try {
        const records = await MedicalRecord.find({ patientId: req.params.patientId, ...getRecordAccessFilter(req.user) })
            .sort({ visitDate: -1 })
            .populate("patientId", "firstName lastName nationalId")
            .populate("doctorId", "firstName lastName")
            .populate("taggedUsers", "firstName lastName position");
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
