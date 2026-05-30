const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Alert = require("../models/Alert");
const Handover = require("../models/Handover");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * MASTER SIMULATION SCRIPT
 * Generates 50,000+ medical records with deep clinical depth.
 * Anchors Super-Personas at Harare General Hospital.
 */

const provinces = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
    'Mashonaland East', 'Mashonaland West', 'Masvingo',
    'Matabeleland North', 'Matabeleland South', 'Midlands'
];

const provinceCodes = {
    'Harare': 'HRE', 'Bulawayo': 'BYO', 'Manicaland': 'MAN', 'Mashonaland Central': 'MCE',
    'Mashonaland East': 'MEA', 'Mashonaland West': 'MWE', 'Masvingo': 'MSV',
    'Matabeleland North': 'MTN', 'Matabeleland South': 'MTS', 'Midlands': 'MID'
};

const firstNames = ["Tendai", "Chipo", "Farai", "Rudo", "Blessing", "Gift", "Memory", "Patience", "Tapiwa", "Nyasha", "Takudzwa", "Anesu", "Kudzai", "Simba", "Tanaka"];
const lastNames = ["Moyo", "Ndlovu", "Sibanda", "Maphosa", "Dube", "Gumbo", "Zhou", "Nyoni", "Ncube", "Mutasa"];

const HARARE_GENERAL_ID = "HOSP-HRE-G001";
const HARARE_GENERAL_NAME = "Harare General Hospital";

// Helper: Random date within last year
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const lastYear = new Date(); lastYear.setFullYear(lastYear.getFullYear() - 1);

// Helper: Get random items from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function runSimulation() {
    try {
        console.log("🚀 STARTING MASSIVE HEALTH ECOSYSTEM SIMULATION (50,000+ RECORDS)...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        // 1. CLEAR EXISTING NON-ADMIN DATA
        console.log("🗑️  Cleaning clinical datasets...");
        await Patient.deleteMany({});
        await MedicalRecord.deleteMany({});
        await Alert.deleteMany({});
        await Handover.deleteMany({});

        // 2. CREATE SUPER-PERSONAS AT HARARE GENERAL
        console.log("👤 Creating Clinical Super-Personas...");
        const patientPassword = await bcrypt.hash("Patient@2026", 10);
        
        const superPersonas = [
            {
                firstName: "Kudzai", lastName: "Ndlovu", gender: "Male", province: "Harare",
                nationalId: "29-123456-X-01", dob: "1992-05-15", scenario: "Critical"
            },
            {
                firstName: "Farai", lastName: "Moyo", gender: "Male", province: "Harare",
                nationalId: "42-987654-Y-22", dob: "1975-11-10", scenario: "Chronic"
            },
            {
                firstName: "Chipo", lastName: "Sibanda", gender: "Female", province: "Harare",
                nationalId: "18-555444-Z-33", dob: "1998-02-28", scenario: "Community"
            },
            {
                firstName: "Tendai", lastName: "Gumbo", gender: "Female", province: "Harare",
                nationalId: "63-000111-W-99", dob: "2005-08-12", scenario: "Recovery"
            }
        ];

        const personaDocs = [];
        for (const p of superPersonas) {
            const doc = await Patient.create({
                nationalId: p.nationalId,
                firstName: p.firstName,
                lastName: p.lastName,
                dateOfBirth: new Date(p.dob),
                gender: p.gender,
                province: p.province,
                district: "Harare Central",
                contactInfo: { phone: `+26377${Math.floor(1000000 + Math.random() * 8999999)}`, email: `${p.firstName.toLowerCase()}@example.com` },
                portalAccount: {
                    hasAccount: true,
                    email: `${p.firstName.toLowerCase()}@example.com`,
                    password: patientPassword,
                    isActive: true,
                    isVerified: true
                },
                clinicalProfile: { triageStatus: { priority: "STABLE", score: 90, lastAssessment: new Date() } }
            });
            personaDocs.push(doc);
            console.log(`   ✅ Created Persona: ${p.firstName} (${p.scenario})`);
        }

        // 3. GENERATE 5,000 PATIENTS (Background Population)
        console.log("👥 Generating background patient population (5,000)...");
        const backgroundPatients = [];
        const batchSize = 1000;
        for (let i = 0; i < 5; i++) {
            const batch = [];
            for (let j = 0; j < batchSize; j++) {
                const province = randomItem(provinces);
                batch.push({
                    nationalId: `${Math.floor(10 + Math.random() * 80)}-${Math.floor(100000 + Math.random() * 800000)}-${randomItem(['A','B','C','D'])}-${Math.floor(10 + Math.random() * 80)}`,
                    firstName: randomItem(firstNames),
                    lastName: randomItem(lastNames),
                    dateOfBirth: randomDate(new Date(1950, 0, 1), new Date(2015, 0, 1)),
                    gender: randomItem(["Male", "Female"]),
                    province: province,
                    district: `${province} Central`,
                    isActive: true
                });
            }
            const created = await Patient.insertMany(batch);
            backgroundPatients.push(...created.map(p => p._id));
            console.log(`   📦 Batch ${i+1}/5 patients inserted...`);
        }

        // 4. GENERATE 50,000 MEDICAL RECORDS (Massive Depth)
        console.log("📋 Generating 50,000+ medical records with clinical consistency...");
        const allPatientIds = [...backgroundPatients, ...personaDocs.map(p => p._id)];
        
        // Find some staff for Harare General
        const harareStaff = await User.find({ hospitalId: /HRE/ }).limit(5);
        const randomStaff = await User.find({}).limit(100);

        let totalRecords = 0;
        const totalTarget = 52000;
        const recordBatchSize = 2000;

        while (totalRecords < totalTarget) {
            const batch = [];
            for (let k = 0; k < recordBatchSize && totalRecords < totalTarget; k++) {
                const patientId = randomItem(allPatientIds);
                const diseaseObj = randomItem(edliz.data);
                const province = randomItem(provinces);
                const visitDate = randomDate(lastYear, new Date());
                const staff = randomItem(randomStaff);

                // Clinical logic for vitals based on disease
                let temp = 36.5 + Math.random() * 1.0;
                let o2 = 96 + Math.random() * 3;
                let resp = 14 + Math.floor(Math.random() * 6);

                if (diseaseObj.disease === "Malaria" || diseaseObj.disease === "Typhoid Fever") temp = 38.5 + Math.random() * 2;
                if (diseaseObj.disease === "Pneumonia" || diseaseObj.disease === "Asthma") {
                    o2 = 88 + Math.random() * 6;
                    resp = 24 + Math.floor(Math.random() * 10);
                }

                batch.push({
                    patientId,
                    hospital: totalRecords < 5000 ? HARARE_GENERAL_NAME : `${province} Referral Hospital`,
                    province: province,
                    visitDate,
                    disease: diseaseObj.disease,
                    symptoms: diseaseObj.symptoms.split(";").slice(0, 3),
                    vitalSigns: {
                        temperature: temp,
                        bloodPressure: { systolic: 110 + Math.floor(Math.random() * 40), diastolic: 70 + Math.floor(Math.random() * 20) },
                        heartRate: 70 + Math.floor(Math.random() * 40),
                        respiratoryRate: resp,
                        oxygenSaturation: o2,
                        recordedAt: visitDate
                    },
                    primaryDiagnosis: { name: diseaseObj.disease },
                    prescribedMedications: diseaseObj.treatment_drugs.split(";").slice(0, 2),
                    disposition: Math.random() > 0.9 ? "Admitted" : "Discharged",
                    visitStatus: "Finalized",
                    createdBy: staff?._id
                });
                totalRecords++;
            }
            await MedicalRecord.insertMany(batch);
            console.log(`   📈 Inserted ${totalRecords}/${totalTarget} records...`);
        }

        // 5. INJECT OUTBREAK TRIGGER (CHOLERA SPIKE)
        console.log("🚨 Engineering Outbreak Trigger (500 Cholera cases in Harare)...");
        const choleraBatch = [];
        const today = new Date();
        for (let i = 0; i < 500; i++) {
            choleraBatch.push({
                patientId: randomItem(backgroundPatients),
                hospital: HARARE_GENERAL_NAME,
                province: "Harare",
                visitDate: randomDate(new Date(today.getTime() - 48*60*60*1000), today),
                disease: "Cholera",
                symptoms: ["watery diarrhoea", "vomiting", "dehydration"],
                vitalSigns: { temperature: 37.2, bloodPressure: { systolic: 90, diastolic: 60 }, heartRate: 110, respiratoryRate: 22, oxygenSaturation: 97 },
                disposition: "Admitted",
                visitStatus: "Active"
            });
        }
        await MedicalRecord.insertMany(choleraBatch);
        await Alert.create({
            type: "OUTBREAK",
            severity: "CRITICAL",
            disease: "Cholera",
            location: { province: "Harare", district: "Harare Central" },
            message: "Sudden spike in Cholera cases detected in Harare General Hospital vicinity.",
            recommendations: ["Boil all drinking water", "Enforce hand hygiene at entry", "Activate isolation ward"]
        });

        // 6. FINALIZE PERSONAS
        console.log("✨ Finalizing Kudzai's Critical Care data...");
        const kudzai = personaDocs[0];
        // Add current admission
        await MedicalRecord.create({
            patientId: kudzai._id,
            hospital: HARARE_GENERAL_NAME,
            province: "Harare",
            visitDate: new Date(),
            visitStatus: "In Admission",
            disease: "Acute Abdomen",
            symptoms: ["Severe abdominal pain", "Vomiting", "Fever"],
            vitalSigns: { 
                temperature: 38.4, 
                bloodPressure: { systolic: 95, diastolic: 55 },
                heartRate: 115, 
                respiratoryRate: 24,
                oxygenSaturation: 92,
                recordedAt: new Date()
            },
            ivBag: { 
                totalVolume: 1000, 
                currentVolume: 450, 
                fluidType: "Ringer's Lactate", 
                status: "Running", 
                startTime: new Date(),
                dripRate: 125
            },
            investigations: {
                labTests: [
                    { testName: "Full Blood Count", result: "WBC 18.5 (High)", abnormal: true },
                    { testName: "Abdominal X-Ray", result: "Dilated bowel loops", abnormal: true }
                ]
            },
            treatmentPlan: {
                plan: "Urgent surgical consult requested. Maintain IV fluids and monitor vitals Q1H.",
                medications: [
                    { medication: "Ceftriaxone", dosage: "1g", frequency: "BD", route: "IV" },
                    { medication: "Metronidazole", dosage: "500mg", frequency: "TDS", route: "IV" }
                ]
            },
            observations: [
                { timestamp: new Date(), status: "Critical", notes: "Patient experiencing severe rebound tenderness. Guarding present.", vitalSigns: { temperature: 38.4, heartRate: 115, oxygenSaturation: 92 } }
            ]
        });

        // Add Farai's Chronic History
        console.log("✨ Finalizing Farai's Chronic Management...");
        const farai = personaDocs[1];
        const chronicRecords = [];
        for (let i = 0; i < 10; i++) {
            const date = new Date(); date.setMonth(date.getMonth() - (10 - i));
            chronicRecords.push({
                patientId: farai._id,
                hospital: HARARE_GENERAL_NAME,
                province: "Harare",
                visitDate: date,
                disease: "Hypertension",
                vitalSigns: {
                    temperature: 36.6,
                    bloodPressure: { systolic: 140 + i * 2, diastolic: 90 + i },
                    heartRate: 72 + i,
                    recordedAt: date
                },
                prescribedMedications: ["Amlodipine 5mg", "Hydrochlorothiazide 12.5mg"],
                followUp: { required: true, date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), instructions: "Return for BP check in 2 weeks" }
            });
        }
        await MedicalRecord.insertMany(chronicRecords);

        console.log("\n" + "=".repeat(60));
        console.log("🎉 SIMULATION COMPLETE!");
        console.log(`📊 TOTAL RECORDS: ${totalRecords + 500}`);
        console.log(`👤 PATIENTS: 5,004`);
        console.log(`🏥 PRIMARY HUB: ${HARARE_GENERAL_NAME}`);
        console.log("=".repeat(60) + "\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Simulation failed:", error);
        process.exit(1);
    }
}

runSimulation();