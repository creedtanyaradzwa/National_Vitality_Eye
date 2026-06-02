const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkHGH() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const hghPatients = await Patient.find({ currentHospital: "Harare General Hospital" }).limit(5);
    console.log(`Checking ${hghPatients.length} sample patients from Harare General Hospital:`);
    
    for (const p of hghPatients) {
        const count = await MedicalRecord.countDocuments({ patientId: p._id });
        const admittedCount = await MedicalRecord.countDocuments({ patientId: p._id, disposition: "Admitted" });
        console.log(`\nPatient: ${p.firstName} ${p.lastName} (${p.nationalId})`);
        console.log(`- Total Records: ${count}`);
        console.log(`- Admitted Records: ${admittedCount}`);
        
        const sampleAdmitted = await MedicalRecord.findOne({ patientId: p._id, disposition: "Admitted" });
        if (sampleAdmitted) {
            console.log(`- Sample Admitted Record (${sampleAdmitted._id}) Observations: ${sampleAdmitted.observations?.length || 0}`);
        }
    }

    process.exit(0);
}
checkHGH();
