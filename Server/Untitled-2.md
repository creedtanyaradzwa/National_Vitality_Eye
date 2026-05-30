

## National_Vitality_Eye/Server/ai/aiFeaturesRoutes.js

```text
const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");
router.use(protect, isApproved);
router.post("/anomaly-detection/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        const vitalSignsHistory = await MedicalRecord.find(
            { patientId: req.params.patientId },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: -1 }).limit(20);
        const currentVitals = req.body.currentVitals || vitalSignsHistory[0]?.vitalSigns || {};
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
router.post("/similar-patients/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        const limit = req.body.limit || 10;
        const allPatients = await Patient.find({ 
            _id: { $ne: req.params.patientId },
            isActive: true 
        }).limit(100); 
        const ai = req.app.get('aiInstance');
        if (!ai) {
            return res.status(503).json({ error: "AI not initialized" });
        }
        const similarities = [];
        for (const otherPatient of allPatients) {
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
        similarities.sort((a, b) => b.similarity - a.similarity);
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
function calculatePatientSimilaritySimple(patientA, patientB, recordB) {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const matchingFactors = [];
    if (patientA.age && patientB.age) {
        const ageDiff = Math.abs(patientA.age - patientB.age);
        let ageSimilarity = ageDiff <= 5 ? 100 : ageDiff <= 10 ? 70 : ageDiff <= 20 ? 40 : 20;
        totalScore += (ageSimilarity / 100) * 20;
        if (ageSimilarity >= 70) matchingFactors.push(`Similar age (${patientA.age} vs ${patientB.age})`);
    }
    maxPossibleScore += 20;
    if (patientA.gender && patientB.gender && patientA.gender === patientB.gender) {
        totalScore += 15;
        matchingFactors.push(`Same gender`);
    }
    maxPossibleScore += 15;
    if (patientA.province && patientB.province && patientA.province === patientB.province) {
        totalScore += 15;
        matchingFactors.push(`Same province (${patientA.province})`);
    }
    maxPossibleScore += 15;
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
    if (recordB?.primaryDiagnosis?.name) {
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
```

## National_Vitality_Eye/Server/ai/alertEmitter.js

```text

class AlertEmitter {
    constructor(io) {
        this.io = io;
        this.activeAlerts = new Map(); 
        this.alertHistory = [];
        this.subscribers = new Map(); 
    }
    sendOutbreakAlert(alert) {
        const alertId = `${alert.province}-${alert.disease}-${Date.now()}`;
        const enrichedAlert = {
            id: alertId,
            ...alert,
            timestamp: new Date(),
            read: false,
            acknowledged: false
        };
        this.alertHistory.unshift(enrichedAlert);
        if (this.alertHistory.length > 100) this.alertHistory.pop();
        const key = `${alert.province}-${alert.disease}`;
        if (!this.activeAlerts.has(key)) {
            this.activeAlerts.set(key, enrichedAlert);
            this.io.emit('outbreak-alert', enrichedAlert);
            this.io.to(`province-${alert.province}`).emit('province-alert', enrichedAlert);
            console.log(`📢 Alert sent: ${alert.message}`);
        }
    }
    sendAIUpdate(stats) {
        this.io.emit('ai-update', {
            timestamp: new Date(),
            totalRecords: stats.totalRecords,
            diseasesTracked: stats.diseasesTracked,
            lastUpdated: stats.lastUpdated
        });
    }
    sendPatientRiskUpdate(patientId, riskData) {
        this.io.to(`patient-${patientId}`).emit('risk-update', {
            patientId,
            ...riskData,
            timestamp: new Date()
        });
    }
    sendDiseaseTrend(disease, trend) {
        this.io.to(`disease-${disease}`).emit('trend-update', {
            disease,
            ...trend,
            timestamp: new Date()
        });
    }
    sendSystemStatus(status) {
        this.io.emit('system-status', {
            ...status,
            timestamp: new Date()
        });
    }
    subscribe(clientId, topics) {
        if (!this.subscribers.has(clientId)) {
            this.subscribers.set(clientId, new Set());
        }
        const clientTopics = this.subscribers.get(clientId);
        topics.forEach(topic => clientTopics.add(topic));
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
            topics.forEach(topic => {
                if (topic.startsWith('province-')) socket.join(topic);
                if (topic.startsWith('disease-')) socket.join(topic);
                if (topic === 'all-alerts') socket.join('alerts');
            });
        }
    }
    acknowledgeAlert(alertId, userId) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
            this.io.emit('alert-acknowledged', {
                alertId,
                userId,
                timestamp: new Date()
            });
        }
    }
    resolveAlert(province, disease) {
        const key = `${province}-${disease}`;
        if (this.activeAlerts.has(key)) {
            const alert = this.activeAlerts.get(key);
            alert.resolved = true;
            alert.resolvedAt = new Date();
            this.io.emit('alert-resolved', {
                province,
                disease,
                message: `✅ Alert resolved for ${disease} in ${province}`,
                timestamp: new Date()
            });
            this.activeAlerts.delete(key);
        }
    }
    getAlertHistory(limit = 50) {
        return this.alertHistory.slice(0, limit);
    }
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
}
module.exports = AlertEmitter;
```

## National_Vitality_Eye/Server/ai/continuousLearner.js

```text

const {
    normaliseDisease,
    normaliseSymptom,
    normaliseSymptoms,
    normaliseProvince,
    normaliseCondition,
    toAIKey,
    baseNormalise
} = require('../utils/normalise');
class ContinuousLearner {
    constructor() {
        this.diseasePatterns = new Map();
        this.symptomCorrelations = new Map();
        this.provinceStats = new Map();
        this.temporalPatterns = new Map();
        this.riskFactors = new Map();
        this.vitalSignsPatterns = new Map();
        this.chronicConditionCorrelations = new Map();
        this.familyHistoryCorrelations = new Map();
        this.predictionAccuracy = new Map();  
        this.calibrationFactor = 0.92;        
        this.minimumConfidence = 15;           
        this.totalPredictions = 0;
        this.correctPredictions = 0;
        this.totalRecords = 0;
        this.lastUpdated = null;
        this.patientCache = new Map();
        this.lastPatientCacheUpdate = null;
        console.log("🤖 Enhanced Clinical AI v4.0 initialized (Production Ready)");
        console.log("   Features: Disease Prediction | Risk Assessment | Anomaly Detection | Patient Similarity | Confidence Calibration");
    }
    safePercentage(value, total, maxWeight = 100) {
        if (!total || total === 0) return 0;
        const percentage = (value / total) * maxWeight;
        return Math.min(Math.max(0, percentage), maxWeight);
    }
    safeAverage(sum, count) {
        if (!count || count === 0) return null;
        return sum / count;
    }
    calculateStats(values) {
        if (!values.length) return { avg: null, stdDev: null, min: null, max: null };
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        return {
            avg,
            stdDev,
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }
    calibrateConfidence(confidence, disease, patternCount) {
        let calibratedConfidence = confidence;
        if (this.predictionAccuracy.has(disease)) {
            const stats = this.predictionAccuracy.get(disease);
            if (stats.total > 10) {
                const historicalAccuracy = stats.correct / stats.total;
                calibratedConfidence = confidence * (0.7 + historicalAccuracy * 0.3);
            }
        }
        if (patternCount > 50 && calibratedConfidence < this.minimumConfidence) {
            calibratedConfidence = this.minimumConfidence;
        }
        calibratedConfidence = calibratedConfidence * this.calibrationFactor;
        calibratedConfidence = Math.min(Math.max(calibratedConfidence, 5), 100);
        return calibratedConfidence;
    }
    recordPredictionOutcome(disease, predictedDisease, wasCorrect) {
        if (!this.predictionAccuracy.has(disease)) {
            this.predictionAccuracy.set(disease, { correct: 0, total: 0, confidenceSum: 0 });
        }
        const stats = this.predictionAccuracy.get(disease);
        if (wasCorrect) {
            stats.correct++;
            this.correctPredictions++;
        }
        stats.total++;
        this.totalPredictions++;
        if (stats.total > 10 && (stats.correct / stats.total) < 0.6) {
            console.log(`⚠️ Low accuracy warning for ${disease}: ${(stats.correct/stats.total*100).toFixed(1)}% (${stats.correct}/${stats.total})`);
        }
    }
    calculateAge(dob) {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    processNewRecord(record, patientProfile = null) {
        if (!record || !record.disease) {
            console.warn("⚠️ Invalid record passed to AI");
            return null;
        }
        const disease  = toAIKey(normaliseDisease(record.disease));
        const symptoms = normaliseSymptoms(record.symptoms || []).map(s => toAIKey(s));
        const province = toAIKey(normaliseProvince(record.province || "Unknown"));
        const month    = new Date(record.visitDate).getMonth();
        const year     = new Date(record.visitDate).getFullYear();
        const vitals   = record.vitalSigns || {};
        if (!this.diseasePatterns.has(disease)) {
            this.diseasePatterns.set(disease, {
                count: 0,
                symptoms: new Map(),
                provinces: new Map(),
                monthlyTrend: new Array(12).fill(0),
                yearlyTrend: new Map(),
                ageGroups: { child: 0, adult: 0, elderly: 0 },
                genderStats: { Male: 0, Female: 0, Other: 0 },
                riskFactors: new Map(),
                outcomes: { recovered: 0, admitted: 0, referred: 0, deceased: 0 },
                lastSeen: null,
                avgAge: 0,
                ageSum: 0,
                ageCount: 0,
                vitalSignsAverages: {
                    temperature: { sum: 0, count: 0, avg: null },
                    heartRate: { sum: 0, count: 0, avg: null },
                    systolicBP: { sum: 0, count: 0, avg: null },
                    diastolicBP: { sum: 0, count: 0, avg: null },
                    oxygenSaturation: { sum: 0, count: 0, avg: null },
                    respiratoryRate: { sum: 0, count: 0, avg: null }
                },
                chronicConditions: new Map(),
                familyHistory: new Map()
            });
        }
        const pattern = this.diseasePatterns.get(disease);
        pattern.count++;
        pattern.lastSeen = new Date();
        symptoms.forEach(symptom => {
            if (symptom) {
                const current = pattern.symptoms.get(symptom) || 0;
                pattern.symptoms.set(symptom, current + 1);
            }
        });
        const provinceCurrent = pattern.provinces.get(province) || 0;
        pattern.provinces.set(province, provinceCurrent + 1);
        if (month >= 0 && month < 12) {
            pattern.monthlyTrend[month]++;
        }
        const yearKey = year.toString();
        const yearCurrent = pattern.yearlyTrend.get(yearKey) || 0;
        pattern.yearlyTrend.set(yearKey, yearCurrent + 1);
        if (vitals.temperature && typeof vitals.temperature === 'number') {
            pattern.vitalSignsAverages.temperature.sum += vitals.temperature;
            pattern.vitalSignsAverages.temperature.count++;
            pattern.vitalSignsAverages.temperature.avg = 
                this.safeAverage(pattern.vitalSignsAverages.temperature.sum, pattern.vitalSignsAverages.temperature.count);
        }
        if (vitals.heartRate && typeof vitals.heartRate === 'number') {
            pattern.vitalSignsAverages.heartRate.sum += vitals.heartRate;
            pattern.vitalSignsAverages.heartRate.count++;
            pattern.vitalSignsAverages.heartRate.avg = 
                this.safeAverage(pattern.vitalSignsAverages.heartRate.sum, pattern.vitalSignsAverages.heartRate.count);
        }
        if (vitals.bloodPressure?.systolic && typeof vitals.bloodPressure.systolic === 'number') {
            pattern.vitalSignsAverages.systolicBP.sum += vitals.bloodPressure.systolic;
            pattern.vitalSignsAverages.systolicBP.count++;
            pattern.vitalSignsAverages.systolicBP.avg = 
                this.safeAverage(pattern.vitalSignsAverages.systolicBP.sum, pattern.vitalSignsAverages.systolicBP.count);
        }
        if (vitals.bloodPressure?.diastolic && typeof vitals.bloodPressure.diastolic === 'number') {
            pattern.vitalSignsAverages.diastolicBP.sum += vitals.bloodPressure.diastolic;
            pattern.vitalSignsAverages.diastolicBP.count++;
            pattern.vitalSignsAverages.diastolicBP.avg = 
                this.safeAverage(pattern.vitalSignsAverages.diastolicBP.sum, pattern.vitalSignsAverages.diastolicBP.count);
        }
        if (vitals.oxygenSaturation && typeof vitals.oxygenSaturation === 'number') {
            pattern.vitalSignsAverages.oxygenSaturation.sum += vitals.oxygenSaturation;
            pattern.vitalSignsAverages.oxygenSaturation.count++;
            pattern.vitalSignsAverages.oxygenSaturation.avg = 
                this.safeAverage(pattern.vitalSignsAverages.oxygenSaturation.sum, pattern.vitalSignsAverages.oxygenSaturation.count);
        }
        if (vitals.respiratoryRate && typeof vitals.respiratoryRate === 'number') {
            pattern.vitalSignsAverages.respiratoryRate.sum += vitals.respiratoryRate;
            pattern.vitalSignsAverages.respiratoryRate.count++;
            pattern.vitalSignsAverages.respiratoryRate.avg = 
                this.safeAverage(pattern.vitalSignsAverages.respiratoryRate.sum, pattern.vitalSignsAverages.respiratoryRate.count);
        }
        if (patientProfile) {
            const age = patientProfile.age || this.calculateAge(patientProfile.dateOfBirth);
            const gender = patientProfile.gender;
            if (age !== null && typeof age === 'number') {
                pattern.ageSum += age;
                pattern.ageCount++;
                pattern.avgAge = pattern.ageSum / pattern.ageCount;
                if (age < 18) pattern.ageGroups.child++;
                else if (age < 65) pattern.ageGroups.adult++;
                else pattern.ageGroups.elderly++;
            }
            if (gender && (gender === 'Male' || gender === 'Female' || gender === 'Other')) {
                pattern.genderStats[gender]++;
            }
            if (patientProfile.clinicalProfile?.riskFactors) {
                patientProfile.clinicalProfile.riskFactors.forEach(rf => {
                    if (rf && rf.factor) {
                        const current = pattern.riskFactors.get(rf.factor) || 0;
                        pattern.riskFactors.set(rf.factor, current + 1);
                    }
                });
            }
            if (patientProfile.clinicalProfile?.chronicConditions) {
                patientProfile.clinicalProfile.chronicConditions.forEach(condition => {
                    if (condition && condition.condition) {
                        const conditionName = toAIKey(normaliseCondition(condition.condition));
                        const current = pattern.chronicConditions.get(conditionName) || 0;
                        pattern.chronicConditions.set(conditionName, current + 1);
                        if (!this.chronicConditionCorrelations.has(conditionName)) {
                            this.chronicConditionCorrelations.set(conditionName, new Map());
                        }
                        const conditionMap = this.chronicConditionCorrelations.get(conditionName);
                        const diseaseCurrent = conditionMap.get(disease) || 0;
                        conditionMap.set(disease, diseaseCurrent + 1);
                    }
                });
            }
            const familyHistory = patientProfile.clinicalProfile?.familyHistory;
            if (familyHistory) {
                const allFamilyConditions = [
                    ...(familyHistory.mother || []),
                    ...(familyHistory.father || []),
                    ...(familyHistory.siblings || [])
                ].filter(c => c);
                allFamilyConditions.forEach(condition => {
                    const normCondition = toAIKey(normaliseCondition(condition));
                    const current = pattern.familyHistory.get(normCondition) || 0;
                    pattern.familyHistory.set(normCondition, current + 1);
                    if (!this.familyHistoryCorrelations.has(normCondition)) {
                        this.familyHistoryCorrelations.set(normCondition, new Map());
                    }
                    const familyMap = this.familyHistoryCorrelations.get(normCondition);
                    const diseaseCurrent = familyMap.get(disease) || 0;
                    familyMap.set(disease, diseaseCurrent + 1);
                });
            }
        }
        if (record.disposition) {
            const outcome = record.disposition.toLowerCase();
            if (outcome === "discharged") pattern.outcomes.recovered++;
            else if (outcome === "admitted") pattern.outcomes.admitted++;
            else if (outcome === "referred") pattern.outcomes.referred++;
            else if (outcome === "deceased") pattern.outcomes.deceased++;
        }
        if (!this.provinceStats.has(province)) {
            this.provinceStats.set(province, {
                total: 0,
                diseases: new Map(),
                monthlyTrend: new Array(12).fill(0),
                ageGroups: { child: 0, adult: 0, elderly: 0 },
                riskFactors: new Map(),
                vitalSignsAverages: {
                    temperature: { sum: 0, count: 0, avg: null },
                    heartRate: { sum: 0, count: 0, avg: null },
                    systolicBP: { sum: 0, count: 0, avg: null },
                    diastolicBP: { sum: 0, count: 0, avg: null }
                }
            });
        }
        const provStat = this.provinceStats.get(province);
        provStat.total++;
        const diseaseCurrent = provStat.diseases.get(disease) || 0;
        provStat.diseases.set(disease, diseaseCurrent + 1);
        if (month >= 0 && month < 12) {
            provStat.monthlyTrend[month]++;
        }
        if (vitals.temperature && typeof vitals.temperature === 'number') {
            provStat.vitalSignsAverages.temperature.sum += vitals.temperature;
            provStat.vitalSignsAverages.temperature.count++;
            provStat.vitalSignsAverages.temperature.avg = 
                this.safeAverage(provStat.vitalSignsAverages.temperature.sum, provStat.vitalSignsAverages.temperature.count);
        }
        if (patientProfile) {
            const age = patientProfile.age || this.calculateAge(patientProfile.dateOfBirth);
            if (age !== null && typeof age === 'number') {
                if (age < 18) provStat.ageGroups.child++;
                else if (age < 65) provStat.ageGroups.adult++;
                else provStat.ageGroups.elderly++;
            }
        }
        for (let i = 0; i < symptoms.length; i++) {
            for (let j = i + 1; j < symptoms.length; j++) {
                const s1 = symptoms[i];
                const s2 = symptoms[j];
                if (!s1 || !s2) continue;
                const key = [s1, s2].sort().join('|');
                if (!this.symptomCorrelations.has(key)) {
                    this.symptomCorrelations.set(key, {
                        count: 0,
                        diseases: new Map(),
                        severity: 0
                    });
                }
                const corr = this.symptomCorrelations.get(key);
                corr.count++;
                const corrDiseaseCurrent = corr.diseases.get(disease) || 0;
                corr.diseases.set(disease, corrDiseaseCurrent + 1);
            }
        }
        this.totalRecords++;
        this.lastUpdated = new Date();
        this.patientCache.clear();
        return {
            disease,
            totalCases: pattern.count
        };
    }
    processBatch(records) {
        if (!records || records.length === 0) {
            console.log("⚠️ No records to process");
            return this.getStats();
        }
        console.log(`📚 AI learning from ${records.length} records...`);
        let processed = 0;
        for (const record of records) {
            if (record && record.disease) {
                const profile = record.patientId && typeof record.patientId === 'object' ? record.patientId : null;
                this.processNewRecord(record, profile);
                processed++;
            }
        }
        console.log(`✅ Processed ${processed} valid records`);
        return this.getStats();
    }
    predictDisease(symptoms, province, month, patientAge = null, patientGender = null, 
                    patientRiskFactors = [], patientVitals = {}, patientChronicConditions = [], 
                    patientFamilyHistory = {}) {
        const predictions = [];
        const validSymptoms = normaliseSymptoms(symptoms || []).map(s => toAIKey(s));
        const validProvince = toAIKey(normaliseProvince(province || "Harare"));
        const validMonth    = (typeof month === 'number' && month >= 0 && month < 12) ? month : new Date().getMonth();
        const normConditions = (patientChronicConditions || []).map(c => toAIKey(normaliseCondition(c)));
        const normFamilyAll  = [
            ...(patientFamilyHistory?.mother   || []),
            ...(patientFamilyHistory?.father   || []),
            ...(patientFamilyHistory?.siblings || [])
        ].filter(c => c).map(c => toAIKey(normaliseCondition(c)));
        this.diseasePatterns.forEach((pattern, disease) => {
            if (pattern.count === 0) return;
            let totalScore = 0;
            let totalPossibleScore = 0;
            let reasons = [];
            const symptomWeight = 25;
            let symptomScore = 0;
            if (validSymptoms.length > 0) {
                validSymptoms.forEach(symptom => {
                    const symptomCount = pattern.symptoms.get(symptom) || 0;
                    if (symptomCount > 0) {
                        const contribution = this.safePercentage(symptomCount, pattern.count, symptomWeight / validSymptoms.length);
                        symptomScore += contribution;
                        reasons.push(`${symptom} shows strong clinical correlation (${Math.round(contribution)}% weight)`);
                    }
                });
                symptomScore = Math.min(symptomScore, symptomWeight);
                totalScore += symptomScore;
            }
            totalPossibleScore += symptomWeight;
            const provinceWeight = 15;
            const provinceCount = pattern.provinces.get(validProvince) || 0;
            let provinceScore = 0;
            if (provinceCount > 0) {
                provinceScore = this.safePercentage(provinceCount, pattern.count, provinceWeight);
                totalScore += provinceScore;
                reasons.push(`Regional epidemiological prevalence in ${validProvince} (${Math.round(provinceScore)}%)`);
            }
            totalPossibleScore += provinceWeight;
            const seasonalWeight = 10;
            const monthCount = pattern.monthlyTrend[validMonth] || 0;
            let seasonalScore = 0;
            if (monthCount > 0) {
                const monthlyTotal = pattern.monthlyTrend.reduce((a, b) => a + b, 0);
                if (monthlyTotal > 0) {
                    seasonalScore = Math.min((monthCount / monthlyTotal) * seasonalWeight, seasonalWeight);
                    totalScore += seasonalScore;
                    reasons.push(`Alignment with historical seasonal transmission cycles (${Math.round(seasonalScore)}%)`);
                }
            }
            totalPossibleScore += seasonalWeight;
            const ageWeight = 8;
            let ageScore = 0;
            if (patientAge !== null && typeof patientAge === 'number') {
                let ageGroup = "adult";
                if (patientAge < 18) ageGroup = "child";
                if (patientAge > 64) ageGroup = "elderly";
                const ageGroupCount = pattern.ageGroups[ageGroup] || 0;
                ageScore = this.safePercentage(ageGroupCount, pattern.count, ageWeight);
                totalScore += ageScore;
                reasons.push(`Demographic susceptibility: ${ageGroup} cohort (${Math.round(ageScore)}%)`);
            }
            totalPossibleScore += ageWeight;
            const genderWeight = 4;
            let genderScore = 0;
            if (patientGender && (patientGender === 'Male' || patientGender === 'Female')) {
                const genderCount = pattern.genderStats[patientGender] || 0;
                genderScore = this.safePercentage(genderCount, pattern.count, genderWeight);
                totalScore += genderScore;
                reasons.push(`Biological gender correlation: ${patientGender} (${Math.round(genderScore)}%)`);
            }
            totalPossibleScore += genderWeight;
            const riskWeight = 10;
            let riskScore = 0;
            if (patientRiskFactors && patientRiskFactors.length > 0) {
                patientRiskFactors.forEach(rf => {
                    if (rf) {
                        const rfCount = pattern.riskFactors.get(rf) || 0;
                        riskScore += this.safePercentage(rfCount, pattern.count, riskWeight / patientRiskFactors.length);
                    }
                });
                riskScore = Math.min(riskScore, riskWeight);
                totalScore += riskScore;
                if (riskScore > 0) reasons.push(`Specific clinical risk factor alignment (${Math.round(riskScore)}%)`);
            }
            totalPossibleScore += riskWeight;
            const vitalsWeight = 12;
            let vitalsScore = 0;
            let vitalsMatched = 0;
            if (patientVitals && pattern.vitalSignsAverages.temperature.avg && patientVitals.temperature) {
                const tempDiff = Math.abs(patientVitals.temperature - pattern.vitalSignsAverages.temperature.avg);
                const tempMatch = Math.max(0, 100 - (tempDiff * 10)) / 100;
                vitalsScore += tempMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (tempMatch > 0.5) reasons.push(`Homeostatic deviation: Temperature match (${Math.round(tempMatch * 100)}%)`);
            }
            if (patientVitals && pattern.vitalSignsAverages.heartRate.avg && patientVitals.heartRate) {
                const hrDiff = Math.abs(patientVitals.heartRate - pattern.vitalSignsAverages.heartRate.avg);
                const hrMatch = Math.max(0, 100 - (hrDiff * 5)) / 100;
                vitalsScore += hrMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (hrMatch > 0.5) reasons.push(`Cardiovascular pattern: Heart rate match (${Math.round(hrMatch * 100)}%)`);
            }
            if (patientVitals && pattern.vitalSignsAverages.systolicBP.avg && patientVitals.systolicBP) {
                const bpDiff = Math.abs(patientVitals.systolicBP - pattern.vitalSignsAverages.systolicBP.avg);
                const bpMatch = Math.max(0, 100 - (bpDiff * 3)) / 100;
                vitalsScore += bpMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (bpMatch > 0.5) reasons.push(`Hemodynamic pattern: Blood pressure match (${Math.round(bpMatch * 100)}%)`);
            }
            if (patientVitals && pattern.vitalSignsAverages.oxygenSaturation.avg && patientVitals.oxygenSaturation) {
                const o2Diff = Math.abs(patientVitals.oxygenSaturation - pattern.vitalSignsAverages.oxygenSaturation.avg);
                const o2Match = Math.max(0, 100 - (o2Diff * 20)) / 100;
                vitalsScore += o2Match * (vitalsWeight / 5);
                vitalsMatched++;
                if (o2Match > 0.5) reasons.push(`Respiratory pattern: O₂ saturation match (${Math.round(o2Match * 100)}%)`);
            }
            if (patientVitals && pattern.vitalSignsAverages.respiratoryRate?.avg && patientVitals.respiratoryRate) {
                const rrDiff = Math.abs(patientVitals.respiratoryRate - pattern.vitalSignsAverages.respiratoryRate.avg);
                const rrMatch = Math.max(0, 100 - (rrDiff * 10)) / 100;
                vitalsScore += rrMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (rrMatch > 0.5) reasons.push(`Ventilatory pattern: Respiratory rate match (${Math.round(rrMatch * 100)}%)`);
            }
            vitalsScore = Math.min(vitalsScore, vitalsWeight);
            totalScore += vitalsScore;
            totalPossibleScore += vitalsWeight;
            const chronicWeight = 8;
            let chronicScore = 0;
            if (normConditions && normConditions.length > 0) {
                normConditions.forEach(condition => {
                    if (condition) {
                        const conditionCount = pattern.chronicConditions.get(condition) || 0;
                        chronicScore += this.safePercentage(conditionCount, pattern.count, chronicWeight / normConditions.length);
                        if (conditionCount > 0) {
                            reasons.push(`Medical history: ${condition} co-morbidity (${Math.round((conditionCount / pattern.count) * 100)}% correlation)`);
                        }
                    }
                });
                chronicScore = Math.min(chronicScore, chronicWeight);
                totalScore += chronicScore;
            }
            totalPossibleScore += chronicWeight;
            const familyWeight = 8;
            let familyScore = 0;
            if (normFamilyAll.length > 0) {
                normFamilyAll.forEach(condition => {
                    const familyCount = pattern.familyHistory.get(condition) || 0;
                    familyScore += this.safePercentage(familyCount, pattern.count, familyWeight / normFamilyAll.length);
                    if (familyCount > 0) {
                        reasons.push(`Hereditary risk: Family history of ${condition} (${Math.round((familyCount / pattern.count) * 100)}% correlation)`);
                    }
                });
                familyScore = Math.min(familyScore, familyWeight);
                totalScore += familyScore;
            }
            totalPossibleScore += familyWeight;
            let confidence = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;
            confidence = Math.min(Math.max(0, confidence), 100);
            confidence = this.calibrateConfidence(confidence, disease, pattern.count);
            if (confidence > this.minimumConfidence) {
                predictions.push({
                    disease,
                    confidence: Math.round(confidence * 10) / 10,
                    probability: confidence / 100,
                    reasons: reasons.slice(0, 6),
                    totalCases: pattern.count,
                    ageDistribution: pattern.ageGroups,
                    outcomeRates: {
                        recoveryRate: Math.min(100, Math.round((pattern.outcomes.recovered / pattern.count) * 100)),
                        admissionRate: Math.min(100, Math.round((pattern.outcomes.admitted / pattern.count) * 100)),
                        mortalityRate: Math.min(100, Math.round((pattern.outcomes.deceased / pattern.count) * 100))
                    },
                    expectedVitalSigns: {
                        temperature: pattern.vitalSignsAverages.temperature.avg,
                        heartRate: pattern.vitalSignsAverages.heartRate.avg,
                        bloodPressure: {
                            systolic: pattern.vitalSignsAverages.systolicBP.avg,
                            diastolic: pattern.vitalSignsAverages.diastolicBP.avg
                        },
                        oxygenSaturation: pattern.vitalSignsAverages.oxygenSaturation.avg,
                        respiratoryRate: pattern.vitalSignsAverages.respiratoryRate.avg
                    },
                    commonChronicConditions: Array.from(pattern.chronicConditions.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([condition, count]) => ({ 
                            condition, 
                            prevalence: Math.min(100, Math.round((count / pattern.count) * 100))
                        })),
                    lastSeen: pattern.lastSeen
                });
            }
        });
        predictions.sort((a, b) => b.confidence - a.confidence);
        return {
            predictions: predictions.slice(0, 5),
            basedOnRecords: this.totalRecords,
            lastUpdated: this.lastUpdated,
            enhancedWith: ["Vital Signs", "Chronic Conditions", "Family History", "Confidence Calibration"],
            calibrationMetrics: {
                totalPredictions: this.totalPredictions,
                correctPredictions: this.correctPredictions,
                overallAccuracy: this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions) * 100 : null
            }
        };
    }
    assessPatientRisk(patientProfile, medicalRecords) {
        const riskFactors = [];
        let riskScore = 0;
        let recommendations = [];
        const age = patientProfile?.age;
        if (age !== null && typeof age === 'number') {
            if (age > 65) {
                riskScore += 20;
                riskFactors.push(`Geriatric age group (Age: ${age}) increases clinical risk complexity (+20)`);
                recommendations.push("Prioritize comprehensive geriatric assessment and multi-morbidity screening");
            } else if (age < 5) {
                riskScore += 15;
                riskFactors.push(`Pediatric age group (Age: ${age}) indicates heightened physiological vulnerability (+15)`);
                recommendations.push("Urgent pediatric specialist evaluation for age-specific clinical manifestations");
            } else if (age > 50) {
                riskScore += 8;
                riskFactors.push(`Advancing age (Age: ${age}) correlates with increased risk of chronic pathology (+8)`);
            }
        }
        const chronicConditions = patientProfile?.clinicalProfile?.chronicConditions || [];
        chronicConditions.forEach(condition => {
            let conditionScore = 15;
            if (condition.severity === "Severe") conditionScore += 10;
            if (condition.severity === "Critical") conditionScore += 20;
            if (condition.status !== "Controlled") conditionScore += 5;
            riskScore = Math.min(riskScore + conditionScore, 100);
            riskFactors.push(`Comorbidity: ${condition.condition} (${condition.status}, ${condition.severity} severity) (+${conditionScore})`);
            recommendations.push(`Strict monitoring and management protocol for ${condition.condition}`);
        });
        const familyHistory = patientProfile?.clinicalProfile?.familyHistory || {};
        const allFamilyConditions = [
            ...(familyHistory.mother || []),
            ...(familyHistory.father || []),
            ...(familyHistory.siblings || [])
        ].filter(c => c);
        if (allFamilyConditions.length > 0) {
            const familyRisk = Math.min(allFamilyConditions.length * 5, 25);
            riskScore = Math.min(riskScore + familyRisk, 100);
            riskFactors.push(`Genetic predisposition: Family history of ${allFamilyConditions.join(", ")} (+${familyRisk})`);
            recommendations.push("Consider genetic counseling and targeted screening for hereditary conditions");
        }
        const vitals = patientProfile?.clinicalProfile?.vitalSigns;
        if (vitals) {
            if (vitals.bmi) {
                if (vitals.bmi > 30) {
                    riskScore = Math.min(riskScore + 10, 100);
                    riskFactors.push(`Metabolic risk: Obesity (BMI: ${vitals.bmi}) (+10)`);
                    recommendations.push("Nutritional counseling and metabolic risk factor assessment");
                } else if (vitals.bmi < 18.5) {
                    riskScore = Math.min(riskScore + 8, 100);
                    riskFactors.push(`Nutritional risk: Underweight (BMI: ${vitals.bmi}) (+8)`);
                    recommendations.push("Nutritional support and investigation of underlying causes");
                }
            }
            if (vitals.bloodPressure) {
                const { systolic, diastolic } = vitals.bloodPressure;
                if (systolic > 140 || diastolic > 90) {
                    riskScore = Math.min(riskScore + 12, 100);
                    riskFactors.push(`Cardiovascular risk: Hypertension (${systolic}/${diastolic} mmHg) (+12)`);
                    recommendations.push("Serial blood pressure monitoring and antihypertensive evaluation");
                }
            }
            if (vitals.heartRate && (vitals.heartRate > 100 || vitals.heartRate < 60)) {
                riskScore = Math.min(riskScore + 6, 100);
                riskFactors.push(`Abnormal heart rate (${vitals.heartRate}) +6`);
            }
            if (vitals.oxygenSaturation && vitals.oxygenSaturation < 95) {
                riskScore = Math.min(riskScore + 15, 100);
                riskFactors.push(`Low oxygen saturation (${vitals.oxygenSaturation}%) +15`);
                recommendations.push("Respiratory assessment needed");
            }
        }
        if (patientProfile?.pregnancyInfo?.isPregnant) {
            riskScore = Math.min(riskScore + 20, 100);
            riskFactors.push(`Pregnancy +20`);
            recommendations.push("Antenatal care follow-up");
            if (patientProfile.pregnancyInfo.highRisk) {
                riskScore = Math.min(riskScore + 15, 100);
                riskFactors.push(`High-risk pregnancy +15`);
                recommendations.push("High-risk obstetrics consultation");
            }
        }
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recentVisits = (medicalRecords || []).filter(r => r && new Date(r.visitDate) > threeMonthsAgo);
        if (recentVisits.length > 5) {
            riskScore = Math.min(riskScore + 15, 100);
            riskFactors.push(`Very frequent visits (${recentVisits.length} in 3 months) +15`);
            recommendations.push("Case management review");
        } else if (recentVisits.length > 3) {
            riskScore = Math.min(riskScore + 8, 100);
            riskFactors.push(`Frequent visits (${recentVisits.length} in 3 months) +8`);
        }
        let riskLevel = "LOW";
        if (riskScore >= 100) riskLevel = "CRITICAL";
        else if (riskScore >= 70) riskLevel = "HIGH";
        else if (riskScore >= 40) riskLevel = "MODERATE";
        return {
            riskScore: Math.min(riskScore, 100),
            riskLevel,
            riskFactors: riskFactors.slice(0, 10),
            recommendations: recommendations.slice(0, 6),
            chronicConditionsCount: chronicConditions.length,
            familyHistoryCount: allFamilyConditions.length,
            recentVisitsCount: recentVisits.length,
            lastVisit: medicalRecords && medicalRecords[0]?.visitDate || null,
            lastVitals: vitals || null,
            enhancedAnalysis: true
        };
    }
    detectOutbreaks() {
        const alerts = [];
        this.provinceStats.forEach((stats, province) => {
            const recentWeek = stats.monthlyTrend.slice(-1)[0] || 0;
            const previousWeek = stats.monthlyTrend.slice(-2, -1)[0] || 0;
            if (previousWeek > 0) {
                let increase = ((recentWeek - previousWeek) / previousWeek) * 100;
                increase = Math.min(Math.max(0, increase), 100);
                if (increase > 50) {
                    let topDisease = null;
                    let maxCount = 0;
                    stats.diseases.forEach((count, disease) => {
                        if (count > maxCount) {
                            maxCount = count;
                            topDisease = disease;
                        }
                    });
                    const diseasePattern = this.diseasePatterns.get(topDisease);
                    let mortalityRate = diseasePattern ? 
                        (diseasePattern.outcomes.deceased / diseasePattern.count) * 100 : 0;
                    mortalityRate = Math.min(mortalityRate, 100);
                    alerts.push({
                        province,
                        disease: topDisease,
                        type: "OUTBREAK",
                        message: `⚠️ ${topDisease} cases increased by ${Math.round(increase)}% in ${province}`,
                        severity: increase > 100 ? "CRITICAL" : "HIGH",
                        recentCases: Math.round(recentWeek),
                        previousCases: Math.round(previousWeek),
                        mortalityRate: Math.round(mortalityRate),
                        timestamp: new Date(),
                        affectedAgeGroups: stats.ageGroups
                    });
                }
            }
            stats.diseases.forEach((count, disease) => {
                const pattern = this.diseasePatterns.get(disease);
                if (pattern && pattern.count < 30 && count > 3) {
                    alerts.push({
                        province,
                        disease,
                        type: "EMERGING",
                        message: `🆕 Emerging: ${disease} in ${province} (${count} new cases)`,
                        severity: "MEDIUM",
                        cases: count,
                        timestamp: new Date()
                    });
                }
            });
        });
        return alerts;
    }
    getStats() {
        return {
            totalRecords: this.totalRecords,
            diseasesTracked: this.diseasePatterns.size,
            provincesTracked: this.provinceStats.size,
            symptomCorrelations: this.symptomCorrelations.size,
            chronicConditionCorrelations: this.chronicConditionCorrelations.size,
            familyHistoryCorrelations: this.familyHistoryCorrelations.size,
            lastUpdated: this.lastUpdated,
            predictionAccuracy: {
                totalPredictions: this.totalPredictions,
                correctPredictions: this.correctPredictions,
                overallAccuracy: this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions) * 100 : null,
                perDisease: Array.from(this.predictionAccuracy.entries()).map(([disease, stats]) => ({
                    disease,
                    correct: stats.correct,
                    total: stats.total,
                    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
                }))
            },
            topDiseases: Array.from(this.diseasePatterns.entries())
                .map(([disease, data]) => ({
                    disease,
                    cases: data.count,
                    recoveryRate: data.count > 0 ? Math.min(100, Math.round((data.outcomes.recovered / data.count) * 100)) : 0,
                    mortalityRate: data.count > 0 ? Math.min(100, Math.round((data.outcomes.deceased / data.count) * 100)) : 0,
                    mostAffectedAgeGroup: Object.entries(data.ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0],
                    avgTemperature: data.vitalSignsAverages.temperature.avg,
                    avgHeartRate: data.vitalSignsAverages.heartRate.avg,
                    lastSeen: data.lastSeen
                }))
                .sort((a, b) => b.cases - a.cases)
                .slice(0, 10),
            highRiskProvinces: Array.from(this.provinceStats.entries())
                .filter(([_, data]) => data.total > 100)
                .map(([province, data]) => ({
                    province,
                    totalCases: data.total,
                    elderlyProportion: data.ageGroups.elderly / data.total,
                    avgTemperature: data.vitalSignsAverages.temperature.avg
                }))
                .sort((a, b) => b.elderlyProportion - a.elderlyProportion)
        };
    }
    getExpectedVitalSigns(disease) {
        const pattern = this.diseasePatterns.get(disease);
        if (!pattern) return null;
        return {
            disease,
            temperature: pattern.vitalSignsAverages.temperature.avg,
            heartRate: pattern.vitalSignsAverages.heartRate.avg,
            bloodPressure: {
                systolic: pattern.vitalSignsAverages.systolicBP.avg,
                diastolic: pattern.vitalSignsAverages.diastolicBP.avg
            },
            oxygenSaturation: pattern.vitalSignsAverages.oxygenSaturation.avg,
            respiratoryRate: pattern.vitalSignsAverages.respiratoryRate.avg,
            sampleSize: pattern.vitalSignsAverages.temperature.count
        };
    }
    getCommonPrecedingConditions(disease) {
        const pattern = this.diseasePatterns.get(disease);
        if (!pattern) return [];
        return Array.from(pattern.chronicConditions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([condition, count]) => ({
                condition,
                prevalence: Math.min(100, Math.round((count / pattern.count) * 100))
            }));
    }
    getPredictionAccuracy(disease) {
        const stats = this.predictionAccuracy.get(disease);
        if (!stats) return null;
        return {
            disease,
            correct: stats.correct,
            total: stats.total,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
            needsMoreData: stats.total < 30
        };
    }
}
module.exports = ContinuousLearner;
```

## National_Vitality_Eye/Server/ai/realTimeLearner.js

```text

const MedicalRecord = require("../models/MedicalRecord");
const ContinuousLearner = require("./continuousLearner");
class RealTimeLearner {
    constructor(io, alertEmitter) {
        this.ai = new ContinuousLearner();
        this.io = io;
        this.alertEmitter = alertEmitter;
        this.isListening = false;
        this.changeStream = null;
        this.lastAlertCheck = new Date();
    }
    async start() {
        console.log("🎧 Real-time AI learner starting...");
        await this.loadHistoricalData();
        this.watchChanges();
        this.alertEmitter.sendSystemStatus({
            status: 'active',
            message: 'AI System Online',
            stats: this.ai.getStats()
        });
        return this.ai;
    }
    async loadHistoricalData() {
        try {
            console.log("📚 Loading historical medical records...");
            const records = await MedicalRecord.find({})
                .populate('patientId')
                .sort({ visitDate: -1 });
            if (records.length > 0) {
                this.ai.processBatch(records);
                console.log(`✅ Loaded ${records.length} historical records`);
                this.alertEmitter.sendAIUpdate(this.ai.getStats());
            } else {
                console.log("ℹ️ No historical records found");
            }
        } catch (error) {
            console.error("❌ Error loading historical data:", error);
        }
    }
    watchChanges() {
        try {
            this.changeStream = MedicalRecord.watch([], { fullDocument: 'updateLookup' });
            this.changeStream.on('change', async (change) => {
                console.log("🔄 Database change detected:", change.operationType);
                if (change.operationType === 'insert') {
                    const newRecord = await MedicalRecord.findById(change.documentKey._id)
                        .populate('patientId');
                    if (newRecord) {
                        this.ai.processNewRecord(newRecord);
                        console.log(`✨ AI updated with new ${newRecord.disease} case`);
                        this.alertEmitter.sendAIUpdate(this.ai.getStats());
                        this.checkForOutbreaks();
                        this.io.to(`disease-${newRecord.disease}`).emit('new-case', {
                            disease: newRecord.disease,
                            province: newRecord.province,
                            timestamp: newRecord.visitDate
                        });
                    }
                }
                if (change.operationType === 'update') {
                    const updatedRecord = await MedicalRecord.findById(change.documentKey._id)
                        .populate('patientId');
                    if (updatedRecord) {
                        console.log(`📝 Record updated: ${updatedRecord.disease}`);
                    }
                }
            });
            this.changeStream.on('error', (error) => {
                console.error("❌ Change stream error:", error);
                this.alertEmitter.sendSystemStatus({
                    status: 'error',
                    message: error.message
                });
            });
            this.isListening = true;
            console.log("🎧 Real-time AI learner is now listening for changes");
        } catch (error) {
            console.error("❌ Error starting change stream:", error);
        }
    }
    checkForOutbreaks() {
        const now = new Date();
        if (now - this.lastAlertCheck < 5 * 60 * 1000) {
            return;
        }
        this.lastAlertCheck = now;
        const alerts = this.ai.detectOutbreaks();
        alerts.forEach(alert => {
            const activeAlerts = this.alertEmitter.getActiveAlerts();
            const existingAlert = activeAlerts.find(a => 
                a.province === alert.province && 
                a.disease === alert.disease
            );
            if (!existingAlert) {
                this.alertEmitter.sendOutbreakAlert(alert);
            }
        });
        const activeAlerts = this.alertEmitter.getActiveAlerts();
        activeAlerts.forEach(alert => {
            const recentCases = this.ai.provinceStats.get(alert.province)?.diseases.get(alert.disease) || 0;
            if (recentCases === 0) {
                this.alertEmitter.resolveAlert(alert.province, alert.disease);
            }
        });
    }
    stop() {
        if (this.changeStream) {
            this.changeStream.close();
            this.isListening = false;
            console.log("🛑 Real-time AI learner stopped");
            this.alertEmitter.sendSystemStatus({
                status: 'stopped',
                message: 'AI System Stopped'
            });
        }
    }
    getAI() {
        return this.ai;
    }
}
module.exports = RealTimeLearner;
```

## National_Vitality_Eye/Server/config/db.js

```text
const mongoose = require("mongoose");
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
};
module.exports = connectDB;
```

## National_Vitality_Eye/Server/edliz.json

```text
{
  "data": [
    {
      "disease": "Neonatal ophthalmia",
      "symptoms": "Conjunctivitis with discharge within first month of life",
      "treatment_drugs": "Tetracycline eye ointment 1% (prophylaxis); Kanamycin + Erythromycin; Ceftriaxone"
    },
    {
      "disease": "Haemorrhagic disease of newborn",
      "symptoms": "Bleeding tendency",
      "treatment_drugs": "Vitamin K IM"
    },
    {
      "disease": "Birth asphyxia / respiratory depression",
      "symptoms": "Poor breathing, especially if mother given pethidine in labour",
      "treatment_drugs": "Naloxone neonatal; Adrenaline (dilute 1:10,000); Sodium bicarbonate slow IV"
    },
    {
      "disease": "Neonatal sepsis (suspected)",
      "symptoms": "Few localising signs, lethargy, poor feeding, respiratory distress, seizures, temperature instability, feed intolerance",
      "treatment_drugs": "Benzylpenicillin + Gentamicin (first 48hrs); Gentamicin + Cloxacillin (after 48hrs); Ampicillin if benzylpenicillin unavailable"
    },
    {
      "disease": "Neonatal meningitis",
      "symptoms": "Signs of sepsis + neurological involvement",
      "treatment_drugs": "Benzylpenicillin + Gentamicin + Chloramphenicol; Ceftriaxone as alternative"
    },
    {
      "disease": "Necrotising enterocolitis (NEC)",
      "symptoms": "Feed intolerance, abdominal distension, vomiting, bloody stools, perforation",
      "treatment_drugs": "Nil by mouth; supportive care; Benzylpenicillin + Gentamicin + Metronidazole IV"
    },
    {
      "disease": "Neonatal tetanus",
      "symptoms": "Muscle spasms, rigidity, difficulty feeding",
      "treatment_drugs": "Minimal handling; Benzylpenicillin or Procaine penicillin; Anti-tetanus immunoglobulin; Diazepam or Chlorpromazine + Phenobarbitone for spasms"
    },
    {
      "disease": "Congenital syphilis",
      "symptoms": "Signs of syphilis in neonate (rash, hepatosplenomegaly, snuffles, etc.)",
      "treatment_drugs": "Procaine penicillin or Erythromycin (if penicillin allergy)"
    },
    {
      "disease": "Jaundice (neonatal)",
      "symptoms": "Yellow discolouration of skin/sclera within 24 hours of birth; visible jaundice",
      "treatment_drugs": "Phototherapy; Exchange transfusion; extra fluids; encourage breastfeeding"
    },
    {
      "disease": "Neonatal convulsions",
      "symptoms": "Seizures, hypoglycaemia (<2.2mmol/l), hypoxic-ischaemic encephalopathy, meningitis, hypocalcaemia",
      "treatment_drugs": "Dextrose 50% slow IV (if hypoglycaemic); Dextrose 10% infusion; Phenobarbitone IV (loading then maintenance); Phenytoin IV; Lorazepam or Midazolam (if refractory)"
    },
    {
      "disease": "Hypoglycaemia (neonatal)",
      "symptoms": "Dextrose <2.2mmol/l, convulsions, lethargy",
      "treatment_drugs": "Dextrose 50% IV (1ml/kg diluted 1:1); Dextrose 10% infusion; breast milk via NG tube"
    },
    {
      "disease": "Respiratory Distress Syndrome (RDS)",
      "symptoms": "Respiratory distress in premature infant due to surfactant deficiency",
      "treatment_drugs": "Minimal handling; Supplemental oxygen; Surfactant (100mg/kg, up to 4 doses); CPAP; IV fluids; antibiotics (for suspected sepsis)"
    },
    {
      "disease": "Apnoea of prematurity",
      "symptoms": "Cessation of breathing in premature infant (<32/40 weeks)",
      "treatment_drugs": "Caffeine citrate IV (loading then maintenance); Aminophylline (loading then maintenance)"
    },
    {
      "disease": "Pneumonia (child)",
      "symptoms": "Fast breathing (age-dependent), chest indrawing, grunting, stridor, cough",
      "treatment_drugs": "Benzylpenicillin + Gentamicin (severe); Amoxicillin oral (first line); Procaine penicillin IM (alternative)"
    },
    {
      "disease": "Severe pneumonia / very severe disease (child)",
      "symptoms": "Any general danger sign (unable to drink, vomiting everything, convulsions, lethargic/unconscious) + chest indrawing or stridor",
      "treatment_drugs": "First dose benzylpenicillin + gentamicin; treat hypoglycaemia; keep warm; refer URGENTLY"
    },
    {
      "disease": "Cough / cold (non-pneumonia - child)",
      "symptoms": "Cough, nasal discharge, no fast breathing, no chest indrawing",
      "treatment_drugs": "Home care; NO antibiotics; NO antihistamines or cough mixtures; paracetamol for fever"
    },
    {
      "disease": "Wheezing (bronchiolitis/asthma - child)",
      "symptoms": "Wheeze; infant <2 months = serious illness; child >1 year may be asthma",
      "treatment_drugs": "Salbutamol nebulised or oral; Adrenaline SC (if no nebuliser); Prednisolone oral; refer if first episode or distress"
    },
    {
      "disease": "Croup (laryngotracheobronchitis)",
      "symptoms": "Stridor at rest, chest indrawing, barking cough, fever",
      "treatment_drugs": "Refer; if delay: Chloramphenicol or Ceftriaxone + Cloxacillin"
    },
    {
      "disease": "Epiglottitis",
      "symptoms": "Very ill, toxic, drooling saliva, stridor, high fever",
      "treatment_drugs": "Refer URGENTLY; DO NOT examine throat; antibiotics as for croup"
    },
    {
      "disease": "Foreign body inhalation",
      "symptoms": "Sudden choking, local wheeze, decreased air entry (age 1-2 years), may cause stridor/cough",
      "treatment_drugs": "Bronchoscopy to remove; antibiotics if secondary infection; consult cardiothoracic surgeons"
    },
    {
      "disease": "Retropharyngeal abscess",
      "symptoms": "Fever, neck stiffness, dysphagia, stridor, drooling",
      "treatment_drugs": "Surgical drainage; Cloxacillin + Gentamicin"
    },
    {
      "disease": "Lung abscess / empyema (child)",
      "symptoms": "Pus in lung/pleura, fever, cough, respiratory distress",
      "treatment_drugs": "Cloxacillin + Gentamicin; chest drain for empyema"
    },
    {
      "disease": "Diphtheria",
      "symptoms": "Sore throat, pseudomembrane, \"bull neck\", fever, toxaemia",
      "treatment_drugs": "Antitoxin; Benzylpenicillin IM"
    },
    {
      "disease": "Pertussis (whooping cough)",
      "symptoms": "Paroxysmal cough with inspiratory whoop, post-tussive vomiting, fever",
      "treatment_drugs": "Erythromycin"
    },
    {
      "disease": "Acute ear infection (otitis media - child)",
      "symptoms": "Ear pain, pus draining <14 days, fever, irritability",
      "treatment_drugs": "Amoxicillin; Paracetamol; dry ear by wicking"
    },
    {
      "disease": "Chronic ear infection (suppurative otitis media - child)",
      "symptoms": "Pus draining ≥14 days, hearing loss",
      "treatment_drugs": "Dry wicking; Quinolone drops (ciprofloxacin/norfloxacin/ofloxacin); refer if not improving"
    },
    {
      "disease": "Mastoiditis (child)",
      "symptoms": "Tender swelling behind ear, fever, anterior displacement of auricle",
      "treatment_drugs": "Benzylpenicillin + Gentamicin; Paracetamol; refer"
    },
    {
      "disease": "Streptococcal sore throat",
      "symptoms": "Tender enlarged neck lymph nodes, white exudate on tonsils, fever",
      "treatment_drugs": "Procaine penicillin then Penicillin V; or Amoxicillin; Paracetamol"
    },
    {
      "disease": "Oral candidiasis (thrush - child)",
      "symptoms": "Whitish patches or reddening of oral mucosa",
      "treatment_drugs": "Miconazole 2% gel"
    },
    {
      "disease": "Diarrhoea (child)",
      "symptoms": "Loose/watery stools, dehydration (sunken eyes, poor drinking, slow skin pinch, lethargic/unconscious)",
      "treatment_drugs": "ORS (Plan A/B/C); Zinc sulphate; Continue feeding; Ciprofloxacin or Nalidixic acid (for dysentery); Metronidazole (for amoebic dysentery)"
    },
    {
      "disease": "Persistent diarrhoea (child)",
      "symptoms": "Diarrhoea lasting >14 days, may be with or without dehydration",
      "treatment_drugs": "Refer; feeding advice (low lactose, fermented porridge); Vitamin A; Zinc"
    },
    {
      "disease": "Dysentery (bloody diarrhoea - child)",
      "symptoms": "Blood in stool, cramps, fever",
      "treatment_drugs": "Ciprofloxacin or Nalidixic acid"
    },
    {
      "disease": "Cholera (child)",
      "symptoms": "Rice-watery diarrhoea, severe dehydration, vomiting",
      "treatment_drugs": "Rehydration (IV/ORS); Ciprofloxacin or Azithromycin"
    },
    {
      "disease": "Severe acute malnutrition (SAM) - Marasmus/Kwashiorkor",
      "symptoms": "Wasting, bilateral pitting oedema, feeble suckling, hypothermia, hypoglycaemia, apathetic/lethargic",
      "treatment_drugs": "F-75 then F-100 or RUTF; Ampicillin + Gentamicin; Amoxicillin (if no complications); Vitamin A; ReSoMal; Albendazole (on discharge)"
    },
    {
      "disease": "Anaemia (child)",
      "symptoms": "Pallor, fatigue, low Hb",
      "treatment_drugs": "Albendazole (if hookworm); Ferrous sulphate"
    },
    {
      "disease": "Paediatric HIV infection",
      "symptoms": "Severe/recurrent pneumonia, generalised lymphadenopathy, hepatosplenomegaly, failure to thrive, oral candidiasis, finger clubbing",
      "treatment_drugs": "Cotrimoxazole prophylaxis; ART (per national guidelines, DTG-based for ≥20kg); management of OIs"
    },
    {
      "disease": "Lymphocytic interstitial pneumonitis (LIP)",
      "symptoms": "Respiratory symptoms in HIV+ child after first year of life",
      "treatment_drugs": "Short term steroids; antibiotics; refer; initiate ART"
    },
    {
      "disease": "Malaria (uncomplicated)",
      "symptoms": "Fever, chills, headache; confirmed by RDT or blood slide",
      "treatment_drugs": "Artemether-lumefantrine (Co-artemether) - 6-dose course over 3 days"
    },
    {
      "disease": "Malaria (uncomplicated - infants <5kg)",
      "symptoms": "Fever, confirmed malaria",
      "treatment_drugs": "Co-artemether (dispersible tablet dissolved in water)"
    },
    {
      "disease": "Malaria (uncomplicated - elimination areas)",
      "symptoms": "Confirmed malaria in low-transmission area",
      "treatment_drugs": "Artemether-lumefantrine + single low-dose Primaquine (for gametocyte clearance, if G6PD normal, >1yr, >10kg, not pregnant)"
    },
    {
      "disease": "Malaria (severe/complicated)",
      "symptoms": "Prostration, altered consciousness, convulsions, hyperpyrexia, jaundice, severe anaemia (Hb≤6g/dl), hyperparasitaemia (>5%), acute renal failure, respiratory distress, hypoglycaemia, shock, haemoglobinuria, bleeding tendencies",
      "treatment_drugs": "IV Artesunate (minimum 3 doses) then oral Co-artemether; IV Quinine (if artesunate unavailable); supportive care (oxygen, dextrose, diazepam for convulsions, transfusion)"
    },
    {
      "disease": "Malaria in pregnancy (uncomplicated - 1st trimester)",
      "symptoms": "Fever, confirmed malaria",
      "treatment_drugs": "Quinine + Clindamycin (7 days)"
    },
    {
      "disease": "Malaria in pregnancy (uncomplicated - 2nd/3rd trimester)",
      "symptoms": "Fever, confirmed malaria",
      "treatment_drugs": "Artemether-lumefantrine"
    },
    {
      "disease": "Malaria in pregnancy (severe)",
      "symptoms": "Severe malaria symptoms in pregnant woman",
      "treatment_drugs": "IV Artesunate (same as non-pregnant)"
    },
    {
      "disease": "Malaria (treatment failure)",
      "symptoms": "No response after 48hrs, or recurrence of fever + parasitaemia 7-14 days after initial treatment",
      "treatment_drugs": "Artesunate/Amodiaquine (3 days) OR Quinine + Doxycycline or Clindamycin (7 days)"
    },
    {
      "disease": "Tuberculosis (pulmonary) - drug sensitive",
      "symptoms": "Cough ≥1 week (or any duration if PLHIV), night sweats, fever, weight loss, BMI <17kg/m2, failure to thrive (children)",
      "treatment_drugs": "2HRZE / 4HR (FDC) (6 months total); 2HRZE/10HR for TB meningitis, bone, joint, pericardium, disseminated, spinal disease"
    },
    {
      "disease": "Tuberculosis (non-severe, children 3m-16y)",
      "symptoms": "Lymph node TB (peripheral, isolated) OR uncomplicated PTB (non-cavitary, <1 lobe, no miliary) OR uncomplicated pleural effusion",
      "treatment_drugs": "2HRZE / 2HR (4 months total)"
    },
    {
      "disease": "Tuberculosis (previously treated / retreatment)",
      "symptoms": "All previously treated cases of any form of TB (now same as drug-sensitive regimen)",
      "treatment_drugs": "2HRZE/4HR (same as new cases – no separate Category II)"
    },
    {
      "disease": "Tuberculosis (drug-resistant - RR/MDR)",
      "symptoms": "Resistance to rifampicin (Xpert MTB/Rif positive), may have risk factors (treatment failure, contact with DRTB, HIV, residence in high burden zone)",
      "treatment_drugs": "6-month BPaLM regimen (Bedaquiline, Pretomanid, Linezolid, Moxifloxacin)"
    },
    {
      "disease": "Tuberculosis (TB meningitis, children 3m-19y)",
      "symptoms": "Meningitis with TB aetiology",
      "treatment_drugs": "Intensive regimen of 6 months HRZ(Eto) with high-dose HR (specialist use)"
    },
    {
      "disease": "Leprosy (Paucibacillary - PB)",
      "symptoms": "1-5 skin lesions with loss of sensation, asymmetrical, one nerve trunk involved",
      "treatment_drugs": "Dapsone + Clofazimine + Rifampicin (monthly) for 6 months"
    },
    {
      "disease": "Leprosy (Multibacillary - MB)",
      "symptoms": ">5 lesions, symmetrical, many nerve trunks involved, or positive skin smear",
      "treatment_drugs": "Dapsone + Clofazimine (daily + monthly) + Rifampicin (monthly) for 12 months"
    },
    {
      "disease": "Leprosy reversal reaction (Type I)",
      "symptoms": "Swollen, red, tender skin lesions; nerve swelling/tenderness, new paralysis",
      "treatment_drugs": "Aspirin; Prednisolone (if severe or neuritis)"
    },
    {
      "disease": "Leprosy ENL reaction (Type II)",
      "symptoms": "Tender subcutaneous nodules, fever, lymphadenitis, orchitis, arthritis, neuritis, ulcerating lesions",
      "treatment_drugs": "Aspirin; Prednisolone (severe); Clofazimine (for recurrent)"
    },
    {
      "disease": "Anthrax (cutaneous)",
      "symptoms": "Itching → papule → vesicle → depressed black eschar in 2-6 days",
      "treatment_drugs": "Benzylpenicillin then Procaine penicillin (severe); Doxycycline (less severe)"
    },
    {
      "disease": "Anthrax (pulmonary)",
      "symptoms": "Severe respiratory illness, blood-stained sputum, chest pain, dyspnoea",
      "treatment_drugs": "Refer to designated Infectious Disease Hospital"
    },
    {
      "disease": "Tick typhus (African)",
      "symptoms": "Sudden headache, chills, prostration, fever, general pains; maculopapular rash day 5-7 (spares face/palms/soles); chancre at bite site",
      "treatment_drugs": "Doxycycline"
    },
    {
      "disease": "Rabies (exposure prevention)",
      "symptoms": "Bite from suspect animal (categories II and III exposure)",
      "treatment_drugs": "Thorough wound cleaning (povidone-iodine/soap); Rabies vaccine (ID or IM schedule); Human Rabies Immunoglobulin (RIG) for category III"
    },
    {
      "disease": "Bilharzia (Schistosoma haematobium)",
      "symptoms": "Visible haematuria, positive urine dipstick for blood/protein (in children/adolescents at primary care)",
      "treatment_drugs": "Praziquantel 40mg/kg single dose"
    },
    {
      "disease": "Bilharzia (Schistosoma mansoni)",
      "symptoms": "Unexplained iron deficiency anaemia, hepatosplenomegaly, non-resolving chronic salmonella infections; dysentery-like symptoms",
      "treatment_drugs": "Praziquantel 40mg/kg once daily, repeat at 4 weeks"
    },
    {
      "disease": "Katayama syndrome",
      "symptoms": "Fever, acute serum sickness, severe immunological reaction to recent heavy schistosoma infection",
      "treatment_drugs": "Praziquantel + Prednisolone"
    },
    {
      "disease": "Helminthiasis (roundworms, hookworms, pinworms)",
      "symptoms": "Abdominal pain, anal itching (pinworm), anaemia (hookworm)",
      "treatment_drugs": "Albendazole single dose"
    },
    {
      "disease": "Helminthiasis (tapeworm, strongyloides)",
      "symptoms": "Abdominal symptoms, possible visible segments in stool",
      "treatment_drugs": "Albendazole once daily for 3 days; repeat course if not cured after 3 weeks"
    },
    {
      "disease": "Cutaneous larva migrans (\"sandworm\")",
      "symptoms": "Serpiginous, itchy, raised skin tracks (creeping eruption)",
      "treatment_drugs": "Albendazole once daily for 7 days"
    },
    {
      "disease": "Cysticercosis / Neurocysticercosis",
      "symptoms": "Focal seizures without fever, typical CT scan appearance, may have drowsiness or focal signs",
      "treatment_drugs": "Praziquantel + Prednisolone (specialist inpatient treatment)"
    },
    {
      "disease": "Hydatid disease",
      "symptoms": "Cysts in liver/lungs (serological confirmation required)",
      "treatment_drugs": "Albendazole (cycled 30 days on/15 days off x 4 cycles); Surgery is treatment of choice"
    },
    {
      "disease": "Lymphatic filariasis (elephantiasis)",
      "symptoms": "Hydrocoele, lymphoedema, elephantiasis, chyluria; acute: fever, lymphangitis, epididymo-orchitis",
      "treatment_drugs": "Diethylcarbamazine (DEC) + Albendazole (single dose); specialist management for chronic stage"
    },
    {
      "disease": "Plague (bubonic)",
      "symptoms": "Rapid onset fever, chills, severe headache, prostration, extremely painful swollen lymph nodes; or pneumonic: cough with blood-stained sputum, chest pain, dyspnoea",
      "treatment_drugs": "Streptomycin or Chloramphenicol"
    },
    {
      "disease": "Human African Trypanosomiasis (HAT) - rhodesiense",
      "symptoms": "Acute haemolymphatic: fever, headache, joint pains, pruritis, eschar, lymphadenopathy. Neurological: sleep disturbance, confusion, behavioural changes",
      "treatment_drugs": "Fexinidazole (for both stages, age ≥6, weight ≥20kg); Suramin (first stage, <6y or <20kg); Melarsoprol (second stage, <6y or <20kg)"
    },
    {
      "disease": "Typhoid fever (uncomplicated, fully sensitive)",
      "symptoms": "Gradual onset of persistently high fever, chills, malaise, headache, sore throat, cough, abdominal pain, constipation or diarrhoea",
      "treatment_drugs": "Ciprofloxacin or Norfloxacin"
    },
    {
      "disease": "Typhoid fever (uncomplicated, multidrug resistant)",
      "symptoms": "Similar symptoms, not responding to first-line",
      "treatment_drugs": "Azithromycin or Cefixime"
    },
    {
      "disease": "Typhoid fever (complicated, fully sensitive)",
      "symptoms": "Severe illness with complications (intestinal haemorrhage, perforation)",
      "treatment_drugs": "Ciprofloxacin or Norfloxacin"
    },
    {
      "disease": "Typhoid fever (complicated, multidrug resistant)",
      "symptoms": "Severe illness, not responding",
      "treatment_drugs": "Azithromycin or Cefixime or Ceftriaxone IV"
    },
    {
      "disease": "Typhoid carrier state",
      "symptoms": "Asymptomatic, positive stool/rectal culture >1 year after recovery",
      "treatment_drugs": "Ciprofloxacin (4 weeks); Cholecystectomy if lithiasis; treat schistosomiasis if present"
    },
    {
      "disease": "Urethral discharge (male)",
      "symptoms": "Urethral discharge, dysuria",
      "treatment_drugs": "Ceftriaxone 1g IM (single dose) + Doxycycline or Azithromycin"
    },
    {
      "disease": "Urethral discharge (persistent/recurrent)",
      "symptoms": "Symptoms persist 7 days after treatment (exclude reinfection/non-compliance)",
      "treatment_drugs": "Cefixime or Ceftriaxone + Azithromycin + Metronidazole; consider Mycoplasma genitalium"
    },
    {
      "disease": "Vaginal discharge (abnormal - candida)",
      "symptoms": "Curd-like discharge, vulval redness and itching",
      "treatment_drugs": "Miconazole or Clotrimazole or Nystatin pessary/cream"
    },
    {
      "disease": "Vaginal discharge (abnormal - BV/trichomonas)",
      "symptoms": "Abnormal discharge not consistent with candida (fishy odour, frothy)",
      "treatment_drugs": "Metronidazole or Tinidazole"
    },
    {
      "disease": "Vaginal discharge (with cervical infection)",
      "symptoms": "Abnormal discharge + partner has urethral discharge OR mucopurulent cervicitis / easy bleeding on examination",
      "treatment_drugs": "Ceftriaxone IM + Doxycycline or Azithromycin (added to BV/trichomonas treatment)"
    },
    {
      "disease": "Anal and rectal infections (proctitis, proctocolitis)",
      "symptoms": "Anorectal pain, itching, discharge, bleeding, rectal fullness, tenesmus, constipation, mucus in stool; often asymptomatic",
      "treatment_drugs": "Treat according to suspected pathogen: Ceftriaxone + Doxycycline for gonorrhoea/chlamydia; Acyclovir for HSV; Benzathine penicillin for syphilis"
    },
    {
      "disease": "Genital ulcer disease (including herpes, syphilis, chancroid)",
      "symptoms": "Genital ulcers, may have buboes; recurrent vesicular lesions (herpes)",
      "treatment_drugs": "Benzathine penicillin (single dose) + Ciprofloxacin + Acyclovir (10 days for primary herpes)"
    },
    {
      "disease": "Granuloma inguinale (Donovanosis)",
      "symptoms": "Granulating ulcers without buboes",
      "treatment_drugs": "Azithromycin or Doxycycline or Erythromycin"
    },
    {
      "disease": "Lymphogranuloma venereum (LGV)",
      "symptoms": "Buboes without ulcers (penile/vulval lymphoedema, inguinal buboes); may have anal discharge",
      "treatment_drugs": "Doxycycline or Erythromycin"
    },
    {
      "disease": "Acute epididymo-orchitis",
      "symptoms": "Acute scrotal swelling, pain (exclude torsion, hernia)",
      "treatment_drugs": "Ceftriaxone IM + Doxycycline or Erythromycin"
    },
    {
      "disease": "Syphilis (early - primary, secondary, latent <2yrs)",
      "symptoms": "Chancre, rash, mucous patches, condylomata lata, asymptomatic latent",
      "treatment_drugs": "Benzathine penicillin (single dose) or Doxycycline/Erythromycin"
    },
    {
      "disease": "Syphilis (late - latent >2yrs, cardiovascular, gummatous)",
      "symptoms": "Asymptomatic latent, CVS changes, gummas",
      "treatment_drugs": "Benzathine penicillin weekly x 3 doses or Doxycycline/Erythromycin"
    },
    {
      "disease": "Neurosyphilis",
      "symptoms": "Neurological symptoms (tabes dorsalis, general paresis, etc.)",
      "treatment_drugs": "Benzylpenicillin IV or Procaine penicillin or Doxycycline or Erythromycin + Prednisolone"
    },
    {
      "disease": "Syphilis in pregnancy",
      "symptoms": "Positive serology in pregnant woman",
      "treatment_drugs": "Benzathine penicillin (3 doses weekly); treat partner"
    },
    {
      "disease": "Congenital syphilis (infant born to treated mother)",
      "symptoms": "Infant born to mother with syphilis (even if mother treated)",
      "treatment_drugs": "Benzathine penicillin single dose"
    },
    {
      "disease": "Genital warts (Condylomata acuminata - external)",
      "symptoms": "External, perianal wart-like growths",
      "treatment_drugs": "Podophyllotoxin 0.5% (self-applied) or Podophyllin paint (clinic-applied) or Imiquimod cream or Trichloroacetic acid"
    },
    {
      "disease": "Genital warts (cervical, urethral, rectal, vaginal)",
      "symptoms": "Internal warts",
      "treatment_drugs": "Cryotherapy, electro-cautery, or surgical excision (NO podophyllin)"
    },
    {
      "disease": "Molluscum contagiosum",
      "symptoms": "Small, dome-shaped, umbilicated papules",
      "treatment_drugs": "Lesion pricking/expression; cryotherapy; (if extensive, suspect HIV and refer)"
    },
    {
      "disease": "Pediculosis pubis (pubic lice)",
      "symptoms": "Itching in pubic area, visible lice/nits",
      "treatment_drugs": "Permethrin 5% cream or Benzyl benzoate 25% emulsion or Gamma benzene hexachloride 1% lotion"
    },
    {
      "disease": "Persistent generalised lymphadenopathy (PGL)",
      "symptoms": "Lymph nodes >1.5cm in ≥2 areas, persisting ≥1 month, no other cause",
      "treatment_drugs": "No specific treatment; exclude TB, Kaposi's, lymphoma, syphilis; ART"
    },
    {
      "disease": "Oral candidiasis (thrush - HIV)",
      "symptoms": "Whitish patches, reddening, angular cheilitis",
      "treatment_drugs": "Nystatin suspension/lozenges or Miconazole oral gel"
    },
    {
      "disease": "Oesophageal candidiasis",
      "symptoms": "Odynophagia (pain on swallowing), chest pain, difficulty swallowing",
      "treatment_drugs": "Fluconazole (systemic); ART referral; cotrimoxazole prophylaxis"
    },
    {
      "disease": "HIV-related acute diarrhoea",
      "symptoms": "≥3 liquid stools daily for 2-14 days",
      "treatment_drugs": "Rehydration; Ciprofloxacin + Ceftriaxone (if severe/toxic); Ciprofloxacin (if bloody)"
    },
    {
      "disease": "HIV-related chronic diarrhoea",
      "symptoms": "≥3 liquid stools daily for >1 month, continuous or episodic",
      "treatment_drugs": "Rehydration, nutrition; Loperamide or Codeine (if disabling); Ciprofloxacin + Ceftriaxone if fever/bloody; refer if weight loss"
    },
    {
      "disease": "HIV-related wasting syndrome (Slim disease)",
      "symptoms": "Weight loss >10% + unexplained chronic diarrhoea >1 month OR unexplained prolonged fever >1 month",
      "treatment_drugs": "High calorie/protein diet; Nicotinamide + Pyridoxine + Thiamine; treat underlying conditions (especially TB); ART"
    },
    {
      "disease": "Advanced HIV Disease (AHD)",
      "symptoms": "WHO stage 3/4 or CD4 ≤200 cells/mm³ (age ≥5); all children <5 years",
      "treatment_drugs": "Screen for TB (symptom screen, CXR, LF-LAM), cryptococcal antigen (if CD4<200), malnutrition; Treat OIs; Optimize ART; Prevent with cotrimoxazole, TPT, fluconazole pre-emptive therapy, vaccines"
    },
    {
      "disease": "Pneumocystis jiroveci pneumonia (PCP)",
      "symptoms": "Progressive shortness of breath (exertion early), cyanosis, dry cough, few chest signs, bilateral interstitial infiltrates on CXR",
      "treatment_drugs": "High-dose Cotrimoxazole (21 days); Prednisolone (if hypoxic/tachypnoeic); Clindamycin + Primaquine (sulpha allergy)"
    },
    {
      "disease": "Cryptococcal meningitis (CM)",
      "symptoms": "Subacute headache, fever, neck stiffness, photophobia, confusion, nausea/vomiting, visual/hearing changes, seizures, focal neurology (raised ICP)",
      "treatment_drugs": "Liposomal Amphotericin B single dose + Flucytosine + Fluconazole (2 weeks induction); then Fluconazole (8 weeks consolidation); then Fluconazole maintenance (until CD4>100 and VL<1000 for 6 months)"
    },
    {
      "disease": "HIV-associated dementia",
      "symptoms": "Progressive cognitive impairment, behavioural changes, motor abnormalities",
      "treatment_drugs": "ART; supportive care; treat psychotic/depressive features"
    },
    {
      "disease": "HIV-related skin conditions",
      "symptoms": "Photosensitivity, hyperpigmentation, various rashes",
      "treatment_drugs": "Sun protection; treat specific infections (see skin section); ART"
    },
    {
      "disease": "Herpes zoster (shingles)",
      "symptoms": "Unilateral vesicular rash in dermatome, severe pain (start antivirals within 72hrs)",
      "treatment_drugs": "Acyclovir or Valacyclovir; Paracetamol or Ibuprofen; Calamine lotion; Amitriptyline (for post-herpetic neuralgia)"
    },
    {
      "disease": "Post-herpetic neuralgia",
      "symptoms": "Pain persisting >3 months after rash resolves",
      "treatment_drugs": "Amitriptyline or Carbamazepine"
    },
    {
      "disease": "Herpes simplex (severe/recurrent HIV-related)",
      "symptoms": "Extensive, persistent, erosive mucocutaneous lesions",
      "treatment_drugs": "Acyclovir or Valacyclovir (episodic or suppressive)"
    },
    {
      "disease": "Seborrhoeic dermatitis",
      "symptoms": "Greasy, scaly, erythematous patches on scalp (dandruff), eyebrows, nasolabial folds, ears, sternal area, axillae, groin",
      "treatment_drugs": "Topical hydrocortisone 1% + miconazole cream 2%; Ketoconazole shampoo (scalp)"
    },
    {
      "disease": "Pruritic papular eruption (PPE)",
      "symptoms": "Very itchy, symmetrical, discrete scratched pimples/bumps on extremities and trunk (spares face, mucous membranes, palms, webs)",
      "treatment_drugs": "Medium-to-high potency topical steroids + emollients; Oral antihistamines (chlorpheniramine, promethazine); Calamine lotion"
    },
    {
      "disease": "Kaposi's sarcoma (KS)",
      "symptoms": "Purple nodules/lesions (skin, oral palate, internal organs including pulmonary); may be limited or extensive",
      "treatment_drugs": "ART; chemotherapy (if high tumour burden); biopsy for diagnosis"
    },
    {
      "disease": "HIV-associated cancers (AIDS-defining & non-AIDS-defining)",
      "symptoms": "KS, cervical cancer, non-Hodgkin lymphoma (NHL), Hodgkin lymphoma (HL), squamous cell conjunctival carcinoma, lung, breast, prostate, anogenital, colorectal cancers",
      "treatment_drugs": "ART (continue during cancer treatment, avoid zidovudine); chemotherapy/surgery/radiotherapy (specialist)"
    },
    {
      "disease": "Common cold / influenza / acute bronchitis (adult)",
      "symptoms": "Cough, nasal congestion, fever, malaise (usually viral)",
      "treatment_drugs": "No antibiotics; symptomatic treatment (rest, hydration, fever reducers)"
    },
    {
      "disease": "Pneumonia (segmental/lobar – adult)",
      "symptoms": "Fever, productive cough, pleuritic chest pain, respiratory distress, confusion (CURB-65 criteria), hypotension",
      "treatment_drugs": "Benzylpenicillin IV/IM or Ceftriaxone IV ± Erythromycin; switch to oral amoxicillin; admit if CURB-65 ≥1"
    },
    {
      "disease": "Staphylococcal pneumonia",
      "symptoms": "Severe pneumonia, often with empyema, high fever",
      "treatment_drugs": "Cloxacillin IV or Clindamycin IV (at least 7 days then consider oral)"
    },
    {
      "disease": "Klebsiella / gram-negative pneumonia",
      "symptoms": "Severe pneumonia in debilitated patients, not responding to first-line",
      "treatment_drugs": "Gentamicin + Ceftriaxone (or based on culture)"
    },
    {
      "disease": "Lung abscess",
      "symptoms": "Putrid sputum, fever, weight loss, postural drainage",
      "treatment_drugs": "Benzylpenicillin + Metronidazole (4-8 weeks) or Amoxicillin-clavulanic acid; repeat CXR at 6 weeks"
    },
    {
      "disease": "Empyema (adult)",
      "symptoms": "Pus in pleural space, fever, chest pain, respiratory distress",
      "treatment_drugs": "Chest drain; Benzylpenicillin + Metronidazole; Cloxacillin if staphylococcal suspected"
    },
    {
      "disease": "Hospital-acquired (nosocomial) pneumonia",
      "symptoms": "Pneumonia presenting ≥48 hours after admission",
      "treatment_drugs": "Amoxicillin-clavulanic acid IV or Gentamicin + Benzylpenicillin"
    },
    {
      "disease": "Chronic Obstructive Pulmonary Disease (COPD) exacerbation",
      "symptoms": "Increased dyspnoea, cough, purulent sputum, fever, new infiltrates",
      "treatment_drugs": "Amoxicillin or Doxycycline; Salbutamol +/- Ipratropium (nebulised/inhaler); Prednisolone (30mg daily for 5 days); controlled oxygen (SpO2 88-92%)"
    },
    {
      "disease": "Stable COPD",
      "symptoms": "Chronic dyspnoea, cough, limited activity, frequent exacerbations",
      "treatment_drugs": "Salbutamol PRN; add Ipratropium or ICS/LABA (Formoterol/Budesonide or Salmeterol/Fluticasone) if frequent exacerbations; pulmonary rehab; vaccines"
    },
    {
      "disease": "Bronchiectasis (non-CF)",
      "symptoms": "Chronic cough with copious purulent sputum, recurrent infections, haemoptysis",
      "treatment_drugs": "Antibiotics for exacerbations (broad spectrum based on sputum culture); postural drainage; annual flu vaccine; pneumococcal vaccine; inhaled bronchodilators"
    },
    {
      "disease": "Asthma (mild intermittent - GINA Step 1/2)",
      "symptoms": "Occasional symptoms (once in 3-4 months)",
      "treatment_drugs": "Low-dose ICS-formoterol as needed (preferred) OR Salbutamol + additional puff of ICS (e.g., beclomethasone) whenever salbutamol used"
    },
    {
      "disease": "Asthma (mild chronic - GINA Step 2)",
      "symptoms": "Daytime symptoms >2/week but not daily",
      "treatment_drugs": "Low-dose ICS (beclomethasone/budesonide) daily + Salbutamol + additional ICS puff whenever salbutamol used"
    },
    {
      "disease": "Asthma (moderate chronic - GINA Step 3)",
      "symptoms": "Daily symptoms, exacerbations >1/year",
      "treatment_drugs": "Medium-dose ICS (beclomethasone) daily + Salbutamol + additional ICS puff OR ICS/LABA (budesonide-formoterol) as maintenance and reliever"
    },
    {
      "disease": "Asthma (severe chronic - GINA Step 4/5)",
      "symptoms": "Persistent symptoms despite moderate therapy",
      "treatment_drugs": "High-dose ICS/LABA (budesonide-formoterol or salmeterol/fluticasone) as maintenance and reliever; consider low-dose prednisolone; add Theophylline SR (alternative)"
    },
    {
      "disease": "Acute asthma attack (adult)",
      "symptoms": "Progressive dyspnoea, wheeze, use of accessory muscles, pulsus paradoxus, PEF <50% predicted",
      "treatment_drugs": "Nebulised Salbutamol + Ipratropium; Oxygen (6L/min); Prednisolone 40mg daily (5 days); Adrenaline SC (if no nebuliser); severe: Hydrocortisone IV, Magnesium sulphate IV; ICU if tiring/confused/rising pCO2"
    },
    {
      "disease": "Acute asthma attack (child)",
      "symptoms": "Similar to adults; <5yrs: 2.5mg salbutamol, >5yrs: 5mg salbutamol",
      "treatment_drugs": "Nebulised Salbutamol; Oxygen; Prednisolone (1-2mg/kg for 3-5 days); Adrenaline SC if poor response; severe: Hydrocortisone IV then prednisolone"
    },
    {
      "disease": "Hypertension (essential)",
      "symptoms": "Asymptomatic; high BP readings (systolic ≥140 or diastolic ≥90)",
      "treatment_drugs": "First-line combination: Thiazide (HCT) + CCB (Amlodipine/Nifedipine) OR CCB + ACEi/ARB OR Thiazide + ACEi/ARB; add statin for high CV risk; antiplatelet for secondary prevention"
    },
    {
      "disease": "Severe hypertension (diastolic >120mmHg with emergency features)",
      "symptoms": "Hypertensive encephalopathy, LV failure/pulmonary oedema, aortic dissection, severe pre-eclampsia",
      "treatment_drugs": "Labetalol IV or Nicardipine IV infusion or Dihydralazine IV/IM; frequent BP monitoring"
    },
    {
      "disease": "Cardiac failure (heart failure with reduced ejection fraction - HFrEF)",
      "symptoms": "Shortness of breath (exertion/rest), ankle swelling, ascites, fatigue, elevated JVP",
      "treatment_drugs": "Frusemide + ACEi/ARB (Enalapril/Losartan) or ARNI (Sacubitril/Valsartan) + Beta-blocker (Carvedilol/Bisoprolol/Metoprolol succinate) + MRA (Spironolactone) + SGLT2i (Dapagliflozin); Digoxin if persistent symptoms/atrial fibrillation"
    },
    {
      "disease": "Acute pulmonary oedema",
      "symptoms": "Severe dyspnoea, orthopnoea, pink frothy sputum, crackles, hypoxia",
      "treatment_drugs": "Prop up; High-flow oxygen; Morphine IV; Metoclopramide (for vomiting); Frusemide IV"
    },
    {
      "disease": "Angina pectoris (stable)",
      "symptoms": "Chest pain/pressure on exertion, relieved by rest/GTN",
      "treatment_drugs": "Aspirin + Atorvastatin/Rosuvastatin + Glyceryl trinitrate SL (PRN)"
    },
    {
      "disease": "Angina (frequent attacks)",
      "symptoms": "More frequent angina episodes",
      "treatment_drugs": "Aspirin + Isosorbide dinitrate + Atenolol +/– Amlodipine/Nifedipine"
    },
    {
      "disease": "Unstable angina",
      "symptoms": "Angina at rest or minimal exertion, new onset severe",
      "treatment_drugs": "Admit; Aspirin + Heparin + Atenolol + Nifedipine/Amlodipine + Isosorbide dinitrate/GTN IV + Atorvastatin/Rosuvastatin"
    },
    {
      "disease": "Acute myocardial infarction (STEMI)",
      "symptoms": "Chest pain, dyspnoea, nausea, anxiety, ECG changes (ST elevation)",
      "treatment_drugs": "Aspirin (300mg then 75-150mg) + Clopidogrel (300mg then 75mg) + Morphine IV + Atenolol + Enalapril/Lisinopril + Atorvastatin/Rosuvastatin; Thrombolysis (Streptokinase) if <12 hours"
    },
    {
      "disease": "Arrhythmias (post-MI)",
      "symptoms": "Ectopic beats, atrial fibrillation, atrial flutter, SVT, VT",
      "treatment_drugs": "Atenolol; Verapamil (SVT); Digoxin (AF/flutter); Amiodarone or Lignocaine (VT); DC cardioversion if unstable"
    },
    {
      "disease": "Atrial fibrillation (non-valvular)",
      "symptoms": "Irregularly irregular pulse, palpitations, dyspnoea, fatigue, risk of stroke",
      "treatment_drugs": "Rate control: Atenolol/Bisoprolol/Verapamil ± Digoxin; Anticoagulation: Warfarin (target INR 2-3) or Rivaroxaban or Apixaban (based on CHA2DS2-VASc score)"
    },
    {
      "disease": "Native valve endocarditis",
      "symptoms": "Fever, heart murmur, splinter haemorrhages, positive blood cultures (≥3 sets)",
      "treatment_drugs": "Benzylpenicillin or Ceftriaxone + Gentamicin (4-6 weeks)"
    },
    {
      "disease": "Prosthetic valve endocarditis",
      "symptoms": "Fever, heart murmur, signs of systemic infection",
      "treatment_drugs": "Cloxacillin + Gentamicin (4-6 weeks)"
    },
    {
      "disease": "Rheumatic fever (acute)",
      "symptoms": "Fever, migratory polyarthritis, carditis, chorea, erythema marginatum, subcutaneous nodules",
      "treatment_drugs": "Benzathine penicillin or Amoxicillin or Erythromycin (single dose) + Aspirin (arthritis); Prednisolone (severe carditis)"
    },
    {
      "disease": "Rheumatic chorea",
      "symptoms": "Involuntary jerky movements, muscle weakness, emotional lability",
      "treatment_drugs": "Haloperidol or Sodium valproate"
    },
    {
      "disease": "Rheumatic heart disease (prophylaxis)",
      "symptoms": "History of rheumatic fever or rheumatic heart valve lesions",
      "treatment_drugs": "Benzathine penicillin monthly (or Amoxicillin/Erythromycin daily) – lifelong if significant murmurs at age 21"
    },
    {
      "disease": "Gastro-oesophageal reflux disease (GERD)",
      "symptoms": "Heartburn, acid regurgitation, odynophagia, hoarse voice, cough",
      "treatment_drugs": "Lifestyle measures; Magnesium trisilicate + aluminium hydroxide (mild); Omeprazole (moderate/severe); Ranitidine (if no response to omeprazole)"
    },
    {
      "disease": "Dyspepsia (functional/non-ulcer)",
      "symptoms": "Chronic upper abdominal pain, postprandial fullness, early satiety, bloating, nausea",
      "treatment_drugs": "Test and treat H. pylori; PPI trial (6 weeks); Hyoscine; Metoclopramide; refer if alarm features (bleeding, weight loss, dysphagia, vomiting, mass)"
    },
    {
      "disease": "Peptic ulcer disease (H. pylori-associated)",
      "symptoms": "Epigastric pain (burning, gnawing), bloating, nausea",
      "treatment_drugs": "H. pylori eradication: Amoxicillin + Clarithromycin + Omeprazole (2 weeks) OR Amoxicillin + Metronidazole + Omeprazole (if clarithromycin unsuitable)"
    },
    {
      "disease": "NSAID-associated ulcer",
      "symptoms": "Gastric/duodenal ulcer in NSAID user (withdrawal of NSAID)",
      "treatment_drugs": "Withdraw NSAID; Omeprazole (4 weeks)"
    },
    {
      "disease": "Acute gastro-enteritis (food poisoning)",
      "symptoms": "Acute diarrhoea ± vomiting, dehydration",
      "treatment_drugs": "Rehydration (oral/IV); Prochlorperazine or Metoclopramide (antiemetics, adults only); Codeine or Loperamide (antidiarrhoeal, NOT in children)"
    },
    {
      "disease": "Bacillary dysentery (bloody diarrhoea)",
      "symptoms": "Bloody diarrhoea, fever, abdominal cramps",
      "treatment_drugs": "Ciprofloxacin or Ceftriaxone; avoid antimotility drugs"
    },
    {
      "disease": "Cholera",
      "symptoms": "Rice-watery diarrhoea, severe dehydration, vomiting",
      "treatment_drugs": "Rehydration (IV Ringer's lactate/ORS); Antibiotics: Ciprofloxacin or Azithromycin (after rehydration)"
    },
    {
      "disease": "Amoebic dysentery",
      "symptoms": "Bloody diarrhoea, abdominal pain, tenesmus",
      "treatment_drugs": "Metronidazole"
    },
    {
      "disease": "Pyogenic liver abscess",
      "symptoms": "Right upper quadrant pain, fever, hepatomegaly",
      "treatment_drugs": "Metronidazole + Ampicillin or Ceftriaxone or Ciprofloxacin; +/- drainage"
    },
    {
      "disease": "Amoebic liver abscess",
      "symptoms": "Right upper quadrant pain, fever, hepatomegaly",
      "treatment_drugs": "Metronidazole"
    },
    {
      "disease": "Irritable bowel syndrome (IBS)",
      "symptoms": "Abdominal pain, diarrhoea and/or constipation, no weight loss, normal labs",
      "treatment_drugs": "Reassurance; Loperamide (diarrhoea); Laxatives (constipation); Antispasmodics; low dose amitriptyline (pain)"
    },
    {
      "disease": "Constipation",
      "symptoms": "Infrequent hard stools, straining, sensation of incomplete evacuation",
      "treatment_drugs": "Lifestyle/dietary measures; Glycerine suppository; Liquid paraffin; Bisacodyl"
    },
    {
      "disease": "Pernicious anaemia (Vitamin B12 deficiency)",
      "symptoms": "Macrocytic anaemia, neurological symptoms (paraesthesia, weakness, ataxia)",
      "treatment_drugs": "Vitamin B12 injections (hydroxocobalamin) lifelong"
    },
    {
      "disease": "Giardiasis",
      "symptoms": "Diarrhoea, abdominal cramps, bloating, foul-smelling stools",
      "treatment_drugs": "Metronidazole"
    },
    {
      "disease": "Malabsorption syndromes",
      "symptoms": "Diarrhoea, weight loss, nutritional deficiencies (lactase deficiency, coeliac, pancreatic insufficiency)",
      "treatment_drugs": "Specialist referral; treat specific cause"
    },
    {
      "disease": "Chronic pancreatitis",
      "symptoms": "Epigastric pain radiating to back, malabsorption, diabetes, history of alcohol/gallstones",
      "treatment_drugs": "Pain control (opiates); Pancreatic enzyme supplements; Acid suppression; stop alcohol; refer"
    },
    {
      "disease": "Peritonitis",
      "symptoms": "Severe abdominal pain, tenderness, guarding, rigidity, fever",
      "treatment_drugs": "Ampicillin + Gentamicin + Metronidazole (IV); surgical evaluation"
    },
    {
      "disease": "Haemorrhoids",
      "symptoms": "Perianal pain, bleeding with defecation, itching, discomfort",
      "treatment_drugs": "High fibre, fluids; Benzyl benzoate with 0.25% hydrocortisone ointment; saline baths"
    },
    {
      "disease": "Acute liver failure / Hepatic encephalopathy",
      "symptoms": "Confusion, disorientation, asterixis, jaundice, altered consciousness (delirium)",
      "treatment_drugs": "Identify/eliminate precipitant (bleeding, infection, electrolytes); Lactulose; Magnesium trisilicate; Vitamin K; treat infection; thiamine if alcohol aetiology"
    },
    {
      "disease": "Bleeding oesophageal varices",
      "symptoms": "Haematemesis, melaena, signs of chronic liver disease",
      "treatment_drugs": "IV access, transfusion; Ceftriaxone; Diazepam (sedation); Propranolol prophylaxis; refer for endoscopy"
    },
    {
      "disease": "Ascites (chronic liver failure)",
      "symptoms": "Abdominal distension, shifting dullness, peripheral oedema",
      "treatment_drugs": "Salt/fluid restriction; Spironolactone; Frusemide (if spironolactone fails); diagnostic paracentesis"
    },
    {
      "disease": "Spontaneous bacterial peritonitis (SBP)",
      "symptoms": "Ascites with polymorph count >250 cells/µL, abdominal pain, fever, worsening encephalopathy",
      "treatment_drugs": "IV Ceftriaxone or oral Ciprofloxacin"
    },
    {
      "disease": "Cystitis (UTI - adult)",
      "symptoms": "Dysuria, frequency, urgency, suprapubic pain, cloudy urine",
      "treatment_drugs": "Nitrofurantoin (100mg BD for 3 days) or Amoxicillin"
    },
    {
      "disease": "Acute pyelonephritis (adult - mild)",
      "symptoms": "UTI symptoms + nausea, vomiting, fever, rigors, loin pain",
      "treatment_drugs": "Amoxicillin-clavulanic acid (2 weeks)"
    },
    {
      "disease": "Acute pyelonephritis (adult - severe)",
      "symptoms": "As above, acutely ill, unable to take oral",
      "treatment_drugs": "Ceftriaxone IV or Gentamicin IV (then switch to oral)"
    },
    {
      "disease": "UTI in children (<3 months)",
      "symptoms": "Fever, specific urinary symptoms, or non-specific symptoms at high risk of serious illness",
      "treatment_drugs": "Ceftriaxone IV for at least 3 days then oral amoxicillin-clavulanic acid (total 2 weeks)"
    },
    {
      "disease": "UTI in children (>3 months, upper tract/pyelonephritis)",
      "symptoms": "Fever ≥38°C + bacteriuria (or loin pain/tenderness)",
      "treatment_drugs": "Amoxicillin-clavulanic acid or Cefuroxime po (7-10 days); if vomiting: Ceftriaxone IV then oral"
    },
    {
      "disease": "UTI in children (>3 months, lower tract/cystitis)",
      "symptoms": "Bacteriuria, no systemic features",
      "treatment_drugs": "Oral antibiotics for 3 days"
    },
    {
      "disease": "Acute kidney injury (AKI)",
      "symptoms": "Oliguria, fluid overload, uraemia, history of hypovolaemia/hypotension, sepsis, nephrotoxins",
      "treatment_drugs": "Fluid challenge (Ringer's lactate or 0.9% NaCl); Frusemide (if euvolemic); treat hyperkalaemia (calcium gluconate, insulin+glucose, salbutamol nebulised, calcium resonium enema); refer/dialyse if deteriorating"
    },
    {
      "disease": "Acute nephritic syndrome (post-infectious)",
      "symptoms": "Facial/generalised oedema, oliguria, hypertension, haematuria, proteinuria",
      "treatment_drugs": "Frusemide; Amoxicillin (if post-streptococcal); treat hypertension; refer if renal function deteriorating"
    },
    {
      "disease": "Rapidly progressive glomerulonephritis (RPGN)",
      "symptoms": "Rapid decrease in GFR (≥50% over days to 3 months) + features of glomerulonephritis (oedema, haematuria, oliguria, hypertension) – RENAL EMERGENCY",
      "treatment_drugs": "Methylprednisolone IV (3 days) then Prednisolone (2 weeks) + Calcium + Vitamin D + Omeprazole; URGENT referral"
    },
    {
      "disease": "Nephrotic syndrome (adult)",
      "symptoms": "Generalised oedema, hypoalbuminaemia, proteinuria (>3g/day), hyperlipidaemia",
      "treatment_drugs": "Frusemide; Prednisolone (2 months, then taper); Enalapril (for proteinuria); Heparin (if immobile); refer if no response in 2 weeks"
    },
    {
      "disease": "Nephrotic syndrome (child, first episode >3 months)",
      "symptoms": "Oedema, hypoalbuminaemia (<2.5g/dl), nephrotic range proteinuria (dipstick 3+/4+ or UPCR >2mg/mg)",
      "treatment_drugs": "Prednisolone (2mg/kg/day for 4-6 weeks, then 1.5mg/kg alternate days for 4-6 weeks) + Calcium + Vitamin D + Omeprazole; Frusemide for severe oedema"
    },
    {
      "disease": "Nephrotic syndrome (child <3 months)",
      "symptoms": "As above in infant",
      "treatment_drugs": "Refer to nephrologist"
    },
    {
      "disease": "End stage renal disease (ESRD)",
      "symptoms": "GFR <15ml/min, needing chronic dialysis",
      "treatment_drugs": "Chronic dialysis (haemodialysis/peritoneal dialysis) after careful selection; no renal transplantation in Zimbabwe"
    },
    {
      "disease": "Septic arthritis",
      "symptoms": "Hot, swollen, painful joint, fever, reduced range of motion, acute onset",
      "treatment_drugs": "Surgical drainage; Cloxacillin IV or Clindamycin IV or Vancomycin (4-6 weeks)"
    },
    {
      "disease": "Acute osteomyelitis",
      "symptoms": "Bone pain, fever, tenderness, swelling, overlying erythema",
      "treatment_drugs": "Cloxacillin or Clindamycin IV (4-6 weeks); switch to oral when improved"
    },
    {
      "disease": "Chronic osteomyelitis",
      "symptoms": "Persistent bone pain, sinus tract, recurrent infection",
      "treatment_drugs": "Surgery (antibiotics alone not recommended)"
    },
    {
      "disease": "Compound fracture",
      "symptoms": "Fracture with skin breach, risk of infection",
      "treatment_drugs": "Careful debridement; Cloxacillin or Clindamycin IV (5 days)"
    },
    {
      "disease": "Simple fracture",
      "symptoms": "Pain, swelling, deformity, loss of function",
      "treatment_drugs": "Pain relief (analgesics); splinting/reduction; nil by mouth if surgery planned"
    },
    {
      "disease": "Back and neck pain (non-specific)",
      "symptoms": "Pain localised to spine ± radiation (exclude fracture, neurology, infection)",
      "treatment_drugs": "Aspirin, Paracetamol, Ibuprofen, or Diclofenac (acute); lowest effective dose (chronic)"
    },
    {
      "disease": "Gout (acute)",
      "symptoms": "Sudden severe joint pain (often 1st MTP), redness, swelling, warmth",
      "treatment_drugs": "Diclofenac or Prednisolone or Colchicine (DO NOT start allopurinol during acute attack)"
    },
    {
      "disease": "Gout (chronic)",
      "symptoms": "Tophi, recurrent attacks (>2/year), hyperuricaemia, kidney stones, CKD",
      "treatment_drugs": "Allopurinol (start 100mg daily, increase by 100mg every 2 weeks to 300mg) + concurrent NSAID/colchicine for first 3 months"
    },
    {
      "disease": "Rheumatoid arthritis",
      "symptoms": "Symmetrical polyarthritis (small joints of hands/feet), morning stiffness >30 min, fatigue, joint erosions",
      "treatment_drugs": "NSAIDs (Ibuprofen/Diclofenac) + DMARD (Methotrexate once weekly + Folate 2-3 times/week OR Hydroxychloroquine/Chloroquine); Prednisolone low dose (bridge); refer"
    },
    {
      "disease": "Juvenile chronic arthritis",
      "symptoms": "Similar to RA but in children",
      "treatment_drugs": "As for RA; NSAIDs + DMARDs; avoid aspirin (Reye's)"
    },
    {
      "disease": "Systemic lupus erythematosus (SLE)",
      "symptoms": "Malar rash, photosensitivity, arthritis, serositis, renal, neurological, haematological involvement",
      "treatment_drugs": "Hydroxychloroquine or Chloroquine (skin/joint); Prednisolone (severe/complications); Azathioprine or Mycophenolate mofetil (steroid-sparing); refer"
    },
    {
      "disease": "Osteoarthritis",
      "symptoms": "Joint pain worse with use, morning stiffness <30 min, crepitus, bony enlargement",
      "treatment_drugs": "Ibuprofen or Diclofenac PRN; lifestyle measures; physiotherapy"
    },
    {
      "disease": "Reiter's disease / post-infective arthritis",
      "symptoms": "Urethritis, conjunctivitis, asymmetric arthritis (often after STI or dysentery)",
      "treatment_drugs": "NSAIDs (as for osteoarthritis); exclude HIV, UTI, bowel infection"
    },
    {
      "disease": "Diabetes mellitus type 1 (T1DM)",
      "symptoms": "Acute onset, weight loss, ketonuria, polyuria, polydipsia, hyperglycaemia, DKA risk",
      "treatment_drugs": "Insulin (Basal-bolus regimen: long-acting basal + rapid-acting bolus before meals); Multiple Daily Injections (MDII)"
    },
    {
      "disease": "Diabetes mellitus type 2 (T2DM)",
      "symptoms": "Insidious onset, often asymptomatic, obesity, hyperglycaemia, sometimes polyuria/polydipsia",
      "treatment_drugs": "Metformin (first line); add Gliclazide/Glimepiride or Vildagliptin if HbA1c not controlled; add basal insulin (NPH, Detemir, Glargine, Degludec) or premixed insulin if failing oral agents; Dapagliflozin (for those with HF or CKD)"
    },
    {
      "disease": "Gestational Diabetes Mellitus (GDM)",
      "symptoms": "Diabetes first diagnosed in 2nd/3rd trimester of pregnancy",
      "treatment_drugs": "Metformin (first line) or Insulin; strict glycaemic control"
    },
    {
      "disease": "Hypoglycaemia (diabetic)",
      "symptoms": "Sweating, pallor, tremor, palpitations, tachycardia, hunger (adrenergic); confusion, seizures, coma (neuroglycopaenic); capillary glucose <3.9mmol/L",
      "treatment_drugs": "Oral fast-acting sugar (if conscious); Glucagon IM (if unconscious/severely impaired); Dextrose 50% IV (if unconscious and IV access); Dextrose 5% infusion"
    },
    {
      "disease": "Diabetic ketoacidosis (DKA)",
      "symptoms": "Hyperglycaemia, ketosis/ketonuria, metabolic acidosis, dehydration, altered consciousness, Kussmaul breathing",
      "treatment_drugs": "IV fluids (0.9% saline) + Insulin (fixed rate IV infusion 0.1 units/kg/hr) + Potassium replacement; change to 5-10% dextrose when glucose <14mmol/L"
    },
    {
      "disease": "Hyperosmolar hyperglycaemic state (HHS)",
      "symptoms": "Severe hyperglycaemia, hyperosmolality, severe dehydration, no significant ketosis, altered consciousness",
      "treatment_drugs": "IV fluids first (0.9% saline), THEN insulin (0.05 units/kg/hr)"
    },
    {
      "disease": "Goitre (non-toxic)",
      "symptoms": "Enlarged thyroid, euthyroid, may have cosmetic or pressure symptoms",
      "treatment_drugs": "Thyroxine (if symptomatic); refer for workup (TSH, ultrasound)"
    },
    {
      "disease": "Hyperthyroidism / Graves' disease",
      "symptoms": "Weight loss, heat intolerance, palpitations, tremor, goitre, exophthalmos, anxiety",
      "treatment_drugs": "Carbimazole; Propranolol (symptom relief until euthyroid); refer for radioiodine or surgery if poor response"
    },
    {
      "disease": "Toxic nodular goitre (including toxic adenoma)",
      "symptoms": "Single or multiple nodules, hyperthyroidism",
      "treatment_drugs": "Carbimazole (short-term); Radioiodine or surgery (render euthyroid first)"
    },
    {
      "disease": "Hypothyroidism",
      "symptoms": "Weight gain, cold intolerance, fatigue, dry skin, bradycardia, constipation, cognitive slowing",
      "treatment_drugs": "Thyroxine replacement (start 50-100mcg, adjust to TSH)"
    },
    {
      "disease": "Hypoadrenalism (Addison's disease)",
      "symptoms": "Fatigue, hyperpigmentation (especially scars/creases), hypotension, salt craving, hypoglycaemia, hyponatraemia, hyperkalaemia",
      "treatment_drugs": "Hydrocortisone (acute crisis: IV 100mg stat + IV fluids); then maintenance (prednisolone/hydrocortisone); Fludrocortisone (if mineralocorticoid deficiency)"
    },
    {
      "disease": "Adrenal crisis",
      "symptoms": "Systolic BP <100mmHg, hypotension, shock, hyponatraemia, hyperkalaemia in known or suspected adrenal insufficiency",
      "treatment_drugs": "Hydrocortisone IV 100mg stat; IV 0.9% Normal saline (1 litre in first hour)"
    },
    {
      "disease": "Meningitis (bacterial)",
      "symptoms": "Fever, headache, neck stiffness, altered consciousness, seizures, focal signs, vomiting, photophobia",
      "treatment_drugs": "Benzylpenicillin + Chloramphenicol or Ceftriaxone (14 days); Chemoprophylaxis for contacts (ceftriaxone single dose)"
    },
    {
      "disease": "Tuberculous meningitis",
      "symptoms": "Subacute meningitis, often with cranial nerve palsies, may present acutely",
      "treatment_drugs": "Anti-TB treatment (2HRZE/10HR)"
    },
    {
      "disease": "Cerebral toxoplasmosis (HIV-related)",
      "symptoms": "Focal contrast-enhancing lesion(s) on CT, focal neurological signs, headache, confusion, seizures",
      "treatment_drugs": "Sulphadiazine + Pyrimethamine or Clindamycin + Pyrimethamine or Cotrimoxazole (6 weeks)"
    },
    {
      "disease": "Neurocysticercosis",
      "symptoms": "Focal seizures without fever, typical CT scan appearance (cystic lesions)",
      "treatment_drugs": "Albendazole + Praziquantel + Prednisolone (if drowsiness, seizures, or focal signs develop)"
    },
    {
      "disease": "Tension headache",
      "symptoms": "Bilateral dull, band-like pain, worse as day progresses, no nausea, may be daily",
      "treatment_drugs": "Aspirin PRN (max 1 week continuous); Amitriptyline (if chronic >6 weeks); lifestyle changes, relaxation"
    },
    {
      "disease": "Migraine",
      "symptoms": "Unilateral throbbing, nausea/vomiting, photophobia, ± aura, lasts hours-days",
      "treatment_drugs": "Ibuprofen/Aspirin/Paracetamol + Metoclopramide (acute); Ergotamine (if ineffective, contraindicated in complicated migraine); Propranolol or Amitriptyline (prophylaxis if ≥2 disabling migraines/month)"
    },
    {
      "disease": "Cluster headache",
      "symptoms": "Unilateral severe periorbital pain, periodicity (weeks), male predominance",
      "treatment_drugs": "Treat as migraine (no specific prophylaxis mentioned)"
    },
    {
      "disease": "Epilepsy (generalised tonic-clonic)",
      "symptoms": "Sudden loss of consciousness, tonic-clonic movements, urinary incontinence, tongue biting, post-ictal confusion",
      "treatment_drugs": "Sodium valproate (first line, but avoid in pregnancy); Phenobarbitone; Phenytoin; Carbamazepine; Lamotrigine (second line/special groups)"
    },
    {
      "disease": "Status epilepticus",
      "symptoms": "Continuous seizure activity >30 minutes, or recurrent seizures without regaining consciousness",
      "treatment_drugs": "Diazepam IV/PR (first line); Phenobarbitone IV; Phenytoin IV; Thiopentone + intubation (if refractory)"
    },
    {
      "disease": "Febrile convulsions (child)",
      "symptoms": "Seizures associated with fever (age 6m-6y), no intracranial infection",
      "treatment_drugs": "Treat fever (paracetamol); Diazepam PR if prolonged; NO routine antiepileptic prophylaxis"
    },
    {
      "disease": "Acute confusional state / delirium",
      "symptoms": "Acute onset disorientation, short-term memory loss, fluctuating consciousness, hallucinations (medical emergency)",
      "treatment_drugs": "Treat underlying cause (DIMTOP: Drugs, Infection, Metabolic, Trauma, Oxygen deficit, Psychiatric/Pain); Haloperidol IM or Diazepam/Midazolam IV/IM (if very restless); Chlorpromazine IM (if sedation required)"
    },
    {
      "disease": "Dementia (general management)",
      "symptoms": "Progressive cognitive decline, memory loss, impairment in daily activities, behavioural changes (reversible causes: hypothyroidism, B12 deficiency, pellagra, neurosyphilis, HIV, normal pressure hydrocephalus, depression)",
      "treatment_drugs": "Treat reversible causes; donepezil (for Alzheimer's, specialist initiation); psychosocial support; manage behavioural symptoms with low-dose antipsychotics (e.g., sulpiride, quetiapine, haloperidol) or low-dose benzodiazepines PRN"
    },
    {
      "disease": "Stroke (acute ischaemic)",
      "symptoms": "Sudden onset focal neurological deficit (hemiparesis, aphasia, facial droop, gaze abnormality, arm drift), NIHSS or G-FAST score",
      "treatment_drugs": "Aspirin (150mg pre-referral if not contraindicated); thrombolysis not practical; manage BP; nil by mouth until swallow assessed; CT brain to exclude haemorrhage"
    },
    {
      "disease": "Stroke (secondary prevention)",
      "symptoms": "After TIA or minor ischaemic stroke",
      "treatment_drugs": "Clopidogrel + Aspirin (dual antiplatelet for 21 days) then Clopidogrel alone; high-intensity statin (Atorvastatin); BP lowering (thiazide/CCB/ACEi); anticoagulation if atrial fibrillation"
    },
    {
      "disease": "Guillain-Barré syndrome",
      "symptoms": "Ascending weakness, paraesthesia, areflexia, may progress to respiratory failure",
      "treatment_drugs": "Supportive care; IV immunoglobulins (severe cases); NO steroids"
    },
    {
      "disease": "Myasthenia gravis",
      "symptoms": "Fatigable weakness, ptosis, diplopia, difficulty swallowing/speaking",
      "treatment_drugs": "Refer for diagnosis (specialist)"
    },
    {
      "disease": "Peripheral neuropathy (sensory)",
      "symptoms": "Burning, numbness, paraesthesia in glove-and-stocking distribution (causes: diabetes, HIV, alcohol, B12 deficiency, drugs)",
      "treatment_drugs": "Amitriptyline (first line); add Carbamazepine if ineffective; Codeine or Morphine for severe pain"
    },
    {
      "disease": "Essential tremor",
      "symptoms": "Fine bilateral postural tremor (present on maintaining posture, stops at rest)",
      "treatment_drugs": "Propranolol"
    },
    {
      "disease": "Parkinsonism",
      "symptoms": "Coarse resting tremor, rigidity, bradykinesia, postural instability (exclude drug-induced)",
      "treatment_drugs": "Benzhexol (initial tremor); Levodopa/Carbidopa (when motor symptoms interfere with daily activities); refer"
    },
    {
      "disease": "Cerebellar tremor",
      "symptoms": "Intention tremor, gait ataxia, nystagmus",
      "treatment_drugs": "Refer for CT/MRI"
    },
    {
      "disease": "Non-organic psychosis (schizophrenia, schizophreniform, brief psychotic)",
      "symptoms": "Hallucinations (auditory), delusions (persecutory/grandiose), disorganised speech/behaviour, negative symptoms (apathy, social withdrawal), loss of contact with reality",
      "treatment_drugs": "Chlorpromazine, Haloperidol, Trifluoperazine, Sulpiride (first line); Olanzapine, Risperidone, Quetiapine, Clozapine (second line, clozapine requires FBC monitoring)"
    },
    {
      "disease": "Rapid tranquillisation (agitated/violent)",
      "symptoms": "Agitation, violence, risk to self/others, aggression",
      "treatment_drugs": "Chlorpromazine IM or Haloperidol IM + Diazepam IM/IV or Lorazepam IM"
    },
    {
      "disease": "Organic psychosis (HIV, infection, trauma, metabolic)",
      "symptoms": "Psychosis secondary to known medical condition, antipsychotic side effects more common",
      "treatment_drugs": "Treat cause; lower doses of atypical antipsychotics (e.g., Risperidone)"
    },
    {
      "disease": "Bipolar disorder (mania)",
      "symptoms": "Elevated/expansive mood, grandiosity, decreased need for sleep, pressured speech, racing thoughts, increased goal-directed activity, psychosis",
      "treatment_drugs": "Mood stabiliser: Carbamazepine, Sodium valproate, Lamotrigine, or Lithium carbonate; Antipsychotic: Olanzapine, Risperidone, Quetiapine (for acute mania)"
    },
    {
      "disease": "Bipolar disorder (depressive phase)",
      "symptoms": "Depressed mood, anhedonia, low energy, often with psychomotor retardation",
      "treatment_drugs": "Antidepressant (e.g., Fluoxetine) + mood stabiliser (avoid carbamazepine in HIV)"
    },
    {
      "disease": "Depression (major)",
      "symptoms": "Persistent sad/depressed mood, anhedonia, fatigue, sleep/appetite changes, feelings of worthlessness/guilt, suicidal ideation, multiple unexplained physical symptoms",
      "treatment_drugs": "Fluoxetine, Citalopram, Sertraline (first line SSRIs); Amitriptyline, Imipramine (tricyclics, avoid in heart disease/glaucoma/epilepsy); Venlafaxine, Duloxetine, Mianserin (second line)"
    },
    {
      "disease": "Depression with psychomotor agitation",
      "symptoms": "Depression with restlessness, difficulty sitting still",
      "treatment_drugs": "Amitriptyline or Imipramine at night"
    },
    {
      "disease": "Depression with psychomotor retardation",
      "symptoms": "Depression with slowed thoughts/movements, lethargy",
      "treatment_drugs": "Fluoxetine in the morning"
    },
    {
      "disease": "Anxiety disorders (generalised)",
      "symptoms": "Pervasive worry, feeling on edge, restlessness, irritability, multiple physical symptoms (dizziness, shortness of breath, palpitations, abdominal pain)",
      "treatment_drugs": "Psychosocial interventions; Diazepam or Clonazepam (severe, max 2 weeks); Propranolol (for performance anxiety)"
    },
    {
      "disease": "Alcohol use disorder (moderate-severe)",
      "symptoms": "Compulsive alcohol use, tolerance, withdrawal symptoms (tremors, insomnia, confusion, hallucinations, seizures), deterioration in social functioning",
      "treatment_drugs": "Diazepam (fixed dose reducing regimen for detoxification) or Chlordiazepoxide; Thiamine + Vitamin B Complex (to prevent Wernicke's encephalopathy); Multivitamins"
    },
    {
      "disease": "Alcohol withdrawal with delirium tremens (DT)",
      "symptoms": "Severe confusion, disorientation, hallucinations, agitation, autonomic instability, seizures",
      "treatment_drugs": "Diazepam IV; ICU setting; high-dose benzodiazepines"
    },
    {
      "disease": "Alcoholic hallucinosis",
      "symptoms": "Hallucinations (usually auditory) in clear sensorium, occurring during or after heavy alcohol use",
      "treatment_drugs": "Low-dose antipsychotic (Chlorpromazine or Risperidone) for severe agitation"
    },
    {
      "disease": "Wernicke's encephalopathy (alcohol-related)",
      "symptoms": "Ophthalmoplegia, ataxia, confusion, altered consciousness (thiamine deficiency)",
      "treatment_drugs": "Parenteral thiamine (500mg for 3-5 days)"
    },
    {
      "disease": "Attention Deficit Hyperactivity Disorder (ADHD) - children >5yrs & adolescents",
      "symptoms": "Inattention, hyperactivity, impulsivity, symptoms in multiple settings for >6 months, difficulty with daily functioning",
      "treatment_drugs": "Methylphenidate (immediate or slow release) or Dextroamphetamine or Atomoxetine (specialist initiation & monitoring)"
    },
    {
      "disease": "Autism Spectrum Disorder (ASD) - behavioural symptoms",
      "symptoms": "Deficits in social communication, repetitive behaviours, resistance to change, irritability, self-injurious behaviour",
      "treatment_drugs": "Risperidone or Aripiprazole (for severe irritability/aggression, specialist use)"
    },
    {
      "disease": "Conduct Disorder (CD) - aggression",
      "symptoms": "Repetitive persistent antisocial, aggressive, defiant behaviour violating age-appropriate social rules",
      "treatment_drugs": "Risperidone or Aripiprazole or Carbamazepine (for aggression not responding to psychosocial interventions)"
    },
    {
      "disease": "Enuresis (nocturnal)",
      "symptoms": "Repeated voiding of urine into bed, at least twice/week for ≥3 months, child ≥5 years",
      "treatment_drugs": "Desmopressin at night (first line); Imipramine (second line for children 6-18 years) – after exclusion of medical causes"
    },
    {
      "disease": "Insomnia (in depression/anxiety)",
      "symptoms": "Difficulty sleeping, part of depressive/anxiety symptoms",
      "treatment_drugs": "Limited use of benzodiazepines (clonazepam or lorazepam) for max 2 weeks"
    },
    {
      "disease": "Acute closed-angle glaucoma",
      "symptoms": "Severe eye pain, headache, nausea, vomiting, blurred vision with halos around lights, red eye, fixed/dilated pupil, decreased vision",
      "treatment_drugs": "Pilocarpine 2/4% drops; Timolol 0.5% drops; Acetazolamide po stat then 8 hourly; urgent referral"
    },
    {
      "disease": "Xerophthalmia (Vitamin A deficiency)",
      "symptoms": "Night blindness, conjunctival xerosis (dryness), Bitot's spots, corneal xerosis/ulceration, keratomalacia",
      "treatment_drugs": "Vitamin A (single dose on Day 1, Day 2, repeat after 2 weeks)"
    },
    {
      "disease": "Acute bacterial conjunctivitis",
      "symptoms": "Red eye, purulent discharge, gritty sensation, eyelids may stick together",
      "treatment_drugs": "Tetracycline 1% or Chloramphenicol 1% eye ointment (3-4 times daily for one week); eyelid hygiene"
    },
    {
      "disease": "Viral conjunctivitis",
      "symptoms": "Watery discharge, red eye, self-limiting, often bilateral",
      "treatment_drugs": "No antibiotics; treat as bacterial if unsure; refer if persists >1 week"
    },
    {
      "disease": "Allergic conjunctivitis",
      "symptoms": "Itching (marked), redness, watering, both eyes, often recurrent",
      "treatment_drugs": "Olopatadine 1% eye drops; cold compresses; avoid steroids"
    },
    {
      "disease": "Trachoma (chronic conjunctivitis)",
      "symptoms": "Chronic follicular conjunctivitis, corneal scarring, trichiasis (eyelashes touching cornea), entropion",
      "treatment_drugs": "Tetracycline 1% eye ointment (4 times daily for 6 weeks); epilation for trichiasis; refer"
    },
    {
      "disease": "Conjunctivitis of newborn (Ophthalmia neonatorum)",
      "symptoms": "Conjunctivitis with discharge in neonate within first month of life (gonococcal/chlamydial/bacterial)",
      "treatment_drugs": "Kanamycin IM + Erythromycin po (treat parents as well); eye irrigation; topical ofloxacin/gentamicin + tetracycline ointment"
    },
    {
      "disease": "Penetrating eye injury",
      "symptoms": "History of trauma, visible wound, decreased vision, hyphema, possible prolapse of intraocular contents",
      "treatment_drugs": "Eye shield; Tetanus vaccine; Paracetamol; Amoxicillin; URGENT referral"
    },
    {
      "disease": "Corneal foreign body",
      "symptoms": "Foreign body sensation, pain, tearing, photophobia",
      "treatment_drugs": "Attempt removal with topical anaesthetic (lignocaine 1-2%); if successful: tetracycline/chloramphenicol ointment + pad for 24hrs; if unsuccessful refer"
    },
    {
      "disease": "Corneal abrasion",
      "symptoms": "Pain, photophobia, tearing, history of scratch, staining with fluorescein",
      "treatment_drugs": "Eye pad + tetracycline/chloramphenicol ointment for 24 hours; review; if improving continue ointment for 4-5 days"
    },
    {
      "disease": "Chemical burn to eye",
      "symptoms": "Pain, redness, lid swelling, decreased vision, history of chemical exposure",
      "treatment_drugs": "Immediate irrigation (tap water for ≥15-30 minutes); tetracycline/chloramphenicol ointment; pad eye; urgent referral"
    },
    {
      "disease": "Iritis / Uveitis",
      "symptoms": "Red eye (circumcorneal injection), deep pain worse with eye movement, photophobia, blurred vision, small/irregular pupil",
      "treatment_drugs": "Refer to eye specialist"
    },
    {
      "disease": "Corneal ulcer",
      "symptoms": "Red eye, pain, photophobia, corneal opacity with fluorescein staining, decreased vision (refer, test corneal sensation to rule out herpetic cause)",
      "treatment_drugs": "Tetracycline or Chloramphenicol eye ointment (5-7 days); if herpetic: acyclovir ointment/po"
    },
    {
      "disease": "Chronic open-angle glaucoma (POAG)",
      "symptoms": "Asymptomatic initially, then progressive visual field loss, optic disc cupping, ± elevated IOP",
      "treatment_drugs": "Latanoprost eye drops (first line) or Timolol maleate or Travoprost or Xalacom; add Acetazolamide if IOP >40mmHg (not >3 months without review)"
    },
    {
      "disease": "Cataract",
      "symptoms": "Progressive painless vision loss, white pupil (in children), squint (children)",
      "treatment_drugs": "Surgical removal; pre-op: Mydriatics (tropicamide, cyclopentolate, phenylephrine); post-op: corticosteroids (dexamethasone/betamethasone/prednisolone acetate) + antibiotics (gentamicin/ciprofloxacin/ofloxacin)"
    },
    {
      "disease": "Oral thrush (candidiasis)",
      "symptoms": "Whitish patches (non-adherent, wipe off leaving erythematous surface), reddening, altered taste, angular cheilitis",
      "treatment_drugs": "Nystatin suspension/lozenges or Miconazole 2% oral gel (7-14 days)"
    },
    {
      "disease": "Oesophageal candidiasis",
      "symptoms": "Odynophagia (pain on swallowing), chest pain, difficulty swallowing (AIDS-defining illness)",
      "treatment_drugs": "Fluconazole (200mg BD for 7-14 days); refer for ART; cotrimoxazole prophylaxis"
    },
    {
      "disease": "Herpes simplex labialis (extensive)",
      "symptoms": "Vesicles on lips, buccal mucosa, hard palate, causing pain/discomfort",
      "treatment_drugs": "Acyclovir (400mg TDS for 5 days)"
    },
    {
      "disease": "Kaposi sarcoma (oral)",
      "symptoms": "Purple nodules/lesions on palate or under tongue",
      "treatment_drugs": "Offer HIV testing; cotrimoxazole prophylaxis; refer to OI clinic for ART; biopsy"
    },
    {
      "disease": "Necrotizing gingivitis / periodontitis / stomatitis",
      "symptoms": "Spontaneous bleeding of gums, loosening of teeth, pain, fetor oris",
      "treatment_drugs": "Metronidazole + Amoxicillin (5 days); antibacterial mouthwash (betadine, chlorhexidine); refer to oral health professional"
    },
    {
      "disease": "Dental caries",
      "symptoms": "Cavities, intrinsic discolouration, toothache",
      "treatment_drugs": "Oral hygiene (fluoride toothpaste), limit sweets, regular dental exam, refer for restoration/extraction"
    },
    {
      "disease": "Fascial space abscess / Ludwig's angina / Cervicofacial necrotising fasciitis",
      "symptoms": "Dental infection, jaw fracture, immunosuppression; swelling, airway compromise (raised tongue, drooling), pain, fever, sepsis",
      "treatment_drugs": "Surgical source control (drainage, extraction, debridement); Ceftriaxone IV or Clindamycin IV + Metronidazole IV ± Gentamicin; Dexamethasone if airway compromise; refer"
    },
    {
      "disease": "Oral ulcers (aphthous)",
      "symptoms": "Painful ulcers on buccal mucosa, interfere with eating",
      "treatment_drugs": "Symptomatic: Chlorhexidine mouth rinse or Povidone iodine or Triamcinolone in orabase; biopsy if large/not healing >14 days"
    },
    {
      "disease": "Histoplasmosis (oral)",
      "symptoms": "Nodule or penetrating lesion (hole) on palate",
      "treatment_drugs": "Ketoconazole (200mg BD for months); biopsy for confirmation"
    },
    {
      "disease": "Acute otitis media (AOM)",
      "symptoms": "Ear pain (otalgia), fever, chills, irritability, bulging/inflamed tympanic membrane",
      "treatment_drugs": "Amoxicillin (7 days) if: age <6 months, severe AOM (axillary temp >39.5°C), comorbidity (malnutrition, HIV), failure to resolve in 48-72 hours, or patient unlikely to return"
    },
    {
      "disease": "Recurrent AOM",
      "symptoms": "More than 4 episodes per year",
      "treatment_drugs": "REFER"
    },
    {
      "disease": "Acute mastoiditis",
      "symptoms": "Fever, chills, tenderness over mastoid, retroauricular swelling, anterior displacement of auricle, bulging/unhealthy TM",
      "treatment_drugs": "IV antibiotics (Benzylpenicillin or Ceftriaxone) stat; REFER"
    },
    {
      "disease": "Otitis media with effusion (OME)",
      "symptoms": "Hearing loss, aural fullness, brownish fluid behind intact TM (no acute inflammation)",
      "treatment_drugs": "REFER (adult: exclude nasopharyngeal carcinoma)"
    },
    {
      "disease": "Chronic suppurative otitis media (CSOM)",
      "symptoms": "Otorrhoea >14 days, hearing loss, mucopurulent discharge, ossicular chain erosion",
      "treatment_drugs": "Aural toilet (saline/acidifying agent); Ciprofloxacin ear drops; Amoxicillin; keep ears dry; REFER to ENT surgeon"
    },
    {
      "disease": "Cholesteatoma",
      "symptoms": "Keratin debris in middle ear, hearing loss, discharge",
      "treatment_drugs": "REFER immediately"
    },
    {
      "disease": "Otitis externa (bacterial)",
      "symptoms": "Itchiness, inflamed ear canal, discharge, pain",
      "treatment_drugs": "Aural toilet; Ciprofloxacin+dexamethasone or Chloramphenicol+dexamethasone ear drops; Amoxicillin or Ciprofloxacin po (if severe)"
    },
    {
      "disease": "Malignant otitis externa",
      "symptoms": "Necrotising infection in immunosuppressed (diabetes, HIV), severe pain, granulation tissue, may have cranial nerve palsies",
      "treatment_drugs": "IV antibiotics (Benzylpenicillin); IV fluids; debridement; REFER immediately"
    },
    {
      "disease": "Fungal otitis externa",
      "symptoms": "Itching, discharge, fungal hyphae",
      "treatment_drugs": "Clotrimazole ear drops; acidifying agents"
    },
    {
      "disease": "Acute rhinosinusitis",
      "symptoms": "Nasal blockage, rhinorrhoea, anosmia, facial pressure/pain, discharge turns mucopurulent if bacterial",
      "treatment_drugs": "Supportive care; Amoxicillin (7 days) if: failure to resolve in 48-72 hours, purulent discharge, or comorbidities"
    },
    {
      "disease": "Complicated sinusitis (orbital/intracranial)",
      "symptoms": "Preseptal/orbital cellulitis, proptosis, visual disturbance, confusion, signs of meningitis, eyelid swelling",
      "treatment_drugs": "REFER immediately"
    },
    {
      "disease": "Chronic rhinosinusitis",
      "symptoms": "Symptoms persisting for 90 days",
      "treatment_drugs": "REFER"
    },
    {
      "disease": "Allergic rhinosinusitis",
      "symptoms": "Clear rhinorrhoea, nasal obstruction, anosmia, sneezing, itching",
      "treatment_drugs": "Fluticasone nasal spray (1 month); Oral antihistamines (Chlorpheniramine or Cetirizine) if needed"
    },
    {
      "disease": "Invasive fungal rhinosinusitis",
      "symptoms": "Nasal blockage, necrosis of mucosa, orbital signs (proptosis, ophthalmoplegia), intracranial extension in immunosuppressed",
      "treatment_drugs": "URGENT referral; surgical debridement; systemic antifungals"
    },
    {
      "disease": "Acute tonsillitis",
      "symptoms": "Fever, chills, odynophagia, dysphagia, inflamed tonsils with exudate",
      "treatment_drugs": "Amoxicillin (7 days); Amoxicillin/clavulanic acid (second line); peritonsillar abscess: antibiotics + refer"
    },
    {
      "disease": "Epistaxis (nosebleed)",
      "symptoms": "Bleeding from nose (anterior or posterior), may be severe",
      "treatment_drugs": "Anterior packing (ribbon gauze); posterior packing (Foley catheter) if posterior bleed; refer if posterior bleed, hypertension, anticoagulation, failed anterior packing, or malignancy suspicion"
    },
    {
      "disease": "CSF rhinorrhoea",
      "symptoms": "Clear rhinorrhoea after head injury/nasal surgery or spontaneous, worsens on leaning forward, headache",
      "treatment_drugs": "REFER"
    },
    {
      "disease": "Croup (laryngotracheobronchitis)",
      "symptoms": "Barking cough, inspiratory stridor, fever (grades 1-4)",
      "treatment_drugs": "Racemic adrenaline nebuliser (grades 1&2); Dexamethasone IV (grades 1&2); Grades 3&4: secure airway, treat and refer"
    },
    {
      "disease": "Impetigo",
      "symptoms": "Rapidly spreading blisters/pustules, honey-coloured crusts, often on face (common in children)",
      "treatment_drugs": "Cloxacillin po (if severe or systemic symptoms) + hygiene measures (soap and water)"
    },
    {
      "disease": "Folliculitis",
      "symptoms": "Small pustules around hair follicles, superficial or deep",
      "treatment_drugs": "Bathing; treat as impetigo"
    },
    {
      "disease": "Furunculosis (boils)",
      "symptoms": "Painful deep-seated hair follicle infection (Staph. aureus), often neck/axillae, may have fever/lymphadenopathy",
      "treatment_drugs": "Hot compresses; Cloxacillin po (if fever/LN swelling); surgical incision if not improving"
    },
    {
      "disease": "Erysipelas",
      "symptoms": "Raised, sharply demarcated, red, hot, swollen area (often face/leg), high fever, pain",
      "treatment_drugs": "Erythromycin or Benzathine penicillin (7 days; 10-14 days if recurrent)"
    },
    {
      "disease": "Acute cellulitis",
      "symptoms": "Diffuse, indistinct redness, swelling, warmth, pain (deeper than erysipelas)",
      "treatment_drugs": "Cloxacillin po or Azithromycin (5-7 days)"
    },
    {
      "disease": "Acute paronychia",
      "symptoms": "Painful red swelling of nailfold, may have pus",
      "treatment_drugs": "Erythromycin or Cloxacillin (5-7 days); incision & drainage if abscess"
    },
    {
      "disease": "Chronic paronychia",
      "symptoms": "Chronic nailfold swelling, often candida",
      "treatment_drugs": "Avoid water/trauma; treat secondary bacterial infection; topical antifungals"
    },
    {
      "disease": "Acne",
      "symptoms": "Comedones, papulopustules, nodules on face/chest/back",
      "treatment_drugs": "Benzoyl peroxide 5% gel (mild); Doxycycline (100mg daily for 2-4 months for severe nodular acne)"
    },
    {
      "disease": "Tinea corporis (body ringworm)",
      "symptoms": "Round, expanding lesions with white, dust-like scales, distinct borders",
      "treatment_drugs": "Miconazole 2% or Clotrimazole 1% cream (apply until 7 days after resolution)"
    },
    {
      "disease": "Tinea pedis (athlete's foot)",
      "symptoms": "Itchy, scaly, cracked, macerated skin between toes",
      "treatment_drugs": "Miconazole or Clotrimazole cream (apply until 7 days after resolution); keep feet dry; Griseofulvin (severe)"
    },
    {
      "disease": "Tinea versicolor (pityriasis versicolor)",
      "symptoms": "Hypopigmented patches on chest/back/arms (yeast infection)",
      "treatment_drugs": "Selenium sulphide 2% shampoo or Miconazole shampoo (daily for 5 days)"
    },
    {
      "disease": "Tinea capitis (scalp ringworm)",
      "symptoms": "Scaly, itchy scalp with patchy hair loss, broken hairs (fungus in hair follicle)",
      "treatment_drugs": "Griseofulvin (500mg daily for 14 days); topical antifungals NOT effective"
    },
    {
      "disease": "Scabies",
      "symptoms": "Intense itching (worse at night), burrows (whitish zig-zag) in interdigital spaces, wrists, axillae, navel, genitals",
      "treatment_drugs": "Permethrin 5% cream (single application, wash off after 8-12hrs) or Gamma benzene hexachloride 1% lotion or Benzyl benzoate 25% emulsion; treat all close contacts; wash bedding/clothes"
    },
    {
      "disease": "Herpes simplex (labialis, recurrent)",
      "symptoms": "Vesicles on lips/mouth (or genitals), may recur with stress/illness",
      "treatment_drugs": "Keep lesions dry; no specific medication (acyclovir for severe HIV-related)"
    },
    {
      "disease": "Chickenpox (varicella)",
      "symptoms": "Fever, widespread vesicles (trunk → face/scalp) at different stages (papules, vesicles, crusts)",
      "treatment_drugs": "Calamine lotion; Chlorpheniramine (for itching)"
    },
    {
      "disease": "Herpes zoster (shingles)",
      "symptoms": "Unilateral dermatomal vesicular rash, severe pain (see HIV section)",
      "treatment_drugs": "Acyclovir (within 72hrs) or Valacyclovir; Paracetamol/Ibuprofen; Calamine lotion; Amitriptyline (post-herpetic neuralgia)"
    },
    {
      "disease": "Eczema (atopic dermatitis)",
      "symptoms": "Red, itchy, weeping, scaling, crusted lesions, often flexural (elbows, knees, neck) in older children/adults",
      "treatment_drugs": "Emulsifying ointment or Aqueous cream (soap substitute); Topical hydrocortisone 1% (dry eczema - ointment, weepy eczema - cream); Antihistamines (chlorpheniramine/promethazine for itching); treat secondary infection"
    },
    {
      "disease": "Urticaria (hives)",
      "symptoms": "Itchy, raised wheals (hives) due to dermal oedema (allergic or physical causes)",
      "treatment_drugs": "Chlorpheniramine or Promethazine or Cetirizine po; avoid topical antihistamines; identify/eliminate trigger"
    },
    {
      "disease": "Psoriasis",
      "symptoms": "Thick, silvery-scaly, erythematous plaques, symmetrical (elbows, knees, scalp, sacrum)",
      "treatment_drugs": "Salicylic acid 2% ointment (keratolytic); Coal tar 5% + salicylic acid 2% ointment; Zinc oxide ointment; sun exposure; avoid steroids"
    },
    {
      "disease": "Pellagra (niacin deficiency)",
      "symptoms": "Diarrhoea, dermatitis (sun-exposed areas, pressure points), dementia",
      "treatment_drugs": "Nicotinamide (100mg daily for 2 weeks or until review); high-protein diet"
    },
    {
      "disease": "Albinism / Vitiligo",
      "symptoms": "Generalised (albinism) or patchy (vitiligo) loss of pigmentation",
      "treatment_drugs": "Sunscreen (PABA cream/lotion) and sun blocker (balm on lips) daily; protective clothing; yearly skin cancer screening"
    },
    {
      "disease": "Warts (common/plantar)",
      "symptoms": "Keratotic papules (common) or endophytic lesions on soles (plantar)",
      "treatment_drugs": "Leave to resolve spontaneously; refer if extensive"
    },
    {
      "disease": "Thermal burns (superficial to deep)",
      "symptoms": "Skin injury from heat (fire, hot liquids, hot objects), pain (superficial), blistering, eschar (deep), erythema",
      "treatment_drugs": "Immediate cooling (water 25°C for 15-30 min); Paracetamol + Codeine (mild/moderate pain); Morphine IV (severe pain, large burns); Tetanus toxoid; Silver sulfadiazine 1% or Povidone-iodine 5% cream (topical); IV Ringer's lactate (large burns, Parkland formula); antibiotics if contaminated (benzylpenicillin or erythromycin then based on C&S)"
    },
    {
      "disease": "Chemical burns",
      "symptoms": "Tissue damage from acids or alkalis (battery acid, drain cleaner, bleach, etc.)",
      "treatment_drugs": "Brush off dry powder; copious water irrigation (≥20 minutes); soft paraffin on insoluble residues; calcium gluconate gel for hydrofluoric acid"
    },
    {
      "disease": "Electrical burns",
      "symptoms": "Entry/exit wounds, possible cardiac arrhythmia, unconsciousness, muscle damage",
      "treatment_drugs": "Cool burns; cardiac assessment and resuscitation (defibrillation/CPR if needed)"
    },
    {
      "disease": "Smoke inhalation burns",
      "symptoms": "Respiratory distress, stridor, hoarseness, cough, shortness of breath, soot/burns around mouth/nose, history of enclosed space",
      "treatment_drugs": "100% oxygen; airway management; monitor for respiratory failure"
    },
    {
      "disease": "Mild pain (adult)",
      "symptoms": "Pain score 1-3",
      "treatment_drugs": "Paracetamol or Ibuprofen or Diclofenac (oral)"
    },
    {
      "disease": "Moderate pain (adult)",
      "symptoms": "Pain score 4-6",
      "treatment_drugs": "Add Codeine or Tramadol to mild pain regimen"
    },
    {
      "disease": "Severe pain (adult)",
      "symptoms": "Pain score ≥7",
      "treatment_drugs": "Morphine (oral short-acting 5-10mg 4 hourly, OR long-acting 12 hourly); plus breakthrough doses (60-100% of 4-hourly dose); plus laxative for constipation, antiemetic for nausea (metoclopramide/prochlorperazine/haloperidol)"
    },
    {
      "disease": "Neuropathic pain",
      "symptoms": "Burning, shooting, stabbing pain (trigeminal neuralgia, post-herpetic neuralgia, peripheral neuropathy)",
      "treatment_drugs": "Amitriptyline or Carbamazepine or Gabapentin"
    },
    {
      "disease": "Nerve compression pain (e.g., spinal cord compression)",
      "symptoms": "Pain due to tumour or oedema compressing nerve/spinal cord, may have neurological deficit",
      "treatment_drugs": "Dexamethasone IV stat (16mg) then prednisolone; refer urgently"
    },
    {
      "disease": "Raised intracranial pressure (palliative)",
      "symptoms": "Headache, nausea, vomiting, altered consciousness due to tumour oedema",
      "treatment_drugs": "Dexamethasone or Prednisolone"
    },
    {
      "disease": "Pain in children (mild)",
      "symptoms": "Pain score 1-3 (age-appropriate assessment)",
      "treatment_drugs": "Paracetamol (10-15mg/kg 4 hourly)"
    },
    {
      "disease": "Pain in children (severe)",
      "symptoms": "Pain score ≥7",
      "treatment_drugs": "Paracetamol + Morphine (0.02-0.04mg/kg 4 hourly)"
    },
    {
      "disease": "Terminal restlessness / end-of-life symptoms",
      "symptoms": "Agitated delirium, cognitive impairment, respiratory secretions, urinary problems, pain, dyspnoea in last hours of life",
      "treatment_drugs": "Focus on comfort: Atropine or Hyoscine (for secretions); Morphine (pain/dyspnoea); Benzodiazepines (anxiety/agitation); discontinue IV fluids, unnecessary medications; involve family"
    },
    {
      "disease": "Frailty / Geriatric syndromes",
      "symptoms": "Falls, immobility, delirium, incontinence, susceptibility to medication side effects, weight loss, functional decline",
      "treatment_drugs": "Comprehensive Geriatric Assessment (CGA); deprescribing; exercise; nutrition; treat underlying causes"
    },
    {
      "disease": "Osteoporosis / Fragility fractures",
      "symptoms": "Fracture from standing height or less (especially vertebral, hip, humerus), low bone mass, height loss, kyphosis",
      "treatment_drugs": "Alendronate (70mg once weekly) or Zoledronic acid IV (5mg every 12-18 months); Calcium + Vitamin D; lifestyle (weight-bearing exercise, diet, sun exposure)"
    },
    {
      "disease": "Delirium (in elderly)",
      "symptoms": "Acute onset fluctuating confusion, inattention, disorientation, altered consciousness (often due to infection, medication, dehydration, pain, constipation)",
      "treatment_drugs": "Treat underlying cause; Haloperidol (low dose) or Lorazepam (PRN for severe agitation/risk of harm); non-pharmacological management (reorientation, calm environment)"
    },
    {
      "disease": "Dementia (Alzheimer's type)",
      "symptoms": "Progressive memory loss, cognitive decline, impairment in daily activities, behavioural changes (apathy, irritability, loss of emotional control)",
      "treatment_drugs": "Donepezil (specialist initiation, trial for 2-3 months, discontinue if no benefit)"
    },
    {
      "disease": "Urinary incontinence (overactive bladder)",
      "symptoms": "Urgency, frequency, nocturia, urge incontinence",
      "treatment_drugs": "Pelvic floor exercises, bladder training; Mirabegron (50mg daily, trial for 2-3 months); avoid oxybutynin (high anticholinergic burden)"
    },
    {
      "disease": "Constipation (in elderly)",
      "symptoms": "Hard stools, infrequent bowel movements, difficulty passing stool, risk of faecal impaction → overflow diarrhoea",
      "treatment_drugs": "Hydration, mobilisation, high-fibre diet; Senna or Bisacodyl (stimulant laxatives); Glycerine suppositories; review medications (opiates, CCBs, iron)"
    },
    {
      "disease": "Paracetamol overdose",
      "symptoms": "Early: nausea, vomiting; later (3-4 days): liver damage (jaundice, coagulopathy, hepatic failure)",
      "treatment_drugs": "Activated charcoal (single dose within 2 hours); Acetylcysteine IV (if >10g ingested or high plasma level, effective up to 36 hours)"
    },
    {
      "disease": "Aspirin / salicylate poisoning",
      "symptoms": "Tinnitus, hyperventilation (respiratory alkalosis then metabolic acidosis), fever, confusion, vomiting, dehydration",
      "treatment_drugs": "Activated charcoal (within 4 hours); Dextrose 5% + Sodium bicarbonate infusion (if severe); Frusemide (if fluid retention)"
    },
    {
      "disease": "Carbon monoxide poisoning",
      "symptoms": "Headache, weakness, dizziness, tachycardia, tachypnoea, confusion, coma, cherry-red skin (late)",
      "treatment_drugs": "100% oxygen; remove from exposure; Frusemide + Hydrocortisone (cerebral oedema); Diazepam (convulsions)"
    },
    {
      "disease": "Chloroquine poisoning",
      "symptoms": "Difficulty breathing, drowsiness, blurring of vision, hypotension, cardiac arrhythmias, convulsions (can be fatal with as little as 2g)",
      "treatment_drugs": "Orogastric tube + gastric lavage; Activated charcoal; Diazepam IV (convulsions and cardioprotective); supportive care"
    },
    {
      "disease": "Ethanol (alcohol) poisoning",
      "symptoms": "CNS depression, coma, hypoglycaemia, metabolic acidosis, hypothermia",
      "treatment_drugs": "Gastric lavage (if soon after ingestion); Naloxone (if opiate co-ingestion); Dextrose 50% then Dextrose 5% infusion; Thiamine; Sodium bicarbonate (if acidosis)"
    },
    {
      "disease": "Organophosphate / Carbamate poisoning",
      "symptoms": "SLUDGE syndrome: salivation, lacrimation, urination, defecation, GI upset, emesis; miosis, muscle fasciculations, weakness, confusion, respiratory depression",
      "treatment_drugs": "Atropine IV (high doses, repeated until atropinisation: dry skin, dilated pupils, fast pulse); Pralidoxime (for organophosphates, NOT carbamates)"
    },
    {
      "disease": "Paraquat poisoning",
      "symptoms": "Multiple organ toxicity, pulmonary fibrosis (delayed, up to 3 weeks), caustic burns to mouth/GI tract",
      "treatment_drugs": "Gastric lavage; Fuller's earth or Activated charcoal; Hydrocortisone (if severe, early); AVOID oxygen (makes more toxic)"
    },
    {
      "disease": "Paraffin / petroleum product ingestion",
      "symptoms": "Aspiration pneumonitis (cough, fever, hypoxia), CNS depression, cardiac arrhythmias",
      "treatment_drugs": "DO NOT induce vomiting; DO NOT perform gastric lavage; supportive care (monitor for pneumonitis)"
    },
    {
      "disease": "Tricyclic antidepressant overdose (e.g., amitriptyline, imipramine)",
      "symptoms": "CNS stimulation (seizures, agitation), cardiac arrhythmias (wide QRS, tachycardia), coma, respiratory depression",
      "treatment_drugs": "Gastric lavage + Activated charcoal; Diazepam IV (seizures); Lignocaine IV (arrhythmias); Sodium bicarbonate IV (for acidosis); avoid vasoconstrictors"
    },
    {
      "disease": "Snake bite (venomous - polyvalent)",
      "symptoms": "Bleeding (20WBCT positive), neurotoxicity (ptosis, dysphagia, respiratory distress), severe swelling of bitten limb, tissue necrosis",
      "treatment_drugs": "Pressure bandage/immobilisation (first aid); Polyvalent snake antivenom IV (40ml, repeat as needed); Tetanus toxoid; no test dose; monitor for anaphylaxis"
    },
    {
      "disease": "Scorpion sting (Parabuthus)",
      "symptoms": "Severe local pain, neurotoxic effects (agitation, hypersalivation, respiratory distress), cardiotoxic effects",
      "treatment_drugs": "Scorpion anti-venom (check manufacturer); Atropine (if cholinergic signs); symptomatic management; refer if severe"
    },
    {
      "disease": "Mushroom poisoning (Amanita phalloides)",
      "symptoms": "GI symptoms (nausea, vomiting, diarrhoea) after 6-12 hours, then delayed hepatotoxicity, renal failure, hypoglycaemia, acidosis (24-72 hours)",
      "treatment_drugs": "Gastric lavage + Activated charcoal (within 4 hours); supportive care; no effective antidote; monitor liver/kidney function"
    },
    {
      "disease": "Acute abdomen (general)",
      "symptoms": "Sudden severe abdominal pain (<7-10 days), colicky or sharp, vomiting, constipation/obstipation, distension, failure to pass flatus",
      "treatment_drugs": "Resuscitation (IV fluids, NGT, urinary catheter); broad-spectrum antibiotics (if peritonitis/suspected perforation); treat specific cause after diagnostic workup"
    },
    {
      "disease": "Acute appendicitis",
      "symptoms": "Periumbilical pain shifting to right iliac fossa (McBurney's point tenderness), nausea, vomiting, anorexia, low-grade fever, ± Rovsing's sign",
      "treatment_drugs": "Emergency appendicectomy; Prophylaxis: Ceftriaxone + Metronidazole (single dose pre-op)"
    },
    {
      "disease": "Appendiceal mass",
      "symptoms": "Palpable mass in right iliac fossa, clinical signs of appendicitis but localized",
      "treatment_drugs": "IV antibiotics (Benzylpenicillin + Gentamicin + Metronidazole or Ceftriaxone + Metronidazole); serial examinations; elective appendicectomy in 6 weeks if improves"
    },
    {
      "disease": "Appendiceal abscess",
      "symptoms": "Abscess in right iliac fossa, fever, localised peritonitis",
      "treatment_drugs": "Percutaneous or surgical drainage + IV antibiotics (as for mass); interval appendicectomy may not be necessary"
    },
    {
      "disease": "Appendiceal rupture/perforation",
      "symptoms": "Generalised peritonitis (board-like rigidity, rebound tenderness, absent bowel sounds), septic shock",
      "treatment_drugs": "Aggressive fluid resuscitation; IV antibiotics (as for abscess); urgent laparotomy"
    },
    {
      "disease": "Intestinal obstruction",
      "symptoms": "Colicky abdominal pain, vomiting, abdominal distension, absolute constipation/obstipation (no stool/flatus), previous abdominal surgery (adhesions) or hernia",
      "treatment_drugs": "NGT decompression; IV fluids (replace NGT losses ml/ml); Benzylpenicillin + Gentamicin + Metronidazole (if suspected bacterial translocation/gangrene); surgical referral"
    },
    {
      "disease": "Acute cholecystitis",
      "symptoms": "Acute right upper quadrant pain (often after fatty meal, at night), fever, Murphy's sign, nausea, vomiting",
      "treatment_drugs": "Ampicillin + Metronidazole or Ceftriaxone + Metronidazole (IV); analgesia; elective cholecystectomy after 6 weeks (or early \"hot\" cholecystectomy by specialist)"
    },
    {
      "disease": "Perforated duodenal ulcer",
      "symptoms": "Sudden severe epigastric pain spreading to whole abdomen, board-like rigidity, rebound tenderness, free air under diaphragm on erect CXR",
      "treatment_drugs": "Emergency surgery; resuscitation (IV fluids, NGT, analgesia, catheter); Benzylpenicillin + Gentamicin + Metronidazole (IV)"
    },
    {
      "disease": "Breast abscess",
      "symptoms": "Painful, fluctuant swelling in lactating/pregnant woman, overlying erythema, tenderness",
      "treatment_drugs": "Incision & drainage (under GA); Cloxacillin IV then po or Clindamycin IV then po; continue breastfeeding/expressing"
    },
    {
      "disease": "Mastitis",
      "symptoms": "Painful, swollen, red breast, fever, but no fluctuance/pointing",
      "treatment_drugs": "Cloxacillin or Clindamycin po (mild); IV if severe; review for development of abscess"
    },
    {
      "disease": "Breast eczema",
      "symptoms": "Itchy, scaly, erythematous rash on breast/nipple (usually bilateral; rule out Paget's - usually unilateral)",
      "treatment_drugs": "Topical corticosteroids (as per skin chapter); biopsy if doubt"
    },
    {
      "disease": "Thyroid conditions (surgical indications)",
      "symptoms": "Thyrotoxicosis not responding to medical therapy or radioiodine, confirmed/suspected malignancy, goitre with compressive complications (airway, vessels, nerves)",
      "treatment_drugs": "Render euthyroid with Carbimazole pre-operatively; emergency cases may need IV Propranolol"
    },
    {
      "disease": "Chronic skin ulcers (non-malignant)",
      "symptoms": "Non-healing wound, exclude malignancy (biopsy), peripheral vascular disease, diabetes mellitus, venous stasis",
      "treatment_drugs": "Clean with normal saline; glycerine & ichthammol dressing; treat underlying cause; avoid frequent dressing changes"
    },
    {
      "disease": "Iron deficiency anaemia",
      "symptoms": "Fatigue, pallor, weakness, hypochromic microcytic blood picture (MCV <75fL), koilonychia, pica",
      "treatment_drugs": "Ferrous sulphate (200mg TDS) for 3 months after Hb normalises; treat underlying cause"
    },
    {
      "disease": "Megaloblastic anaemia (B12/folate deficiency)",
      "symptoms": "Macrocytic anaemia (MCV >105fL), glossitis, paraesthesia, subacute combined degeneration of spinal cord (B12 deficiency)",
      "treatment_drugs": "Hydroxocobalamin (Vitamin B12) IM (loading then maintenance) + Folic acid (5mg daily for 3 months) – give both to avoid precipitating neuropathy"
    },
    {
      "disease": "Sickle cell anaemia",
      "symptoms": "Painful crises (vaso-occlusive), chronic haemolytic anaemia, susceptibility to infection (encapsulated organisms), leg ulcers, priapism, acute chest syndrome",
      "treatment_drugs": "Folic acid (5mg daily lifelong); Penicillin V (250mg daily lifelong); Pyrimethamine/dapsone (malaria prophylaxis in endemic areas); Morphine (severe pain); Amoxicillin (for infections); Hydroxyurea (500mg daily for frequent crises, titrate to HbF)"
    },
    {
      "disease": "G6PD deficiency",
      "symptoms": "Acute haemolytic anaemia (haemoglobinuria, jaundice, fatigue) triggered by oxidant drugs (primaquine, dapsone, sulphonamides, quinolones, nitrofurantoin) or infections (e.g., malaria)",
      "treatment_drugs": "Stop triggering agent; IV fluids; oral iron + folate; avoid blood transfusion unless severe; Medic-alert bracelet"
    },
    {
      "disease": "Haemophilia A (Factor VIII deficiency)",
      "symptoms": "Spontaneous or traumatic bleeding into joints (haemarthrosis), muscles, mucous membranes, CNS; prolonged bleeding",
      "treatment_drugs": "Factor VIII concentrate or Cryoprecipitate (dose based on bleed severity, 14-60 IU/kg); Tranexamic acid (mucosal bleeding/adjunct); ice compression; avoid IM injections/aspirin"
    },
    {
      "disease": "Haemophilia B (Factor IX deficiency)",
      "symptoms": "Similar bleeding tendency as Haemophilia A",
      "treatment_drugs": "Factor IX concentrate or Fresh frozen plasma (4-12 bags depending on bleed severity)"
    },
    {
      "disease": "von Willebrand disease (vWD)",
      "symptoms": "Mucocutaneous bleeding (epistaxis, menorrhagia, bruising), prolonged bleeding after surgery/trauma",
      "treatment_drugs": "Factor VIII concentrate (contains vWF) or Cryoprecipitate; Tranexamic acid"
    },
    {
      "disease": "Disseminated intravascular coagulation (DIC)",
      "symptoms": "Bleeding (petechiae, ecchymoses, oozing from sites) and/or thrombosis, prolonged PT/APTT, low platelets, low fibrinogen",
      "treatment_drugs": "Treat underlying cause; Fresh frozen plasma (if bleeding + prolonged PT/APTT); Platelet concentrate (if platelets <30x10⁹/L + bleeding); Cryoprecipitate (if low fibrinogen); NO heparin in bleeding patient"
    },
    {
      "disease": "Idiopathic thrombocytopenic purpura (ITP)",
      "symptoms": "Petechiae, purpura, bruising, bleeding, isolated low platelet count",
      "treatment_drugs": "Prednisolone (1mg/kg/day for 2 weeks, then taper if response); IV immunoglobulin (1mg/kg/day for 3 days, works faster); splenectomy if fails"
    },
    {
      "disease": "Haemorrhagic disease of newborn",
      "symptoms": "Bleeding in neonate (vitamin K deficiency)",
      "treatment_drugs": "Vitamin K IM (prophylaxis); Fresh frozen plasma + Vitamin K (if active bleeding)"
    },
    {
      "disease": "Dehydration (adult - severe)",
      "symptoms": "Hypovolaemia, reduced skin turgor, hypotension, tachycardia, oliguria",
      "treatment_drugs": "Sodium chloride 0.9% or Ringer's lactate (first litre over 15-20 mins, then maintenance)"
    },
    {
      "disease": "Dehydration (child - severe)",
      "symptoms": "As above in child",
      "treatment_drugs": "Half-strength Darrow's with dextrose 2.5% (30ml/kg over first hour, then maintenance)"
    },
    {
      "disease": "Maintenance (adult)",
      "symptoms": "Euvolemic patient unable to take oral fluids",
      "treatment_drugs": "0.9% NaCl + 5% Dextrose + Potassium chloride (20mmol/L) – total 2-3 L/24hrs"
    },
    {
      "disease": "Maintenance (child 1m-10y)",
      "symptoms": "As above",
      "treatment_drugs": "Half-strength Darrow's with dextrose 2.5% (100ml/kg/24hrs for 0-10kg; 75ml/kg/24hrs for 5-10yrs)"
    },
    {
      "disease": "Maintenance (neonate)",
      "symptoms": "Up to 30 days old",
      "treatment_drugs": "Neonatalyte (up to 150ml/kg/24hrs, max 60ml/kg/24hrs on first day)"
    },
    {
      "disease": "Surgical losses (\"third-space\" loss)",
      "symptoms": "Intraoperative fluid shift",
      "treatment_drugs": "Ringer's lactate (10ml/kg first hour, then 5ml/kg subsequent hours, max 3L adult)"
    },
    {
      "disease": "Fever",
      "symptoms": "Temperature ≥38°C",
      "treatment_drugs": "Increase maintenance fluids by 5-10%"
    },
    {
      "disease": "Nasogastric suction losses",
      "symptoms": "Loss of gastric fluid via NGT",
      "treatment_drugs": "Replace ml-for-ml with 0.9% NaCl + Potassium chloride (13mmol/L)"
    },
    {
      "disease": "Anaphylaxis (severe, life-threatening)",
      "symptoms": "Airway obstruction, bronchospasm, hypotension, urticaria, flushing, angioedema, GI symptoms, cardiovascular collapse",
      "treatment_drugs": "Adrenaline 1:1000 IM (0.5-1ml adult, weight-based for children) – repeat every 10 mins; Oxygen 6L/min; IV fluids (0.9% NaCl or Ringer's lactate); Promethazine or Chlorpheniramine IV; Hydrocortisone IV; Nebulised Salbutamol for bronchospasm; Aminophylline IV if refractory"
    },
    {
      "disease": "Cyanide poisoning",
      "symptoms": "Toxic ingestion/inhalation (rapid onset coma, seizures, hypotension, metabolic acidosis)",
      "treatment_drugs": "Sodium nitrite 3% IV + Sodium thiosulphate 50% IV"
    },
    {
      "disease": "Heparin overdose",
      "symptoms": "Excessive bleeding due to heparin",
      "treatment_drugs": "Protamine 1% IV"
    },
    {
      "disease": "Iron salts poisoning",
      "symptoms": "Ingestion of iron supplements, vomiting, diarrhoea, metabolic acidosis, shock, liver failure",
      "treatment_drugs": "Desferrioxamine po/iv"
    },
    {
      "disease": "Lead poisoning",
      "symptoms": "Chronic exposure, abdominal pain, anaemia, neuropathy, encephalopathy",
      "treatment_drugs": "Dimercaprol IM + Calcium disodium edetate IM"
    },
    {
      "disease": "Mercury poisoning",
      "symptoms": "Acute or chronic exposure, neurological symptoms, renal toxicity",
      "treatment_drugs": "Dimercaprol IM or Penicillamine po"
    },
    {
      "disease": "Methanol (methyl alcohol) poisoning",
      "symptoms": "Visual disturbances, metabolic acidosis, altered mental status, coma",
      "treatment_drugs": "Ethanol 50% diluted (1.5ml/kg orally then 0.5-1ml/kg every 2hrs for 4 days)"
    },
    {
      "disease": "Opiate overdose (codeine, morphine, pethidine)",
      "symptoms": "Respiratory depression, pin-point pupils, coma, hypotension",
      "treatment_drugs": "Naloxone IV (0.01mg/kg, repeat as necessary)"
    },
    {
      "disease": "Phenothiazine (chlorpromazine, etc.) extrapyramidal symptoms",
      "symptoms": "Acute dystonia, oculogyric crisis, muscle rigidity, torticollis",
      "treatment_drugs": "Biperiden IV/IM + Phenytoin slow IV"
    }
  ]
}
```

## National_Vitality_Eye/Server/middleware/auth.js

```text
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Patient = require("../models/Patient");
exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (!token) {
            return res.status(401).json({
                error: "Not authorized to access this route. Please log in."
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user;
        if (decoded.type === "patient") {
            user = await Patient.findById(decoded.id);
            if (user) {
                user = user.toObject();
                user.role = "patient";
                user.approvalStatus = "approved"; 
                user.isActive = user.portalAccount?.isActive ?? true;
            }
        } else {
            user = await User.findById(decoded.id).select("-password");
        }
        if (!user) {
            return res.status(401).json({
                error: "User no longer exists"
            });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
};
```

## National_Vitality_Eye/Server/middleware/rbac.js

```text

exports.hasPermission = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                console.log(`[RBAC] Denied: No user in request for permission "${permission}"`);
                return res.status(401).json({ error: "Authentication required" });
            }
            const rolePermissions = {
                admin: [
                    "view:patients", "create:patients", "edit:patients", "delete:patients",
                    "view:records", "view:analytics", "manage:users", "view:users",
                    "use:ai_predictor", "view:logs", "manage:system"
                ],
                doctor: [
                    "view:patients", "create:patients", "edit:patients",
                    "view:records", "create:records", "edit:records",
                    "view:analytics", "use:ai_predictor", "view:logs"
                ],
                nurse: [
                    "view:patients", "create:patients",
                    "view:records", "create:records",
                    "view:analytics", "use:ai_predictor", "view:logs"
                ],
                data_entry: [
                    "view:patients", "create:patients", "edit:patients",
                    "view:records", "create:records", 
                    "view:analytics", "use:ai_predictor", "view:logs"
                ],
                viewer: [
                    "view:patients", "view:records", 
                    "view:analytics", "use:ai_predictor", "view:logs"
                ],
                patient: [
                    "view:records", "view:patients"
                ],
                pending: []
            };
            const userRole = req.user.role || 'pending';
            const userPermissions = rolePermissions[userRole] || [];
            if (userPermissions.includes(permission)) {
                return next();
            }
            console.log(`[RBAC] Denied: User "${req.user.userId}" (${userRole}) lacks permission "${permission}"`);
            return res.status(403).json({ error: `Permission denied. Requires: ${permission}` });
        } catch (error) {
            console.error("[RBAC Error]:", error);
            return res.status(500).json({ error: "Internal authorization error" });
        }
    };
};
exports.hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (roles.includes(req.user.role)) {
            return next();
        }
        return res.status(403).json({ error: `Role required: ${roles.join(" or ")}` });
    };
};
exports.isApproved = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    if (req.user.approvalStatus !== "approved") {
        return res.status(403).json({ error: `Account ${req.user.approvalStatus}. Please wait for admin approval.` });
    }
    if (!req.user.isActive) {
        return res.status(403).json({ error: "Account is deactivated. Contact admin." });
    }
    next();
};
```

## National_Vitality_Eye/Server/middleware/upload.js

```text

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const createUploadDirs = () => {
    const dirs = [
        "./uploads/documents/national-id",
        "./uploads/documents/employment-letters",
        "./uploads/documents/licenses",
        "./uploads/photos",
        "./uploads/medical-images"  
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created upload directory: ${dir}`);
        }
    });
};
createUploadDirs();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "nationalId") {
            cb(null, "./uploads/documents/national-id/");
        } else if (file.fieldname === "employmentLetter") {
            cb(null, "./uploads/documents/employment-letters/");
        } else if (file.fieldname === "practicingLicense") {
            cb(null, "./uploads/documents/licenses/");
        } else if (file.fieldname === "profilePhoto") {
            cb(null, "./uploads/photos/");
        } else {
            cb(null, "./uploads/documents/");
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 10000);
        const fieldname = file.fieldname;
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}-${fieldname}-${random}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        nationalId: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        employmentLetter: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        practicingLicense: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        profilePhoto: ['image/jpeg', 'image/png', 'image/jpg']
    };
    const allowedForField = allowedTypes[file.fieldname] || ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedForField.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${allowedForField.join(', ')}`), false);
    }
};
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 4
    },
    fileFilter: fileFilter
});
const uploadDocuments = upload.fields([
    { name: "nationalId", maxCount: 1 },
    { name: "employmentLetter", maxCount: 1 },
    { name: "practicingLicense", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 }
]);
const medicalImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const patientId = req.body.patientId;
        const timestamp = Date.now();
        const uploadPath = `./uploads/medical-images/${patientId}/${timestamp}`;
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 10000);
        const ext = path.extname(file.originalname);
        const studyType = req.body.studyType || 'radiology';
        const sanitizedStudyType = studyType.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${timestamp}-${sanitizedStudyType}-${random}${ext}`);
    }
});
const medicalImageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/dicom', 'application/dicom'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.dcm', '.dicom'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for medical image. Allowed: JPG, PNG, DICOM`), false);
    }
};
const uploadMedicalImages = multer({
    storage: medicalImageStorage,
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 10
    },
    fileFilter: medicalImageFilter
}).array('images', 10);
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large. Maximum size is 5MB'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files uploaded'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: `Unexpected field: ${err.field}. Allowed fields: nationalId, employmentLetter, practicingLicense, profilePhoto`
            });
        }
        return res.status(400).json({
            error: `Upload error: ${err.message}`
        });
    }
    if (err) {
        return res.status(400).json({
            error: err.message
        });
    }
    next();
};
module.exports = {
    uploadDocuments,
    handleUploadError,
    uploadMedicalImages
};
```

## National_Vitality_Eye/Server/middleware/validation.js

```text

const { body, param, query, validationResult } = require("express-validator");
exports.validateRegistration = [
    body("firstName")
        .notEmpty().withMessage("First name is required")
        .isLength({ min: 2 }).withMessage("First name must be at least 2 characters")
        .trim(),
    body("lastName")
        .notEmpty().withMessage("Last name is required")
        .isLength({ min: 2 }).withMessage("Last name must be at least 2 characters")
        .trim(),
    body("email")
        .isEmail().withMessage("Please enter a valid email address")
        .normalizeEmail()
        .trim(),
    body("phoneNumber")
        .notEmpty().withMessage("Phone number is required")
        .matches(/^(\+263|0)[7-9][0-9]{8}$/).withMessage("Invalid Zimbabwe phone number format"),
    body("employeeId")
        .notEmpty().withMessage("Employee ID is required")
        .trim(),
    body("hospitalName")
        .notEmpty().withMessage("Hospital name is required")
        .trim(),
    body("hospitalId")
        .notEmpty().withMessage("Hospital ID is required")
        .trim(),
    body("province")
        .notEmpty().withMessage("Province is required")
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    body("position")
        .notEmpty().withMessage("Position is required")
        .trim(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];
exports.validateLogin = [
    body("userId")
        .notEmpty().withMessage("User ID is required")
        .trim(),
    body("password")
        .notEmpty().withMessage("Password is required"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];
exports.validatePasswordChange = [
    body("currentPassword")
        .notEmpty().withMessage("Current password is required"),
    body("newPassword")
        .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
        .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/)
        .withMessage("Password must contain at least one uppercase, one lowercase, and one number"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];
exports.validatePatient = [
    body("nationalId")
        .optional()
        .matches(/^\d{2}-\d{6}-[A-Z]\d{2}$/).withMessage("Invalid Zimbabwe National ID format (e.g., 63-123456-A12)"),
    body("firstName")
        .optional()
        .isLength({ min: 2 }).withMessage("First name must be at least 2 characters")
        .trim(),
    body("lastName")
        .optional()
        .isLength({ min: 2 }).withMessage("Last name must be at least 2 characters")
        .trim(),
    body("dateOfBirth")
        .optional()
        .isISO8601().withMessage("Invalid date format"),
    body("gender")
        .optional()
        .isIn(["Male", "Female", "Other"]).withMessage("Gender must be Male, Female, or Other"),
    body("province")
        .optional()
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];
exports.validateMedicalRecord = [
    body("patientId")
        .notEmpty().withMessage("Patient ID is required")
        .isMongoId().withMessage("Invalid patient ID"),
    body("hospital")
        .notEmpty().withMessage("Hospital name is required")
        .trim(),
    body("diagnosis")
        .notEmpty().withMessage("Diagnosis is required")
        .trim(),
    body("disease")
        .notEmpty().withMessage("Disease is required")
        .trim(),
    body("province")
        .notEmpty().withMessage("Province is required")
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    body("symptoms")
        .optional()
        .isArray().withMessage("Symptoms must be an array"),
    body("prescribedMedication")
        .optional()
        .trim(),
    body("visitDate")
        .optional()
        .isISO8601().withMessage("Invalid date format"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];
exports.validatePrediction = [
    body("symptoms")
        .isArray().withMessage("Symptoms must be an array")
        .notEmpty().withMessage("At least one symptom is required"),
    body("province")
        .optional()
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];
exports.validateMongoId = [
    param("id")
        .isMongoId().withMessage("Invalid ID format"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];
exports.validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        req.query.page = parseInt(req.query.page) || 1;
        req.query.limit = parseInt(req.query.limit) || 10;
        next();
    }
];
```

## National_Vitality_Eye/Server/models/MedicalRecord.js

```text
const mongoose = require("mongoose");
const {
    normaliseDisease,
    normaliseSymptoms,
    normaliseHospital,
    normaliseProvince
} = require("../utils/normalise");
const { roundTemperature } = require("../utils/vitalSigns");
const medicalRecordSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },
    patientSnapshot: {
        nationalId: String,
        firstName: String,
        lastName: String,
        dateOfBirth: Date,
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        ageAtVisit: Number,
        contactInfo: {
            phone: String,
            email: String,
            address: String,
            emergencyContact: {
                name: String,
                phone: String,
                relationship: String
            }
        },
        patientProvince: String,
        district: String,
        ward: String,
        insuranceInfo: {
            provider: String,
            policyNumber: String,
            memberId: String,
            coverageType: String
        }
    },
    visitNumber: String,
    hospital: {
        type: String,
        required: true
    },
    department: String,
    doctorName: String,
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    visitDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    visitType: {
        type: String,
        enum: ["Emergency", "Outpatient", "Inpatient", "Follow-up", "Consultation", "Home Visit", "Telemedicine"],
        default: "Outpatient"
    },
    admissionId: String,
    dischargeDate: Date,
    presentingComplaints: [{
        symptom: String,
        duration: String,
        severity: Number,
        notes: String
    }],
    historyOfPresentIllness: String,
    symptoms: [String],
    duration: String,
    vitalSigns: {
        temperature: { type: Number, required: [true, 'Temperature is required'] },
        bloodPressure: {
            systolic: Number,
            diastolic: Number
        },
        heartRate: Number,
        respiratoryRate: Number,
        oxygenSaturation: Number,
        painScore: Number,
        weight: Number,
        height: Number,
        bmi: Number,
        recordedAt: { type: Date, default: Date.now }
    },
    physicalExam: {
        general: String,
        headAndNeck: String,
        cardiovascular: String,
        respiratory: String,
        abdominal: String,
        neurological: String,
        musculoskeletal: String,
        skin: String,
        other: String
    },
    primaryDiagnosis: {
        name: String,
        code: String,
        notes: String
    },
    secondaryDiagnoses: [{
        name: String,
        code: String,
        notes: String
    }],
    disease: String,
    differentialDiagnosis: [String],
    investigations: {
        labTests: [{
            testName: String,
            orderedDate: { type: Date, default: Date.now },
            resultDate: Date,
            result: String,
            referenceRange: String,
            abnormal: Boolean,
            notes: String
        }],
        radiology: [{
            studyType: String,  
            bodyPart: String,
            findings: String,
            impression: String,
            images: [{
                filename: String,
                originalName: String,
                path: String,
                url: String,
                uploadedAt: { type: Date, default: Date.now },
                uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                fileSize: Number,
                mimeType: String
            }],
            reportDate: { type: Date, default: Date.now },
            orderedBy: String,
            performedBy: String,
            notes: String
        }],
        otherTests: [{
            testName: String,
            result: String,
            notes: String
        }]
    },
    treatmentPlan: {
        plan: String,
        medications: [{
            medication: String,
            dosage: String,
            frequency: String,
            route: String,
            duration: String,
            prescribedBy: String,
            notes: String
        }],
        procedures: [{
            procedure: String,
            date: Date,
            performedBy: String,
            outcome: String,
            notes: String
        }],
        therapies: [{
            type: String,
            frequency: String,
            duration: String,
            notes: String
        }],
        lifestyleAdvice: [String]
    },
    prescribedMedications: [String],
    referrals: [{
        to: String,
        department: String,
        reason: String,
        urgency: { type: String, enum: ["Routine", "Urgent", "Emergency"], default: "Routine" },
        date: Date,
        status: { type: String, enum: ["Pending", "Completed", "Cancelled"], default: "Pending" },
        feedback: String
    }],
    followUp: {
        required: { type: Boolean, default: false },
        date: Date,
        instructions: String,
        provider: String
    },
    disposition: {
        type: String,
        enum: ["Discharged", "Admitted", "Transferred", "Left Against Medical Advice", "Deceased"],
        default: "Discharged"
    },
    dischargeInstructions: String,
    dischargeSummary: String,
    doctorNotes: String,
    nursingNotes: String,
    province: {
        type: String,
        required: true,
        enum: ['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands']
    },
    district: String,
    facilityLevel: String,
    isTelemedicine: { type: Boolean, default: false },
    consultationLink: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    taggedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedAt: Date,
    isArchived: { type: Boolean, default: false },
    isConfidential: { type: Boolean, default: false },
    notes: String
}, { timestamps: true });
medicalRecordSchema.pre('save', async function () {
    if (this.disease) {
        this.disease = normaliseDisease(this.disease);
    }
    if (this.primaryDiagnosis?.name) {
        this.primaryDiagnosis.name = normaliseDisease(this.primaryDiagnosis.name);
    }
    if (this.secondaryDiagnoses?.length) {
        this.secondaryDiagnoses = this.secondaryDiagnoses.map(d => ({
            ...d,
            name: d.name ? normaliseDisease(d.name) : d.name
        }));
    }
    if (this.symptoms?.length) {
        this.symptoms = normaliseSymptoms(this.symptoms);
    }
    if (this.presentingComplaints?.length) {
        this.presentingComplaints = this.presentingComplaints.map(c => ({
            ...c,
            symptom: c.symptom ? normaliseSymptoms([c.symptom])[0] || c.symptom : c.symptom
        }));
    }
    if (this.hospital) {
        this.hospital = normaliseHospital(this.hospital);
    }
    if (this.province) {
        this.province = normaliseProvince(this.province);
    }
    if (this.vitalSigns?.temperature != null) {
        this.vitalSigns.temperature = roundTemperature(this.vitalSigns.temperature);
    }
});
module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
```

## National_Vitality_Eye/Server/models/Patient.js

```text
const mongoose = require("mongoose");
const patientSchema = new mongoose.Schema({
    nationalId: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },
    contactInfo: {
        phone: String,
        email: String,
        address: String,
        emergencyContact: {
            name: String,
            phone: String,
            relationship: String
        }
    },
    province: {
        type: String,
        required: true,
        enum: ['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands']
    },
    district: String,
    ward: String,
    clinicalProfile: {
        vitalSigns: mongoose.Schema.Types.Mixed,
        triageStatus: {
            priority: { 
                type: String, 
                enum: ["CRITICAL", "EMERGENT", "URGENT", "STABLE", "NON-URGENT"], 
                default: "STABLE" 
            },
            score: { type: Number, default: 0 },
            reasons: [String],
            color: String,
            lastAssessment: Date
        }
    },
    insuranceInfo: {
        provider: String,
        policyNumber: String,
        memberId: String,
        validFrom: Date,
        validTo: Date,
        coverageType: String
    },
    portalAccount: {
        hasAccount: { type: Boolean, default: false },
        email: String,
        phoneNumber: String,
        password: String,
        createdAt: Date,
        lastLogin: Date,
        consentGiven: { type: Boolean, default: false },
        consentDate: Date,
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false },
        auditLog: [{
            action: String,
            timestamp: Date,
            ipAddress: String,
            userAgent: String
        }],
        trustedProviders: [{
            userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            grantedAt: { type: Date, default: Date.now }
        }]
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: String
}, { timestamps: true });
patientSchema.virtual("fullName").get(function() {
    return `${this.firstName} ${this.lastName}`;
});
patientSchema.virtual("age").get(function() {
    if (!this.dateOfBirth) return null;
    const ageDiff = Date.now() - this.dateOfBirth.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
});
module.exports = mongoose.model("Patient", patientSchema);
```

## National_Vitality_Eye/Server/models/User.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    phoneNumber: String,
    employeeId: String,
    hospitalName: String,
    hospitalId: String,
    province: String,
    position: String,
    userId: {
        type: String,
        unique: true,
        sparse: true
    },
    password: String,
    role: {
        type: String,
        default: 'pending'
    },
    approvalStatus: {
        type: String,
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    verificationDocuments: {
        nationalId: String,
        employmentLetter: String,
        practicingLicense: String,
        profilePhoto: String
    },
    rejectionReason: String,
    approvedAt: Date,
    lastLogin: Date
}, { timestamps: true });
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
module.exports = mongoose.model('User', UserSchema);
```

## National_Vitality_Eye/Server/package-lock.json

```text
{
  "name": "server",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "server",
      "version": "1.0.0",
      "license": "ISC",
      "dependencies": {
        "bcryptjs": "^3.0.3",
        "cors": "^2.8.6",
        "dotenv": "^17.3.1",
        "express": "^5.2.1",
        "express-rate-limit": "^8.3.2",
        "express-validator": "^7.3.1",
        "jsonwebtoken": "^9.0.3",
        "mongodb": "^7.1.0",
        "mongoose": "^9.2.4",
        "multer": "^2.1.1",
        "nodemailer": "^8.0.4",
        "pdfkit": "^0.18.0",
        "resend": "^6.11.0",
        "socket.io": "^4.8.3"
      }
    },
    "node_modules/@mongodb-js/saslprep": {
      "version": "1.4.6",
      "resolved": "https://registry.npmjs.org/@mongodb-js/saslprep/-/saslprep-1.4.6.tgz",
      "integrity": "sha512-y+x3H1xBZd38n10NZF/rEBlvDOOMQ6LKUTHqr8R9VkJ+mmQOYtJFxIlkkK8fZrtOiL6VixbOBWMbZGBdal3Z1g==",
      "license": "MIT",
      "dependencies": {
        "sparse-bitfield": "^3.0.3"
      }
    },
    "node_modules/@noble/ciphers": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/@noble/ciphers/-/ciphers-1.3.0.tgz",
      "integrity": "sha512-2I0gnIVPtfnMw9ee9h1dJG7tp81+8Ob3OJb3Mv37rx5L40/b0i7djjCVvGOVqc9AEIQyvyu1i6ypKdFw8R8gQw==",
      "license": "MIT",
      "engines": {
        "node": "^14.21.3 || >=16"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/@noble/hashes": {
      "version": "1.8.0",
      "resolved": "https://registry.npmjs.org/@noble/hashes/-/hashes-1.8.0.tgz",
      "integrity": "sha512-jCs9ldd7NwzpgXDIf6P3+NrHh9/sD6CQdxHyjQI+h/6rDNo88ypBxxz45UDuZHz9r3tNz7N/VInSVoVdtXEI4A==",
      "license": "MIT",
      "engines": {
        "node": "^14.21.3 || >=16"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/@socket.io/component-emitter": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@socket.io/component-emitter/-/component-emitter-3.1.2.tgz",
      "integrity": "sha512-9BCxFwvbGg/RsZK9tjXd8s4UcwR0MWeFQ1XEKIQVVvAGJyINdrqKMcTRyLoK8Rse1GjzLV9cwjWV1olXRWEXVA==",
      "license": "MIT"
    },
    "node_modules/@stablelib/base64": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@stablelib/base64/-/base64-1.0.1.tgz",
      "integrity": "sha512-1bnPQqSxSuc3Ii6MhBysoWCg58j97aUjuCSZrGSmDxNqtytIi0k8utUenAwTZN4V5mXXYGsVUI9zeBqy+jBOSQ==",
      "license": "MIT"
    },
    "node_modules/@swc/helpers": {
      "version": "0.5.21",
      "resolved": "https://registry.npmjs.org/@swc/helpers/-/helpers-0.5.21.tgz",
      "integrity": "sha512-jI/VAmtdjB/RnI8GTnokyX7Ug8c+g+ffD6QRLa6XQewtnGyukKkKSk3wLTM3b5cjt1jNh9x0jfVlagdN2gDKQg==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@types/cors": {
      "version": "2.8.19",
      "resolved": "https://registry.npmjs.org/@types/cors/-/cors-2.8.19.tgz",
      "integrity": "sha512-mFNylyeyqN93lfe/9CSxOGREz8cpzAhH+E93xJ4xWQf62V8sQ/24reV2nyzUWM6H6Xji+GGHpkbLe7pVoUEskg==",
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/node": {
      "version": "25.3.5",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-25.3.5.tgz",
      "integrity": "sha512-oX8xrhvpiyRCQkG1MFchB09f+cXftgIXb3a7UUa4Y3wpmZPw5tyZGTLWhlESOLq1Rq6oDlc8npVU2/9xiCuXMA==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~7.18.0"
      }
    },
    "node_modules/@types/webidl-conversions": {
      "version": "7.0.3",
      "resolved": "https://registry.npmjs.org/@types/webidl-conversions/-/webidl-conversions-7.0.3.tgz",
      "integrity": "sha512-CiJJvcRtIgzadHCYXw7dqEnMNRjhGZlYK05Mj9OyktqV8uVT8fD2BFOB7S1uwBE3Kj2Z+4UyPmFw/Ixgw/LAlA==",
      "license": "MIT"
    },
    "node_modules/@types/whatwg-url": {
      "version": "13.0.0",
      "resolved": "https://registry.npmjs.org/@types/whatwg-url/-/whatwg-url-13.0.0.tgz",
      "integrity": "sha512-N8WXpbE6Wgri7KUSvrmQcqrMllKZ9uxkYWMt+mCSGwNc0Hsw9VQTW7ApqI4XNrx6/SaM2QQJCzMPDEXE058s+Q==",
      "license": "MIT",
      "dependencies": {
        "@types/webidl-conversions": "*"
      }
    },
    "node_modules/accepts": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-2.0.0.tgz",
      "integrity": "sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "^3.0.0",
        "negotiator": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/append-field": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/append-field/-/append-field-1.0.0.tgz",
      "integrity": "sha512-klpgFSWLW1ZEs8svjfb7g4qWY0YS5imI82dTg+QahUvJ8YqAY0P10Uk8tTyh9ZGuYEZEMaeJYCF5BFuX552hsw==",
      "license": "MIT"
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/base64id": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/base64id/-/base64id-2.0.0.tgz",
      "integrity": "sha512-lGe34o6EHj9y3Kts9R4ZYs/Gr+6N7MCaMlIFA3F1R2O5/m7K06AxfSeO5530PEERE6/WyEg3lsuyw4GHlPZHog==",
      "license": "MIT",
      "engines": {
        "node": "^4.5.0 || >= 5.9"
      }
    },
    "node_modules/bcryptjs": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/bcryptjs/-/bcryptjs-3.0.3.tgz",
      "integrity": "sha512-GlF5wPWnSa/X5LKM1o0wz0suXIINz1iHRLvTS+sLyi7XPbe5ycmYI3DlZqVGZZtDgl4DmasFg7gOB3JYbphV5g==",
      "license": "BSD-3-Clause",
      "bin": {
        "bcrypt": "bin/bcrypt"
      }
    },
    "node_modules/body-parser": {
      "version": "2.2.2",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-2.2.2.tgz",
      "integrity": "sha512-oP5VkATKlNwcgvxi0vM0p/D3n2C3EReYVX+DNYs5TjZFn/oQt2j+4sVJtSMr18pdRr8wjTcBl6LoV+FUwzPmNA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "^3.1.2",
        "content-type": "^1.0.5",
        "debug": "^4.4.3",
        "http-errors": "^2.0.0",
        "iconv-lite": "^0.7.0",
        "on-finished": "^2.4.1",
        "qs": "^6.14.1",
        "raw-body": "^3.0.1",
        "type-is": "^2.0.1"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/brotli": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/brotli/-/brotli-1.3.3.tgz",
      "integrity": "sha512-oTKjJdShmDuGW94SyyaoQvAjf30dZaHnjJ8uAF+u2/vGJkJbJPJAT1gDiOJP5v1Zb6f9KEyW/1HpuaWIXtGHPg==",
      "license": "MIT",
      "dependencies": {
        "base64-js": "^1.1.2"
      }
    },
    "node_modules/bson": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/bson/-/bson-7.2.0.tgz",
      "integrity": "sha512-YCEo7KjMlbNlyHhz7zAZNDpIpQbd+wOEHJYezv0nMYTn4x31eIUM2yomNNubclAt63dObUzKHWsBLJ9QcZNSnQ==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=20.19.0"
      }
    },
    "node_modules/buffer-equal-constant-time": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz",
      "integrity": "sha512-zRpUiDwd/xk6ADqPMATG8vc9VPrkck7T07OIx0gnjmJAnHnTVXNQG3vfvWNuiZIkwu9KrKdA1iJKfsfTVxE6NA==",
      "license": "BSD-3-Clause"
    },
    "node_modules/buffer-from": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/buffer-from/-/buffer-from-1.1.2.tgz",
      "integrity": "sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==",
      "license": "MIT"
    },
    "node_modules/busboy": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/busboy/-/busboy-1.6.0.tgz",
      "integrity": "sha512-8SFQbg/0hQ9xy3UNTB0YEnsNBbWfhf7RtnzpL7TkBiTBRfrQ9Fxcnz7VJsleJpyp6rVLvXiuORqjlHi5q+PYuA==",
      "dependencies": {
        "streamsearch": "^1.1.0"
      },
      "engines": {
        "node": ">=10.16.0"
      }
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/clone": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/clone/-/clone-2.1.2.tgz",
      "integrity": "sha512-3Pe/CF1Nn94hyhIYpjtiLhdCoEoz0DqQ+988E9gmeEdQZlojxnOb74wctFyuwWQHzqyf9X7C7MG8juUpqBJT8w==",
      "license": "MIT",
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/concat-stream": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/concat-stream/-/concat-stream-2.0.0.tgz",
      "integrity": "sha512-MWufYdFw53ccGjCA+Ol7XJYpAlW6/prSMzuPOTRnJGcGzuhLn4Scrz7qf6o8bROZ514ltazcIFJZevcfbo0x7A==",
      "engines": [
        "node >= 6.0"
      ],
      "license": "MIT",
      "dependencies": {
        "buffer-from": "^1.0.0",
        "inherits": "^2.0.3",
        "readable-stream": "^3.0.2",
        "typedarray": "^0.0.6"
      }
    },
    "node_modules/content-disposition": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-1.0.1.tgz",
      "integrity": "sha512-oIXISMynqSqm241k6kcQ5UwttDILMK4BiurCfGEREw6+X9jkkpEe5T9FZaApyLGGOnFuyMWZpdolTXMtvEJ08Q==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/content-type": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-1.0.5.tgz",
      "integrity": "sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie-signature": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.2.2.tgz",
      "integrity": "sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.6.0"
      }
    },
    "node_modules/cors": {
      "version": "2.8.6",
      "resolved": "https://registry.npmjs.org/cors/-/cors-2.8.6.tgz",
      "integrity": "sha512-tJtZBBHA6vjIAaF6EnIaq6laBBP9aq/Y3ouVJjEfoHbRBcHBAHYcMh/w8LDrk2PvIMMq8gmopa5D4V8RmbrxGw==",
      "license": "MIT",
      "dependencies": {
        "object-assign": "^4",
        "vary": "^1"
      },
      "engines": {
        "node": ">= 0.10"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/dfa": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/dfa/-/dfa-1.2.0.tgz",
      "integrity": "sha512-ED3jP8saaweFTjeGX8HQPjeC1YYyZs98jGNZx6IiBvxW7JG5v492kamAQB3m2wop07CvU/RQmzcKr6bgcC5D/Q==",
      "license": "MIT"
    },
    "node_modules/dotenv": {
      "version": "17.3.1",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-17.3.1.tgz",
      "integrity": "sha512-IO8C/dzEb6O3F9/twg6ZLXz164a2fhTnEWb95H23Dm4OuN+92NmEAlTrupP9VW6Jm3sO26tQlqyvyi4CsnY9GA==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ecdsa-sig-formatter": {
      "version": "1.0.11",
      "resolved": "https://registry.npmjs.org/ecdsa-sig-formatter/-/ecdsa-sig-formatter-1.0.11.tgz",
      "integrity": "sha512-nagl3RYrbNv6kQkeJIpt6NJZy8twLB/2vtz6yN9Z4vRKHN4/QZJIEbqohALSgwKdnksuY3k5Addp5lg8sVoVcQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==",
      "license": "MIT"
    },
    "node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/engine.io": {
      "version": "6.6.5",
      "resolved": "https://registry.npmjs.org/engine.io/-/engine.io-6.6.5.tgz",
      "integrity": "sha512-2RZdgEbXmp5+dVbRm0P7HQUImZpICccJy7rN7Tv+SFa55pH+lxnuw6/K1ZxxBfHoYpSkHLAO92oa8O4SwFXA2A==",
      "license": "MIT",
      "dependencies": {
        "@types/cors": "^2.8.12",
        "@types/node": ">=10.0.0",
        "accepts": "~1.3.4",
        "base64id": "2.0.0",
        "cookie": "~0.7.2",
        "cors": "~2.8.5",
        "debug": "~4.4.1",
        "engine.io-parser": "~5.2.1",
        "ws": "~8.18.3"
      },
      "engines": {
        "node": ">=10.2.0"
      }
    },
    "node_modules/engine.io-parser": {
      "version": "5.2.3",
      "resolved": "https://registry.npmjs.org/engine.io-parser/-/engine.io-parser-5.2.3.tgz",
      "integrity": "sha512-HqD3yTBfnBxIrbnM1DoD6Pcq8NECnh8d4As1Qgh0z5Gg3jRRIqijury0CL3ghu/edArpUYiYqQiDUQBIs4np3Q==",
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/engine.io/node_modules/accepts": {
      "version": "1.3.8",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-1.3.8.tgz",
      "integrity": "sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "~2.1.34",
        "negotiator": "0.6.3"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/engine.io/node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/engine.io/node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/engine.io/node_modules/negotiator": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.3.tgz",
      "integrity": "sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.1.tgz",
      "integrity": "sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==",
      "license": "MIT"
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/express": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/express/-/express-5.2.1.tgz",
      "integrity": "sha512-hIS4idWWai69NezIdRt2xFVofaF4j+6INOpJlVOLDO8zXGpUVEVzIYk12UUi2JzjEzWL3IOAxcTubgz9Po0yXw==",
      "license": "MIT",
      "dependencies": {
        "accepts": "^2.0.0",
        "body-parser": "^2.2.1",
        "content-disposition": "^1.0.0",
        "content-type": "^1.0.5",
        "cookie": "^0.7.1",
        "cookie-signature": "^1.2.1",
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "finalhandler": "^2.1.0",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.0",
        "merge-descriptors": "^2.0.0",
        "mime-types": "^3.0.0",
        "on-finished": "^2.4.1",
        "once": "^1.4.0",
        "parseurl": "^1.3.3",
        "proxy-addr": "^2.0.7",
        "qs": "^6.14.0",
        "range-parser": "^1.2.1",
        "router": "^2.2.0",
        "send": "^1.1.0",
        "serve-static": "^2.2.0",
        "statuses": "^2.0.1",
        "type-is": "^2.0.1",
        "vary": "^1.1.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express-rate-limit": {
      "version": "8.3.2",
      "resolved": "https://registry.npmjs.org/express-rate-limit/-/express-rate-limit-8.3.2.tgz",
      "integrity": "sha512-77VmFeJkO0/rvimEDuUC5H30oqUC4EyOhyGccfqoLebB0oiEYfM7nwPrsDsBL1gsTpwfzX8SFy2MT3TDyRq+bg==",
      "license": "MIT",
      "dependencies": {
        "ip-address": "10.1.0"
      },
      "engines": {
        "node": ">= 16"
      },
      "funding": {
        "url": "https://github.com/sponsors/express-rate-limit"
      },
      "peerDependencies": {
        "express": ">= 4.11"
      }
    },
    "node_modules/express-validator": {
      "version": "7.3.1",
      "resolved": "https://registry.npmjs.org/express-validator/-/express-validator-7.3.1.tgz",
      "integrity": "sha512-IGenaSf+DnWc69lKuqlRE9/i/2t5/16VpH5bXoqdxWz1aCpRvEdrBuu1y95i/iL5QP8ZYVATiwLFhwk3EDl5vg==",
      "license": "MIT",
      "dependencies": {
        "lodash": "^4.17.21",
        "validator": "~13.15.23"
      },
      "engines": {
        "node": ">= 8.0.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "license": "MIT"
    },
    "node_modules/fast-sha256": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/fast-sha256/-/fast-sha256-1.3.0.tgz",
      "integrity": "sha512-n11RGP/lrWEFI/bWdygLxhI+pVeo1ZYIVwvvPkW7azl/rOy+F3HYRZ2K5zeE9mmkhQppyv9sQFx0JM9UabnpPQ==",
      "license": "Unlicense"
    },
    "node_modules/finalhandler": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-2.1.1.tgz",
      "integrity": "sha512-S8KoZgRZN+a5rNwqTxlZZePjT/4cnm0ROV70LedRHZ0p8u9fRID0hJUZQpkKLzro8LfmC8sx23bY6tVNxv8pQA==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "on-finished": "^2.4.1",
        "parseurl": "^1.3.3",
        "statuses": "^2.0.1"
      },
      "engines": {
        "node": ">= 18.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/fontkit": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/fontkit/-/fontkit-2.0.4.tgz",
      "integrity": "sha512-syetQadaUEDNdxdugga9CpEYVaQIxOwk7GlwZWWZ19//qW4zE5bknOKeMBDYAASwnpaSHKJITRLMF9m1fp3s6g==",
      "license": "MIT",
      "dependencies": {
        "@swc/helpers": "^0.5.12",
        "brotli": "^1.3.2",
        "clone": "^2.1.2",
        "dfa": "^1.2.0",
        "fast-deep-equal": "^3.1.3",
        "restructure": "^3.0.0",
        "tiny-inflate": "^1.0.3",
        "unicode-properties": "^1.4.0",
        "unicode-trie": "^2.0.0"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fresh": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-2.0.0.tgz",
      "integrity": "sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz",
      "integrity": "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==",
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/http-errors": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.1.tgz",
      "integrity": "sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "~2.0.0",
        "inherits": "~2.0.4",
        "setprototypeof": "~1.2.0",
        "statuses": "~2.0.2",
        "toidentifier": "~1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.7.2.tgz",
      "integrity": "sha512-im9DjEDQ55s9fL4EYzOAv0yMqmMBSZp6G0VvFyTMPKWxiSBHUj9NW/qqLmXUwXrrM7AvqSlTCfvqRb0cM8yYqw==",
      "license": "MIT",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "license": "ISC"
    },
    "node_modules/ip-address": {
      "version": "10.1.0",
      "resolved": "https://registry.npmjs.org/ip-address/-/ip-address-10.1.0.tgz",
      "integrity": "sha512-XXADHxXmvT9+CRxhXg56LJovE+bmWnEWB78LB83VZTprKTmaC5QfruXocxzTZ2Kl0DNwKuBdlIhjL8LeY8Sf8Q==",
      "license": "MIT",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/is-promise": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/is-promise/-/is-promise-4.0.0.tgz",
      "integrity": "sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ==",
      "license": "MIT"
    },
    "node_modules/js-md5": {
      "version": "0.8.3",
      "resolved": "https://registry.npmjs.org/js-md5/-/js-md5-0.8.3.tgz",
      "integrity": "sha512-qR0HB5uP6wCuRMrWPTrkMaev7MJZwJuuw4fnwAzRgP4J4/F8RwtodOKpGp4XpqsLBFzzgqIO42efFAyz2Et6KQ==",
      "license": "MIT"
    },
    "node_modules/jsonwebtoken": {
      "version": "9.0.3",
      "resolved": "https://registry.npmjs.org/jsonwebtoken/-/jsonwebtoken-9.0.3.tgz",
      "integrity": "sha512-MT/xP0CrubFRNLNKvxJ2BYfy53Zkm++5bX9dtuPbqAeQpTVe0MQTFhao8+Cp//EmJp244xt6Drw/GVEGCUj40g==",
      "license": "MIT",
      "dependencies": {
        "jws": "^4.0.1",
        "lodash.includes": "^4.3.0",
        "lodash.isboolean": "^3.0.3",
        "lodash.isinteger": "^4.0.4",
        "lodash.isnumber": "^3.0.3",
        "lodash.isplainobject": "^4.0.6",
        "lodash.isstring": "^4.0.1",
        "lodash.once": "^4.0.0",
        "ms": "^2.1.1",
        "semver": "^7.5.4"
      },
      "engines": {
        "node": ">=12",
        "npm": ">=6"
      }
    },
    "node_modules/jwa": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/jwa/-/jwa-2.0.1.tgz",
      "integrity": "sha512-hRF04fqJIP8Abbkq5NKGN0Bbr3JxlQ+qhZufXVr0DvujKy93ZCbXZMHDL4EOtodSbCWxOqR8MS1tXA5hwqCXDg==",
      "license": "MIT",
      "dependencies": {
        "buffer-equal-constant-time": "^1.0.1",
        "ecdsa-sig-formatter": "1.0.11",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/jws": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/jws/-/jws-4.0.1.tgz",
      "integrity": "sha512-EKI/M/yqPncGUUh44xz0PxSidXFr/+r0pA70+gIYhjv+et7yxM+s29Y+VGDkovRofQem0fs7Uvf4+YmAdyRduA==",
      "license": "MIT",
      "dependencies": {
        "jwa": "^2.0.1",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/kareem": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/kareem/-/kareem-3.2.0.tgz",
      "integrity": "sha512-VS8MWZz/cT+SqBCpVfNN4zoVz5VskR3N4+sTmUXme55e9avQHntpwpNq0yjnosISXqwJ3AQVjlbI4Dyzv//JtA==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/linebreak": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/linebreak/-/linebreak-1.1.0.tgz",
      "integrity": "sha512-MHp03UImeVhB7XZtjd0E4n6+3xr5Dq/9xI/5FptGk5FrbDR3zagPa2DS6U8ks/3HjbKWG9Q1M2ufOzxV2qLYSQ==",
      "license": "MIT",
      "dependencies": {
        "base64-js": "0.0.8",
        "unicode-trie": "^2.0.0"
      }
    },
    "node_modules/linebreak/node_modules/base64-js": {
      "version": "0.0.8",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-0.0.8.tgz",
      "integrity": "sha512-3XSA2cR/h/73EzlXXdU6YNycmYI7+kicTxks4eJg2g39biHR84slg2+des+p7iHYhbRg/udIS4TD53WabcOUkw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/lodash": {
      "version": "4.18.1",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.18.1.tgz",
      "integrity": "sha512-dMInicTPVE8d1e5otfwmmjlxkZoUpiVLwyeTdUsi/Caj/gfzzblBcCE5sRHV/AsjuCmxWrte2TNGSYuCeCq+0Q==",
      "license": "MIT"
    },
    "node_modules/lodash.includes": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/lodash.includes/-/lodash.includes-4.3.0.tgz",
      "integrity": "sha512-W3Bx6mdkRTGtlJISOvVD/lbqjTlPPUDTMnlXZFnVwi9NKJ6tiAk6LVdlhZMm17VZisqhKcgzpO5Wz91PCt5b0w==",
      "license": "MIT"
    },
    "node_modules/lodash.isboolean": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/lodash.isboolean/-/lodash.isboolean-3.0.3.tgz",
      "integrity": "sha512-Bz5mupy2SVbPHURB98VAcw+aHh4vRV5IPNhILUCsOzRmsTmSQ17jIuqopAentWoehktxGd9e/hbIXq980/1QJg==",
      "license": "MIT"
    },
    "node_modules/lodash.isinteger": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/lodash.isinteger/-/lodash.isinteger-4.0.4.tgz",
      "integrity": "sha512-DBwtEWN2caHQ9/imiNeEA5ys1JoRtRfY3d7V9wkqtbycnAmTvRRmbHKDV4a0EYc678/dia0jrte4tjYwVBaZUA==",
      "license": "MIT"
    },
    "node_modules/lodash.isnumber": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/lodash.isnumber/-/lodash.isnumber-3.0.3.tgz",
      "integrity": "sha512-QYqzpfwO3/CWf3XP+Z+tkQsfaLL/EnUlXWVkIk5FUPc4sBdTehEqZONuyRt2P67PXAk+NXmTBcc97zw9t1FQrw==",
      "license": "MIT"
    },
    "node_modules/lodash.isplainobject": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/lodash.isplainobject/-/lodash.isplainobject-4.0.6.tgz",
      "integrity": "sha512-oSXzaWypCMHkPC3NvBEaPHf0KsA5mvPrOPgQWDsbg8n7orZ290M0BmC/jgRZ4vcJ6DTAhjrsSYgdsW/F+MFOBA==",
      "license": "MIT"
    },
    "node_modules/lodash.isstring": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/lodash.isstring/-/lodash.isstring-4.0.1.tgz",
      "integrity": "sha512-0wJxfxH1wgO3GrbuP+dTTk7op+6L41QCXbGINEmD+ny/G/eCqGzxyCsh7159S+mgDDcoarnBw6PC1PS5+wUGgw==",
      "license": "MIT"
    },
    "node_modules/lodash.once": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/lodash.once/-/lodash.once-4.1.1.tgz",
      "integrity": "sha512-Sb487aTOCr9drQVL8pIxOzVhafOjZN9UU54hiN8PU3uAiSV7lx1yYNpbNmex2PK6dSJoNTSJUUswT651yww3Mg==",
      "license": "MIT"
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-1.1.0.tgz",
      "integrity": "sha512-aisnrDP4GNe06UcKFnV5bfMNPBUw4jsLGaWwWfnH3v02GnBuXX2MCVn5RbrWo0j3pczUilYblq7fQ7Nw2t5XKw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/memory-pager": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/memory-pager/-/memory-pager-1.5.0.tgz",
      "integrity": "sha512-ZS4Bp4r/Zoeq6+NLJpP+0Zzm0pR8whtGPf1XExKLJBAczGMnSi3It14OiNCStjQjM6NU1okjQGSxgEZN8eBYKg==",
      "license": "MIT"
    },
    "node_modules/merge-descriptors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-2.0.0.tgz",
      "integrity": "sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/mime-db": {
      "version": "1.54.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.54.0.tgz",
      "integrity": "sha512-aU5EJuIN2WDemCcAp2vFBfp/m4EAhWJnUNSSw0ixs7/kXbd6Pg64EmwJkNdFhB8aWt1sH2CTXrLxo/iAGV3oPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-3.0.2.tgz",
      "integrity": "sha512-Lbgzdk0h4juoQ9fCKXW4by0UJqj+nOOrI9MJ1sSj4nI8aI2eo1qmvQEie4VD1glsS250n15LsWsYtCugiStS5A==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "^1.54.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/mongodb": {
      "version": "7.1.0",
      "resolved": "https://registry.npmjs.org/mongodb/-/mongodb-7.1.0.tgz",
      "integrity": "sha512-kMfnKunbolQYwCIyrkxNJFB4Ypy91pYqua5NargS/f8ODNSJxT03ZU3n1JqL4mCzbSih8tvmMEMLpKTT7x5gCg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@mongodb-js/saslprep": "^1.3.0",
        "bson": "^7.1.1",
        "mongodb-connection-string-url": "^7.0.0"
      },
      "engines": {
        "node": ">=20.19.0"
      },
      "peerDependencies": {
        "@aws-sdk/credential-providers": "^3.806.0",
        "@mongodb-js/zstd": "^7.0.0",
        "gcp-metadata": "^7.0.1",
        "kerberos": "^7.0.0",
        "mongodb-client-encryption": ">=7.0.0 <7.1.0",
        "snappy": "^7.3.2",
        "socks": "^2.8.6"
      },
      "peerDependenciesMeta": {
        "@aws-sdk/credential-providers": {
          "optional": true
        },
        "@mongodb-js/zstd": {
          "optional": true
        },
        "gcp-metadata": {
          "optional": true
        },
        "kerberos": {
          "optional": true
        },
        "mongodb-client-encryption": {
          "optional": true
        },
        "snappy": {
          "optional": true
        },
        "socks": {
          "optional": true
        }
      }
    },
    "node_modules/mongodb-connection-string-url": {
      "version": "7.0.1",
      "resolved": "https://registry.npmjs.org/mongodb-connection-string-url/-/mongodb-connection-string-url-7.0.1.tgz",
      "integrity": "sha512-h0AZ9A7IDVwwHyMxmdMXKy+9oNlF0zFoahHiX3vQ8e3KFcSP3VmsmfvtRSuLPxmyv2vjIDxqty8smTgie/SNRQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@types/whatwg-url": "^13.0.0",
        "whatwg-url": "^14.1.0"
      },
      "engines": {
        "node": ">=20.19.0"
      }
    },
    "node_modules/mongoose": {
      "version": "9.2.4",
      "resolved": "https://registry.npmjs.org/mongoose/-/mongoose-9.2.4.tgz",
      "integrity": "sha512-XNh+jiztVMddDFDCv8TWxVxi/rGx+0FfsK3Ftj6hcYzEmhTcos2uC144OJRmUFPHSu3hJr6Pgip++Ab2+Da35Q==",
      "license": "MIT",
      "dependencies": {
        "kareem": "3.2.0",
        "mongodb": "~7.0",
        "mpath": "0.9.0",
        "mquery": "6.0.0",
        "ms": "2.1.3",
        "sift": "17.1.3"
      },
      "engines": {
        "node": ">=20.19.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/mongoose"
      }
    },
    "node_modules/mongoose/node_modules/mongodb": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/mongodb/-/mongodb-7.0.0.tgz",
      "integrity": "sha512-vG/A5cQrvGGvZm2mTnCSz1LUcbOPl83hfB6bxULKQ8oFZauyox/2xbZOoGNl+64m8VBrETkdGCDBdOsCr3F3jg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@mongodb-js/saslprep": "^1.3.0",
        "bson": "^7.0.0",
        "mongodb-connection-string-url": "^7.0.0"
      },
      "engines": {
        "node": ">=20.19.0"
      },
      "peerDependencies": {
        "@aws-sdk/credential-providers": "^3.806.0",
        "@mongodb-js/zstd": "^7.0.0",
        "gcp-metadata": "^7.0.1",
        "kerberos": "^7.0.0",
        "mongodb-client-encryption": ">=7.0.0 <7.1.0",
        "snappy": "^7.3.2",
        "socks": "^2.8.6"
      },
      "peerDependenciesMeta": {
        "@aws-sdk/credential-providers": {
          "optional": true
        },
        "@mongodb-js/zstd": {
          "optional": true
        },
        "gcp-metadata": {
          "optional": true
        },
        "kerberos": {
          "optional": true
        },
        "mongodb-client-encryption": {
          "optional": true
        },
        "snappy": {
          "optional": true
        },
        "socks": {
          "optional": true
        }
      }
    },
    "node_modules/mpath": {
      "version": "0.9.0",
      "resolved": "https://registry.npmjs.org/mpath/-/mpath-0.9.0.tgz",
      "integrity": "sha512-ikJRQTk8hw5DEoFVxHG1Gn9T/xcjtdnOKIU1JTmGjZZlg9LST2mBLmcX3/ICIbgJydT2GOc15RnNy5mHmzfSew==",
      "license": "MIT",
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/mquery": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/mquery/-/mquery-6.0.0.tgz",
      "integrity": "sha512-b2KQNsmgtkscfeDgkYMcWGn9vZI9YoXh802VDEwE6qc50zxBFQ0Oo8ROkawbPAsXCY1/Z1yp0MagqsZStPWJjw==",
      "license": "MIT",
      "engines": {
        "node": ">=20.19.0"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/multer": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/multer/-/multer-2.1.1.tgz",
      "integrity": "sha512-mo+QTzKlx8R7E5ylSXxWzGoXoZbOsRMpyitcht8By2KHvMbf3tjwosZ/Mu/XYU6UuJ3VZnODIrak5ZrPiPyB6A==",
      "license": "MIT",
      "dependencies": {
        "append-field": "^1.0.0",
        "busboy": "^1.6.0",
        "concat-stream": "^2.0.0",
        "type-is": "^1.6.18"
      },
      "engines": {
        "node": ">= 10.16.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/multer/node_modules/media-typer": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-0.3.0.tgz",
      "integrity": "sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/multer/node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/multer/node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/multer/node_modules/type-is": {
      "version": "1.6.18",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-1.6.18.tgz",
      "integrity": "sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==",
      "license": "MIT",
      "dependencies": {
        "media-typer": "0.3.0",
        "mime-types": "~2.1.24"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/negotiator": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-1.0.0.tgz",
      "integrity": "sha512-8Ofs/AUQh8MaEcrlq5xOX0CQ9ypTF5dl78mjlMNfOK08fzpgTHQRQPBxcPlEtIw0yRpws+Zo/3r+5WRby7u3Gg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/nodemailer": {
      "version": "8.0.5",
      "resolved": "https://registry.npmjs.org/nodemailer/-/nodemailer-8.0.5.tgz",
      "integrity": "sha512-0PF8Yb1yZuQfQbq+5/pZJrtF6WQcjTd5/S4JOHs9PGFxuTqoB/icwuB44pOdURHJbRKX1PPoJZtY7R4VUoCC8w==",
      "license": "MIT-0",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/on-finished": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.1.tgz",
      "integrity": "sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/once": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/once/-/once-1.4.0.tgz",
      "integrity": "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==",
      "license": "ISC",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/pako": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/pako/-/pako-0.2.9.tgz",
      "integrity": "sha512-NUcwaKxUxWrZLpDG+z/xZaCgQITkA/Dv4V/T6bw7VON6l1Xz/VnrBqrYjZQ12TamKHzITTfOEIYUj48y2KXImA==",
      "license": "MIT"
    },
    "node_modules/parseurl": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz",
      "integrity": "sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/path-to-regexp": {
      "version": "8.4.2",
      "resolved": "https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-8.4.2.tgz",
      "integrity": "sha512-qRcuIdP69NPm4qbACK+aDogI5CBDMi1jKe0ry5rSQJz8JVLsC7jV8XpiJjGRLLol3N+R5ihGYcrPLTno6pAdBA==",
      "license": "MIT",
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/pdfkit": {
      "version": "0.18.0",
      "resolved": "https://registry.npmjs.org/pdfkit/-/pdfkit-0.18.0.tgz",
      "integrity": "sha512-NvUwSDZ0eYEzqAiWwVQkRkjYUkZ48kcsHuCO31ykqPPIVkwoSDjDGiwIgHHNtsiwls3z3P/zy4q00hl2chg2Ug==",
      "license": "MIT",
      "dependencies": {
        "@noble/ciphers": "^1.0.0",
        "@noble/hashes": "^1.6.0",
        "fontkit": "^2.0.4",
        "js-md5": "^0.8.3",
        "linebreak": "^1.1.0",
        "png-js": "^1.0.0"
      }
    },
    "node_modules/png-js": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/png-js/-/png-js-1.0.0.tgz",
      "integrity": "sha512-k+YsbhpA9e+EFfKjTCH3VW6aoKlyNYI6NYdTfDL4CIvFnvsuO84ttonmZE7rc+v23SLTH8XX+5w/Ak9v0xGY4g=="
    },
    "node_modules/postal-mime": {
      "version": "2.7.4",
      "resolved": "https://registry.npmjs.org/postal-mime/-/postal-mime-2.7.4.tgz",
      "integrity": "sha512-0WdnFQYUrPGGTFu1uOqD2s7omwua8xaeYGdO6rb88oD5yJ/4pPHDA4sdWqfD8wQVfCny563n/HQS7zTFft+f/g==",
      "license": "MIT-0"
    },
    "node_modules/proxy-addr": {
      "version": "2.0.7",
      "resolved": "https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.7.tgz",
      "integrity": "sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==",
      "license": "MIT",
      "dependencies": {
        "forwarded": "0.2.0",
        "ipaddr.js": "1.9.1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/qs": {
      "version": "6.15.0",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.15.0.tgz",
      "integrity": "sha512-mAZTtNCeetKMH+pSjrb76NAM8V9a05I9aBZOHztWy/UqcJdQYNsf59vrRKWnojAT9Y+GbIvoTBC++CPHqpDBhQ==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/range-parser": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/range-parser/-/range-parser-1.2.1.tgz",
      "integrity": "sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/raw-body": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/raw-body/-/raw-body-3.0.2.tgz",
      "integrity": "sha512-K5zQjDllxWkf7Z5xJdV0/B0WTNqx6vxG70zJE4N0kBs4LovmEYWJzQGxC9bS9RAKu3bgM40lrd5zoLJ12MQ5BA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.7.0",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/readable-stream": {
      "version": "3.6.2",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-3.6.2.tgz",
      "integrity": "sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==",
      "license": "MIT",
      "dependencies": {
        "inherits": "^2.0.3",
        "string_decoder": "^1.1.1",
        "util-deprecate": "^1.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/resend": {
      "version": "6.11.0",
      "resolved": "https://registry.npmjs.org/resend/-/resend-6.11.0.tgz",
      "integrity": "sha512-S9gxOccfwc+E6Cr3q28Gu8NkiIjYlYPlj9rqk4zkIuzlEoh8sWu/IvJSg7U7t+o3g0Ov2IOCzcneUaCi/M/WdQ==",
      "license": "MIT",
      "dependencies": {
        "postal-mime": "2.7.4",
        "svix": "1.90.0"
      },
      "engines": {
        "node": ">=20"
      },
      "peerDependencies": {
        "@react-email/render": "*"
      },
      "peerDependenciesMeta": {
        "@react-email/render": {
          "optional": true
        }
      }
    },
    "node_modules/restructure": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/restructure/-/restructure-3.0.2.tgz",
      "integrity": "sha512-gSfoiOEA0VPE6Tukkrr7I0RBdE0s7H1eFCDBk05l1KIQT1UIKNc5JZy6jdyW6eYH3aR3g5b3PuL77rq0hvwtAw==",
      "license": "MIT"
    },
    "node_modules/router": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/router/-/router-2.2.0.tgz",
      "integrity": "sha512-nLTrUKm2UyiL7rlhapu/Zl45FwNgkZGaCpZbIHajDYgwlJCOzLSk+cIPAnsEqV955GjILJnKbdQC1nVPz+gAYQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "is-promise": "^4.0.0",
        "parseurl": "^1.3.3",
        "path-to-regexp": "^8.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "7.7.4",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.7.4.tgz",
      "integrity": "sha512-vFKC2IEtQnVhpT78h1Yp8wzwrf8CM+MzKMHGJZfBtzhZNycRFnXsHk6E5TxIkkMsgNS7mdX3AGB7x2QM2di4lA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/send": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/send/-/send-1.2.1.tgz",
      "integrity": "sha512-1gnZf7DFcoIcajTjTwjwuDjzuz4PPcY2StKPlsGAQ1+YH20IRVrBaXSWmdjowTJ6u8Rc01PoYOGHXfP1mYcZNQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.3",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.1",
        "mime-types": "^3.0.2",
        "ms": "^2.1.3",
        "on-finished": "^2.4.1",
        "range-parser": "^1.2.1",
        "statuses": "^2.0.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/serve-static": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-2.2.1.tgz",
      "integrity": "sha512-xRXBn0pPqQTVQiC8wyQrKs2MOlX24zQ0POGaj0kultvoOCstBQM5yvOhAVSUwOMjQtTvsPWoNCHfPGwaaQJhTw==",
      "license": "MIT",
      "dependencies": {
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "parseurl": "^1.3.3",
        "send": "^1.2.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/setprototypeof": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/setprototypeof/-/setprototypeof-1.2.0.tgz",
      "integrity": "sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==",
      "license": "ISC"
    },
    "node_modules/side-channel": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.0.tgz",
      "integrity": "sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3",
        "side-channel-list": "^1.0.0",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.0.tgz",
      "integrity": "sha512-FCLHtRD/gnpCiCHEiJLOwdmFP+wzCmDEkc9y7NsYxeF4u7Btsn1ZuwgwJGxImImHicJArLP4R0yX4c2KCrMrTA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/sift": {
      "version": "17.1.3",
      "resolved": "https://registry.npmjs.org/sift/-/sift-17.1.3.tgz",
      "integrity": "sha512-Rtlj66/b0ICeFzYTuNvX/EF1igRbbnGSvEyT79McoZa/DeGhMyC5pWKOEsZKnpkqtSeovd5FL/bjHWC3CIIvCQ==",
      "license": "MIT"
    },
    "node_modules/socket.io": {
      "version": "4.8.3",
      "resolved": "https://registry.npmjs.org/socket.io/-/socket.io-4.8.3.tgz",
      "integrity": "sha512-2Dd78bqzzjE6KPkD5fHZmDAKRNe3J15q+YHDrIsy9WEkqttc7GY+kT9OBLSMaPbQaEd0x1BjcmtMtXkfpc+T5A==",
      "license": "MIT",
      "dependencies": {
        "accepts": "~1.3.4",
        "base64id": "~2.0.0",
        "cors": "~2.8.5",
        "debug": "~4.4.1",
        "engine.io": "~6.6.0",
        "socket.io-adapter": "~2.5.2",
        "socket.io-parser": "~4.2.4"
      },
      "engines": {
        "node": ">=10.2.0"
      }
    },
    "node_modules/socket.io-adapter": {
      "version": "2.5.6",
      "resolved": "https://registry.npmjs.org/socket.io-adapter/-/socket.io-adapter-2.5.6.tgz",
      "integrity": "sha512-DkkO/dz7MGln0dHn5bmN3pPy+JmywNICWrJqVWiVOyvXjWQFIv9c2h24JrQLLFJ2aQVQf/Cvl1vblnd4r2apLQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "~4.4.1",
        "ws": "~8.18.3"
      }
    },
    "node_modules/socket.io-parser": {
      "version": "4.2.6",
      "resolved": "https://registry.npmjs.org/socket.io-parser/-/socket.io-parser-4.2.6.tgz",
      "integrity": "sha512-asJqbVBDsBCJx0pTqw3WfesSY0iRX+2xzWEWzrpcH7L6fLzrhyF8WPI8UaeM4YCuDfpwA/cgsdugMsmtz8EJeg==",
      "license": "MIT",
      "dependencies": {
        "@socket.io/component-emitter": "~3.1.0",
        "debug": "~4.4.1"
      },
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/socket.io/node_modules/accepts": {
      "version": "1.3.8",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-1.3.8.tgz",
      "integrity": "sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "~2.1.34",
        "negotiator": "0.6.3"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/socket.io/node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/socket.io/node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/socket.io/node_modules/negotiator": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.3.tgz",
      "integrity": "sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/sparse-bitfield": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/sparse-bitfield/-/sparse-bitfield-3.0.3.tgz",
      "integrity": "sha512-kvzhi7vqKTfkh0PZU+2D2PIllw2ymqJKujUcyPMd9Y75Nv4nPbGJZXNhxsgdQab2BmlDct1YnfQCguEvHr7VsQ==",
      "license": "MIT",
      "dependencies": {
        "memory-pager": "^1.0.2"
      }
    },
    "node_modules/standardwebhooks": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/standardwebhooks/-/standardwebhooks-1.0.0.tgz",
      "integrity": "sha512-BbHGOQK9olHPMvQNHWul6MYlrRTAOKn03rOe4A8O3CLWhNf4YHBqq2HJKKC+sfqpxiBY52pNeesD6jIiLDz8jg==",
      "license": "MIT",
      "dependencies": {
        "@stablelib/base64": "^1.0.0",
        "fast-sha256": "^1.3.0"
      }
    },
    "node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/streamsearch": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/streamsearch/-/streamsearch-1.1.0.tgz",
      "integrity": "sha512-Mcc5wHehp9aXz1ax6bZUyY5afg9u2rv5cqQI3mRrYkGC8rW2hM02jWuwjtL++LS5qinSyhj2QfLyNsuc+VsExg==",
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/string_decoder": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.3.0.tgz",
      "integrity": "sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.2.0"
      }
    },
    "node_modules/svix": {
      "version": "1.90.0",
      "resolved": "https://registry.npmjs.org/svix/-/svix-1.90.0.tgz",
      "integrity": "sha512-ljkZuyy2+IBEoESkIpn8sLM+sxJHQcPxlZFxU+nVDhltNfUMisMBzWX/UR8SjEnzoI28ZjCzMbmYAPwSTucoMw==",
      "license": "MIT",
      "dependencies": {
        "standardwebhooks": "1.0.0",
        "uuid": "^10.0.0"
      }
    },
    "node_modules/tiny-inflate": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/tiny-inflate/-/tiny-inflate-1.0.3.tgz",
      "integrity": "sha512-pkY1fj1cKHb2seWDy0B16HeWyczlJA9/WW3u3c4z/NiWDsO3DOU5D7nhTLE9CF0yXv/QZFY7sEJmj24dK+Rrqw==",
      "license": "MIT"
    },
    "node_modules/toidentifier": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/toidentifier/-/toidentifier-1.0.1.tgz",
      "integrity": "sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/tr46": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/tr46/-/tr46-5.1.1.tgz",
      "integrity": "sha512-hdF5ZgjTqgAntKkklYw0R03MG2x/bSzTtkxmIRw/sTNV8YXsCJ1tfLAX23lhxhHJlEf3CRCOCGGWw3vI3GaSPw==",
      "license": "MIT",
      "dependencies": {
        "punycode": "^2.3.1"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/type-is": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-2.0.1.tgz",
      "integrity": "sha512-OZs6gsjF4vMp32qrCbiVSkrFmXtG/AZhY3t0iAMrMBiAZyV9oALtXO8hsrHbMXF9x6L3grlFuwW2oAz7cav+Gw==",
      "license": "MIT",
      "dependencies": {
        "content-type": "^1.0.5",
        "media-typer": "^1.1.0",
        "mime-types": "^3.0.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/typedarray": {
      "version": "0.0.6",
      "resolved": "https://registry.npmjs.org/typedarray/-/typedarray-0.0.6.tgz",
      "integrity": "sha512-/aCDEGatGvZ2BIk+HmLf4ifCJFwvKFNb9/JeZPMulfgFracn9QFcAf5GO8B/mweUjSoblS5In0cWhqpfs/5PQA==",
      "license": "MIT"
    },
    "node_modules/undici-types": {
      "version": "7.18.2",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.18.2.tgz",
      "integrity": "sha512-AsuCzffGHJybSaRrmr5eHr81mwJU3kjw6M+uprWvCXiNeN9SOGwQ3Jn8jb8m3Z6izVgknn1R0FTCEAP2QrLY/w==",
      "license": "MIT"
    },
    "node_modules/unicode-properties": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/unicode-properties/-/unicode-properties-1.4.1.tgz",
      "integrity": "sha512-CLjCCLQ6UuMxWnbIylkisbRj31qxHPAurvena/0iwSVbQ2G1VY5/HjV0IRabOEbDHlzZlRdCrD4NhB0JtU40Pg==",
      "license": "MIT",
      "dependencies": {
        "base64-js": "^1.3.0",
        "unicode-trie": "^2.0.0"
      }
    },
    "node_modules/unicode-trie": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/unicode-trie/-/unicode-trie-2.0.0.tgz",
      "integrity": "sha512-x7bc76x0bm4prf1VLg79uhAzKw8DVboClSN5VxJuQ+LKDOVEW9CdH+VY7SP+vX7xCYQqzzgQpFqz15zeLvAtZQ==",
      "license": "MIT",
      "dependencies": {
        "pako": "^0.2.5",
        "tiny-inflate": "^1.0.0"
      }
    },
    "node_modules/unpipe": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/unpipe/-/unpipe-1.0.0.tgz",
      "integrity": "sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "license": "MIT"
    },
    "node_modules/uuid": {
      "version": "10.0.0",
      "resolved": "https://registry.npmjs.org/uuid/-/uuid-10.0.0.tgz",
      "integrity": "sha512-8XkAphELsDnEGrDxUOHB3RGvXz6TeuYSGEZBOjtTtPm2lwhGBjLgOzLHB63IUWfBpNucQjND6d3AOudO+H3RWQ==",
      "funding": [
        "https://github.com/sponsors/broofa",
        "https://github.com/sponsors/ctavan"
      ],
      "license": "MIT",
      "bin": {
        "uuid": "dist/bin/uuid"
      }
    },
    "node_modules/validator": {
      "version": "13.15.26",
      "resolved": "https://registry.npmjs.org/validator/-/validator-13.15.26.tgz",
      "integrity": "sha512-spH26xU080ydGggxRyR1Yhcbgx+j3y5jbNXk/8L+iRvdIEQ4uTRH2Sgf2dokud6Q4oAtsbNvJ1Ft+9xmm6IZcA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/vary": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/vary/-/vary-1.1.2.tgz",
      "integrity": "sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/webidl-conversions": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/webidl-conversions/-/webidl-conversions-7.0.0.tgz",
      "integrity": "sha512-VwddBukDzu71offAQR975unBIGqfKZpM+8ZX6ySk8nYhVoo5CYaZyzt3YBvYtRtO+aoGlqxPg/B87NGVZ/fu6g==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/whatwg-url": {
      "version": "14.2.0",
      "resolved": "https://registry.npmjs.org/whatwg-url/-/whatwg-url-14.2.0.tgz",
      "integrity": "sha512-De72GdQZzNTUBBChsXueQUnPKDkg/5A5zp7pFDuQAj5UFoENpiACU0wlCvzpAGnTkj++ihpKwKyYewn/XNUbKw==",
      "license": "MIT",
      "dependencies": {
        "tr46": "^5.1.0",
        "webidl-conversions": "^7.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/wrappy": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz",
      "integrity": "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==",
      "license": "ISC"
    },
    "node_modules/ws": {
      "version": "8.18.3",
      "resolved": "https://registry.npmjs.org/ws/-/ws-8.18.3.tgz",
      "integrity": "sha512-PEIGCY5tSlUt50cqyMXfCzX+oOPqN0vuGqWzbcJ2xvnkzkq46oOpz7dQaTDBdfICb4N14+GARUDw2XV2N4tvzg==",
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      },
      "peerDependencies": {
        "bufferutil": "^4.0.1",
        "utf-8-validate": ">=5.0.2"
      },
      "peerDependenciesMeta": {
        "bufferutil": {
          "optional": true
        },
        "utf-8-validate": {
          "optional": true
        }
      }
    }
  }
}
```

## National_Vitality_Eye/Server/package.json

```text
{
  "name": "server",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node server.js",
    "dev": "nodemon server.js",
    "create-admins": "node scripts/createAdmins.js",
     "test-ai": "node scripts/testAIPerformance.js",
    "create-indexes": "node scripts/createIndexes.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.3.2",
    "express-validator": "^7.3.1",
    "jsonwebtoken": "^9.0.3",
    "mongodb": "^7.1.0",
    "mongoose": "^9.2.4",
    "multer": "^2.1.1",
    "nodemailer": "^8.0.4",
    "pdfkit": "^0.18.0",
    "resend": "^6.11.0",
    "socket.io": "^4.8.3"
  }
}
```

## National_Vitality_Eye/Server/public/register.html

```text
<!DOCTYPE html>
<html>
<head>
    <title>Register - Zimbabwe Health System</title>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c5f2d; margin-top: 0; }
        h2 { color: #333; font-size: 18px; margin-top: 0; }
        .form-group { margin-bottom: 15px; }
        label { display: block; font-weight: bold; margin-bottom: 5px; color: #555; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box; }
        button { background: #2c5f2d; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; }
        button:hover { background: #1e451f; }
        .error { color: red; margin-top: 10px; padding: 10px; background: #ffebee; border-radius: 5px; }
        .success { color: green; margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 5px; }
        hr { margin: 20px 0; }
        .required { color: red; }
        small { color: #777; font-size: 12px; display: block; margin-top: 5px; }
        .file-info { background: #f9f9f9; padding: 8px; border-radius: 4px; margin-top: 5px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏥 Zimbabwe National Health System</h1>
        <h2>User Registration with Document Verification</h2>
        <p>Please fill in all required fields and upload your verification documents. Your application will be reviewed by an administrator.</p>
        <form id="registerForm" enctype="multipart/form-data">
            <div class="form-group">
                <label>First Name <span class="required">*</span></label>
                <input type="text" name="firstName" required>
            </div>
            <div class="form-group">
                <label>Last Name <span class="required">*</span></label>
                <input type="text" name="lastName" required>
            </div>
            <div class="form-group">
                <label>Email <span class="required">*</span></label>
                <input type="email" name="email" required>
            </div>
            <div class="form-group">
                <label>Phone Number <span class="required">*</span></label>
                <input type="text" name="phoneNumber" placeholder="+263771234567" required>
                <small>Format: +263712345678 or 0712345678</small>
            </div>
            <div class="form-group">
                <label>Employee ID <span class="required">*</span></label>
                <input type="text" name="employeeId" required>
                <small>Your hospital employee/staff ID number</small>
            </div>
            <div class="form-group">
                <label>Hospital Name <span class="required">*</span></label>
                <input type="text" name="hospitalName" required>
            </div>
            <div class="form-group">
                <label>Hospital ID <span class="required">*</span></label>
                <input type="text" name="hospitalId" required>
                <small>Your hospital's registration code</small>
            </div>
            <div class="form-group">
                <label>Province <span class="required">*</span></label>
                <select name="province" required>
                    <option value="">Select Province</option>
                    <option value="Harare">Harare</option>
                    <option value="Bulawayo">Bulawayo</option>
                    <option value="Manicaland">Manicaland</option>
                    <option value="Mashonaland Central">Mashonaland Central</option>
                    <option value="Mashonaland East">Mashonaland East</option>
                    <option value="Mashonaland West">Mashonaland West</option>
                    <option value="Masvingo">Masvingo</option>
                    <option value="Matabeleland North">Matabeleland North</option>
                    <option value="Matabeleland South">Matabeleland South</option>
                    <option value="Midlands">Midlands</option>
                </select>
            </div>
            <div class="form-group">
                <label>Position <span class="required">*</span></label>
                <input type="text" name="position" placeholder="e.g., Senior Doctor, Registered Nurse" required>
            </div>
            <hr>
            <h3>📄 Verification Documents</h3>
            <p>Please upload clear copies of your identification and employment verification.</p>
            <div class="form-group">
                <label>National ID <span class="required">*</span></label>
                <input type="file" name="nationalId" accept=".pdf,.jpg,.jpeg,.png" required>
                <div class="file-info">Accepted formats: PDF, JPG, PNG (Max 5MB)</div>
                <small>Upload a scanned copy or clear photo of your National ID</small>
            </div>
            <div class="form-group">
                <label>Employment Verification Letter <span class="required">*</span></label>
                <input type="file" name="employmentLetter" accept=".pdf,.jpg,.jpeg,.png" required>
                <div class="file-info">Accepted formats: PDF, JPG, PNG (Max 5MB)</div>
                <small>Upload your employment contract or verification letter from your hospital</small>
            </div>
            <div class="form-group">
                <label>Practicing License</label>
                <input type="file" name="practicingLicense" accept=".pdf,.jpg,.jpeg,.png">
                <div class="file-info">Accepted formats: PDF, JPG, PNG (Max 5MB)</div>
                <small>If you are a doctor, nurse, or medical professional (optional)</small>
            </div>
            <div class="form-group">
                <label>Profile Photo</label>
                <input type="file" name="profilePhoto" accept=".jpg,.jpeg,.png">
                <div class="file-info">Accepted formats: JPG, PNG (Max 5MB)</div>
                <small>Optional: Upload a recent photo for your profile</small>
            </div>
            <button type="submit">Submit Registration</button>
        </form>
        <div id="message"></div>
    </div>
    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const messageDiv = document.getElementById('message');
            const submitBtn = e.target.querySelector('button');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (response.ok) {
                    messageDiv.innerHTML = `
                        <div class="success">
                            ✅ ${data.message}<br><br>
                            <strong>Your User ID:</strong> ${data.userId}<br>
                            <strong>Status:</strong> ${data.approvalStatus}<br>
                            <strong>Documents Uploaded:</strong><br>
                            • National ID: ${data.documentsUploaded.nationalId ? '✅' : '❌'}<br>
                            • Employment Letter: ${data.documentsUploaded.employmentLetter ? '✅' : '❌'}<br>
                            • Practicing License: ${data.documentsUploaded.practicingLicense ? '✅' : 'Optional'}<br>
                            • Profile Photo: ${data.documentsUploaded.profilePhoto ? '✅' : 'Optional'}<br><br>
                            You will receive credentials via email once your documents are reviewed by an administrator.
                        </div>
                    `;
                    e.target.reset();
                } else {
                    messageDiv.innerHTML = `<div class="error">❌ ${data.error || 'Registration failed'}</div>`;
                }
            } catch (error) {
                messageDiv.innerHTML = `<div class="error">❌ Network error: ${error.message}</div>`;
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Registration';
            }
        });
    </script>
</body>
</html>
```

## National_Vitality_Eye/Server/routes/aiFeaturesRoutes.js

```text
const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");
const { predictTriagePriority } = require("../utils/triageAI");
router.use(protect, isApproved);
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
function calculateStats(values) {
    if (!values.length) return { avg: null, stdDev: null, min: null, max: null };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return { avg, stdDev, min: Math.min(...values), max: Math.max(...values) };
}
async function getPatientPrimaryDiagnosis(patientId) {
    const latestRecord = await MedicalRecord.findOne({ patientId })
        .sort({ visitDate: -1 });
    return latestRecord?.primaryDiagnosis?.name || latestRecord?.disease || null;
}
async function getPatientOutcome(patientId) {
    const latestRecord = await MedicalRecord.findOne({ patientId })
        .sort({ visitDate: -1 });
    return latestRecord?.disposition || "Unknown";
}
const outcomeWeight = {
    "Discharged": 1.0,
    "Recovered": 1.0,
    "Admitted": 0.6,
    "Transferred": 0.4,
    "Left Against Medical Advice": 0.3,
    "Deceased": 0
};
router.post("/anomaly-detection/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        const vitalSignsHistory = await MedicalRecord.find(
            { patientId: req.params.patientId },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: -1 }).limit(30);
        const currentVitals = req.body.currentVitals || vitalSignsHistory[0]?.vitalSigns || {};
        const validRecords = vitalSignsHistory.filter(v => v && v.vitalSigns);
        const anomalies = [];
        if (validRecords.length >= 3) {
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
                        clinicalSignificance: currentVitals.oxygenSaturation < 92 ? "Hypoxemia -可能需要 supplemental oxygen" : "Monitor closely"
                    });
                }
            }
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
        const anomalyScore = anomalies.reduce((sum, a) => {
            const weight = a.severity === "CRITICAL" ? 100 : a.severity === "HIGH" ? 70 : a.severity === "MEDIUM" ? 40 : 10;
            return sum + weight;
        }, 0);
        const riskLevel = anomalyScore >= 100 ? "CRITICAL" : anomalyScore >= 70 ? "HIGH" : anomalyScore >= 40 ? "MODERATE" : "LOW";
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
router.post("/similar-patients/:patientId", hasPermission("view:analytics"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        const limit = req.body.limit || 10;
        const allPatients = await Patient.find({ 
            _id: { $ne: req.params.patientId },
            isActive: true 
        }).limit(200);
        const similarities = [];
        for (const otherPatient of allPatients) {
            let totalScore = 0;
            let maxPossibleScore = 0;
            const matchingFactors = [];
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
            if (patient.gender && otherPatient.gender && patient.gender === otherPatient.gender) {
                totalScore += 15;
                matchingFactors.push(`Same gender (${patient.gender})`);
            }
            maxPossibleScore += 15;
            if (patient.province && otherPatient.province && patient.province === otherPatient.province) {
                totalScore += 15;
                matchingFactors.push(`Same province (${patient.province})`);
            }
            maxPossibleScore += 15;
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
            const diagnosisA = await getPatientPrimaryDiagnosis(patient._id);
            const diagnosisB = await getPatientPrimaryDiagnosis(otherPatient._id);
            if (diagnosisA && diagnosisB && diagnosisA === diagnosisB) {
                totalScore += 15;
                matchingFactors.push(`Same primary diagnosis (${diagnosisA})`);
            } else if (diagnosisA && diagnosisB && diagnosisA !== diagnosisB) {
                const partialScore = 8;
                totalScore += partialScore;
                matchingFactors.push(`Similar diagnosis profile`);
            }
            maxPossibleScore += 15;
            let rawScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
            rawScore = Math.min(Math.round(rawScore), 100);
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
module.exports = router;
```

## National_Vitality_Eye/Server/routes/authRoutes.js

```text
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { hasRole, isApproved } = require("../middleware/rbac");
const { validateRegistration, validateLogin, validatePasswordChange } = require("../middleware/validation");
const { uploadDocuments, handleUploadError } = require("../middleware/upload");
const { sendApprovalEmail, sendRejectionEmail, sendRegistrationConfirmation } = require("../utils/emailService");
const router = express.Router();
const generateUserId = (firstName) => {
    const prefix = firstName.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
};
router.post("/register", uploadDocuments, handleUploadError, validateRegistration, async (req, res) => {
    try {
        const {
            firstName, lastName, email, phoneNumber,
            employeeId, hospitalName, hospitalId,
            province, position, qualifications
        } = req.body;
        const existingUser = await User.findOne({
            $or: [{ email }, { employeeId }]
        });
        if (existingUser) {
            if (req.files) {
                Object.values(req.files).forEach(fileArray => {
                    fileArray.forEach(file => {
                        try {
                            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                        } catch (e) {}
                    });
                });
            }
            return res.status(400).json({
                error: "User with this email or employee ID already exists"
            });
        }
        const verificationDocuments = {};
        if (req.files) {
            if (req.files.nationalId) verificationDocuments.nationalId = req.files.nationalId[0].path;
            if (req.files.employmentLetter) verificationDocuments.employmentLetter = req.files.employmentLetter[0].path;
            if (req.files.practicingLicense) verificationDocuments.practicingLicense = req.files.practicingLicense[0].path;
            if (req.files.profilePhoto) verificationDocuments.profilePhoto = req.files.profilePhoto[0].path;
        }
        if (!verificationDocuments.nationalId) {
            return res.status(400).json({ error: "National ID document is required" });
        }
        if (!verificationDocuments.employmentLetter) {
            return res.status(400).json({ error: "Employment verification letter is required" });
        }
        const userId = generateUserId(firstName);
        const user = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            employeeId,
            hospitalName,
            hospitalId,
            province,
            position,
            qualifications: qualifications ? qualifications.split(",") : [],
            verificationDocuments,
            userId,
            role: "pending",
            approvalStatus: "pending",
            isActive: true
        });
        await sendRegistrationConfirmation(
            user.email,
            `${user.firstName} ${user.lastName}`,
            user.userId
        );
        res.status(201).json({
            message: "Registration successful! Your documents have been submitted for review.",
            userId: user.userId,
            approvalStatus: user.approvalStatus,
            documentsUploaded: {
                nationalId: !!verificationDocuments.nationalId,
                employmentLetter: !!verificationDocuments.employmentLetter,
                practicingLicense: !!verificationDocuments.practicingLicense,
                profilePhoto: !!verificationDocuments.profilePhoto
            }
        });
    } catch (error) {
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    try {
                        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    } catch (e) {}
                });
            });
        }
        console.error("Registration error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.post("/login", validateLogin, async (req, res) => {
    try {
        const { userId, password } = req.body;
        console.log("=== LOGIN ATTEMPT ===");
        console.log("User ID:", userId);
        const user = await User.findOne({ userId }).select("+password");
        if (!user) {
            console.log("User not found:", userId);
            return res.status(401).json({ error: "Invalid User ID or password" });
        }
        console.log("User found:", user.userId);
        console.log("Role:", user.role);
        console.log("Has password:", !!user.password);
        console.log("Approval status:", user.approvalStatus);
        console.log("Is active:", user.isActive);
        if (!user.password) {
            console.log("No password set - user not approved");
            return res.status(401).json({
                error: "Account not yet approved. Please wait for admin approval."
            });
        }
        const isValid = await bcrypt.compare(password, user.password);
        console.log("Password valid:", isValid);
        if (!isValid) {
            console.log("Invalid password for user:", userId);
            return res.status(401).json({ error: "Invalid User ID or password" });
        }
        if (!user.isActive) {
            console.log("Account deactivated:", userId);
            return res.status(403).json({ error: "Account is deactivated. Contact admin." });
        }
        if (user.approvalStatus !== "approved") {
            console.log("Account not approved:", user.approvalStatus);
            return res.status(403).json({
                error: `Account ${user.approvalStatus}. Please wait for admin approval.`
            });
        }
        user.lastLogin = new Date();
        await user.save();
        const token = jwt.sign(
            { id: user._id, userId: user.userId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        console.log("Login successful for:", userId);
        console.log("====================");
        res.json({
            message: "Login successful",
            token,
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                approvalStatus: user.approvalStatus,
                hospitalName: user.hospitalName,
                province: user.province
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/admin/pending-users", protect, hasRole("admin"), async (req, res) => {
    try {
        const pendingUsers = await User.find({
            approvalStatus: "pending",
            role: "pending"
        }).select("-password");
        res.json(pendingUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post("/admin/process-approval/:userId", protect, hasRole("admin"), async (req, res) => {
    try {
        const { action, role, rejectionReason } = req.body;
        const targetUser = await User.findOne({ userId: req.params.userId });
        if (!targetUser) {
            return res.status(404).json({ error: "User not found" });
        }
        if (action === "approve") {
            if (!["doctor", "nurse", "data_entry", "viewer"].includes(role)) {
                return res.status(400).json({ error: "Invalid role selected" });
            }
            const tempPassword = `${targetUser.firstName}@${Math.floor(1000 + Math.random() * 9000)}`;
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            targetUser.password = hashedPassword;
            targetUser.role = role;
            targetUser.approvalStatus = "approved";
            targetUser.approvedAt = new Date();
            await targetUser.save();
            console.log(`✅ User approved: ${targetUser.userId} - Password: ${tempPassword}`);
            await sendApprovalEmail(
                targetUser.email, 
                targetUser.userId, 
                tempPassword, 
                `${targetUser.firstName} ${targetUser.lastName}`,
                role
            );
            res.json({
                message: "User approved successfully",
                user: {
                    userId: targetUser.userId,
                    name: `${targetUser.firstName} ${targetUser.lastName}`,
                    role: targetUser.role,
                    credentials: {
                        userId: targetUser.userId,
                        password: tempPassword
                    }
                }
            });
        } 
        else if (action === "reject") {
            if (!rejectionReason) {
                return res.status(400).json({ error: "Rejection reason required" });
            }
            targetUser.approvalStatus = "rejected";
            targetUser.rejectionReason = rejectionReason;
            await targetUser.save();
            await sendRejectionEmail(
                targetUser.email,
                `${targetUser.firstName} ${targetUser.lastName}`,
                rejectionReason
            );
            res.json({
                message: "User rejected",
                reason: rejectionReason
            });
        }
        else {
            return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
        }
    } catch (error) {
        console.error("Approval error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/admin/users", protect, hasRole("admin"), async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch("/admin/users/:userId/toggle-status", protect, hasRole("admin"), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        user.isActive = !user.isActive;
        await user.save();
        res.json({
            message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`,
            isActive: user.isActive
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch("/admin/users/:userId/change-role", protect, hasRole("admin"), async (req, res) => {
    try {
        const { newRole } = req.body;
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!["doctor", "nurse", "data_entry", "viewer", "admin"].includes(newRole)) {
            return res.status(400).json({ error: "Invalid role" });
        }
        user.role = newRole;
        await user.save();
        res.json({
            message: `User role changed to ${newRole}`,
            user: {
                userId: user.userId,
                name: `${user.firstName} ${user.lastName}`,
                newRole: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/admin/users/:userId/documents", protect, hasRole("admin"), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const documents = user.verificationDocuments || {};
        const documentUrls = {};
        for (const [key, filePath] of Object.entries(documents)) {
            if (filePath) {
                const urlPath = filePath.replace(/\\/g, '/');
                documentUrls[key] = `/uploads/${urlPath.split('uploads/')[1]}`;
            }
        }
        res.json({
            userId: user.userId,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            hospitalName: user.hospitalName,
            position: user.position,
            documents: documentUrls
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/admin/users/:userId/documents/:docType/download", protect, hasRole("admin"), async (req, res) => {
    try {
        const { userId, docType } = req.params;
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const docPath = user.verificationDocuments?.[docType];
        if (!docPath) {
            return res.status(404).json({ error: "Document not found" });
        }
        if (!fs.existsSync(docPath)) {
            return res.status(404).json({ error: "Document file not found on server" });
        }
        res.sendFile(path.resolve(docPath));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/profile", protect, isApproved, async (req, res) => {
    res.json({
        user: {
            userId: req.user.userId,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            role: req.user.role,
            approvalStatus: req.user.approvalStatus,
            hospitalName: req.user.hospitalName,
            province: req.user.province,
            position: req.user.position
        }
    });
});
router.post("/change-password", protect, isApproved, validatePasswordChange, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
```

## National_Vitality_Eye/Server/routes/medicalRoutes.js

```text
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
function safeRegex(str) {
    try {
        const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('^' + escaped + '$', 'i');
    } catch (_) {
        return null;
    }
}
function diseaseMatchFilter(raw, norm) {
    const regex = safeRegex(raw);
    const conditions = [{ disease: raw }, { disease: norm }];
    if (regex) conditions.push({ disease: { $regex: regex } });
    return { $or: conditions };
}
const fs = require("fs");
const path = require("path");
async function getRecordAccessFilter(user) {
    if (!user) return { _id: null };
    if (user.role === 'admin') return {};
    if (user.role === 'patient') return { patientId: user._id };
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
router.use(protect, isApproved);
router.get("/stats/summary", hasPermission("view:analytics"), async (req, res) => {
    try {
        const filter = {}; 
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
router.get("/stats/by-province", hasPermission("view:analytics"), async (req, res) => {
    try {
        const { disease, period = 'all' } = req.query;
        const matchFilter = {};
        if (disease && disease !== 'All Diseases') {
            const raw = decodeURIComponent(disease);
            const normalized = normaliseDisease(raw);
            matchFilter.$or = diseaseMatchFilter(raw, normalized).$or;
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
router.get("/stats/disease-analytics/:disease", hasPermission("view:analytics"), async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.disease);
        const period = req.query.period || 'all';
        const norm = normaliseDisease(raw);
        const baseMatch = diseaseMatchFilter(raw, norm);
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
router.get("/stats/disease-trends/:disease", hasPermission("view:analytics"), async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.disease);
        const norm = normaliseDisease(raw);
        const baseMatch = diseaseMatchFilter(raw, norm);
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
router.delete("/:id", hasPermission("delete:records"), async (req, res) => {
    try {
        const record = await MedicalRecord.findOneAndDelete({ _id: req.params.id, ...await getRecordAccessFilter(req.user) });
        if (!record) return res.status(404).json({ error: "Record not found" });
        res.json({ message: "Record deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
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
module.exports = router;
```

## National_Vitality_Eye/Server/routes/patientPortalRoutes.js

```text
﻿const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const { predictTriagePriority } = require("../utils/triageAI");
async function getPatientFromToken(req) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const patient = await Patient.findById(decoded.id);
    if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });
    return patient;
}
function calcStats(values) {
    if (!values.length) return { avg: null, stdDev: null, min: null, max: null };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    return { avg, stdDev: Math.sqrt(variance), min: Math.min(...values), max: Math.max(...values) };
}
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Patient login attempt:", email);
        const patient = await Patient.findOne({ "portalAccount.email": email });
        if (!patient) {
            console.log("Patient not found:", email);
            return res.status(401).json({ error: "Invalid email or password" });
        }
        if (!patient.portalAccount?.hasAccount) {
            return res.status(401).json({ error: "No portal account found. Please contact your hospital." });
        }
        if (!patient.portalAccount.isActive) {
            return res.status(401).json({ error: "Account is deactivated. Contact support." });
        }
        if (!patient.portalAccount.isVerified) {
            return res.status(401).json({ error: "Please verify your email first." });
        }
        const isValid = await bcrypt.compare(password, patient.portalAccount.password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        patient.portalAccount.lastLogin = new Date();
        await patient.save();
        const token = jwt.sign(
            { id: patient._id, email: patient.portalAccount.email, type: "patient" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        console.log("Patient logged in:", patient.firstName, patient.lastName);
        res.json({
            token,
            patient: {
                id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.portalAccount.email,
                nationalId: patient.nationalId,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                province: patient.province
            }
        });
    } catch (error) {
        console.error("Patient login error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const patient = await Patient.findOne({ "portalAccount.email": email });
        if (!patient || !patient.portalAccount?.hasAccount) {
            return res.json({ message: "If an account exists, a reset link will be sent" });
        }
        const resetToken = jwt.sign(
            { id: patient._id, email: patient.portalAccount.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        patient.portalAccount.resetToken = resetToken;
        patient.portalAccount.resetTokenExpiry = new Date(Date.now() + 3600000);
        await patient.save();
        res.json({ message: "Reset link sent to your email" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findOne({ 
            _id: decoded.id,
            "portalAccount.resetToken": token,
            "portalAccount.resetTokenExpiry": { $gt: new Date() }
        });
        if (!patient) {
            return res.status(400).json({ error: "Invalid or expired reset link" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        patient.portalAccount.password = hashedPassword;
        patient.portalAccount.resetToken = undefined;
        patient.portalAccount.resetTokenExpiry = undefined;
        await patient.save();
        res.json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/verify", async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findOne({ _id: decoded.id });
        if (!patient) {
            return res.status(400).json({ error: "Invalid verification link" });
        }
        patient.portalAccount.isVerified = true;
        await patient.save();
        res.json({ message: "Email verified successfully" });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/records", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id);
        if (!patient) return res.status(404).json({ error: "Patient not found" });
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const skip  = (page - 1) * limit;
        const query = {
            patientId: patient._id,
            isConfidential: { $ne: true }   
        };
        const [records, total] = await Promise.all([
            MedicalRecord.find(query)
                .sort({ visitDate: -1 })
                .skip(skip)
                .limit(limit)
                .select({
                    visitDate: 1, visitType: 1, hospital: 1, doctorName: 1,
                    disposition: 1, dischargeInstructions: 1, dischargeSummary: 1,
                    symptoms: 1, primaryDiagnosis: 1, secondaryDiagnoses: 1,
                    disease: 1, differentialDiagnosis: 1, physicalExam: 1,
                    prescribedMedications: 1, treatmentPlan: 1, investigations: 1,
                    vitalSigns: 1, notes: 1, province: 1, followUp: 1, referrals: 1
                }),
            MedicalRecord.countDocuments(query)
        ]);
        res.json({
            records,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Error fetching patient records:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/vitals", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id);
        if (!patient) return res.status(404).json({ error: "Patient not found" });
        const vitalsHistory = await MedicalRecord.find(
            { patientId: patient._id, isConfidential: { $ne: true } },
            {
                visitDate: 1, visitType: 1,
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
        res.json({ vitals: vitalsHistory });
    } catch (error) {
        console.error("Error fetching vitals:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/profile", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id).select("-portalAccount.password");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        const recordsCount = await MedicalRecord.countDocuments({ patientId: patient._id });
        const lastVisit = await MedicalRecord.findOne({ patientId: patient._id }).sort({ visitDate: -1 });
        res.json({
            patient: {
                id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                nationalId: patient.nationalId,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                province: patient.province,
                contactInfo: patient.contactInfo,
                clinicalProfile: patient.clinicalProfile
            },
            stats: {
                totalRecords: recordsCount,
                lastVisitDate: lastVisit?.visitDate || null,
                lastVisitHospital: lastVisit?.hospital || null
            }
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/trusted-providers/eligible", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const records = await MedicalRecord.find({ patientId: patient._id })
            .select({ createdBy: 1, taggedUsers: 1 })
            .lean();
        const staffIdSet = new Set();
        records.forEach(r => {
            if (r.createdBy) staffIdSet.add(r.createdBy.toString());
            (r.taggedUsers || []).forEach(id => staffIdSet.add(id.toString()));
        });
        if (staffIdSet.size === 0) {
            return res.json({ eligible: [] });
        }
        const alreadyTrusted = new Set(
            (patient.portalAccount?.trustedProviders || []).map(tp => tp.userId.toString())
        );
        const eligibleIds = [...staffIdSet].filter(id => !alreadyTrusted.has(id));
        const staff = await User.find({
            _id: { $in: eligibleIds },
            isActive: { $ne: false },
            approvalStatus: 'approved'
        }).select('firstName lastName position role hospitalName province');
        res.json({ eligible: staff });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.get("/trusted-providers", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const trusted = patient.portalAccount?.trustedProviders || [];
        if (trusted.length === 0) return res.json({ trusted: [] });
        const staffIds = trusted.map(tp => tp.userId);
        const staff = await User.find({ _id: { $in: staffIds } })
            .select('firstName lastName position role hospitalName province')
            .lean();
        const staffWithDate = staff.map(s => {
            const entry = trusted.find(tp => tp.userId.toString() === s._id.toString());
            return { ...s, grantedAt: entry?.grantedAt };
        });
        res.json({ trusted: staffWithDate });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.post("/trusted-providers/:userId", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const { userId } = req.params;
        const hasRecord = await MedicalRecord.exists({
            patientId: patient._id,
            $or: [{ createdBy: userId }, { taggedUsers: userId }]
        });
        if (!hasRecord) {
            return res.status(403).json({
                error: "You can only grant access to health workers who have been involved in your care."
            });
        }
        const provider = await User.findOne({
            _id: userId,
            isActive: { $ne: false },
            approvalStatus: 'approved',
            role: { $in: ['doctor', 'nurse', 'data_entry', 'viewer', 'admin'] }
        }).select('firstName lastName position role');
        if (!provider) {
            return res.status(404).json({ error: "Health worker not found." });
        }
        const alreadyTrusted = (patient.portalAccount?.trustedProviders || [])
            .some(tp => tp.userId.toString() === userId);
        if (alreadyTrusted) {
            return res.json({ message: "Already trusted.", provider });
        }
        await Patient.findByIdAndUpdate(patient._id, {
            $push: {
                'portalAccount.trustedProviders': {
                    userId,
                    grantedAt: new Date()
                }
            }
        });
        res.json({
            message: `${provider.firstName} ${provider.lastName} has been granted access to your records.`,
            provider
        });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.delete("/trusted-providers/:userId", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const { userId } = req.params;
        await Patient.findByIdAndUpdate(patient._id, {
            $pull: {
                'portalAccount.trustedProviders': { userId }
            }
        });
        res.json({ message: "Access has been revoked." });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.get("/ai/health-summary", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const records = await MedicalRecord.find({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .limit(20);
        const latestRecord = records[0];
        const latestVitals = latestRecord?.vitalSigns || {};
        const triage = patient.clinicalProfile?.triageStatus || {};
        const freshTriage = latestRecord
            ? predictTriagePriority(latestVitals, latestRecord.symptoms || [])
            : { priority: "NON-URGENT", score: 0, reasons: [], color: "gray" };
        let healthScore = 100;
        const insights = [];
        const warnings = [];
        healthScore -= Math.min(freshTriage.score * 5, 40);
        if (latestVitals.temperature) {
            if (latestVitals.temperature > 38.5) { healthScore -= 10; warnings.push("Elevated temperature detected in your last visit."); }
            else if (latestVitals.temperature < 36.0) { healthScore -= 8; warnings.push("Low body temperature noted in your last visit."); }
            else insights.push("Body temperature was normal at your last visit.");
        }
        if (latestVitals.bloodPressure?.systolic) {
            const sbp = latestVitals.bloodPressure.systolic;
            if (sbp > 140) { healthScore -= 12; warnings.push("Blood pressure was elevated at your last visit."); }
            else if (sbp < 90) { healthScore -= 10; warnings.push("Blood pressure was low at your last visit."); }
            else insights.push("Blood pressure was within normal range.");
        }
        if (latestVitals.heartRate) {
            if (latestVitals.heartRate > 100) { healthScore -= 8; warnings.push("Heart rate was elevated at your last visit."); }
            else if (latestVitals.heartRate < 60) { healthScore -= 5; warnings.push("Heart rate was below normal at your last visit."); }
            else insights.push("Heart rate was normal.");
        }
        if (latestVitals.oxygenSaturation) {
            if (latestVitals.oxygenSaturation < 95) { healthScore -= 15; warnings.push("Oxygen saturation was below normal â€” please follow up with your doctor."); }
            else insights.push("Oxygen saturation was healthy.");
        }
        if (latestVitals.bmi) {
            if (latestVitals.bmi > 30) { healthScore -= 8; warnings.push("BMI indicates obesity â€” consider lifestyle changes."); }
            else if (latestVitals.bmi < 18.5) { healthScore -= 6; warnings.push("BMI indicates underweight â€” nutritional support may help."); }
            else insights.push("BMI is in the healthy range.");
        }
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const recentVisits = records.filter(r => new Date(r.visitDate) > threeMonthsAgo);
        if (recentVisits.length > 4) {
            insights.push(`You have had ${recentVisits.length} visits in the last 3 months â€” your care team is monitoring you closely.`);
        }
        const diagnoses = [...new Set(records.map(r => r.disease || r.primaryDiagnosis?.name).filter(Boolean))];
        if (diagnoses.length > 0) {
            insights.push(`Conditions on record: ${diagnoses.slice(0, 3).join(", ")}${diagnoses.length > 3 ? ` and ${diagnoses.length - 3} more` : ""}.`);
        }
        healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
        const scoreLabel =
            healthScore >= 80 ? "Good" :
            healthScore >= 60 ? "Fair" :
            healthScore >= 40 ? "Needs Attention" : "Requires Care";
        const scoreColor =
            healthScore >= 80 ? "green" :
            healthScore >= 60 ? "yellow" :
            healthScore >= 40 ? "orange" : "red";
        res.json({
            healthScore,
            scoreLabel,
            scoreColor,
            triagePriority: freshTriage.priority,
            triageScore: freshTriage.score,
            triageReasons: freshTriage.reasons,
            insights,
            warnings,
            totalVisits: records.length,
            recentVisits: recentVisits.length,
            lastVisitDate: latestRecord?.visitDate || null,
            lastVisitHospital: latestRecord?.hospital || null,
            diagnoses: diagnoses.slice(0, 5),
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Health summary error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
// â”€â”€ 2. VITALS ANOMALY DETECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Compares the patient's latest vitals against their own
// historical baseline using z-scores. Returns plain-language
// alerts the patient can understand.
router.get("/ai/vitals-anomalies", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const records = await MedicalRecord.find(
            { patientId: patient._id },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: -1 }).limit(30);
        if (records.length === 0) {
            return res.json({ anomalies: [], message: "No vital sign records found yet.", hasData: false });
        }
        const latest = records[0]?.vitalSigns || {};
        const history = records.slice(1); // compare against all but the latest
        const collect = (key, nested) => history
            .map(r => nested ? r.vitalSigns?.[key]?.[nested] : r.vitalSigns?.[key])
            .filter(v => typeof v === "number");
        const temps      = collect("temperature");
        const hrs        = collect("heartRate");
        const systolics  = collect("bloodPressure", "systolic");
        const diastolics = collect("bloodPressure", "diastolic");
        const o2s        = collect("oxygenSaturation");
        const rrs        = collect("respiratoryRate");
        const weights    = collect("weight");
        const anomalies = [];
        const check = (label, current, values, unit, lowMsg, highMsg, criticalLow, criticalHigh) => {
            if (current == null || values.length < 2) return;
            const stats = calcStats(values);
            if (!stats.stdDev || stats.stdDev === 0) return;
            const z = (current - stats.avg) / stats.stdDev;
            if (Math.abs(z) > 1.8) {
                const direction = current > stats.avg ? "higher" : "lower";
                const severity = Math.abs(z) > 3 ? "HIGH" : "MODERATE";
                const isCritical = (criticalLow != null && current < criticalLow) || (criticalHigh != null && current > criticalHigh);
                anomalies.push({
                    vital: label,
                    current: `${current}${unit}`,
                    yourAverage: `${Math.round(stats.avg * 10) / 10}${unit}`,
                    direction,
                    severity: isCritical ? "HIGH" : severity,
                    message: direction === "higher" ? highMsg : lowMsg,
                    action: isCritical
                        ? "Please contact your doctor or visit a clinic soon."
                        : "Keep an eye on this and mention it at your next visit.",
                    zScore: Math.round(Math.abs(z) * 10) / 10
                });
            }
        };
        check("Temperature", latest.temperature, temps, "Â°C",
            "Your temperature is lower than your usual readings.",
            "Your temperature is higher than your usual readings â€” possible fever.",
            35.5, 38.5);
        check("Heart Rate", latest.heartRate, hrs, " bpm",
            "Your heart rate is lower than your usual readings.",
            "Your heart rate is higher than your usual readings.",
            50, 110);
        check("Systolic Blood Pressure", latest.bloodPressure?.systolic, systolics, " mmHg",
            "Your blood pressure is lower than your usual readings.",
            "Your blood pressure is higher than your usual readings.",
            90, 150);
        check("Oxygen Saturation", latest.oxygenSaturation, o2s, "%",
            "Your oxygen level is lower than your usual readings â€” this needs attention.",
            "Your oxygen level is slightly above your usual readings.",
            93, null);
        check("Respiratory Rate", latest.respiratoryRate, rrs, "/min",
            "Your breathing rate is slower than your usual readings.",
            "Your breathing rate is faster than your usual readings.",
            10, 24);
        check("Weight", latest.weight, weights, " kg",
            "Your weight is lower than your usual readings.",
            "Your weight is higher than your usual readings.",
            null, null);
        // Clinical threshold checks (regardless of history)
        if (latest.oxygenSaturation && latest.oxygenSaturation < 94) {
            if (!anomalies.find(a => a.vital === "Oxygen Saturation")) {
                anomalies.push({
                    vital: "Oxygen Saturation",
                    current: `${latest.oxygenSaturation}%`,
                    severity: latest.oxygenSaturation < 90 ? "HIGH" : "MODERATE",
                    message: "Your oxygen level is below the healthy range (95-100%).",
                    action: latest.oxygenSaturation < 90
                        ? "Seek medical attention immediately."
                        : "Please contact your doctor soon.",
                    zScore: null
                });
            }
        }
        res.json({
            hasData: true,
            anomalies,
            anomalyCount: anomalies.length,
            latestVitals: latest,
            latestDate: records[0]?.visitDate,
            recordsAnalyzed: records.length,
            allClear: anomalies.length === 0,
            message: anomalies.length === 0
                ? "Your latest vitals look consistent with your personal baseline. Keep it up!"
                : `${anomalies.length} vital sign${anomalies.length > 1 ? "s" : ""} differ from your usual readings.`,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Vitals anomaly error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
// â”€â”€ 3. HEALTH TREND ANALYSIS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Analyses each vital sign over time and classifies the trend
// as IMPROVING, STABLE, or WORSENING with a plain explanation.
router.get("/ai/health-trends", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const records = await MedicalRecord.find(
            { patientId: patient._id },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: 1 }).limit(20);
        if (records.length < 2) {
            return res.json({ trends: [], message: "Not enough records to analyse trends yet.", hasData: false });
        }
        const extract = (key, nested) => records
            .map(r => ({
                date: r.visitDate,
                value: nested ? r.vitalSigns?.[key]?.[nested] : r.vitalSigns?.[key]
            }))
            .filter(p => typeof p.value === "number");
        const analyseTrend = (points, label, unit, goodDirection, normalMin, normalMax) => {
            if (points.length < 2) return null;
            const first = points.slice(0, Math.ceil(points.length / 2));
            const last  = points.slice(Math.floor(points.length / 2));
            const firstAvg = first.reduce((s, p) => s + p.value, 0) / first.length;
            const lastAvg  = last.reduce((s, p) => s + p.value, 0) / last.length;
            const change = lastAvg - firstAvg;
            const changePct = firstAvg !== 0 ? Math.round((change / firstAvg) * 100) : 0;
            const latestVal = points[points.length - 1].value;
            const inNormalRange = normalMin != null && normalMax != null
                ? latestVal >= normalMin && latestVal <= normalMax
                : true;
            let trend, trendColor, explanation;
            const improving = goodDirection === "down" ? change < -0.5 : change > 0.5;
            const worsening = goodDirection === "down" ? change > 0.5 : change < -0.5;
            if (Math.abs(changePct) < 3) {
                trend = "STABLE";
                trendColor = "blue";
                explanation = `Your ${label} has been consistent across your visits.`;
            } else if (improving) {
                trend = "IMPROVING";
                trendColor = "green";
                explanation = `Your ${label} has been trending in a healthy direction.`;
            } else {
                trend = worsening ? "WORSENING" : "CHANGING";
                trendColor = worsening ? "orange" : "yellow";
                explanation = `Your ${label} has been changing â€” worth discussing with your doctor.`;
            }
            return {
                vital: label,
                trend,
                trendColor,
                explanation,
                latestValue: `${Math.round(latestVal * 10) / 10}${unit}`,
                changePercent: changePct,
                inNormalRange,
                dataPoints: points.length,
                chartData: points.map(p => ({
                    date: new Date(p.date).toLocaleDateString(),
                    value: Math.round(p.value * 10) / 10
                }))
            };
        };
        const trends = [
            analyseTrend(extract("temperature"), "Temperature", "Â°C", "stable", 36.1, 37.2),
            analyseTrend(extract("heartRate"), "Heart Rate", " bpm", "stable", 60, 100),
            analyseTrend(extract("bloodPressure", "systolic"), "Systolic BP", " mmHg", "down", 90, 120),
            analyseTrend(extract("oxygenSaturation"), "Oxygen Saturation", "%", "up", 95, 100),
            analyseTrend(extract("weight"), "Weight", " kg", "stable", null, null),
            analyseTrend(extract("bmi"), "BMI", "", "stable", 18.5, 24.9)
        ].filter(Boolean);
        const worseningCount = trends.filter(t => t.trend === "WORSENING").length;
        const improvingCount = trends.filter(t => t.trend === "IMPROVING").length;
        res.json({
            hasData: true,
            trends,
            summary: worseningCount > 1
                ? "Some of your health metrics are trending in the wrong direction. Please discuss with your doctor."
                : improvingCount > 0
                ? "Some of your health metrics are improving. Keep up the good work!"
                : "Your health metrics are generally stable.",
            worseningCount,
            improvingCount,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Health trends error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
// â”€â”€ 4. FOLLOW-UP & MEDICATION REMINDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Parses the patient's records for follow-up dates and active
// medications, returning upcoming/overdue items.
router.get("/ai/reminders", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const records = await MedicalRecord.find({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .limit(10)
            .select({ visitDate: 1, followUp: 1, prescribedMedications: 1, treatmentPlan: 1, disease: 1, primaryDiagnosis: 1, hospital: 1 });
        const now = new Date();
        const followUps = [];
        const medications = new Map();
        records.forEach(record => {
            // Follow-up reminders
            if (record.followUp?.required && record.followUp?.date) {
                const followUpDate = new Date(record.followUp.date);
                const daysUntil = Math.round((followUpDate - now) / (1000 * 60 * 60 * 24));
                followUps.push({
                    date: followUpDate,
                    daysUntil,
                    status: daysUntil < 0 ? "OVERDUE" : daysUntil <= 7 ? "SOON" : "UPCOMING",
                    instructions: record.followUp.instructions || "Follow-up appointment required",
                    provider: record.followUp.provider || record.hospital || "Your healthcare provider",
                    forCondition: record.disease || record.primaryDiagnosis?.name || "General follow-up",
                    visitDate: record.visitDate
                });
            }
            // Medication deduplication (keep most recent prescription)
            const meds = [
                ...(record.prescribedMedications || []),
                ...(record.treatmentPlan?.medications?.map(m => m.medication) || [])
            ].filter(Boolean);
            meds.forEach(med => {
                if (!medications.has(med)) {
                    medications.set(med, {
                        name: med,
                        prescribedAt: record.visitDate,
                        forCondition: record.disease || record.primaryDiagnosis?.name || "General",
                        hospital: record.hospital
                    });
                }
            });
        });
        // Sort follow-ups: overdue first, then soonest
        followUps.sort((a, b) => a.daysUntil - b.daysUntil);
        const overdueCount = followUps.filter(f => f.status === "OVERDUE").length;
        const soonCount    = followUps.filter(f => f.status === "SOON").length;
        res.json({
            followUps,
            medications: Array.from(medications.values()).slice(0, 15),
            overdueCount,
            soonCount,
            hasReminders: followUps.length > 0 || medications.size > 0,
            urgentMessage: overdueCount > 0
                ? `You have ${overdueCount} overdue follow-up appointment${overdueCount > 1 ? "s" : ""}. Please contact your healthcare provider.`
                : soonCount > 0
                ? `You have ${soonCount} follow-up appointment${soonCount > 1 ? "s" : ""} coming up soon.`
                : null,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Reminders error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
// â”€â”€ 5. SYMPTOM CHECKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Patient submits current symptoms; the system uses the
// in-memory AI (if available) or a rule-based fallback to
// return "when to seek care" guidance â€” NOT a diagnosis.
router.post("/ai/symptom-check", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const { symptoms } = req.body;
        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({ error: "Please provide at least one symptom." });
        }
        // High-risk symptoms that always warrant immediate care
        const EMERGENCY_SYMPTOMS = [
            "chest pain", "difficulty breathing", "shortness of breath",
            "unconscious", "seizure", "stroke", "severe bleeding",
            "choking", "anaphylaxis", "head injury", "poisoning"
        ];
        const URGENT_SYMPTOMS = [
            "high fever", "fever", "severe headache", "vomiting blood",
            "blood in urine", "severe abdominal pain", "confusion",
            "blurred vision", "severe dizziness", "fainting"
        ];
        const lowerSymptoms = symptoms.map(s => s.toLowerCase());
        const emergencyMatches = lowerSymptoms.filter(s =>
            EMERGENCY_SYMPTOMS.some(e => s.includes(e))
        );
        const urgentMatches = lowerSymptoms.filter(s =>
            URGENT_SYMPTOMS.some(u => s.includes(u))
        );
        // Try to use the real-time AI if it's available on app.locals
        let aiPredictions = [];
        try {
            const realTimeAI = req.app?.locals?.aiInstance;
            if (realTimeAI) {
                const result = realTimeAI.predictDisease(
                    symptoms,
                    patient.province || "Harare",
                    new Date().getMonth(),
                    patient.age,
                    patient.gender
                );
                aiPredictions = (result.predictions || []).slice(0, 3).map(p => ({
                    condition: p.disease,
                    likelihood: p.confidence,
                    commonIn: p.totalCases > 0 ? `${p.totalCases} similar cases on record` : null
                }));
            }
        } catch (_) {  }
        let urgencyLevel, urgencyColor, careAdvice, timeframe;
        if (emergencyMatches.length > 0) {
            urgencyLevel = "EMERGENCY";
            urgencyColor = "red";
            careAdvice = "Go to the emergency room or call emergency services immediately.";
            timeframe = "Right now";
        } else if (urgentMatches.length > 0 || symptoms.length >= 4) {
            urgencyLevel = "URGENT";
            urgencyColor = "orange";
            careAdvice = "Visit a clinic or doctor today or tomorrow.";
            timeframe = "Within 24 hours";
        } else if (symptoms.length >= 2) {
            urgencyLevel = "SOON";
            urgencyColor = "yellow";
            careAdvice = "Schedule an appointment with your doctor within the next few days.";
            timeframe = "Within 3-5 days";
        } else {
            urgencyLevel = "MONITOR";
            urgencyColor = "blue";
            careAdvice = "Monitor your symptoms. If they worsen or persist beyond 3 days, see a doctor.";
            timeframe = "Monitor for 3 days";
        }
        const selfCareTips = [];
        if (lowerSymptoms.some(s => s.includes("fever") || s.includes("temperature"))) {
            selfCareTips.push("Stay hydrated â€” drink plenty of water and fluids.");
            selfCareTips.push("Rest and avoid strenuous activity.");
        }
        if (lowerSymptoms.some(s => s.includes("cough") || s.includes("breathing"))) {
            selfCareTips.push("Avoid smoke and dusty environments.");
            selfCareTips.push("Sit upright to ease breathing.");
        }
        if (lowerSymptoms.some(s => s.includes("headache") || s.includes("pain"))) {
            selfCareTips.push("Rest in a quiet, dark room if possible.");
        }
        if (lowerSymptoms.some(s => s.includes("diarrhea") || s.includes("vomit") || s.includes("nausea"))) {
            selfCareTips.push("Drink oral rehydration solution (ORS) to prevent dehydration.");
            selfCareTips.push("Eat bland foods like rice, bananas, and toast.");
        }
        if (selfCareTips.length === 0) {
            selfCareTips.push("Rest and stay hydrated.");
            selfCareTips.push("Avoid self-medicating without professional advice.");
        }
        res.json({
            symptoms,
            urgencyLevel,
            urgencyColor,
            careAdvice,
            timeframe,
            emergencySymptoms: emergencyMatches,
            urgentSymptoms: urgentMatches,
            selfCareTips,
            aiPredictions,
            disclaimer: "This is not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.",
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Symptom check error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.get("/trusted-providers", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const trusted = patient.portalAccount?.trustedProviders || [];
        const trustedIds = trusted.map(t => t.userId?.toString());
        const records = await MedicalRecord.find({ patientId: patient._id })
            .select({ createdBy: 1, taggedUsers: 1 })
            .lean();
        const eligibleIds = new Set();
        records.forEach(r => {
            if (r.createdBy) eligibleIds.add(r.createdBy.toString());
            (r.taggedUsers || []).forEach(u => eligibleIds.add(u.toString()));
        });
        const eligibleUsers = await User.find({
            _id: { $in: Array.from(eligibleIds) },
            isActive: { $ne: false },
            approvalStatus: 'approved'
        }).select('firstName lastName position role hospitalName').lean();
        const trustedList = [];
        const eligibleList = [];
        eligibleUsers.forEach(u => {
            const entry = {
                userId:      u._id,
                firstName:   u.firstName,
                lastName:    u.lastName,
                position:    u.position,
                role:        u.role,
                hospitalName: u.hospitalName
            };
            if (trustedIds.includes(u._id.toString())) {
                const grant = trusted.find(t => t.userId?.toString() === u._id.toString());
                trustedList.push({ ...entry, grantedAt: grant?.grantedAt });
            } else {
                eligibleList.push(entry);
            }
        });
        res.json({ trusted: trustedList, eligible: eligibleList });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.post("/trusted-providers/:userId", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const { userId } = req.params;
        const record = await MedicalRecord.findOne({
            patientId: patient._id,
            $or: [{ createdBy: userId }, { taggedUsers: userId }]
        }).lean();
        if (!record) {
            return res.status(403).json({
                error: "This health worker has no existing care relationship with you and cannot be granted access."
            });
        }
        const provider = await User.findOne({
            _id: userId,
            isActive: { $ne: false },
            approvalStatus: 'approved',
            role: { $in: ['doctor', 'nurse', 'data_entry', 'viewer', 'admin'] }
        }).select('firstName lastName position role').lean();
        if (!provider) {
            return res.status(404).json({ error: "Health worker not found or not active." });
        }
        const alreadyTrusted = (patient.portalAccount?.trustedProviders || [])
            .some(t => t.userId?.toString() === userId);
        if (!alreadyTrusted) {
            await Patient.findByIdAndUpdate(patient._id, {
                $push: {
                    'portalAccount.trustedProviders': {
                        userId,
                        grantedAt: new Date()
                    }
                }
            });
        }
        res.json({
            message: `${provider.firstName} ${provider.lastName} has been granted full access to your records.`,
            provider: {
                userId:    provider._id,
                firstName: provider.firstName,
                lastName:  provider.lastName,
                position:  provider.position,
                role:      provider.role
            }
        });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.delete("/trusted-providers/:userId", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const { userId } = req.params;
        await Patient.findByIdAndUpdate(patient._id, {
            $pull: {
                'portalAccount.trustedProviders': { userId }
            }
        });
        res.json({ message: "Access has been revoked. This health worker can no longer see your records." });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
module.exports = router;
```

## National_Vitality_Eye/Server/routes/patientroutes.js

```text
const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const { protect } = require("../middleware/auth");
const { hasPermission, hasRole, isApproved } = require("../middleware/rbac");
router.use(protect, isApproved);
router.get("/", hasPermission("view:patients"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const accessFilter = await getPatientAccessFilter(req.user);
        const [patients, total] = await Promise.all([
            Patient.find(accessFilter)
                .select("-clinicalProfile")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Patient.countDocuments(accessFilter)
        ]);
        res.json({
            patients,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
async function getPatientAccessFilter(user) {
    if (user.role === 'admin') return {};
    const MedicalRecord = require("../models/MedicalRecord");
    const recordPatients = await MedicalRecord.distinct("patientId", {
        $or: [
            { createdBy: user._id },
            { taggedUsers: user._id }
        ]
    });
    return {
        $or: [
            { createdBy: user._id },
            { _id: { $in: recordPatients } }
        ]
    };
}
router.post("/", hasPermission("create:patients"), async (req, res) => {
    try {
        const patient = new Patient(req.body);
        patient.createdBy = req.user._id;
        await patient.save();
        res.status(201).json(patient);
    } catch (error) {
        console.error("Error creating patient:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/stats/count", hasPermission("view:analytics"), async (req, res) => {
    try {
        const count = await Patient.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/national/:nationalId", hasPermission("view:patients"), async (req, res) => {
    try {
        const patient = await Patient.findOne({
            nationalId: req.params.nationalId
        });
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/:id", hasPermission("view:patients"), async (req, res) => {
    try {
        if (req.user.role === 'patient' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: "Access denied. You can only view your own profile." });
        }
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch("/:id", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user._id },
            { new: true, runValidators: true }
        );
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete("/:id", hasPermission("delete:patients"), async (req, res) => {
    try {
        const patient = await Patient.findByIdAndDelete(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json({ message: "Patient deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/:id/clinical-profile", hasPermission("view:patients"), async (req, res) => {
    try {
        if (req.user.role === 'patient' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: "Access denied. You can only view your own profile." });
        }
        const patient = await Patient.findById(req.params.id).select("clinicalProfile");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient.clinicalProfile || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch("/:id/clinical-profile", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        patient.clinicalProfile = {
            ...patient.clinicalProfile,
            ...req.body
        };
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.clinicalProfile);
    } catch (error) {
        console.error("Error updating clinical profile:", error);
        res.status(500).json({ error: error.message });
    }
});
router.post("/:id/chronic-condition", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.chronicConditions) patient.clinicalProfile.chronicConditions = [];
        patient.clinicalProfile.chronicConditions.push(req.body);
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.clinicalProfile.chronicConditions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post("/:id/allergy", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.allergies) patient.clinicalProfile.allergies = [];
        patient.clinicalProfile.allergies.push(req.body);
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.clinicalProfile.allergies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post("/:id/medication", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.currentMedications) patient.clinicalProfile.currentMedications = [];
        patient.clinicalProfile.currentMedications.push({
            ...req.body,
            prescribedBy: req.user._id,
            prescribedDate: new Date()
        });
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.clinicalProfile.currentMedications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch("/:id/vital-signs", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        patient.clinicalProfile.vitalSigns = {
            ...req.body,
            lastUpdated: new Date(),
            recordedBy: req.user._id
        };
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.clinicalProfile.vitalSigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post("/:id/risk-factor", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.riskFactors) patient.clinicalProfile.riskFactors = [];
        patient.clinicalProfile.riskFactors.push(req.body);
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.clinicalProfile.riskFactors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/:id/pregnancy", hasPermission("view:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select("pregnancyInfo");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient.pregnancyInfo || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch("/:id/pregnancy", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        patient.pregnancyInfo = {
            ...patient.pregnancyInfo,
            ...req.body
        };
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.pregnancyInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post("/:id/antenatal-visit", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.pregnancyInfo) patient.pregnancyInfo = {};
        if (!patient.pregnancyInfo.antenatalVisits) patient.pregnancyInfo.antenatalVisits = [];
        patient.pregnancyInfo.antenatalVisits.push({
            ...req.body,
            visitDate: new Date()
        });
        patient.updatedBy = req.user._id;
        await patient.save();
        res.json(patient.pregnancyInfo.antenatalVisits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get("/admin/all", hasRole("admin"), async (req, res) => {
    try {
        const patients = await Patient.find()
            .select("-clinicalProfile") 
            .lean();
        const patientsWithPortal = patients.map(patient => ({
            ...patient,
            portal: patient.portalAccount ? {
                hasPortalAccount: patient.portalAccount.hasAccount || false,
                portalActive: patient.portalAccount.isActive !== false,
                portalEmail: patient.portalAccount.email,
                portalLastLogin: patient.portalAccount.lastLogin
            } : {
                hasPortalAccount: false,
                portalActive: null,
                portalEmail: null,
                portalLastLogin: null
            }
        }));
        res.json(patientsWithPortal);
    } catch (error) {
        console.error("Error fetching patients for admin:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/admin/:id", hasRole("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id)
            .select("-clinicalProfile");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json({
            ...patient.toObject(),
            portal: patient.portalAccount ? {
                hasAccount: patient.portalAccount.hasAccount || false,
                isActive: patient.portalAccount.isActive !== false,
                email: patient.portalAccount.email,
                phoneNumber: patient.portalAccount.phoneNumber,
                createdAt: patient.portalAccount.createdAt,
                lastLogin: patient.portalAccount.lastLogin,
                consentGiven: patient.portalAccount.consentGiven,
                consentDate: patient.portalAccount.consentDate
            } : {
                hasAccount: false
            }
        });
    } catch (error) {
        console.error("Error fetching patient for admin:", error);
        res.status(500).json({ error: error.message });
    }
});
router.patch("/admin/:id/suspend-portal", hasRole("admin"), async (req, res) => {
    try {
        const { reason, duration } = req.body;
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.portalAccount || !patient.portalAccount.hasAccount) {
            return res.status(404).json({ error: "Patient does not have a portal account" });
        }
        patient.portalAccount.isActive = false;
        patient.portalAccount.suspendedAt = new Date();
        patient.portalAccount.suspensionReason = reason || "Suspended by administrator";
        if (duration) {
            patient.portalAccount.suspensionDuration = parseInt(duration);
        }
        await patient.save();
        res.json({
            message: `Portal access suspended${duration ? ` for ${duration} days` : ''}`,
            suspension: {
                reason: patient.portalAccount.suspensionReason,
                suspendedAt: patient.portalAccount.suspendedAt
            }
        });
    } catch (error) {
        console.error("Error suspending portal access:", error);
        res.status(500).json({ error: error.message });
    }
});
router.patch("/admin/:id/reactivate-portal", hasRole("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        if (!patient.portalAccount || !patient.portalAccount.hasAccount) {
            return res.status(404).json({ error: "Patient does not have a portal account" });
        }
        patient.portalAccount.isActive = true;
        patient.portalAccount.suspendedAt = null;
        patient.portalAccount.suspensionReason = null;
        patient.portalAccount.suspensionDuration = null;
        patient.portalAccount.loginAttempts = 0;
        patient.portalAccount.lockedUntil = null;
        await patient.save();
        res.json({ message: "Portal access reactivated successfully" });
    } catch (error) {
        console.error("Error reactivating portal access:", error);
        res.status(500).json({ error: error.message });
    }
});
router.patch("/admin/:id/deactivate", hasRole("admin"), async (req, res) => {
    try {
        const { reason } = req.body;
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        patient.isActive = false;
        patient.deactivatedAt = new Date();
        patient.deactivationReason = reason || "Deactivated by administrator";
        patient.deactivatedBy = req.user._id;
        if (patient.portalAccount) {
            patient.portalAccount.isActive = false;
        }
        await patient.save();
        res.json({ message: "Patient account deactivated successfully" });
    } catch (error) {
        console.error("Error deactivating patient:", error);
        res.status(500).json({ error: error.message });
    }
});
router.patch("/admin/:id/reactivate", hasRole("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        patient.isActive = true;
        patient.deactivatedAt = null;
        patient.deactivationReason = null;
        await patient.save();
        res.json({ message: "Patient account reactivated successfully" });
    } catch (error) {
        console.error("Error reactivating patient:", error);
        res.status(500).json({ error: error.message });
    }
});
router.get("/admin/:id/audit", hasRole("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id)
            .select("portalAccount.auditLog portalAccount.loginAttempts portalAccount.lockedUntil portalAccount.isActive portalAccount.suspensionReason deactivationReason");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json({
            isActive: patient.isActive !== false,
            deactivationReason: patient.deactivationReason,
            loginAttempts: patient.portalAccount?.loginAttempts || 0,
            lockedUntil: patient.portalAccount?.lockedUntil,
            suspensionReason: patient.portalAccount?.suspensionReason,
            auditLog: patient.portalAccount?.auditLog?.slice(-50) || []
        });
    } catch (error) {
        console.error("Error fetching audit log:", error);
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
```

## National_Vitality_Eye/Server/routes/realTimeAIRoutes.js

```text
const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const { protect } = require("../middleware/auth");
function safeRegex(str) {
    try {
        const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('^' + escaped + '$', 'i');
    } catch (_) {
        return null;
    }
}
function diseaseMatchFilter(raw, norm) {
    const regex = safeRegex(raw);
    const conditions = [{ disease: raw }, { disease: norm }];
    if (regex) conditions.push({ disease: { $regex: regex } });
    return { $or: conditions };
}
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
router.use(protect, isApproved);
let realTimeAI = null;
let alertEmitter = null;
function setAIInstance(ai, emitter) {
    realTimeAI = ai;
    alertEmitter = emitter;
}
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
        const normalisedSymptoms = normaliseSymptoms(symptoms);
        const normalisedProvince = normaliseProvince(province || "Harare");
        if (patientId) {
            const patient = await Patient.findById(patientId);
            if (patient) {
                patientAge = patient.age;
                patientGender = patient.gender;
                patientRiskFactors = patient.clinicalProfile?.riskFactors?.map(rf => rf.factor) || [];
                patientVitals = {
                    temperature: patient.clinicalProfile?.vitalSigns?.temperature,
                    heartRate: patient.clinicalProfile?.vitalSigns?.heartRate,
                    systolicBP: patient.clinicalProfile?.vitalSigns?.bloodPressure?.systolic,
                    diastolicBP: patient.clinicalProfile?.vitalSigns?.bloodPressure?.diastolic,
                    oxygenSaturation: patient.clinicalProfile?.vitalSigns?.oxygenSaturation,
                    respiratoryRate: patient.clinicalProfile?.vitalSigns?.respiratoryRate,
                    bmi: patient.clinicalProfile?.vitalSigns?.bmi
                };
                patientChronicConditions = (patient.clinicalProfile?.chronicConditions || [])
                    .map(c => normaliseCondition(c.condition))
                    .filter(Boolean);
                patientFamilyHistory = {
                    mother:   (patient.clinicalProfile?.familyHistory?.mother   || []).map(c => normaliseCondition(c)),
                    father:   (patient.clinicalProfile?.familyHistory?.father   || []).map(c => normaliseCondition(c)),
                    siblings: (patient.clinicalProfile?.familyHistory?.siblings || []).map(c => normaliseCondition(c))
                };
                console.log(`🔍 Enhanced AI Prediction for patient [${patientId}]:`, {
                    age: patientAge,
                    gender: patientGender,
                    chronicConditions: patientChronicConditions.length,
                    familyHistoryConditions: [...patientFamilyHistory.mother, ...patientFamilyHistory.father, ...patientFamilyHistory.siblings].length,
                    vitalsPresent: !!patientVitals.temperature
                });
            }
        }
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
        disease: key, 
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
        expectedVitalSigns: {
            temperature: pattern.vitalSignsAverages?.temperature?.avg,
            heartRate: pattern.vitalSignsAverages?.heartRate?.avg,
            bloodPressure: {
                systolic: pattern.vitalSignsAverages?.systolicBP?.avg,
                diastolic: pattern.vitalSignsAverages?.diastolicBP?.avg
            },
            oxygenSaturation: pattern.vitalSignsAverages?.oxygenSaturation?.avg
        },
        commonChronicConditions: Array.from(pattern.chronicConditions?.entries() || [])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([condition, count]) => ({ condition, prevalence: Math.round((count / pattern.count) * 100) })),
        lastSeen: pattern.lastSeen,
        averageAge: Math.round(pattern.avgAge)
    });
});
router.get("/disease-insights/:disease", hasPermission("view:analytics"), async (req, res) => {
    if (!realTimeAI) {
        return res.status(503).json({ error: "AI initializing" });
    }
    const rawDisease = decodeURIComponent(req.params.disease);
    const period = req.query.period || 'all';
    let pattern = realTimeAI.diseasePatterns.get(rawDisease.toLowerCase());
    let key = rawDisease.toLowerCase();
    if (!pattern) {
        key = findDiseaseKey(realTimeAI.diseasePatterns, rawDisease);
        pattern = key ? realTimeAI.diseasePatterns.get(key) : null;
    }
    if (!pattern || req.query.period != null) {
        try {
            const norm = normaliseDisease(rawDisease);
            const escaped = rawDisease.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let diseaseFilter;
            try {
                diseaseFilter = {
                    $or: [
                        { disease: rawDisease },
                        { disease: norm },
                        { disease: { $regex: new RegExp(`^${escaped}$`, 'i') } }
                    ]
                };
            } catch (_regexErr) {
                diseaseFilter = {
                    $or: [
                        { disease: rawDisease },
                        { disease: norm }
                    ]
                };
            }
            const { current } = periodMatches(diseaseFilter, period);
            const now = new Date();
            const [analytics, records] = await Promise.all([
                buildDiseasePeriodAnalytics({
                    MedicalRecord,
                    baseMatch: diseaseFilter,
                    period,
                    diseaseLabel: rawDisease
                }),
                MedicalRecord.find(current)
                    .populate('patientId', 'dateOfBirth')
                    .select('province disposition patientId')
                    .lean()
            ]);
            const total = analytics.totalCases;
            if (total === 0) {
                return res.status(404).json({ error: `No records found for: ${rawDisease}` });
            }
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
        const now       = new Date();
        const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyAgo  = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const { normaliseDisease: nd } = require('../utils/normalise');
        const norm = nd(rawDisease);
        const diseaseFilter = safeRegex(rawDisease)
            ? { $or: [{ disease: rawDisease }, { disease: norm }, { disease: { $regex: safeRegex(rawDisease) } }] }
            : { $or: [{ disease: rawDisease }, { disease: norm }] };
        const [currentCount, prevCount] = await Promise.all([
            MedicalRecord.countDocuments({ ...diseaseFilter, visitDate: { $gte: thirtyAgo } }),
            MedicalRecord.countDocuments({ ...diseaseFilter, visitDate: { $gte: sixtyAgo, $lt: thirtyAgo } })
        ]);
        let growthRate = 0;
        if (prevCount > 0) {
            growthRate = ((currentCount - prevCount) / prevCount) * 100;
        } else if (currentCount > 0) {
            growthRate = 100; 
        }
        const sortedProvinces = Array.from(pattern.provinces.entries())
            .sort((a, b) => b[1] - a[1]);
        const provinceBreakdownForHotspot = sortedProvinces.map(([province, count]) => ({
            province,
            count,
            percentage: total > 0 ? clampPercent((count / total) * 100) : 0
        }));
        const primaryHotspotInfo = resolvePrimaryHotspots(provinceBreakdownForHotspot);
        const hotspot = primaryHotspotInfo.label || "Unknown";
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
router.get("/stats", hasPermission("view:analytics"), async (req, res) => {
    try {
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
router.post("/refresh", hasPermission("admin"), async (req, res) => {
    try {
        const ContinuousLearner = require("../ai/continuousLearner");
        const AlertEmitter = require("../ai/alertEmitter");
        const emitter = new AlertEmitter(global.io);
        const learner = new ContinuousLearner();
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
```

## National_Vitality_Eye/Server/scripts/checkTokens.js

```text
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
require("dotenv").config();
async function checkTokens() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        const patients = await Patient.find({ 
            'portalAccount.verificationToken': { $exists: true } 
        });
        console.log("\n=== PATIENTS WITH VERIFICATION TOKENS ===");
        console.log("Count:", patients.length);
        patients.forEach(p => {
            console.log("\n---");
            console.log("Patient:", p.firstName, p.lastName);
            console.log("Email:", p.portalAccount?.email);
            console.log("Token:", p.portalAccount?.verificationToken);
            console.log("Expires:", p.portalAccount?.verificationExpires);
            console.log("Is Verified:", p.portalAccount?.isVerified);
        });
        if (patients.length === 0) {
            console.log("\n⚠️ No patients with verification tokens found!");
            console.log("This means the token wasn't saved during registration.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
checkTokens();
```

## National_Vitality_Eye/Server/scripts/createAdmins.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();
const admins = [
    { firstName: "SYS", lastName: "ADMIN", email: "sys.admin@health.gov.zw", phoneNumber: "+263771234501", employeeId: "ADMIN001", hospitalName: "Ministry of Health", hospitalId: "MOH001", province: "Harare", position: "System Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "HRE001", email: "admin.hre@health.gov.zw", phoneNumber: "+263771234502", employeeId: "ADMIN002", hospitalName: "Harare Central Hospital", hospitalId: "HOSP001", province: "Harare", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "BYO001", email: "admin.byo@health.gov.zw", phoneNumber: "+263771234503", employeeId: "ADMIN003", hospitalName: "Bulawayo Central Hospital", hospitalId: "HOSP002", province: "Bulawayo", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MAN001", email: "admin.man@health.gov.zw", phoneNumber: "+263771234504", employeeId: "ADMIN004", hospitalName: "Mutare Provincial Hospital", hospitalId: "HOSP003", province: "Manicaland", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MCE001", email: "admin.mce@health.gov.zw", phoneNumber: "+263771234505", employeeId: "ADMIN005", hospitalName: "Bindura Provincial Hospital", hospitalId: "HOSP004", province: "Mashonaland Central", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MEA001", email: "admin.mea@health.gov.zw", phoneNumber: "+263771234506", employeeId: "ADMIN006", hospitalName: "Marondera Provincial Hospital", hospitalId: "HOSP005", province: "Mashonaland East", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MWE001", email: "admin.mwe@health.gov.zw", phoneNumber: "+263771234507", employeeId: "ADMIN007", hospitalName: "Chinhoyi Provincial Hospital", hospitalId: "HOSP006", province: "Mashonaland West", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MSV001", email: "admin.msv@health.gov.zw", phoneNumber: "+263771234508", employeeId: "ADMIN008", hospitalName: "Masvingo Provincial Hospital", hospitalId: "HOSP007", province: "Masvingo", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MTN001", email: "admin.mtn@health.gov.zw", phoneNumber: "+263771234509", employeeId: "ADMIN009", hospitalName: "Lupane Provincial Hospital", hospitalId: "HOSP008", province: "Matabeleland North", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MTS001", email: "admin.mts@health.gov.zw", phoneNumber: "+263771234510", employeeId: "ADMIN010", hospitalName: "Gwanda Provincial Hospital", hospitalId: "HOSP009", province: "Matabeleland South", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MID001", email: "admin.mid@health.gov.zw", phoneNumber: "+263771234511", employeeId: "ADMIN011", hospitalName: "Gweru Provincial Hospital", hospitalId: "HOSP010", province: "Midlands", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" }
];
async function createAdmins() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        for (const admin of admins) {
            const existing = await User.findOne({ email: admin.email });
            if (existing) {
                console.log(`⏭️ Skipping ${admin.firstName} ${admin.lastName} - already exists`);
                continue;
            }
            const password = `${admin.firstName}@2026`;
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = `${admin.firstName.substring(0,3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
            const user = new User({
                ...admin,
                password: hashedPassword,
                userId: userId,
                verificationDocuments: {
                    nationalId: "admin-verified",
                    employmentLetter: "admin-verified"
                }
            });
            await user.save();
            console.log(`✅ Created: ${admin.firstName} ${admin.lastName} - UserID: ${userId}, Password: ${password}`);
        }
        console.log("\n🎉 All admins created successfully!");
        console.log("\n📋 Admin Login Credentials:");
        console.log("==========================");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}
createAdmins();
```

## National_Vitality_Eye/Server/scripts/createIndexes.js

```text

const mongoose = require("mongoose");
require("dotenv").config();
async function createIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB\n");
        const db = mongoose.connection.db;
        console.log("🔧 Creating indexes for patients collection...");
        await db.collection("patients").createIndex({ age: 1 });
        console.log("   ✅ age_1");
        await db.collection("patients").createIndex({ gender: 1 });
        console.log("   ✅ gender_1");
        await db.collection("patients").createIndex({ province: 1 });
        console.log("   ✅ province_1");
        await db.collection("patients").createIndex({ isActive: 1 });
        console.log("   ✅ isActive_1");
        await db.collection("patients").createIndex({ age: 1, gender: 1, province: 1 });
        console.log("   ✅ age_1_gender_1_province_1");
        console.log("\n🔧 Creating indexes for medicalrecords collection...");
        await db.collection("medicalrecords").createIndex({ patientId: 1 });
        console.log("   ✅ patientId_1");
        await db.collection("medicalrecords").createIndex({ patientId: 1, visitDate: -1 });
        console.log("   ✅ patientId_1_visitDate_-1");
        await db.collection("medicalrecords").createIndex({ disease: 1 });
        console.log("   ✅ disease_1");
        await db.collection("medicalrecords").createIndex({ visitDate: -1 });
        console.log("   ✅ visitDate_-1");
        await db.collection("medicalrecords").createIndex({ "vitalSigns.temperature": 1 });
        console.log("   ✅ vitalSigns.temperature_1");
        await db.collection("medicalrecords").createIndex({ "vitalSigns.heartRate": 1 });
        console.log("   ✅ vitalSigns.heartRate_1");
        await db.collection("medicalrecords").createIndex({ "vitalSigns.bloodPressure.systolic": 1 });
        console.log("   ✅ vitalSigns.bloodPressure.systolic_1");
        await db.collection("medicalrecords").createIndex({ patientId: 1, "vitalSigns.temperature": 1 });
        console.log("   ✅ patientId_1_vitalSigns.temperature_1");
        await db.collection("medicalrecords").createIndex({ patientId: 1, "vitalSigns.heartRate": 1 });
        console.log("   ✅ patientId_1_vitalSigns.heartRate_1");
        console.log("\n✅ All indexes created successfully!");
        console.log("\n📋 PATIENTS INDEXES:");
        const patientIndexes = await db.collection("patients").indexes();
        patientIndexes.forEach(idx => {
            console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        console.log("\n📋 MEDICALRECORDS INDEXES:");
        const recordIndexes = await db.collection("medicalrecords").indexes();
        recordIndexes.forEach(idx => {
            console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        await mongoose.disconnect();
        console.log("\n✅ Done!");
    } catch (error) {
        console.error("❌ Error creating indexes:", error);
        process.exit(1);
    }
}
createIndexes();
```

## National_Vitality_Eye/Server/scripts/createRufaroPortal.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
async function createPortalForRufaro() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        const nationalId = "19-048670Y39";
        const email = "rufaro.hove@example.com";
        const password = "Patient@2026";
        const hashedPassword = await bcrypt.hash(password, 10);
        let patient = await Patient.findOne({ nationalId: nationalId });
        if (!patient) {
            console.error(`❌ Patient with National ID ${nationalId} not found!`);
            process.exit(1);
        }
        console.log(`Found patient: ${patient.firstName} ${patient.lastName}`);
        patient.portalAccount = {
            hasAccount: true,
            email: email,
            password: hashedPassword,
            isVerified: true,
            isActive: true,
            createdAt: new Date(),
            auditLog: [{
                action: "Portal account created via script",
                timestamp: new Date()
            }]
        };
        await patient.save();
        console.log("\n✅ Portal Account Created for Rufaro Hove!");
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("National ID:", nationalId);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
createPortalForRufaro();
```

## National_Vitality_Eye/Server/scripts/createTestPatient.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
async function createTestPatient() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        const email = "patient@example.com";
        const password = "Patient@123";
        const hashedPassword = await bcrypt.hash(password, 10);
        let patient = await Patient.findOne({ "portalAccount.email": email });
        if (patient) {
            console.log("Patient already exists, updating password...");
            patient.portalAccount.password = hashedPassword;
            patient.portalAccount.hasAccount = true;
            patient.portalAccount.isVerified = true;
            patient.portalAccount.isActive = true;
        } else {
            patient = await Patient.findOne({ firstName: "Mazvita", lastName: "Ndlovu" });
            if (!patient) {
                console.log("Mazvita not found, creating new test patient...");
                patient = new Patient({
                    firstName: "Test",
                    lastName: "Patient",
                    nationalId: "TEST-0001-ZIM",
                    dateOfBirth: new Date("1990-01-01"),
                    gender: "Female",
                    province: "Harare",
                    contactInfo: {
                        phone: "+263771112223",
                        address: "123 Test St, Harare"
                    }
                });
            }
            patient.portalAccount = {
                hasAccount: true,
                email: email,
                password: hashedPassword,
                isVerified: true,
                isActive: true
            };
        }
        await patient.save();
        console.log("\n✅ Test Patient Account Created/Updated!");
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("Name:", `${patient.firstName} ${patient.lastName}`);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
createTestPatient();
```

## National_Vitality_Eye/Server/scripts/fixAdmin.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();
async function fixAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        await User.deleteMany({ userId: "SYS1000" });
        console.log("✅ Removed existing SYS1000 if present");
        const hashedPassword = await bcrypt.hash("SYS@2026", 10);
        const admin = new User({
            firstName: "System",
            lastName: "Administrator",
            email: "admin@vitalityeye.health.gov.zw",
            phoneNumber: "+263771234500",
            employeeId: "ADMIN001",
            hospitalName: "Ministry of Health",
            hospitalId: "MOH001",
            province: "Harare",
            position: "System Administrator",
            userId: "SYS1000",
            password: hashedPassword,
            role: "admin",
            approvalStatus: "approved",
            isActive: true,
            verificationDocuments: {
                nationalId: "admin-verified",
                employmentLetter: "admin-verified"
            }
        });
        await admin.save();
        console.log("✅ Admin user created successfully!");
        console.log("\n====================================");
        console.log("🔐 LOGIN CREDENTIALS:");
        console.log("   User ID: SYS1000");
        console.log("   Password: SYS@2026");
        console.log("====================================\n");
        const admins = await User.find({ role: "admin" });
        console.log("All Admin Users:");
        admins.forEach(admin => {
            console.log(`   - ${admin.userId}: ${admin.firstName} ${admin.lastName}`);
        });
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}
fixAdmin();
```

## National_Vitality_Eye/Server/scripts/listOneStaff.js

```text
const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
async function listOneStaff() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ role: 'doctor' }).select('firstName lastName email userId');
        if (user) {
            console.log("\n=== STAFF DOCTOR ACCOUNT ===");
            console.log("Name:", `${user.firstName} ${user.lastName}`);
            console.log("Email:", user.email);
            console.log("User ID:", user.userId);
            console.log("Password:", "Staff@2026 (standard for seeded staff)");
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
listOneStaff();
```

## National_Vitality_Eye/Server/scripts/listPatients.js

```text
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
async function listPatients() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("❌ MONGO_URI not found in .env");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        const patients = await Patient.find({ 
            'portalAccount.hasAccount': true 
        }).select('firstName lastName portalAccount.email portalAccount.isVerified');
        console.log("\n=== PATIENTS WITH PORTAL ACCOUNTS ===");
        console.log("Count:", patients.length);
        patients.forEach(p => {
            console.log("\n---");
            console.log("Name:", `${p.firstName} ${p.lastName}`);
            console.log("Email:", p.portalAccount?.email);
            console.log("Is Verified:", p.portalAccount?.isVerified);
        });
        if (patients.length === 0) {
            console.log("\n⚠️ No patients with portal accounts found.");
            const allPatients = await Patient.find({}).limit(5);
            console.log("\nTotal patients in DB:", await Patient.countDocuments());
            if (allPatients.length > 0) {
                console.log("\nRecent patients (no portal account):");
                allPatients.forEach(p => {
                    console.log(`- ${p.firstName} ${p.lastName} (ID: ${p.nationalId})`);
                });
            }
        }
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
listPatients();
```

## National_Vitality_Eye/Server/scripts/resetLargeDatabase.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
require("dotenv").config();
const provinces = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
    'Mashonaland East', 'Mashonaland West', 'Masvingo',
    'Matabeleland North', 'Matabeleland South', 'Midlands'
];
const provinceCodes = {
    'Harare': 'HRE',
    'Bulawayo': 'BYO',
    'Manicaland': 'MAN',
    'Mashonaland Central': 'MCE',
    'Mashonaland East': 'MEA',
    'Mashonaland West': 'MWE',
    'Masvingo': 'MSV',
    'Matabeleland North': 'MTN',
    'Matabeleland South': 'MTS',
    'Midlands': 'MID'
};
async function resetToEmpty() {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 RESETTING DATABASE - ADMIN ONLY');
    console.log('='.repeat(60) + '\n');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB\n');
        console.log('🗑️  Clearing all existing data...');
        await User.deleteMany({});
        await Patient.deleteMany({});
        await MedicalRecord.deleteMany({});
        console.log('✅ All data cleared\n');
        console.log('👑 Creating admin users...');
        const adminPassword = await bcrypt.hash("Admin@2026", 10);
        const users = [];
        const sysAdmin = {
            firstName: 'System',
            lastName: 'Administrator',
            email: 'sysadmin@health.gov.zw',
            phoneNumber: '+263771234500',
            employeeId: 'SYS001',
            hospitalName: 'Ministry of Health',
            hospitalId: 'MOH001',
            province: 'Harare',
            position: 'System Administrator',
            userId: 'SYS1000',
            password: adminPassword,
            role: 'admin',
            approvalStatus: 'approved',
            isActive: true
        };
        await User.create(sysAdmin);
        users.push(sysAdmin);
        console.log(`   ✅ ${sysAdmin.userId} | ${sysAdmin.firstName} ${sysAdmin.lastName} | Central Admin`);
        for (const province of provinces) {
            const code = provinceCodes[province];
            const admin = {
                firstName: 'Provincial',
                lastName: 'Admin',
                email: `admin.${province.toLowerCase().replace(/\s+/g, '')}@health.gov.zw`,
                phoneNumber: `+26377${1000 + provinces.indexOf(province)}${Math.floor(100 + Math.random() * 899)}`,
                employeeId: `ADM${code}`,
                hospitalName: `${province} Provincial Hospital`,
                hospitalId: `HOSP${code}`,
                province: province,
                position: 'Provincial Administrator',
                userId: `${code}1000`,
                password: adminPassword,
                role: 'admin',
                approvalStatus: 'approved',
                isActive: true
            };
            await User.create(admin);
            users.push(admin);
            console.log(`   ✅ ${admin.userId} | ${province} Provincial Admin`);
        }
        console.log(`\n✅ Created ${users.length} admin users (1 Central + 10 Provincial)\n`);
        console.log('='.repeat(60));
        console.log('🎉 DATABASE RESET COMPLETE!');
        console.log('='.repeat(60));
        console.log('\n📊 SUMMARY:');
        console.log(`   👑 Central Admin: 1`);
        console.log(`   👑 Provincial Admins: 10`);
        console.log(`   👤 Patients: 0`);
        console.log(`   📋 Medical records: 0`);
        console.log('\n🔑 LOGIN CREDENTIALS:');
        console.log('-'.repeat(40));
        console.log('CENTRAL ADMIN:');
        console.log('   User ID: SYS1000');
        console.log('   Password: Admin@2026');
        console.log('');
        console.log('PROVINCIAL ADMINS:');
        for (const province of provinces) {
            const code = provinceCodes[province];
            console.log(`   • ${code}1000 / Admin@2026 (${province})`);
        }
        console.log('\n💡 NEXT STEPS:');
        console.log('   1. Login with SYS1000 or any provincial admin');
        console.log('   2. Manually add patients through the Patients page');
        console.log('   3. Add medical records through the Medical Records page');
        console.log('   4. The AI will learn as you add data');
        console.log('\n✅ Database reset complete! Ready for manual data entry.\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    }
}
resetToEmpty();
```

## National_Vitality_Eye/Server/scripts/resetSysAdmin.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();
async function resetSysAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        const password = "SYS@2026";
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Password to set:", password);
        console.log("Generated hash:", hashedPassword);
        const result = await User.updateOne(
            { userId: "SYS1000" },
            {
                $set: {
                    password: hashedPassword,
                    approvalStatus: "approved",
                    isActive: true,
                    role: "admin",
                    hospitalName: "National Referral Hospital",
                    province: "Harare",
                    position: "System Administrator"
                }
            }
        );
        console.log("Update result:", result);
        const user = await User.findOne({ userId: "SYS1000" }).select("+password");
        console.log("\n🔐 VERIFICATION:");
        console.log("User ID:", user.userId);
        console.log("Stored hash:", user.password);
        const isValid = await bcrypt.compare(password, user.password);
        console.log("Password test:", isValid ? "✅ SUCCESS" : "❌ FAILED");
        if (isValid) {
            console.log("\n✅ Admin password reset successfully!");
            console.log("====================================");
            console.log("🔐 LOGIN CREDENTIALS:");
            console.log("   User ID: SYS1000");
            console.log("   Password: SYS@2026");
            console.log("====================================");
        } else {
            console.log("\n❌ Password verification failed!");
        }
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}
resetSysAdmin();
```

## National_Vitality_Eye/Server/scripts/seedTrainingData.js

```text
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const provinces = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
    'Mashonaland East', 'Mashonaland West', 'Masvingo',
    'Matabeleland North', 'Matabeleland South', 'Midlands'
];
const provinceCodes = {
    'Harare': 'HRE',
    'Bulawayo': 'BYO',
    'Manicaland': 'MAN',
    'Mashonaland Central': 'MCE',
    'Mashonaland East': 'MEA',
    'Mashonaland West': 'MWE',
    'Masvingo': 'MSV',
    'Matabeleland North': 'MTN',
    'Matabeleland South': 'MTS',
    'Midlands': 'MID'
};
const hospitalSuffixes = [
    "General Hospital",
    "Medical Center",
    "District Hospital",
    "Central Hospital",
    "Mission Hospital",
    "Family Clinic",
    "Private Hospital",
    "Specialist Clinic",
    "Community Health Center",
    "Referral Hospital"
];
const firstNames = [
    "Tendai", "Chipo", "Farai", "Rudo", "Blessing", "Gift", "Memory", "Patience", 
    "Tapiwa", "Nyasha", "Takudzwa", "Anesu", "Kudzai", "Simba", "Tanaka",
    "Tafadzwa", "Tatenda", "Chengetai", "Munyaradzi", "Shingai", "Vimbai"
];
const lastNames = [
    "Moyo", "Ndlovu", "Sibanda", "Maphosa", "Dube", "Gumbo", "Zhou", "Nyoni", 
    "Ncube", "Mutasa", "Mukucha", "Marere", "Shumba", "Murewa", "Chipadza",
    "Hove", "Siziba", "Mhlanga", "Daka", "Machingura", "Chauke"
];
const generateUserId = (firstName) => {
    const prefix = firstName.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
};
async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB');
        const staffPassword = await bcrypt.hash("Staff@2026", 10);
        let totalUsersCreated = 0;
        for (const province of provinces) {
            console.log(`\n🏥 Generating data for ${province}...`);
            const code = provinceCodes[province];
            for (let i = 1; i <= 10; i++) {
                const hospitalId = `HOSP-${code}-${String(i).padStart(3, '0')}`;
                const hospitalName = `${province} ${hospitalSuffixes[i - 1]}`;
                const staffRoles = [
                    { role: 'admin', position: 'Hospital Administrator', count: 1 },
                    { role: 'doctor', position: 'Senior Medical Officer', count: 2 },
                    { role: 'nurse', position: 'Registered General Nurse', count: 3 },
                    { role: 'data_entry', position: 'Health Information Clerk', count: 1 },
                    { role: 'viewer', position: 'Medical Student', count: 1 }
                ];
                for (const staffDef of staffRoles) {
                    for (let j = 0; j < staffDef.count; j++) {
                        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${totalUsersCreated}@health.gov.zw`;
                        const user = {
                            firstName,
                            lastName,
                            email,
                            phoneNumber: `+26377${Math.floor(1000000 + Math.random() * 8999999)}`,
                            employeeId: `EMP-${code}-${Math.floor(10000 + Math.random() * 89999)}`,
                            hospitalName,
                            hospitalId,
                            province,
                            position: staffDef.position,
                            userId: generateUserId(firstName),
                            password: staffPassword,
                            role: staffDef.role,
                            approvalStatus: 'approved',
                            isActive: true,
                            approvedAt: new Date()
                        };
                        await User.create(user);
                        totalUsersCreated++;
                    }
                }
                console.log(`   ✅ Hospital: ${hospitalName} (${hospitalId}) - 8 staff members created`);
            }
        }
        console.log(`\n🎉 SEEDING COMPLETE! Total users created: ${totalUsersCreated}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}
seedData();
```

## National_Vitality_Eye/Server/scripts/testAIPerformance.js

```text

const mongoose = require("mongoose");
require("dotenv").config();
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const ContinuousLearner = require("../ai/continuousLearner");
async function testAIPerformance() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB\n");
        const recordCount = await MedicalRecord.countDocuments();
        if (recordCount === 0) {
            console.log("⚠️ No medical records found in database. Please add some records first.");
            console.log("   Run the database reset script to add sample data:\n");
            console.log("   node scripts/resetDatabase.js\n");
            process.exit(0);
        }
        const ai = new ContinuousLearner();
        const allRecords = await MedicalRecord.find({})
            .populate("patientId")
            .limit(2000);
        console.log(`📊 Loaded ${allRecords.length} records\n`);
        const validRecords = allRecords.filter(r => r.disease && r.symptoms && r.symptoms.length > 0);
        if (validRecords.length < 10) {
            console.log("⚠️ Insufficient valid records for testing. Need at least 10 records with diseases and symptoms.");
            console.log(`   Found ${validRecords.length} valid records.\n`);
            process.exit(0);
        }
        const splitPoint = Math.floor(validRecords.length * 0.8);
        const trainingRecords = validRecords.slice(0, splitPoint);
        const testRecords = validRecords.slice(splitPoint);
        console.log(`📚 Training on ${trainingRecords.length} records...`);
        ai.processBatch(trainingRecords);
        console.log(`\n🧪 Testing on ${testRecords.length} records...\n`);
        let correct = 0;
        let total = 0;
        let confidenceSum = 0;
        const resultsByDisease = new Map();
        for (const record of testRecords) {
            if (!record.disease || !record.symptoms || record.symptoms.length === 0) continue;
            const month = new Date(record.visitDate).getMonth();
            const patientAge = record.patientId?.age || null;
            const patientGender = record.patientId?.gender || null;
            const predictions = ai.predictDisease(
                record.symptoms,
                record.province || "Harare",
                month,
                patientAge,
                patientGender,
                [], 
                {}, 
                [], 
                {}  
            );
            const topPrediction = predictions.predictions[0];
            const wasCorrect = topPrediction?.disease === record.disease;
            if (wasCorrect) {
                correct++;
                confidenceSum += topPrediction.confidence;
            }
            total++;
            if (!resultsByDisease.has(record.disease)) {
                resultsByDisease.set(record.disease, { correct: 0, total: 0, confidenceSum: 0 });
            }
            const stats = resultsByDisease.get(record.disease);
            if (wasCorrect) {
                stats.correct++;
                stats.confidenceSum += topPrediction.confidence;
            }
            stats.total++;
        }
        const overallAccuracy = total > 0 ? (correct / total) * 100 : 0;
        const avgConfidence = correct > 0 ? confidenceSum / correct : 0;
        console.log("=".repeat(60));
        console.log("📊 AI PERFORMANCE TEST RESULTS");
        console.log("=".repeat(60));
        console.log(`\n🎯 Overall Accuracy: ${overallAccuracy.toFixed(1)}% (${correct}/${total})`);
        console.log(`📈 Average Confidence (when correct): ${avgConfidence.toFixed(1)}%`);
        console.log(`🎲 Calibration Score: ${(avgConfidence - overallAccuracy).toFixed(1)}% (lower is better)\n`);
        if (resultsByDisease.size > 0) {
            console.log("📋 Per-Disease Accuracy:");
            console.log("-".repeat(55));
            const sortedResults = Array.from(resultsByDisease.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 10);
            for (const [disease, stats] of sortedResults) {
                const accuracy = (stats.correct / stats.total) * 100;
                const avgConf = stats.correct > 0 ? stats.confidenceSum / stats.correct : 0;
                const barLength = Math.round(accuracy / 2);
                const bar = "█".repeat(barLength) + "░".repeat(50 - barLength);
                console.log(`   ${disease.padEnd(25)}: ${accuracy.toFixed(1)}% ${bar} (${stats.correct}/${stats.total})`);
            }
        }
        console.log("\n" + "=".repeat(60));
        console.log("💡 RECOMMENDATIONS");
        console.log("=".repeat(60));
        if (overallAccuracy >= 85) {
            console.log("✅ AI performance is EXCELLENT! Ready for production deployment.");
        } else if (overallAccuracy >= 75) {
            console.log("👍 AI performance is GOOD. Consider adding more training data.");
        } else if (overallAccuracy >= 65) {
            console.log("⚠️ AI performance is FAIR. More training data and feature engineering recommended.");
        } else {
            console.log("🔴 AI performance needs improvement. Add more diverse training data.");
        }
        console.log(`\n📊 Training data size: ${trainingRecords.length} records`);
        console.log(`🧪 Test data size: ${testRecords.length} records`);
        console.log(`🦠 Diseases tracked: ${ai.diseasePatterns.size}`);
        console.log("\n✅ Test complete!");
        console.log("=".repeat(60));
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}
testAIPerformance();
```

## National_Vitality_Eye/Server/scripts/testEmail.js

```text
const { sendApprovalEmail } = require("../utils/emailService");
require("dotenv").config();
async function test() {
    await sendApprovalEmail(
        "thediscoverytanya@gmail.com",  
        "TEST1000",
        "Test@123",
        "Test User",
        "doctor"
    );
    console.log("Test email sent");
}
test();
```

## National_Vitality_Eye/Server/scripts/verifySeededData.js

```text
const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
async function verifyData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB');
        const totalUsers = await User.countDocuments();
        console.log(`\nTotal users in database: ${totalUsers}`);
        const roles = ['admin', 'doctor', 'nurse', 'data_entry', 'viewer'];
        console.log('\nUsers by role:');
        for (const role of roles) {
            const count = await User.countDocuments({ role });
            console.log(`- ${role}: ${count}`);
        }
        const provinces = [
            'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
            'Mashonaland East', 'Mashonaland West', 'Masvingo',
            'Matabeleland North', 'Matabeleland South', 'Midlands'
        ];
        console.log('\nUsers by province:');
        for (const province of provinces) {
            const count = await User.countDocuments({ province });
            console.log(`- ${province}: ${count}`);
        }
        const hospitals = await User.distinct('hospitalId');
        console.log(`\nTotal unique hospitals: ${hospitals.length}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying data:', error);
        process.exit(1);
    }
}
verifyData();
```

## National_Vitality_Eye/Server/server.js

```text
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const path = require("path");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const medicalRoutes = require("./routes/medicalRoutes");
const patientPortalRoutes = require("./routes/patientPortalRoutes");
const aiFeaturesRoutes = require("./routes/aiFeaturesRoutes");
const { router: realTimeAIRoutes, setAIInstance } = require("./routes/realTimeAIRoutes");
const ContinuousLearner = require("./ai/continuousLearner");
const AlertEmitter = require("./ai/alertEmitter");
const RealTimeLearner = require("./ai/realTimeLearner");
const MedicalRecord = require("./models/MedicalRecord");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});
const jwt = require("jsonwebtoken");
const User = require("./models/User");
io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (!token) {
        console.log("WebSocket connection rejected: No token provided");
        return next(new Error("Authentication error"));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        User.findById(decoded.id).select("-password").then(user => {
            if (!user) {
                console.log("WebSocket connection rejected: User not found");
                return next(new Error("Authentication error"));
            }
            socket.user = user;
            next();
        }).catch(err => {
            console.log("WebSocket connection error:", err.message);
            next(new Error("Authentication error"));
        });
    } catch (err) {
        console.log("WebSocket connection rejected:", err.message);
        next(new Error("Authentication error"));
    }
});
global.io = io;
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.user?.firstName} ${socket.user?.lastName} (${socket.user?.role})`);
    const currentAlerts = alertEmitter ? alertEmitter.getActiveAlerts() : [];
    socket.emit('welcome', {
        message: 'Connected to National Vitality Eye',
        activeAlerts: currentAlerts,
        timestamp: new Date()
    });
    socket.on('subscribe', (topics) => {
        if (!Array.isArray(topics)) return;
        topics.forEach(topic => {
            if (
                topic.startsWith('province-') ||
                topic.startsWith('disease-') ||
                topic.startsWith('patient-') ||
                topic === 'all-alerts'
            ) {
                socket.join(topic);
                console.log(`📡 ${socket.user?.firstName} joined room: ${topic}`);
            }
        });
    });
    socket.on('unsubscribe', (topics) => {
        if (!Array.isArray(topics)) return;
        topics.forEach(topic => socket.leave(topic));
    });
    socket.on('acknowledge-alert', ({ alertId }) => {
        if (!alertId) return;
        if (alertEmitter) {
            alertEmitter.acknowledgeAlert(alertId, socket.user?._id);
            console.log(`✅ Alert ${alertId} acknowledged by ${socket.user?.firstName}`);
        }
    });
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.user?.firstName} — ${reason}`);
    });
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/auth", authRoutes);
app.use("/patients", patientRoutes);
app.use("/medical-records", medicalRoutes);
app.use("/ai", realTimeAIRoutes);
app.use("/api/patient", patientPortalRoutes);
app.use("/api/ai-features", aiFeaturesRoutes);
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
});
app.get("/", (req, res) => {
    res.json({ name: "Zimbabwe National Health System API", version: "3.0.0" });
});
let realTimeAI = null;
let alertEmitter = null;
async function initializeAI() {
    try {
        console.log("\n🧠 Initializing Enhanced Clinical AI...");
        const records = await MedicalRecord.find({})
            .populate('patientId', 'dateOfBirth gender clinicalProfile')
            .select({
                disease: 1, symptoms: 1, province: 1, visitDate: 1,
                vitalSigns: 1, disposition: 1, patientId: 1
            });
        console.log(`📊 Found ${records.length} medical records`);
        const ai = new ContinuousLearner();
        const emitter = new AlertEmitter(io);
        if (records.length > 0) {
            records.forEach(record => {
                if (record && record.disease) {
                    ai.processNewRecord(record, record.patientId);
                }
            });
            console.log(`✅ AI trained with ${records.length} records`);
        }
        console.log(`📊 Tracking ${ai.diseasePatterns.size} diseases`);
        realTimeAI = ai;
        alertEmitter = emitter;
        const rtLearner = new RealTimeLearner(io, emitter);
        rtLearner.start().catch(err =>
            console.error("❌ RealTimeLearner start error:", err.message)
        );
        setAIInstance(ai, emitter);
        app.locals.aiInstance = ai;
        app.locals.alertEmitter = emitter;
        return ai;
    } catch (error) {
        console.error("❌ AI initialization error:", error.message);
        return null;
    }
}
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error("❌ Missing MONGO_URI. Create `Server/.env` (see `Server/.env.example`).");
    process.exit(1);
}
const maskedMongoUri = mongoUri
    .replace(/\/\/([^:]+):([^@]+)@/i, (m, user) => `//${user}:***@`);
mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
})
    .then(() => {
        console.log("📦 MongoDB Connected");
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, async () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            await initializeAI();
            console.log(`\n✅ System ready!\n`);
        });
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err?.message || err);
        console.error(`   MONGO_URI: ${maskedMongoUri}`);
        if (String(err?.message || "").toLowerCase().includes("authentication failed")) {
            console.error("   Hint: verify Atlas DB user/password, URL-encode special characters, and ensure authSource/db name are correct.");
        }
        process.exit(1);
    });
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (io) io.close();
    mongoose.connection.close(() => process.exit(0));
});
```

## National_Vitality_Eye/Server/test-patient-email.js

```text
const nodemailer = require('nodemailer');
require('dotenv').config();
async function testEmail() {
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'thediscoverytanya@gmail.com', 
            subject: 'Test Email from Vitality Eye',
            text: 'If you receive this, patient emails will work!',
        });
        console.log('✅ Email sent successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}
testEmail();
```

## National_Vitality_Eye/Server/utils/analyticsHelpers.js

```text

const MIN_TREND_MONTHS = 1;
const MIN_PROJECTION_MONTHS = 1;
const RECOMMENDATION_TARGET = 30;
function resolvePrimaryHotspots(provinceBreakdown = []) {
    const rows = (provinceBreakdown || []).filter((p) => p?.province && (p.count ?? 0) > 0);
    if (!rows.length) {
        return { hotspots: [], label: null, maxCount: 0 };
    }
    const maxCount = Math.max(...rows.map((p) => p.count));
    const hotspots = rows
        .filter((p) => p.count === maxCount)
        .map((p) => ({ province: p.province, count: p.count, percentage: p.percentage }));
    return {
        hotspots,
        label: hotspots.map((h) => h.province).join(' & '),
        maxCount
    };
}
function clampPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
}
function toGrowthIndex(rawPercent) {
    if (!Number.isFinite(Number(rawPercent))) return 50;
    const clamped = Math.max(-50, Math.min(50, Number(rawPercent)));
    return clampPercent(((clamped + 50) / 100) * 100);
}
function rawGrowthPercent(current, previous) {
    const c = current || 0;
    const p = previous || 0;
    if (p > 0) return Math.round(((c - p) / p) * 100);
    if (c > 0) return 100;
    return 0;
}
const ZIMBABWE_PROVINCES = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 'Mashonaland East',
    'Mashonaland West', 'Masvingo', 'Matabeleland North', 'Matabeleland South', 'Midlands'
];
function periodDateWindows(period = 'all') {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    switch (period) {
        case '30days':
            return {
                currentStart: new Date(now.getTime() - 30 * day),
                previousStart: new Date(now.getTime() - 60 * day),
                previousEnd: new Date(now.getTime() - 30 * day)
            };
        case '90days':
            return {
                currentStart: new Date(now.getTime() - 90 * day),
                previousStart: new Date(now.getTime() - 180 * day),
                previousEnd: new Date(now.getTime() - 90 * day)
            };
        case 'year':
            return {
                currentStart: new Date(now.getTime() - 365 * day),
                previousStart: new Date(now.getTime() - 730 * day),
                previousEnd: new Date(now.getTime() - 365 * day)
            };
        default:
            return {
                currentStart: null,
                previousStart: null,
                previousEnd: null,
                growthCurrentStart: new Date(now.getTime() - 30 * day),
                growthPreviousStart: new Date(now.getTime() - 60 * day),
                growthPreviousEnd: new Date(now.getTime() - 30 * day)
            };
    }
}
function periodMatches(baseMatch, period = 'all') {
    const w = periodDateWindows(period);
    const current = w.currentStart
        ? { ...baseMatch, visitDate: { $gte: w.currentStart } }
        : { ...baseMatch };
    const previous = w.previousStart
        ? { ...baseMatch, visitDate: { $gte: w.previousStart, $lt: w.previousEnd } }
        : (w.growthPreviousStart
            ? { ...baseMatch, visitDate: { $gte: w.growthPreviousStart, $lt: w.growthPreviousEnd } }
            : null);
    const growthCurrent = w.growthCurrentStart
        ? { ...baseMatch, visitDate: { $gte: w.growthCurrentStart } }
        : current;
    return { current, previous, growthCurrent };
}
function riskLevelFromCasesAndGrowth(total, growthIndex) {
    if (total >= 100 || growthIndex >= 75) return 'CRITICAL';
    if (total >= 50 || growthIndex >= 60) return 'HIGH';
    if (total > 0) return 'MODERATE';
    return 'LOW';
}
function normalizeDemographics(child, adult, elderly) {
    const c = Math.max(0, child || 0);
    const a = Math.max(0, adult || 0);
    const e = Math.max(0, elderly || 0);
    const sum = c + a + e;
    if (sum === 0) return null;
    return {
        child: clampPercent((c / sum) * 100),
        adult: clampPercent((a / sum) * 100),
        elderly: clampPercent((e / sum) * 100)
    };
}
function buildMonthlyProjections(monthlyPoints, horizon = 3) {
    if (!monthlyPoints?.length) return [];
    const series = monthlyPoints.map((p, i) => ({
        x: i,
        count: p.count ?? 0,
        year: p._id?.year ?? p.year,
        month: p._id?.month ?? p.month
    }));
    const n = series.length;
    if (n === 1) {
        const only = series[0];
        return projectForward(only.year, only.month, only.count, 0, horizon);
    }
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    series.forEach(({ x, count }) => {
        sumX += x;
        sumY += count;
        sumXY += x * count;
        sumXX += x * x;
    });
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    const last = series[n - 1];
    const nextY = Math.max(0, Math.round(intercept + slope * n));
    return projectForward(last.year, last.month, nextY, Math.max(0, Math.round(slope)), horizon);
}
function projectForward(year, month, baseCount, slope, horizon) {
    const out = [];
    let y = year;
    let m = month;
    let predicted = baseCount;
    for (let i = 0; i < horizon; i++) {
        m += 1;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        if (i > 0) predicted = Math.max(0, predicted + slope);
        out.push({
            _id: { year: y, month: m },
            count: predicted,
            projected: true
        });
    }
    return out;
}
function aggregateMonthlyTotals(trendsData) {
    const monthlyTotals = {};
    (trendsData || []).forEach((item) => {
        const key = `${item._id.year}-${item._id.month}`;
        monthlyTotals[key] = (monthlyTotals[key] || 0) + item.count;
    });
    return Object.entries(monthlyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
            const [year, month] = key.split('-').map(Number);
            return { _id: { year, month }, count };
        });
}
function growthRateFromSeries(series) {
    if (!series?.length || series.length < 2) return null;
    const last = series[series.length - 1]?.count ?? 0;
    const prev = series[series.length - 2]?.count ?? 0;
    if (prev === 0) return last > 0 ? 100 : 0;
    return clampPercent(((last - prev) / prev) * 100);
}
function generateTrendInsight(series, projections, diseaseName = 'this disease') {
    if (!series?.length || series.length < MIN_TREND_MONTHS) return null;
    const historical = series.map((s) => s.count);
    const last = historical[historical.length - 1];
    const prev = historical[historical.length - 2];
    const growth = prev > 0 ? ((last - prev) / prev) * 100 : (last > 0 ? 100 : 0);
    const projectedPeak = projections?.length
        ? Math.max(...projections.map((p) => p.count))
        : null;
    const projectionNote = projectedPeak != null
        ? ` Linear forecast for next period: ~${projectedPeak} cases.`
        : '';
    if (prev === 0 && last > 0) {
        return `${diseaseName}: ${last} cases in the latest month with no prior-month baseline — cannot compute period-over-period growth yet.${projectionNote}`;
    }
    if (growth > 15) {
        return `${diseaseName}: latest month +${clampPercent(growth)}% vs previous (${prev} → ${last} cases).${projectionNote}`;
    }
    if (growth > 5) {
        return `${diseaseName}: moderate rise +${clampPercent(growth)}% (${prev} → ${last} cases).${projectionNote}`;
    }
    if (growth < -5) {
        return `${diseaseName}: decline ${clampPercent(growth)}% (${prev} → ${last} cases).${projectionNote}`;
    }
    return `${diseaseName}: stable between months (${prev} → ${last} cases, ${clampPercent(Math.abs(growth))}% change).${projectionNote}`;
}
function generateOverviewInsight(monthlyTotals, projections) {
    if (!monthlyTotals?.length || monthlyTotals.length < MIN_TREND_MONTHS) return null;
    const totals = monthlyTotals.map((m) => m.count);
    const last = totals[totals.length - 1];
    const prev = totals[totals.length - 2];
    const growth = prev > 0 ? ((last - prev) / prev) * 100 : (last > 0 ? 100 : 0);
    const nextProjected = projections?.length ? projections[0].count : null;
    const projNote = nextProjected != null ? ` Forecast next month: ~${nextProjected} total visits.` : '';
    if (prev === 0 && last > 0) {
        return `System total: ${last} visits in latest month; no prior month for comparison.${projNote}`;
    }
    if (growth > 12) {
        return `All-disease volume +${clampPercent(growth)}% (${prev} → ${last} visits).${projNote}`;
    }
    if (growth < -8) {
        return `All-disease volume ${clampPercent(growth)}% (${prev} → ${last} visits).${projNote}`;
    }
    return `All-disease volume change ${clampPercent(growth)}% (${prev} → ${last} visits).${projNote}`;
}
function buildDiseaseProfileFromData({
    monthlyTrend,
    provinceBreakdown,
    topSymptoms,
    outcomes,
    total,
    growthRate,
    currentPeriodCount,
    previousPeriodCount
}) {
    if (!total || total <= 0) return null;
    const profile = {
        totalCases: total,
        focusAreas: []
    };
    if (previousPeriodCount > 0) {
        profile.recentGrowth = `${growthRate > 0 ? '+' : ''}${growthRate}% (last 30d: ${currentPeriodCount} vs prior ${previousPeriodCount})`;
    } else if (currentPeriodCount > 0) {
        profile.recentGrowth = `${currentPeriodCount} cases in last 30 days (no prior 30-day baseline)`;
    }
    if (monthlyTrend?.length >= MIN_TREND_MONTHS) {
        const peak = monthlyTrend.reduce((best, m) => (m.count > best.count ? m : best), monthlyTrend[0]);
        profile.peakMonth = `${peak._id.month}/${peak._id.year} (${peak.count} cases)`;
    }
    (provinceBreakdown || []).forEach((p) => {
        profile.focusAreas.push(`${p.province}: ${p.count} cases (${p.percentage}% of disease total)`);
    });
    (topSymptoms || []).forEach((s) => {
        profile.focusAreas.push(`Symptom "${s.symptom}": ${s.percentage}% of cases (${s.count} records)`);
    });
    const outcomeEntries = Object.entries(outcomes || {}).filter(([, v]) => v?.count > 0);
    if (outcomeEntries.length) {
        profile.outcomeSummary = outcomeEntries
            .map(([name, v]) => `${name} ${v.count} (${v.percentage}%)`)
            .join(' · ');
    }
    return profile.focusAreas.length || profile.peakMonth || profile.recentGrowth
        ? profile
        : { totalCases: total, focusAreas: [] };
}
function pushRec(list, rec) {
    if (rec && rec.title && rec.action && rec.reason) list.push(rec);
}
function buildDataDrivenRecommendations(ctx) {
    const recs = [];
    const {
        diseaseName = 'Disease',
        total = 0,
        growthRate = 0,
        currentPeriodCount = 0,
        previousPeriodCount = 0,
        provinceBreakdown = [],
        outcomes = {},
        topSymptoms = [],
        visitTypes = [],
        vitalsProfile = null,
        monthlyTrend = [],
        demographics = null,
        chronicConditions = [],
        hotspot = null,
        primaryHotspots = []
    } = ctx;
    if (!total) return recs;
    const hotspotLabel = primaryHotspots.length
        ? primaryHotspots.map((h) => h.province).join(' & ')
        : hotspot;
    if (previousPeriodCount > 0) {
        const gr = Math.round(growthRate);
        if (gr > 20) {
            pushRec(recs, {
                type: 'URGENT',
                title: `30-day surge — ${diseaseName}`,
                action: hotspotLabel
                    ? `Escalate response in ${hotspotLabel}; ${currentPeriodCount} cases vs ${previousPeriodCount} prior 30 days.`
                    : `Review surge protocol; ${currentPeriodCount} vs ${previousPeriodCount} cases (30-day windows).`,
                reason: `Recorded +${gr}% growth from live case counts.`
            });
        } else if (gr > 5) {
            pushRec(recs, {
                type: 'MONITOR',
                title: `Rising 30-day caseload`,
                action: `Increase surveillance; ${currentPeriodCount} cases vs ${previousPeriodCount} previous period.`,
                reason: `+${gr}% from database counts (not estimated).`
            });
        } else if (gr < -5) {
            pushRec(recs, {
                type: 'POSITIVE',
                title: `Declining 30-day caseload`,
                action: `Maintain monitoring; ${currentPeriodCount} vs ${previousPeriodCount} cases.`,
                reason: `${gr}% reduction in 30-day windows.`
            });
        } else {
            pushRec(recs, {
                type: 'STABILITY',
                title: `Stable 30-day volume`,
                action: `Continue standard protocols (${currentPeriodCount} vs ${previousPeriodCount} cases).`,
                reason: `${gr}% change between consecutive 30-day periods.`
            });
        }
    } else if (currentPeriodCount > 0) {
        pushRec(recs, {
            type: 'DATA',
            title: 'No prior 30-day baseline',
            action: `Document and monitor ${currentPeriodCount} recent cases; growth rate unavailable until next period.`,
            reason: 'Previous 30-day count is zero in the database.'
        });
    }
    const tiedNames = new Set((primaryHotspots || []).map((h) => h.province));
    (provinceBreakdown || []).forEach((p) => {
        if (!p.province || !p.count) return;
        const isPrimary = tiedNames.has(p.province);
        pushRec(recs, {
            type: isPrimary ? 'GEOGRAPHIC' : 'REGIONAL',
            title: `${p.province} — ${p.percentage}% of cases`,
            action: isPrimary
                ? `Primary hotspot${tiedNames.size > 1 ? ' (tied)' : ''}: allocate outreach to ${p.province} (${p.count} recorded cases).`
                : `Review capacity in ${p.province} (${p.count} cases, ${p.percentage}% share).`,
            reason: `Derived from ${total} total ${diseaseName} records.`
        });
    });
    (topSymptoms || []).forEach((s) => {
        if (!s.symptom || !s.count) return;
        pushRec(recs, {
            type: 'CLINICAL',
            title: `Symptom: ${s.symptom}`,
            action: `Screen and triage for "${s.symptom}" in ${diseaseName} workups (${s.percentage}% prevalence).`,
            reason: `${s.count} of ${total} records list this symptom.`
        });
    });
    Object.entries(outcomes).forEach(([name, data]) => {
        if (!data?.count) return;
        const type = name === 'Deceased' ? 'CRITICAL' : name === 'Admitted' ? 'RESOURCE' : 'OUTCOME';
        pushRec(recs, {
            type,
            title: `Outcome — ${name}`,
            action: `Plan resources for ${data.count} ${name.toLowerCase()} cases (${data.percentage}% of outcomes).`,
            reason: `Recorded disposition data for ${diseaseName}.`
        });
    });
    (visitTypes || []).forEach((v) => {
        if (!v.count) return;
        pushRec(recs, {
            type: 'OPERATIONS',
            title: `Visit type — ${v.type || 'Unknown'}`,
            action: `Align staffing to ${v.count} ${v.type || 'unknown'} visits (${v.percentage}%).`,
            reason: `Visit-type field on medical records.`
        });
    });
    if (vitalsProfile?.sampleSize >= 1) {
        const v = vitalsProfile;
        if (v.temperature != null) {
            pushRec(recs, {
                type: v.temperature > 37.5 ? 'CLINICAL' : 'VITALS',
                title: `Mean temperature ${v.temperature}°C`,
                action: v.temperature > 37.5
                    ? 'Prioritize fever management in triage.'
                    : 'Temperature within recorded mean — continue standard monitoring.',
                reason: `Average from ${v.sampleSize} records with vitals.`
            });
        }
        if (v.heartRate != null) {
            pushRec(recs, {
                type: v.heartRate > 100 ? 'CLINICAL' : 'VITALS',
                title: `Mean heart rate ${v.heartRate} bpm`,
                action: v.heartRate > 100 ? 'Cardiac monitoring for tachycardia presentations.' : 'Heart rate mean documented in cohort.',
                reason: `${v.sampleSize} vitals samples.`
            });
        }
        if (v.bloodPressure?.systolic != null) {
            pushRec(recs, {
                type: v.bloodPressure.systolic > 140 ? 'CLINICAL' : 'VITALS',
                title: `Mean BP ${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}`,
                action: v.bloodPressure.systolic > 140 ? 'Hypertension management per recorded averages.' : 'BP documented in patient vitals.',
                reason: `${v.sampleSize} samples with blood pressure.`
            });
        }
        if (v.oxygenSaturation != null) {
            pushRec(recs, {
                type: v.oxygenSaturation < 95 ? 'CRITICAL' : 'VITALS',
                title: `Mean SpO₂ ${v.oxygenSaturation}%`,
                action: v.oxygenSaturation < 95 ? 'Ensure oxygen availability — cohort mean below 95%.' : 'Oxygen saturation recorded in vitals.',
                reason: `${v.sampleSize} SpO₂ readings averaged.`
            });
        }
        if (v.respiratoryRate != null) {
            pushRec(recs, {
                type: 'VITALS',
                title: `Mean respiratory rate ${v.respiratoryRate}/min`,
                action: 'Use cohort respiratory rate as triage reference.',
                reason: `${v.sampleSize} records with respiratory rate.`
            });
        }
        if (v.bmi != null) {
            pushRec(recs, {
                type: 'VITALS',
                title: `Mean BMI ${v.bmi}`,
                action: 'Factor BMI distribution into chronic-care planning.',
                reason: `${v.sampleSize} BMI values in records.`
            });
        }
    }
    if (demographics) {
        if (demographics.child > 0) {
            pushRec(recs, {
                type: 'PREVENTION',
                title: `Pediatric share ${demographics.child}%`,
                action: 'Target pediatric screening where this age band is represented.',
                reason: 'Age derived from patient date-of-birth on linked records.'
            });
        }
        if (demographics.adult > 0) {
            pushRec(recs, {
                type: 'PREVENTION',
                title: `Adult share ${demographics.adult}%`,
                action: 'Workplace and community programs for adult cohort.',
                reason: 'Recorded age distribution.'
            });
        }
        if (demographics.elderly > 0) {
            pushRec(recs, {
                type: 'PREVENTION',
                title: `Geriatric share ${demographics.elderly}%`,
                action: 'Protect high-risk geriatric patients in care pathways.',
                reason: 'Recorded age distribution.'
            });
        }
    }
    (chronicConditions || []).forEach((c) => {
        if (!c.condition || !c.prevalence) return;
        pushRec(recs, {
            type: 'COMORBIDITY',
            title: `Comorbidity: ${c.condition}`,
            action: `Screen for ${c.condition} during ${diseaseName} assessments.`,
            reason: `${c.prevalence}% of AI-learned cohort (${c.count ?? 'n/a'} co-occurrences).`
        });
    });
    if ((monthlyTrend || []).length >= MIN_TREND_MONTHS) {
        for (let i = 1; i < monthlyTrend.length; i++) {
            const prev = monthlyTrend[i - 1];
            const cur = monthlyTrend[i];
            const delta = cur.count - prev.count;
            const pct = prev.count > 0 ? clampPercent((delta / prev.count) * 100) : (cur.count > 0 ? 100 : 0);
            const label = `${prev._id.month}/${prev._id.year}→${cur._id.month}/${cur._id.year}`;
            if (Math.abs(pct) > 0 || delta !== 0) {
                pushRec(recs, {
                    type: pct > 0 ? 'MONITOR' : 'POSITIVE',
                    title: `Monthly shift ${label}`,
                    action: `${pct > 0 ? 'Investigate' : 'Review factors behind'} change (${prev.count} → ${cur.count} cases).`,
                    reason: `${pct > 0 ? '+' : ''}${pct}% month-over-month from stored visits.`
                });
            }
        }
        const peak = monthlyTrend.reduce((b, m) => (m.count > b.count ? m : b), monthlyTrend[0]);
        pushRec(recs, {
            type: 'SEASONAL',
            title: `Historical peak ${peak._id.month}/${peak._id.year}`,
            action: `Pre-position resources before peak month (${peak.count} cases recorded).`,
            reason: 'Highest monthly count in available history.'
        });
    }
    const avgProvince = provinceBreakdown.length
        ? provinceBreakdown.reduce((s, p) => s + p.count, 0) / provinceBreakdown.length
        : 0;
    provinceBreakdown
        .filter((p) => p.count > 0 && p.count < avgProvince * 0.5)
        .forEach((p) => {
            pushRec(recs, {
                type: 'EQUITY',
                title: `Low reporting — ${p.province}`,
                action: `Verify surveillance coverage in ${p.province} (${p.count} cases vs cohort average ${Math.round(avgProvince)}).`,
                reason: 'Province count below 50% of mean provincial volume.'
            });
        });
  return recs;
}
function patternToRecommendationContext(pattern, diseaseName, extras = {}) {
    const total = pattern.count || 0;
    const provinceBreakdown = Array.from(pattern.provinces?.entries() || [])
        .sort((a, b) => b[1] - a[1])
        .map(([province, count]) => ({
            province,
            count,
            percentage: total > 0 ? clampPercent((count / total) * 100) : 0
        }));
    const topSymptoms = Array.from(pattern.symptoms?.entries() || [])
        .sort((a, b) => b[1] - a[1])
        .map(([symptom, count]) => ({
            symptom,
            count,
            percentage: total > 0 ? clampPercent((count / total) * 100) : 0
        }));
    const outcomes = {
        Discharged: { count: pattern.outcomes?.recovered || 0, percentage: 0 },
        Admitted: { count: pattern.outcomes?.admitted || 0, percentage: 0 },
        Deceased: { count: pattern.outcomes?.deceased || 0, percentage: 0 },
        Transferred: { count: pattern.outcomes?.referred || 0, percentage: 0 }
    };
    const outcomeTotal = Object.values(outcomes).reduce((s, o) => s + o.count, 0);
    Object.keys(outcomes).forEach((k) => {
        outcomes[k].percentage = outcomeTotal > 0 ? clampPercent((outcomes[k].count / outcomeTotal) * 100) : 0;
    });
    const chronicConditions = Array.from(pattern.chronicConditions?.entries() || [])
        .sort((a, b) => b[1] - a[1])
        .map(([condition, count]) => ({
            condition,
            count,
            prevalence: total > 0 ? clampPercent((count / total) * 100) : 0
        }));
    const vitals = pattern.vitalSignsAverages || {};
    const sampleSize = Math.max(
        vitals.temperature?.count || 0,
        vitals.heartRate?.count || 0,
        vitals.oxygenSaturation?.count || 0
    );
    const vitalsProfile = sampleSize >= 1 ? {
        temperature: vitals.temperature?.avg ?? null,
        heartRate: vitals.heartRate?.avg ?? null,
        bloodPressure: vitals.systolicBP?.avg ? {
            systolic: vitals.systolicBP.avg,
            diastolic: vitals.diastolicBP?.avg ?? null
        } : null,
        oxygenSaturation: vitals.oxygenSaturation?.avg ?? null,
        respiratoryRate: vitals.respiratoryRate?.avg ?? null,
        bmi: vitals.bmi?.avg ?? null,
        sampleSize
    } : (sampleSize > 0 ? { sampleSize } : null);
    return {
        diseaseName,
        total,
        provinceBreakdown,
        topSymptoms,
        outcomes,
        chronicConditions,
        vitalsProfile,
        visitTypes: extras.visitTypes || [],
        monthlyTrend: extras.monthlyTrend || [],
        growthRate: extras.growthRate ?? 0,
        currentPeriodCount: extras.currentPeriodCount ?? 0,
        previousPeriodCount: extras.previousPeriodCount ?? 0,
        demographics: extras.demographics ?? null,
        primaryHotspots: resolvePrimaryHotspots(provinceBreakdown).hotspots,
        hotspot: resolvePrimaryHotspots(provinceBreakdown).label
    };
}
async function buildDiseasePeriodAnalytics({ MedicalRecord, baseMatch, period = 'all', diseaseLabel = '' }) {
    const { current, previous, growthCurrent } = periodMatches(baseMatch, period);
    const [provinces, outcomes, visitTypes, symptoms, vitals, monthlyTrend,
           currentPeriodCount, previousPeriodCount, totalInPeriod] = await Promise.all([
        MedicalRecord.aggregate([{ $match: current }, { $group: { _id: '$province', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        MedicalRecord.aggregate([{ $match: current }, { $group: { _id: '$disposition', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        MedicalRecord.aggregate([{ $match: current }, { $group: { _id: '$visitType', count: { $sum: 1 } } }]),
        MedicalRecord.aggregate([
            { $match: { ...current, symptoms: { $exists: true, $ne: [] } } },
            { $unwind: '$symptoms' },
            { $group: { _id: '$symptoms', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        MedicalRecord.aggregate([
            { $match: current },
            { $group: {
                _id: null,
                avgTemperature: { $avg: '$vitalSigns.temperature' },
                avgHeartRate: { $avg: '$vitalSigns.heartRate' },
                avgSystolic: { $avg: '$vitalSigns.bloodPressure.systolic' },
                avgDiastolic: { $avg: '$vitalSigns.bloodPressure.diastolic' },
                avgOxygenSat: { $avg: '$vitalSigns.oxygenSaturation' },
                avgRespiratoryRate: { $avg: '$vitalSigns.respiratoryRate' },
                avgBMI: { $avg: '$vitalSigns.bmi' },
                count: { $sum: 1 }
            }}
        ]),
        MedicalRecord.aggregate([
            { $match: current },
            { $group: { _id: { year: { $year: '$visitDate' }, month: { $month: '$visitDate' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        MedicalRecord.countDocuments(growthCurrent),
        previous ? MedicalRecord.countDocuments(previous) : Promise.resolve(0),
        MedicalRecord.countDocuments(current)
    ]);
    let growthRate = rawGrowthPercent(currentPeriodCount, previousPeriodCount);
    const totalRecords = await MedicalRecord.countDocuments();
    const totalOutcomes = outcomes.reduce((s, o) => s + o.count, 0);
    const provinceBreakdown = provinces.map((p) => ({
        province: p._id,
        count: p.count,
        percentage: totalInPeriod > 0 ? clampPercent((p.count / totalInPeriod) * 100) : 0
    }));
    const primaryHotspotInfo = resolvePrimaryHotspots(provinceBreakdown);
    const projections = buildMonthlyProjections(monthlyTrend, 3);
    const trendInsight = generateTrendInsight(monthlyTrend, projections, diseaseLabel);
    const outcomesMap = outcomes.reduce((acc, o) => {
        acc[o._id || 'Unknown'] = {
            count: o.count,
            percentage: totalOutcomes > 0 ? clampPercent((o.count / totalOutcomes) * 100) : 0
        };
        return acc;
    }, {});
    const topSymptomsList = symptoms.map((s) => ({
        symptom: s._id,
        count: s.count,
        percentage: totalInPeriod > 0 ? clampPercent((s.count / totalInPeriod) * 100) : 0
    }));
    const visitTypesList = visitTypes.map((v) => ({
        type: v._id || 'Unknown',
        count: v.count,
        percentage: totalInPeriod > 0 ? clampPercent((v.count / totalInPeriod) * 100) : 0
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
    } : null;
    return {
        totalCases: totalInPeriod,
        growthRate,
        growthIndex: toGrowthIndex(growthRate),
        prevalenceShare: totalRecords > 0 ? clampPercent((totalInPeriod / totalRecords) * 100) : 0,
        currentPeriodCases: currentPeriodCount,
        previousPeriodCases: previousPeriodCount,
        provinceBreakdown,
        primaryHotspots: primaryHotspotInfo.hotspots,
        hotspot: primaryHotspotInfo.label,
        hotspotCases: primaryHotspotInfo.maxCount,
        outcomes: outcomesMap,
        visitTypes: visitTypesList,
        topSymptoms: topSymptomsList,
        monthlyTrend,
        projections,
        trendInsight,
        vitalsProfile,
        period
    };
}
async function buildMapProvinceStats({ MedicalRecord, matchFilter = {}, period = 'all' }) {
    const windows = periodDateWindows(period);
    const baseMatch = { ...matchFilter };
    const currentMatch = windows.currentStart
        ? { ...baseMatch, visitDate: { $gte: windows.currentStart } }
        : { ...baseMatch };
    const previousMatch = windows.previousStart
        ? { ...baseMatch, visitDate: { $gte: windows.previousStart, $lt: windows.previousEnd } }
        : (windows.growthPreviousStart
            ? { ...baseMatch, visitDate: { $gte: windows.growthPreviousStart, $lt: windows.growthPreviousEnd } }
            : null);
    const [currentByProvince, previousByProvince, diseaseByProvince, totalCount] = await Promise.all([
        MedicalRecord.aggregate([
            { $match: currentMatch },
            { $group: { _id: '$province', count: { $sum: 1 } } }
        ]),
        previousMatch
            ? MedicalRecord.aggregate([
                { $match: previousMatch },
                { $group: { _id: '$province', count: { $sum: 1 } } }
            ])
            : Promise.resolve([]),
        MedicalRecord.aggregate([
            { $match: currentMatch },
            { $group: { _id: { province: '$province', disease: '$disease' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        MedicalRecord.countDocuments(currentMatch)
    ]);
    const currentMap = new Map(currentByProvince.map((r) => [r._id, r.count]));
    const previousMap = new Map(previousByProvince.map((r) => [r._id, r.count]));
    const diseasesPerProvince = new Map();
    diseaseByProvince.forEach((row) => {
        const prov = row._id?.province;
        const dis = row._id?.disease;
        if (!prov || !dis) return;
        if (!diseasesPerProvince.has(prov)) diseasesPerProvince.set(prov, []);
        diseasesPerProvince.get(prov).push({ name: dis, cases: row.count });
    });
    diseasesPerProvince.forEach((list, prov) => {
        list.sort((a, b) => b.cases - a.cases);
        diseasesPerProvince.set(prov, list);
    });
    const provinceBreakdownForHotspot = [];
    const provinces = ZIMBABWE_PROVINCES.map((name) => {
        const total = currentMap.get(name) || 0;
        const prev = previousMap.get(name) || 0;
        const rawGrowth = rawGrowthPercent(total, prev);
        const growthIndex = toGrowthIndex(rawGrowth);
        const projectedCount = Math.max(0, Math.round(total * (1 + rawGrowth / 100)));
        const projectedGrowth = toGrowthIndex(rawGrowth * 1.1);
        if (total > 0) {
            provinceBreakdownForHotspot.push({
                province: name,
                count: total,
                percentage: totalCount > 0 ? clampPercent((total / totalCount) * 100) : 0
            });
        }
        const diseases = diseasesPerProvince.get(name) || [];
        const topDisease = diseases[0] || null;
        return {
            _id: name,
            total,
            count: total,
            growthRate: growthIndex,
            growthRateRaw: rawGrowth,
            projectedGrowth,
            projectedCount,
            riskLevel: riskLevelFromCasesAndGrowth(total, growthIndex),
            topDisease,
            diseases
        };
    });
    const hotspotInfo = resolvePrimaryHotspots(provinceBreakdownForHotspot);
    const [currentTotal, previousTotal] = await Promise.all([
        MedicalRecord.countDocuments(currentMatch),
        previousMatch ? MedicalRecord.countDocuments(previousMatch) : Promise.resolve(0)
    ]);
    const nationalRawGrowth = rawGrowthPercent(currentTotal, previousTotal);
    const aggregatedGrowthIndex = toGrowthIndex(nationalRawGrowth);
    return {
        provinces,
        summary: {
            totalCases: totalCount,
            aggregatedGrowthIndex,
            growthRateRaw: nationalRawGrowth,
            hotspot: hotspotInfo.label,
            hotspotCases: hotspotInfo.maxCount,
            primaryHotspots: hotspotInfo.hotspots
        }
    };
}
module.exports = {
    clampPercent,
    toGrowthIndex,
    rawGrowthPercent,
    periodMatches,
    buildDiseasePeriodAnalytics,
    buildMapProvinceStats,
    periodDateWindows,
    resolvePrimaryHotspots,
    normalizeDemographics,
    buildMonthlyProjections,
    aggregateMonthlyTotals,
    growthRateFromSeries,
    generateTrendInsight,
    generateOverviewInsight,
    buildDiseaseProfileFromData,
    buildDataDrivenRecommendations,
    patternToRecommendationContext,
    MIN_TREND_MONTHS,
    MIN_PROJECTION_MONTHS,
    RECOMMENDATION_TARGET
};
```

## National_Vitality_Eye/Server/utils/emailService.js

```text
const nodemailer = require('nodemailer');
let transporter = null;
const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email credentials not configured. Emails will be logged to console instead.');
        return null;
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    return transporter;
};
const sendApprovalEmail = async (userEmail, userId, password, name, role) => {
    const transport = getTransporter();
    if (!transport) {
        console.log('\n📧 ========== APPROVAL EMAIL (Would be sent) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`User ID: ${userId}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('==================================================\n');
        return true;
    }
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🎉 Welcome to National Vitality Eye - Account Approved!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Account Approved - National Vitality Eye</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
                    .content { background: white; padding: 30px; }
                    .credentials { background: #f8f9fa; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .credentials .label { font-weight: bold; color: #4F46E5; }
                    .credentials .value { font-family: monospace; font-size: 16px; background: #e9ecef; padding: 4px 8px; border-radius: 4px; display: inline-block; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    .role-badge { display: inline-block; background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Zimbabwe's Premier AI-Powered Health System</p>
                    </div>
                    <div class="content">
                        <h2>Welcome, ${name}! 👋</h2>
                        <p>We are excited to inform you that your account has been <strong style="color: #10B981;">APPROVED</strong> by an administrator.</p>
                        <div class="credentials">
                            <p><span class="label">📋 Assigned Role:</span> <span class="role-badge">${role.toUpperCase()}</span></p>
                            <p><span class="label">🆔 Your User ID:</span> <span class="value">${userId}</span></p>
                            <p><span class="label">🔐 Temporary Password:</span> <span class="value">${password}</span></p>
                        </div>
                        <p><strong>⚠️ Important Security Notice:</strong></p>
                        <ul>
                            <li>You will be required to change your password on first login</li>
                            <li>Never share your password with anyone</li>
                            <li>Contact your administrator immediately if you suspect unauthorized access</li>
                        </ul>
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">🔐 Login to Your Account</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        console.log('\n📧 ========== CREDENTIALS (Email Failed) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`User ID: ${userId}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('==================================================\n');
        return false;
    }
};
const sendRejectionEmail = async (userEmail, name, reason) => {
    const transport = getTransporter();
    if (!transport) {
        console.log('\n📧 ========== REJECTION EMAIL (Would be sent) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`Reason: ${reason}`);
        console.log('==================================================\n');
        return true;
    }
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'National Vitality Eye - Registration Update',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Registration Status - National Vitality Eye</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .header { background: #dc2626; padding: 20px; text-align: center; color: white; }
                    .content { padding: 20px; }
                    .button { display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>National Vitality Eye</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>We regret to inform you that your registration application has been <strong style="color: #dc2626;">REJECTED</strong>.</p>
                        <p><strong>Reason for rejection:</strong> ${reason}</p>
                        <p>Please contact your hospital administrator for more information or to resolve the issues with your application.</p>
                        <p>You may reapply once the issues have been addressed.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/register" class="button">Apply Again</a>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Rejection email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send rejection email:', error.message);
        return false;
    }
};
const sendPatientVerificationEmail = async (email, name, verificationToken) => {
    const transport = getTransporter();
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/verify?token=${verificationToken}`;
    if (!transport) {
        console.log('\n📧 ========== PATIENT VERIFICATION EMAIL (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Verification Link: ${verificationLink}`);
        console.log('===============================================================\n');
        return true;
    }
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📧 Please Verify Your Email - National Vitality Eye Patient Portal',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Verify Your Email</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Patient Portal Email Verification</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>Thank you for registering for the National Vitality Eye Patient Portal!</p>
                        <p>Please verify your email address by clicking the button below:</p>
                        <div style="text-align: center;">
                            <a href="${verificationLink}" class="button">✅ Verify Email Address</a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">${verificationLink}</p>
                        <p><strong>Why verify?</strong> Verification ensures that you are the rightful owner of this email and helps us keep your medical records secure.</p>
                        <p>This link will expire in 24 hours.</p>
                        <p>If you did not create an account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send verification email:', error.message);
        return false;
    }
};
const sendPasswordResetEmail = async (email, name, resetToken) => {
    const transport = getTransporter();
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/reset-password?token=${resetToken}`;
    if (!transport) {
        console.log('\n📧 ========== PASSWORD RESET EMAIL (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log('==========================================================\n');
        return true;
    }
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Password Reset Request - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Password Reset</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Password Reset Request</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>We received a request to reset your password for your Patient Portal account.</p>
                        <div style="text-align: center;">
                            <a href="${resetLink}" class="button">🔐 Reset Your Password</a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">${resetLink}</p>
                        <div class="warning">
                            <p><strong>⚠️ Important:</strong></p>
                            <p>This link will expire in 1 hour for security reasons.</p>
                            <p>If you did not request a password reset, please ignore this email or contact support.</p>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error.message);
        return false;
    }
};
const sendMedicalReportEmail = async (email, name, patientName, recordType, visitDate) => {
    const transport = getTransporter();
    const portalLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/dashboard`;
    if (!transport) {
        console.log('\n📧 ========== MEDICAL REPORT EMAIL (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Patient: ${patientName}`);
        console.log(`Record Type: ${recordType}`);
        console.log('==========================================================\n');
        return true;
    }
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📋 New Medical Record Available - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>New Medical Record</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .record-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>New Medical Record Available</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>A new medical record has been added to your health profile.</p>
                        <div class="record-details">
                            <p><strong>👤 Patient:</strong> ${patientName}</p>
                            <p><strong>📋 Record Type:</strong> ${recordType}</p>
                            <p><strong>📅 Visit Date:</strong> ${new Date(visitDate).toLocaleDateString()}</p>
                        </div>
                        <div style="text-align: center;">
                            <a href="${portalLink}" class="button">📊 View Your Records</a>
                        </div>
                        <p>Login to your Patient Portal to view the complete medical record, including diagnoses, medications, and vital signs.</p>
                        <p>If you have any questions about this record, please contact your healthcare provider.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Medical report email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send medical report email:', error.message);
        return false;
    }
};
const sendAppointmentReminder = async (email, name, patientName, appointmentDate, appointmentType, location) => {
    const transport = getTransporter();
    if (!transport) {
        console.log('\n📧 ========== APPOINTMENT REMINDER (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Patient: ${patientName}`);
        console.log(`Appointment: ${new Date(appointmentDate).toLocaleString()}`);
        console.log('==========================================================\n');
        return true;
    }
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📅 Upcoming Appointment Reminder - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Appointment Reminder</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .appointment-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Appointment Reminder</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>This is a reminder for your upcoming medical appointment.</p>
                        <div class="appointment-details">
                            <p><strong>👤 Patient:</strong> ${patientName}</p>
                            <p><strong>📋 Appointment Type:</strong> ${appointmentType}</p>
                            <p><strong>📅 Date & Time:</strong> ${new Date(appointmentDate).toLocaleString()}</p>
                            <p><strong>📍 Location:</strong> ${location}</p>
                        </div>
                        <p><strong>What to bring:</strong></p>
                        <ul>
                            <li>National ID or passport</li>
                            <li>Insurance card (if applicable)</li>
                            <li>List of current medications</li>
                            <li>Previous medical records (if any)</li>
                        </ul>
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/dashboard" class="button">📱 View in Portal</a>
                        </div>
                        <p>Please arrive 15 minutes early for check-in.</p>
                        <p>To reschedule or cancel, please contact your healthcare provider.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Appointment reminder sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send appointment reminder:', error.message);
        return false;
    }
};
const sendRegistrationConfirmation = async (userEmail, name, userId) => {
    const transport = getTransporter();
    if (!transport) {
        console.log('\n📧 ========== REGISTRATION CONFIRMATION (Would be sent) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`Name: ${name}`);
        console.log(`User ID: ${userId}`);
        console.log(`Status: Pending Approval`);
        console.log('===============================================================\n');
        return true;
    }
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '📋 Registration Received - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Registration Received</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .status-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Zimbabwe's Premier AI-Powered Health System</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>Thank you for registering with the National Vitality Eye system!</p>
                        <div class="status-box">
                            <p><strong>📋 Registration Status:</strong> <span style="color: #F59E0B;">PENDING APPROVAL</span></p>
                            <p><strong>🆔 Your User ID:</strong> <strong>${userId}</strong></p>
                            <p><strong>📅 Registration Date:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        <p><strong>What happens next?</strong></p>
                        <ol>
                            <li>Our administrators will review your documents</li>
                            <li>You will receive another email with your login credentials</li>
                            <li>Typical approval time: 24-48 hours</li>
                        </ol>
                        <p>If you have any questions, please contact your hospital administrator.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">🏠 Visit Our Website</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Registration confirmation email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send registration email:', error.message);
        return false;
    }
};
module.exports = { 
    sendApprovalEmail, 
    sendRejectionEmail,
    sendPatientVerificationEmail,
    sendPasswordResetEmail,
    sendMedicalReportEmail,
    sendAppointmentReminder,
    sendRegistrationConfirmation
};
```

## National_Vitality_Eye/Server/utils/normalise.js

```text

const SYMPTOM_SYNONYMS = {
    'sob': 'shortness of breath',
    'short of breath': 'shortness of breath',
    'breathlessness': 'shortness of breath',
    'cant breathe': 'difficulty breathing',
    "can't breathe": 'difficulty breathing',
    'breathing difficulty': 'difficulty breathing',
    'difficulty to breathe': 'difficulty breathing',
    'hard to breathe': 'difficulty breathing',
    'respiratory distress': 'difficulty breathing',
    'high temp': 'fever',
    'high temperature': 'fever',
    'pyrexia': 'fever',
    'febrile': 'fever',
    'running temperature': 'fever',
    'running a fever': 'fever',
    'chest tightness': 'chest pain',
    'chest discomfort': 'chest pain',
    'heart pain': 'chest pain',
    'stomach ache': 'abdominal pain',
    'stomach pain': 'abdominal pain',
    'tummy pain': 'abdominal pain',
    'belly pain': 'abdominal pain',
    'abdo pain': 'abdominal pain',
    'back ache': 'back pain',
    'backache': 'back pain',
    'headache': 'headache',
    'head ache': 'headache',
    'migraine': 'headache',
    'throwing up': 'vomiting',
    'vomit': 'vomiting',
    'nauseous': 'nausea',
    'feeling sick': 'nausea',
    'diarrhea': 'diarrhoea',
    'loose stool': 'diarrhoea',
    'loose stools': 'diarrhoea',
    'running stomach': 'diarrhoea',
    'watery stool': 'diarrhoea',
    'coughing': 'cough',
    'dry cough': 'cough',
    'wet cough': 'productive cough',
    'productive cough': 'productive cough',
    'tiredness': 'fatigue',
    'tired': 'fatigue',
    'weakness': 'fatigue',
    'weak': 'fatigue',
    'lethargy': 'fatigue',
    'lethargic': 'fatigue',
    'dizzy': 'dizziness',
    'lightheaded': 'dizziness',
    'light headed': 'dizziness',
    'vertigo': 'dizziness',
    'swollen feet': 'oedema',
    'swollen legs': 'oedema',
    'oedema': 'oedema',
    'edema': 'oedema',
    'swelling': 'oedema',
    'skin rash': 'rash',
    'itching': 'pruritus',
    'itchy skin': 'pruritus',
    'pruritus': 'pruritus',
    'passed out': 'loss of consciousness',
    'fainted': 'loss of consciousness',
    'fainting': 'loss of consciousness',
    'syncope': 'loss of consciousness',
    'unconscious': 'loss of consciousness',
    'unresponsive': 'loss of consciousness',
    'convulsions': 'seizure',
    'fits': 'seizure',
    'fit': 'seizure',
    'epilepsy': 'seizure',
    'bleeding': 'bleeding',
    'haemorrhage': 'bleeding',
    'hemorrhage': 'bleeding',
    'blood loss': 'bleeding',
    'blurry vision': 'blurred vision',
    'blurry eyes': 'blurred vision',
    'vision problems': 'blurred vision',
    'poor vision': 'blurred vision',
    'losing weight': 'weight loss',
    'weight loss': 'weight loss',
    'wasting': 'weight loss',
    'night sweating': 'night sweats',
    'sweating at night': 'night sweats',
    'joint ache': 'joint pain',
    'joint aches': 'joint pain',
    'arthralgia': 'joint pain',
    'muscle ache': 'muscle pain',
    'myalgia': 'muscle pain',
    'body aches': 'muscle pain',
    'body pain': 'muscle pain',
    'sore throat': 'sore throat',
    'throat pain': 'sore throat',
    'throat ache': 'sore throat',
    'tonsillitis': 'sore throat',
    'runny nose': 'runny nose',
    'nasal discharge': 'runny nose',
    'rhinorrhoea': 'runny nose',
    'rhinorrhea': 'runny nose',
    'blocked nose': 'nasal congestion',
    'stuffy nose': 'nasal congestion',
    'nasal congestion': 'nasal congestion',
    'no appetite': 'loss of appetite',
    'not eating': 'loss of appetite',
    'anorexia': 'loss of appetite',
};
const DISEASE_SYNONYMS = {
    'malaria fever': 'Malaria',
    'malarial fever': 'Malaria',
    'plasmodium': 'Malaria',
    'typhoid fever': 'Typhoid',
    'enteric fever': 'Typhoid',
    'tb': 'Tuberculosis',
    'tuberculosis': 'Tuberculosis',
    'pulmonary tb': 'Tuberculosis',
    'pulmonary tuberculosis': 'Tuberculosis',
    'hiv': 'HIV/AIDS',
    'aids': 'HIV/AIDS',
    'hiv/aids': 'HIV/AIDS',
    'hiv aids': 'HIV/AIDS',
    'pneumonia': 'Pneumonia',
    'chest infection': 'Pneumonia',
    'lower respiratory tract infection': 'Pneumonia',
    'lrti': 'Pneumonia',
    'cholera': 'Cholera',
    'diabetes': 'Diabetes',
    'diabetes mellitus': 'Diabetes',
    'dm': 'Diabetes',
    'type 2 diabetes': 'Diabetes',
    'type 1 diabetes': 'Diabetes',
    'hypertension': 'Hypertension',
    'high blood pressure': 'Hypertension',
    'hbp': 'Hypertension',
    'htn': 'Hypertension',
    'diarrhoea': 'Diarrhoeal Disease',
    'diarrhea': 'Diarrhoeal Disease',
    'gastroenteritis': 'Diarrhoeal Disease',
    'gastro': 'Diarrhoeal Disease',
    'anaemia': 'Anaemia',
    'anemia': 'Anaemia',
    'iron deficiency': 'Anaemia',
    'asthma': 'Asthma',
    'bronchial asthma': 'Asthma',
    'covid': 'COVID-19',
    'covid-19': 'COVID-19',
    'coronavirus': 'COVID-19',
    'sars-cov-2': 'COVID-19',
    'measles': 'Measles',
    'rubeola': 'Measles',
    'meningitis': 'Meningitis',
    'bacterial meningitis': 'Meningitis',
    'viral meningitis': 'Meningitis',
    'schistosomiasis': 'Schistosomiasis',
    'bilharzia': 'Schistosomiasis',
    'bilharziasis': 'Schistosomiasis',
};
const HOSPITAL_SYNONYMS = {
    'parirenyatwa': 'Parirenyatwa Group of Hospitals',
    'parirenyatwa hospital': 'Parirenyatwa Group of Hospitals',
    'parirenyatwa hosp': 'Parirenyatwa Group of Hospitals',
    'pgh': 'Parirenyatwa Group of Hospitals',
    'parirenyatwa group': 'Parirenyatwa Group of Hospitals',
    'harare hospital': 'Harare Central Hospital',
    'harare central': 'Harare Central Hospital',
    'hch': 'Harare Central Hospital',
    'harare central hosp': 'Harare Central Hospital',
    'mpilo': 'Mpilo Central Hospital',
    'mpilo hospital': 'Mpilo Central Hospital',
    'mpilo central': 'Mpilo Central Hospital',
    'ubh': 'United Bulawayo Hospitals',
    'united bulawayo': 'United Bulawayo Hospitals',
    'united bulawayo hospital': 'United Bulawayo Hospitals',
    'chitungwiza': 'Chitungwiza Central Hospital',
    'chitungwiza hospital': 'Chitungwiza Central Hospital',
    'cch': 'Chitungwiza Central Hospital',
    'mutare hospital': 'Mutare Provincial Hospital',
    'mutare provincial': 'Mutare Provincial Hospital',
    'masvingo hospital': 'Masvingo Provincial Hospital',
    'masvingo provincial': 'Masvingo Provincial Hospital',
    'gweru hospital': 'Gweru Provincial Hospital',
    'gweru provincial': 'Gweru Provincial Hospital',
    'gweru central': 'Gweru Provincial Hospital',
    'bindura hospital': 'Bindura Provincial Hospital',
    'bindura provincial': 'Bindura Provincial Hospital',
    'chinhoyi hospital': 'Chinhoyi Provincial Hospital',
    'chinhoyi provincial': 'Chinhoyi Provincial Hospital',
};
const PROVINCE_SYNONYMS = {
    'hre': 'Harare',
    'harare city': 'Harare',
    'byo': 'Bulawayo',
    'bulawayo city': 'Bulawayo',
    'mash central': 'Mashonaland Central',
    'mashonaland c': 'Mashonaland Central',
    'mash east': 'Mashonaland East',
    'mashonaland e': 'Mashonaland East',
    'mash west': 'Mashonaland West',
    'mashonaland w': 'Mashonaland West',
    'mat north': 'Matabeleland North',
    'matabeleland n': 'Matabeleland North',
    'mat south': 'Matabeleland South',
    'matabeleland s': 'Matabeleland South',
    'mani': 'Manicaland',
    'midlands province': 'Midlands',
    'masvingo province': 'Masvingo',
};
function baseNormalise(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .trim()
        .replace(/\s+/g, ' ')       
        .replace(/[-_]+/g, ' ')     
        .toLowerCase();
}
function toTitleCase(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}
function fuzzyMatch(input, canonicals, threshold = 3) {
    const norm = baseNormalise(input);
    let best = null, bestDist = Infinity;
    for (const c of canonicals) {
        const dist = levenshtein(norm, baseNormalise(c));
        if (dist < bestDist) { bestDist = dist; best = c; }
    }
    return bestDist <= threshold ? best : null;
}
function normaliseSymptom(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const norm = baseNormalise(raw);
    if (SYMPTOM_SYNONYMS[norm]) return toTitleCase(SYMPTOM_SYNONYMS[norm]);
    for (const [key, canonical] of Object.entries(SYMPTOM_SYNONYMS)) {
        if (norm.includes(key) || key.includes(norm)) {
            return toTitleCase(canonical);
        }
    }
    return toTitleCase(norm);
}
function normaliseDisease(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const norm = baseNormalise(raw);
    if (DISEASE_SYNONYMS[norm]) return DISEASE_SYNONYMS[norm];
    for (const [key, canonical] of Object.entries(DISEASE_SYNONYMS)) {
        if (norm.includes(key) || key.includes(norm)) return canonical;
    }
    const canonicals = [...new Set(Object.values(DISEASE_SYNONYMS))];
    const fuzzy = fuzzyMatch(norm, canonicals, 2);
    if (fuzzy) return fuzzy;
    return toTitleCase(norm);
}
function normaliseHospital(raw) {
    if (!raw || typeof raw !== 'string') return raw || '';
    const norm = baseNormalise(raw);
    if (HOSPITAL_SYNONYMS[norm]) return HOSPITAL_SYNONYMS[norm];
    for (const [key, canonical] of Object.entries(HOSPITAL_SYNONYMS)) {
        if (norm.includes(key) || key.includes(norm)) return canonical;
    }
    const canonicals = [...new Set(Object.values(HOSPITAL_SYNONYMS))];
    const fuzzy = fuzzyMatch(norm, canonicals, 3);
    if (fuzzy) return fuzzy;
    return toTitleCase(norm);
}
function normaliseProvince(raw) {
    if (!raw || typeof raw !== 'string') return raw || '';
    const norm = baseNormalise(raw);
    if (PROVINCE_SYNONYMS[norm]) return PROVINCE_SYNONYMS[norm];
    for (const [key, canonical] of Object.entries(PROVINCE_SYNONYMS)) {
        if (norm.includes(key)) return canonical;
    }
    const PROVINCES = [
        'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
        'Mashonaland East', 'Mashonaland West', 'Masvingo',
        'Matabeleland North', 'Matabeleland South', 'Midlands'
    ];
    const fuzzy = fuzzyMatch(norm, PROVINCES, 3);
    if (fuzzy) return fuzzy;
    return toTitleCase(norm);
}
function normaliseCondition(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const norm = baseNormalise(raw);
    if (DISEASE_SYNONYMS[norm]) return DISEASE_SYNONYMS[norm];
    for (const [key, canonical] of Object.entries(DISEASE_SYNONYMS)) {
        if (norm.includes(key) || key.includes(norm)) return canonical;
    }
    return toTitleCase(norm);
}
function normaliseSymptoms(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    return arr
        .map(s => normaliseSymptom(s))
        .filter(s => {
            if (!s || seen.has(s)) return false;
            seen.add(s);
            return true;
        });
}
function toAIKey(str) {
    return baseNormalise(str);
}
function findDiseaseKey(diseasePatterns, rawDisease) {
    const norm = baseNormalise(normaliseDisease(rawDisease));
    if (diseasePatterns.has(norm)) return norm;
    let best = null, bestDist = Infinity;
    for (const key of diseasePatterns.keys()) {
        const dist = levenshtein(norm, key);
        if (dist < bestDist) { bestDist = dist; best = key; }
    }
    return bestDist <= 3 ? best : null;
}
module.exports = {
    baseNormalise,
    toTitleCase,
    levenshtein,
    fuzzyMatch,
    normaliseSymptom,
    normaliseSymptoms,
    normaliseDisease,
    normaliseHospital,
    normaliseProvince,
    normaliseCondition,
    toAIKey,
    findDiseaseKey,
};
```

## National_Vitality_Eye/Server/utils/pdfService.js

```text
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const generateMedicalReport = async (patient, records) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .fillColor('#4F46E5')
               .text('National Vitality Eye', { align: 'center' });
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#666666')
               .text('Medical Report', { align: 'center' });
            doc.moveDown();
            doc.lineWidth(1)
               .strokeColor('#CCCCCC')
               .moveTo(50, doc.y)
               .lineTo(550, doc.y)
               .stroke();
            doc.moveDown();
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text('Patient Information');
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#666666');
            const patientInfo = [
                `Name: ${patient.firstName} ${patient.lastName}`,
                `National ID: ${patient.nationalId}`,
                `Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString()}`,
                `Gender: ${patient.gender}`,
                `Province: ${patient.province}`
            ];
            patientInfo.forEach(info => {
                doc.text(info);
            });
            doc.moveDown();
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text('Medical History');
            doc.moveDown();
            records.forEach((record, index) => {
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor('#4F46E5')
                   .text(`Visit ${index + 1}: ${new Date(record.visitDate).toLocaleDateString()}`);
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#333333');
                doc.text(`Hospital: ${record.hospital || 'N/A'}`);
                doc.text(`Doctor: ${record.doctorName || 'N/A'}`);
                doc.text(`Diagnosis: ${record.primaryDiagnosis?.name || record.diagnosis || 'N/A'}`);
                if (record.disease) {
                    doc.text(`Disease Category: ${record.disease}`);
                }
                if (record.symptoms && record.symptoms.length > 0) {
                    doc.text(`Symptoms: ${record.symptoms.join(', ')}`);
                }
                if (record.prescribedMedications && record.prescribedMedications.length > 0) {
                    doc.text(`Medications: ${record.prescribedMedications.join(', ')}`);
                }
                if (record.vitalSigns) {
                    const vitals = [];
                    if (record.vitalSigns.temperature) vitals.push(`Temp: ${record.vitalSigns.temperature}°C`);
                    if (record.vitalSigns.bloodPressure?.systolic) vitals.push(`BP: ${record.vitalSigns.bloodPressure.systolic}/${record.vitalSigns.bloodPressure.diastolic}`);
                    if (record.vitalSigns.heartRate) vitals.push(`HR: ${record.vitalSigns.heartRate} bpm`);
                    if (vitals.length > 0) {
                        doc.text(`Vital Signs: ${vitals.join(' | ')}`);
                    }
                }
                if (record.dischargeInstructions) {
                    doc.text(`Discharge Instructions: ${record.dischargeInstructions}`);
                }
                doc.moveDown();
                if (index < records.length - 1) {
                    doc.lineWidth(0.5)
                       .strokeColor('#EEEEEE')
                       .moveTo(50, doc.y)
                       .lineTo(550, doc.y)
                       .stroke();
                    doc.moveDown();
                }
            });
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fontSize(8)
                   .fillColor('#999999')
                   .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, { align: 'center' });
            }
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
module.exports = { generateMedicalReport };
```

## National_Vitality_Eye/Server/utils/permissions.js

```text

```

## National_Vitality_Eye/Server/utils/triageAI.js

```text

const { normaliseSymptoms, toAIKey } = require('./normalise');
const HIGH_RISK_SYMPTOMS = [
    "chest pain", "shortness of breath", "severe bleeding", "loss of consciousness",
    "seizure", "stroke", "poisoning", "anaphylaxis", "major trauma",
    "difficulty breathing", "choking", "head injury"
];
const calculateNEWS2 = (vitals) => {
    let score = 0;
    const reasons = [];
    if (!vitals) return { score: 0, reasons: [] };
    const rr = vitals.respiratoryRate;
    if (rr) {
        if (rr <= 8 || rr >= 25) { score += 3; reasons.push(`Critical ventilatory rate: ${rr} bpm (NEWS2: 3)`); }
        else if (rr >= 21) { score += 2; reasons.push(`Tachypnea detected: ${rr} bpm (NEWS2: 2)`); }
        else if (rr <= 11) { score += 1; reasons.push(`Bradypnea detected: ${rr} bpm (NEWS2: 1)`); }
    }
    const spo2 = vitals.oxygenSaturation;
    if (spo2) {
        if (spo2 <= 91) { score += 3; reasons.push(`Critical hypoxemia: SpO2 ${spo2}% (NEWS2: 3)`); }
        else if (spo2 <= 93) { score += 2; reasons.push(`Moderate hypoxemia: SpO2 ${spo2}% (NEWS2: 2)`); }
        else if (spo2 <= 95) { score += 1; reasons.push(`Mild hypoxemia: SpO2 ${spo2}% (NEWS2: 1)`); }
    }
    const temp = vitals.temperature;
    if (temp) {
        if (temp <= 35.0) { score += 3; reasons.push(`Critical hypothermia: Core temp ${temp}°C (NEWS2: 3)`); }
        else if (temp >= 39.1) { score += 2; reasons.push(`Hyperpyrexia: Core temp ${temp}°C (NEWS2: 2)`); }
        else if (temp <= 36.0 || temp >= 38.1) { score += 1; reasons.push(`Febrile/Sub-normal temp: ${temp}°C (NEWS2: 1)`); }
    }
    const sbp = vitals.bloodPressure?.systolic || vitals.bloodPressureSystolic;
    if (sbp) {
        if (sbp <= 90 || sbp >= 220) { score += 3; reasons.push(`Critical hemodynamic instability: SBP ${sbp} mmHg (NEWS2: 3)`); }
        else if (sbp <= 100) { score += 2; reasons.push(`Hypotension: SBP ${sbp} mmHg (NEWS2: 2)`); }
        else if (sbp <= 110) { score += 1; reasons.push(`Mild hypotension: SBP ${sbp} mmHg (NEWS2: 1)`); }
    }
    const hr = vitals.heartRate;
    if (hr) {
        if (hr <= 40 || hr >= 131) { score += 3; reasons.push(`Critical cardiac rate: ${hr} bpm (NEWS2: 3)`); }
        else if (hr >= 111) { score += 2; reasons.push(`Severe tachycardia: ${hr} bpm (NEWS2: 2)`); }
        else if (hr <= 50 || hr >= 91) { score += 1; reasons.push(`Abnormal cardiac rate: ${hr} bpm (NEWS2: 1)`); }
    }
    return { score, reasons };
};
const analyzeSymptoms = (symptoms) => {
    if (!symptoms || !Array.isArray(symptoms)) return { risk: 0, flags: [] };
    const normalised = normaliseSymptoms(symptoms).map(s => toAIKey(s));
    const flags = [];
    let risk = 0;
    normalised.forEach((s, idx) => {
        if (HIGH_RISK_SYMPTOMS.some(riskS => s.includes(riskS) || riskS.includes(s))) {
            risk += 5;
            flags.push(`Life-threatening clinical indicator: ${symptoms[idx]} (High Risk)`);
        }
    });
    return { risk, flags };
};
exports.predictTriagePriority = (vitals, symptoms) => {
    const news2 = calculateNEWS2(vitals);
    const symptomAnalysis = analyzeSymptoms(symptoms);
    const totalScore = news2.score + symptomAnalysis.risk;
    const allReasons = [...news2.reasons, ...symptomAnalysis.flags];
    let priority = "STABLE";
    let color = "green";
    if (totalScore >= 7 || symptomAnalysis.risk >= 5) {
        priority = "CRITICAL";
        color = "red";
    } else if (totalScore >= 5) {
        priority = "EMERGENT";
        color = "orange";
    } else if (totalScore >= 3) {
        priority = "URGENT";
        color = "yellow";
    } else if (totalScore >= 1) {
        priority = "STABLE";
        color = "blue";
    } else {
        priority = "NON-URGENT";
        color = "gray";
    }
    return {
        priority,
        score: totalScore,
        reasons: allReasons,
        color,
        timestamp: new Date()
    };
};
```

## National_Vitality_Eye/Server/utils/vitalSigns.js

```text

function roundTemperature(value) {
    if (value == null || value === '' || Number.isNaN(Number(value))) return null;
    return Math.round(Number(value) * 10) / 10;
}
function formatTemperature(value) {
    const t = roundTemperature(value);
    return t == null ? '—' : t.toFixed(1);
}
function classifyTemperature(celsius) {
    const t = roundTemperature(celsius);
    if (t == null) return { status: 'MISSING', level: 'unknown', color: 'gray' };
    if (t >= 39.1) return { status: 'CRITICAL', level: 'high', color: 'red' };
    if (t >= 38.1) return { status: 'ELEVATED', level: 'high', color: 'orange' };
    if (t <= 35.0) return { status: 'LOW', level: 'low', color: 'orange' };
    if (t <= 36.0) return { status: 'SUBNORMAL', level: 'low', color: 'yellow' };
    return { status: 'NORMAL', level: 'normal', color: 'green' };
}
function classifyBloodPressure(systolic, diastolic) {
    const sys = systolic != null ? Number(systolic) : null;
    const dia = diastolic != null ? Number(diastolic) : null;
    if (sys == null && dia == null) return { status: 'MISSING', level: 'unknown', color: 'gray' };
    if ((sys != null && sys > 180) || (dia != null && dia > 120)) {
        return { status: 'CRISIS', level: 'critical', color: 'red' };
    }
    if ((sys != null && sys >= 140) || (dia != null && dia >= 90)) {
        return { status: 'HIGH', level: 'high', color: 'red' };
    }
    if ((sys != null && sys >= 130) || (dia != null && dia >= 80)) {
        return { status: 'ELEVATED', level: 'elevated', color: 'orange' };
    }
    if (sys != null && sys >= 120 && (dia == null || dia < 80)) {
        return { status: 'ELEVATED', level: 'elevated', color: 'orange' };
    }
    return { status: 'NORMAL', level: 'normal', color: 'green' };
}
function classifyHeartRate(bpm) {
    const hr = bpm != null ? Number(bpm) : null;
    if (hr == null) return { status: 'MISSING', level: 'unknown', color: 'gray' };
    if (hr > 130 || hr < 40) return { status: 'CRITICAL', level: 'critical', color: 'red' };
    if (hr > 110 || hr < 50) return { status: 'ABNORMAL', level: 'abnormal', color: 'orange' };
    if (hr > 90 || hr < 60) return { status: 'ELEVATED', level: 'elevated', color: 'yellow' };
    return { status: 'NORMAL', level: 'normal', color: 'green' };
}
function classifySpO2(percent) {
    const spo2 = percent != null ? Number(percent) : null;
    if (spo2 == null) return { status: 'MISSING', level: 'unknown', color: 'gray' };
    if (spo2 <= 91) return { status: 'CRITICAL', level: 'critical', color: 'red' };
    if (spo2 <= 93) return { status: 'LOW', level: 'low', color: 'orange' };
    if (spo2 <= 95) return { status: 'BORDERLINE', level: 'low', color: 'yellow' };
    return { status: 'NORMAL', level: 'normal', color: 'green' };
}
function buildPatientSnapshot(patient, visitDate = new Date()) {
    if (!patient) return null;
    const dob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
    const visit = new Date(visitDate);
    const ageAtVisit = dob
        ? Math.floor((visit - dob) / (365.25 * 24 * 60 * 60 * 1000))
        : null;
    return {
        nationalId: patient.nationalId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        ageAtVisit,
        contactInfo: {
            phone: patient.contactInfo?.phone,
            email: patient.contactInfo?.email,
            address: patient.contactInfo?.address,
            emergencyContact: patient.contactInfo?.emergencyContact || {}
        },
        patientProvince: patient.province,
        district: patient.district,
        ward: patient.ward,
        insuranceInfo: patient.insuranceInfo
            ? {
                provider: patient.insuranceInfo.provider,
                policyNumber: patient.insuranceInfo.policyNumber,
                memberId: patient.insuranceInfo.memberId,
                coverageType: patient.insuranceInfo.coverageType
            }
            : undefined
    };
}
function normalizeVitalSigns(vitals = {}) {
    const temperature = roundTemperature(vitals.temperature);
    if (temperature == null) {
        throw new Error('Temperature is required and must be a valid number');
    }
    const systolic = vitals.bloodPressure?.systolic ?? vitals.bloodPressureSystolic;
    const diastolic = vitals.bloodPressure?.diastolic ?? vitals.bloodPressureDiastolic;
    return {
        temperature,
        bloodPressure: {
            systolic: systolic != null && systolic !== '' ? parseInt(systolic, 10) : undefined,
            diastolic: diastolic != null && diastolic !== '' ? parseInt(diastolic, 10) : undefined
        },
        heartRate: vitals.heartRate != null && vitals.heartRate !== '' ? parseInt(vitals.heartRate, 10) : undefined,
        respiratoryRate: vitals.respiratoryRate != null && vitals.respiratoryRate !== '' ? parseInt(vitals.respiratoryRate, 10) : undefined,
        oxygenSaturation: vitals.oxygenSaturation != null && vitals.oxygenSaturation !== '' ? parseInt(vitals.oxygenSaturation, 10) : undefined,
        weight: vitals.weight != null && vitals.weight !== '' ? parseFloat(vitals.weight) : undefined,
        height: vitals.height != null && vitals.height !== '' ? parseFloat(vitals.height) : undefined,
        bmi: vitals.bmi != null && vitals.bmi !== '' ? parseFloat(vitals.bmi) : undefined,
        painScore: vitals.painScore != null && vitals.painScore !== '' ? parseInt(vitals.painScore, 10) : undefined,
        recordedAt: vitals.recordedAt || new Date()
    };
}
module.exports = {
    roundTemperature,
    formatTemperature,
    classifyTemperature,
    classifyBloodPressure,
    classifyHeartRate,
    classifySpO2,
    buildPatientSnapshot,
    normalizeVitalSigns
};
```