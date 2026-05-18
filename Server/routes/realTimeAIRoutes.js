const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");
const {
    normaliseSymptoms,
    normaliseProvince,
    normaliseDisease,
    normaliseCondition,
    toAIKey,
    findDiseaseKey
} = require("../utils/normalise");
const {
    clampPercent,
    normalizeDemographics,
    buildMonthlyProjections,
    generateTrendInsight,
    buildDiseaseProfileFromData,
    buildDataDrivenRecommendations,
    patternToRecommendationContext,
    resolvePrimaryHotspots,
    toGrowthIndex
} = require("../utils/analyticsHelpers");

// All AI routes require authentication and approval
router.use(protect, isApproved);

// Store references to AI instances
let realTimeAI = null;
let alertEmitter = null;

function setAIInstance(ai, emitter) {
    realTimeAI = ai;
    alertEmitter = emitter;
}

// ============ AI STATUS ============

// GET AI status
router.get("/status", hasPermission("view:analytics"), async (req, res) => {
    if (!realTimeAI) {
        return res.json({ 
            status: "initializing",
            message: "AI is starting up..."
        });
    }
    
    res.json({
        status: "active",
        learning: "continuous",
        stats: realTimeAI.getStats(),
        realTime: true,
        webSocket: true,
        activeAlerts: alertEmitter?.getActiveAlerts() || []
    });
});

// ============ DISEASE PREDICTION - ENHANCED ============

// POST predict disease (ENHANCED with Vital Signs, Chronic Conditions, Family History)
router.post("/predict", hasPermission("use:ai_predictor"), async (req, res) => {
    try {
        const { symptoms, province, patientId } = req.body;
        
        if (!realTimeAI) {
            return res.status(503).json({ error: "AI still initializing" });
        }
        
        if (!symptoms || symptoms.length === 0) {
            return res.status(400).json({ error: "Symptoms required" });
        }
        
        const month = new Date().getMonth();
        let patientAge = null;
        let patientGender = null;
        let patientRiskFactors = [];
        let patientVitals = {};
        let patientChronicConditions = [];
        let patientFamilyHistory = {};

        // Normalise symptoms and province before prediction
        const normalisedSymptoms = normaliseSymptoms(symptoms);
        const normalisedProvince = normaliseProvince(province || "Harare");
        
        // If patientId provided, get ALL clinical data for enhanced prediction
        if (patientId) {
            const patient = await Patient.findById(patientId);
            if (patient) {
                // Basic demographics
                patientAge = patient.age;
                patientGender = patient.gender;
                patientRiskFactors = patient.clinicalProfile?.riskFactors?.map(rf => rf.factor) || [];
                
                // NEW: Get vital signs from clinical profile
                patientVitals = {
                    temperature: patient.clinicalProfile?.vitalSigns?.temperature,
                    heartRate: patient.clinicalProfile?.vitalSigns?.heartRate,
                    systolicBP: patient.clinicalProfile?.vitalSigns?.bloodPressure?.systolic,
                    diastolicBP: patient.clinicalProfile?.vitalSigns?.bloodPressure?.diastolic,
                    oxygenSaturation: patient.clinicalProfile?.vitalSigns?.oxygenSaturation,
                    respiratoryRate: patient.clinicalProfile?.vitalSigns?.respiratoryRate,
                    bmi: patient.clinicalProfile?.vitalSigns?.bmi
                };
                
                // Chronic conditions — normalise before passing to AI
                patientChronicConditions = (patient.clinicalProfile?.chronicConditions || [])
                    .map(c => normaliseCondition(c.condition))
                    .filter(Boolean);

                // Family history — normalise
                patientFamilyHistory = {
                    mother:   (patient.clinicalProfile?.familyHistory?.mother   || []).map(c => normaliseCondition(c)),
                    father:   (patient.clinicalProfile?.familyHistory?.father   || []).map(c => normaliseCondition(c)),
                    siblings: (patient.clinicalProfile?.familyHistory?.siblings || []).map(c => normaliseCondition(c))
                };
                
                // Log without patient name — use ID only for audit trail
                console.log(`🔍 Enhanced AI Prediction for patient [${patientId}]:`, {
                    age: patientAge,
                    gender: patientGender,
                    chronicConditions: patientChronicConditions.length,
                    familyHistoryConditions: [...patientFamilyHistory.mother, ...patientFamilyHistory.father, ...patientFamilyHistory.siblings].length,
                    vitalsPresent: !!patientVitals.temperature
                });
            }
        }
        
        // Call the enhanced predictDisease with normalised inputs
        const predictions = realTimeAI.predictDisease(
            normalisedSymptoms,
            normalisedProvince,
            month,
            patientAge,
            patientGender,
            patientRiskFactors,
            patientVitals,
            patientChronicConditions,
            patientFamilyHistory
        );
        
        res.json({
            timestamp: new Date(),
            symptoms,
            province: province || "Harare",
            patientData: patientId ? { 
                age: patientAge, 
                gender: patientGender,
                vitals: patientVitals,
                chronicConditions: patientChronicConditions,
                familyHistory: patientFamilyHistory
            } : null,
            ...predictions,
            aiModel: "EnhancedClinicalAI v3.0",
            learningMode: "Real-time",
            enhancedFeatures: ["Vital Signs", "Chronic Conditions", "Family History"]
        });
    } catch (error) {
        console.error("Prediction error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ OUTBREAK ALERTS ============

// GET outbreak alerts
router.get("/alerts", hasPermission("view:analytics"), async (req, res) => {
    if (!realTimeAI || !alertEmitter) {
        return res.status(503).json({ error: "AI initializing" });
    }
    
    res.json({
        timestamp: new Date(),
        activeAlerts: alertEmitter.getActiveAlerts(),
        history: alertEmitter.getAlertHistory(req.query.limit || 50),
        totalActive: alertEmitter.getActiveAlerts().length
    });
});

// ============ PATIENT RISK ASSESSMENT - ENHANCED ==========

// GET patient risk assessment (ENHANCED with clinical data)
router.get("/risk/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const medicalRecords = await MedicalRecord.find({ 
            patientId: req.params.patientId 
        }).sort({ visitDate: -1 });
        
        if (!realTimeAI) {
            return res.status(503).json({ error: "AI initializing" });
        }
        
        // Enhanced risk assessment with all clinical data
        const risk = realTimeAI.assessPatientRisk(patient, medicalRecords);

        // patientName intentionally omitted — caller already has patient context
        res.json({
            patientId: req.params.patientId,
            age: patient.age,
            gender: patient.gender,
            chronicConditionsCount: patient.clinicalProfile?.chronicConditions?.length || 0,
            familyHistoryCount: [
                ...(patient.clinicalProfile?.familyHistory?.mother || []),
                ...(patient.clinicalProfile?.familyHistory?.father || []),
                ...(patient.clinicalProfile?.familyHistory?.siblings || [])
            ].length,
            ...risk,
            analysisTime: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ DISEASE TRENDS ==========

// GET disease trends
router.get("/trends/:disease", hasPermission("view:analytics"), async (req, res) => {
    if (!realTimeAI) {
        return res.status(503).json({ error: "AI initializing" });
    }
    
    const disease = req.params.disease;
    const key = findDiseaseKey(realTimeAI.diseasePatterns, disease);
    const pattern = key ? realTimeAI.diseasePatterns.get(key) : null;
    
    if (!pattern) {
        return res.status(404).json({ error: `No AI patterns found for: ${disease}` });
    }
    
    res.json({
        disease: key, // Use the canonical key
        totalCases: pattern.count,
        monthlyTrend: pattern.monthlyTrend,
        provinces: Object.fromEntries(pattern.provinces),
        ageDistribution: pattern.ageGroups,
        genderDistribution: pattern.genderStats,
        outcomeRates: {
            recovery: Math.round((pattern.outcomes.recovered / pattern.count) * 100),
            admission: Math.round((pattern.outcomes.admitted / pattern.count) * 100),
            mortality: pattern.count > 0 ? Math.round((pattern.outcomes.deceased / pattern.count) * 100) : 0
        },
        commonSymptoms: Object.fromEntries(
            Array.from(pattern.symptoms.entries())
                .map(([s, c]) => [s, Math.round((c / pattern.count) * 100) + '%'])
                .slice(0, 5)
        ),
        // NEW: Expected vital signs for this disease
        expectedVitalSigns: {
            temperature: pattern.vitalSignsAverages?.temperature?.avg,
            heartRate: pattern.vitalSignsAverages?.heartRate?.avg,
            bloodPressure: {
                systolic: pattern.vitalSignsAverages?.systolicBP?.avg,
                diastolic: pattern.vitalSignsAverages?.diastolicBP?.avg
            },
            oxygenSaturation: pattern.vitalSignsAverages?.oxygenSaturation?.avg
        },
        // NEW: Common chronic conditions associated
        commonChronicConditions: Array.from(pattern.chronicConditions?.entries() || [])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([condition, count]) => ({ condition, prevalence: Math.round((count / pattern.count) * 100) })),
        lastSeen: pattern.lastSeen,
        averageAge: Math.round(pattern.avgAge)
    });
});

// ============ DISEASE INSIGHTS - ENHANCED AI DECISION SUPPORT ==========

// GET AI-driven disease insights
router.get("/disease-insights/:disease", hasPermission("view:analytics"), async (req, res) => {
    if (!realTimeAI) {
        return res.status(503).json({ error: "AI initializing" });
    }
    
    const rawDisease = decodeURIComponent(req.params.disease);
    // Try exact match in patterns first, then fuzzy
    let pattern = realTimeAI.diseasePatterns.get(rawDisease.toLowerCase());
    let key = rawDisease.toLowerCase();
    
    if (!pattern) {
        key = findDiseaseKey(realTimeAI.diseasePatterns, rawDisease);
        pattern = key ? realTimeAI.diseasePatterns.get(key) : null;
    }
    
    if (!pattern) {
        try {
            const norm = normaliseDisease(rawDisease);
            const diseaseFilter = {
                $or: [
                    { disease: rawDisease },
                    { disease: norm },
                    { disease: { $regex: new RegExp(`^${rawDisease.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                ]
            };
            const now = new Date();
            const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            const [records, currentCount, prevCount, monthlyTrend, provinces, outcomes, visitTypes, symptoms, vitals] = await Promise.all([
                MedicalRecord.find(diseaseFilter).populate('patientId', 'dateOfBirth').select('province disposition patientId').lean(),
                MedicalRecord.countDocuments({ ...diseaseFilter, visitDate: { $gte: thirtyAgo } }),
                MedicalRecord.countDocuments({ ...diseaseFilter, visitDate: { $gte: sixtyAgo, $lt: thirtyAgo } }),
                MedicalRecord.aggregate([
                    { $match: diseaseFilter },
                    { $group: { _id: { year: { $year: "$visitDate" }, month: { $month: "$visitDate" } }, count: { $sum: 1 } } },
                    { $sort: { "_id.year": 1, "_id.month": 1 } },

                ]),
                MedicalRecord.aggregate([{ $match: diseaseFilter }, { $group: { _id: "$province", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
                MedicalRecord.aggregate([{ $match: diseaseFilter }, { $group: { _id: "$disposition", count: { $sum: 1 } } }]),
                MedicalRecord.aggregate([{ $match: diseaseFilter }, { $group: { _id: "$visitType", count: { $sum: 1 } } }]),
                MedicalRecord.aggregate([
                    { $match: { ...diseaseFilter, symptoms: { $exists: true, $ne: [] } } },
                    { $unwind: "$symptoms" },
                    { $group: { _id: "$symptoms", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },

                ]),
                MedicalRecord.aggregate([
                    { $match: diseaseFilter },
                    { $group: {
                        _id: null,
                        avgTemperature: { $avg: "$vitalSigns.temperature" },
                        avgHeartRate: { $avg: "$vitalSigns.heartRate" },
                        avgSystolic: { $avg: "$vitalSigns.bloodPressure.systolic" },
                        avgDiastolic: { $avg: "$vitalSigns.bloodPressure.diastolic" },
                        avgOxygenSat: { $avg: "$vitalSigns.oxygenSaturation" },
                        avgRespiratoryRate: { $avg: "$vitalSigns.respiratoryRate" },
                        avgBMI: { $avg: "$vitalSigns.bmi" },
                        count: { $sum: 1 }
                    }}
                ])
            ]);

            if (!records.length) {
                return res.status(404).json({ error: `No records found for: ${rawDisease}` });
            }

            const total = await MedicalRecord.countDocuments({ $or: diseaseFilter.$or });
            let growthRate = 0;
            if (prevCount > 0) growthRate = Math.round(((currentCount - prevCount) / prevCount) * 100);
            else if (currentCount > 0) growthRate = 100;

            const ageGroups = { child: 0, adult: 0, elderly: 0 };
            let ageKnown = 0;
            records.forEach((r) => {
                const dob = r.patientId?.dateOfBirth;
                if (dob) {
                    ageKnown++;
                    const age = Math.floor((now - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
                    if (age <= 18) ageGroups.child++;
                    else if (age >= 65) ageGroups.elderly++;
                    else ageGroups.adult++;
                }
            });

            const demographics = ageKnown > 0
                ? normalizeDemographics(
                    clampPercent((ageGroups.child / ageKnown) * 100),
                    clampPercent((ageGroups.adult / ageKnown) * 100),
                    clampPercent((ageGroups.elderly / ageKnown) * 100)
                )
                : null;

            const provinceBreakdown = provinces.map(p => ({
                province: p._id,
                count: p.count,
                percentage: total > 0 ? clampPercent((p.count / total) * 100) : 0
            }));
            const primaryHotspotInfo = resolvePrimaryHotspots(provinceBreakdown);
            const hotspot = primaryHotspotInfo.label;
            const totalOutcomes = outcomes.reduce((s, o) => s + o.count, 0);
            const outcomesMap = outcomes.reduce((acc, o) => {
                acc[o._id || 'Unknown'] = {
                    count: o.count,
                    percentage: totalOutcomes > 0 ? clampPercent((o.count / totalOutcomes) * 100) : 0
                };
                return acc;
            }, {});
            const topSymptoms = symptoms.map(s => ({
                symptom: s._id,
                count: s.count,
                percentage: total > 0 ? clampPercent((s.count / total) * 100) : 0
            }));
            const visitTypesList = visitTypes.map(v => ({
                type: v._id || 'Unknown',
                count: v.count,
                percentage: total > 0 ? clampPercent((v.count / total) * 100) : 0
            }));
            const v0 = vitals[0];
            const vitalsProfile = v0 && v0.count >= 1 ? {
                temperature: v0.avgTemperature ? Math.round(v0.avgTemperature * 10) / 10 : null,
                heartRate: v0.avgHeartRate ? Math.round(v0.avgHeartRate) : null,
                bloodPressure: v0.avgSystolic ? { systolic: Math.round(v0.avgSystolic), diastolic: Math.round(v0.avgDiastolic) } : null,
                oxygenSaturation: v0.avgOxygenSat ? Math.round(v0.avgOxygenSat * 10) / 10 : null,
                respiratoryRate: v0.avgRespiratoryRate ? Math.round(v0.avgRespiratoryRate) : null,
                bmi: v0.avgBMI ? Math.round(v0.avgBMI * 10) / 10 : null,
                sampleSize: v0.count
            } : (v0?.count > 0 ? { sampleSize: v0.count } : null);

            const projections = buildMonthlyProjections(monthlyTrend, 3);
            const deceased = outcomesMap.Deceased?.count || outcomesMap.deceased?.count || 0;
            const mortalityRate = total > 0 ? clampPercent((deceased / total) * 100) : 0;
            const primaryAgeGroup = demographics
                ? (demographics.child > 50 ? 'Pediatric' : demographics.elderly > 50 ? 'Geriatric' : 'Adult')
                : null;

            const recCtx = {
                diseaseName: rawDisease,
                total,
                growthRate,
                currentPeriodCount: currentCount,
                previousPeriodCount: prevCount,
                provinceBreakdown,
                outcomes: outcomesMap,
                topSymptoms,
                visitTypes: visitTypesList,
                vitalsProfile,
                monthlyTrend,
                demographics,
                hotspot: primaryHotspotInfo.label,
                primaryHotspots: primaryHotspotInfo.hotspots
            };

            return res.json({
                disease: rawDisease,
                source: 'database',
                summary: {
                    growthRate,
                    growthIndex: toGrowthIndex(growthRate),
                    hotspot,
                    primaryHotspots: primaryHotspotInfo.hotspots,
                    hotspotCases: primaryHotspotInfo.maxCount,
                    riskLevel: growthRate > 20 || mortalityRate > 5 ? 'CRITICAL' : growthRate > 10 ? 'HIGH' : 'MODERATE',
                    primaryAgeGroup,
                    trendInsight: generateTrendInsight(monthlyTrend, projections, rawDisease)
                },
                demographics,
                diseaseProfile: buildDiseaseProfileFromData({
                    monthlyTrend,
                    provinceBreakdown,
                    topSymptoms,
                    outcomes: outcomesMap,
                    total,
                    growthRate,
                    currentPeriodCount: currentCount,
                    previousPeriodCount: prevCount
                }),
                projections,
                recommendations: buildDataDrivenRecommendations(recCtx),
                aiConfidence: total > 0 ? Math.min(75 + Math.floor(total / 50), 98) : null,
                timestamp: new Date()
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    try {
        // ── Growth rate from DB: last 30 days vs prior 30 days ───────────
        // More accurate than the in-memory monthly trend array which only
        // updates when the AI is retrained and can lag mid-month.
        const now       = new Date();
        const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyAgo  = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const { normaliseDisease: nd } = require('../utils/normalise');
        const norm = nd(rawDisease);
        const diseaseFilter = {
            $or: [
                { disease: rawDisease },
                { disease: norm },
                { disease: { $regex: new RegExp(`^${rawDisease.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
            ]
        };
        const [currentCount, prevCount] = await Promise.all([
            MedicalRecord.countDocuments({ ...diseaseFilter, visitDate: { $gte: thirtyAgo } }),
            MedicalRecord.countDocuments({ ...diseaseFilter, visitDate: { $gte: sixtyAgo, $lt: thirtyAgo } })
        ]);

        let growthRate = 0;
        if (prevCount > 0) {
            growthRate = ((currentCount - prevCount) / prevCount) * 100;
        } else if (currentCount > 0) {
            growthRate = 100; // new cases with no prior baseline
        }

        // Identify hotspots
        const sortedProvinces = Array.from(pattern.provinces.entries())
            .sort((a, b) => b[1] - a[1]);
        const provinceBreakdownForHotspot = sortedProvinces.map(([province, count]) => ({
            province,
            count,
            percentage: total > 0 ? clampPercent((count / total) * 100) : 0
        }));
        const primaryHotspotInfo = resolvePrimaryHotspots(provinceBreakdownForHotspot);
        const hotspot = primaryHotspotInfo.label || "Unknown";
        
        // Demographic insights
        const total = pattern.count;
        const demographics = normalizeDemographics(
            (pattern.ageGroups.child / total) * 100,
            (pattern.ageGroups.adult / total) * 100,
            (pattern.ageGroups.elderly / total) * 100
        );
        const childPct = demographics.child;
        const adultPct = demographics.adult;
        const elderlyPct = demographics.elderly;

        const primaryAgeGroup = childPct > 50 ? "Pediatric" : elderlyPct > 50 ? "Geriatric" : "Adult";
        const [dbMonthlyTrend, visitTypesAgg] = await Promise.all([
            MedicalRecord.aggregate([
                { $match: diseaseFilter },
                { $group: { _id: { year: { $year: "$visitDate" }, month: { $month: "$visitDate" } }, count: { $sum: 1 } } },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]),
            MedicalRecord.aggregate([
                { $match: diseaseFilter },
                { $group: { _id: "$visitType", count: { $sum: 1 } } }
            ])
        ]);
        const visitTypesList = visitTypesAgg.map(v => ({
            type: v._id || 'Unknown',
            count: v.count,
            percentage: total > 0 ? clampPercent((v.count / total) * 100) : 0
        }));
        const projections = buildMonthlyProjections(dbMonthlyTrend, 3);
        const mortalityRate = total > 0 ? clampPercent((pattern.outcomes.deceased / total) * 100) : 0;

        const recCtx = patternToRecommendationContext(pattern, rawDisease, {
            monthlyTrend: dbMonthlyTrend,
            visitTypes: visitTypesList,
            growthRate: Math.round(growthRate),
            currentPeriodCount: currentCount,
            previousPeriodCount: prevCount,
            demographics
        });

        const provinceBreakdown = recCtx.provinceBreakdown;
        recCtx.primaryHotspots = primaryHotspotInfo.hotspots;
        const recommendations = buildDataDrivenRecommendations(recCtx);

        res.json({
            disease: key,
            source: 'ai',
            summary: {
                growthRate: Math.round(growthRate),
                growthIndex: toGrowthIndex(Math.round(growthRate)),
                hotspot,
                primaryHotspots: primaryHotspotInfo.hotspots,
                hotspotCases: primaryHotspotInfo.maxCount,
                riskLevel: growthRate > 20 || mortalityRate > 5 ? "CRITICAL" : growthRate > 10 ? "HIGH" : "MODERATE",
                primaryAgeGroup,
                trendInsight: generateTrendInsight(dbMonthlyTrend, projections, rawDisease)
            },
            demographics,
            diseaseProfile: buildDiseaseProfileFromData({
                monthlyTrend: dbMonthlyTrend,
                provinceBreakdown,
                topSymptoms: recCtx.topSymptoms,
                outcomes: recCtx.outcomes,
                total,
                growthRate: Math.round(growthRate),
                currentPeriodCount: currentCount,
                previousPeriodCount: prevCount
            }),
            projections,
            recommendations,
            aiConfidence: total > 0 ? Math.min(85 + Math.floor(total / 100), 98) : null,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ AI STATISTICS ==========

// GET AI stats
router.get("/stats", hasPermission("view:analytics"), async (req, res) => {
    try {
        // Get real counts from database
        const totalPatients = await Patient.countDocuments();
        const totalRecords = await MedicalRecord.countDocuments();
        const diseases = await MedicalRecord.distinct('disease');
        
        res.json({
            totalRecords: totalRecords,
            diseasesTracked: diseases.length,
            provincesTracked: 10,
            totalPatients: totalPatients,
            timestamp: new Date(),
            aiModel: "EnhancedClinicalAI v3.0",
            features: ["Vital Signs", "Chronic Conditions", "Family History", "Symptom Analysis", "Geographic Tracking"]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ADMIN AI CONTROLS ==========

// POST refresh AI — retrains from scratch without loading patient PII
router.post("/refresh", hasPermission("admin"), async (req, res) => {
    try {
        const ContinuousLearner = require("../ai/continuousLearner");
        const AlertEmitter = require("../ai/alertEmitter");

        const emitter = new AlertEmitter(global.io);
        const learner = new ContinuousLearner();

        // ALL records feed the AI — confidentiality only controls patient portal visibility.
        // Only clinical fields selected — no patient names or identifiers ever enter the model.
        const records = await MedicalRecord.find({})
            .populate('patientId', 'dateOfBirth gender clinicalProfile')
            .select({ 
                disease: 1, symptoms: 1, province: 1, visitDate: 1, 
                vitalSigns: 1, disposition: 1, patientId: 1 
            });

        learner.processBatch(records);

        realTimeAI = learner;
        alertEmitter = emitter;

        res.json({
            message: "AI refreshed with latest data",
            stats: realTimeAI.getStats(),
            enhancedFeatures: ["Vital Signs", "Chronic Conditions", "Family History"]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, setAIInstance };