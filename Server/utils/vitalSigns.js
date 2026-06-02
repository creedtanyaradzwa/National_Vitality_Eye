/**
 * Clinical vital-sign formatting and classification (NEWS2-aligned thresholds).
 */

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

/** AHA / ESC — abnormal if systolic ≥140 OR diastolic ≥90 */
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

function calculateAge(dob) {
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
    calculateAge,
    buildPatientSnapshot,
    normalizeVitalSigns
};
