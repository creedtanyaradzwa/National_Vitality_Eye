const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Alert = require("../models/Alert");
const User = require("../models/User");
const { predictTriagePriority } = require("../utils/triageAI");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const HOSPITAL_NAME = "Harare General Hospital";

const criticalPathologies = [
    { 
        disease: "Septic Shock secondary to Peritonitis", 
        symptoms: ["severe abdominal pain", "shortness of breath", "loss of consciousness"],
        vitals: { temperature: 39.8, heartRate: 128, systolic: 85, diastolic: 50, resp: 28, o2: 89 }
    },
    { 
        disease: "Status Asthmaticus", 
        symptoms: ["shortness of breath", "difficulty breathing", "choking"],
        vitals: { temperature: 37.2, heartRate: 115, systolic: 110, diastolic: 70, resp: 34, o2: 86 }
    },
    { 
        disease: "Severe Malaria with Cerebral Complications", 
        symptoms: ["loss of consciousness", "seizure", "high fever"],
        vitals: { temperature: 40.2, heartRate: 140, systolic: 90, diastolic: 55, resp: 26, o2: 91 }
    },
    { 
        disease: "Acute Myocardial Infarction with Cardiogenic Shock", 
        symptoms: ["chest pain", "shortness of breath", "extreme diaphoresis"],
        vitals: { temperature: 36.5, heartRate: 120, systolic: 80, diastolic: 45, resp: 22, o2: 90 }
    }
];

async function triggerCriticalData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        const patients = await Patient.find({ currentHospital: HOSPITAL_NAME }).limit(50);
        console.log(`🔍 Found ${patients.length} patients at ${HOSPITAL_NAME} to upgrade.`);

        const staff = await User.find({ hospitalName: HOSPITAL_NAME }).limit(1);
        const staffId = staff[0]?._id;

        for (let i = 0; i < patients.length; i++) {
            const p = patients[i];
            const pathology = criticalPathologies[i % criticalPathologies.length];
            
            await MedicalRecord.deleteMany({ patientId: p._id }); 
            
            // 1. Create 5 baseline records (ensure z-score > 2 for statistical anomaly)
            const baselineVitals = {
                temperature: 36.6,
                bloodPressure: { systolic: 120, diastolic: 80 },
                heartRate: 72,
                respiratoryRate: 16,
                oxygenSaturation: 98,
                recordedAt: new Date(Date.now() - 86400000 * 5)
            };

            const baselines = [];
            for(let j=0; j<5; j++) {
                baselines.push({
                    patientId: p._id,
                    hospital: HOSPITAL_NAME,
                    province: "Harare",
                    visitDate: new Date(Date.now() - 86400000 * (6-j)),
                    visitType: "Outpatient",
                    disease: "Routine Health Maintenance",
                    vitalSigns: { ...baselineVitals, temperature: 36.6 + (j*0.01), recordedAt: new Date(Date.now() - 86400000 * (6-j)) },
                    disposition: "Discharged",
                    visitStatus: "Finalized",
                    createdBy: staffId,
                    visitNumber: `BASE-${i}-${j}`
                });
            }
            await MedicalRecord.create(baselines);

            // 2. Create the CRITICAL record
            const criticalVitals = {
                temperature: pathology.vitals.temperature,
                bloodPressure: { systolic: pathology.vitals.systolic, diastolic: pathology.vitals.diastolic },
                heartRate: pathology.vitals.heartRate,
                respiratoryRate: pathology.vitals.resp,
                oxygenSaturation: pathology.vitals.o2,
                recordedAt: new Date()
            };

            const triage = predictTriagePriority(criticalVitals, pathology.symptoms);

            await MedicalRecord.create({
                patientId: p._id,
                hospital: HOSPITAL_NAME,
                province: "Harare",
                visitDate: new Date(),
                visitStatus: "In Admission",
                visitType: "Emergency",
                disease: pathology.disease,
                symptoms: pathology.symptoms,
                vitalSigns: criticalVitals,
                primaryDiagnosis: { name: pathology.disease, notes: "CRITICAL STATUS CONFIRMED" },
                disposition: "Admitted",
                createdBy: staffId,
                visitNumber: `CRIT-FINAL-${i}`
            });

            // 3. Update Patient Clinical Profile
            p.clinicalProfile.triageStatus = {
                priority: triage.priority,
                score: triage.score,
                reasons: triage.reasons,
                color: triage.color,
                lastAssessment: new Date()
            };
            p.clinicalProfile.vitalSigns = criticalVitals;
            
            p.clinicalProfile.anomalyDetection = {
                hasAnomaly: true,
                detectedAt: new Date(),
                severity: "HIGH",
                description: `Acute ${pathology.disease} clinical presentation. Hemodynamic instability detected.`
            };

            await p.save();
        }
        console.log(`✅ Success: 50 patients upgraded to CRITICAL with statistical vital anomalies.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

triggerCriticalData();
