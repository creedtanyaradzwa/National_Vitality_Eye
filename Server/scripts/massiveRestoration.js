const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const Alert = require("../models/Alert");
const edliz = require("../edliz.json");
const { predictTriagePriority } = require("../utils/triageAI");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const HOSPITAL_NAME = "Harare General Hospital";
const provinces = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
    'Mashonaland East', 'Mashonaland West', 'Masvingo',
    'Matabeleland North', 'Matabeleland South', 'Midlands'
];

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const chronicOptions = [
    { condition: "Hypertension", medications: ["Amlodipine", "Hydrochlorothiazide"] },
    { condition: "Diabetes Type 2", medications: ["Metformin", "Gliclazide"] },
    { condition: "Asthma", medications: ["Salbutamol Inhaler"] },
    { condition: "HIV/AIDS", medications: ["TLD Regimen"] }
];

const superPersonaIds = ["29-123456-X-01", "42-987654-Y-22", "18-555444-Z-33", "63-000111-W-99"];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

function generateVitals(age, type = "normal") {
    let temp = 36.5 + Math.random() * 0.8;
    let hr = 70 + randomInt(0, 15);
    let o2 = 96 + randomInt(0, 3);
    let sys = 115 + randomInt(0, 15);
    let dia = 75 + randomInt(0, 10);
    let resp = 14 + randomInt(0, 4);

    if (type === "critical") {
        temp = 39.5 + Math.random() * 1.5;
        hr = 120 + randomInt(0, 30);
        o2 = 85 + randomInt(0, 5);
        sys = 80 + randomInt(0, 15);
        dia = 45 + randomInt(0, 10);
        resp = 28 + randomInt(0, 8);
    } else if (type === "cholera") {
        temp = 37.0 + Math.random() * 0.5;
        hr = 110 + randomInt(0, 20);
        o2 = 95 + randomInt(0, 3);
        sys = 85 + randomInt(0, 15);
        dia = 50 + randomInt(0, 10);
        resp = 22 + randomInt(0, 6);
    }

    return {
        temperature: parseFloat(temp.toFixed(1)),
        bloodPressure: { systolic: sys, diastolic: dia },
        heartRate: hr,
        respiratoryRate: resp,
        oxygenSaturation: o2,
        recordedAt: new Date()
    };
}

async function runRestoration() {
    try {
        console.log("🚀 STARTING MASSIVE CLINICAL RESTORATION...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        const patients = await Patient.find({});
        const staff = await User.find({ hospitalName: HOSPITAL_NAME }).limit(5);
        const staffIds = staff.map(s => s._id);
        const doctor = staff.find(s => s.role === 'doctor') || staff[0];

        // PHASE 1: Regional Redistribution & PHASE 2: Clinical Enrichment
        console.log("🛠️  Phase 1 & 2: Redistributing and Enriching Clinical Profiles...");
        for (let i = 0; i < patients.length; i++) {
            const p = patients[i];
            
            // Redistribution
            if (superPersonaIds.includes(p.nationalId)) {
                p.currentHospital = HOSPITAL_NAME;
                p.province = "Harare";
            } else {
                if (!p.province || !provinces.includes(p.province)) {
                    p.province = randomItem(provinces);
                }
                p.currentHospital = p.province === "Harare" ? HOSPITAL_NAME : `${p.province} Referral Hospital`;
            }

            // Enrichment
            const chronic = randomItem(chronicOptions);
            p.clinicalProfile = {
                bloodType: randomItem(bloodTypes),
                chronicConditions: [{ condition: chronic.condition, diagnosisDate: new Date(2022, 0, 1), status: "Active" }],
                currentMedications: chronic.medications.map(m => ({ medication: m, dosage: "Standard", frequency: "Daily", status: "Active", prescribedDate: new Date() })),
                allergies: Math.random() > 0.7 ? [{ allergen: "Penicillin", reaction: "Skin rash", severity: "Moderate", status: "Active" }] : [],
                surgicalHistory: Math.random() > 0.8 ? [{ procedure: "Appendectomy", date: new Date(2020, 5, 12), hospital: HOSPITAL_NAME }] : [],
                immunizations: [{ vaccine: "BCG", dateAdministered: new Date(2000, 1, 1), provider: "MoHCC" }, { vaccine: "Polio", dateAdministered: new Date(2000, 2, 1), provider: "MoHCC" }],
                familyHistory: { mother: ["Hypertension"], father: ["Diabetes"] },
                riskFactors: Math.random() > 0.6 ? [{ factor: "Sedentary lifestyle", severity: "Moderate" }] : [],
                specialNeeds: Math.random() > 0.95 ? ["Visual Impairment"] : []
            };

            if (p.gender === "Female" && p.age >= 18 && p.age <= 45) {
                p.clinicalProfile.pregnancyStatus = { isPregnant: Math.random() > 0.9 };
            }
            if (p.age < 18) {
                p.clinicalProfile.pediatric = { isPediatric: true, developmentalMilestones: ["Walking", "Speaking"] };
            }

            await p.save();
            if (i % 1000 === 0) process.stdout.write(`\r   Progress: ${i}/${patients.length} patients processed...`);
        }
        console.log("\n✅ Phase 1 & 2 Complete.");

        // PHASE 3: High-Fidelity Medical Record Generation
        console.log("🛠️  Phase 3: Generating 5 Comprehensive Records per Patient...");
        await MedicalRecord.deleteMany({}); // Start fresh to ensure quality
        
        let totalRecords = 0;
        for (let i = 0; i < patients.length; i++) {
            const p = patients[i];
            const batch = [];
            for (let j = 0; j < 5; j++) {
                const diseaseObj = randomItem(edliz.data);
                const visitDate = randomDate(new Date(2025, 0, 1), new Date());
                const vitals = generateVitals(p.age);
                
                batch.push({
                    patientId: p._id,
                    hospital: p.currentHospital,
                    province: p.province,
                    visitDate,
                    visitType: "Outpatient",
                    visitStatus: "Finalized",
                    disease: diseaseObj.disease,
                    symptoms: diseaseObj.symptoms.split(";").map(s => s.trim()).slice(0, 3),
                    vitalSigns: vitals,
                    primaryDiagnosis: { name: diseaseObj.disease, code: "ICD-10", notes: "Clinically confirmed." },
                    treatmentPlan: {
                        plan: "Follow standard protocol.",
                        medications: diseaseObj.treatment_drugs.split(";").map(m => ({ medication: m.trim(), dosage: "Standard", frequency: "As directed", route: "Oral", duration: "7 days" }))
                    },
                    investigations: {
                        labTests: [{ testName: "FBC", result: "Normal", abnormal: false }],
                        radiology: [{ studyType: "X-Ray", bodyPart: "Chest", findings: "Normal", impression: "Normal", reportDate: visitDate }]
                    },
                    clinicalNotes: { historyOfPresentIllness: "Patient reports mild symptoms.", doctorNotes: "Stable condition.", nursingNotes: "Vitals taken and recorded." },
                    taggedUsers: staffIds,
                    createdBy: randomItem(staffIds),
                    visitNumber: `COMP-${i}-${j}`
                });
            }
            await MedicalRecord.insertMany(batch);
            totalRecords += 5;
            if (i % 500 === 0) process.stdout.write(`\r   Progress: ${totalRecords} records generated...`);
        }
        console.log("\n✅ Phase 3 Complete.");

        // PHASE 4: Critical Triage & Vital Abnormalities (HGH Focus)
        console.log("🛠️  Phase 4: Injecting Critical Triage & Vital Abnormalities...");
        const hghPatients = await Patient.find({ currentHospital: HOSPITAL_NAME }).limit(50);
        for (let i = 0; i < hghPatients.length; i++) {
            const p = hghPatients[i];
            const pathology = { disease: "Severe Sepsis", symptoms: ["High Fever", "Hypotension", "Confusion"] };
            const criticalVitals = generateVitals(p.age, "critical");
            const triage = predictTriagePriority(criticalVitals, pathology.symptoms);

            const obs = [];
            for (let k = 0; k < 15; k++) {
                obs.push({
                    timestamp: new Date(Date.now() - (15 - k) * 3600000),
                    status: k > 10 ? "Deteriorating" : "Critical",
                    vitalSigns: generateVitals(p.age, "critical"),
                    notes: `Continuous monitoring log ${k+1}.`
                });
            }

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
                disposition: "Admitted",
                observations: obs,
                primaryDiagnosis: { name: pathology.disease },
                taggedUsers: staffIds,
                createdBy: doctor._id,
                visitNumber: `CRIT-SCENARIO-${i}`
            });

            p.clinicalProfile.triageStatus = triage;
            p.clinicalProfile.vitalSigns = criticalVitals;
            p.clinicalProfile.anomalyDetection = {
                hasAnomaly: true,
                detectedAt: new Date(),
                severity: "HIGH",
                description: "Acute hemodynamic instability with hyperpyrexia detected. NEWS2 Score: " + triage.score
            };
            await p.save();
        }
        console.log("✅ Phase 4 Complete.");

        // PHASE 5: Regional Cholera Outbreak Simulation
        console.log("🛠️  Phase 5: Simulating Regional Cholera Outbreak (500 cases)...");
        const hararePatients = await Patient.find({ province: "Harare" }).limit(500);
        const choleraRecords = [];
        for (let i = 0; i < hararePatients.length; i++) {
            choleraRecords.push({
                patientId: hararePatients[i]._id,
                hospital: HOSPITAL_NAME,
                province: "Harare",
                visitDate: new Date(),
                visitStatus: "In Admission",
                disease: "Cholera",
                symptoms: ["watery diarrhoea", "vomiting", "severe dehydration"],
                vitalSigns: generateVitals(30, "cholera"),
                disposition: "Admitted",
                createdBy: randomItem(staffIds),
                visitNumber: `OUTBREAK-CHOLERA-${i}`
            });
        }
        await MedicalRecord.insertMany(choleraRecords);

        await Alert.create({
            disease: "Cholera",
            type: "OUTBREAK",
            severity: "CRITICAL",
            location: { province: "Harare", district: "Harare Central" },
            status: "CONFIRMED",
            message: "RAPID OUTBREAK: 500+ confirmed Cholera cases at Harare General Hospital within 24 hours.",
            clinicalJustification: {
                summary: "Epidemic threshold exceeded for Cholera in Harare Central. Case doubling time is less than 48 hours.",
                reasoning: [
                    "Concentrated cluster of patients presenting with pathognomonic rice-water stools.",
                    "Severe hemodynamic collapse observed in 15% of cases.",
                    "Coincident failure in municipal water treatment reported in catchment zone."
                ],
                evidenceBase: "National Critical Pathogen Surveillance Guidelines"
            },
            recommendations: [
                "Establish isolation ward with strict barrier nursing protocols.",
                "Deploy Oral Rehydration Salt (ORS) stations at all facility entrances.",
                "Coordinate with MoHCC for emergency water chlorination in affected wards."
            ]
        });
        console.log("✅ Phase 5 Complete.");

        console.log("\n✨ MASSIVE RESTORATION AND SIMULATION SUCCESSFUL!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Restoration Failed:", err);
        process.exit(1);
    }
}

runRestoration();
