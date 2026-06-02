const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const HOSPITAL_NAME = "Harare General Hospital";

// Helper: Random date within last year
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const lastYear = new Date(); lastYear.setFullYear(lastYear.getFullYear() - 1);

// Helper: Get random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function ensureRecords() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("❌ MONGO_URI not found in .env");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        // Find patients at Harare General Hospital
        const patientsAtHarare = await Patient.find({ currentHospital: HOSPITAL_NAME });
        console.log(`🔍 Found ${patientsAtHarare.length} patients at ${HOSPITAL_NAME}`);

        // Get some staff for createdBy/doctorId
        const staff = await User.find({}).limit(10);
        if (staff.length === 0) {
            console.error("❌ No staff members found in DB to assign as record creators.");
            process.exit(1);
        }
        const staffIds = staff.map(s => s._id);

        let totalCreated = 0;
        const RECORDS_PER_PATIENT = 5;

        for (let i = 0; i < patientsAtHarare.length; i++) {
            const patient = patientsAtHarare[i];
            
            console.log(`[${i+1}/${patientsAtHarare.length}] 👤 Patient: ${patient.firstName} ${patient.lastName} - Creating ${RECORDS_PER_PATIENT} comprehensive records...`);

            for (let j = 0; j < RECORDS_PER_PATIENT; j++) {
                await createComprehensiveRecord(patient, j, staffIds);
                totalCreated++;
            }
            
            if (i > 0 && i % 50 === 0) {
                console.log(`   📊 Progress: ${totalCreated} records created so far...`);
            }
        }

        console.log(`\n✅ Finished ensuring records. Total new records created: ${totalCreated}`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

async function createComprehensiveRecord(patient, scenarioIndex, staffIds) {
    const diseaseObj = randomItem(edliz.data);
    const visitDate = randomDate(lastYear, new Date());
    const staffId = randomItem(staffIds);
    const hospitalStaff = await User.findById(staffId);
    const doctorName = hospitalStaff ? `Dr. ${hospitalStaff.lastName}` : "Dr. Zimbabwe";

    // Common fields
    const recordData = {
        patientId: patient._id,
        patientSnapshot: {
            nationalId: patient.nationalId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            ageAtVisit: patient.age,
            contactInfo: patient.contactInfo,
            patientProvince: patient.province,
            district: patient.district,
            ward: patient.ward,
            insuranceInfo: patient.insuranceInfo
        },
        hospital: HOSPITAL_NAME,
        province: patient.province || "Harare",
        visitDate: visitDate,
        visitNumber: `COMP-${Math.floor(100000 + Math.random() * 900000)}`,
        department: randomItem(["Internal Medicine", "Casualty", "Pediatrics", "General Surgery", "Infectious Diseases"]),
        doctorName: doctorName,
        doctorId: staffId,
        disease: diseaseObj.disease,
        symptoms: diseaseObj.symptoms.split(";").map(s => s.trim()).slice(0, 5),
        primaryDiagnosis: {
            name: diseaseObj.disease,
            code: `ICD10-${diseaseObj.disease.substring(0,3).toUpperCase()}`,
            notes: "Patient presents with classic symptoms. Diagnosis confirmed via clinical evaluation."
        },
        vitalSigns: generateVitals(diseaseObj.disease),
        physicalExam: {
            general: "Patient is conscious, oriented, and in mild to moderate distress.",
            headAndNeck: "No lymphadenopathy. Pupils equal and reactive to light.",
            cardiovascular: "Regular heart rate and rhythm. S1, S2 heard. No murmurs.",
            respiratory: "Vesicular breath sounds. No wheezing or crackles noted.",
            abdominal: "Soft, bowel sounds present. No guarding or rebound tenderness.",
            neurological: "Power 5/5 in all limbs. Reflexes normal. Cranial nerves intact.",
            skin: "Normal turgor. No cyanosis or jaundice.",
            musculoskeletal: "Full range of motion in all joints.",
            other: "N/A"
        },
        historyOfPresentIllness: `Patient reports having ${diseaseObj.disease.toLowerCase()} symptoms for several days. Severity has been increasing.`,
        treatmentPlan: {
            plan: "Follow EDLIZ guidelines for management of " + diseaseObj.disease + ".",
            medications: diseaseObj.treatment_drugs.split(";").map(m => ({
                medication: m.trim(),
                dosage: "Standard per protocol",
                frequency: "As directed",
                route: m.toLowerCase().includes("iv") ? "IV" : "Oral",
                duration: "7-10 days",
                notes: "Monitor for side effects."
            })),
            procedures: scenarioIndex === 4 ? [{ procedure: "Emergency Resuscitation", date: visitDate, performedBy: doctorName, outcome: "Stabilized" }] : [],
            lifestyleAdvice: [
                "Strict adherence to medication schedule.",
                "Increase oral fluid intake (2-3 liters per day).",
                "Rest and avoid strenuous activity.",
                "Return immediately if symptoms like high fever or breathing difficulty occur."
            ]
        },
        investigations: {
            labTests: [
                { 
                    testName: "Full Blood Count (FBC)", 
                    orderedDate: visitDate,
                    resultDate: visitDate,
                    result: "WBC: " + (9 + Math.random()*8).toFixed(1) + " x10^9/L, Hb: " + (11 + Math.random()*4).toFixed(1) + " g/dL", 
                    abnormal: Math.random() > 0.6,
                    notes: "Check for infection markers."
                },
                { 
                    testName: "Urea, Electrolytes & Creatinine (U&E)", 
                    orderedDate: visitDate,
                    resultDate: visitDate,
                    result: "Normal", 
                    abnormal: false 
                }
            ],
            radiology: [
                { 
                    studyType: "Chest X-Ray", 
                    bodyPart: "Thorax", 
                    findings: "No active lung lesions. Cardiac silhouette within normal limits.", 
                    impression: "Normal Chest X-Ray", 
                    reportDate: visitDate,
                    orderedBy: doctorName
                }
            ]
        },
        prescribedMedications: diseaseObj.treatment_drugs.split(";").map(m => m.trim()),
        createdBy: staffId,
        visitStatus: "Finalized",
        notes: "COMPREHENSIVE RECORD GENERATED FOR SYSTEM VALIDATION."
    };

    // Scenario specific adjustments
    switch (scenarioIndex) {
        case 0: // Outpatient / Discharged
            recordData.visitType = "Outpatient";
            recordData.disposition = "Discharged";
            recordData.dischargeInstructions = "Take medications as prescribed. Return for follow-up in 1 week.";
            break;
        case 1: // Acute Admission (Short)
            recordData.visitType = "Emergency";
            recordData.disposition = "Admitted";
            recordData.visitStatus = "In Admission";
            recordData.admissionId = `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
            recordData.observations = generateObservations(recordData.vitalSigns, 3, visitDate);
            break;
        case 2: // Prolonged Admission (1 Week)
            recordData.visitType = "Inpatient";
            recordData.disposition = "Admitted";
            recordData.visitStatus = "In Admission";
            recordData.admissionId = `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
            recordData.observations = generateObservations(recordData.vitalSigns, 14, visitDate, 7);
            break;
        case 3: // Discharged after Admission
            const admitDate = new Date(visitDate);
            admitDate.setDate(admitDate.getDate() - 5);
            recordData.visitDate = admitDate;
            recordData.visitType = "Inpatient";
            recordData.disposition = "Discharged";
            recordData.dischargeDate = visitDate;
            recordData.visitStatus = "Finalized";
            recordData.admissionId = `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
            recordData.observations = generateObservations(recordData.vitalSigns, 8, admitDate, 5);
            recordData.dischargeSummary = "Patient showed significant improvement. Vitals stable upon discharge.";
            break;
        case 4: // Emergency / Critical
            recordData.visitType = "Emergency";
            recordData.disposition = "Admitted";
            recordData.visitStatus = "In Admission";
            recordData.admissionId = `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
            recordData.doctorNotes = "CRITICAL CONDITION. Immediate intervention required.";
            recordData.observations = generateObservations(recordData.vitalSigns, 6, visitDate, 1, true);
            break;
    }

    await MedicalRecord.create(recordData);
}

function generateVitals(disease) {
    let temp = 36.5 + Math.random() * 1.0;
    let o2 = 96 + Math.random() * 3;
    let resp = 14 + Math.floor(Math.random() * 6);
    let hr = 70 + Math.floor(Math.random() * 20);

    if (disease === "Malaria" || disease === "Typhoid Fever") temp = 38.5 + Math.random() * 2;
    if (disease === "Pneumonia" || disease === "Asthma") {
        o2 = 88 + Math.random() * 6;
        resp = 24 + Math.floor(Math.random() * 10);
        hr = 90 + Math.floor(Math.random() * 30);
    }
    if (disease === "Cholera") {
        hr = 100 + Math.floor(Math.random() * 40);
        resp = 20 + Math.floor(Math.random() * 10);
    }

    return {
        temperature: parseFloat(temp.toFixed(1)),
        bloodPressure: { 
            systolic: 110 + Math.floor(Math.random() * 40), 
            diastolic: 70 + Math.floor(Math.random() * 20) 
        },
        heartRate: hr,
        respiratoryRate: resp,
        oxygenSaturation: o2,
        recordedAt: new Date()
    };
}

function generateObservations(initialVitals, count, startDate, daysSpan = 1, isCritical = false) {
    const observations = [];
    const msPerObs = (daysSpan * 24 * 60 * 60 * 1000) / count;

    for (let i = 0; i < count; i++) {
        const obsDate = new Date(startDate.getTime() + i * msPerObs);
        
        // Simulating fluctuations
        const fluctuation = () => (Math.random() - 0.5) * 2; // -1 to 1
        
        let status = "Stable";
        if (isCritical) status = i < count / 2 ? "Critical" : "Deteriorating";
        else if (i > count * 0.7) status = "Improving";

        observations.push({
            timestamp: obsDate,
            vitalSigns: {
                temperature: parseFloat((initialVitals.temperature + fluctuation() * 0.5).toFixed(1)),
                bloodPressure: {
                    systolic: initialVitals.bloodPressure.systolic + Math.floor(fluctuation() * 10),
                    diastolic: initialVitals.bloodPressure.diastolic + Math.floor(fluctuation() * 5)
                },
                heartRate: initialVitals.heartRate + Math.floor(fluctuation() * 10),
                respiratoryRate: initialVitals.respiratoryRate + Math.floor(fluctuation() * 3),
                oxygenSaturation: Math.min(100, initialVitals.oxygenSaturation + fluctuation() * 2),
                painScore: Math.floor(Math.random() * 10)
            },
            status: status,
            notes: `Observation log ${i+1}. Patient status: ${status}.`
        });
    }
    return observations;
}

ensureRecords();
