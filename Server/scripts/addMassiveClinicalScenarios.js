const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const Handover = require("../models/Handover");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const HOSPITAL_NAME = "Harare General Hospital";

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const criticalDiseases = [
    { name: "Severe Malaria with Cerebral Complications", symptoms: ["Coma", "Seizures", "Severe Anemia", "Hypoglycemia"] },
    { name: "Septic Shock secondary to Peritonitis", symptoms: ["Severe Abdominal Pain", "Rigid Abdomen", "Hypotension", "Anuria"] },
    { name: "Acute Respiratory Distress Syndrome (ARDS)", symptoms: ["Severe Dyspnea", "Central Cyanosis", "Hypoxia", "Tachypnea"] },
    { name: "Bacterial Meningitis", symptoms: ["Neck Stiffness", "Photophobia", "Projectile Vomiting", "Altered Mentality"] },
    { name: "Eclamptic Fits", symptoms: ["Generalized Seizures", "Extreme Hypertension", "Proteinuria", "Edema"] },
    { name: "Hypovolemic Shock secondary to Massive Hemorrhage", symptoms: ["Exsanguination", "Threadly Pulse", "Cold Clammy Skin", "Extreme Pallor"] },
    { name: "Status Asthmaticus", symptoms: ["Silent Chest on Auscultation", "Inability to Speak", "Exhaustion", "Cyanosis"] },
    { name: "Congestive Heart Failure - New York Heart Association Class IV", symptoms: ["Paroxysmal Nocturnal Dyspnea", "Orthopnea", "Gross Peripheral Edema", "Ascites"] }
];

async function addMassiveScenarios() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        const staff = await User.find({ hospitalName: HOSPITAL_NAME }).limit(10);
        const staffIds = staff.map(s => s._id);
        const doctors = staff.filter(s => s.role === 'doctor');
        
        if (staff.length === 0) {
            console.error("❌ No staff found for Harare General Hospital.");
            process.exit(1);
        }

        // 1. ADD 50 CRITICAL TRIAGE CASES
        console.log("🛠️  Generating 50 Unique Critical Triage Cases...");
        // Get 50 patients who don't already have an active admission at HGH
        const potentialPatients = await Patient.find({ currentHospital: HOSPITAL_NAME }).limit(100);
        
        let criticalCreated = 0;
        for (let i = 0; i < 50; i++) {
            const p = potentialPatients[i % potentialPatients.length];
            const disease = randomItem(criticalDiseases);
            const doctor = randomItem(doctors) || staff[0];

            await MedicalRecord.create({
                patientId: p._id,
                hospital: HOSPITAL_NAME,
                province: "Harare",
                visitDate: new Date(),
                visitStatus: "In Admission",
                visitType: "Emergency",
                disease: disease.name,
                symptoms: disease.symptoms,
                vitalSigns: { 
                    temperature: 38.5 + (Math.random() * 2), 
                    bloodPressure: { systolic: 70 + randomInt(0, 20), diastolic: 40 + randomInt(0, 15) },
                    heartRate: 110 + randomInt(0, 30), 
                    respiratoryRate: 26 + randomInt(0, 10),
                    oxygenSaturation: 82 + randomInt(0, 8),
                    recordedAt: new Date()
                },
                primaryDiagnosis: { name: disease.name, notes: "CRITICAL: Immediate life-saving intervention required." },
                disposition: "Admitted",
                observations: [
                    { 
                        timestamp: new Date(Date.now() - 1800000), 
                        status: "Critical", 
                        notes: `Initial presentation: ${disease.symptoms[0]}. Vitals extremely unstable.`,
                        vitalSigns: { temperature: 39.0, heartRate: 120, oxygenSaturation: 85 }
                    },
                    { 
                        timestamp: new Date(), 
                        status: "Critical", 
                        notes: `Condition deteriorating. ${disease.symptoms[1]} observed. High-flow oxygen and IV vasopressors initiated.`,
                        vitalSigns: { temperature: 39.5, heartRate: 130, oxygenSaturation: 83 }
                    }
                ],
                createdBy: doctor._id,
                visitNumber: `CRIT-MASS-${i}-${Math.floor(Math.random()*1000)}`
            });
            criticalCreated++;
        }
        console.log(`   ✅ Created ${criticalCreated} Critical Triage records.`);

        // 2. ADD 5 SHIFT HANDOVERS
        console.log("🛠️  Generating 5 Internal Shift Handovers...");
        for (let i = 0; i < 5; i++) {
            const p = potentialPatients[i + 50]; // Use next set of patients
            if (!p) continue;
            const creatorId = randomItem(staffIds);
            const assigneeId = staffIds.find(id => id.toString() !== creatorId.toString()) || staffIds[0];

            await Handover.create({
                patientId: p._id,
                creatorId: creatorId,
                type: "Shift",
                sourceHospital: HOSPITAL_NAME,
                targetHospital: HOSPITAL_NAME,
                shiftType: randomItem(["Morning", "Afternoon", "Night"]),
                summaryNote: `Clinical handover for ${p.firstName} ${p.lastName}. Admitted with acute respiratory distress. Stable on oxygen but requires frequent arterial blood gas (ABG) monitoring.`,
                tasks: [
                    { description: "Monitor respiratory rate every 30 mins", status: "Pending", priority: "High" },
                    { description: "Check IV site for phlebitis", status: "Pending", priority: "Medium" },
                    { description: "Administer 10:00 medications", status: "Pending", priority: "High" }
                ],
                assignedUsers: [assigneeId]
            });
        }
        console.log("   ✅ Created 5 Internal Shift Handovers.");

        // 3. ADD 2 INTER-HOSPITAL TRANSFERS
        console.log("🛠️  Generating 2 Inter-Hospital Transfers...");
        const targetHospitals = ["Parirenyatwa Group of Hospitals", "Bulawayo Provincial Hospital"];
        for (let i = 0; i < 2; i++) {
            const p = potentialPatients[i + 55];
            if (!p) continue;
            const creatorId = randomItem(staffIds);

            await Handover.create({
                patientId: p._id,
                creatorId: creator._id,
                type: "Transfer",
                sourceHospital: HOSPITAL_NAME,
                targetHospital: targetHospitals[i],
                summaryNote: `Inter-facility transfer request for ${p.firstName} ${p.lastName}. Patient requires specialist diagnostic imaging and neurosurgical evaluation available at ${targetHospitals[i]}.`,
                tasks: [
                    { description: "Package clinical files and radiology images", status: "Pending", priority: "High" },
                    { description: "Secure ICU-capable ambulance with paramedic support", status: "Pending", priority: "High" }
                ],
                assignedUsers: []
            });
        }
        console.log("   ✅ Created 2 Inter-Hospital Transfers.");

        console.log("\n✨ MASSIVE SCENARIO EXPANSION COMPLETE!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Expansion Error:", err);
        process.exit(1);
    }
}

addMassiveScenarios();
