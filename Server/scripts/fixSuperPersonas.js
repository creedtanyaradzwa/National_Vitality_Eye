const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const superPersonaIds = [
    "29-123456-X-01", // Kudzai
    "42-987654-Y-22", // Farai
    "18-555444-Z-33", // Chipo
    "63-000111-W-99"  // Tendai
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
    if (age < 5) { hr += 30; resp = 25 + randomInt(0, 10); }
    return {
        temperature: parseFloat(temp.toFixed(1)),
        bloodPressure: { systolic: sys, diastolic: dia },
        heartRate: hr,
        respiratoryRate: resp,
        oxygenSaturation: o2,
        painScore: randomInt(0, 5),
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

async function fixSuperPersonas() {
    await mongoose.connect(process.env.MONGO_URI);
    const staff = await User.find({}).limit(5);
    const staffIds = staff.map(s => s._id);

    for (const nationalId of superPersonaIds) {
        const p = await Patient.findOne({ nationalId });
        if (!p) continue;
        
        console.log(`Fixing Super Persona: ${p.firstName} ${p.lastName}...`);
        
        // Delete old records
        await MedicalRecord.deleteMany({ patientId: p._id });
        
        const records = [];
        const age = p.age || 30;
        
        for (let j = 0; j < 15; j++) { // 15 records each
            const diseaseObj = randomItem(edliz.data);
            const visitDate = randomDate(new Date(2025, 0, 1), new Date());
            const vitals = generateVitals(age, diseaseObj.disease);
            const isAdmitted = j % 2 === 0; // 50% admissions

            records.push({
                patientId: p._id,
                hospital: p.currentHospital || "General Referral",
                province: p.province,
                visitDate,
                visitType: isAdmitted ? "Inpatient" : "Outpatient",
                visitStatus: "Finalized",
                disease: diseaseObj.disease,
                vitalSigns: vitals,
                disposition: isAdmitted ? "Admitted" : "Discharged",
                observations: isAdmitted ? generateObservations(vitals, 20, visitDate, 5) : [],
                createdBy: randomItem(staffIds),
                visitNumber: `SUPER-${nationalId}-${j}`
            });
        }
        await MedicalRecord.insertMany(records);
        
        p.clinicalProfile.vitalSigns = records[14].vitalSigns;
        await p.save();
        console.log(`- Created 15 records for ${p.firstName} with 20 observations each for admissions.`);
    }
    process.exit(0);
}

fixSuperPersonas();
