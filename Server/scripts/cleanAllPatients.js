const mongoose = require("mongoose");
const Patient = require("../models/Patient");
require("dotenv").config();

async function cleanAllPatients() {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 CLEANING PATIENT DATA - MINIMAL FIELDS ONLY');
    console.log('='.repeat(60) + '\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB\n');

        const patients = await Patient.find({});
        console.log(`📊 Processing ${patients.length} patients...\n`);

        let updatedCount = 0;
        for (const patient of patients) {
            // Keep identification and basic location/contact as requested in the example
            // Clear clinicalProfile and other extraneous data
            patient.clinicalProfile = {
                bloodType: "Unknown",
                chronicConditions: [],
                allergies: [],
                currentMedications: [],
                vitalSigns: {},
                riskFactors: [],
                surgicalHistory: [],
                familyHistory: [],
                immunizations: [],
                pregnancyInfo: { isPregnant: false, antenatalVisits: [] },
                pediatricInfo: {},
                specialNeeds: {},
                triageStatus: { priority: "STABLE", score: 0, reasons: [] }
            };
            
            // Clear insurance and other non-essential fields if needed
            patient.insuranceInfo = {};
            patient.notes = "";
            
            // Ensure identification fields are preserved (Mongoose won't overwrite them if we don't touch them)
            // But let's be explicit about what we ARE keeping based on the "Kudzai" example:
            // National Identifier, Province Sector, First Name, Last Name, Birth Date, Gender, Communication Link (Phone/Email)

            await patient.save();
            updatedCount++;
        }

        console.log(`✅ Successfully updated ${updatedCount} patients.\n`);

        console.log('='.repeat(60));
        console.log('🎉 OPERATION COMPLETE!');
        console.log('='.repeat(60));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning patient data:', error);
        process.exit(1);
    }
}

cleanAllPatients();