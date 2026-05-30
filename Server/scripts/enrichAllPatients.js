const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * ENRICH ALL PATIENTS SCRIPT
 * Generates very comprehensive, high-fidelity medical records and clinical profiles
 * for ALL patients in the database.
 */

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

const familyHistoryOptions = [
    "Hypertension in both parents",
    "Diabetes Type 2 (Maternal)",
    "Breast Cancer (Paternal Aunt)",
    "Sickle Cell Trait",
    "Heart Disease (Father)",
    "Stroke (Grandparents)"
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function enrichAllPatients() {
    try {
        console.log("🚀 STARTING COMPREHENSIVE PATIENT ENRICHMENT...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        const patients = await Patient.find({});
        console.log(`🔍 Found ${patients.length} patients to enrich.`);

        const staff = await User.find({ role: { $in: ['doctor', 'nurse', 'admin'] } });
        if (staff.length === 0) {
            console.error("❌ No staff members found to assign as record creators. Run seed script first.");
            process.exit(1);
        }

        let totalRecordsCreated = 0;
        const lastYear = new Date(); lastYear.setFullYear(lastYear.getFullYear() - 1);
        const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        for (let i = 0; i < patients.length; i++) {
            const patient = patients[i];
            process.stdout.write(`\r🛠️  Enriching patient ${i + 1}/${patients.length}: ${patient.firstName} ${patient.lastName}...`);

            // 1. Enrich Clinical Profile
            const numChronic = randomInt(0, 3);
            const selectedChronic = [];
            for (let j = 0; j < numChronic; j++) {
                const opt = randomItem(chronicOptions);
                if (!selectedChronic.some(c => c.condition === opt.condition)) {
                    selectedChronic.push({
                        condition: opt.condition,
                        diagnosisDate: randomDate(twoYearsAgo, lastYear),
                        status: opt.status,
                        severity: randomItem(["Mild", "Moderate", "Severe"]),
                        notes: "Managed at local clinic."
                    });
                }
            }

            const numAllergies = randomInt(0, 2);
            const selectedAllergies = [];
            for (let j = 0; j < numAllergies; j++) {
                const opt = randomItem(allergyOptions);
                if (!selectedAllergies.some(a => a.allergen === opt.allergen)) {
                    selectedAllergies.push({
                        ...opt,
                        notes: "Known allergy reported by patient."
                    });
                }
            }

            const meds = selectedChronic.flatMap(c => {
                const opt = chronicOptions.find(o => o.condition === c.condition);
                return opt ? opt.medications : [];
            });

            if (!patient.clinicalProfile) {
                patient.clinicalProfile = {
                    triageStatus: {
                        priority: "STABLE",
                        score: 90,
                        lastAssessment: new Date()
                    }
                };
            }

            patient.clinicalProfile.chronicConditions = selectedChronic;
            patient.clinicalProfile.allergies = selectedAllergies;
            patient.clinicalProfile.currentMedications = meds.map(m => ({ 
                medication: m, 
                dosage: "As prescribed", 
                frequency: "Daily", 
                status: "Active",
                prescribedDate: randomDate(lastYear, new Date())
            }));
            patient.clinicalProfile.familyHistory = {
                mother: Math.random() > 0.5 ? [randomItem(familyHistoryOptions)] : [],
                father: Math.random() > 0.5 ? [randomItem(familyHistoryOptions)] : [],
                siblings: Math.random() > 0.8 ? [randomItem(familyHistoryOptions)] : [],
                notes: "Family history collected during initial intake."
            };
            patient.clinicalProfile.riskFactors = Math.random() > 0.5 ? [
                { factor: "Sedentary lifestyle", severity: "Moderate", notes: "Patient advised on regular exercise.", details: "Lack of regular physical activity reported." },
                { factor: "High salt intake", severity: "High", notes: "Advised on low-sodium diet.", details: "Patient consumes processed foods frequently." }
            ] : [];

            await patient.save();

            // 2. Add 5-8 Detailed Medical Records
            const numRecords = randomInt(5, 8);
            const records = [];
            for (let j = 0; j < numRecords; j++) {
                const diseaseObj = randomItem(edliz.data);
                const creator = randomItem(staff);
                const visitDate = randomDate(lastYear, new Date());
                const visitType = randomItem(["Outpatient", "Emergency", "Follow-up", "Consultation"]);
                
                // Realistic vitals based on disease
                let temp = 36.5 + Math.random() * 0.8;
                let hr = 70 + randomInt(0, 20);
                let o2 = 95 + randomInt(0, 4);
                let sys = 110 + randomInt(0, 30);
                let dia = 70 + randomInt(0, 20);

                if (diseaseObj.disease === "Malaria" || diseaseObj.disease === "Typhoid Fever") temp = 38.2 + Math.random() * 1.5;
                if (diseaseObj.disease === "Hypertension") sys += 20;
                if (diseaseObj.disease === "Pneumonia") o2 -= 5;

                records.push({
                    patientId: patient._id,
                    patientSnapshot: {
                        nationalId: patient.nationalId,
                        firstName: patient.firstName,
                        lastName: patient.lastName,
                        dateOfBirth: patient.dateOfBirth,
                        gender: patient.gender,
                        ageAtVisit: patient.age,
                        patientProvince: patient.province
                    },
                    hospital: creator.hospitalName || "National Health Center",
                    province: patient.province,
                    department: randomItem(["Internal Medicine", "Outpatient", "General Practice", "Emergency"]),
                    doctorName: `${creator.firstName} ${creator.lastName}`,
                    doctorId: creator._id,
                    visitDate,
                    visitType,
                    visitStatus: "Finalized",
                    disease: diseaseObj.disease,
                    symptoms: diseaseObj.symptoms.split(";").map(s => s.trim()).slice(0, 4),
                    vitalSigns: {
                        temperature: temp,
                        bloodPressure: { systolic: sys, diastolic: dia },
                        heartRate: hr,
                        respiratoryRate: 16 + randomInt(0, 6),
                        oxygenSaturation: o2,
                        painScore: randomInt(0, 5),
                        weight: 60 + randomInt(0, 30),
                        height: 150 + randomInt(0, 40),
                        recordedAt: visitDate
                    },
                    presentingComplaints: diseaseObj.symptoms.split(";").slice(0, 2).map(s => ({
                        symptom: s.trim(),
                        duration: `${randomInt(1, 7)} days`,
                        severity: randomInt(1, 10)
                    })),
                    physicalExam: {
                        general: "Patient appears stable, well hydrated.",
                        cardiovascular: hr > 100 ? "Tachycardic, no murmurs." : "S1, S2 heard, normal rate and rhythm.",
                        respiratory: o2 < 94 ? "Crepitations heard in lower lobes." : "Clear to auscultation bilaterally.",
                        abdominal: "Soft, non-tender, no organomegaly.",
                        neurological: "Alert and oriented x3."
                    },
                    primaryDiagnosis: {
                        name: diseaseObj.disease,
                        notes: "Diagnosis based on clinical presentation and guidelines."
                    },
                    treatmentPlan: {
                        plan: `Start ${diseaseObj.treatment_drugs.split(";")[0]}. Monitor progress.`,
                        medications: diseaseObj.treatment_drugs.split(";").slice(0, 2).map(m => ({
                            medication: m.trim(),
                            dosage: "As per guidelines",
                            frequency: "Daily",
                            route: "Oral",
                            duration: "7 days"
                        })),
                        lifestyleAdvice: ["Increase fluid intake", "Rest well", "Complete full course of medication"]
                    },
                    investigations: {
                        labTests: [
                            { testName: "Full Blood Count", result: "Normal", orderedDate: visitDate },
                            { testName: "Rapid Diagnostic Test", result: "Consistent with diagnosis", orderedDate: visitDate }
                        ]
                    },
                    observations: [
                        { 
                            timestamp: visitDate, 
                            status: "Stable", 
                            notes: "Initial assessment complete.",
                            vitalSigns: { temperature: temp, heartRate: hr, oxygenSaturation: o2 }
                        }
                    ],
                    disposition: "Discharged",
                    createdBy: creator._id
                });
            }

            await MedicalRecord.insertMany(records);
            totalRecordsCreated += records.length;
        }

        console.log(`\n\n✨ ENRICHMENT COMPLETE!`);
        console.log(`📊 TOTAL PATIENTS ENRICHED: ${patients.length}`);
        console.log(`📋 TOTAL RECORDS CREATED: ${totalRecordsCreated}`);
        console.log(`🏥 HIGH-FIDELITY DATA GENERATED SUCCESSFULLY.`);

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Enrichment failed:", error);
        process.exit(1);
    }
}

enrichAllPatients();