const {
    normaliseDisease,
    normaliseSymptom,
    normaliseSymptoms,
    normaliseProvince,
    normaliseCondition,
    toAIKey,
    baseNormalise
} = require('../utils/normalise');

const { PRETRAIN_WEIGHT } = require('./pretrainer');

class ContinuousLearner {
    /**
     * @param {Map<string,object>|null} pretrainedPatterns
     *   Optional Map returned by pretrainer.loadBaseline().
     *   When supplied the AI boots with knowledge of every disease in
     *   trainer2.json, even on an empty MongoDB database.
     */
    constructor(pretrainedPatterns = null) {
        // Core data structures
        this.diseasePatterns = new Map();
        this.symptomCorrelations = new Map();
        this.provinceStats = new Map();
        this.temporalPatterns = new Map();
        this.riskFactors = new Map();
        this.vitalSignsPatterns = new Map();
        this.chronicConditionCorrelations = new Map();
        this.familyHistoryCorrelations = new Map();
        
        // Performance tracking
        this.predictionAccuracy = new Map();  
        this.calibrationFactor = 0.92;       
        this.minimumConfidence = 15;           
        this.totalPredictions = 0;
        this.correctPredictions = 0;
        
        // Global stats
        this.totalRecords = 0;
        this.lastUpdated = null;
        this.uniqueSymptoms = new Set(); 
        
        // Cache for patient data
        this.patientCache = new Map();
        this.lastPatientCacheUpdate = null;

        // ── Pre-training ────────────────────────────────────────────────
        // Seed the AI with EDLIZ-backed baseline patterns before any real
        // records are processed. This keeps the AI useful on first boot.
        if (pretrainedPatterns && pretrainedPatterns.size > 0) {
            this._loadPretrainedBaseline(pretrainedPatterns);
            console.log(`🧬 Pre-trained baseline loaded: ${pretrainedPatterns.size} diseases seeded`);
        }
        
        console.log("🤖 Enhanced Clinical AI v5.0 initialized (Pre-trained + Continuous Learning)");
        console.log("   Features: Pre-trained Baseline | Disease Prediction | Risk Assessment | Anomaly Detection | Patient Similarity | Confidence Calibration");
    }

    // ============ PRE-TRAINING ============

    /**
     * Injects pre-trained patterns into diseasePatterns.
     * Each pattern is copied from pretrainer output and all symptom
     * keys are also registered in the global uniqueSymptoms set.
     */
    _loadPretrainedBaseline(pretrainedPatterns) {
        pretrainedPatterns.forEach((pattern, key) => {
            // Register all pre-trained symptoms in the global symbol set
            if (pattern.symptoms instanceof Map) {
                pattern.symptoms.forEach((_, symptom) => {
                    this.uniqueSymptoms.add(symptom);
                });
            }

            // Deep-copy so future mutations on the pattern don't corrupt
            // the original pretrainer object (not strictly necessary but safe)
            this.diseasePatterns.set(key, {
                ...pattern,
                // Ensure Maps are live objects (spread gives us the same ref, that's fine —
                // pretrainer is loaded once and discarded after this point)
            });
        });
    }

    /**
     * Returns pretraining metadata for a disease, or null if not pre-trained.
     */
    getPretrainInfo(diseaseKey) {
        const pattern = this.diseasePatterns.get(diseaseKey);
        if (!pattern || !pattern.isPretrained) return null;
        return {
            pretrainedCount: pattern.pretrainedCount || PRETRAIN_WEIGHT,
            realCount:       pattern.realCount || 0,
            totalCount:      pattern.count,
            isPrimarilyReal: (pattern.realCount || 0) > (pattern.pretrainedCount || PRETRAIN_WEIGHT),
            edlizTreatment:  pattern.edlizTreatment  || null,
            icd11Code:       pattern.icd11Code        || null,
            severity:        pattern.severity         || null,
            transmission:    pattern.transmission     || null,
            vitalRanges:     pattern.vitalRanges      || null,
            clinicalProtocols: pattern.clinicalProtocols || null
        };
    }

    // ============ HELPER FUNCTIONS ============

    // Safe percentage calculator - never exceeds 100, never NaN
    safePercentage(value, total, maxWeight = 100) {
        if (!total || total === 0) return 0;
        const percentage = (value / total) * maxWeight;
        return Math.min(Math.max(0, percentage), maxWeight);
    }

    // Safe average calculator
    safeAverage(sum, count) {
        if (!count || count === 0) return null;
        return sum / count;
    }

    // Calculate mean and standard deviation
    calculateStats(values) {
        if (!values.length) return { avg: null, stdDev: null, min: null, max: null };
        
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            avg,
            stdDev,
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }

    // Confidence calibration
    calibrateConfidence(confidence, disease, patternCount) {
        let calibratedConfidence = confidence;
        
        // Apply calibration factor based on historical accuracy
        if (this.predictionAccuracy.has(disease)) {
            const stats = this.predictionAccuracy.get(disease);
            if (stats.total > 10) {
                const historicalAccuracy = stats.correct / stats.total;
                // Adjust confidence based on historical performance
                calibratedConfidence = confidence * (0.7 + historicalAccuracy * 0.3);
            }
        }
        
        // Ensure minimum confidence for well-documented diseases
        if (patternCount > 50 && calibratedConfidence < this.minimumConfidence) {
            calibratedConfidence = this.minimumConfidence;
        }
        
        // Apply global calibration factor
        calibratedConfidence = calibratedConfidence * this.calibrationFactor;
        
        // Cap at 100% and ensure minimum
        calibratedConfidence = Math.min(Math.max(calibratedConfidence, 5), 100);
        
        return calibratedConfidence;
    }

    // Record prediction outcome for learning
    recordPredictionOutcome(disease, predictedDisease, wasCorrect) {
        if (!this.predictionAccuracy.has(disease)) {
            this.predictionAccuracy.set(disease, { correct: 0, total: 0, confidenceSum: 0 });
        }
        const stats = this.predictionAccuracy.get(disease);
        if (wasCorrect) {
            stats.correct++;
            this.correctPredictions++;
        }
        stats.total++;
        this.totalPredictions++;
        
        // Log warning for low accuracy diseases
        if (stats.total > 10 && (stats.correct / stats.total) < 0.6) {
            console.log(`⚠️ Low accuracy warning for ${disease}: ${(stats.correct/stats.total*100).toFixed(1)}% (${stats.correct}/${stats.total})`);
        }
    }

    // ============ CORE LEARNING FUNCTIONS ============

    // Calculate age from DOB
    calculateAge(dob) {
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

    // Process a single new record
    processNewRecord(record, patientProfile = null) {
        if (!record || !record.disease) {
            console.warn("⚠️ Invalid record passed to AI");
            return null;
        }

        // ── Normalise all text fields before storing ──────────────────────
        const disease  = toAIKey(normaliseDisease(record.disease));
        const symptoms = normaliseSymptoms(record.symptoms || []).map(s => toAIKey(s));
        const province = toAIKey(normaliseProvince(record.province || "Unknown"));
        const month    = new Date(record.visitDate).getMonth();
        const year     = new Date(record.visitDate).getFullYear();
        const vitals   = record.vitalSigns || {};
        
        // Initialize disease pattern if not exists
        if (!this.diseasePatterns.has(disease)) {
            this.diseasePatterns.set(disease, {
                count: 0,
                symptoms: new Map(),
                provinces: new Map(),
                monthlyTrend: new Array(12).fill(0),
                yearlyTrend: new Map(),
                ageGroups: { child: 0, adult: 0, elderly: 0 },
                genderStats: { Male: 0, Female: 0, Other: 0 },
                riskFactors: new Map(),
                outcomes: { recovered: 0, admitted: 0, referred: 0, deceased: 0 },
                lastSeen: null,
                avgAge: 0,
                ageSum: 0,
                ageCount: 0,
                vitalSignsAverages: {
                    temperature: { sum: 0, count: 0, avg: null },
                    heartRate: { sum: 0, count: 0, avg: null },
                    systolicBP: { sum: 0, count: 0, avg: null },
                    diastolicBP: { sum: 0, count: 0, avg: null },
                    oxygenSaturation: { sum: 0, count: 0, avg: null },
                    respiratoryRate: { sum: 0, count: 0, avg: null }
                },
                chronicConditions: new Map(),
                familyHistory: new Map(),
                // Not pre-trained — pure real-data entry
                isPretrained: false,
                realCount: 0,
                pretrainedCount: 0
            });
        }
        
        const pattern = this.diseasePatterns.get(disease);
        pattern.count++;
        pattern.realCount = (pattern.realCount || 0) + 1;
        pattern.lastSeen = new Date();
        
        // Update symptoms
        symptoms.forEach(symptom => {
            if (symptom) {
                // Add to global unique symptoms set
                this.uniqueSymptoms.add(symptom);
                
                const current = pattern.symptoms.get(symptom) || 0;
                pattern.symptoms.set(symptom, current + 1);
            }
        });
        
        // Update province
        const provinceCurrent = pattern.provinces.get(province) || 0;
        pattern.provinces.set(province, provinceCurrent + 1);
        
        // Update monthly trend
        if (month >= 0 && month < 12) {
            pattern.monthlyTrend[month]++;
        }
        
        // Update yearly trend
        const yearKey = year.toString();
        const yearCurrent = pattern.yearlyTrend.get(yearKey) || 0;
        pattern.yearlyTrend.set(yearKey, yearCurrent + 1);
        
        // Update vital signs averages
        // ── Weighted merge strategy ────────────────────────────────────────
        // When a disease has a pre-trained baseline, real vital sign readings
        // are accumulated into the same running totals. Because the pre-trained
        // sums were seeded at (avg * PRETRAIN_WEIGHT), each new real reading
        // naturally dilutes the baseline towards local ground-truth values.
        // No special logic is needed — the standard running average handles it.
        if (vitals.temperature && typeof vitals.temperature === 'number') {
            pattern.vitalSignsAverages.temperature.sum += vitals.temperature;
            pattern.vitalSignsAverages.temperature.count++;
            pattern.vitalSignsAverages.temperature.avg = 
                this.safeAverage(pattern.vitalSignsAverages.temperature.sum, pattern.vitalSignsAverages.temperature.count);
        }
        if (vitals.heartRate && typeof vitals.heartRate === 'number') {
            pattern.vitalSignsAverages.heartRate.sum += vitals.heartRate;
            pattern.vitalSignsAverages.heartRate.count++;
            pattern.vitalSignsAverages.heartRate.avg = 
                this.safeAverage(pattern.vitalSignsAverages.heartRate.sum, pattern.vitalSignsAverages.heartRate.count);
        }
        if (vitals.bloodPressure?.systolic && typeof vitals.bloodPressure.systolic === 'number') {
            pattern.vitalSignsAverages.systolicBP.sum += vitals.bloodPressure.systolic;
            pattern.vitalSignsAverages.systolicBP.count++;
            pattern.vitalSignsAverages.systolicBP.avg = 
                this.safeAverage(pattern.vitalSignsAverages.systolicBP.sum, pattern.vitalSignsAverages.systolicBP.count);
        }
        if (vitals.bloodPressure?.diastolic && typeof vitals.bloodPressure.diastolic === 'number') {
            pattern.vitalSignsAverages.diastolicBP.sum += vitals.bloodPressure.diastolic;
            pattern.vitalSignsAverages.diastolicBP.count++;
            pattern.vitalSignsAverages.diastolicBP.avg = 
                this.safeAverage(pattern.vitalSignsAverages.diastolicBP.sum, pattern.vitalSignsAverages.diastolicBP.count);
        }
        if (vitals.oxygenSaturation && typeof vitals.oxygenSaturation === 'number') {
            pattern.vitalSignsAverages.oxygenSaturation.sum += vitals.oxygenSaturation;
            pattern.vitalSignsAverages.oxygenSaturation.count++;
            pattern.vitalSignsAverages.oxygenSaturation.avg = 
                this.safeAverage(pattern.vitalSignsAverages.oxygenSaturation.sum, pattern.vitalSignsAverages.oxygenSaturation.count);
        }
        if (vitals.respiratoryRate && typeof vitals.respiratoryRate === 'number') {
            pattern.vitalSignsAverages.respiratoryRate.sum += vitals.respiratoryRate;
            pattern.vitalSignsAverages.respiratoryRate.count++;
            pattern.vitalSignsAverages.respiratoryRate.avg = 
                this.safeAverage(pattern.vitalSignsAverages.respiratoryRate.sum, pattern.vitalSignsAverages.respiratoryRate.count);
        }
        
        // Update patient demographics if available
        if (patientProfile) {
            const age = patientProfile.age || this.calculateAge(patientProfile.dateOfBirth);
            const gender = patientProfile.gender;
            
            if (age !== null && typeof age === 'number') {
                pattern.ageSum += age;
                pattern.ageCount++;
                pattern.avgAge = pattern.ageSum / pattern.ageCount;
                
                if (age < 18) pattern.ageGroups.child++;
                else if (age < 65) pattern.ageGroups.adult++;
                else pattern.ageGroups.elderly++;
            }
            
            if (gender && (gender === 'Male' || gender === 'Female' || gender === 'Other')) {
                pattern.genderStats[gender]++;
            }
            
            // Update risk factors
            if (patientProfile.clinicalProfile?.riskFactors) {
                patientProfile.clinicalProfile.riskFactors.forEach(rf => {
                    if (rf && rf.factor) {
                        const current = pattern.riskFactors.get(rf.factor) || 0;
                        pattern.riskFactors.set(rf.factor, current + 1);
                    }
                });
            }
            
            // Update chronic conditions
            if (patientProfile.clinicalProfile?.chronicConditions) {
                patientProfile.clinicalProfile.chronicConditions.forEach(condition => {
                    if (condition && condition.condition) {
                        const conditionName = toAIKey(normaliseCondition(condition.condition));
                        const current = pattern.chronicConditions.get(conditionName) || 0;
                        pattern.chronicConditions.set(conditionName, current + 1);
                        
                        if (!this.chronicConditionCorrelations.has(conditionName)) {
                            this.chronicConditionCorrelations.set(conditionName, new Map());
                        }
                        const conditionMap = this.chronicConditionCorrelations.get(conditionName);
                        const diseaseCurrent = conditionMap.get(disease) || 0;
                        conditionMap.set(disease, diseaseCurrent + 1);
                    }
                });
            }
            
            // Update family history
            const familyHistory = patientProfile.clinicalProfile?.familyHistory;
            if (familyHistory) {
                const allFamilyConditions = [
                    ...(familyHistory.mother || []),
                    ...(familyHistory.father || []),
                    ...(familyHistory.siblings || [])
                ].filter(c => c);
                
                allFamilyConditions.forEach(condition => {
                    const normCondition = toAIKey(normaliseCondition(condition));
                    const current = pattern.familyHistory.get(normCondition) || 0;
                    pattern.familyHistory.set(normCondition, current + 1);
                    
                    if (!this.familyHistoryCorrelations.has(normCondition)) {
                        this.familyHistoryCorrelations.set(normCondition, new Map());
                    }
                    const familyMap = this.familyHistoryCorrelations.get(normCondition);
                    const diseaseCurrent = familyMap.get(disease) || 0;
                    familyMap.set(disease, diseaseCurrent + 1);
                });
            }
        }
        
        // Update outcome
        if (record.disposition) {
            const outcome = record.disposition.toLowerCase();
            if (outcome === "discharged") pattern.outcomes.recovered++;
            else if (outcome === "admitted") pattern.outcomes.admitted++;
            else if (outcome === "referred") pattern.outcomes.referred++;
            else if (outcome === "deceased") pattern.outcomes.deceased++;
        }
        
        // Update province statistics
        if (!this.provinceStats.has(province)) {
            this.provinceStats.set(province, {
                total: 0,
                diseases: new Map(),
                monthlyTrend: new Array(12).fill(0),
                ageGroups: { child: 0, adult: 0, elderly: 0 },
                riskFactors: new Map(),
                vitalSignsAverages: {
                    temperature: { sum: 0, count: 0, avg: null },
                    heartRate: { sum: 0, count: 0, avg: null },
                    systolicBP: { sum: 0, count: 0, avg: null },
                    diastolicBP: { sum: 0, count: 0, avg: null }
                }
            });
        }
        
        const provStat = this.provinceStats.get(province);
        provStat.total++;
        const diseaseCurrent = provStat.diseases.get(disease) || 0;
        provStat.diseases.set(disease, diseaseCurrent + 1);
        
        if (month >= 0 && month < 12) {
            provStat.monthlyTrend[month]++;
        }
        
        if (vitals.temperature && typeof vitals.temperature === 'number') {
            provStat.vitalSignsAverages.temperature.sum += vitals.temperature;
            provStat.vitalSignsAverages.temperature.count++;
            provStat.vitalSignsAverages.temperature.avg = 
                this.safeAverage(provStat.vitalSignsAverages.temperature.sum, provStat.vitalSignsAverages.temperature.count);
        }
        
        if (patientProfile) {
            const age = patientProfile.age || this.calculateAge(patientProfile.dateOfBirth);
            if (age !== null && typeof age === 'number') {
                if (age < 18) provStat.ageGroups.child++;
                else if (age < 65) provStat.ageGroups.adult++;
                else provStat.ageGroups.elderly++;
            }
        }
        
        // Update symptom correlations
        for (let i = 0; i < symptoms.length; i++) {
            for (let j = i + 1; j < symptoms.length; j++) {
                const s1 = symptoms[i];
                const s2 = symptoms[j];
                if (!s1 || !s2) continue;
                const key = [s1, s2].sort().join('|');
                
                if (!this.symptomCorrelations.has(key)) {
                    this.symptomCorrelations.set(key, {
                        count: 0,
                        diseases: new Map(),
                        severity: 0
                    });
                }
                
                const corr = this.symptomCorrelations.get(key);
                corr.count++;
                const corrDiseaseCurrent = corr.diseases.get(disease) || 0;
                corr.diseases.set(disease, corrDiseaseCurrent + 1);
            }
        }
        
        this.totalRecords++;
        this.lastUpdated = new Date();
        
        // Invalidate patient cache
        this.patientCache.clear();
        
        return {
            disease,
            totalCases: pattern.count
        };
    }

    // Process multiple records
    processBatch(records) {
        if (!records || records.length === 0) {
            console.log("⚠️ No records to process");
            return this.getStats();
        }
        
        console.log(`📚 AI learning from ${records.length} records...`);
        
        let processed = 0;
        for (const record of records) {
            if (record && record.disease) {
                // If the record has a populated patientId, use it as the profile
                const profile = record.patientId && typeof record.patientId === 'object' ? record.patientId : null;
                this.processNewRecord(record, profile);
                processed++;
            }
        }
        
        console.log(`✅ Processed ${processed} valid records`);
        return this.getStats();
    }

    // ============ DISEASE PREDICTION ============

    predictDisease(symptoms, province, month, patientAge = null, patientGender = null, 
                    patientRiskFactors = [], patientVitals = {}, patientChronicConditions = [], 
                    patientFamilyHistory = {}) {
        
        const predictions = [];
        
        // ── Normalise all inputs before matching ──────────────────────────
        const validSymptoms = normaliseSymptoms(symptoms || []).map(s => toAIKey(s));
        const validProvince = toAIKey(normaliseProvince(province || "Harare"));
        const validMonth    = (typeof month === 'number' && month >= 0 && month < 12) ? month : new Date().getMonth();
        const normConditions = (patientChronicConditions || []).map(c => toAIKey(normaliseCondition(c)));
        const normFamilyAll  = [
            ...(patientFamilyHistory?.mother   || []),
            ...(patientFamilyHistory?.father   || []),
            ...(patientFamilyHistory?.siblings || [])
        ].filter(c => c).map(c => toAIKey(normaliseCondition(c)));
        
        this.diseasePatterns.forEach((pattern, disease) => {
            if (pattern.count === 0) return;
            
            let totalScore = 0;
            let totalPossibleScore = 0;
            let reasons = [];
            
            // 1. Symptom matching (25% weight)
            const symptomWeight = 25;
            let symptomScore = 0;
            if (validSymptoms.length > 0) {
                validSymptoms.forEach(symptom => {
                    const symptomCount = pattern.symptoms.get(symptom) || 0;
                    if (symptomCount > 0) {
                        const contribution = this.safePercentage(symptomCount, pattern.count, symptomWeight / validSymptoms.length);
                        symptomScore += contribution;
                        reasons.push(`${symptom} shows strong clinical correlation (${Math.round(contribution)}% weight)`);
                    }
                });
                symptomScore = Math.min(symptomScore, symptomWeight);
                totalScore += symptomScore;
            }
            totalPossibleScore += symptomWeight;
            
            // 2. Province prevalence (15% weight)
            const provinceWeight = 15;
            const provinceCount = pattern.provinces.get(validProvince) || 0;
            let provinceScore = 0;
            if (provinceCount > 0) {
                provinceScore = this.safePercentage(provinceCount, pattern.count, provinceWeight);
                totalScore += provinceScore;
                reasons.push(`Regional epidemiological prevalence in ${validProvince} (${Math.round(provinceScore)}%)`);
            }
            totalPossibleScore += provinceWeight;
            
            // 3. Seasonal pattern (10% weight)
            const seasonalWeight = 10;
            const monthCount = pattern.monthlyTrend[validMonth] || 0;
            let seasonalScore = 0;
            if (monthCount > 0) {
                const monthlyTotal = pattern.monthlyTrend.reduce((a, b) => a + b, 0);
                if (monthlyTotal > 0) {
                    seasonalScore = Math.min((monthCount / monthlyTotal) * seasonalWeight, seasonalWeight);
                    totalScore += seasonalScore;
                    reasons.push(`Alignment with historical seasonal transmission cycles (${Math.round(seasonalScore)}%)`);
                }
            }
            totalPossibleScore += seasonalWeight;
            
            // 4. Age group matching (8% weight)
            const ageWeight = 8;
            let ageScore = 0;
            if (patientAge !== null && typeof patientAge === 'number') {
                let ageGroup = "adult";
                if (patientAge < 18) ageGroup = "child";
                if (patientAge > 64) ageGroup = "elderly";
                
                const ageGroupCount = pattern.ageGroups[ageGroup] || 0;
                ageScore = this.safePercentage(ageGroupCount, pattern.count, ageWeight);
                totalScore += ageScore;
                reasons.push(`Demographic susceptibility: ${ageGroup} cohort (${Math.round(ageScore)}%)`);
            }
            totalPossibleScore += ageWeight;
            
            // 5. Gender matching (4% weight)
            const genderWeight = 4;
            let genderScore = 0;
            if (patientGender && (patientGender === 'Male' || patientGender === 'Female')) {
                const genderCount = pattern.genderStats[patientGender] || 0;
                genderScore = this.safePercentage(genderCount, pattern.count, genderWeight);
                totalScore += genderScore;
                reasons.push(`Biological gender correlation: ${patientGender} (${Math.round(genderScore)}%)`);
            }
            totalPossibleScore += genderWeight;
            
            // 6. Risk factor correlation (10% weight)
            const riskWeight = 10;
            let riskScore = 0;
            if (patientRiskFactors && patientRiskFactors.length > 0) {
                patientRiskFactors.forEach(rf => {
                    if (rf) {
                        const rfCount = pattern.riskFactors.get(rf) || 0;
                        riskScore += this.safePercentage(rfCount, pattern.count, riskWeight / patientRiskFactors.length);
                    }
                });
                riskScore = Math.min(riskScore, riskWeight);
                totalScore += riskScore;
                if (riskScore > 0) reasons.push(`Specific clinical risk factor alignment (${Math.round(riskScore)}%)`);
            }
            totalPossibleScore += riskWeight;
            
            // 7. Vital signs matching (12% weight)
            const vitalsWeight = 12;
            let vitalsScore = 0;
            let vitalsMatched = 0;
            
            if (patientVitals && pattern.vitalSignsAverages.temperature.avg && patientVitals.temperature) {
                const tempDiff = Math.abs(patientVitals.temperature - pattern.vitalSignsAverages.temperature.avg);
                const tempMatch = Math.max(0, 100 - (tempDiff * 10)) / 100;
                vitalsScore += tempMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (tempMatch > 0.5) reasons.push(`Homeostatic deviation: Temperature match (${Math.round(tempMatch * 100)}%)`);
            }
            
            if (patientVitals && pattern.vitalSignsAverages.heartRate.avg && patientVitals.heartRate) {
                const hrDiff = Math.abs(patientVitals.heartRate - pattern.vitalSignsAverages.heartRate.avg);
                const hrMatch = Math.max(0, 100 - (hrDiff * 5)) / 100;
                vitalsScore += hrMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (hrMatch > 0.5) reasons.push(`Cardiovascular pattern: Heart rate match (${Math.round(hrMatch * 100)}%)`);
            }
            
            if (patientVitals && pattern.vitalSignsAverages.systolicBP.avg && patientVitals.systolicBP) {
                const bpDiff = Math.abs(patientVitals.systolicBP - pattern.vitalSignsAverages.systolicBP.avg);
                const bpMatch = Math.max(0, 100 - (bpDiff * 3)) / 100;
                vitalsScore += bpMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (bpMatch > 0.5) reasons.push(`Hemodynamic pattern: Blood pressure match (${Math.round(bpMatch * 100)}%)`);
            }
            
            if (patientVitals && pattern.vitalSignsAverages.oxygenSaturation.avg && patientVitals.oxygenSaturation) {
                const o2Diff = Math.abs(patientVitals.oxygenSaturation - pattern.vitalSignsAverages.oxygenSaturation.avg);
                const o2Match = Math.max(0, 100 - (o2Diff * 20)) / 100;
                vitalsScore += o2Match * (vitalsWeight / 5);
                vitalsMatched++;
                if (o2Match > 0.5) reasons.push(`Respiratory pattern: O₂ saturation match (${Math.round(o2Match * 100)}%)`);
            }
            
            if (patientVitals && pattern.vitalSignsAverages.respiratoryRate?.avg && patientVitals.respiratoryRate) {
                const rrDiff = Math.abs(patientVitals.respiratoryRate - pattern.vitalSignsAverages.respiratoryRate.avg);
                const rrMatch = Math.max(0, 100 - (rrDiff * 10)) / 100;
                vitalsScore += rrMatch * (vitalsWeight / 5);
                vitalsMatched++;
                if (rrMatch > 0.5) reasons.push(`Ventilatory pattern: Respiratory rate match (${Math.round(rrMatch * 100)}%)`);
            }
            
            vitalsScore = Math.min(vitalsScore, vitalsWeight);
            totalScore += vitalsScore;
            totalPossibleScore += vitalsWeight;
            
            // 8. Chronic conditions correlation (8% weight)
            const chronicWeight = 8;
            let chronicScore = 0;
            if (normConditions && normConditions.length > 0) {
                normConditions.forEach(condition => {
                    if (condition) {
                        const conditionCount = pattern.chronicConditions.get(condition) || 0;
                        chronicScore += this.safePercentage(conditionCount, pattern.count, chronicWeight / normConditions.length);
                        if (conditionCount > 0) {
                            reasons.push(`Medical history: ${condition} co-morbidity (${Math.round((conditionCount / pattern.count) * 100)}% correlation)`);
                        }
                    }
                });
                chronicScore = Math.min(chronicScore, chronicWeight);
                totalScore += chronicScore;
            }
            totalPossibleScore += chronicWeight;
            
            // 9. Family history correlation (8% weight)
            const familyWeight = 8;
            let familyScore = 0;
            if (normFamilyAll.length > 0) {
                normFamilyAll.forEach(condition => {
                    const familyCount = pattern.familyHistory.get(condition) || 0;
                    familyScore += this.safePercentage(familyCount, pattern.count, familyWeight / normFamilyAll.length);
                    if (familyCount > 0) {
                        reasons.push(`Hereditary risk: Family history of ${condition} (${Math.round((familyCount / pattern.count) * 100)}% correlation)`);
                    }
                });
                familyScore = Math.min(familyScore, familyWeight);
                totalScore += familyScore;
            }
            totalPossibleScore += familyWeight;
            
            // Calculate final confidence
            let confidence = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;
            confidence = Math.min(Math.max(0, confidence), 100);
            
            // APPLY CONFIDENCE CALIBRATION
            confidence = this.calibrateConfidence(confidence, disease, pattern.count);
            
            if (confidence > this.minimumConfidence) {
                const realCount       = pattern.realCount       || 0;
                const pretrainedCount = pattern.pretrainedCount || 0;

                predictions.push({
                    disease,
                    confidence: Math.round(confidence * 10) / 10,
                    probability: confidence / 100,
                    reasons: reasons.slice(0, 6),
                    totalCases: pattern.count,
                    ageDistribution: pattern.ageGroups,
                    outcomeRates: {
                        recoveryRate: Math.min(100, Math.round((pattern.outcomes.recovered / pattern.count) * 100)),
                        admissionRate: Math.min(100, Math.round((pattern.outcomes.admitted / pattern.count) * 100)),
                        mortalityRate: Math.min(100, Math.round((pattern.outcomes.deceased / pattern.count) * 100))
                    },
                    expectedVitalSigns: {
                        temperature: pattern.vitalSignsAverages.temperature.avg,
                        heartRate: pattern.vitalSignsAverages.heartRate.avg,
                        bloodPressure: {
                            systolic: pattern.vitalSignsAverages.systolicBP.avg,
                            diastolic: pattern.vitalSignsAverages.diastolicBP.avg
                        },
                        oxygenSaturation: pattern.vitalSignsAverages.oxygenSaturation.avg,
                        respiratoryRate: pattern.vitalSignsAverages.respiratoryRate.avg
                    },
                    commonChronicConditions: Array.from(pattern.chronicConditions.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([condition, count]) => ({ 
                            condition, 
                            prevalence: Math.min(100, Math.round((count / pattern.count) * 100))
                        })),
                    lastSeen: pattern.lastSeen,

                    // ── Data source transparency ───────────────────────────────
                    // Tells the frontend (and clinicians) how much of this
                    // prediction is grounded in local real-world data vs the
                    // pre-trained EDLIZ baseline.
                    dataSource: {
                        pretrainedRecords: pretrainedCount,
                        realRecords:       realCount,
                        totalWeight:       pattern.count,
                        isPrimarilyReal:   realCount > pretrainedCount,
                        realDataPercent:   pattern.count > 0
                            ? Math.round((realCount / pattern.count) * 100)
                            : 0,
                        // Clinical metadata from EDLIZ pretraining (null if not pre-trained)
                        edlizTreatment: pattern.edlizTreatment  || null,
                        icd11Code:      pattern.icd11Code        || null,
                        severity:       pattern.severity         || null,
                        transmission:   pattern.transmission     || null,
                        vitalRanges:    pattern.vitalRanges      || null
                    },

                    // ── Clinical protocol recommendations ──────────────────────
                    // These come EXCLUSIVELY from the pre-trained EDLIZ knowledge
                    // base (trainer2.json). They are fixed clinical facts and are
                    // NEVER derived from or filtered by medical records — so they
                    // are always present and always accurate, even on day one.
                    treatmentRecommendations:  pattern.clinicalProtocols?.treatmentLines  || [],
                    preventiveRecommendations: pattern.clinicalProtocols?.preventionLines || [],
                    outbreakStatus:            pattern.outbreakStatus || null,

                    // Structured raw protocols for detail panels / PDF export
                    treatmentProtocols:  pattern.clinicalProtocols?.treatmentProtocols  || null,
                    preventiveProtocols: pattern.clinicalProtocols?.preventiveProtocols || null
                });
            }
        });
        
        predictions.sort((a, b) => b.confidence - a.confidence);
        
        return {
            predictions: predictions.slice(0, 5),
            basedOnRecords: this.totalRecords,
            lastUpdated: this.lastUpdated,
            enhancedWith: ["Pre-trained EDLIZ Baseline", "Vital Signs", "Chronic Conditions", "Family History", "Confidence Calibration"],
            calibrationMetrics: {
                totalPredictions: this.totalPredictions,
                correctPredictions: this.correctPredictions,
                overallAccuracy: this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions) * 100 : null
            }
        };
    }

    // ============ RISK ASSESSMENT ============

    assessPatientRisk(patientProfile, medicalRecords) {
        const riskFactors = [];
        let riskScore = 0;
        let recommendations = [];
        
        // 1. AGE FACTOR (max 20)
        const age = patientProfile?.age;
        if (age !== null && typeof age === 'number') {
            if (age > 65) {
                riskScore += 20;
                riskFactors.push(`Geriatric age group (Age: ${age}) increases clinical risk complexity (+20)`);
                recommendations.push("Prioritize comprehensive geriatric assessment and multi-morbidity screening");
            } else if (age < 5) {
                riskScore += 15;
                riskFactors.push(`Pediatric age group (Age: ${age}) indicates heightened physiological vulnerability (+15)`);
                recommendations.push("Urgent pediatric specialist evaluation for age-specific clinical manifestations");
            } else if (age > 50) {
                riskScore += 8;
                riskFactors.push(`Advancing age (Age: ${age}) correlates with increased risk of chronic pathology (+8)`);
            }
        }
        
        // 2. CHRONIC CONDITIONS (max 50)
        const chronicConditions = patientProfile?.clinicalProfile?.chronicConditions || [];
        chronicConditions.forEach(condition => {
            let conditionScore = 15;
            if (condition.severity === "Severe") conditionScore += 10;
            if (condition.severity === "Critical") conditionScore += 20;
            if (condition.status !== "Controlled") conditionScore += 5;
            
            riskScore = Math.min(riskScore + conditionScore, 100);
            riskFactors.push(`Comorbidity: ${condition.condition} (${condition.status}, ${condition.severity} severity) (+${conditionScore})`);
            recommendations.push(`Strict monitoring and management protocol for ${condition.condition}`);
        });
        
        // 3. FAMILY HISTORY (max 25)
        const familyHistory = patientProfile?.clinicalProfile?.familyHistory || {};
        const allFamilyConditions = [
            ...(familyHistory.mother || []),
            ...(familyHistory.father || []),
            ...(familyHistory.siblings || [])
        ].filter(c => c);
        
        if (allFamilyConditions.length > 0) {
            const familyRisk = Math.min(allFamilyConditions.length * 5, 25);
            riskScore = Math.min(riskScore + familyRisk, 100);
            riskFactors.push(`Genetic predisposition: Family history of ${allFamilyConditions.join(", ")} (+${familyRisk})`);
            recommendations.push("Consider genetic counseling and targeted screening for hereditary conditions");
        }
        
        // 4. VITAL SIGNS ABNORMALITIES (max 40)
        const vitals = patientProfile?.clinicalProfile?.vitalSigns;
        if (vitals) {
            if (vitals.bmi) {
                if (vitals.bmi > 30) {
                    riskScore = Math.min(riskScore + 10, 100);
                    riskFactors.push(`Metabolic risk: Obesity (BMI: ${vitals.bmi}) (+10)`);
                    recommendations.push("Nutritional counseling and metabolic risk factor assessment");
                } else if (vitals.bmi < 18.5) {
                    riskScore = Math.min(riskScore + 8, 100);
                    riskFactors.push(`Nutritional risk: Underweight (BMI: ${vitals.bmi}) (+8)`);
                    recommendations.push("Nutritional support and investigation of underlying causes");
                }
            }
            if (vitals.bloodPressure) {
                const { systolic, diastolic } = vitals.bloodPressure;
                if (systolic > 140 || diastolic > 90) {
                    riskScore = Math.min(riskScore + 12, 100);
                    riskFactors.push(`Cardiovascular risk: Hypertension (${systolic}/${diastolic} mmHg) (+12)`);
                    recommendations.push("Serial blood pressure monitoring and antihypertensive evaluation");
                }
            }
            if (vitals.heartRate && (vitals.heartRate > 100 || vitals.heartRate < 60)) {
                riskScore = Math.min(riskScore + 6, 100);
                riskFactors.push(`Abnormal heart rate (${vitals.heartRate}) +6`);
            }
            if (vitals.oxygenSaturation && vitals.oxygenSaturation < 95) {
                riskScore = Math.min(riskScore + 15, 100);
                riskFactors.push(`Low oxygen saturation (${vitals.oxygenSaturation}%) +15`);
                recommendations.push("Respiratory assessment needed");
            }
        }
        
        // 5. PREGNANCY (max 35)
        if (patientProfile?.pregnancyInfo?.isPregnant) {
            riskScore = Math.min(riskScore + 20, 100);
            riskFactors.push(`Pregnancy +20`);
            recommendations.push("Antenatal care follow-up");
            if (patientProfile.pregnancyInfo.highRisk) {
                riskScore = Math.min(riskScore + 15, 100);
                riskFactors.push(`High-risk pregnancy +15`);
                recommendations.push("High-risk obstetrics consultation");
            }
        }
        
        // 6. VISIT FREQUENCY (max 15)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recentVisits = (medicalRecords || []).filter(r => r && new Date(r.visitDate) > threeMonthsAgo);
        
        if (recentVisits.length > 5) {
            riskScore = Math.min(riskScore + 15, 100);
            riskFactors.push(`Very frequent visits (${recentVisits.length} in 3 months) +15`);
            recommendations.push("Case management review");
        } else if (recentVisits.length > 3) {
            riskScore = Math.min(riskScore + 8, 100);
            riskFactors.push(`Frequent visits (${recentVisits.length} in 3 months) +8`);
        }
        
        // Final risk level
        let riskLevel = "LOW";
        if (riskScore >= 100) riskLevel = "CRITICAL";
        else if (riskScore >= 70) riskLevel = "HIGH";
        else if (riskScore >= 40) riskLevel = "MODERATE";
        
        return {
            riskScore: Math.min(riskScore, 100),
            riskLevel,
            riskFactors: riskFactors.slice(0, 10),
            recommendations: recommendations.slice(0, 6),
            chronicConditionsCount: chronicConditions.length,
            familyHistoryCount: allFamilyConditions.length,
            recentVisitsCount: recentVisits.length,
            lastVisit: medicalRecords && medicalRecords[0]?.visitDate || null,
            lastVitals: vitals || null,
            enhancedAnalysis: true
        };
    }

    // ============ OUTBREAK DETECTION ============

    detectOutbreaks() {
        const alerts = [];
        
        this.provinceStats.forEach((stats, province) => {
            const recentWeek = stats.monthlyTrend.slice(-1)[0] || 0;
            const previousWeek = stats.monthlyTrend.slice(-2, -1)[0] || 0;
            
            if (previousWeek > 0) {
                let increase = ((recentWeek - previousWeek) / previousWeek) * 100;
                increase = Math.min(Math.max(0, increase), 100);
                
                if (increase > 50) {
                    let topDisease = null;
                    let maxCount = 0;
                    stats.diseases.forEach((count, disease) => {
                        if (count > maxCount) {
                            maxCount = count;
                            topDisease = disease;
                        }
                    });
                    
                    const diseasePattern = this.diseasePatterns.get(topDisease);
                    let mortalityRate = diseasePattern ? 
                        (diseasePattern.outcomes.deceased / diseasePattern.count) * 100 : 0;
                    mortalityRate = Math.min(mortalityRate, 100);
                    
                    alerts.push({
                        province,
                        disease: topDisease,
                        type: "OUTBREAK",
                        message: `⚠️ ${topDisease} cases increased by ${Math.round(increase)}% in ${province}`,
                        severity: increase > 100 ? "CRITICAL" : "HIGH",
                        recentCases: Math.round(recentWeek),
                        previousCases: Math.round(previousWeek),
                        mortalityRate: Math.round(mortalityRate),
                        timestamp: new Date(),
                        affectedAgeGroups: stats.ageGroups
                    });
                }
            }
            
            // Check for emerging diseases
            stats.diseases.forEach((count, disease) => {
                const pattern = this.diseasePatterns.get(disease);
                if (pattern && pattern.count < 30 && count > 3) {
                    alerts.push({
                        province,
                        disease,
                        type: "EMERGING",
                        message: `🆕 Emerging: ${disease} in ${province} (${count} new cases)`,
                        severity: "MEDIUM",
                        cases: count,
                        timestamp: new Date()
                    });
                }
            });
        });
        
        return alerts;
    }

    // ============ STATISTICS ============

    getStats() {
        const pretrainedDiseases = Array.from(this.diseasePatterns.values())
            .filter(p => p.isPretrained).length;
        const pureRealDiseases = Array.from(this.diseasePatterns.values())
            .filter(p => !p.isPretrained).length;

        return {
            totalRecords: this.totalRecords,
            diseasesTracked: this.diseasePatterns.size,
            pretrainedDiseases,
            pureRealDiseases,
            provincesTracked: this.provinceStats.size,
            symptomCorrelations: this.symptomCorrelations.size,
            chronicConditionCorrelations: this.chronicConditionCorrelations.size,
            familyHistoryCorrelations: this.familyHistoryCorrelations.size,
            lastUpdated: this.lastUpdated,
            predictionAccuracy: {
                totalPredictions: this.totalPredictions,
                correctPredictions: this.correctPredictions,
                overallAccuracy: this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions) * 100 : null,
                perDisease: Array.from(this.predictionAccuracy.entries()).map(([disease, stats]) => ({
                    disease,
                    correct: stats.correct,
                    total: stats.total,
                    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
                }))
            },
            topDiseases: Array.from(this.diseasePatterns.entries())
                .map(([disease, data]) => ({
                    disease,
                    cases: data.count,
                    realCases: data.realCount || 0,
                    isPretrained: data.isPretrained || false,
                    recoveryRate: data.count > 0 ? Math.min(100, Math.round((data.outcomes.recovered / data.count) * 100)) : 0,
                    mortalityRate: data.count > 0 ? Math.min(100, Math.round((data.outcomes.deceased / data.count) * 100)) : 0,
                    mostAffectedAgeGroup: Object.entries(data.ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0],
                    avgTemperature: data.vitalSignsAverages.temperature.avg,
                    avgHeartRate: data.vitalSignsAverages.heartRate.avg,
                    lastSeen: data.lastSeen
                }))
                .sort((a, b) => b.cases - a.cases)
                .slice(0, 10),
            highRiskProvinces: Array.from(this.provinceStats.entries())
                .filter(([_, data]) => data.total > 100)
                .map(([province, data]) => ({
                    province,
                    totalCases: data.total,
                    elderlyProportion: data.ageGroups.elderly / data.total,
                    avgTemperature: data.vitalSignsAverages.temperature.avg
                }))
                .sort((a, b) => b.elderlyProportion - a.elderlyProportion)
        };
    }

    // Get disease-specific vital signs expectations
    getExpectedVitalSigns(disease) {
        const pattern = this.diseasePatterns.get(disease);
        if (!pattern) return null;
        
        return {
            disease,
            temperature: pattern.vitalSignsAverages.temperature.avg,
            heartRate: pattern.vitalSignsAverages.heartRate.avg,
            bloodPressure: {
                systolic: pattern.vitalSignsAverages.systolicBP.avg,
                diastolic: pattern.vitalSignsAverages.diastolicBP.avg
            },
            oxygenSaturation: pattern.vitalSignsAverages.oxygenSaturation.avg,
            respiratoryRate: pattern.vitalSignsAverages.respiratoryRate.avg,
            sampleSize: pattern.vitalSignsAverages.temperature.count
        };
    }

    // Get chronic conditions that commonly lead to this disease
    getCommonPrecedingConditions(disease) {
        const pattern = this.diseasePatterns.get(disease);
        if (!pattern) return [];
        
        return Array.from(pattern.chronicConditions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([condition, count]) => ({
                condition,
                prevalence: Math.min(100, Math.round((count / pattern.count) * 100))
            }));
    }

    // Get all symptoms recorded in the system
    getAllSymptoms() {
        return Array.from(this.uniqueSymptoms).sort();
    }

    // Get prediction accuracy for a disease
    getPredictionAccuracy(disease) {
        const stats = this.predictionAccuracy.get(disease);
        if (!stats) return null;
        
        return {
            disease,
            correct: stats.correct,
            total: stats.total,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
            needsMoreData: stats.total < 30
        };
    }
}

module.exports = ContinuousLearner;