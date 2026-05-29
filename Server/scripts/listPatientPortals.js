const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function managePatientPortals() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // 1. Ensure Kudzai Siziba exists
        const kudzaiData = {
            nationalId: "54-912655Q94",
            firstName: "Kudzai",
            lastName: "Siziba",
            dateOfBirth: new Date("2003-05-16"),
            gender: "Male",
            province: "Harare",
            contactInfo: {
                phone: "+263762540203",
                email: "kudzai.siziba@example.com"
            },
            isActive: true
        };

        const kudzaiEmail = "kudzai.siziba@example.com";
        const kudzaiPassword = "Patient@2026";
        const hashedKudzaiPassword = await bcrypt.hash(kudzaiPassword, 10);
        
        await Patient.findOneAndUpdate(
            { nationalId: kudzaiData.nationalId },
            {
                ...kudzaiData,
                portalAccount: {
                    hasAccount: true,
                    email: kudzaiEmail,
                    password: hashedKudzaiPassword,
                    isVerified: true,
                    isActive: true,
                    createdAt: new Date()
                }
            },
            { upsert: true, new: true }
        );
        console.log("✅ Kudzai Siziba account ensured.");

        // 2. List all active portal accounts
        console.log('\n' + '='.repeat(60));
        console.log('📱 PATIENT PORTAL LOGIN DETAILS');
        console.log('='.repeat(60) + '\n');

        const patients = await Patient.find({ "portalAccount.hasAccount": true });
        
        patients.forEach(p => {
            console.log(`👤 ${p.firstName} ${p.lastName}`);
            console.log(`   Email:    ${p.portalAccount.email}`);
            console.log(`   National ID: ${p.nationalId}`);
            if (p.nationalId === "54-912655Q94") {
                console.log(`   Password: ${kudzaiPassword}`);
            } else if (p.portalAccount.email === "patient@example.com") {
                console.log(`   Password: Patient@123`);
            } else {
                console.log(`   Password: (Stored as hash)`);
            }
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

managePatientPortals();