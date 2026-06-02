const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkGranularity() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const chipo = await Patient.findOne({ nationalId: "18-555444-Z-33" });
    if (chipo) {
        console.log(`Chipo Sibanda (18-555444-Z-33):`);
        const records = await MedicalRecord.find({ patientId: chipo._id });
        console.log(`- Total Records: ${records.length}`);
        
        let recordsWithObservations = 0;
        let totalObservations = 0;
        
        records.forEach(r => {
            if (r.observations && r.observations.length > 0) {
                recordsWithObservations++;
                totalObservations += r.observations.length;
                console.log(`  Record ID: ${r._id}, Status: ${r.visitStatus}, Observations: ${r.observations.length}`);
            }
        });
        
        console.log(`- Records with Observations: ${recordsWithObservations}`);
        console.log(`- Total Observations: ${totalObservations}`);
    }

    // Check for any patient with clinicalProfile vitals missing subfields
    const patients = await Patient.find({}).limit(100);
    let missingSubfields = 0;
    patients.forEach(p => {
        const v = p.clinicalProfile?.vitalSigns;
        if (v) {
            if (!v.temperature || !v.bloodPressure || !v.heartRate || !v.respiratoryRate) {
                missingSubfields++;
            }
        }
    });
    console.log(`\nPatients (in first 100) with incomplete clinicalProfile vitals: ${missingSubfields}`);

    process.exit(0);
}
checkGranularity();
