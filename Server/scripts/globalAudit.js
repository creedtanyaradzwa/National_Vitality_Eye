const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function globalAudit() {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Starting global record count audit...");
    
    const patients = await Patient.find({}).select('_id firstName lastName nationalId');
    let oneRecordCount = 0;
    let zeroRecordCount = 0;
    
    for (let i = 0; i < patients.length; i++) {
        const count = await MedicalRecord.countDocuments({ patientId: patients[i]._id });
        if (count === 1) {
            oneRecordCount++;
            if (oneRecordCount < 10) {
                console.log(`[1 RECORD] ${patients[i].firstName} ${patients[i].lastName} (${patients[i].nationalId})`);
            }
        } else if (count === 0) {
            zeroRecordCount++;
            if (zeroRecordCount < 10) {
                console.log(`[0 RECORDS] ${patients[i].firstName} ${patients[i].lastName} (${patients[i].nationalId})`);
            }
        }
        
        if (i > 0 && i % 1000 === 0) {
            process.stdout.write(`\rAudited ${i}/${patients.length} patients...`);
        }
    }
    
    console.log(`\n\nAudit Complete:`);
    console.log(`Total Patients: ${patients.length}`);
    console.log(`Patients with exactly 1 record: ${oneRecordCount}`);
    console.log(`Patients with 0 records: ${zeroRecordCount}`);

    process.exit(0);
}
globalAudit();
