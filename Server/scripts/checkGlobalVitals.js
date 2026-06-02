const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkGlobal() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check one non-HGH patient
    const p = await Patient.findOne({ currentHospital: { $ne: "Harare General Hospital" } });
    if (p) {
        console.log(`Global Check - Patient: ${p.firstName} ${p.lastName} (${p.currentHospital})`);
        console.log(`- Profile Vitals: ${p.clinicalProfile?.vitalSigns ? 'PRESENT' : 'MISSING'}`);
        
        const r = await MedicalRecord.findOne({ patientId: p._id });
        if (r) {
            console.log(`- Record Vitals: ${r.vitalSigns ? 'PRESENT' : 'MISSING'}`);
        }
    }

    // Check if ANY record in the entire DB is missing vitals
    const missingVitals = await MedicalRecord.countDocuments({ vitalSigns: { $exists: false } });
    console.log(`\nTotal Medical Records in DB missing vitals: ${missingVitals}`);

    process.exit(0);
}
checkGlobal();
