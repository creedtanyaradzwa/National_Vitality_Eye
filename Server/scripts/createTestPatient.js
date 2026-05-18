const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function createTestPatient() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        const email = "patient@example.com";
        const password = "Patient@123";
        const hashedPassword = await bcrypt.hash(password, 10);
        
        let patient = await Patient.findOne({ "portalAccount.email": email });
        
        if (patient) {
            console.log("Patient already exists, updating password...");
            patient.portalAccount.password = hashedPassword;
            patient.portalAccount.hasAccount = true;
            patient.portalAccount.isVerified = true;
            patient.portalAccount.isActive = true;
        } else {
            // Find an existing patient to upgrade
            patient = await Patient.findOne({ firstName: "Mazvita", lastName: "Ndlovu" });
            
            if (!patient) {
                // Create a new one if not found
                console.log("Mazvita not found, creating new test patient...");
                patient = new Patient({
                    firstName: "Test",
                    lastName: "Patient",
                    nationalId: "TEST-0001-ZIM",
                    dateOfBirth: new Date("1990-01-01"),
                    gender: "Female",
                    province: "Harare",
                    contactInfo: {
                        phone: "+263771112223",
                        address: "123 Test St, Harare"
                    }
                });
            }
            
            patient.portalAccount = {
                hasAccount: true,
                email: email,
                password: hashedPassword,
                isVerified: true,
                isActive: true
            };
        }
        
        await patient.save();
        console.log("\n✅ Test Patient Account Created/Updated!");
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("Name:", `${patient.firstName} ${patient.lastName}`);
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

createTestPatient();