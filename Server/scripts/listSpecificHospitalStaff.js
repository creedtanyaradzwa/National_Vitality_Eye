const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

async function listHospitalStaff() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const hospitals = [
            { id: "HOSP-HRE-001", name: "Harare General Hospital" },
            { id: "HOSP-BYO-002", name: "Bulawayo Medical Center" }
        ];

        console.log('\n' + '='.repeat(60));
        console.log('🏥 LOGIN DETAILS FOR SELECTED HOSPITALS');
        console.log('='.repeat(60));
        console.log('COMMON PASSWORD: Staff@2026\n');

        for (const hosp of hospitals) {
            console.log(`📍 ${hosp.name} (${hosp.id})`);
            const staff = await User.find({ hospitalId: hosp.id }).sort({ role: 1 });
            
            staff.forEach(s => {
                console.log(`   [${s.role.toUpperCase()}] ${s.firstName} ${s.lastName}`);
                console.log(`   User ID: ${s.userId}`);
                console.log(`   Email:   ${s.email}\n`);
            });
            console.log('-'.repeat(40));
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listHospitalStaff();