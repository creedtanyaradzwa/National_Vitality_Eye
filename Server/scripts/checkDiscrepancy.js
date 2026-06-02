const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkChipo() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const chipos = await Patient.find({ 
        firstName: /Chipo/i, 
        lastName: /Sibanda/i 
    });
    
    console.log(`Found ${chipos.length} patients matching "Chipo Sibanda"`);
    
    for (const p of chipos) {
        const count = await MedicalRecord.countDocuments({ patientId: p._id });
        console.log(`Patient ID: ${p._id}, Hospital: ${p.currentHospital}, Records: ${count}`);
        
        const latestRecord = await MedicalRecord.findOne({ patientId: p._id }).sort({ visitDate: -1 });
        if (latestRecord) {
            console.log(`Latest Record Vitals: ${latestRecord.vitalSigns ? 'Present' : 'MISSING'}`);
        }
    }

    const missingVitalsCount = await MedicalRecord.countDocuments({ 
        $or: [
            { vitalSigns: { $exists: false } },
            { "vitalSigns.temperature": { $exists: false } }
        ]
    });
    console.log(`\nTotal Medical Records missing vitals: ${missingVitalsCount}`);

    const totalRecords = await MedicalRecord.countDocuments({});
    console.log(`Total Medical Records in DB: ${totalRecords}`);

    process.exit(0);
}
checkChipo();
