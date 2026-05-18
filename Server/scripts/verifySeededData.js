const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function verifyData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB');

        const totalUsers = await User.countDocuments();
        console.log(`\nTotal users in database: ${totalUsers}`);

        const roles = ['admin', 'doctor', 'nurse', 'data_entry', 'viewer'];
        console.log('\nUsers by role:');
        for (const role of roles) {
            const count = await User.countDocuments({ role });
            console.log(`- ${role}: ${count}`);
        }

        const provinces = [
            'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
            'Mashonaland East', 'Mashonaland West', 'Masvingo',
            'Matabeleland North', 'Matabeleland South', 'Midlands'
        ];
        console.log('\nUsers by province:');
        for (const province of provinces) {
            const count = await User.countDocuments({ province });
            console.log(`- ${province}: ${count}`);
        }

        const hospitals = await User.distinct('hospitalId');
        console.log(`\nTotal unique hospitals: ${hospitals.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying data:', error);
        process.exit(1);
    }
}

verifyData();
