const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const HOSPITAL_NAME = "Harare General Hospital";

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
    
    if (age < 5) { hr += 30; resp = 25 + randomInt(0, 10); }

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

function generateObservations(initialVitals, count, startDate, daysSpan = 1) {
    const obs = [];
    const msPerObs = (daysSpan * 24 * 60 * 60 * 1000) / count;
    for (let i = 0; i < count; i++) {
        const obsDate = new Date(startDate.getTime() + i * msPerObs);
        const fluctuation = () => (Math.random() - 0.5) * 2;
        obs.push({
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
                painScore: randomInt(0, 10)
            },
            status: randomItem(["Stable", "Improving", "Stable", "Deteriorating"]),
            notes: `Auto-logged vitality check ${i+1}.`
        });
    }
    return obs;
}

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const patients = await Patient.find({ currentHospital: HOSPITAL_NAME });
    console.log(`Found ${patients.length} patients at ${HOSPITAL_NAME}`);

    const staff = await User.find({ hospitalId: /HRE/ }).limit(5);
    const staffIds = staff.length > 0 ? staff.map(s => s._id) : [new mongoose.Types.ObjectId()];

    // 1. DELETE EXISTING RECORDS for these patients
    const patientIds = patients.map(p => p._id);
    const delResult = await MedicalRecord.deleteMany({ patientId: { $in: patientIds } });
    console.log(`Deleted ${delResult.deletedCount} old records for HGH patients.`);

    let totalNewRecords = 0;

    for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        const recordsBatch = [];
        const age = p.age || 30;

        for (let j = 0; j < 10; j++) {
            const diseaseObj = randomItem(edliz.data);
            const visitDate = randomDate(new Date(2025, 0, 1), new Date());
            const vitals = generateVitals(age, diseaseObj.disease);
            const staffId = randomItem(staffIds);
            
            const isAdmitted = j % 3 === 0; // Every 3rd record is an admission

            const record = {
                patientId: p._id,
                hospital: HOSPITAL_NAME,
                province: "Harare",
                visitDate,
                visitType: isAdmitted ? "Inpatient" : "Outpatient",
                visitStatus: "Finalized",
                disease: diseaseObj.disease,
                symptoms: diseaseObj.symptoms.split(";").map(s => s.trim()).slice(0, 4),
                vitalSigns: vitals,
                primaryDiagnosis: { name: diseaseObj.disease },
                disposition: isAdmitted ? "Admitted" : "Discharged",
                observations: isAdmitted ? generateObservations(vitals, 12, visitDate, 3) : [],
                createdBy: staffId,
                visitNumber: `REFIX-${i}-${j}-${Math.floor(Math.random()*1000)}`
            };
            recordsBatch.push(record);
        }

        await MedicalRecord.insertMany(recordsBatch);
        totalNewRecords += recordsBatch.length;

        // Update clinical profile vitals to latest
        p.clinicalProfile.vitalSigns = recordsBatch[9].vitalSigns;
        await p.save();

        if (i % 100 === 0) process.stdout.write(`\rProgress: ${i+1}/${patients.length} patients processed...`);
    }

    console.log(`\n\nDONE! Created ${totalNewRecords} high-granularity records.`);
    process.exit(0);
}

run();
