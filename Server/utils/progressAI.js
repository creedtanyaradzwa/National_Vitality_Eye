/**
 * progressAI.js - AI Decision Support for Vital Sign Progress
 * Analyzes vitalsHistory to detect clinical improvement or deterioration.
 */

/**
 * Analyzes the trend of vital signs within a single record/admission.
 * @param {Array} vitalsHistory - Array of vital sign entries
 * @returns {Object} - Trend analysis, risk assessment, and clinical advice
 */
function analyzeRecordProgress(vitalsHistory) {
    if (!vitalsHistory || vitalsHistory.length < 2) {
        return {
            status: 'INITIALIZING',
            message: 'Baseline established. Need more data points for trend analysis.',
            indicators: [],
            riskScore: 0
        };
    }

    // Sort by time just in case
    const history = [...vitalsHistory].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const first = history[0];

    const indicators = [];
    let riskScore = 0;
    let improvementPoints = 0;

    // 1. Temperature Trend
    if (latest.temperature && previous.temperature) {
        const tempDiff = latest.temperature - previous.temperature;
        if (latest.temperature > 38 && tempDiff > 0.5) {
            indicators.push({ factor: 'Fever', trend: 'RISING', severity: 'HIGH', note: `Temperature spiked +${tempDiff.toFixed(1)}°C to ${latest.temperature}°C` });
            riskScore += 2;
        } else if (latest.temperature <= 37.5 && previous.temperature > 38) {
            indicators.push({ factor: 'Fever', trend: 'SUBSIDING', severity: 'LOW', note: 'Patient is defervescing (fever breaking).' });
            improvementPoints++;
        }
    }

    // 2. Oxygen Saturation (Critical)
    if (latest.oxygenSaturation && previous.oxygenSaturation) {
        const o2Diff = latest.oxygenSaturation - previous.oxygenSaturation;
        if (latest.oxygenSaturation < 94 && o2Diff < -2) {
            indicators.push({ factor: 'Oxygenation', trend: 'CRITICAL_DROP', severity: 'CRITICAL', note: `SpO2 dropped by ${Math.abs(o2Diff)}% to ${latest.oxygenSaturation}%` });
            riskScore += 5;
        } else if (latest.oxygenSaturation >= 95 && previous.oxygenSaturation < 94) {
            indicators.push({ factor: 'Oxygenation', trend: 'IMPROVING', severity: 'LOW', note: 'Oxygen saturation stabilized above 95%.' });
            improvementPoints += 2;
        }
    }

    // 3. Heart Rate & Shock Index
    if (latest.heartRate && latest.bloodPressure?.systolic) {
        const shockIndex = latest.heartRate / latest.bloodPressure.systolic;
        if (shockIndex > 0.9) {
            indicators.push({ factor: 'Shock Index', trend: 'ABNORMAL', severity: 'HIGH', note: `Shock index is ${shockIndex.toFixed(2)} (High risk of hemodynamic collapse)` });
            riskScore += 3;
        }
        
        if (previous.heartRate) {
            const hrDiff = latest.heartRate - previous.heartRate;
            if (hrDiff > 20 && latest.heartRate > 100) {
                indicators.push({ factor: 'Heart Rate', trend: 'TACHYCARDIA_SURGE', severity: 'MEDIUM', note: `HR jumped +${hrDiff} bpm (current: ${latest.heartRate})` });
                riskScore += 1;
            }
        }
    }

    // 4. Fluid Balance (Kidney Function & Hydration)
    const totalIntake = history.reduce((sum, entry) => sum + (entry.fluidIntake || 0), 0);
    const totalOutput = history.reduce((sum, entry) => sum + (entry.fluidOutput || 0), 0);
    const netBalance = totalIntake - totalOutput;

    if (totalIntake > 0 || totalOutput > 0) {
        if (netBalance < -1000) {
            indicators.push({ factor: 'Fluid Balance', trend: 'NEGATIVE_BALANCE', severity: 'HIGH', note: `Severe dehydration risk: Net balance ${netBalance}ml` });
            riskScore += 2;
        } else if (netBalance > 2000) {
            indicators.push({ factor: 'Fluid Balance', trend: 'POSITIVE_SURGE', severity: 'MEDIUM', note: `Fluid retention risk: Net balance +${netBalance}ml` });
            riskScore += 1;
        }
        
        // Correlate Fluid with BP
        if (netBalance < -500 && latest.bloodPressure?.systolic < 100) {
            indicators.push({ factor: 'Correlation', trend: 'HYPOVOLEMIA_DANGER', severity: 'CRITICAL', note: 'Low fluid balance correlating with hypotension. Risk of hypovolemic shock.' });
            riskScore += 4;
        }
    }

    // 5. Clinical State Analysis
    if (latest.clinicalState === 'Deteriorating') {
        indicators.push({ factor: 'Clinician Observation', trend: 'DETERIORATING', severity: 'HIGH', note: 'Staff noted clinical deterioration.' });
        riskScore += 3;
    } else if (latest.clinicalState === 'Improving' && previous.clinicalState !== 'Improving') {
        indicators.push({ factor: 'Clinician Observation', trend: 'IMPROVING', severity: 'LOW', note: 'Staff noted clinical improvement.' });
        improvementPoints += 1;
    }

    // Final Status Determination
    let status = 'STABLE';
    let message = 'Patient condition is stable. Trends are within expected parameters.';

    if (riskScore >= 7) {
        status = 'CRITICAL';
        message = 'CRITICAL: Multiple indicators of rapid physiological collapse. Immediate emergency intervention required.';
    } else if (riskScore >= 4) {
        status = 'DETERIORATING';
        message = 'WARNING: Vital trends indicate deterioration. Clinician review and treatment adjustment recommended.';
    } else if (riskScore >= 2) {
        status = 'UNSTABLE';
        message = 'CAUTION: Signs of physiological stress or instability detected. Increase monitoring frequency.';
    } else if (improvementPoints >= 3) {
        status = 'RECOVERING';
        message = 'SUCCESS: Patient shows consistent signs of clinical improvement across multiple metrics.';
    }

    return {
        status,
        message,
        indicators,
        riskScore,
        netBalance,
        totalIntake,
        totalOutput,
        summary: {
            totalEntries: history.length,
            durationHours: Math.round((new Date(latest.recordedAt) - new Date(first.recordedAt)) / (1000 * 60 * 60)),
            lastUpdated: latest.recordedAt
        }
    };
}

module.exports = {
    analyzeRecordProgress
};
