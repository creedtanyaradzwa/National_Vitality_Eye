const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");
const { predictTriagePriority } = require("../utils/triageAI");
const { generateClinicalSnapshot, generateRecordSnapshot, getQuickMetrics } = require("../utils/snapshotAI");
const { analyzeRecordProgress } = require("../utils/progressAI");

// All routes require authentication
router.use(protect, isApproved);

// ============ CLINICAL SNAPSHOT (Gap: Information Sifting) ============

router.get("/clinical-snapshot/:patientId", hasPermission("view:records"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        // Get recent records (last 5 for enough context)
        const records = await MedicalRecord.find({ patientId: req.params.patientId })
            .sort({ visitDate: -1 })
            .limit(5);

        const summary = generateClinicalSnapshot(patient, records);
        const quickMetrics = getQuickMetrics(records);

        res.json({
            summary,
            quickMetrics,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Clinical snapshot error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get("/record-snapshot/:recordId", hasPermission("view:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findById(req.params.recordId);
        if (!record) return res.status(404).json({ error: "Record not found" });

        const summary = generateRecordSnapshot(record);

        res.json({
            summary,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Record snapshot error:", error);
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

// ============ CLINICAL RISK ASSESSMENT ============

router.get("/clinical-risk/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        const records = await MedicalRecord.find({ patientId: req.params.patientId })
            .sort({ visitDate: -1 })
            .limit(10);

        const age = patient.age;
        const chronicCount = patient.clinicalProfile?.chronicConditions?.length || 0;
        const latestVitals = records[0]?.vitalSigns || {};
        const riskFactors = patient.clinicalProfile?.riskFactors || [];

        let riskScore = 0;
        const insights = [];

        // 1. Demographic Risk
        if (age > 65) {
            riskScore += 25;
            insights.push("Geriatric baseline risk: Elevated susceptibility to acute physiological decompensation.");
        } else if (age < 5) {
            riskScore += 20;
            insights.push("Pediatric baseline risk: Rapid clinical progression potential observed in this age group.");
        }

        // 2. Comorbidity Burden
        if (chronicCount >= 3) {
            riskScore += 30;
            insights.push(`High comorbidity burden (${chronicCount} active conditions): Significant risk for multi-system failure.`);
        } else if (chronicCount > 0) {
            riskScore += 15;
            insights.push("Existing chronic conditions present: Requires careful management of therapeutic interactions.");
        }

        // 3. Physiological Instability (Vitals)
        if (latestVitals.temperature > 39 || latestVitals.temperature < 35.5) {
            riskScore += 20;
            insights.push("Active thermoregulatory dysfunction: Suggestive of acute systemic stress.");
        }
        if (latestVitals.oxygenSaturation && latestVitals.oxygenSaturation < 92) {
            riskScore += 25;
            insights.push("Hypoxemic state detected: Critical risk for respiratory failure.");
        }

        // 4. Behavioral/Environmental Risk Factors (Data-driven)
        riskFactors.forEach(rf => {
            if (rf.severity === 'High') riskScore += 15;
            else if (rf.severity === 'Moderate') riskScore += 8;
            insights.push(`Documented risk factor (${rf.factor}): ${rf.notes || 'Clinical impact assessment pending.'}`);
        });

        const riskLevel = riskScore >= 75 ? "CRITICAL" : riskScore >= 50 ? "HIGH" : riskScore >= 25 ? "MODERATE" : "LOW";
        
        res.json({
            patientId: patient._id,
            riskScore: Math.min(riskScore, 100),
            riskLevel,
            insights,
            lastAssessment: new Date()
        });
    } catch (error) {
        console.error("Clinical risk error:", error);
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
            
            // 1. Temperature Anomaly
            if (currentVitals.temperature && tempStats.stdDev && tempStats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.temperature - tempStats.avg) / tempStats.stdDev;
                if (zScore > 2) {
                    const isHigh = currentVitals.temperature > tempStats.avg;
                    anomalies.push({
                        type: "THERMOREGULATORY_DYSFUNCTION",
                        severity: zScore > 3 ? "HIGH" : "MEDIUM",
                        currentValue: `${currentVitals.temperature}°C`,
                        message: isHigh 
                            ? `Acute Hyperpyrexia detected: ${currentVitals.temperature}°C. This value represents a significant pathological elevation from the patient's baseline mean (${tempStats.avg.toFixed(1)}°C).`
                            : `Clinically significant Hypothermia detected: ${currentVitals.temperature}°C. Physiological core temperature is markedly below established baseline parameters.`,
                        clinicalInsight: isHigh
                            ? "This presentation is highly suggestive of an acute systemic inflammatory response or infectious process requiring diagnostic evaluation for sepsis or localized infection."
                            : "Patient demonstrates significant thermoregulatory failure. Evaluate for environmental exposure, metabolic dysfunction, or advanced systemic collapse.",
                        action: zScore > 3 ? "Immediate clinical intervention and septic workup recommended." : "Continue intensive thermal monitoring and initiate baseline investigation."
                    });
                }
            }
            
            // 2. Heart Rate Anomaly
            if (currentVitals.heartRate && hrStats.stdDev && hrStats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.heartRate - hrStats.avg) / hrStats.stdDev;
                if (zScore > 2) {
                    const isHigh = currentVitals.heartRate > hrStats.avg;
                    anomalies.push({
                        type: "CARDIAC_RHYTHM_DEVIATION",
                        severity: zScore > 3 ? "HIGH" : "MEDIUM",
                        currentValue: `${currentVitals.heartRate} BPM`,
                        message: isHigh
                            ? `Severe Sinus Tachycardia (${currentVitals.heartRate} bpm). Cardiac rate is substantially elevated beyond the patient's stable baseline.`
                            : `Clinically significant Bradycardia (${currentVitals.heartRate} bpm). Myocardial conduction or metabolic suppression may be present.`,
                        clinicalInsight: isHigh
                            ? "Profound tachycardia often correlates with acute pain, hypovolemia, fever, or primary cardiac stress. A persistent rate at this level requires hemodynamic evaluation."
                            : "Reduced cardiac output risk detected. Evaluate for potential drug toxicity, electrolyte imbalance (e.g., hyperkalemia), or sinoatrial node dysfunction.",
                        action: "Perform 12-lead ECG and evaluate hemodynamic stability."
                    });
                }
            }
            
            // 3. Systolic BP Anomaly
            if (currentVitals.bloodPressure?.systolic && systolicStats.stdDev && systolicStats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.bloodPressure.systolic - systolicStats.avg) / systolicStats.stdDev;
                if (zScore > 2) {
                    const isHigh = currentVitals.bloodPressure.systolic > systolicStats.avg;
                    anomalies.push({
                        type: "HEMODYNAMIC_INSTABILITY",
                        severity: zScore > 3 ? "HIGH" : "MEDIUM",
                        currentValue: `${currentVitals.bloodPressure.systolic} mmHg`,
                        message: isHigh
                            ? `Hypertensive Crisis potential: Systolic BP ${currentVitals.bloodPressure.systolic} mmHg is acutely elevated relative to historical norms.`
                            : `Critical Hypotension detected: Systolic BP ${currentVitals.bloodPressure.systolic} mmHg indicates potential hypoperfusion state.`,
                        clinicalInsight: isHigh
                            ? "Acute elevation in systolic pressure increases risk for cardiovascular accidents (CVA) or end-organ damage. Immediate pharmacological management may be indicated."
                            : "Patient at high risk for shock (Hypovolemic, Cardiogenic, or Septic). Inadequate mean arterial pressure (MAP) likely present.",
                        action: isHigh ? "Initiate antihypertensive protocol and monitor for neuro-deficits." : "Initiate fluid resuscitation and evaluate for signs of shock."
                    });
                }
            }
            
            // 4. Oxygen Saturation Anomaly
            if (currentVitals.oxygenSaturation && o2Stats.stdDev && o2Stats.stdDev > 0) {
                const zScore = Math.abs(currentVitals.oxygenSaturation - o2Stats.avg) / o2Stats.stdDev;
                if (zScore > 2 || currentVitals.oxygenSaturation < 94) {
                    anomalies.push({
                        type: "PULMONARY_GAS_EXCHANGE_FAILURE",
                        severity: currentVitals.oxygenSaturation < 90 ? "CRITICAL" : (zScore > 3 ? "HIGH" : "MEDIUM"),
                        currentValue: `${currentVitals.oxygenSaturation}%`,
                        message: `Significant Hypoxemia (SpO2 ${currentVitals.oxygenSaturation}%). Peripheral oxygen saturation has fallen below critical physiological thresholds.`,
                        clinicalInsight: "Detected levels indicate impaired ventilation-perfusion matching or diffusion limitation. Persistent hypoxemia leads to rapid tissue hypoxia and metabolic acidosis.",
                        action: "Administer supplemental oxygen immediately. target SpO2 94-98%. Auscultate lungs for adventitious sounds."
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
            // patientName intentionally omitted — caller already has patient context
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

            // Get outcome for weighting — outcome is aggregate clinical data, not PII
            const latestRecord = await MedicalRecord.findOne({ patientId: otherPatient._id })
                .sort({ visitDate: -1 });
            const outcome = latestRecord?.disposition || "Unknown";

            const weight = outcomeWeight[outcome] || 0.5;
            const weightedScore = Math.round(rawScore * weight);

            if (weightedScore > 25) {
                // ── PRIVACY: never expose the other patient's name, national ID,
                //    or individual diagnosis. Only anonymised clinical attributes.
                similarities.push({
                    // No name, no nationalId, no individual diagnosis
                    ageGroup: otherPatient.age < 18 ? "Pediatric" : otherPatient.age < 65 ? "Adult" : "Geriatric",
                    gender: otherPatient.gender,
                    province: otherPatient.province,
                    similarity: weightedScore,
                    rawSimilarity: rawScore,
                    // Sanitise matching factors — remove any that contain real age numbers
                    matchingFactors: matchingFactors
                        .map(f => f.replace(/\(\d+ vs \d+\)/, "(similar age)"))
                        .slice(0, 5),
                    outcome,
                    outcomeWeight: weight,
                    lastVisit: latestRecord?.visitDate || null
                    // diagnosis intentionally omitted — cross-patient PII
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

        // Aggregate outcome distribution — no individual patient data
        const outcomeDistribution = {};
        topSimilar.forEach(p => {
            outcomeDistribution[p.outcome] = (outcomeDistribution[p.outcome] || 0) + 1;
        });

        res.json({
            patientId: req.params.patientId,
            // patientName intentionally omitted
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

        // ============ CLINICAL RECORD PROGRESS AI ============

        router.get("/record-progress/:recordId", hasPermission("view:records"), async (req, res) => {
        try {
        const record = await MedicalRecord.findById(req.params.recordId);
        if (!record) return res.status(404).json({ error: "Record not found" });

        const history = record.observations || [];
        const analysis = analyzeRecordProgress(history);

        res.json({
            recordId: record._id,
            history,
            analysis,
            timestamp: new Date()
        });
        } catch (error) {
        console.error("Record progress error:", error);
        res.status(500).json({ error: error.message });
        }
        });

        module.exports = router;