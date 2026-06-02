const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function targetedCheck() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // 1. Check the specific Super-Persona Chipo Sibanda
    const targetChipo = await Patient.findOne({ nationalId: "18-555444-Z-33" });
    if (targetChipo) {
        const count = await MedicalRecord.countDocuments({ patientId: targetChipo._id });
        console.log(`Super-Persona Chipo Sibanda (18-555444-Z-33):`);
        console.log(`- ID: ${targetChipo._id}`);
        console.log(`- Records: ${count}`);
    } else {
        console.log("Super-Persona Chipo Sibanda (18-555444-Z-33) NOT FOUND.");
    }

    // 2. Check for patients with 0 records
    const noRecordCount = 0;
    const patients = await Patient.find({}).select('_id');
    let patientsWithZeroRecords = 0;
    
    // Check first 500 patients for 0 records to be efficient
    for (let i = 0; i < Math.min(patients.length, 500); i++) {
        const count = await MedicalRecord.countDocuments({ patientId: patients[i]._id });
        if (count === 0) patientsWithZeroRecords++;
    }
    console.log(`Patients with 0 records (in first 500 checked): ${patientsWithZeroRecords}`);

    // 3. Global check for any record missing vitals.temperature specifically
    const missingTemp = await MedicalRecord.countDocuments({ "vitalSigns.temperature": { $exists: false } });
    console.log(`Total Medical Records missing temperature: ${missingTemp}`);

    process.exit(0);
}
targetedCheck();
