const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");

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

// ============ DISEASE PREDICTION ============

// POST predict disease (enhanced with clinical data)
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
        
        // If patientId provided, get clinical data
        if (patientId) {
            const patient = await Patient.findById(patientId);
            if (patient) {
                patientAge = patient.age;
                patientGender = patient.gender;
                patientRiskFactors = patient.clinicalProfile?.riskFactors?.map(rf => rf.factor) || [];
            }
        }
        
        const predictions = realTimeAI.predictDisease(
            symptoms, 
            province || "Harare", 
            month,
            patientAge,
            patientGender,
            patientRiskFactors
        );
        
        res.json({
            timestamp: new Date(),
            symptoms,
            province: province || "Harare",
            patientData: patientId ? { age: patientAge, gender: patientGender } : null,
            ...predictions,
            aiModel: "EnhancedClinicalAI v2.0",
            learningMode: "Real-time"
        });
    } catch (error) {
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

// ============ PATIENT RISK ASSESSMENT ============

// GET patient risk assessment (enhanced with clinical data)
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
        
        const risk = realTimeAI.assessPatientRisk(patient, medicalRecords);
        
        res.json({
            patientId: req.params.patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            age: patient.age,
            gender: patient.gender,
            ...risk,
            analysisTime: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ DISEASE TRENDS ============

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
        lastSeen: pattern.lastSeen,
        averageAge: Math.round(pattern.avgAge)
    });
});

// ============ AI STATISTICS ============

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
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ADMIN AI CONTROLS ============

// POST refresh AI
router.post("/refresh", hasPermission("admin"), async (req, res) => {
    try {
        const ContinuousLearner = require("../ai/continuousLearner");
        const AlertEmitter = require("../ai/alertEmitter");
        
        const emitter = new AlertEmitter(global.io);
        const learner = new ContinuousLearner();
        
        const records = await MedicalRecord.find({})
            .populate("patientId");
        
        learner.processBatch(records);
        
        realTimeAI = learner;
        alertEmitter = emitter;
        
        res.json({
            message: "AI refreshed with latest data",
            stats: realTimeAI.getStats()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, setAIInstance };