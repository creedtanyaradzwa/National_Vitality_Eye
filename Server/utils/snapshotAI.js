/**
 * snapshotAI.js - "NLP-Simulated" Clinical Summarizer
 * Generates a concise clinical story based on historical and current patient data.
 */

const { 
    calculateAge, 
    classifyTemperature, 
    classifyHeartRate, 
    classifySpO2, 
    classifyBloodPressure 
} = require('./vitalSigns');

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
    
    // 1. Demographic & Case context
    let story = `${age}-year-old ${gender}`;
    
    if (latest.visitStatus === 'In Admission' || latest.disposition === 'Admitted') {
        const admissionDate = new Date(latest.visitDate);
        const diffTime = Math.abs(new Date() - admissionDate);
        const admissionDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        story += `, admitted ${admissionDays <= 1 ? 'today' : admissionDays + ' days ago'}`;
    } else if (latest.visitStatus === 'Active') {
        story += `, currently under active follow-up care`;
    } else {
        story += `, last seen ${new Date(latest.visitDate).toLocaleDateString()}`;
    }

    // 2. Primary Reason/Diagnosis
    const condition = latest.disease || latest.primaryDiagnosis?.name || "unspecified symptoms";
    story += ` for ${condition.toLowerCase()}. `;

    // 3. Case Progression (Active or In Admission)
    if ((latest.visitStatus === 'In Admission' || latest.visitStatus === 'Active') && latest.observations?.length > 1) {
        const obs = latest.observations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const firstObs = obs[0];
        const lastObs = obs[obs.length - 1];
        
        let progress = latest.visitStatus === 'In Admission' ? "Course during admission: " : "Progress during active care: ";
        
        // Temperature progression
        if (lastObs.vitalSigns?.temperature < firstObs.vitalSigns?.temperature && lastObs.vitalSigns?.temperature <= 37.5) {
            progress += "Fever has successfully resolved. ";
        } else if (lastObs.vitalSigns?.temperature > firstObs.vitalSigns?.temperature && lastObs.vitalSigns?.temperature > 38) {
            progress += "Temperature showing upward trend. ";
        }

        // Status progression
        const statuses = obs.map(o => o.status).filter(Boolean);
        if (statuses.length > 0) {
            const lastStatus = statuses[statuses.length - 1];
            if (lastStatus === 'Improving') progress += "Clinical trajectory is positive. ";
            else if (lastStatus === 'Deteriorating') progress += "CRITICAL: Showing signs of deterioration. ";
            else if (lastStatus === 'Stable') progress += "Patient remains clinically stable. ";
        }

        story += progress;
    }

    // 4. Current Status & Vitals Trends (Last visit vs Previous visit)
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
    else if (!story.includes("Course during admission") && !story.includes("Progress during active care")) story += "Vital signs currently within stable ranges. ";

    // 5. Critical Findings (Labs/Symptoms)
    const criticalKeywords = ['severe', 'bleeding', 'unconscious', 'chest pain', 'shortness of breath', 'dehydration', 'critically low'];
    const latestSymptoms = latest.symptoms || [];
    const criticalSymptoms = latestSymptoms.filter(s => 
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

    // 6. Chronic & Recurrence Context
    const chronic = (patient.clinicalProfile?.chronicConditions || []).filter(c => c.status === 'Active');
    const isRecurrent = latest.disease && records.slice(1).some(r => r.disease === latest.disease);

    if (isRecurrent) {
        story += `Recurrent episode of ${latest.disease} noted. `;
    }

    if (chronic.length > 0) {
        story += `Co-morbidities include ${chronic.map(c => c.condition).join(', ')}. `;
    }

    // 7. Actionable Note
    if ((latest.visitStatus === 'In Admission' || latest.visitStatus === 'Active') && vitals.oxygenSaturation < 95) {
        story += "Prioritize respiratory assessment and SpO2 monitoring.";
    } else if ((latest.visitStatus === 'In Admission' || latest.visitStatus === 'Active') && latest.observations?.slice(-1)[0]?.status === 'Deteriorating') {
        story += "URGENT review required due to clinical deterioration.";
    } else if (latest.disposition === 'Admitted' || latest.visitStatus === 'In Admission') {
        story += "Review latest clinical data; electrolyte/fluid monitoring advised.";
    }

    return story;
}

/**
 * Generates a specific summary for a single record (useful for timeline expansion)
 */
function generateRecordSnapshot(record) {
    const condition = record.disease || record.primaryDiagnosis?.name || "General Encounter";
    const lowerCondition = condition.toLowerCase();
    let summary = `Clinical synthesis for ${condition} encounter. `;
    
    // 1. Abnormality Detection (Baseline/Initial)
    const vitals = record.vitalSigns || {};
    const abnormalities = [];
    
    if (classifyTemperature(vitals.temperature).status !== 'NORMAL') abnormalities.push(`Temp ${vitals.temperature}°C`);
    if (classifyHeartRate(vitals.heartRate).status !== 'NORMAL') abnormalities.push(`HR ${vitals.heartRate}bpm`);
    if (classifySpO2(vitals.oxygenSaturation).status !== 'NORMAL') abnormalities.push(`SpO2 ${vitals.oxygenSaturation}%`);
    if (classifyBloodPressure(vitals.bloodPressure?.systolic, vitals.bloodPressure?.diastolic).status !== 'NORMAL') {
        abnormalities.push(`BP ${vitals.bloodPressure?.systolic}/${vitals.bloodPressure?.diastolic}`);
    }

    if (abnormalities.length > 0) {
        summary += `Initial presentation shows abnormal parameters: ${abnormalities.join(', ')}. `;
    } else {
        summary += "Patient was hemodynamically stable at baseline. ";
    }

    // 2. Admission/Progress Logic
    if (record.visitStatus === 'In Admission' || record.visitStatus === 'Active') {
        const obs = record.observations || [];
        const obsCount = obs.length;
        const statusType = record.visitStatus === 'In Admission' ? 'admission' : 'active care';
        summary += `The patient is currently in ${statusType} (${obsCount} follow-up points). `;
        
        if (obsCount >= 2) {
            const first = obs[0];
            const last = obs[obsCount - 1];
            
            // Trend Analysis
            let trajectory = "";
            if (last.vitalSigns?.temperature < first.vitalSigns?.temperature - 0.5) trajectory += "cooling trend noted; ";
            if (last.vitalSigns?.heartRate < first.vitalSigns?.heartRate - 10) trajectory += "pulse stabilizing; ";
            if (last.vitalSigns?.oxygenSaturation > first.vitalSigns?.oxygenSaturation + 2) trajectory += "oxygenation improving; ";
            
            if (trajectory) summary += `Trajectory: ${trajectory.trim()}. `;
            
            if (last.status === 'Deteriorating') summary += "⚠️ WARNING: Latest clinical assessment indicates acute deterioration. ";
            else if (last.status === 'Improving') summary += "Trajectory is positive with visible clinical improvement. ";
        }

        // 3. Pathogen-Specific Deep Insights
        if (lowerCondition.includes('cholera') || lowerCondition.includes('diarrhea')) {
            const lastObs = obs[obsCount - 1];
            if (lastObs?.fluidBalance?.output > lastObs?.fluidBalance?.intake) {
                summary += "CRITICAL: Negative fluid balance detected. High risk of hypovolemic shock. ";
            } else if (lastObs?.fluidBalance?.intake > 0) {
                summary += "Rehydration therapy is currently outstripping losses. ";
            }
        }

        if (lowerCondition.includes('pneumonia') || lowerCondition.includes('asthma') || lowerCondition.includes('tb')) {
            const lastSpO2 = obs[obsCount - 1]?.vitalSigns?.oxygenSaturation || vitals.oxygenSaturation;
            if (lastSpO2 < 94) summary += "Respiratory burden remains significant; continue O2 support. ";
        }
    } else {
        // Finalized/Discharged Logic
        summary += `Case reached final outcome: ${record.disposition || 'Finalized'}. `;
        if (record.dischargeInstructions) {
            summary += `Discharge Summary: "${record.dischargeInstructions.substring(0, 150)}..."`;
        }
    }

    return summary;
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
    generateRecordSnapshot,
    getQuickMetrics
};
