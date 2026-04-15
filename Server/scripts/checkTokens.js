const mongoose = require("mongoose");
const Patient = require("../models/Patient");
require("dotenv").config();

async function checkTokens() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        const patients = await Patient.find({ 
            'portalAccount.verificationToken': { $exists: true } 
        });
        
        console.log("\n=== PATIENTS WITH VERIFICATION TOKENS ===");
        console.log("Count:", patients.length);
        
        patients.forEach(p => {
            console.log("\n---");
            console.log("Patient:", p.firstName, p.lastName);
            console.log("Email:", p.portalAccount?.email);
            console.log("Token:", p.portalAccount?.verificationToken);
            console.log("Expires:", p.portalAccount?.verificationExpires);
            console.log("Is Verified:", p.portalAccount?.isVerified);
        });
        
        if (patients.length === 0) {
            console.log("\n⚠️ No patients with verification tokens found!");
            console.log("This means the token wasn't saved during registration.");
        }
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkTokens();