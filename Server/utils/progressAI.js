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

    // Sort by timestamp
    const history = [...vitalsHistory].sort((a, b) => new Date(a.timestamp || a.recordedAt) - new Date(b.timestamp || b.recordedAt));
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const first = history[0];

    const indicators = [];
    let riskScore = 0;
    let improvementPoints = 0;

    const latestVitals = latest.vitalSigns || {};
    const previousVitals = previous.vitalSigns || {};

    // 1. Temperature Trend
    if (latestVitals.temperature && previousVitals.temperature) {
        const tempDiff = latestVitals.temperature - previousVitals.temperature;
        if (latestVitals.temperature > 38 && tempDiff > 0.5) {
            indicators.push({ factor: 'Fever', trend: 'RISING', severity: 'HIGH', note: `Temperature spiked +${tempDiff.toFixed(1)}°C to ${latestVitals.temperature}°C` });
            riskScore += 2;
        } else if (latestVitals.temperature <= 37.5 && previousVitals.temperature > 38) {
            indicators.push({ factor: 'Fever', trend: 'SUBSIDING', severity: 'LOW', note: 'Patient is defervescing (fever breaking).' });
            improvementPoints++;
        }
    }

    // 2. Oxygen Saturation (Critical)
    if (latestVitals.oxygenSaturation && previousVitals.oxygenSaturation) {
        const o2Diff = latestVitals.oxygenSaturation - previousVitals.oxygenSaturation;
        if (latestVitals.oxygenSaturation < 94 && o2Diff < -2) {
            indicators.push({ factor: 'Oxygenation', trend: 'CRITICAL_DROP', severity: 'CRITICAL', note: `SpO2 dropped by ${Math.abs(o2Diff)}% to ${latestVitals.oxygenSaturation}%` });
            riskScore += 5;
        } else if (latestVitals.oxygenSaturation >= 95 && previousVitals.oxygenSaturation < 94) {
            indicators.push({ factor: 'Oxygenation', trend: 'IMPROVING', severity: 'LOW', note: 'Oxygen saturation stabilized above 95%.' });
            improvementPoints += 2;
        }
    }

    // 3. Heart Rate & Shock Index
    if (latestVitals.heartRate && latestVitals.bloodPressure?.systolic) {
        const shockIndex = latestVitals.heartRate / latestVitals.bloodPressure.systolic;
        if (shockIndex > 0.9) {
            indicators.push({ factor: 'Shock Index', trend: 'ABNORMAL', severity: 'HIGH', note: `Shock index is ${shockIndex.toFixed(2)} (High risk of hemodynamic collapse)` });
            riskScore += 3;
        }
        
        if (previousVitals.heartRate) {
            const hrDiff = latestVitals.heartRate - previousVitals.heartRate;
            if (hrDiff > 20 && latestVitals.heartRate > 100) {
                indicators.push({ factor: 'Heart Rate', trend: 'TACHYCARDIA_SURGE', severity: 'MEDIUM', note: `HR jumped +${hrDiff} bpm (current: ${latestVitals.heartRate})` });
                riskScore += 1;
            }
        }
    }

    // 4. Fluid Balance (Kidney Function & Hydration)
    const totalIntake = history.reduce((sum, entry) => sum + (entry.fluidBalance?.intake || 0), 0);
    const totalOutput = history.reduce((sum, entry) => sum + (entry.fluidBalance?.output || 0), 0);
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
        if (netBalance < -500 && latestVitals.bloodPressure?.systolic < 100) {
            indicators.push({ factor: 'Correlation', trend: 'HYPOVOLEMIA_DANGER', severity: 'CRITICAL', note: 'Low fluid balance correlating with hypotension. Risk of hypovolemic shock.' });
            riskScore += 4;
        }
    }

    // 5. Clinical State Analysis
    if (latest.status === 'Deteriorating' || latest.status === 'Critical') {
        indicators.push({ factor: 'Clinician Observation', trend: 'DETERIORATING', severity: 'HIGH', note: 'Staff noted clinical deterioration.' });
        riskScore += 3;
    } else if (latest.status === 'Improving' && previous.status !== 'Improving') {
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
            durationHours: Math.round((new Date(latest.timestamp || latest.recordedAt) - new Date(first.timestamp || first.recordedAt)) / (1000 * 60 * 60)),
            lastUpdated: latest.timestamp || latest.recordedAt
        }
    };
}

module.exports = {
    analyzeRecordProgress
};
