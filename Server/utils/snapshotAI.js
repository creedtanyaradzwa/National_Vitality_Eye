/**
 * snapshotAI.js - "NLP-Simulated" Clinical Summarizer
 * Generates a concise clinical story based on historical and current patient data.
 */

const { calculateAge } = require('./vitalSigns');

/**
 * Generates a natural language summary of the patient's current clinical state.
 * @param {Object} patient - Patient document
 * @param {Array} records - Recent medical records
 * @returns {String} - Clinical summary
 */
function generateClinicalSnapshot(patient, records) {
    if (!records || records.length === 0) {
        return "New patient record. No historical clinical data available for synthesis.";
    }

    const latest = records[0];
    const previous = records.length > 1 ? records[1] : null;
    const age = calculateAge(patient.dateOfBirth);
    const gender = patient.gender.toLowerCase();
    
    // 1. Demographic & Admission context
    let story = `${age}-year-old ${gender}`;
    
    if (latest.disposition === 'Admitted') {
        const admissionDate = new Date(latest.visitDate);
        const diffTime = Math.abs(new Date() - admissionDate);
        const admissionDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        story += `, admitted ${admissionDays <= 1 ? 'today' : admissionDays + ' days ago'}`;
    } else {
        story += `, last seen ${new Date(latest.visitDate).toLocaleDateString()}`;
    }

    // 2. Primary Reason/Diagnosis
    const condition = latest.disease || latest.primaryDiagnosis?.name || "unspecified symptoms";
    story += ` for ${condition.toLowerCase()}. `;

    // 3. Current Status & Vitals Trends
    const vitals = latest.vitalSigns || {};
    const prevVitals = previous?.vitalSigns || {};
    let vitalStory = "";

    // Temperature Trend
    if (vitals.temperature > 38) {
        if (prevVitals.temperature > 38) vitalStory += "Persistent fever. ";
        else vitalStory += "New-onset fever detected. ";
    } else if (vitals.temperature <= 37.5 && prevVitals.temperature > 38) {
        vitalStory += "Fever subsiding. ";
    }

    // Heart Rate Trend
    if (vitals.heartRate) {
        if (vitals.heartRate > 100) {
            if (prevVitals.heartRate > 100) vitalStory += "Persistent tachycardia. ";
            else vitalStory += "New-onset tachycardia. ";
        } else if (prevVitals.heartRate > 100 && vitals.heartRate <= 100) {
            vitalStory += "Heart rate stabilizing. ";
        }
    }

    // Oxygen Trend
    if (vitals.oxygenSaturation) {
        if (vitals.oxygenSaturation < 94) {
            vitalStory += `Oxygen saturation remains low (${vitals.oxygenSaturation}%). `;
        } else if (prevVitals.oxygenSaturation < 94 && vitals.oxygenSaturation >= 94) {
            vitalStory += "Respiratory status improving. ";
        }
    }

    if (vitalStory) story += vitalStory;
    else story += "Vital signs currently within stable ranges. ";

    // 4. Critical Findings (Labs/Symptoms)
    const criticalKeywords = ['severe', 'bleeding', 'unconscious', 'chest pain', 'shortness of breath', 'dehydration', 'critically low'];
    const criticalSymptoms = (latest.symptoms || []).filter(s => 
        criticalKeywords.some(k => s.toLowerCase().includes(k))
    );

    const abnormalLabs = (latest.investigations?.labTests || []).filter(l => l.abnormal);
    const prevAbnormalLabs = (previous?.investigations?.labTests || []).filter(l => l.abnormal);
    
    if (criticalSymptoms.length > 0 || abnormalLabs.length > 0) {
        let markers = [];
        if (criticalSymptoms.length > 0) markers.push(...criticalSymptoms);
        
        if (abnormalLabs.length > 0) {
            abnormalLabs.forEach(lab => {
                const wasAbnormal = prevAbnormalLabs.some(pl => pl.testName === lab.testName);
                if (wasAbnormal) {
                    markers.push(`${lab.testName} remains abnormal (${lab.result})`);
                } else {
                    markers.push(`${lab.testName} (${lab.result})`);
                }
            });
        }
        story += `Current markers: ${markers.join(', ')}. `;
    }

    // 5. Chronic & Recurrence Context
    const chronic = (patient.clinicalProfile?.chronicConditions || []).filter(c => c.status === 'Active');
    const isRecurrent = latest.disease && records.slice(1).some(r => r.disease === latest.disease);

    if (isRecurrent) {
        story += `Recurrent episode of ${latest.disease} noted. `;
    }

    if (chronic.length > 0) {
        story += `Co-morbidities include ${chronic.map(c => c.condition).join(', ')}. `;
    }

    // 6. Actionable Note
    if (latest.disposition === 'Admitted' && vitals.oxygenSaturation < 95) {
        story += "Prioritize respiratory assessment and SpO2 monitoring.";
    } else if (latest.disposition === 'Admitted' && abnormalLabs.length > 0) {
        story += "Review latest lab trends; check for electrolyte stability.";
    } else if (latest.disposition === 'Admitted') {
        story += "Observation continues; review latest clinical data.";
    }

    return story;
}

/**
 * Extract "Quick Metrics" for the dashboard
 */
function getQuickMetrics(records) {
    if (!records || records.length === 0) return null;
    const latest = records[0];
    const vitals = latest.vitalSigns || {};
    
    return {
        temp: vitals.temperature,
        hr: vitals.heartRate,
        bp: vitals.bloodPressure ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : 'N/A',
        spO2: vitals.oxygenSaturation,
        lastSeen: latest.visitDate,
        condition: latest.disease || latest.primaryDiagnosis?.name || 'Unknown'
    };
}

module.exports = {
    generateClinicalSnapshot,
    getQuickMetrics
};
