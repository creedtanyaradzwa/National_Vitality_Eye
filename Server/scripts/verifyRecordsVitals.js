const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function verify() {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await MedicalRecord.countDocuments({ vitalSigns: { $exists: false } });
    console.log("Records missing vitals:", count);
    
    const sample = await MedicalRecord.findOne({}).sort({ createdAt: -1 });
    if (sample) {
        console.log("Sample Record Vitals:", JSON.stringify(sample.vitalSigns, null, 2));
    }
    
    process.exit(0);
}
verify();
