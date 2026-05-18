const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function listPatients() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("❌ MONGO_URI not found in .env");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        const patients = await Patient.find({ 
            'portalAccount.hasAccount': true 
        }).select('firstName lastName portalAccount.email portalAccount.isVerified');
        
        console.log("\n=== PATIENTS WITH PORTAL ACCOUNTS ===");
        console.log("Count:", patients.length);
        
        patients.forEach(p => {
            console.log("\n---");
            console.log("Name:", `${p.firstName} ${p.lastName}`);
            console.log("Email:", p.portalAccount?.email);
            console.log("Is Verified:", p.portalAccount?.isVerified);
        });
        
        if (patients.length === 0) {
            console.log("\n⚠️ No patients with portal accounts found.");
            
            const allPatients = await Patient.find({}).limit(5);
            console.log("\nTotal patients in DB:", await Patient.countDocuments());
            if (allPatients.length > 0) {
                console.log("\nRecent patients (no portal account):");
                allPatients.forEach(p => {
                    console.log(`- ${p.firstName} ${p.lastName} (ID: ${p.nationalId})`);
                });
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

listPatients();