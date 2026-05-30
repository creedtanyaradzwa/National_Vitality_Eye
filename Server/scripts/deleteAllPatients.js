const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Alert = require("../models/Alert");
const Handover = require("../models/Handover");
const CitizenReport = require("../models/CitizenReport");

async function deleteAllPatients() {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 DELETING ALL CLINICAL & PATIENT DATA');
    console.log('='.repeat(60) + '\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB\n');

        // Delete all patients
        const patientResult = await Patient.deleteMany({});
        console.log(`🗑️  Deleted ${patientResult.deletedCount} patients`);

        // Delete all medical records
        const mrResult = await MedicalRecord.deleteMany({});
        console.log(`🗑️  Deleted ${mrResult.deletedCount} medical records`);

        // Delete all alerts
        const alertResult = await Alert.deleteMany({});
        console.log(`🗑️  Deleted ${alertResult.deletedCount} alerts`);

        // Delete all handovers
        const handoverResult = await Handover.deleteMany({});
        console.log(`🗑️  Deleted ${handoverResult.deletedCount} handovers`);

        // Delete all citizen reports
        const citizenResult = await CitizenReport.deleteMany({});
        console.log(`🗑️  Deleted ${citizenResult.deletedCount} citizen reports\n`);

        console.log('✅ Database cleared of all patient-related clinical data.\n');

        console.log('='.repeat(60));
        console.log('🎉 OPERATION COMPLETE!');
        console.log('='.repeat(60));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

deleteAllPatients();