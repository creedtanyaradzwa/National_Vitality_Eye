// ai/continuousLearner.js - Enhanced with clinical data analysis

class ContinuousLearner {
    constructor() {
        this.diseasePatterns = new Map();
        this.symptomCorrelations = new Map();
        this.provinceStats = new Map();
        this.temporalPatterns = new Map();
        this.riskFactors = new Map();
        this.totalRecords = 0;
        this.lastUpdated = null;
        
        console.log("🤖 Enhanced Clinical AI initialized");
    }

    // Process a single new record (real-time update)
    processNewRecord(record, patientProfile = null) {
        console.log(`📊 AI processing new record: ${record.disease}`);
        
        const disease = record.disease;
        const symptoms = record.symptoms || [];
        const province = record.province;
        const month = new Date(record.visitDate).getMonth();
        const year = new Date(record.visitDate).getFullYear();
        
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
                ageCount: 0
            });
        }
        
        const pattern = this.diseasePatterns.get(disease);
        
        // Update disease statistics
        pattern.count++;
        pattern.lastSeen = new Date();
        
        // Update symptoms
        symptoms.forEach(symptom => {
            pattern.symptoms.set(symptom, (pattern.symptoms.get(symptom) || 0) + 1);
        });
        
        // Update province distribution
        pattern.provinces.set(province, (pattern.provinces.get(province) || 0) + 1);
        
        // Update monthly trend
        pattern.monthlyTrend[month]++;
        
        // Update yearly trend
        const yearKey = year.toString();
        pattern.yearlyTrend.set(yearKey, (pattern.yearlyTrend.get(yearKey) || 0) + 1);
        
        // Update age and gender if patient profile available
        if (patientProfile) {
            const age = patientProfile.age;
            const gender = patientProfile.gender;
            
            if (age !== null) {
                pattern.ageSum += age;
                pattern.ageCount++;
                pattern.avgAge = pattern.ageSum / pattern.ageCount;
                
                if (age < 18) pattern.ageGroups.child++;
                else if (age < 65) pattern.ageGroups.adult++;
                else pattern.ageGroups.elderly++;
            }
            
            if (gender) {
                pattern.genderStats[gender]++;
            }
            
            // Update risk factors from clinical profile
            if (patientProfile.clinicalProfile?.riskFactors) {
                patientProfile.clinicalProfile.riskFactors.forEach(rf => {
                    pattern.riskFactors.set(rf.factor, (pattern.riskFactors.get(rf.factor) || 0) + 1);
                });
            }
        }
        
        // Update outcome based on disposition
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
                riskFactors: new Map()
            });
        }
        
        const provStat = this.provinceStats.get(province);
        provStat.total++;
        provStat.diseases.set(disease, (provStat.diseases.get(disease) || 0) + 1);
        provStat.monthlyTrend[month]++;
        
        if (patientProfile) {
            const age = patientProfile.age;
            if (age !== null) {
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
                corr.diseases.set(disease, (corr.diseases.get(disease) || 0) + 1);
            }
        }
        
        // Update temporal patterns
        const dayOfWeek = new Date(record.visitDate).getDay();
        const hour = new Date(record.visitDate).getHours();
        
        const timeKey = `${dayOfWeek}-${hour}`;
        if (!this.temporalPatterns.has(timeKey)) {
            this.temporalPatterns.set(timeKey, {
                count: 0,
                diseases: new Map()
            });
        }
        
        const timeStat = this.temporalPatterns.get(timeKey);
        timeStat.count++;
        timeStat.diseases.set(disease, (timeStat.diseases.get(disease) || 0) + 1);
        
        // Update global stats
        this.totalRecords++;
        this.lastUpdated = new Date();
        
        return {
            disease,
            totalCases: pattern.count,
            provinceCases: pattern.provinces.get(province)
        };
    }

    // Process multiple records (for initial training)
    processBatch(records) {
        console.log(`📚 AI learning from ${records.length} records...`);
        
        records.forEach(record => {
            this.processNewRecord(record);
        });
        
        console.log(`✅ Batch learning complete - Total records: ${this.totalRecords}`);
        return this.getStats();
    }

    // Enhanced prediction with clinical factors
    predictDisease(symptoms, province, month, patientAge = null, patientGender = null, patientRiskFactors = []) {
        const predictions = [];
        
        this.diseasePatterns.forEach((pattern, disease) => {
            let score = 0;
            let maxPossibleScore = 0;
            let reasons = [];
            
            // Symptom matching (35% weight)
            symptoms.forEach(symptom => {
                const symptomCount = pattern.symptoms.get(symptom) || 0;
                if (symptomCount > 0) {
                    const confidence = (symptomCount / pattern.count) * 35;
                    score += confidence;
                    reasons.push(`${symptom} (${Math.round(confidence)}% match)`);
                }
                maxPossibleScore += 35 / symptoms.length;
            });
            
            // Province prevalence (20% weight)
            const provinceCount = pattern.provinces.get(province) || 0;
            if (provinceCount > 0) {
                const provinceConfidence = (provinceCount / pattern.count) * 20;
                score += provinceConfidence;
                reasons.push(`${province} prevalence (${Math.round(provinceConfidence)}%)`);
            }
            maxPossibleScore += 20;
            
            // Seasonal pattern (15% weight)
            const monthCount = pattern.monthlyTrend[month] || 0;
            if (monthCount > 0) {
                const monthlyTotal = pattern.monthlyTrend.reduce((a, b) => a + b, 0);
                const seasonalConfidence = monthlyTotal > 0 ? (monthCount / monthlyTotal) * 15 : 0;
                score += seasonalConfidence;
                reasons.push(`Seasonal pattern (${Math.round(seasonalConfidence)}%)`);
            }
            maxPossibleScore += 15;
            
            // Age group matching (10% weight)
            if (patientAge !== null) {
                let ageGroup = "adult";
                if (patientAge < 18) ageGroup = "child";
                if (patientAge > 64) ageGroup = "elderly";
                
                const ageGroupMatch = pattern.ageGroups[ageGroup] / pattern.count;
                const ageConfidence = ageGroupMatch * 10;
                score += ageConfidence;
                reasons.push(`Age group (${ageGroup} - ${Math.round(ageConfidence)}%)`);
                maxPossibleScore += 10;
            }
            
            // Gender matching (5% weight)
            if (patientGender) {
                const genderMatch = (pattern.genderStats[patientGender] || 0) / pattern.count;
                const genderConfidence = genderMatch * 5;
                score += genderConfidence;
                reasons.push(`Gender (${patientGender} - ${Math.round(genderConfidence)}%)`);
                maxPossibleScore += 5;
            }
            
            // Risk factor correlation (15% weight)
            if (patientRiskFactors.length > 0) {
                let riskFactorScore = 0;
                patientRiskFactors.forEach(rf => {
                    const rfCount = pattern.riskFactors.get(rf) || 0;
                    riskFactorScore += (rfCount / pattern.count) * 15;
                });
                riskFactorScore = Math.min(riskFactorScore, 15);
                score += riskFactorScore;
                reasons.push(`Risk factors (${Math.round(riskFactorScore)}%)`);
                maxPossibleScore += 15;
            }
            
            // Calculate confidence percentage
            let confidence = maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0;
            
            // 🔥 FIX: Cap confidence between 0 and 100
            confidence = Math.min(Math.max(confidence, 0), 100);
            
            if (confidence > 15) {
                predictions.push({
                    disease,
                    confidence: Math.round(confidence * 10) / 10,
                    probability: Math.round(confidence) / 100,
                    reasons: reasons.slice(0, 4),
                    totalCases: pattern.count,
                    ageDistribution: pattern.ageGroups,
                    outcomeRates: {
                        recoveryRate: Math.min(Math.round((pattern.outcomes.recovered / pattern.count) * 100), 100),
                        admissionRate: Math.min(Math.round((pattern.outcomes.admitted / pattern.count) * 100), 100),
                        mortalityRate: pattern.count > 0 ? Math.min(Math.round((pattern.outcomes.deceased / pattern.count) * 100), 100) : 0
                    },
                    lastSeen: pattern.lastSeen
                });
            }
        });
        
        // Sort by confidence
        predictions.sort((a, b) => b.confidence - a.confidence);
        
        return {
            predictions: predictions.slice(0, 5),
            basedOnRecords: this.totalRecords,
            lastUpdated: this.lastUpdated
        };
    }

    // Comprehensive risk assessment with clinical data
    assessPatientRisk(patientProfile, medicalRecords) {
        const riskFactors = [];
        let riskScore = 0;
        let recommendations = [];
        
        // 1. AGE FACTOR
        const age = patientProfile.age;
        if (age !== null) {
            if (age > 65) {
                riskScore += 25;
                riskFactors.push(`Elderly patient (${age} years) +25`);
                recommendations.push("Regular geriatric assessment");
            } else if (age < 5) {
                riskScore += 20;
                riskFactors.push(`Young child (${age} years) +20`);
                recommendations.push("Pediatric specialist review");
            } else if (age > 50) {
                riskScore += 10;
                riskFactors.push(`Middle age (${age} years) +10`);
            }
        }
        
        // 2. CHRONIC CONDITIONS (from clinical profile)
        const chronicConditions = patientProfile.clinicalProfile?.chronicConditions || [];
        chronicConditions.forEach(condition => {
            let conditionScore = 20;
            if (condition.severity === "Severe") conditionScore += 15;
            if (condition.severity === "Critical") conditionScore += 30;
            if (condition.status !== "Controlled") conditionScore += 10;
            
            riskScore += conditionScore;
            riskFactors.push(`${condition.condition} (${condition.status}, ${condition.severity}) +${conditionScore}`);
            
            recommendations.push(`Regular monitoring for ${condition.condition}`);
            if (condition.medications && condition.medications.length > 0) {
                recommendations.push(`Medication adherence review for ${condition.condition}`);
            }
        });
        
        // 3. ALLERGIES
        const allergies = patientProfile.clinicalProfile?.allergies || [];
        const severeAllergies = allergies.filter(a => a.severity === "Severe" || a.severity === "Life-Threatening");
        if (severeAllergies.length > 0) {
            riskScore += 15;
            riskFactors.push(`Severe allergies (${severeAllergies.map(a => a.allergen).join(", ")}) +15`);
            recommendations.push("Emergency protocol for severe allergies");
        }
        
        // 4. MEDICATIONS
        const currentMeds = patientProfile.clinicalProfile?.currentMedications || [];
        if (currentMeds.length > 5) {
            riskScore += 15;
            riskFactors.push(`Polypharmacy (${currentMeds.length} medications) +15`);
            recommendations.push("Medication review for potential interactions");
        } else if (currentMeds.length > 3) {
            riskScore += 8;
            riskFactors.push(`Multiple medications (${currentMeds.length}) +8`);
        }
        
        // 5. VITAL SIGNS ABNORMALITIES
        const vitals = patientProfile.clinicalProfile?.vitalSigns;
        if (vitals) {
            if (vitals.bmi) {
                if (vitals.bmi > 30) {
                    riskScore += 12;
                    riskFactors.push(`Obesity (BMI ${vitals.bmi}) +12`);
                    recommendations.push("Nutritional counseling");
                } else if (vitals.bmi < 18.5) {
                    riskScore += 10;
                    riskFactors.push(`Underweight (BMI ${vitals.bmi}) +10`);
                    recommendations.push("Nutritional support");
                }
            }
            if (vitals.bloodPressure) {
                const { systolic, diastolic } = vitals.bloodPressure;
                if (systolic > 140 || diastolic > 90) {
                    riskScore += 15;
                    riskFactors.push(`Hypertension (${systolic}/${diastolic}) +15`);
                    recommendations.push("Blood pressure monitoring");
                }
            }
            if (vitals.heartRate && (vitals.heartRate > 100 || vitals.heartRate < 60)) {
                riskScore += 8;
                riskFactors.push(`Abnormal heart rate (${vitals.heartRate}) +8`);
            }
        }
        
        // 6. RISK FACTORS (Lifestyle)
        const lifestyleRisks = patientProfile.clinicalProfile?.riskFactors || [];
        lifestyleRisks.forEach(rf => {
            let rfScore = 0;
            if (rf.factor === "Smoking") {
                rfScore = 15;
                recommendations.push("Smoking cessation program");
            }
            if (rf.factor === "Alcohol Use") {
                rfScore = 12;
                recommendations.push("Alcohol counseling");
            }
            if (rf.factor === "Obesity") {
                rfScore = 12;
                recommendations.push("Weight management program");
            }
            if (rf.factor === "Sedentary Lifestyle") {
                rfScore = 8;
                recommendations.push("Physical activity plan");
            }
            if (rfScore > 0) {
                riskScore += rfScore;
                riskFactors.push(`${rf.factor} +${rfScore}`);
            }
        });
        
        // 7. PREGNANCY
        if (patientProfile.pregnancyInfo?.isPregnant) {
            riskScore += 25;
            riskFactors.push(`Pregnancy (Due: ${patientProfile.pregnancyInfo.dueDate}) +25`);
            recommendations.push("Antenatal care follow-up");
            
            if (patientProfile.pregnancyInfo.highRisk) {
                riskScore += 20;
                riskFactors.push(`High-risk pregnancy +20`);
                recommendations.push("High-risk obstetrics consultation");
            }
        }
        
        // 8. VISIT FREQUENCY (from medical records)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recentVisits = medicalRecords.filter(r => new Date(r.visitDate) > threeMonthsAgo);
        
        if (recentVisits.length > 5) {
            riskScore += 20;
            riskFactors.push(`Very frequent visits (${recentVisits.length} in 3 months) +20`);
            recommendations.push("Case management review");
        } else if (recentVisits.length > 3) {
            riskScore += 12;
            riskFactors.push(`Frequent visits (${recentVisits.length} in 3 months) +12`);
        } else if (recentVisits.length > 1) {
            riskScore += 5;
            riskFactors.push(`Regular visits (+5)`);
        }
        
        // 9. SURGICAL HISTORY
        const surgeries = patientProfile.clinicalProfile?.surgicalHistory || [];
        if (surgeries.length > 2) {
            riskScore += 8;
            riskFactors.push(`Multiple surgeries (${surgeries.length}) +8`);
        }
        
        // Determine risk level
        let riskLevel = "LOW";
        if (riskScore >= 100) riskLevel = "CRITICAL";
        else if (riskScore >= 70) riskLevel = "HIGH";
        else if (riskScore >= 40) riskLevel = "MODERATE";
        
        return {
            riskScore,
            riskLevel,
            riskFactors,
            recommendations: recommendations.slice(0, 5),
            chronicConditionsCount: chronicConditions.length,
            activeMedications: currentMeds.length,
            recentVisitsCount: recentVisits.length,
            lastVisit: medicalRecords[0]?.visitDate || null,
            lastVitals: vitals || null
        };
    }

    // Detect outbreaks with enhanced criteria
    detectOutbreaks() {
        const alerts = [];
        
        this.provinceStats.forEach((stats, province) => {
            // Calculate 7-day trend
            const recentWeek = stats.monthlyTrend.slice(-1)[0] || 0;
            const previousWeek = stats.monthlyTrend.slice(-2, -1)[0] || 0;
            
            if (previousWeek > 0) {
                const increase = ((recentWeek - previousWeek) / previousWeek) * 100;
                
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
                    const mortalityRate = diseasePattern ? 
                        (diseasePattern.outcomes.deceased / diseasePattern.count) * 100 : 0;
                    
                    alerts.push({
                        province,
                        disease: topDisease,
                        type: "OUTBREAK",
                        message: `⚠️ ${topDisease} cases increased by ${Math.round(increase)}% in ${province}`,
                        severity: increase > 100 ? "CRITICAL" : "HIGH",
                        recentCases: Math.round(recentWeek),
                        previousCases: Math.round(previousWeek),
                        mortalityRate: Math.min(Math.round(mortalityRate), 100),
                        timestamp: new Date(),
                        affectedAgeGroups: stats.ageGroups
                    });
                }
            }
            
            // Check for emerging diseases (new in last 30 days)
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

    // Get comprehensive statistics
    getStats() {
        return {
            totalRecords: this.totalRecords,
            diseasesTracked: this.diseasePatterns.size,
            provincesTracked: this.provinceStats.size,
            symptomCorrelations: this.symptomCorrelations.size,
            lastUpdated: this.lastUpdated,
            topDiseases: Array.from(this.diseasePatterns.entries())
                .map(([disease, data]) => ({
                    disease,
                    cases: data.count,
                    recoveryRate: data.count > 0 ? Math.min(Math.round((data.outcomes.recovered / data.count) * 100), 100) : 0,
                    mortalityRate: data.count > 0 ? Math.min(Math.round((data.outcomes.deceased / data.count) * 100), 100) : 0,
                    mostAffectedAgeGroup: Object.entries(data.ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0],
                    lastSeen: data.lastSeen
                }))
                .sort((a, b) => b.cases - a.cases)
                .slice(0, 10),
            highRiskProvinces: Array.from(this.provinceStats.entries())
                .filter(([_, data]) => data.total > 100)
                .map(([province, data]) => ({
                    province,
                    totalCases: data.total,
                    elderlyProportion: data.ageGroups.elderly / data.total
                }))
                .sort((a, b) => b.elderlyProportion - a.elderlyProportion)
        };
    }
}

module.exports = ContinuousLearner;