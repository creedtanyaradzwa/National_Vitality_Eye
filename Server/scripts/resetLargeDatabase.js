const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
require("dotenv").config();

const provinces = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
    'Mashonaland East', 'Mashonaland West', 'Masvingo',
    'Matabeleland North', 'Matabeleland South', 'Midlands'
];

const provinceCodes = {
    'Harare': 'HRE',
    'Bulawayo': 'BYO',
    'Manicaland': 'MAN',
    'Mashonaland Central': 'MCE',
    'Mashonaland East': 'MEA',
    'Mashonaland West': 'MWE',
    'Masvingo': 'MSV',
    'Matabeleland North': 'MTN',
    'Matabeleland South': 'MTS',
    'Midlands': 'MID'
};

async function resetToEmpty() {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 RESETTING DATABASE - ADMIN ONLY');
    console.log('='.repeat(60) + '\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB\n');

        // ============ CLEAR ALL DATA ============
        console.log('🗑️  Clearing all existing data...');
        await User.deleteMany({});
        await Patient.deleteMany({});
        await MedicalRecord.deleteMany({});
        console.log('✅ All data cleared\n');

        // ============ CREATE ONLY ADMINS ============
        console.log('👑 Creating admin users...');
        
        const adminPassword = await bcrypt.hash("Admin@2026", 10);
        const users = [];

        // 1. Central System Admin
        const sysAdmin = {
            firstName: 'System',
            lastName: 'Administrator',
            email: 'sysadmin@health.gov.zw',
            phoneNumber: '+263771234500',
            employeeId: 'SYS001',
            hospitalName: 'Ministry of Health',
            hospitalId: 'MOH001',
            province: 'Harare',
            position: 'System Administrator',
            userId: 'SYS1000',
            password: adminPassword,
            role: 'admin',
            approvalStatus: 'approved',
            isActive: true
        };
        await User.create(sysAdmin);
        users.push(sysAdmin);
        console.log(`   ✅ ${sysAdmin.userId} | ${sysAdmin.firstName} ${sysAdmin.lastName} | Central Admin`);

        // 2. Provincial Admins (one per province)
        for (const province of provinces) {
            const code = provinceCodes[province];
            const admin = {
                firstName: 'Provincial',
                lastName: 'Admin',
                email: `admin.${province.toLowerCase().replace(/\s+/g, '')}@health.gov.zw`,
                phoneNumber: `+26377${1000 + provinces.indexOf(province)}${Math.floor(100 + Math.random() * 899)}`,
                employeeId: `ADM${code}`,
                hospitalName: `${province} Provincial Hospital`,
                hospitalId: `HOSP${code}`,
                province: province,
                position: 'Provincial Administrator',
                userId: `${code}1000`,
                password: adminPassword,
                role: 'admin',
                approvalStatus: 'approved',
                isActive: true
            };
            await User.create(admin);
            users.push(admin);
            console.log(`   ✅ ${admin.userId} | ${province} Provincial Admin`);
        }

        console.log(`\n✅ Created ${users.length} admin users (1 Central + 10 Provincial)\n`);

        // ============ SUMMARY ============
        console.log('='.repeat(60));
        console.log('🎉 DATABASE RESET COMPLETE!');
        console.log('='.repeat(60));
        
        console.log('\n📊 SUMMARY:');
        console.log(`   👑 Central Admin: 1`);
        console.log(`   👑 Provincial Admins: 10`);
        console.log(`   👤 Patients: 0`);
        console.log(`   📋 Medical records: 0`);
        
        console.log('\n🔑 LOGIN CREDENTIALS:');
        console.log('-'.repeat(40));
        console.log('CENTRAL ADMIN:');
        console.log('   User ID: SYS1000');
        console.log('   Password: Admin@2026');
        console.log('');
        console.log('PROVINCIAL ADMINS:');
        for (const province of provinces) {
            const code = provinceCodes[province];
            console.log(`   • ${code}1000 / Admin@2026 (${province})`);
        }
        
        console.log('\n💡 NEXT STEPS:');
        console.log('   1. Login with SYS1000 or any provincial admin');
        console.log('   2. Manually add patients through the Patients page');
        console.log('   3. Add medical records through the Medical Records page');
        console.log('   4. The AI will learn as you add data');
        
        console.log('\n✅ Database reset complete! Ready for manual data entry.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    }
}

resetToEmpty();