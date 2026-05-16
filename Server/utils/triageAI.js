/**
 * Predictive Triage Intelligence
 * Based on NEWS2 (National Early Warning Score) and High-Risk Symptom Analysis
 */

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

    // 1. Respiration Rate (breaths/min)
    const rr = vitals.respiratoryRate;
    if (rr) {
        if (rr <= 8 || rr >= 25) { score += 3; reasons.push(`Critical RR: ${rr}`); }
        else if (rr >= 21) { score += 2; reasons.push(`High RR: ${rr}`); }
        else if (rr <= 11) { score += 1; reasons.push(`Low RR: ${rr}`); }
    }

    // 2. SpO2 (%)
    const spo2 = vitals.oxygenSaturation;
    if (spo2) {
        if (spo2 <= 91) { score += 3; reasons.push(`Critical SpO2: ${spo2}%`); }
        else if (spo2 <= 93) { score += 2; reasons.push(`Low SpO2: ${spo2}%`); }
        else if (spo2 <= 95) { score += 1; reasons.push(`Mildly low SpO2: ${spo2}%`); }
    }

    // 3. Temperature (C)
    const temp = vitals.temperature;
    if (temp) {
        if (temp <= 35.0) { score += 3; reasons.push(`Hypothermia: ${temp}°C`); }
        else if (temp >= 39.1) { score += 2; reasons.push(`High Fever: ${temp}°C`); }
        else if (temp <= 36.0 || temp >= 38.1) { score += 1; reasons.push(`Abnormal Temp: ${temp}°C`); }
    }

    // 4. Systolic Blood Pressure (mmHg)
    const sbp = vitals.bloodPressure?.systolic || vitals.bloodPressureSystolic;
    if (sbp) {
        if (sbp <= 90 || sbp >= 220) { score += 3; reasons.push(`Critical SBP: ${sbp}`); }
        else if (sbp <= 100) { score += 2; reasons.push(`Low SBP: ${sbp}`); }
        else if (sbp <= 110) { score += 1; reasons.push(`Mildly low SBP: ${sbp}`); }
    }

    // 5. Heart Rate (BPM)
    const hr = vitals.heartRate;
    if (hr) {
        if (hr <= 40 || hr >= 131) { score += 3; reasons.push(`Critical HR: ${hr}`); }
        else if (hr >= 111) { score += 2; reasons.push(`High HR: ${hr}`); }
        else if (hr <= 50 || hr >= 91) { score += 1; reasons.push(`Abnormal HR: ${hr}`); }
    }

    return { score, reasons };
};

const analyzeSymptoms = (symptoms) => {
    if (!symptoms || !Array.isArray(symptoms)) return { risk: 0, flags: [] };

    // Normalise before matching so "CHEST PAIN", "chest-pain", "chest  pain" all match
    const normalised = normaliseSymptoms(symptoms).map(s => toAIKey(s));

    const flags = [];
    let risk = 0;

    normalised.forEach((s, idx) => {
        if (HIGH_RISK_SYMPTOMS.some(riskS => s.includes(riskS) || riskS.includes(s))) {
            risk += 5;
            flags.push(`High-risk symptom: ${symptoms[idx]}`);
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
