// Server/ai/outbreakDetector.js - Persistent Outbreak Detection Engine
const MedicalRecord = require('../models/MedicalRecord');
const CitizenReport = require('../models/CitizenReport');
const Alert = require('../models/Alert');
const { normaliseDisease } = require('../utils/normalise');
const fs = require('fs');
const path = require('path');

// Load EDLIZ Protocols (Gap A)
let EDLIZ_DATA = [];
try {
    const edlizPath = path.join(__dirname, '../edliz.json');
    if (fs.existsSync(edlizPath)) {
        const raw = fs.readFileSync(edlizPath);
        EDLIZ_DATA = JSON.parse(raw).data;
        console.log(`✅ Loaded ${EDLIZ_DATA.length} EDLIZ protocols.`);
    }
} catch (e) {
    console.warn("⚠️ Failed to load edliz.json:", e.message);
}

const PATHOGEN_CONFIG = {
    // --- ZERO-TOLERANCE CRITICAL PATHOGENS ---
    'Acinetobacter baumannii': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Pseudomonas aeruginosa': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Klebsiella pneumoniae': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Escherichia coli': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Mycobacterium tuberculosis': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'TB': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Vibrio cholerae': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Cholera': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Salmonella enterica serovar Typhi': { floor: 1, weight: 0.9, ignoreFloor: true, priority: 'CRITICAL' },
    'Typhoid': { floor: 1, weight: 0.9, ignoreFloor: true, priority: 'CRITICAL' },
    'Salmonella species': { floor: 1, weight: 0.8, ignoreFloor: true, priority: 'CRITICAL' },
    'Shigella': { floor: 1, weight: 0.8, ignoreFloor: true, priority: 'CRITICAL' },
    'Staphylococcus aureus': { floor: 1, weight: 0.9, ignoreFloor: true, priority: 'CRITICAL' },
    'MRSA': { floor: 1, weight: 0.9, ignoreFloor: true, priority: 'CRITICAL' },
    'Streptococcus pneumoniae': { floor: 1, weight: 0.8, ignoreFloor: true, priority: 'CRITICAL' },
    'Neisseria gonorrhoeae': { floor: 1, weight: 0.8, ignoreFloor: true, priority: 'CRITICAL' },
    'HIV': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Plasmodium falciparum': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Malaria': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Ebola': { floor: 1, weight: 1.0, ignoreFloor: true, priority: 'CRITICAL' },
    'Mpox': { floor: 1, weight: 0.9, ignoreFloor: true, priority: 'CRITICAL' },
    'Measles': { floor: 1, weight: 0.9, ignoreFloor: true, priority: 'CRITICAL' },
    'COVID-19': { floor: 1, weight: 0.9, ignoreFloor: true, priority: 'CRITICAL' },

    // --- STATISTICAL WARNING PATHOGENS ---
    'Influenza': { floor: 15, weight: 0.5, ignoreFloor: false, priority: 'WARNING' },
    'Common Cold': { floor: 20, weight: 0.2, ignoreFloor: false, priority: 'INFO' },
    'default': { floor: 5, weight: 0.5, ignoreFloor: false, priority: 'WARNING' }
};

class OutbreakDetector {
    constructor(io, alertEmitter) {
        this.io = io;
        this.alertEmitter = alertEmitter;
        this.checkInterval = 60 * 60 * 1000;
        this.timer = null;
    }

    start() {
        console.log("🔍 Outbreak Detection Engine starting (Persistent Mode)...");
        this.runFullCheck();
        this.timer = setInterval(() => this.runFullCheck(), this.checkInterval);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
    }

    getDiseaseConfig(diseaseName) {
        const key = Object.keys(PATHOGEN_CONFIG).find(k => 
            diseaseName.toLowerCase().includes(k.toLowerCase())
        );
        return PATHOGEN_CONFIG[key] || PATHOGEN_CONFIG['default'];
    }

    getEDLIZProtocol(diseaseName) {
        return EDLIZ_DATA.find(e => 
            diseaseName.toLowerCase().includes(e.disease.toLowerCase()) ||
            e.disease.toLowerCase().includes(diseaseName.toLowerCase())
        );
    }

    getRecommendations(diseaseName) {
        const recs = [];
        const lower = diseaseName.toLowerCase();
        
        // Water-borne detection
        if (lower.includes('cholera') || lower.includes('typhoid') || lower.includes('diarrhea') || lower.includes('shigella') || lower.includes('dysentery')) {
            recs.push("💧 BOIL all drinking water or use water purification tablets.");
            recs.push("🧼 Wash hands with soap before handling food.");
            recs.push("🚫 Avoid eating raw vegetables or unpeeled fruit in affected areas.");
        }

        // Respiratory
        if (lower.includes('tb') || lower.includes('influenza') || lower.includes('covid') || lower.includes('measles') || lower.includes('pneumonia')) {
            recs.push("😷 Wear a face mask in crowded indoor spaces.");
            recs.push("🪟 Ensure proper ventilation by opening windows.");
        }

        // Vector-borne
        if (lower.includes('malaria') || lower.includes('plasmodium')) {
            recs.push("🦟 Sleep under treated mosquito nets.");
            recs.push("🧴 Use insect repellent during evening hours.");
        }

        if (recs.length === 0) {
            recs.push("🏥 Report to the nearest health facility if symptoms persist.");
        }

        return recs;
    }

    async runFullCheck() {
        try {
            console.log("📊 Running system-wide outbreak surveillance check...");
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // STAGE 1: Citizen Signal Aggregation
            const citizenSignals = await CitizenReport.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                {
                    $group: {
                        _id: { province: "$location.province", district: "$location.district" },
                        reportCount: { $sum: 1 }
                    }
                }
            ]);

            // STAGE 2: Weighted Aggregation (Clinical)
            const currentClusters = await MedicalRecord.aggregate([
                { $match: { visitDate: { $gte: sevenDaysAgo } } },
                {
                    $group: {
                        _id: {
                            province: "$province", district: "$district",
                            ward: "$patientSnapshot.ward", disease: "$disease"
                        },
                        rawCount: { $sum: 1 },
                        weightedCount: {
                            $sum: {
                                $switch: {
                                    branches: [
                                        { case: { $eq: ["$caseStatus", "Confirmed"] }, then: 5 },
                                        { case: { $eq: ["$caseStatus", "Probable"] }, then: 2 }
                                    ],
                                    default: 1
                                }
                            }
                        },
                        environmentalFactors: { $addToSet: "$environmentalContext.factor" },
                        patientIds: { $push: "$patientId" }
                    }
                }
            ]);

            for (const cluster of currentClusters) {
                const { province, district, ward, disease } = cluster._id;
                const { weightedCount, rawCount, patientIds, environmentalFactors } = cluster;
                const config = this.getDiseaseConfig(disease);
                const flattenedEnv = environmentalFactors.flat().filter(Boolean);

                const signal = citizenSignals.find(s => 
                    s._id.province === province && s._id.district === district
                );
                const hasCitizenSignal = !!(signal && signal.reportCount >= 3);

                // RULE 1: Threshold Guard
                if (!config.ignoreFloor && rawCount < config.floor) {
                    if (hasCitizenSignal && rawCount >= (config.floor / 2)) {
                        console.log(`📡 CITIZEN SIGNAL: Elevating ${disease} in ${district}`);
                    } else {
                        continue;
                    }
                }

                // RULE 2: Zero-Tolerance
                if (config.ignoreFloor && rawCount >= config.floor) {
                    await this.handlePersistentAlert(cluster._id, {
                        severity: config.priority,
                        status: 'CONFIRMED',
                        weightedCount, rawCount, patientIds,
                        envFactors: flattenedEnv, hasCitizenSignal,
                        isCritical: true
                    });
                    continue;
                }

                // RULE 3: Statistical Anomaly
                const stats = await this.checkStatisticalAnomaly(cluster._id, weightedCount, config, flattenedEnv, hasCitizenSignal);
                
                if (stats.detected) {
                    await this.handlePersistentAlert(cluster._id, {
                        severity: config.priority,
                        status: 'MONITORING', // Start as monitoring for non-critical
                        weightedCount, rawCount, patientIds,
                        envFactors: flattenedEnv, hasCitizenSignal,
                        stats
                    });
                }
            }
        } catch (error) {
            console.error("❌ Outbreak Detection Error:", error);
        }
    }

    async handlePersistentAlert(locationInfo, data) {
        const { province, district, ward, disease } = locationInfo;
        const now = new Date();

        // Find existing active alert
        let alert = await Alert.findOne({
            disease,
            'location.province': province,
            'location.district': district,
            'location.ward': ward,
            status: { $ne: 'RESOLVED' }
        });

        const protocol = this.getEDLIZProtocol(disease);
        const protocolData = protocol ? {
            treatment: protocol.treatment_drugs,
            diagnosticSigns: protocol.symptoms,
            source: "EDLIZ (National Medicine Formulary) 2024"
        } : null;

        if (!alert) {
            // NEW ALERT (Strike 1)
            alert = new Alert({
                disease,
                location: { province, district, ward },
                status: data.status,
                severity: data.severity,
                metrics: {
                    weightedCount: data.weightedCount,
                    rawCount: data.rawCount,
                    score: data.stats?.score || 1.0,
                    threshold: data.stats?.threshold,
                    increase: data.stats?.increase || 100
                },
                context: {
                    environmentalFactors: data.envFactors,
                    hasCitizenSignal: data.hasCitizenSignal
                },
                patientIds: data.patientIds,
                protocol: protocolData,
                recommendations: this.getRecommendations(disease)
            });
            await alert.save();
            this.emitAlertEvent(alert, false);
        } else {
            // UPDATING EXISTING ALERT
            const hoursSinceFirst = (now - alert.firstDetected) / (1000 * 60 * 60);
            
            // If monitoring and > 20h, upgrade to CONFIRMED
            if (alert.status === 'MONITORING' && hoursSinceFirst >= 20) {
                alert.status = 'CONFIRMED';
                alert.strikeCount++;
                console.log(`📈 UPGRADING ALERT: ${disease} in ${district} is now CONFIRMED.`);
            }

            alert.lastSeen = now;
            alert.metrics = {
                ...alert.metrics,
                weightedCount: data.weightedCount,
                rawCount: data.rawCount,
                score: data.stats?.score || alert.metrics.score
            };
            alert.patientIds = [...new Set([...alert.patientIds, ...data.patientIds])];
            await alert.save();
            
            this.emitAlertEvent(alert, alert.status === 'CONFIRMED' || data.isCritical);
        }
    }

    async checkStatisticalAnomaly(locationInfo, currentCount, config, envFactors, hasCitizenSignal) {
        try {
            const { province, district, disease } = locationInfo;
            const eightWeeksAgo = new Date();
            eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const weeklyHistory = await MedicalRecord.aggregate([
                {
                    $match: {
                        disease: disease, province: province, district: district,
                        visitDate: { $gte: eightWeeksAgo, $lt: sevenDaysAgo }
                    }
                },
                {
                    $group: { _id: { week: { $week: "$visitDate" }, year: { $year: "$visitDate" } }, count: { $sum: 1 } }
                }
            ]);

            const counts = weeklyHistory.length >= 2 ? weeklyHistory.map(h => h.count) : [1, 1];
            const mu = counts.reduce((a, b) => a + b, 0) / counts.length;
            const variance = counts.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / counts.length;
            const sigma = Math.sqrt(variance) || 0.5;

            let envMultiplier = 1.0;
            if (envFactors.some(f => /rain|flood|water|sewage|peak|broken|contamination/i.test(f))) {
                envMultiplier = 0.7;
            }

            let citizenMultiplier = 1.0;
            if (hasCitizenSignal) {
                citizenMultiplier = 0.8;
            }

            const threshold = (mu + (2 * sigma)) * envMultiplier * citizenMultiplier;
            const score = (currentCount / (threshold || 1)) * config.weight;
            const increase = mu > 0 ? Math.round(((currentCount - mu) / mu) * 100) : 100;

            return { 
                detected: currentCount > threshold && score > 0.4, 
                increase, score, currentCount, threshold
            };
        } catch (error) {
            console.error("⚠️ Statistical Anomaly Check Error (likely connection reset):", error.message);
            return { detected: false };
        }
    }

    emitAlertEvent(alert, forcePush) {
        if (!this.alertEmitter) return;

        const alertData = {
            id: alert._id,
            severity: alert.status === 'CONFIRMED' ? alert.severity : 'MONITORING',
            disease: alert.disease,
            province: alert.location.province,
            district: alert.location.district,
            ward: alert.location.ward,
            message: `🚨 ${alert.status} ${alert.severity}: ${alert.disease} in ${alert.location.district || alert.location.province}.`,
            forcePush,
            timestamp: alert.lastSeen,
            recommendations: alert.recommendations,
            data: {
                currentCases: alert.metrics.rawCount,
                weightedCases: alert.metrics.weightedCount,
                increase: alert.metrics.increase,
                score: alert.metrics.score,
                patientIds: alert.patientIds,
                hasCitizenSignal: alert.context.hasCitizenSignal,
                envFactors: alert.context.environmentalFactors,
                protocol: alert.protocol
            }
        };

        this.alertEmitter.sendOutbreakAlert(alertData);

        if (forcePush && alert.status === 'CONFIRMED') {
            this.alertEmitter.sendPublicBroadcast({
                area: alert.location.district || alert.location.province,
                disease: alert.disease,
                recommendations: alert.recommendations || ["Report to nearest facility if symptomatic."]
            });
        }
    }

    async checkNewRecord(record) {
        const config = this.getDiseaseConfig(record.disease);
        if (config.ignoreFloor) {
            await this.handlePersistentAlert({
                province: record.province,
                district: record.district,
                ward: record.patientSnapshot?.ward,
                disease: record.disease
            }, {
                severity: config.priority,
                status: 'CONFIRMED',
                weightedCount: 5, // Immediate confirmed weight
                rawCount: 1,
                patientIds: [record.patientId],
                envFactors: [],
                hasCitizenSignal: false,
                isCritical: true
            });
        }
    }
}

module.exports = OutbreakDetector;
