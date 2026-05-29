const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
require("dotenv").config();

async function clearMedicalRecords() {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 CLEARING ALL MEDICAL RECORDS');
    console.log('='.repeat(60) + '\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB\n');

        // Check current count
        const countBefore = await MedicalRecord.countDocuments();
        console.log(`📊 Current Medical Records: ${countBefore}`);

        if (countBefore === 0) {
            console.log('ℹ️  No medical records found to clear.');
            process.exit(0);
        }

        console.log('🗑️  Deleting all medical records...');
        const result = await MedicalRecord.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} medical records`);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 OPERATION COMPLETE!');
        console.log('='.repeat(60));
        
        console.log('\n📊 FINAL STATUS:');
        console.log(`   👤 Users: (Preserved)`);
        console.log(`   👤 Patients: (Preserved)`);
        console.log(`   📋 Medical records: 0`);
        
        console.log('\n✅ Database is now clear of medical records. Ready for retraining.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing medical records:', error);
        process.exit(1);
    }
}

clearMedicalRecords();