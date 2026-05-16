const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { predictTriagePriority } = require("../utils/triageAI");

// ── Shared helper: verify patient JWT and return patient doc ──────────────
async function getPatientFromToken(req) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const patient = await Patient.findById(decoded.id);
    if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });
    return patient;
}

// ── Statistical helpers ───────────────────────────────────────────────────
function calcStats(values) {
    if (!values.length) return { avg: null, stdDev: null, min: null, max: null };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    return { avg, stdDev: Math.sqrt(variance), min: Math.min(...values), max: Math.max(...values) };
}

// ============ PATIENT AUTHENTICATION ============

// Patient Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log("Patient login attempt:", email);
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        
        if (!patient) {
            console.log("Patient not found:", email);
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        if (!patient.portalAccount?.hasAccount) {
            return res.status(401).json({ error: "No portal account found. Please contact your hospital." });
        }
        
        if (!patient.portalAccount.isActive) {
            return res.status(401).json({ error: "Account is deactivated. Contact support." });
        }
        
        if (!patient.portalAccount.isVerified) {
            return res.status(401).json({ error: "Please verify your email first." });
        }
        
        const isValid = await bcrypt.compare(password, patient.portalAccount.password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        patient.portalAccount.lastLogin = new Date();
        await patient.save();
        
        const token = jwt.sign(
            { id: patient._id, email: patient.portalAccount.email, type: "patient" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        
        console.log("Patient logged in:", patient.firstName, patient.lastName);
        
        res.json({
            token,
            patient: {
                id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.portalAccount.email,
                nationalId: patient.nationalId,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                province: patient.province
            }
        });
    } catch (error) {
        console.error("Patient login error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        
        if (!patient || !patient.portalAccount?.hasAccount) {
            return res.json({ message: "If an account exists, a reset link will be sent" });
        }
        
        const resetToken = jwt.sign(
            { id: patient._id, email: patient.portalAccount.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        
        patient.portalAccount.resetToken = resetToken;
        patient.portalAccount.resetTokenExpiry = new Date(Date.now() + 3600000);
        await patient.save();
        
        res.json({ message: "Reset link sent to your email" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findOne({ 
            _id: decoded.id,
            "portalAccount.resetToken": token,
            "portalAccount.resetTokenExpiry": { $gt: new Date() }
        });
        
        if (!patient) {
            return res.status(400).json({ error: "Invalid or expired reset link" });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        patient.portalAccount.password = hashedPassword;
        patient.portalAccount.resetToken = undefined;
        patient.portalAccount.resetTokenExpiry = undefined;
        await patient.save();
        
        res.json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Verify Email
router.get("/verify", async (req, res) => {
    try {
        const { token } = req.query;
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findOne({ _id: decoded.id });
        
        if (!patient) {
            return res.status(400).json({ error: "Invalid verification link" });
        }
        
        patient.portalAccount.isVerified = true;
        await patient.save();
        
        res.json({ message: "Email verified successfully" });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT DATA ACCESS ============

// Get patient's medical records
// Patients see ALL their own records EXCEPT those marked isConfidential
// (confidential records are sensitive clinical notes that require in-person discussion)
router.get("/records", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const skip  = (page - 1) * limit;

        const query = {
            patientId: patient._id,
            isConfidential: { $ne: true }   // exclude confidential records
        };

        const [records, total] = await Promise.all([
            MedicalRecord.find(query)
                .sort({ visitDate: -1 })
                .skip(skip)
                .limit(limit)
                .select({
                    visitDate: 1, visitType: 1, hospital: 1, doctorName: 1,
                    disposition: 1, dischargeInstructions: 1, dischargeSummary: 1,
                    symptoms: 1, primaryDiagnosis: 1, secondaryDiagnoses: 1,
                    disease: 1, differentialDiagnosis: 1, physicalExam: 1,
                    prescribedMedications: 1, treatmentPlan: 1, investigations: 1,
                    vitalSigns: 1, notes: 1, province: 1, followUp: 1, referrals: 1,
                    // Explicitly exclude staff-only fields
                    doctorNotes: 0, nursingNotes: 0,
                    createdBy: 0, updatedBy: 0, reviewedBy: 0, taggedUsers: 0
                }),
            MedicalRecord.countDocuments(query)
        ]);

        res.json({
            records,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Error fetching patient records:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get patient's vital signs history
// Same confidentiality rule — exclude isConfidential records
router.get("/vitals", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id);
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        const vitalsHistory = await MedicalRecord.find(
            { patientId: patient._id, isConfidential: { $ne: true } },
            {
                visitDate: 1, visitType: 1,
                'vitalSigns.temperature': 1,
                'vitalSigns.bloodPressure': 1,
                'vitalSigns.heartRate': 1,
                'vitalSigns.respiratoryRate': 1,
                'vitalSigns.oxygenSaturation': 1,
                'vitalSigns.weight': 1,
                'vitalSigns.height': 1,
                'vitalSigns.bmi': 1,
                'vitalSigns.painScore': 1
            }
        ).sort({ visitDate: -1 });

        res.json({ vitals: vitalsHistory });
    } catch (error) {
        console.error("Error fetching vitals:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get patient profile
router.get("/profile", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id).select("-portalAccount.password");
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const recordsCount = await MedicalRecord.countDocuments({ patientId: patient._id });
        const lastVisit = await MedicalRecord.findOne({ patientId: patient._id }).sort({ visitDate: -1 });
        
        res.json({
            patient: {
                id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                nationalId: patient.nationalId,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                province: patient.province,
                contactInfo: patient.contactInfo,
                clinicalProfile: patient.clinicalProfile
            },
            stats: {
                totalRecords: recordsCount,
                lastVisitDate: lastVisit?.visitDate || null,
                lastVisitHospital: lastVisit?.hospital || null
            }
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ============ AI FEATURES FOR PATIENT PORTAL ================
// ============================================================

// ── 1. PERSONAL HEALTH SCORE & RISK SUMMARY ─────────────────
// Returns a plain-language health summary derived from the
// patient's latest vitals, triage status, and visit history.
router.get("/ai/health-summary", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);

        const records = await MedicalRecord.find({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .limit(20);

        const latestRecord = records[0];
        const latestVitals = latestRecord?.vitalSigns || {};
        const triage = patient.clinicalProfile?.triageStatus || {};

        // Re-run triage on latest vitals for freshness
        const freshTriage = latestRecord
            ? predictTriagePriority(latestVitals, latestRecord.symptoms || [])
            : { priority: "NON-URGENT", score: 0, reasons: [], color: "gray" };

        // Build plain-language health score (0-100, higher = healthier)
        let healthScore = 100;
        const insights = [];
        const warnings = [];

        // Deduct for triage score
        healthScore -= Math.min(freshTriage.score * 5, 40);

        // Vital sign checks
        if (latestVitals.temperature) {
            if (latestVitals.temperature > 38.5) { healthScore -= 10; warnings.push("Elevated temperature detected in your last visit."); }
            else if (latestVitals.temperature < 36.0) { healthScore -= 8; warnings.push("Low body temperature noted in your last visit."); }
            else insights.push("Body temperature was normal at your last visit.");
        }
        if (latestVitals.bloodPressure?.systolic) {
            const sbp = latestVitals.bloodPressure.systolic;
            if (sbp > 140) { healthScore -= 12; warnings.push("Blood pressure was elevated at your last visit."); }
            else if (sbp < 90) { healthScore -= 10; warnings.push("Blood pressure was low at your last visit."); }
            else insights.push("Blood pressure was within normal range.");
        }
        if (latestVitals.heartRate) {
            if (latestVitals.heartRate > 100) { healthScore -= 8; warnings.push("Heart rate was elevated at your last visit."); }
            else if (latestVitals.heartRate < 60) { healthScore -= 5; warnings.push("Heart rate was below normal at your last visit."); }
            else insights.push("Heart rate was normal.");
        }
        if (latestVitals.oxygenSaturation) {
            if (latestVitals.oxygenSaturation < 95) { healthScore -= 15; warnings.push("Oxygen saturation was below normal — please follow up with your doctor."); }
            else insights.push("Oxygen saturation was healthy.");
        }
        if (latestVitals.bmi) {
            if (latestVitals.bmi > 30) { healthScore -= 8; warnings.push("BMI indicates obesity — consider lifestyle changes."); }
            else if (latestVitals.bmi < 18.5) { healthScore -= 6; warnings.push("BMI indicates underweight — nutritional support may help."); }
            else insights.push("BMI is in the healthy range.");
        }

        // Visit frequency insight
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const recentVisits = records.filter(r => new Date(r.visitDate) > threeMonthsAgo);
        if (recentVisits.length > 4) {
            insights.push(`You have had ${recentVisits.length} visits in the last 3 months — your care team is monitoring you closely.`);
        }

        // Diagnoses summary
        const diagnoses = [...new Set(records.map(r => r.disease || r.primaryDiagnosis?.name).filter(Boolean))];
        if (diagnoses.length > 0) {
            insights.push(`Conditions on record: ${diagnoses.slice(0, 3).join(", ")}${diagnoses.length > 3 ? ` and ${diagnoses.length - 3} more` : ""}.`);
        }

        healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

        const scoreLabel =
            healthScore >= 80 ? "Good" :
            healthScore >= 60 ? "Fair" :
            healthScore >= 40 ? "Needs Attention" : "Requires Care";

        const scoreColor =
            healthScore >= 80 ? "green" :
            healthScore >= 60 ? "yellow" :
            healthScore >= 40 ? "orange" : "red";

        res.json({
            healthScore,
            scoreLabel,
            scoreColor,
            triagePriority: freshTriage.priority,
            triageScore: freshTriage.score,
            triageReasons: freshTriage.reasons,
            insights,
            warnings,
            totalVisits: records.length,
            recentVisits: recentVisits.length,
            lastVisitDate: latestRecord?.visitDate || null,
            lastVisitHospital: latestRecord?.hospital || null,
            diagnoses: diagnoses.slice(0, 5),
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Health summary error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ── 2. VITALS ANOMALY DETECTION ──────────────────────────────
// Compares the patient's latest vitals against their own
// historical baseline using z-scores. Returns plain-language
// alerts the patient can understand.
router.get("/ai/vitals-anomalies", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);

        const records = await MedicalRecord.find(
            { patientId: patient._id },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: -1 }).limit(30);

        if (records.length === 0) {
            return res.json({ anomalies: [], message: "No vital sign records found yet.", hasData: false });
        }

        const latest = records[0]?.vitalSigns || {};
        const history = records.slice(1); // compare against all but the latest

        const collect = (key, nested) => history
            .map(r => nested ? r.vitalSigns?.[key]?.[nested] : r.vitalSigns?.[key])
            .filter(v => typeof v === "number");

        const temps      = collect("temperature");
        const hrs        = collect("heartRate");
        const systolics  = collect("bloodPressure", "systolic");
        const diastolics = collect("bloodPressure", "diastolic");
        const o2s        = collect("oxygenSaturation");
        const rrs        = collect("respiratoryRate");
        const weights    = collect("weight");

        const anomalies = [];

        const check = (label, current, values, unit, lowMsg, highMsg, criticalLow, criticalHigh) => {
            if (current == null || values.length < 2) return;
            const stats = calcStats(values);
            if (!stats.stdDev || stats.stdDev === 0) return;
            const z = (current - stats.avg) / stats.stdDev;
            if (Math.abs(z) > 1.8) {
                const direction = current > stats.avg ? "higher" : "lower";
                const severity = Math.abs(z) > 3 ? "HIGH" : "MODERATE";
                const isCritical = (criticalLow != null && current < criticalLow) || (criticalHigh != null && current > criticalHigh);
                anomalies.push({
                    vital: label,
                    current: `${current}${unit}`,
                    yourAverage: `${Math.round(stats.avg * 10) / 10}${unit}`,
                    direction,
                    severity: isCritical ? "HIGH" : severity,
                    message: direction === "higher" ? highMsg : lowMsg,
                    action: isCritical
                        ? "Please contact your doctor or visit a clinic soon."
                        : "Keep an eye on this and mention it at your next visit.",
                    zScore: Math.round(Math.abs(z) * 10) / 10
                });
            }
        };

        check("Temperature", latest.temperature, temps, "°C",
            "Your temperature is lower than your usual readings.",
            "Your temperature is higher than your usual readings — possible fever.",
            35.5, 38.5);
        check("Heart Rate", latest.heartRate, hrs, " bpm",
            "Your heart rate is lower than your usual readings.",
            "Your heart rate is higher than your usual readings.",
            50, 110);
        check("Systolic Blood Pressure", latest.bloodPressure?.systolic, systolics, " mmHg",
            "Your blood pressure is lower than your usual readings.",
            "Your blood pressure is higher than your usual readings.",
            90, 150);
        check("Oxygen Saturation", latest.oxygenSaturation, o2s, "%",
            "Your oxygen level is lower than your usual readings — this needs attention.",
            "Your oxygen level is slightly above your usual readings.",
            93, null);
        check("Respiratory Rate", latest.respiratoryRate, rrs, "/min",
            "Your breathing rate is slower than your usual readings.",
            "Your breathing rate is faster than your usual readings.",
            10, 24);
        check("Weight", latest.weight, weights, " kg",
            "Your weight is lower than your usual readings.",
            "Your weight is higher than your usual readings.",
            null, null);

        // Clinical threshold checks (regardless of history)
        if (latest.oxygenSaturation && latest.oxygenSaturation < 94) {
            if (!anomalies.find(a => a.vital === "Oxygen Saturation")) {
                anomalies.push({
                    vital: "Oxygen Saturation",
                    current: `${latest.oxygenSaturation}%`,
                    severity: latest.oxygenSaturation < 90 ? "HIGH" : "MODERATE",
                    message: "Your oxygen level is below the healthy range (95-100%).",
                    action: latest.oxygenSaturation < 90
                        ? "Seek medical attention immediately."
                        : "Please contact your doctor soon.",
                    zScore: null
                });
            }
        }

        res.json({
            hasData: true,
            anomalies,
            anomalyCount: anomalies.length,
            latestVitals: latest,
            latestDate: records[0]?.visitDate,
            recordsAnalyzed: records.length,
            allClear: anomalies.length === 0,
            message: anomalies.length === 0
                ? "Your latest vitals look consistent with your personal baseline. Keep it up!"
                : `${anomalies.length} vital sign${anomalies.length > 1 ? "s" : ""} differ from your usual readings.`,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Vitals anomaly error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ── 3. HEALTH TREND ANALYSIS ─────────────────────────────────
// Analyses each vital sign over time and classifies the trend
// as IMPROVING, STABLE, or WORSENING with a plain explanation.
router.get("/ai/health-trends", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);

        const records = await MedicalRecord.find(
            { patientId: patient._id },
            { vitalSigns: 1, visitDate: 1 }
        ).sort({ visitDate: 1 }).limit(20);

        if (records.length < 2) {
            return res.json({ trends: [], message: "Not enough records to analyse trends yet.", hasData: false });
        }

        const extract = (key, nested) => records
            .map(r => ({
                date: r.visitDate,
                value: nested ? r.vitalSigns?.[key]?.[nested] : r.vitalSigns?.[key]
            }))
            .filter(p => typeof p.value === "number");

        const analyseTrend = (points, label, unit, goodDirection, normalMin, normalMax) => {
            if (points.length < 2) return null;
            const first = points.slice(0, Math.ceil(points.length / 2));
            const last  = points.slice(Math.floor(points.length / 2));
            const firstAvg = first.reduce((s, p) => s + p.value, 0) / first.length;
            const lastAvg  = last.reduce((s, p) => s + p.value, 0) / last.length;
            const change = lastAvg - firstAvg;
            const changePct = firstAvg !== 0 ? Math.round((change / firstAvg) * 100) : 0;

            const latestVal = points[points.length - 1].value;
            const inNormalRange = normalMin != null && normalMax != null
                ? latestVal >= normalMin && latestVal <= normalMax
                : true;

            let trend, trendColor, explanation;
            const improving = goodDirection === "down" ? change < -0.5 : change > 0.5;
            const worsening = goodDirection === "down" ? change > 0.5 : change < -0.5;

            if (Math.abs(changePct) < 3) {
                trend = "STABLE";
                trendColor = "blue";
                explanation = `Your ${label} has been consistent across your visits.`;
            } else if (improving) {
                trend = "IMPROVING";
                trendColor = "green";
                explanation = `Your ${label} has been trending in a healthy direction.`;
            } else {
                trend = worsening ? "WORSENING" : "CHANGING";
                trendColor = worsening ? "orange" : "yellow";
                explanation = `Your ${label} has been changing — worth discussing with your doctor.`;
            }

            return {
                vital: label,
                trend,
                trendColor,
                explanation,
                latestValue: `${Math.round(latestVal * 10) / 10}${unit}`,
                changePercent: changePct,
                inNormalRange,
                dataPoints: points.length,
                chartData: points.map(p => ({
                    date: new Date(p.date).toLocaleDateString(),
                    value: Math.round(p.value * 10) / 10
                }))
            };
        };

        const trends = [
            analyseTrend(extract("temperature"), "Temperature", "°C", "stable", 36.1, 37.2),
            analyseTrend(extract("heartRate"), "Heart Rate", " bpm", "stable", 60, 100),
            analyseTrend(extract("bloodPressure", "systolic"), "Systolic BP", " mmHg", "down", 90, 120),
            analyseTrend(extract("oxygenSaturation"), "Oxygen Saturation", "%", "up", 95, 100),
            analyseTrend(extract("weight"), "Weight", " kg", "stable", null, null),
            analyseTrend(extract("bmi"), "BMI", "", "stable", 18.5, 24.9)
        ].filter(Boolean);

        const worseningCount = trends.filter(t => t.trend === "WORSENING").length;
        const improvingCount = trends.filter(t => t.trend === "IMPROVING").length;

        res.json({
            hasData: true,
            trends,
            summary: worseningCount > 1
                ? "Some of your health metrics are trending in the wrong direction. Please discuss with your doctor."
                : improvingCount > 0
                ? "Some of your health metrics are improving. Keep up the good work!"
                : "Your health metrics are generally stable.",
            worseningCount,
            improvingCount,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Health trends error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ── 4. FOLLOW-UP & MEDICATION REMINDERS ──────────────────────
// Parses the patient's records for follow-up dates and active
// medications, returning upcoming/overdue items.
router.get("/ai/reminders", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);

        const records = await MedicalRecord.find({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .limit(10)
            .select({ visitDate: 1, followUp: 1, prescribedMedications: 1, treatmentPlan: 1, disease: 1, primaryDiagnosis: 1, hospital: 1 });

        const now = new Date();
        const followUps = [];
        const medications = new Map();

        records.forEach(record => {
            // Follow-up reminders
            if (record.followUp?.required && record.followUp?.date) {
                const followUpDate = new Date(record.followUp.date);
                const daysUntil = Math.round((followUpDate - now) / (1000 * 60 * 60 * 24));
                followUps.push({
                    date: followUpDate,
                    daysUntil,
                    status: daysUntil < 0 ? "OVERDUE" : daysUntil <= 7 ? "SOON" : "UPCOMING",
                    instructions: record.followUp.instructions || "Follow-up appointment required",
                    provider: record.followUp.provider || record.hospital || "Your healthcare provider",
                    forCondition: record.disease || record.primaryDiagnosis?.name || "General follow-up",
                    visitDate: record.visitDate
                });
            }

            // Medication deduplication (keep most recent prescription)
            const meds = [
                ...(record.prescribedMedications || []),
                ...(record.treatmentPlan?.medications?.map(m => m.medication) || [])
            ].filter(Boolean);

            meds.forEach(med => {
                if (!medications.has(med)) {
                    medications.set(med, {
                        name: med,
                        prescribedAt: record.visitDate,
                        forCondition: record.disease || record.primaryDiagnosis?.name || "General",
                        hospital: record.hospital
                    });
                }
            });
        });

        // Sort follow-ups: overdue first, then soonest
        followUps.sort((a, b) => a.daysUntil - b.daysUntil);

        const overdueCount = followUps.filter(f => f.status === "OVERDUE").length;
        const soonCount    = followUps.filter(f => f.status === "SOON").length;

        res.json({
            followUps,
            medications: Array.from(medications.values()).slice(0, 15),
            overdueCount,
            soonCount,
            hasReminders: followUps.length > 0 || medications.size > 0,
            urgentMessage: overdueCount > 0
                ? `You have ${overdueCount} overdue follow-up appointment${overdueCount > 1 ? "s" : ""}. Please contact your healthcare provider.`
                : soonCount > 0
                ? `You have ${soonCount} follow-up appointment${soonCount > 1 ? "s" : ""} coming up soon.`
                : null,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Reminders error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ── 5. SYMPTOM CHECKER ───────────────────────────────────────
// Patient submits current symptoms; the system uses the
// in-memory AI (if available) or a rule-based fallback to
// return "when to seek care" guidance — NOT a diagnosis.
router.post("/ai/symptom-check", async (req, res) => {
    try {
        const patient = await getPatientFromToken(req);
        const { symptoms } = req.body;

        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({ error: "Please provide at least one symptom." });
        }

        // High-risk symptoms that always warrant immediate care
        const EMERGENCY_SYMPTOMS = [
            "chest pain", "difficulty breathing", "shortness of breath",
            "unconscious", "seizure", "stroke", "severe bleeding",
            "choking", "anaphylaxis", "head injury", "poisoning"
        ];
        const URGENT_SYMPTOMS = [
            "high fever", "fever", "severe headache", "vomiting blood",
            "blood in urine", "severe abdominal pain", "confusion",
            "blurred vision", "severe dizziness", "fainting"
        ];

        const lowerSymptoms = symptoms.map(s => s.toLowerCase());
        const emergencyMatches = lowerSymptoms.filter(s =>
            EMERGENCY_SYMPTOMS.some(e => s.includes(e))
        );
        const urgentMatches = lowerSymptoms.filter(s =>
            URGENT_SYMPTOMS.some(u => s.includes(u))
        );

        // Try to use the real-time AI if it's available on app.locals
        let aiPredictions = [];
        try {
            const realTimeAI = req.app?.locals?.aiInstance;
            if (realTimeAI) {
                const result = realTimeAI.predictDisease(
                    symptoms,
                    patient.province || "Harare",
                    new Date().getMonth(),
                    patient.age,
                    patient.gender
                );
                aiPredictions = (result.predictions || []).slice(0, 3).map(p => ({
                    condition: p.disease,
                    likelihood: p.confidence,
                    commonIn: p.totalCases > 0 ? `${p.totalCases} similar cases on record` : null
                }));
            }
        } catch (_) { /* AI not available — use rule-based only */ }

        // Determine urgency level
        let urgencyLevel, urgencyColor, careAdvice, timeframe;
        if (emergencyMatches.length > 0) {
            urgencyLevel = "EMERGENCY";
            urgencyColor = "red";
            careAdvice = "Go to the emergency room or call emergency services immediately.";
            timeframe = "Right now";
        } else if (urgentMatches.length > 0 || symptoms.length >= 4) {
            urgencyLevel = "URGENT";
            urgencyColor = "orange";
            careAdvice = "Visit a clinic or doctor today or tomorrow.";
            timeframe = "Within 24 hours";
        } else if (symptoms.length >= 2) {
            urgencyLevel = "SOON";
            urgencyColor = "yellow";
            careAdvice = "Schedule an appointment with your doctor within the next few days.";
            timeframe = "Within 3-5 days";
        } else {
            urgencyLevel = "MONITOR";
            urgencyColor = "blue";
            careAdvice = "Monitor your symptoms. If they worsen or persist beyond 3 days, see a doctor.";
            timeframe = "Monitor for 3 days";
        }

        // General self-care tips based on symptoms
        const selfCareTips = [];
        if (lowerSymptoms.some(s => s.includes("fever") || s.includes("temperature"))) {
            selfCareTips.push("Stay hydrated — drink plenty of water and fluids.");
            selfCareTips.push("Rest and avoid strenuous activity.");
        }
        if (lowerSymptoms.some(s => s.includes("cough") || s.includes("breathing"))) {
            selfCareTips.push("Avoid smoke and dusty environments.");
            selfCareTips.push("Sit upright to ease breathing.");
        }
        if (lowerSymptoms.some(s => s.includes("headache") || s.includes("pain"))) {
            selfCareTips.push("Rest in a quiet, dark room if possible.");
        }
        if (lowerSymptoms.some(s => s.includes("diarrhea") || s.includes("vomit") || s.includes("nausea"))) {
            selfCareTips.push("Drink oral rehydration solution (ORS) to prevent dehydration.");
            selfCareTips.push("Eat bland foods like rice, bananas, and toast.");
        }
        if (selfCareTips.length === 0) {
            selfCareTips.push("Rest and stay hydrated.");
            selfCareTips.push("Avoid self-medicating without professional advice.");
        }

        res.json({
            symptoms,
            urgencyLevel,
            urgencyColor,
            careAdvice,
            timeframe,
            emergencySymptoms: emergencyMatches,
            urgentSymptoms: urgentMatches,
            selfCareTips,
            aiPredictions,
            disclaimer: "This is not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.",
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Symptom check error:", err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

module.exports = router;
