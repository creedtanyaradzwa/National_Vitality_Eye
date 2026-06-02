/**
 * normalise.js — Centralised text normalisation and fuzzy matching
 *
 * Ensures that user inputs like "MALARIA ", "malaria", "Malaria fever",
 * "chest  pain", "Chest-Pain", "Parirenyatwa Hosp" all resolve to a
 * consistent canonical form before being stored or compared.
 *
 * Strategy:
 *  1. Trim + collapse whitespace
 *  2. Title-case (for display storage)
 *  3. Synonym / alias expansion (common abbreviations → canonical)
 *  4. Fuzzy matching via Levenshtein distance for lookups
 */

// ── Symptom synonyms ─────────────────────────────────────────────────────────
// Maps any variant → canonical form
const SYMPTOM_SYNONYMS = {
    // Breathing
    'sob': 'shortness of breath',
    'short of breath': 'shortness of breath',
    'breathlessness': 'shortness of breath',
    'cant breathe': 'difficulty breathing',
    "can't breathe": 'difficulty breathing',
    'breathing difficulty': 'difficulty breathing',
    'difficulty to breathe': 'difficulty breathing',
    'hard to breathe': 'difficulty breathing',
    'respiratory distress': 'difficulty breathing',
    'wheezing': 'wheezing',
    'stridor': 'difficulty breathing',

    // Fever / temperature
    'high temp': 'fever',
    'high temperature': 'fever',
    'pyrexia': 'fever',
    'febrile': 'fever',
    'running temperature': 'fever',
    'running a fever': 'fever',
    'hot body': 'fever',
    'body hot': 'fever',

    // Pain
    'chest tightness': 'chest pain',
    'chest discomfort': 'chest pain',
    'heart pain': 'chest pain',
    'stomach ache': 'abdominal pain',
    'stomach pain': 'abdominal pain',
    'tummy pain': 'abdominal pain',
    'belly pain': 'abdominal pain',
    'abdo pain': 'abdominal pain',
    'epigastric pain': 'abdominal pain',
    'back ache': 'back pain',
    'backache': 'back pain',
    'headache': 'headache',
    'head ache': 'headache',
    'migraine': 'headache',
    'joint pain': 'joint pain',
    'body ache': 'muscle pain',
    'muscle pain': 'muscle pain',

    // Nausea / vomiting
    'throwing up': 'vomiting',
    'vomit': 'vomiting',
    'nauseous': 'nausea',
    'feeling sick': 'nausea',
    'puke': 'vomiting',

    // Diarrhoea
    'diarrhea': 'diarrhoea',
    'loose stool': 'diarrhoea',
    'loose stools': 'diarrhoea',
    'running stomach': 'diarrhoea',
    'watery stool': 'diarrhoea',
    'watery diarrhea': 'diarrhoea',
    'rice water stool': 'diarrhoea',

    // Cough
    'coughing': 'cough',
    'dry cough': 'cough',
    'wet cough': 'productive cough',
    'productive cough': 'productive cough',
    'cough with sputum': 'productive cough',

    // Fatigue
    'tiredness': 'fatigue',
    'tired': 'fatigue',
    'weakness': 'fatigue',
    'weak': 'fatigue',
    'lethargy': 'fatigue',
    'lethargic': 'fatigue',
    'no energy': 'fatigue',

    // Dizziness
    'dizzy': 'dizziness',
    'lightheaded': 'dizziness',
    'light headed': 'dizziness',
    'vertigo': 'dizziness',

    // Swelling
    'swollen feet': 'oedema',
    'swollen legs': 'oedema',
    'oedema': 'oedema',
    'edema': 'oedema',
    'swelling': 'oedema',

    // Rash / skin
    'skin rash': 'rash',
    'itching': 'pruritus',
    'itchy skin': 'pruritus',
    'pruritus': 'pruritus',
    'sores': 'skin lesions',

    // Consciousness
    'passed out': 'loss of consciousness',
    'fainted': 'loss of consciousness',
    'fainting': 'loss of consciousness',
    'syncope': 'loss of consciousness',
    'unconscious': 'loss of consciousness',
    'unresponsive': 'loss of consciousness',

    // Seizure
    'convulsions': 'seizure',
    'fits': 'seizure',
    'fit': 'seizure',
    'epilepsy': 'seizure',

    // Bleeding
    'bleeding': 'bleeding',
    'haemorrhage': 'bleeding',
    'hemorrhage': 'bleeding',
    'blood loss': 'bleeding',

    // Vision
    'blurry vision': 'blurred vision',
    'blurry eyes': 'blurred vision',
    'vision problems': 'blurred vision',
    'poor vision': 'blurred vision',
    'loss of vision': 'blindness',

    // Weight
    'losing weight': 'weight loss',
    'weight loss': 'weight loss',
    'wasting': 'weight loss',

    // Night sweats
    'night sweating': 'night sweats',
    'sweating at night': 'night sweats',

    // Throat
    'sore throat': 'sore throat',
    'throat pain': 'sore throat',
    'throat ache': 'sore throat',
    'tonsillitis': 'sore throat',

    // Nose
    'runny nose': 'runny nose',
    'nasal discharge': 'runny nose',
    'rhinorrhoea': 'runny nose',
    'rhinorrhea': 'runny nose',
    'blocked nose': 'nasal congestion',
    'stuffy nose': 'nasal congestion',
    'nasal congestion': 'nasal congestion',

    // Appetite
    'no appetite': 'loss of appetite',
    'not eating': 'loss of appetite',
    'anorexia': 'loss of appetite',

    // Chronic/Vitals
    'hbp': 'hypertension',
    'high bp': 'hypertension',
    'high blood pressure': 'hypertension',
    'sugar': 'diabetes',
    'high sugar': 'diabetes',
};

// ── Disease synonyms ─────────────────────────────────────────────────────────
const DISEASE_SYNONYMS = {
    // Malaria
    'malaria fever': 'Malaria',
    'malarial fever': 'Malaria',
    'plasmodium': 'Malaria',

    // Typhoid
    'typhoid fever': 'Typhoid',
    'enteric fever': 'Typhoid',

    // TB
    'tb': 'Tuberculosis',
    'tuberculosis': 'Tuberculosis',
    'pulmonary tb': 'Tuberculosis',
    'pulmonary tuberculosis': 'Tuberculosis',

    // HIV/AIDS
    'hiv': 'HIV/AIDS',
    'aids': 'HIV/AIDS',
    'hiv/aids': 'HIV/AIDS',
    'hiv aids': 'HIV/AIDS',

    // Pneumonia
    'pneumonia': 'Pneumonia',
    'chest infection': 'Pneumonia',
    'lower respiratory tract infection': 'Pneumonia',
    'lrti': 'Pneumonia',

    // Cholera
    'cholera': 'Cholera',

    // Diabetes
    'diabetes': 'Diabetes',
    'diabetes mellitus': 'Diabetes',
    'dm': 'Diabetes',
    'type 2 diabetes': 'Diabetes',
    'type 1 diabetes': 'Diabetes',

    // Hypertension
    'hypertension': 'Hypertension',
    'high blood pressure': 'Hypertension',
    'hbp': 'Hypertension',
    'htn': 'Hypertension',

    // Diarrhoeal disease
    'diarrhoea': 'Diarrhoeal Disease',
    'diarrhea': 'Diarrhoeal Disease',
    'gastroenteritis': 'Diarrhoeal Disease',
    'gastro': 'Diarrhoeal Disease',

    // Anaemia
    'anaemia': 'Anaemia',
    'anemia': 'Anaemia',
    'iron deficiency': 'Anaemia',

    // Asthma
    'asthma': 'Asthma',
    'bronchial asthma': 'Asthma',

    // COVID
    'covid': 'COVID-19',
    'covid-19': 'COVID-19',
    'coronavirus': 'COVID-19',
    'sars-cov-2': 'COVID-19',

    // Measles
    'measles': 'Measles',
    'rubeola': 'Measles',

    // Meningitis
    'meningitis': 'Meningitis',
    'bacterial meningitis': 'Meningitis',
    'viral meningitis': 'Meningitis',

    // Schistosomiasis
    'schistosomiasis': 'Schistosomiasis',
    'bilharzia': 'Schistosomiasis',
    'bilharziasis': 'Schistosomiasis',
};

// ── Hospital name synonyms ───────────────────────────────────────────────────
const HOSPITAL_SYNONYMS = {
    // Parirenyatwa
    'parirenyatwa': 'Parirenyatwa Group of Hospitals',
    'parirenyatwa hospital': 'Parirenyatwa Group of Hospitals',
    'parirenyatwa hosp': 'Parirenyatwa Group of Hospitals',
    'pgh': 'Parirenyatwa Group of Hospitals',
    'parirenyatwa group': 'Parirenyatwa Group of Hospitals',

    // Harare Central
    'harare hospital': 'Harare Central Hospital',
    'harare central': 'Harare Central Hospital',
    'hch': 'Harare Central Hospital',
    'harare central hosp': 'Harare Central Hospital',

    // Harare General
    'harare general': 'Harare General Hospital',
    'harare general hospital': 'Harare General Hospital',
    'hgh': 'Harare General Hospital',
    'hosp-hre-001': 'Harare General Hospital',

    // Mpilo
    'mpilo': 'Mpilo Central Hospital',
    'mpilo hospital': 'Mpilo Central Hospital',
    'mpilo central': 'Mpilo Central Hospital',

    // United Bulawayo
    'ubh': 'United Bulawayo Hospitals',
    'united bulawayo': 'United Bulawayo Hospitals',
    'united bulawayo hospital': 'United Bulawayo Hospitals',

    // Chitungwiza
    'chitungwiza': 'Chitungwiza Central Hospital',
    'chitungwiza hospital': 'Chitungwiza Central Hospital',
    'cch': 'Chitungwiza Central Hospital',

    // Mutare
    'mutare hospital': 'Mutare Provincial Hospital',
    'mutare provincial': 'Mutare Provincial Hospital',

    // Masvingo
    'masvingo hospital': 'Masvingo Provincial Hospital',
    'masvingo provincial': 'Masvingo Provincial Hospital',

    // Gweru
    'gweru hospital': 'Gweru Provincial Hospital',
    'gweru provincial': 'Gweru Provincial Hospital',
    'gweru central': 'Gweru Provincial Hospital',

    // Bindura
    'bindura hospital': 'Bindura Provincial Hospital',
    'bindura provincial': 'Bindura Provincial Hospital',

    // Chinhoyi
    'chinhoyi hospital': 'Chinhoyi Provincial Hospital',
    'chinhoyi provincial': 'Chinhoyi Provincial Hospital',
};

// ── Province synonyms ────────────────────────────────────────────────────────
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

// ── Core text utilities ──────────────────────────────────────────────────────

/**
 * Collapse whitespace, trim, lowercase — the base step for all comparisons
 */
function baseNormalise(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .trim()
        .replace(/\s+/g, ' ')       // collapse multiple spaces
        .replace(/[-_]+/g, ' ')     // hyphens/underscores → space
        .toLowerCase();
}

/**
 * Title-case a string: "chest pain" → "Chest Pain"
 */
function toTitleCase(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Levenshtein distance between two strings (for fuzzy matching)
 */
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

/**
 * Find the best match from a list of canonical values using fuzzy matching.
 * Returns the canonical value if similarity is above threshold, else null.
 *
 * @param {string} input       - raw user input
 * @param {string[]} canonicals - list of known canonical values
 * @param {number} threshold   - max Levenshtein distance to accept (default 3)
 */
function fuzzyMatch(input, canonicals, threshold = 3) {
    const norm = baseNormalise(input);
    let best = null, bestDist = Infinity;
    for (const c of canonicals) {
        const dist = levenshtein(norm, baseNormalise(c));
        if (dist < bestDist) { bestDist = dist; best = c; }
    }
    return bestDist <= threshold ? best : null;
}

// ── Public normalisation functions ───────────────────────────────────────────

/**
 * Normalise a symptom string.
 * "CHEST  PAIN" → "Chest Pain"
 * "sob" → "Shortness Of Breath"
 * "cant breathe" → "Difficulty Breathing"
 */
function normaliseSymptom(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const norm = baseNormalise(raw);
    
    // 1. Direct synonym lookup (exact match after base normalisation)
    if (SYMPTOM_SYNONYMS[norm]) return toTitleCase(SYMPTOM_SYNONYMS[norm]);
    
    // 2. Keyword/Partial match
    // Check if the input contains a known clinical keyword or vice-versa
    for (const [key, canonical] of Object.entries(SYMPTOM_SYNONYMS)) {
        // Only trigger keyword match for significant words (length > 3)
        if (key.length > 3) {
            if (norm.includes(key) || key.includes(norm)) {
                return toTitleCase(canonical);
            }
        }
    }
    
    // 3. Unique Partial Match logic (The "Matches Just One" rule)
    // If the input matches exactly one canonical symptom, pick it.
    const canonicals = [...new Set(Object.values(SYMPTOM_SYNONYMS))];
    const partialMatches = canonicals.filter(c => {
        const cNorm = c.toLowerCase();
        return cNorm.includes(norm) || norm.includes(cNorm);
    });

    if (partialMatches.length === 1) {
        return toTitleCase(partialMatches[0]);
    }

    // 4. Clinical Keyword extraction fallback
    const keywords = {
        'fever': 'Fever', 'temp': 'Fever', 'hot': 'Fever',
        'cough': 'Cough', 'hacking': 'Cough',
        'vomit': 'Vomiting', 'puke': 'Vomiting', 'throwing up': 'Vomiting',
        'diarrhea': 'Diarrhoea', 'diarrhoea': 'Diarrhoea', 'stomach running': 'Diarrhoea',
        'pain': 'Pain', 'ache': 'Pain', 'sore': 'Pain',
        'breath': 'Difficulty Breathing', 'resp': 'Difficulty Breathing',
        'dizzy': 'Dizziness', 'faint': 'Dizziness',
        'rash': 'Rash', 'itch': 'Pruritus',
        'tired': 'Fatigue', 'weak': 'Fatigue',
        'head': 'Headache', 'migraine': 'Headache',
        'chest': 'Chest Pain', 'heart': 'Chest Pain'
    };

    for (const [kw, canonical] of Object.entries(keywords)) {
        if (norm.includes(kw)) return canonical;
    }
    
    // 4. No match — return cleaned title-case
    return toTitleCase(norm);
}

/**
 * Normalise a disease name.
 * "malaria fever" → "Malaria"
 * "TUBERCULOSIS" → "Tuberculosis"
 * "bilharzia" → "Schistosomiasis"
 */
function normaliseDisease(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const norm = baseNormalise(raw);
    if (DISEASE_SYNONYMS[norm]) return DISEASE_SYNONYMS[norm];
    // Partial match
    for (const [key, canonical] of Object.entries(DISEASE_SYNONYMS)) {
        if (norm.includes(key) || key.includes(norm)) return canonical;
    }
    // Fuzzy match against known canonical disease names
    const canonicals = [...new Set(Object.values(DISEASE_SYNONYMS))];
    const fuzzy = fuzzyMatch(norm, canonicals, 2);
    if (fuzzy) return fuzzy;
    // Fall back to title-case of the cleaned input
    return toTitleCase(norm);
}

/**
 * Normalise a hospital name.
 * "parirenyatwa hosp" → "Parirenyatwa Group of Hospitals"
 * "HARARE CENTRAL" → "Harare Central Hospital"
 */
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
    // Not a known hospital — return cleaned title-case
    return toTitleCase(norm);
}

/**
 * Normalise a province name.
 * "mash east" → "Mashonaland East"
 * "HARARE" → "Harare"
 */
function normaliseProvince(raw) {
    if (!raw || typeof raw !== 'string') return raw || '';
    const norm = baseNormalise(raw);
    if (PROVINCE_SYNONYMS[norm]) return PROVINCE_SYNONYMS[norm];
    for (const [key, canonical] of Object.entries(PROVINCE_SYNONYMS)) {
        if (norm.includes(key)) return canonical;
    }
    // Fuzzy match against the 10 official province names
    const PROVINCES = [
        'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
        'Mashonaland East', 'Mashonaland West', 'Masvingo',
        'Matabeleland North', 'Matabeleland South', 'Midlands'
    ];
    const fuzzy = fuzzyMatch(norm, PROVINCES, 3);
    if (fuzzy) return fuzzy;
    return toTitleCase(norm);
}

/**
 * Normalise a chronic condition / family history condition name.
 * Reuses disease synonyms + general title-casing.
 */
function normaliseCondition(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const norm = baseNormalise(raw);
    if (DISEASE_SYNONYMS[norm]) return DISEASE_SYNONYMS[norm];
    for (const [key, canonical] of Object.entries(DISEASE_SYNONYMS)) {
        if (norm.includes(key) || key.includes(norm)) return canonical;
    }
    return toTitleCase(norm);
}

/**
 * Normalise an array of symptoms.
 * Now aggressively extracts multiple symptoms from a single string.
 * "fever and a bad cough" → ["Fever", "Cough"]
 */
function normaliseSymptoms(arr) {
    if (!arr) return [];
    const inputs = Array.isArray(arr) ? arr : [arr];
    const extracted = [];
    const seen = new Set();

    inputs.forEach(input => {
        if (!input || typeof input !== 'string') return;
        
        // Split by common delimiters: comma, semicolon, " and ", " plus ", " with "
        const parts = input.split(/[,;]|\s+and\s+|\s+plus\s+|\s+with\s+/i);
        
        parts.forEach(part => {
            const cleanPart = part.trim();
            if (!cleanPart) return;
            
            const normalised = normaliseSymptom(cleanPart);
            if (normalised && !seen.has(normalised)) {
                extracted.push(normalised);
                seen.add(normalised);
            }
        });
    });

    return extracted;
}

/**
 * Given a raw symptom/disease string, return the normalised lookup key
 * used inside the AI Maps (lowercase, no extra spaces).
 * This is what gets stored as Map keys in ContinuousLearner.
 */
function toAIKey(str) {
    return baseNormalise(str);
}

/**
 * Fuzzy-find a disease pattern key in the AI's diseasePatterns Map.
 * Handles "Malaria Fever" matching the stored key "malaria".
 *
 * @param {Map} diseasePatterns - the AI's diseasePatterns Map
 * @param {string} rawDisease   - user-supplied disease name
 * @returns {string|null}       - the matching Map key, or null
 */
function findDiseaseKey(diseasePatterns, rawDisease) {
    const norm = baseNormalise(normaliseDisease(rawDisease));
    // Exact match first
    if (diseasePatterns.has(norm)) return norm;
    // Try all keys with Levenshtein
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
