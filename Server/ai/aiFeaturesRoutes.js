const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");

// All routes require authentication
router.use(protect, isApproved);

// ============ ANOMALY DETECTION ============

// POST detect anomalies in patient vitals
router.post("/anomaly-detection/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        // Get vital signs history
        const vitalSignsHistory = await MedicalRecord.find(
            { patientId: req.params.patientId },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: -1 }).limit(20);
        
        // Get current vitals from latest record or request body
        const currentVitals = req.body.currentVitals || vitalSignsHistory[0]?.vitalSigns || {};
        
        // Get AI instance (you'll need to pass this from server.js)
        const ai = req.app.get('aiInstance');
        if (!ai) {
            return res.status(503).json({ error: "AI not initialized" });
        }
        
        const anomalies = ai.detectVitalSignAnomalies(req.params.patientId, vitalSignsHistory, currentVitals);
        
        res.json({
            patientId: req.params.patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            ...anomalies,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Anomaly detection error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT SIMILARITY SEARCH ============

// POST find similar patients
router.post("/similar-patients/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const limit = req.body.limit || 10;
        
        // Get all patients for comparison
        const allPatients = await Patient.find({ 
            _id: { $ne: req.params.patientId },
            isActive: true 
        }).limit(100); // Limit for performance
        
        // Get AI instance
        const ai = req.app.get('aiInstance');
        if (!ai) {
            return res.status(503).json({ error: "AI not initialized" });
        }
        
        // Calculate similarities
        const similarities = [];
        
        for (const otherPatient of allPatients) {
            // Get outcomes for other patient
            const records = await MedicalRecord.find({ patientId: otherPatient._id })
                .sort({ visitDate: -1 })
                .limit(1);
            
            const similarity = calculatePatientSimilaritySimple(patient, otherPatient, records[0]);
            
            if (similarity.score > 30) {
                similarities.push({
                    patient: {
                        id: otherPatient._id,
                        name: `${otherPatient.firstName} ${otherPatient.lastName}`,
                        age: otherPatient.age,
                        gender: otherPatient.gender,
                        province: otherPatient.province
                    },
                    similarity: similarity.score,
                    matchingFactors: similarity.matchingFactors,
                    outcome: records[0]?.disposition || "Unknown",
                    lastVisit: records[0]?.visitDate || null
                });
            }
        }
        
        // Sort by similarity
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // Generate recommendations
        const topSimilar = similarities.slice(0, limit);
        const successfulOutcomes = topSimilar.filter(p => p.outcome === "Discharged");
        
        res.json({
            patientId: req.params.patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            similarPatients: topSimilar,
            totalSimilarFound: similarities.length,
            summary: {
                averageSimilarity: similarities.length > 0 
                    ? Math.round(similarities.reduce((sum, p) => sum + p.similarity, 0) / similarities.length) 
                    : 0,
                successRateAmongSimilar: similarities.length > 0 
                    ? Math.round((successfulOutcomes.length / similarities.length) * 100) 
                    : 0
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Similar patients error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function for similarity calculation
function calculatePatientSimilaritySimple(patientA, patientB, recordB) {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const matchingFactors = [];
    
    // Age similarity (20%)
    if (patientA.age && patientB.age) {
        const ageDiff = Math.abs(patientA.age - patientB.age);
        let ageSimilarity = ageDiff <= 5 ? 100 : ageDiff <= 10 ? 70 : ageDiff <= 20 ? 40 : 20;
        totalScore += (ageSimilarity / 100) * 20;
        if (ageSimilarity >= 70) matchingFactors.push(`Similar age (${patientA.age} vs ${patientB.age})`);
    }
    maxPossibleScore += 20;
    
    // Gender match (15%)
    if (patientA.gender && patientB.gender && patientA.gender === patientB.gender) {
        totalScore += 15;
        matchingFactors.push(`Same gender`);
    }
    maxPossibleScore += 15;
    
    // Province match (15%)
    if (patientA.province && patientB.province && patientA.province === patientB.province) {
        totalScore += 15;
        matchingFactors.push(`Same province (${patientA.province})`);
    }
    maxPossibleScore += 15;
    
    // Chronic conditions (30%)
    const conditionsA = patientA.clinicalProfile?.chronicConditions?.map(c => c.condition) || [];
    const conditionsB = patientB.clinicalProfile?.chronicConditions?.map(c => c.condition) || [];
    const commonConditions = conditionsA.filter(c => conditionsB.includes(c));
    const allConditions = [...new Set([...conditionsA, ...conditionsB])];
    
    if (allConditions.length > 0) {
        const conditionMatchPercent = (commonConditions.length / allConditions.length) * 100;
        totalScore += (conditionMatchPercent / 100) * 30;
        if (commonConditions.length > 0) {
            matchingFactors.push(`${commonConditions.length} shared condition(s)`);
        }
    }
    maxPossibleScore += 30;
    
    // Diagnosis similarity (20%)
    if (recordB?.primaryDiagnosis?.name) {
        // This would require diagnosis from patientA as well
        // For simplicity, just add partial score if record exists
        totalScore += 10;
        matchingFactors.push("Has medical records");
    }
    maxPossibleScore += 20;
    
    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    return {
        score: Math.min(Math.round(finalScore), 100),
        matchingFactors: matchingFactors.slice(0, 4)
    };
}

module.exports = router;