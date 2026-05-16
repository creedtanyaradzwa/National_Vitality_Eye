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
    toAIKey
} = require("../utils/normalise");

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
    const pattern = realTimeAI.diseasePatterns.get(disease);
    
    if (!pattern) {
        return res.status(404).json({ error: "Disease not found" });
    }
    
    res.json({
        disease,
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
    
    const disease = req.params.disease;
    const pattern = realTimeAI.diseasePatterns.get(disease);
    
    if (!pattern) {
        return res.status(404).json({ error: "Disease not found" });
    }

    try {
        // Calculate growth rate (last month vs previous month)
        const currentMonth = new Date().getMonth();
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const currentCount = pattern.monthlyTrend[currentMonth] || 0;
        const prevCount = pattern.monthlyTrend[prevMonth] || 0;
        
        let growthRate = 0;
        if (prevCount > 0) {
            growthRate = ((currentCount - prevCount) / prevCount) * 100;
        }

        // Identify hotspots
        const sortedProvinces = Array.from(pattern.provinces.entries())
            .sort((a, b) => b[1] - a[1]);
        const hotspot = sortedProvinces[0]?.[0] || "Unknown";
        
        // Demographic insights
        const total = pattern.count;
        const childPct = Math.round((pattern.ageGroups.child / total) * 100);
        const adultPct = Math.round((pattern.ageGroups.adult / total) * 100);
        const elderlyPct = Math.round((pattern.ageGroups.elderly / total) * 100);
        
        const primaryAgeGroup = childPct > 50 ? "Pediatric" : elderlyPct > 50 ? "Geriatric" : "Adult";
        
        // AI Decision Support Recommendations
        const recommendations = [];
        
        // 1. Epidemic Risk
        if (growthRate > 20) {
            recommendations.push({
                type: "URGENT",
                title: "Rapid Growth Detected",
                action: `Deploy additional medical supplies to ${hotspot} immediately.`,
                reason: `Cases increased by ${Math.round(growthRate)}% in the last 30 days.`
            });
        } else if (growthRate > 0) {
            recommendations.push({
                type: "MONITOR",
                title: "Steady Increase",
                action: "Enhance surveillance in neighboring provinces.",
                reason: "Consistent upward trend in case numbers."
            });
        }

        // 2. Demographic Focus
        if (childPct > 40) {
            recommendations.push({
                type: "PREVENTION",
                title: "High Pediatric Impact",
                action: "Initiate school-based awareness and vaccination programs.",
                reason: `${childPct}% of cases are under the age of 18.`
            });
        }

        // 3. Clinical Guidance
        const avgTemp = pattern.vitalSignsAverages?.temperature?.avg;
        if (avgTemp && avgTemp > 38) {
            recommendations.push({
                type: "CLINICAL",
                title: "Febrile Profile",
                action: "Ensure adequate stock of antipyretics and IV fluids.",
                reason: "High prevalence of fever detected in clinical profile averages."
            });
        }

        // 4. Resource Allocation
        const mortalityRate = (pattern.outcomes.deceased / total) * 100;
        if (mortalityRate > 5) {
            recommendations.push({
                type: "CRITICAL",
                title: "High Severity",
                action: "Allocate more ICU beds and specialist staff for this condition.",
                reason: `Observed mortality rate of ${mortalityRate.toFixed(1)}% is above critical threshold.`
            });
        }

        res.json({
            disease,
            summary: {
                growthRate: Math.round(growthRate),
                hotspot,
                riskLevel: growthRate > 20 || mortalityRate > 5 ? "CRITICAL" : growthRate > 10 ? "HIGH" : "MODERATE",
                primaryAgeGroup
            },
            demographics: {
                child: childPct,
                adult: adultPct,
                elderly: elderlyPct
            },
            recommendations,
            aiConfidence: Math.min(85 + (total / 100), 98), // Confidence grows with data volume
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
            .select({ disease: 1, symptoms: 1, province: 1, visitDate: 1, vitalSigns: 1, disposition: 1 });

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