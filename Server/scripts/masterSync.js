const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Handover = require("../models/Handover");
const User = require("../models/User");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * MASTER FIX AND SYNC SCRIPT
 * This script will run ALL enrichment and scenario generation at once 
 * to ensure the database is in the absolute correct state and nothing is missing.
 */

const HOSPITAL_NAME = "Harare General Hospital";

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const chronicOptions = [
    { condition: "Hypertension", medications: ["Amlodipine", "Hydrochlorothiazide"], status: "Active" },
    { condition: "Diabetes Type 2", medications: ["Metformin", "Gliclazide"], status: "Active" },
    { condition: "Asthma", medications: ["Salbutamol Inhaler", "Beclomethasone"], status: "Stable" },
    { condition: "HIV/AIDS", medications: ["Tenofovir/Lamivudine/Dolutegravir (TLD)"], status: "Active" }
];

const criticalDiseases = [
    { name: "Severe Malaria with Cerebral Complications", symptoms: ["Coma", "Seizures", "Severe Anemia", "Hypoglycemia"] },
    { name: "Septic Shock secondary to Peritonitis", symptoms: ["Severe Abdominal Pain", "Rigid Abdomen", "Hypotension", "Anuria"] },
    { name: "Acute Respiratory Distress Syndrome (ARDS)", symptoms: ["Severe Dyspnea", "Central Cyanosis", "Hypoxia", "Tachypnea"] },
    { name: "Bacterial Meningitis", symptoms: ["Neck Stiffness", "Photophobia", "Projectile Vomiting", "Altered Mentality"] },
    { name: "Eclamptic Fits", symptoms: ["Generalized Seizures", "Extreme Hypertension", "Proteinuria", "Edema"] },
    { name: "Hypovolemic Shock secondary to Massive Hemorrhage", symptoms: ["Exsanguination", "Threadly Pulse", "Cold Clammy Skin", "Extreme Pallor"] }
];

function generateVitals(age, disease) {
    let temp = 36.5 + Math.random() * 0.8;
    let hr = 70 + randomInt(0, 20);
    let o2 = 95 + randomInt(0, 4);
    let sys = 110 + randomInt(0, 30);
    let dia = 70 + randomInt(0, 20);
    let resp = 12 + randomInt(0, 6);

    if (disease?.includes("Malaria") || disease?.includes("Typhoid")) temp = 38.2 + Math.random() * 1.5;
    if (disease?.includes("Shock") || disease?.includes("Sepsis")) {
        sys = 70 + randomInt(0, 20);
        dia = 40 + randomInt(0, 15);
        hr = 110 + randomInt(0, 30);
        o2 = 88 + randomInt(0, 5);
    }
    
    if (age < 5) { hr += 30; resp = 25 + randomInt(0, 10); }
    return {
        temperature: parseFloat(temp.toFixed(1)),
        bloodPressure: { systolic: sys, diastolic: dia },
        heartRate: hr,
        respiratoryRate: resp,
        oxygenSaturation: o2,
        recordedAt: new Date()
    };
}

async function runMasterSync() {
    try {
        console.log("🚀 STARTING MASTER DATABASE SYNC AND ENRICHMENT...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB:", mongoose.connection.name);

        const patients = await Patient.find({});
        console.log(`🔍 Found ${patients.length} patients.`);

        // 0. RE-ANCHOR PATIENTS TO HGH
        console.log("🛠️  Re-anchoring ALL patients to Harare General Hospital...");
        for (let i = 0; i < patients.length; i++) {
            patients[i].currentHospital = HOSPITAL_NAME;
            patients[i].province = "Harare";
            await patients[i].save();
            if (i % 1000 === 0) process.stdout.write(`\r   Progress: ${i}/${patients.length} re-anchored...`);
        }
        console.log("\n✅ Patients Re-anchored.");

        // 1. ENRICH EVERY CLINICAL PROFILE
        console.log("🛠️  Enriching Clinical Profiles...");
        for (let i = 0; i < patients.length; i++) {
            const p = patients[i];
            p.clinicalProfile = {
                bloodType: randomItem(bloodTypes),
                vitalSigns: generateVitals(p.age),
                chronicConditions: [{
                    condition: randomItem(chronicOptions).condition,
                    diagnosisDate: new Date(2022, 0, 1),
                    status: "Active"
                }],
                surgicalHistory: Math.random() > 0.8 ? [{ procedure: "Appendectomy", date: new Date(2020, 5, 12), hospital: HOSPITAL_NAME }] : [],
                immunizations: [{ vaccine: "BCG", dateAdministered: new Date(2000, 1, 1), provider: "MoHCC" }],
                familyHistory: { mother: ["Hypertension"], father: ["Diabetes"] }
            };
            await p.save();
            if (i % 500 === 0) process.stdout.write(`\r   Progress: ${i}/${patients.length} profiles enriched...`);
        }
        console.log("\n✅ Clinical Profiles Enriched.");

        // 2. ENSURE VITALS FOR EVERY RECORD
        console.log("🛠️  Ensuring vitals for all medical records...");
        const recordsMissingVitals = await MedicalRecord.find({ vitalSigns: { $exists: false } }).limit(5000);
        for (let j = 0; j < recordsMissingVitals.length; j++) {
            const r = recordsMissingVitals[j];
            r.vitalSigns = generateVitals(30, r.disease);
            await r.save();
            if (j % 500 === 0) process.stdout.write(`\r   Progress: ${j}/${recordsMissingVitals.length} records updated...`);
        }
        console.log("\n✅ Medical Record Vitals Synced.");

        // 3. ADD 50 CRITICAL TRIAGE CASES TO HGH
        console.log("🛠️  Adding 50 Critical Triage cases to Harare General...");
        const hghPatients = await Patient.find({ currentHospital: HOSPITAL_NAME }).limit(100);
        const staff = await User.find({ hospitalName: HOSPITAL_NAME }).limit(5);
        const staffIds = staff.map(s => s._id);

        let critCount = 0;
        for (let k = 0; k < hghPatients.length && critCount < 50; k++) {
            const p = hghPatients[k];
            if (!p) continue;
            const disease = randomItem(criticalDiseases);
            await MedicalRecord.create({
                patientId: p._id,
                hospital: HOSPITAL_NAME,
                province: "Harare",
                visitDate: new Date(),
                visitStatus: "In Admission",
                visitType: "Emergency",
                disease: disease.name,
                symptoms: disease.symptoms,
                vitalSigns: generateVitals(p.age, disease.name),
                disposition: "Admitted",
                observations: [
                    { timestamp: new Date(Date.now() - 3600000), status: "Critical", notes: "Emergency presentation.", vitalSigns: generateVitals(p.age, disease.name) },
                    { timestamp: new Date(), status: "Critical", notes: "Stabilizing but requires ICU.", vitalSigns: generateVitals(p.age, disease.name) }
                ],
                createdBy: randomItem(staffIds),
                visitNumber: `FINAL-SYNC-CRIT-${critCount}`
            });
            critCount++;
        }
        console.log(`✅ ${critCount} Critical Scenarios Created.`);

        // 4. ADD 5 SHIFT HANDOVERS + 2 TRANSFERS
        console.log("🛠️  Adding Handovers and Transfers...");
        let handoverCount = 0;
        for (let m = 0; m < Math.min(hghPatients.length, 5); m++) {
            const p = hghPatients[m];
            if (!p) continue;
            await Handover.create({
                patientId: p._id,
                creatorId: staffIds[0],
                type: "Shift",
                sourceHospital: HOSPITAL_NAME,
                targetHospital: HOSPITAL_NAME,
                shiftType: "Morning",
                summaryNote: "Patient critical. Monitor vitals every 15 minutes.",
                tasks: [{ description: "Check O2 levels", status: "Pending", priority: "High" }],
                assignedUsers: [staffIds[1] || staffIds[0]]
            });
            handoverCount++;
        }

        let transferCount = 0;
        for (let n = 20; n < Math.min(hghPatients.length, 22); n++) {
            const p = hghPatients[n];
            if (!p) continue;
             await Handover.create({
                patientId: p._id,
                creatorId: staffIds[0],
                type: "Transfer",
                sourceHospital: HOSPITAL_NAME,
                targetHospital: "Parirenyatwa Group of Hospitals",
                summaryNote: "Transfer for neurosurgical evaluation.",
                tasks: [{ description: "Prepare referral form", status: "Pending", priority: "High" }]
            });
            transferCount++;
        }
        console.log(`✅ ${handoverCount} Handovers and ${transferCount} Transfers Created.`);

        console.log("\n✨ MASTER SYNC COMPLETE! DATABASE IS NOW FULLY POPULATED.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Master Sync Error:", err);
        process.exit(1);
    }
}

runMasterSync();
