const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function verify() {
    await mongoose.connect(process.env.MONGO_URI);
    const total = await Patient.countDocuments({ currentHospital: "Harare General Hospital" });
    const active = await Patient.countDocuments({ currentHospital: "Harare General Hospital", isActive: { $ne: false } });
    const critical = await Patient.countDocuments({ 
        currentHospital: "Harare General Hospital", 
        "clinicalProfile.triageStatus.priority": "CRITICAL" 
    });
    const anomaly = await Patient.countDocuments({ 
        currentHospital: "Harare General Hospital", 
        "clinicalProfile.anomalyDetection.hasAnomaly": true 
    });

    console.log(`HGH Stats:`);
    console.log(`- Total: ${total}`);
    console.log(`- Active: ${active}`);
    console.log(`- Critical: ${critical}`);
    console.log(`- Anomaly: ${anomaly}`);

    process.exit(0);
}
verify();
