const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    const p = await Patient.findOne({ nationalId: { $nin: ["29-123456-X-01", "42-987654-Y-22", "18-555444-Z-33", "63-000111-W-99"] } });
    if (p) {
        console.log("Sample Patient:", p.firstName, p.lastName);
        console.log("Province:", p.province);
        console.log("Current Hospital:", p.currentHospital);
    } else {
        console.log("No background patients found.");
    }
    process.exit(0);
}
debug();
