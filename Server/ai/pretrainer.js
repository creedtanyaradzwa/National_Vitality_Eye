/**
 * ============================================================
 * NVE Clinical AI — Pre-Training Module
 * ============================================================
 *
 * Converts trainer2.json (EDLIZ-backed disease knowledge base)
 * into a pre-seeded diseasePatterns Map that can be injected
 * into ContinuousLearner before any real medical records are
 * loaded from MongoDB.
 *
 * Design principles:
 *  - Each disease entry is seeded with PRETRAIN_WEIGHT synthetic
 *    records. This gives the AI a usable baseline immediately on
 *    first boot, even on an empty database.
 *  - Vital sign ranges are parsed from human-readable strings
 *    (e.g. "60-100 bpm") into numeric min/avg/max values.
 *  - Symptoms are normalised through the same pipeline used by
 *    processNewRecord(), so they match correctly at prediction time.
 *  - Real records from MongoDB are processed AFTER pretraining and
 *    always add on top of the pre-trained baseline. Because real
 *    records accumulate over time and each counts as 1.0 weight
 *    vs the synthetic PRETRAIN_WEIGHT (10), real data dominates
 *    after roughly 15-20 actual records per disease.
 *
 * Weight dynamics:
 *   PRETRAIN_WEIGHT = 10  (equivalent to 10 synthetic records)
 *   After 10 real records  → real data = 50% of total weight
 *   After 30 real records  → real data = 75% of total weight
 *   After 50 real records  → real data = 83% of total weight
 *   After 100 real records → real data = 91% of total weight
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const {
    normaliseDisease,
    normaliseSymptoms,
    toAIKey
} = require('../utils/normalise');

// ─────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────

/** How many synthetic records each pre-trained disease entry equals */
const PRETRAIN_WEIGHT = 10;

/** Path to the trainer2 knowledge base */
const TRAINER_PATH = path.join(__dirname, '../../trainer2.json');


// ─────────────────────────────────────────────
//  Vital-sign range parsers
// ─────────────────────────────────────────────

/**
 * Parses strings like:
 *   "60-100 bpm"     → { min: 60, max: 100, avg: 80 }
 *   ">38.0°C"        → { min: 38.0, max: 40.0, avg: 38.75 }
 *   "<90/60 mmHg"    → { min: 60, max: 90, avg: 75 }   (uses systolic)
 *   "36.0-37.5°C"    → { min: 36.0, max: 37.5, avg: 36.75 }
 * Returns null when the string cannot be parsed.
 */
function parseRange(str) {
    if (!str || typeof str !== 'string') return null;

    const clean = str.replace(/[°C%bpm\s]/g, '').toLowerCase();

    // Greater-than pattern  e.g. ">38.0"
    const gtMatch = clean.match(/^>(\d+\.?\d*)/);
    if (gtMatch) {
        const min = parseFloat(gtMatch[1]);
        const max = min + 2.0;          // educated upper bound
        return { min, max, avg: (min + max) / 2 };
    }

    // Less-than pattern  e.g. "<90"
    const ltMatch = clean.match(/^<(\d+\.?\d*)/);
    if (ltMatch) {
        const max = parseFloat(ltMatch[1]);
        const min = max * 0.7;          // educated lower bound
        return { min, max, avg: (min + max) / 2 };
    }

    // Range pattern  e.g. "36.0-37.5"  or "60-100"
    const rangeMatch = clean.match(/^(\d+\.?\d*)-(\d+\.?\d*)$/);
    if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        return { min, max, avg: (min + max) / 2 };
    }

    return null;
}

/**
 * Parses bp_target strings like:
 *   "90/60-120/80 mmHg"   → { systolicAvg: 105, diastolicAvg: 70 }
 *   "<90/60 mmHg"         → { systolicAvg: 80,  diastolicAvg: 53 }
 */
function parseBP(str) {
    if (!str || typeof str !== 'string') return null;

    // Range pattern:  "90/60-120/80"
    const rangeMatch = str.match(/(\d+)\/(\d+)\s*-\s*(\d+)\/(\d+)/);
    if (rangeMatch) {
        const sysMin  = parseFloat(rangeMatch[1]);
        const diaMin  = parseFloat(rangeMatch[2]);
        const sysMax  = parseFloat(rangeMatch[3]);
        const diaMax  = parseFloat(rangeMatch[4]);
        return {
            systolicAvg:  (sysMin + sysMax) / 2,
            diastolicAvg: (diaMin + diaMax) / 2
        };
    }

    // Single-value pattern (often limit cases): "<90/60"  or "100/70"
    const singleMatch = str.match(/(\d+)\/(\d+)/);
    if (singleMatch) {
        return {
            systolicAvg:  parseFloat(singleMatch[1]) * 0.9,   // treat as upper bound
            diastolicAvg: parseFloat(singleMatch[2]) * 0.9
        };
    }

    return null;
}

/**
 * Parses "95%" → 95
 * Parses "92"  → 92
 * Returns null on failure.
 */
function parseSpo2(str) {
    if (!str) return null;
    const m = String(str).match(/(\d+\.?\d*)/);
    return m ? parseFloat(m[1]) : null;
}


// ─────────────────────────────────────────────
//  Protocol flatteners
// ─────────────────────────────────────────────

/**
 * Recursively walks a nested protocol object and collects all
 * string leaf values as flat bullet strings.
 *
 * Example:
 *   { first_line: { adult: "Drug A 500mg", child: "Drug A 250mg" } }
 *   → ["first_line → adult: Drug A 500mg", "first_line → child: Drug A 250mg"]
 *
 * Labels are title-cased and underscores are replaced with spaces.
 */
function flattenProtocol(obj, prefix = '', results = []) {
    if (!obj || typeof obj !== 'object') return results;

    for (const [key, val] of Object.entries(obj)) {
        const label = (prefix ? prefix + ' → ' : '') +
            key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (typeof val === 'string' && val.trim()) {
            results.push(`${label}: ${val.trim()}`);
        } else if (typeof val === 'boolean') {
            // skip boolean flags (e.g. vaccination.available: false)
        } else if (typeof val === 'object' && val !== null) {
            flattenProtocol(val, label, results);
        }
    }
    return results;
}

/**
 * Builds a compact, human-readable summary array from treatment_protocols.
 * Groups top-level sections as headers and limits depth to keep output clean.
 *
 * Returns an array of strings suitable for displaying as clinical bullets.
 */
function buildTreatmentLines(treatmentProtocols) {
    if (!treatmentProtocols || typeof treatmentProtocols !== 'object') return [];
    const lines = [];
    for (const [section, content] of Object.entries(treatmentProtocols)) {
        const header = '💊 ' + section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        lines.push(header);
        const sub = flattenProtocol(content, '', []);
        sub.slice(0, 6).forEach(s => lines.push('  • ' + s));   // cap per-section
    }
    return lines;
}

/**
 * Builds a compact, human-readable summary array from preventive_protocols.
 * Same approach as buildTreatmentLines but prefixed with shield emoji.
 */
function buildPreventionLines(preventiveProtocols) {
    if (!preventiveProtocols || typeof preventiveProtocols !== 'object') return [];
    const lines = [];
    for (const [section, content] of Object.entries(preventiveProtocols)) {
        const header = '🛡️ ' + section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        lines.push(header);
        const sub = flattenProtocol(content, '', []);
        sub.slice(0, 5).forEach(s => lines.push('  • ' + s));
    }
    return lines;
}

/**
 * Builds a flat array of outbreak-specific public health recommendations
 * drawn from prevention protocols + treatment headlines.
 * Used by OutbreakDetector when generating alert recommendations.
 */
function buildOutbreakRecommendations(entry) {
    const recs = [];

    // 1. Outbreak status banner
    if (entry.outbreak_status && typeof entry.outbreak_status === 'string') {
        recs.push(`⚠️ Status: ${entry.outbreak_status}`);
    }

    // 2. Top prevention measures (one line per sub-category)
    const prev = entry.preventive_protocols || {};
    for (const [section, content] of Object.entries(prev)) {
        const sectionLabel = section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (typeof content === 'object' && content !== null) {
            // Grab first meaningful string value from each section
            const firstVal = Object.values(content).find(v => typeof v === 'string');
            if (firstVal) recs.push(`🛡️ ${sectionLabel}: ${firstVal}`);
        } else if (typeof content === 'string') {
            recs.push(`🛡️ ${sectionLabel}: ${content}`);
        }
    }

    // 3. First-line treatment headline
    const treat = entry.treatment_protocols || {};
    const firstSection = Object.values(treat)[0];
    if (firstSection && typeof firstSection === 'object') {
        const firstLine = firstSection.first_line;
        if (firstLine) {
            const adultDose = typeof firstLine === 'string'
                ? firstLine
                : (firstLine.adult || Object.values(firstLine)[0] || '');
            if (adultDose) recs.push(`💊 First-line treatment: ${adultDose}`);
        }
    }

    // 4. Fallback if we got nothing useful
    if (recs.length === 0) {
        recs.push('📢 Report all suspected cases immediately to the nearest health facility.');
    }

    return recs;
}


// ─────────────────────────────────────────────
//  Core pre-training builder
// ─────────────────────────────────────────────

/**
 * Converts a single trainer2 entry into a disease-pattern object
 * that is structurally identical to what processNewRecord() builds,
 * extended with protocol fields that never come from medical records.
 *
 * @param {object} entry   – one element from trainer2.json
 * @returns {object|null}  – seeded pattern, or null if entry is invalid
 */
function buildPattern(entry) {
    if (!entry || !entry.name) return null;

    // ── Normalise disease name ──────────────────────────────────────
    const diseaseName = toAIKey(normaliseDisease(entry.name));

    // ── Normalise symptoms ──────────────────────────────────────────
    const rawSymptoms  = entry.symptoms || [];
    const normSymptoms = normaliseSymptoms(rawSymptoms).map(s => toAIKey(s));

    // Seed each known symptom with PRETRAIN_WEIGHT occurrences so that
    // symptom-matching score is non-zero for these diseases from boot.
    const symptomMap = new Map();
    normSymptoms.forEach(s => {
        if (s) symptomMap.set(s, PRETRAIN_WEIGHT);
    });

    // ── Parse vital signs ───────────────────────────────────────────
    const vs = entry.vital_signs || {};

    const tempRange = parseRange(vs.temp_range);
    const hrRange   = parseRange(vs.hr_range);
    const rrRange   = parseRange(vs.rr_range);
    const bpParsed  = parseBP(vs.bp_target);
    const spo2Min   = parseSpo2(vs.spo2_min);

    // Build running-total objects compatible with the existing avg tracking.
    // count = PRETRAIN_WEIGHT, sum = avg * count  →  avg stays correct.
    const makeVitalEntry = (avg) => {
        if (avg === null || avg === undefined || isNaN(avg)) {
            return { sum: 0, count: 0, avg: null };
        }
        return {
            sum:   avg * PRETRAIN_WEIGHT,
            count: PRETRAIN_WEIGHT,
            avg:   avg
        };
    };

    // For SpO2 we use (min + 2) as the representative average
    // because spo2_min is a clinical floor, not the central value.
    const spo2Avg = spo2Min !== null ? spo2Min + 2 : null;

    const vitalSignsAverages = {
        temperature:      makeVitalEntry(tempRange?.avg   ?? null),
        heartRate:        makeVitalEntry(hrRange?.avg     ?? null),
        systolicBP:       makeVitalEntry(bpParsed?.systolicAvg  ?? null),
        diastolicBP:      makeVitalEntry(bpParsed?.diastolicAvg ?? null),
        oxygenSaturation: makeVitalEntry(spo2Avg),
        respiratoryRate:  makeVitalEntry(rrRange?.avg     ?? null)
    };

    // ── Build protocol knowledge (always applies — not from records) ─
    const treatmentLines  = buildTreatmentLines(entry.treatment_protocols);
    const preventionLines = buildPreventionLines(entry.preventive_protocols);
    const outbreakRecs    = buildOutbreakRecommendations(entry);

    // ── Build the final pattern ─────────────────────────────────────
    return {
        // ─ Identification ─
        diseaseName,
        icd11Code:      entry.icd_11_code          || null,
        severity:       entry.severity             || 'Unknown',
        transmission:   entry.transmission         || 'Unknown',
        edlizTreatment: entry.edliz_treatment_path || null,
        outbreakStatus: entry.outbreak_status      || null,

        // ─ Core counters ─
        count:           PRETRAIN_WEIGHT,
        realCount:       0,
        pretrainedCount: PRETRAIN_WEIGHT,

        // ─ Symptom knowledge ─
        symptoms: symptomMap,

        // ─ Geographic / temporal — empty (no province context at pretraining) ─
        provinces:    new Map(),
        monthlyTrend: new Array(12).fill(0),
        yearlyTrend:  new Map(),

        // ─ Demographics — balanced defaults ─
        ageGroups:  { child: 0, adult: 0, elderly: 0 },
        genderStats:{ Male: 0, Female: 0, Other: 0 },

        // ─ Clinical correlations ─
        riskFactors:       new Map(),
        chronicConditions: new Map(),
        familyHistory:     new Map(),

        // ─ Outcomes — unknown at pretraining time ─
        outcomes: { recovered: 0, admitted: 0, referred: 0, deceased: 0 },

        // ─ Age stats ─
        avgAge:   35,
        ageSum:   35 * PRETRAIN_WEIGHT,
        ageCount: PRETRAIN_WEIGHT,

        // ─ Vital signs ─
        vitalSignsAverages,

        // ─ Meta ─
        isPretrained: true,
        lastSeen:     null,

        // ─ Range references (for UI display) ─
        vitalRanges: {
            temperature:      tempRange  || null,
            heartRate:        hrRange    || null,
            respiratoryRate:  rrRange    || null,
            systolicBP:       bpParsed ? { min: bpParsed.systolicAvg * 0.85, max: bpParsed.systolicAvg * 1.15, avg: bpParsed.systolicAvg } : null,
            diastolicBP:      bpParsed ? { min: bpParsed.diastolicAvg * 0.85, max: bpParsed.diastolicAvg * 1.15, avg: bpParsed.diastolicAvg } : null,
            oxygenSaturation: spo2Min !== null ? { min: spo2Min, max: 100, avg: spo2Avg } : null
        },

        // ─ Protocol knowledge — ALWAYS from pretraining, NEVER from records ─
        // These are fixed clinical facts that do not change with patient data.
        clinicalProtocols: {
            // Structured raw objects (for detail views)
            treatmentProtocols:  entry.treatment_protocols  || null,
            preventiveProtocols: entry.preventive_protocols || null,

            // Flat display-ready arrays (for alerts, prediction cards, patient portal)
            treatmentLines,    // e.g. ["💊 Uncomplicated Malaria", "  • First Line → Adult: AL 6-dose..."]
            preventionLines,   // e.g. ["🛡️ Vector Control", "  • Insecticide Treated Nets: Sleep under ITN..."]
            outbreakRecs       // e.g. ["⚠️ Status: Active Outbreak...", "🛡️ Vector Control: ...", "💊 First-line: ..."]
        }
    };
}


// ─────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────

/**
 * Loads trainer2.json and returns a Map<string, pattern> ready to
 * inject into the ContinuousLearner constructor.
 *
 * Key  = normalised disease name (toAIKey)
 * Value = disease pattern object (same shape as diseasePatterns entries)
 *
 * @returns {Map<string, object>}
 */
function loadBaseline() {
    let rawData;
    try {
        const json = fs.readFileSync(TRAINER_PATH, 'utf8');
        rawData = JSON.parse(json);
    } catch (err) {
        console.warn(`⚠️  Pretrainer: could not load trainer2.json — ${err.message}`);
        console.warn('   AI will start with no baseline (cold-start mode).');
        return new Map();
    }

    if (!Array.isArray(rawData)) {
        console.warn('⚠️  Pretrainer: trainer2.json is not an array. Skipping pretraining.');
        return new Map();
    }

    const patterns = new Map();
    let loaded  = 0;
    let skipped = 0;
    const seen  = new Set();

    for (const entry of rawData) {
        const pattern = buildPattern(entry);
        if (!pattern) { skipped++; continue; }

        const key = pattern.diseaseName;

        // Deduplicate: if two entries resolve to the same normalised key,
        // keep the first one (trainer2.json has some duplicate entries).
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);

        patterns.set(key, pattern);
        loaded++;
    }

    console.log(`✅ Pretrainer: loaded ${loaded} disease baselines from trainer2.json (${skipped} duplicates/invalid skipped)`);
    return patterns;
}

/**
 * Lightweight lookup — returns the clinicalProtocols block for a disease
 * by matching the disease name (fuzzy, case-insensitive).
 *
 * Used by OutbreakDetector to get protocol-backed recommendations for alerts
 * without needing a full ContinuousLearner instance.
 *
 * @param {Map<string,object>} baseline  – Map returned by loadBaseline()
 * @param {string} diseaseName           – raw disease name from a medical record
 * @returns {object|null}
 */
function getProtocols(baseline, diseaseName) {
    if (!baseline || !diseaseName) return null;

    const normalised = toAIKey(normaliseDisease(diseaseName));

    // 1. Exact normalised match
    if (baseline.has(normalised)) {
        return baseline.get(normalised).clinicalProtocols || null;
    }

    // 2. Fuzzy match — check if either string contains the other
    for (const [key, pattern] of baseline.entries()) {
        if (key.includes(normalised) || normalised.includes(key)) {
            return pattern.clinicalProtocols || null;
        }
    }

    return null;
}

module.exports = { loadBaseline, getProtocols, PRETRAIN_WEIGHT };
