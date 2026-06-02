const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function fixDistribution() {
    await mongoose.connect(process.env.MONGO_URI);
    const superPersonaIds = ["29-123456-X-01", "42-987654-Y-22", "18-555444-Z-33", "63-000111-W-99"];
    
    const patients = await Patient.find({});
    console.log(`Fixing distribution for ${patients.length} patients...`);

    for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        if (superPersonaIds.includes(p.nationalId)) {
            p.currentHospital = "Harare General Hospital";
            p.province = "Harare";
        } else {
            // Correct the logic to use province for referral hospital
            p.currentHospital = p.province === "Harare" ? "Harare General Hospital" : `${p.province} Referral Hospital`;
        }
        await p.save();
        if (i % 1000 === 0) process.stdout.write(`\rProgress: ${i}/${patients.length}...`);
    }
    console.log("\nDistribution Fixed.");
    process.exit(0);
}
fixDistribution();
