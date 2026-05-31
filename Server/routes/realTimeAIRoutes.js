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
    toGrowthIndex,
    buildDiseasePeriodAnalytics,
    periodMatches
} = require("../utils/analyticsHelpers");

const { predictTriagePriority } = require("../utils/triageAI");

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
        const { symptoms, province, patientId, vitals: manualVitals } = req.body;

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
        let patientVitals = manualVitals || {};
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

                // Merge patient profile vitals (if manual vitals didn't provide them)
                patientVitals = {
                    temperature: manualVitals?.temperature ?? patient.clinicalProfile?.vitalSigns?.temperature,
                    heartRate: manualVitals?.heartRate ?? patient.clinicalProfile?.vitalSigns?.heartRate,
                    systolicBP: manualVitals?.systolicBP ?? patient.clinicalProfile?.vitalSigns?.bloodPressure?.systolic,
                    diastolicBP: manualVitals?.diastolicBP ?? patient.clinicalProfile?.vitalSigns?.bloodPressure?.diastolic,
                    oxygenSaturation: manualVitals?.oxygenSaturation ?? patient.clinicalProfile?.vitalSigns?.oxygenSaturation,
                    respiratoryRate: manualVitals?.respiratoryRate ?? patient.clinicalProfile?.vitalSigns?.respiratoryRate,
                    bmi: manualVitals?.bmi ?? patient.clinicalProfile?.vitalSigns?.bmi
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

// ============ PREDICTIVE TRIAGE ============

router.post("/predict-triage", hasPermission("view:analytics"), async (req, res) => {
    try {
        const { vitals, symptoms } = req.body;
        const triage = predictTriagePriority(vitals, symptoms);
        res.json(triage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/patient-triage/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        // Get latest record
        const latestRecord = await MedicalRecord.findOne({ patientId: req.params.patientId })
            .sort({ visitDate: -1 });

        if (!latestRecord) {
            return res.json({ 
                priority: "NON-URGENT", 
                score: 0, 
                reasons: ["No clinical records found"], 
                color: "gray" 
            });
        }

        const triage = predictTriagePriority(latestRecord.vitalSigns, latestRecord.symptoms);
        
        // Update patient record with latest assessment
        await Patient.findByIdAndUpdate(req.params.patientId, {
            'clinicalProfile.triageStatus': {
                priority: triage.priority,
                score: triage.score,
                reasons: triage.reasons,
                color: triage.color,
                lastAssessment: new Date()
            }
        });

        res.json(triage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ HELPER FUNCTIONS ============

// Calculate statistical metrics
function calculateStats(values) {
    if (!values.length) return { avg: null, stdDev: null, min: null, max: null };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return { avg, stdDev, min: Math.min(...values), max: Math.max(...values) };
}

// Get patient's primary diagnosis
async function getPatientPrimaryDiagnosis(patientId) {
    const latestRecord = await MedicalRecord.findOne({ patientId })
        .sort({ visitDate: -1 });
    return latestRecord?.primaryDiagnosis?.name || latestRecord?.disease || null;
}

// Get patient's outcome
async function getPatientOutcome(patientId) {
    const latestRecord = await MedicalRecord.findOne({ patientId })
        .sort({ visitDate: -1 });
    return latestRecord?.disposition || "Unknown";
}

// Outcome weights for similarity scoring
const outcomeWeight = {
    "Discharged": 1.0,
    "Recovered": 1.0,
    "Admitted": 0.6,
    "Transferred": 0.4,
    "Left Against Medical Advice": 0.3,
    "Deceased": 0
};

// ============ ANOMALY DETECTION (FIXED with Standard Deviation) ============

router.post("/anomaly-detection/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        // Get vital signs history - need at least 3 records for std dev
        const vitalSignsHistory = await MedicalRecord.find(
            { patientId: req.params.patientId },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: -1 }).limit(30);
        
        const currentVitals = req.body.currentVitals || vitalSignsHistory[0]?.vitalSigns || {};
        const validRecords = vitalSignsHistory.filter(v => v && v.vitalSigns);
        const anomalies = [];
        
        // Need at least 3 records for statistical significance
        if (validRecords.length >= 3) {
            // Collect all vital signs values
            const temps = [], hrs = [], systolics = [], diastolics = [], o2s = [], respiratoryRates = [];
            
            validRecords.forEach(record => {
                const vs = record.vitalSigns;
                if (vs.temperature && typeof vs.temperature === 'number') temps.push(vs.temperature);
                if (vs.heartRate && typeof vs.heartRate === 'number') hrs.push(vs.heartRate);
                if (vs.bloodPressure?.systolic && typeof vs.bloodPressure.systolic === 'number') systolics.push(vs.bloodPressure.systolic);
                if (vs.bloodPressure?.diastolic && typeof vs.bloodPressure.diastolic === 'number') diastolics.push(vs.bloodPressure.diastolic);
                if (vs.oxygenSaturation && typeof vs.oxygenSaturation === 'number') o2s.push(vs.oxygenSaturation);
                if (vs.respiratoryRate && typeof vs.respiratoryRate === 'number') respiratoryRates.push(vs.respiratoryRate);
            });
            
            const tempStats = calculateStats(temps);
            const hrStats = calculateStats(hrs);
            const systolicStats = calculateStats(systolics);
            const diastolicStats = calculateStats(diastolics);
            const o2Stats = calculateStats(o2s);
            const respStats = calculateStats(respiratoryRates);
            
            // 1. Temperature Anomaly (2 standard deviations)
            if (currentVitals.temperature && tempStats.stdDev && tempStats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.temperature - tempStats.avg) / tempStats.stdDev;
                if (zScore > 2) {
                    anomalies.push({
                        type: "TEMPERATURE_ANOMALY",
                        severity: zScore > 3 ? "HIGH" : "MEDIUM",
                        currentValue: currentVitals.temperature,
                        expectedRange: { min: tempStats.avg - tempStats.stdDev, max: tempStats.avg + tempStats.stdDev },
                        zScore: zScore.toFixed(2),
                        message: `Temperature ${currentVitals.temperature}°C is ${zScore.toFixed(1)} std dev from mean (${tempStats.avg.toFixed(1)}°C)`,
                        action: zScore > 3 ? "Immediate clinical review required" : "Monitor temperature closely",
                        clinicalSignificance: currentVitals.temperature > 38.5 ? "Possible fever/infection" : currentVitals.temperature < 36.0 ? "Possible hypothermia" : "Monitor"
                    });
                }
            }
            
            // 2. Heart Rate Anomaly (2 standard deviations)
            if (currentVitals.heartRate && hrStats.stdDev && hrStats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.heartRate - hrStats.avg) / hrStats.stdDev;
                if (zScore > 2) {
                    anomalies.push({
                        type: "HEART_RATE_ANOMALY",
                        severity: zScore > 3 ? "HIGH" : "MEDIUM",
                        currentValue: currentVitals.heartRate,
                        expectedRange: { min: hrStats.avg - hrStats.stdDev, max: hrStats.avg + hrStats.stdDev },
                        zScore: zScore.toFixed(2),
                        message: `Heart rate ${currentVitals.heartRate} bpm is ${zScore.toFixed(1)} std dev from mean (${Math.round(hrStats.avg)} bpm)`,
                        action: zScore > 3 ? "ECG and cardiac assessment recommended" : "Re-check in 30 minutes",
                        clinicalSignificance: currentVitals.heartRate > 120 ? "Possible tachycardia" : currentVitals.heartRate < 50 ? "Possible bradycardia" : "Monitor"
                    });
                }
            }
            
            // 3. Systolic BP Anomaly (2 standard deviations)
            if (currentVitals.bloodPressure?.systolic && systolicStats.stdDev && systolicStats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.bloodPressure.systolic - systolicStats.avg) / systolicStats.stdDev;
                if (zScore > 2) {
                    anomalies.push({
                        type: "BLOOD_PRESSURE_ANOMALY",
                        severity: zScore > 3 ? "HIGH" : "MEDIUM",
                        currentValue: `${currentVitals.bloodPressure.systolic}/${currentVitals.bloodPressure.diastolic || '?'}`,
                        expectedRange: { min: systolicStats.avg - systolicStats.stdDev, max: systolicStats.avg + systolicStats.stdDev },
                        zScore: zScore.toFixed(2),
                        message: `Systolic BP ${currentVitals.bloodPressure.systolic} mmHg is ${zScore.toFixed(1)} std dev from mean (${Math.round(systolicStats.avg)} mmHg)`,
                        action: zScore > 3 ? "Immediate BP medication review" : "Monitor BP daily",
                        clinicalSignificance: currentVitals.bloodPressure.systolic > 160 ? "Hypertensive urgency" : currentVitals.bloodPressure.systolic < 90 ? "Hypotension risk" : "Monitor"
                    });
                }
            }
            
            // 4. Oxygen Saturation Anomaly (clinical threshold + statistical)
            if (currentVitals.oxygenSaturation && o2Stats.stdDev && o2Stats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.oxygenSaturation - o2Stats.avg) / o2Stats.stdDev;
                if (zScore > 2 || currentVitals.oxygenSaturation < 94) {
                    anomalies.push({
                        type: "OXYGEN_SATURATION_ANOMALY",
                        severity: currentVitals.oxygenSaturation < 90 ? "CRITICAL" : (zScore > 3 ? "HIGH" : "MEDIUM"),
                        currentValue: currentVitals.oxygenSaturation,
                        expectedRange: { min: o2Stats.avg - o2Stats.stdDev, max: o2Stats.avg + o2Stats.stdDev },
                        zScore: zScore.toFixed(2),
                        message: `Oxygen saturation ${currentVitals.oxygenSaturation}% is ${zScore.toFixed(1)} std dev from mean (${Math.round(o2Stats.avg)}%)`,
                        action: currentVitals.oxygenSaturation < 90 ? "Emergency oxygen therapy required" : "Respiratory assessment needed",
                        clinicalSignificance: currentVitals.oxygenSaturation < 92 ? "Hypoxemia" : "Monitor closely"
                    });
                }
            }
            
            // 5. Respiratory Rate Anomaly (2 standard deviations)
            if (currentVitals.respiratoryRate && respStats.stdDev && respStats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.respiratoryRate - respStats.avg) / respStats.stdDev;
                if (zScore > 2) {
                    anomalies.push({
                        type: "RESPIRATORY_RATE_ANOMALY",
                        severity: zScore > 3 ? "HIGH" : "MEDIUM",
                        currentValue: currentVitals.respiratoryRate,
                        expectedRange: { min: respStats.avg - respStats.stdDev, max: respStats.avg + respStats.stdDev },
                        zScore: zScore.toFixed(2),
                        message: `Respiratory rate ${currentVitals.respiratoryRate}/min is ${zScore.toFixed(1)} std dev from mean (${Math.round(respStats.avg)}/min)`,
                        action: zScore > 3 ? "Respiratory specialist review" : "Monitor breathing pattern",
                        clinicalSignificance: currentVitals.respiratoryRate > 24 ? "Tachypnea - possible respiratory distress" : currentVitals.respiratoryRate < 10 ? "Bradypnea - possible respiratory depression" : "Monitor"
                    });
                }
            }
            
            // 6. Trend Anomaly (Sudden Change Detection)
            if (validRecords.length >= 5) {
                const recentTemps = temps.slice(-5);
                const recentHRs = hrs.slice(-5);
                
                if (recentTemps.length >= 3) {
                    const firstTempAvg = (recentTemps[0] + recentTemps[1]) / 2;
                    const lastTemp = recentTemps[recentTemps.length - 1];
                    if (Math.abs(lastTemp - firstTempAvg) > 1.2) {
                        anomalies.push({
                            type: "TREND_ANOMALY_TEMPERATURE",
                            severity: "MEDIUM",
                            message: `Sudden temperature change: ${firstTempAvg.toFixed(1)}°C → ${lastTemp.toFixed(1)}°C over last ${recentTemps.length} readings`,
                            action: "Review for potential infection or other acute condition",
                            clinicalSignificance: lastTemp > firstTempAvg ? "Possible fever developing" : "Temperature dropping"
                        });
                    }
                }
                
                if (recentHRs.length >= 3) {
                    const firstHRAvg = (recentHRs[0] + recentHRs[1]) / 2;
                    const lastHR = recentHRs[recentHRs.length - 1];
                    if (Math.abs(lastHR - firstHRAvg) > 25) {
                        anomalies.push({
                            type: "TREND_ANOMALY_HEART_RATE",
                            severity: "HIGH",
                            message: `Sudden heart rate change: ${Math.round(firstHRAvg)} → ${lastHR} bpm over last ${recentHRs.length} readings`,
                            action: "Cardiac assessment recommended",
                            clinicalSignificance: lastHR > firstHRAvg ? "Possible tachycardia developing" : "Heart rate declining"
                        });
                    }
                }
            }
        } else if (validRecords.length > 0) {
            // Fallback for insufficient data - use clinical thresholds
            if (currentVitals.temperature && (currentVitals.temperature > 38.5 || currentVitals.temperature < 35.5)) {
                anomalies.push({
                    type: "TEMPERATURE_ANOMALY",
                    severity: currentVitals.temperature > 39.5 ? "HIGH" : "MEDIUM",
                    currentValue: currentVitals.temperature,
                    message: `Temperature ${currentVitals.temperature}°C is outside normal range (36.1-37.2°C)`,
                    action: "Clinical review recommended",
                    clinicalSignificance: currentVitals.temperature > 38.5 ? "Possible fever" : "Possible hypothermia"
                });
            }
            
            if (currentVitals.heartRate && (currentVitals.heartRate > 120 || currentVitals.heartRate < 50)) {
                anomalies.push({
                    type: "HEART_RATE_ANOMALY",
                    severity: currentVitals.heartRate > 140 || currentVitals.heartRate < 40 ? "HIGH" : "MEDIUM",
                    currentValue: currentVitals.heartRate,
                    message: `Heart rate ${currentVitals.heartRate} bpm is outside normal range (60-100 bpm)`,
                    action: "Cardiac assessment recommended",
                    clinicalSignificance: currentVitals.heartRate > 120 ? "Tachycardia" : "Bradycardia"
                });
            }
            
            if (currentVitals.bloodPressure?.systolic && (currentVitals.bloodPressure.systolic > 160 || currentVitals.bloodPressure.systolic < 90)) {
                anomalies.push({
                    type: "BLOOD_PRESSURE_ANOMALY",
                    severity: currentVitals.bloodPressure.systolic > 180 || currentVitals.bloodPressure.systolic < 80 ? "HIGH" : "MEDIUM",
                    currentValue: `${currentVitals.bloodPressure.systolic}/${currentVitals.bloodPressure.diastolic}`,
                    message: `Blood pressure ${currentVitals.bloodPressure.systolic}/${currentVitals.bloodPressure.diastolic} is outside normal range (90-120/60-80)`,
                    action: "BP medication review recommended",
                    clinicalSignificance: currentVitals.bloodPressure.systolic > 160 ? "Hypertension" : "Hypotension"
                });
            }
            
            if (currentVitals.oxygenSaturation && currentVitals.oxygenSaturation < 94) {
                anomalies.push({
                    type: "OXYGEN_SATURATION_ANOMALY",
                    severity: currentVitals.oxygenSaturation < 90 ? "CRITICAL" : "HIGH",
                    currentValue: currentVitals.oxygenSaturation,
                    message: `Oxygen saturation ${currentVitals.oxygenSaturation}% is below normal range (95-100%)`,
                    action: currentVitals.oxygenSaturation < 90 ? "Emergency oxygen required" : "Respiratory assessment",
                    clinicalSignificance: "Hypoxemia detected"
                });
            }
        }
        
        // Calculate anomaly score with weighted severity
        const anomalyScore = anomalies.reduce((sum, a) => {
            const weight = a.severity === "CRITICAL" ? 100 : a.severity === "HIGH" ? 70 : a.severity === "MEDIUM" ? 40 : 10;
            return sum + weight;
        }, 0);
        
        const riskLevel = anomalyScore >= 100 ? "CRITICAL" : anomalyScore >= 70 ? "HIGH" : anomalyScore >= 40 ? "MODERATE" : "LOW";
        
        // Generate clinical summary
        let clinicalSummary = "No significant abnormalities detected.";
        if (anomalies.length > 0) {
            const criticalAnomalies = anomalies.filter(a => a.severity === "CRITICAL");
            const highAnomalies = anomalies.filter(a => a.severity === "HIGH");
            
            if (criticalAnomalies.length > 0) {
                clinicalSummary = `CRITICAL: ${criticalAnomalies.map(a => a.type.replace('_', ' ')).join(', ')} require immediate attention.`;
            } else if (highAnomalies.length > 0) {
                clinicalSummary = `HIGH RISK: ${highAnomalies.map(a => a.type.replace('_', ' ')).join(', ')} need prompt clinical review.`;
            } else {
                clinicalSummary = `Moderate abnormalities detected in ${anomalies.map(a => a.type.replace('_', ' ')).join(', ')}. Monitor closely.`;
            }
        }
        
        res.json({
            patientId: req.params.patientId,
            anomalies,
            anomalyCount: anomalies.length,
            anomalyScore: Math.min(anomalyScore, 100),
            riskLevel,
            requiresAttention: anomalies.length > 0,
            clinicalSummary,
            dataQuality: {
                totalRecords: validRecords.length,
                hasSufficientData: validRecords.length >= 3,
                statisticalConfidence: validRecords.length >= 3 ? "HIGH" : "LOW"
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Anomaly detection error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT SIMILARITY SEARCH (FIXED with Outcome Weighting) ============

router.post("/similar-patients/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const limit = req.body.limit || 10;
        
        // Get all patients for comparison with proper indexing
        const allPatients = await Patient.find({ 
            _id: { $ne: req.params.patientId },
            isActive: true 
        }).limit(200);
        
        const similarities = [];
        
        for (const otherPatient of allPatients) {
            let totalScore = 0;
            let maxPossibleScore = 0;
            const matchingFactors = [];
            
            // 1. Age similarity (25%) - weighted
            if (patient.age && otherPatient.age) {
                const ageDiff = Math.abs(patient.age - otherPatient.age);
                let ageSimilarity = 0;
                if (ageDiff <= 3) ageSimilarity = 100;
                else if (ageDiff <= 7) ageSimilarity = 85;
                else if (ageDiff <= 12) ageSimilarity = 70;
                else if (ageDiff <= 20) ageSimilarity = 50;
                else if (ageDiff <= 30) ageSimilarity = 30;
                else ageSimilarity = 15;
                
                const ageScore = (ageSimilarity / 100) * 25;
                totalScore += ageScore;
                if (ageSimilarity >= 70) matchingFactors.push(`Similar age (${patient.age} vs ${otherPatient.age})`);
                maxPossibleScore += 25;
            } else {
                maxPossibleScore += 25;
            }
            
            // 2. Gender match (15%)
            if (patient.gender && otherPatient.gender && patient.gender === otherPatient.gender) {
                totalScore += 15;
                matchingFactors.push(`Same gender (${patient.gender})`);
            }
            maxPossibleScore += 15;
            
            // 3. Province match (15%)
            if (patient.province && otherPatient.province && patient.province === otherPatient.province) {
                totalScore += 15;
                matchingFactors.push(`Same province (${patient.province})`);
            }
            maxPossibleScore += 15;
            
            // 4. Chronic conditions similarity (30%) - enhanced
            const conditionsA = patient.clinicalProfile?.chronicConditions?.map(c => c.condition) || [];
            const conditionsB = otherPatient.clinicalProfile?.chronicConditions?.map(c => c.condition) || [];
            
            if (conditionsA.length > 0 || conditionsB.length > 0) {
                const commonConditions = conditionsA.filter(c => conditionsB.includes(c));
                const allConditions = [...new Set([...conditionsA, ...conditionsB])];
                
                if (allConditions.length > 0) {
                    const conditionMatchPercent = (commonConditions.length / allConditions.length) * 100;
                    const conditionScore = (conditionMatchPercent / 100) * 30;
                    totalScore += conditionScore;
                    if (commonConditions.length > 0) {
                        matchingFactors.push(`${commonConditions.length} shared condition(s): ${commonConditions.join(", ")}`);
                    }
                }
            }
            maxPossibleScore += 30;
            
            // 5. Diagnosis similarity (15%) - new
            const diagnosisA = await getPatientPrimaryDiagnosis(patient._id);
            const diagnosisB = await getPatientPrimaryDiagnosis(otherPatient._id);
            
            if (diagnosisA && diagnosisB && diagnosisA === diagnosisB) {
                totalScore += 15;
                matchingFactors.push(`Same primary diagnosis (${diagnosisA})`);
            } else if (diagnosisA && diagnosisB && diagnosisA !== diagnosisB) {
                // Partial match — don't expose the other patient's diagnosis
                const partialScore = 8;
                totalScore += partialScore;
                matchingFactors.push(`Similar diagnosis profile`);
            }
            maxPossibleScore += 15;

            // Calculate raw similarity score
            let rawScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
            rawScore = Math.min(Math.round(rawScore), 100);

            // Get outcome for weighting
            const latestRecord = await MedicalRecord.findOne({ patientId: otherPatient._id })
                .sort({ visitDate: -1 });
            const outcome = latestRecord?.disposition || "Unknown";

            const weight = outcomeWeight[outcome] || 0.5;
            const weightedScore = Math.round(rawScore * weight);

            if (weightedScore > 25) {
                similarities.push({
                    ageGroup: otherPatient.age < 18 ? "Pediatric" : otherPatient.age < 65 ? "Adult" : "Geriatric",
                    gender: otherPatient.gender,
                    province: otherPatient.province,
                    similarity: weightedScore,
                    rawSimilarity: rawScore,
                    matchingFactors: matchingFactors
                        .map(f => f.replace(/\(\d+ vs \d+\)/, "(similar age)"))
                        .slice(0, 5),
                    outcome,
                    outcomeWeight: weight,
                    lastVisit: latestRecord?.visitDate || null
                });
            }
        }

        similarities.sort((a, b) => b.similarity - a.similarity);
        const topSimilar = similarities.slice(0, limit);

        const successfulOutcomes = topSimilar.filter(p => p.outcome === "Discharged" || p.outcome === "Recovered");
        const weightedSuccessRate = topSimilar.length > 0
            ? Math.round(
                (successfulOutcomes.reduce((sum, p) => sum + p.outcomeWeight, 0) /
                 topSimilar.reduce((sum, p) => sum + p.outcomeWeight, 0)) * 100
              )
            : 0;

        let clinicalInsight = "";
        if (topSimilar.length > 0) {
            if (weightedSuccessRate >= 80)      clinicalInsight = "Similar patients have shown excellent outcomes. Current treatment approach is highly recommended.";
            else if (weightedSuccessRate >= 60) clinicalInsight = "Similar patients have shown good outcomes. Current treatment approach is likely effective.";
            else if (weightedSuccessRate >= 40) clinicalInsight = "Similar patients have shown mixed outcomes. Consider reviewing treatment approach.";
            else                                clinicalInsight = "Similar patients have shown poor outcomes. Alternative treatment approaches should be considered.";
        } else {
            clinicalInsight = "Insufficient similar patients for comparative analysis.";
        }

        const outcomeDistribution = {};
        topSimilar.forEach(p => {
            outcomeDistribution[p.outcome] = (outcomeDistribution[p.outcome] || 0) + 1;
        });

        res.json({
            patientId: req.params.patientId,
            similarPatients: topSimilar,
            totalSimilarFound: similarities.length,
            summary: {
                averageSimilarity: similarities.length > 0
                    ? Math.round(similarities.reduce((sum, p) => sum + p.similarity, 0) / similarities.length)
                    : 0,
                successRateAmongSimilar: weightedSuccessRate,
                totalPatientsAnalyzed: allPatients.length,
                outcomeDistribution
            },
            clinicalInsight,
            searchCriteria: {
                ageGroup: patient.age < 18 ? "Pediatric" : patient.age < 65 ? "Adult" : "Geriatric",
                gender: patient.gender,
                province: patient.province,
                chronicConditionCount: patient.clinicalProfile?.chronicConditions?.length || 0
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Similar patients error:", error);
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
    const period = req.query.period || 'all';

    // Try exact match in patterns first, then fuzzy
    let pattern = realTimeAI.diseasePatterns.get(rawDisease.toLowerCase());
    let key = rawDisease.toLowerCase();
    
    if (!pattern) {
        key = findDiseaseKey(realTimeAI.diseasePatterns, rawDisease);
        pattern = key ? realTimeAI.diseasePatterns.get(key) : null;
    }

    // When ?period= is sent (e.g. MapView), use live DB aggregates so KPIs match the map filter
    if (!pattern || req.query.period != null) {
        try {
            const norm = normaliseDisease(rawDisease);
            const diseaseFilter = {
                $or: [
                    { disease: rawDisease },
                    { disease: norm },
                    { disease: { $regex: new RegExp(`^${rawDisease.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                ]
            };
            const { current } = periodMatches(diseaseFilter, period);
            const now = new Date();

            const [analytics, recordsCursor] = await Promise.all([
                buildDiseasePeriodAnalytics({
                    MedicalRecord,
                    baseMatch: diseaseFilter,
                    period,
                    diseaseLabel: rawDisease
                }),
                Promise.resolve(MedicalRecord.find(current)
                    .populate('patientId', 'dateOfBirth')
                    .select('province disposition patientId')
                    .lean()
                    .cursor())
            ]);

            const total = analytics.totalCases;
            if (total === 0) {
                return res.status(404).json({ error: `No records found for: ${rawDisease}` });
            }

            const ageGroups = { child: 0, adult: 0, elderly: 0 };
            let ageKnown = 0;
            for await (const r of recordsCursor) {
                const dob = r.patientId?.dateOfBirth;
                if (dob) {
                    ageKnown++;
                    const age = Math.floor((now - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
                    if (age <= 18) ageGroups.child++;
                    else if (age >= 65) ageGroups.elderly++;
                    else ageGroups.adult++;
                }
            }

            const demographics = ageKnown > 0
                ? normalizeDemographics(
                    clampPercent((ageGroups.child / ageKnown) * 100),
                    clampPercent((ageGroups.adult / ageKnown) * 100),
                    clampPercent((ageGroups.elderly / ageKnown) * 100)
                )
                : null;

            const {
                growthRate,
                provinceBreakdown,
                outcomes: outcomesMap,
                topSymptoms,
                visitTypes: visitTypesList,
                vitalsProfile,
                monthlyTrend,
                projections,
                hotspot,
                primaryHotspots,
                hotspotCases,
                currentPeriodCases: currentCount,
                previousPeriodCases: prevCount
            } = analytics;

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
                hotspot,
                primaryHotspots
            };

            return res.json({
                disease: rawDisease,
                period,
                source: 'database',
                summary: {
                    growthRate,
                    growthIndex: analytics.growthIndex,
                    hotspot,
                    primaryHotspots,
                    hotspotCases,
                    riskLevel: growthRate > 20 || mortalityRate > 5 ? 'CRITICAL' : growthRate > 10 ? 'HIGH' : 'MODERATE',
                    primaryAgeGroup,
                    trendInsight: analytics.trendInsight
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

// GET all symptoms recorded in the system
router.get("/symptoms", protect, async (req, res) => {
    try {
        if (!realTimeAI) {
            return res.status(503).json({ error: "AI system not yet initialized" });
        }
        const symptoms = realTimeAI.getAllSymptoms();
        res.json({ 
            symptoms,
            total: symptoms.length,
            lastUpdated: realTimeAI.lastUpdated
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST refresh AI — retrains from scratch without loading patient PII
router.post("/refresh", hasPermission("admin"), async (req, res) => {
    try {
        const ContinuousLearner = require("../ai/continuousLearner");
        const AlertEmitter = require("../ai/alertEmitter");

        const emitter = new AlertEmitter(global.io);
        const learner = new ContinuousLearner();

        // Use cursor for memory efficiency with 100k+ records
        const cursor = MedicalRecord.find({})
            .populate('patientId', 'dateOfBirth gender clinicalProfile')
            .select({ 
                disease: 1, symptoms: 1, province: 1, visitDate: 1, 
                vitalSigns: 1, disposition: 1, patientId: 1 
            })
            .lean()
            .cursor();

        let count = 0;
        for await (const record of cursor) {
            if (record && record.disease) {
                learner.processNewRecord(record, record.patientId);
                count++;
            }
        }

        realTimeAI = learner;
        alertEmitter = emitter;

        res.json({
            message: `AI refreshed with ${count} latest records`,
            stats: realTimeAI.getStats(),
            enhancedFeatures: ["Vital Signs", "Chronic Conditions", "Family History"]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, setAIInstance };