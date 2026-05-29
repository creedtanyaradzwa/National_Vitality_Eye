const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
require("dotenv").config();

async function purgeDataKeepKudzai() {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 PURGING DATA - KEEPING KUDZAI SIZIBA');
    console.log('='.repeat(60) + '\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB\n');

        // 1. First, make sure Kudzai Siziba exists and is correct
        console.log('👤 Ensuring Kudzai Siziba is in the system...');
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

        const kudzai = await Patient.findOneAndUpdate(
            { nationalId: kudzaiData.nationalId },
            kudzaiData,
            { upsert: true, new: true }
        );
        console.log(`✅ Kudzai Siziba verified (ID: ${kudzai._id})\n`);

        // 2. Delete all other patients
        console.log('🗑️  Deleting all other patients...');
        const patientResult = await Patient.deleteMany({ _id: { $ne: kudzai._id } });
        console.log(`✅ Deleted ${patientResult.deletedCount} other patients\n`);

        // 3. Delete all medical records (just in case any were left)
        console.log('🗑️  Deleting all medical records...');
        const mrResult = await MedicalRecord.deleteMany({});
        console.log(`✅ Deleted ${mrResult.deletedCount} medical records\n`);

        // 4. Delete all users except possibly system admin (let's keep the system admin SYS1000 if it exists)
        console.log('🗑️  Deleting all users except system admin...');
        const userResult = await User.deleteMany({ userId: { $ne: "SYS1000" } });
        console.log(`✅ Deleted ${userResult.deletedCount} users\n`);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 OPERATION COMPLETE!');
        console.log('='.repeat(60));
        
        console.log('\n📊 FINAL STATUS:');
        console.log(`   👤 Users: (System Admin preserved)`);
        console.log(`   👤 Patients: 1 (Kudzai Siziba)`);
        console.log(`   📋 Medical records: 0`);
        
        console.log('\n✅ Data purge complete. Only Kudzai Siziba remains.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error purging data:', error);
        process.exit(1);
    }
}

purgeDataKeepKudzai();