const mongoose = require("mongoose");
const Alert = require("../models/Alert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const alert = await Alert.findOne({ "clinicalJustification.summary": { $exists: true } });
    if (alert) {
        console.log("=== ALERT CLINICAL JUSTIFICATION ===");
        console.log(`Disease: ${alert.disease}`);
        console.log(`Summary: ${alert.clinicalJustification.summary}`);
        console.log("Reasoning:");
        alert.clinicalJustification.reasoning.forEach(r => console.log(`- ${r}`));
        console.log(`Evidence Base: ${alert.clinicalJustification.evidenceBase}`);
    } else {
        console.log("No alert with clinical justification found.");
    }
    process.exit(0);
}
check();
