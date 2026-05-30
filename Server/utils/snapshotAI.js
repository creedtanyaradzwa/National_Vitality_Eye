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
    let summary = `Encounter for ${condition}. `;
    
    if (record.visitStatus === 'In Admission' || record.visitStatus === 'Active') {
        const obsCount = record.observations?.length || 0;
        const statusType = record.visitStatus === 'In Admission' ? 'admission' : 'active care';
        summary += `Currently in ${statusType} with ${obsCount} recorded observations. `;
        
        if (obsCount > 0) {
            const latestObs = record.observations[obsCount - 1];
            summary += `Latest status (${new Date(latestObs.timestamp).toLocaleTimeString()}): ${latestObs.status || 'Stable'}. `;
            if (latestObs.notes) summary += `Note: ${latestObs.notes}`;
        }
    } else if (record.visitStatus === 'Finalized' || record.visitStatus === 'Discharged') {
        summary += `Case closed with outcome: ${record.disposition || 'Finalized'}. `;
        if (record.dischargeInstructions) summary += `Instructions: ${record.dischargeInstructions.substring(0, 100)}...`;
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
