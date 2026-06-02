const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function deepCheck() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // 1. Check for patients with missing vitals in clinicalProfile
    const missingProfileVitals = await Patient.countDocuments({
        $or: [
            { "clinicalProfile.vitalSigns": { $exists: false } },
            { "clinicalProfile.vitalSigns.temperature": { $exists: false } }
        ]
    });
    console.log(`Patients missing vitals in clinicalProfile: ${missingProfileVitals}`);

    // 2. Check for patients with only 1 record
    const oneRecordPatients = [];
    const patients = await Patient.find({}).limit(1000); // Check first 1000
    for (const p of patients) {
        const count = await MedicalRecord.countDocuments({ patientId: p._id });
        if (count === 1) {
            oneRecordPatients.push({ id: p._id, name: `${p.firstName} ${p.lastName}`, hospital: p.currentHospital });
        }
    }
    console.log(`Found ${oneRecordPatients.length} patients with exactly 1 record (in first 1000 checked)`);
    if (oneRecordPatients.length > 0) {
        console.log("Sample 1-record patient:", oneRecordPatients[0]);
    }

    // 3. Search for Chipo Sibanda in clinicalProfile fields
    const chipo = await Patient.findOne({ firstName: /Chipo/i, lastName: /Sibanda/i }).sort({ updatedAt: -1 });
    if (chipo) {
        console.log("\nSample Chipo Sibanda Clinical Profile:");
        console.log(JSON.stringify(chipo.clinicalProfile, null, 2));
    }

    process.exit(0);
}
deepCheck();
