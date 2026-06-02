const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Handover = require("../models/Handover");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function verifyDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("=== DATABASE VERIFICATION ===");
        console.log("MONGO_URI:", process.env.MONGO_URI);

        const totalPatients = await Patient.countDocuments({});
        const totalRecords = await MedicalRecord.countDocuments({});
        const hghRecords = await MedicalRecord.countDocuments({ hospital: "Harare General Hospital" });
        const criticalRecords = await MedicalRecord.countDocuments({ disease: /Severe|Septic|ARDS|Meningitis|Eclamptic|Shock|Status|Congestive/i });
        const handovers = await Handover.countDocuments({});

        console.log(`Total Patients: ${totalPatients}`);
        console.log(`Total Medical Records: ${totalRecords}`);
        console.log(`Records at Harare General: ${hghRecords}`);
        console.log(`Critical Triage Records: ${criticalRecords}`);
        console.log(`Total Handovers: ${handovers}`);

        const samplePatient = await Patient.findOne({ "clinicalProfile.bloodType": { $ne: "Unknown" } });
        console.log(`Sample Enriched Patient Profile: ${samplePatient ? 'FOUND' : 'MISSING'}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
verifyDB();
