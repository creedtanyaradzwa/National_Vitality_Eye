const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * COMPREHENSIVE ENRICHMENT SCRIPT
 * Populates all fields in clinicalProfile for every patient.
 * Ensures vitals are populated for every record and clinical profile.
 */

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const chronicOptions = [
    { condition: "Hypertension", medications: ["Amlodipine", "Hydrochlorothiazide"], status: "Active" },
    { condition: "Diabetes Type 2", medications: ["Metformin", "Gliclazide"], status: "Active" },
    { condition: "Asthma", medications: ["Salbutamol Inhaler", "Beclomethasone"], status: "Stable" },
    { condition: "HIV/AIDS", medications: ["Tenofovir/Lamivudine/Dolutegravir (TLD)"], status: "Active" },
    { condition: "Chronic Kidney Disease", medications: ["Furosemide"], status: "Monitoring" },
    { condition: "Epilepsy", medications: ["Sodium Valproate", "Carbamazepine"], status: "Controlled" },
    { condition: "Peptic Ulcer Disease", medications: ["Omeprazole"], status: "Intermittent" }
];

const allergyOptions = [
    { allergen: "Penicillin", reaction: "Skin rash, hives", severity: "Moderate" },
    { allergen: "Sulfa Drugs", reaction: "Anaphylaxis", severity: "Severe" },
    { allergen: "Aspirin", reaction: "Wheezing", severity: "Moderate" },
    { allergen: "Latex", reaction: "Contact dermatitis", severity: "Mild" },
    { allergen: "Peanuts", reaction: "Throat swelling", severity: "Severe" }
];

const surgicalProcedures = [
    "Appendectomy", "Cholecystectomy", "Cesarean Section", "Hernia Repair", 
    "Knee Arthroscopy", "Tonsillectomy", "Cataract Surgery"
];

const vaccines = [
    "BCG", "OPV", "DTP-HepB-Hib", "PCV", "Rotavirus", "Measles-Rubella", "HPV", "TD"
];

const specialNeedsOptions = [
    "Visual Impairment", "Hearing Impairment", "Mobility Assistance Required", 
    "Speech Difficulty", "Cognitive Disability"
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

function generateVitals(age, disease) {
    let temp = 36.5 + Math.random() * 0.8;
    let hr = 70 + randomInt(0, 20);
    let o2 = 95 + randomInt(0, 4);
    let sys = 110 + randomInt(0, 30);
    let dia = 70 + randomInt(0, 20);
    let resp = 12 + randomInt(0, 6);

    if (disease === "Malaria" || disease === "Typhoid Fever") temp = 38.2 + Math.random() * 1.5;
    if (disease === "Hypertension") sys += 20;
    if (disease === "Pneumonia") o2 -= 5;
    
    // Pediatric adjustments
    if (age < 5) {
        hr += 30;
        resp = 25 + randomInt(0, 10);
    }

    return {
        temperature: parseFloat(temp.toFixed(1)),
        bloodPressure: { systolic: sys, diastolic: dia },
        heartRate: hr,
        respiratoryRate: resp,
        oxygenSaturation: o2,
        painScore: randomInt(0, 5),
        weight: age < 5 ? 5 + randomInt(0, 15) : 50 + randomInt(0, 50),
        height: age < 5 ? 50 + randomInt(0, 50) : 150 + randomInt(0, 40),
        recordedAt: new Date()
    };
}

async function startEnrichment() {
    try {
        console.log("🚀 STARTING COMPREHENSIVE DATA ENRICHMENT...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        const patients = await Patient.find({});
        console.log(`🔍 Found ${patients.length} patients.`);

        for (let i = 0; i < patients.length; i++) {
            const patient = patients[i];
            const age = patient.age;
            process.stdout.write(`\r🛠️  Enriching patient ${i + 1}/${patients.length}: ${patient.firstName} ${patient.lastName}...`);

            if (!patient.clinicalProfile) patient.clinicalProfile = {};

            // 1. Basic Clinical Info
            patient.clinicalProfile.bloodType = randomItem(bloodTypes);
            
            // 2. Vitals in Profile
            patient.clinicalProfile.vitalSigns = generateVitals(age);

            // 3. Chronic Conditions & Meds
            const numChronic = randomInt(0, 2);
            patient.clinicalProfile.chronicConditions = [];
            patient.clinicalProfile.currentMedications = [];
            for (let j = 0; j < numChronic; j++) {
                const opt = randomItem(chronicOptions);
                if (!patient.clinicalProfile.chronicConditions.some(c => c.condition === opt.condition)) {
                    patient.clinicalProfile.chronicConditions.push({
                        condition: opt.condition,
                        diagnosisDate: randomDate(new Date(2020, 0, 1), new Date()),
                        status: "Active",
                        notes: "Regular follow-up"
                    });
                    opt.medications.forEach(m => {
                        patient.clinicalProfile.currentMedications.push({
                            medication: m,
                            dosage: "Standard",
                            frequency: "Daily",
                            status: "Active",
                            prescribedDate: new Date()
                        });
                    });
                }
            }

            // 4. Allergies
            const numAllergies = Math.random() > 0.7 ? 1 : 0;
            patient.clinicalProfile.allergies = [];
            if (numAllergies > 0) {
                const opt = randomItem(allergyOptions);
                patient.clinicalProfile.allergies.push({ ...opt, status: "Active" });
            }

            // 5. Surgical History
            const numSurgical = Math.random() > 0.8 ? 1 : 0;
            patient.clinicalProfile.surgicalHistory = [];
            if (numSurgical > 0) {
                patient.clinicalProfile.surgicalHistory.push({
                    procedure: randomItem(surgicalProcedures),
                    date: randomDate(new Date(2010, 0, 1), new Date(2023, 0, 1)),
                    surgeon: "Dr. Surgeon",
                    hospital: "Harare General Hospital",
                    notes: "Successful recovery."
                });
            }

            // 6. Immunizations
            patient.clinicalProfile.immunizations = vaccines.slice(0, randomInt(3, 8)).map(v => ({
                vaccine: v,
                dateAdministered: randomDate(new Date(2000, 0, 1), new Date(2020, 0, 1)),
                doseNumber: 1,
                provider: "MoHCC Clinic"
            }));

            // 7. Family History
            patient.clinicalProfile.familyHistory = {
                mother: Math.random() > 0.7 ? ["Hypertension"] : [],
                father: Math.random() > 0.7 ? ["Diabetes"] : [],
                siblings: [],
                other: []
            };

            // 8. Risk Factors
            patient.clinicalProfile.riskFactors = Math.random() > 0.5 ? [{ factor: "Sedentary lifestyle", severity: "Moderate" }] : [];

            // 9. Pregnancy (for females 15-45)
            if (patient.gender === "Female" && age >= 15 && age <= 45) {
                const isPregnant = Math.random() > 0.9;
                patient.clinicalProfile.pregnancyStatus = {
                    isPregnant: isPregnant,
                    gravidity: isPregnant ? randomInt(1, 4) : 0,
                    parity: isPregnant ? randomInt(0, 3) : 0,
                    notes: isPregnant ? "Routine prenatal care." : ""
                };
            }

            // 10. Pediatric (age < 18)
            if (age < 18) {
                patient.clinicalProfile.pediatric = {
                    isPediatric: true,
                    birthWeight: 2.5 + Math.random() * 1.5,
                    developmentalMilestones: ["Walking", "Speaking"]
                };
            }

            // 11. Special Needs
            if (Math.random() > 0.95) {
                patient.clinicalProfile.specialNeeds = [randomItem(specialNeedsOptions)];
            }

            // 12. Anomaly Detection (Simulation)
            patient.clinicalProfile.anomalyDetection = {
                hasAnomaly: Math.random() > 0.98,
                detectedAt: new Date(),
                description: "Unusual fluctuation in heart rate patterns detected by AI.",
                severity: "Moderate"
            };

            await patient.save();
        }

        console.log("\n✅ Patients enriched. Now ensuring vitals for every Medical Record...");

        const records = await MedicalRecord.find({ vitalSigns: { $exists: false } });
        console.log(`🔍 Found ${records.length} records missing vitals. Populating...`);

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const patient = await Patient.findById(record.patientId);
            const age = patient ? patient.age : 30;
            
            record.vitalSigns = generateVitals(age, record.disease);
            await record.save();
            if (i % 100 === 0) process.stdout.write(`\r📋 Record Progress: ${i + 1}/${records.length}...`);
        }

        console.log("\n\n✨ COMPREHENSIVE ENRICHMENT COMPLETE!");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ Error:", err);
        process.exit(1);
    }
}

startEnrichment();
