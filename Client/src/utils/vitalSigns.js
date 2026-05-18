/** Client-side vital sign formatting and classification (mirrors server). */

export function roundTemperature(value) {
    if (value == null || value === '' || Number.isNaN(Number(value))) return null;
    return Math.round(Number(value) * 10) / 10;
}

export function formatTemperature(value) {
    const t = roundTemperature(value);
    return t == null ? '—' : t.toFixed(1);
}

export function classifyTemperature(celsius) {
    const t = roundTemperature(celsius);
    if (t == null) return { status: 'MISSING', color: 'gray' };
    if (t >= 39.1) return { status: 'CRITICAL', color: 'red' };
    if (t >= 38.1) return { status: 'ELEVATED', color: 'orange' };
    if (t <= 35.0) return { status: 'LOW', color: 'orange' };
    if (t <= 36.0) return { status: 'SUBNORMAL', color: 'yellow' };
    return { status: 'NORMAL', color: 'green' };
}

export function classifyBloodPressure(systolic, diastolic) {
    const sys = systolic != null ? Number(systolic) : null;
    const dia = diastolic != null ? Number(diastolic) : null;
    if (sys == null && dia == null) return { status: 'MISSING', color: 'gray' };
    if ((sys != null && sys > 180) || (dia != null && dia > 120)) return { status: 'CRISIS', color: 'red' };
    if ((sys != null && sys >= 140) || (dia != null && dia >= 90)) return { status: 'HIGH', color: 'red' };
    if ((sys != null && sys >= 130) || (dia != null && dia >= 80)) return { status: 'ELEVATED', color: 'orange' };
    if (sys != null && sys >= 120 && (dia == null || dia < 80)) return { status: 'ELEVATED', color: 'orange' };
    return { status: 'NORMAL', color: 'green' };
}

export function classifyHeartRate(bpm) {
    const hr = bpm != null ? Number(bpm) : null;
    if (hr == null) return { status: 'MISSING', color: 'gray' };
    if (hr > 130 || hr < 40) return { status: 'CRITICAL', color: 'red' };
    if (hr > 110 || hr < 50) return { status: 'ABNORMAL', color: 'orange' };
    if (hr > 90 || hr < 60) return { status: 'ELEVATED', color: 'yellow' };
    return { status: 'NORMAL', color: 'green' };
}

export function classifySpO2(percent) {
    const spo2 = percent != null ? Number(percent) : null;
    if (spo2 == null) return { status: 'MISSING', color: 'gray' };
    if (spo2 <= 91) return { status: 'CRITICAL', color: 'red' };
    if (spo2 <= 93) return { status: 'LOW', color: 'orange' };
    if (spo2 <= 95) return { status: 'BORDERLINE', color: 'yellow' };
    return { status: 'NORMAL', color: 'green' };
}

const STATUS_COLORS = {
    red: 'text-red-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    green: 'text-cyber-green',
    gray: 'text-gray-500'
};

export function statusColorClass(color) {
    return STATUS_COLORS[color] || STATUS_COLORS.gray;
}

export function buildVitalDisplayRows(vitalSigns) {
    if (!vitalSigns) return [];
    const temp = classifyTemperature(vitalSigns.temperature);
    const bp = classifyBloodPressure(
        vitalSigns.bloodPressure?.systolic,
        vitalSigns.bloodPressure?.diastolic
    );
    const hr = classifyHeartRate(vitalSigns.heartRate);
    const spo2 = classifySpO2(vitalSigns.oxygenSaturation);

    return [
        {
            label: 'TEMP',
            value: vitalSigns.temperature != null ? `${formatTemperature(vitalSigns.temperature)}°C` : '—',
            status: temp.status,
            color: temp.color
        },
        {
            label: 'BP',
            value: vitalSigns.bloodPressure?.systolic != null
                ? `${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic ?? '—'}`
                : '—',
            status: bp.status,
            color: bp.color
        },
        {
            label: 'HR',
            value: vitalSigns.heartRate != null ? `${vitalSigns.heartRate} BPM` : '—',
            status: hr.status,
            color: hr.color
        },
        {
            label: 'SPO2',
            value: vitalSigns.oxygenSaturation != null ? `${vitalSigns.oxygenSaturation}%` : '—',
            status: spo2.status,
            color: spo2.color
        },
        {
            label: 'RESP',
            value: vitalSigns.respiratoryRate != null ? `${vitalSigns.respiratoryRate}/min` : '—',
            status: vitalSigns.respiratoryRate != null ? 'RECORDED' : 'MISSING',
            color: 'gray'
        },
        {
            label: 'BMI',
            value: vitalSigns.bmi != null ? String(vitalSigns.bmi) : '—',
            status: vitalSigns.bmi != null ? 'RECORDED' : 'MISSING',
            color: 'gray'
        }
    ];
}
