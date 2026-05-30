const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function createKudzaiPortal() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        const nationalId = "54-912655Q94";
        const email = "kudzai.siziba@example.com";
        const password = "Password@2026";
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log("👤 Creating/Updating Kudzai Siziba...");
        const kudzaiData = {
            nationalId: nationalId,
            firstName: "Kudzai",
            lastName: "Siziba",
            dateOfBirth: new Date("2003-05-16"),
            gender: "Male",
            province: "Harare",
            district: "Harare Central",
            ward: "Ward 12",
            contactInfo: {
                phone: "+263762540203",
                email: email
            },
            isActive: true,
            portalAccount: {
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
            },
            clinicalProfile: {
                bloodType: "A+",
                chronicConditions: [{ condition: "None", status: "Inactive" }],
                allergies: [],
                currentMedications: []
            }
        };

        const kudzai = await Patient.findOneAndUpdate(
            { nationalId: nationalId },
            kudzaiData,
            { upsert: true, new: true }
        );

        console.log("\n✅ Patient and Portal Account Recreated!");
        console.log("Name:", kudzai.firstName, kudzai.lastName);
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("National ID:", nationalId);
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

createKudzaiPortal();