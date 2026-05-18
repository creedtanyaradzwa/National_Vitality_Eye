const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function createPortalForRufaro() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        const nationalId = "19-048670Y39";
        const email = "rufaro.hove@example.com";
        const password = "Patient@2026";
        const hashedPassword = await bcrypt.hash(password, 10);
        
        let patient = await Patient.findOne({ nationalId: nationalId });
        
        if (!patient) {
            console.error(`❌ Patient with National ID ${nationalId} not found!`);
            process.exit(1);
        }

        console.log(`Found patient: ${patient.firstName} ${patient.lastName}`);
        
        patient.portalAccount = {
            hasAccount: true,
            email: email,
            password: hashedPassword,
            isVerified: true,
            isActive: true,
            createdAt: new Date(),
            auditLog: [{
                action: "Portal account created via script",
                timestamp: new Date()
            }]
        };
        
        await patient.save();
        
        console.log("\n✅ Portal Account Created for Rufaro Hove!");
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("National ID:", nationalId);
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

createPortalForRufaro();