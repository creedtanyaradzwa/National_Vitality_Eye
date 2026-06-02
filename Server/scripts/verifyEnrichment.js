const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function verify() {
    await mongoose.connect(process.env.MONGO_URI);
    const p = await Patient.findOne({ "clinicalProfile.bloodType": { $ne: "Unknown" } });
    if (p) {
        console.log("=== ENRICHED PATIENT CLINICAL PROFILE ===");
        console.log(JSON.stringify(p.clinicalProfile, null, 2));
    } else {
        console.log("No enriched patient found.");
    }
    process.exit(0);
}
verify();
