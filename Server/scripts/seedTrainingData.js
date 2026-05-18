const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

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

const hospitalSuffixes = [
    "General Hospital",
    "Medical Center",
    "District Hospital",
    "Central Hospital",
    "Mission Hospital",
    "Family Clinic",
    "Private Hospital",
    "Specialist Clinic",
    "Community Health Center",
    "Referral Hospital"
];

const firstNames = [
    "Tendai", "Chipo", "Farai", "Rudo", "Blessing", "Gift", "Memory", "Patience", 
    "Tapiwa", "Nyasha", "Takudzwa", "Anesu", "Kudzai", "Simba", "Tanaka",
    "Tafadzwa", "Tatenda", "Chengetai", "Munyaradzi", "Shingai", "Vimbai"
];

const lastNames = [
    "Moyo", "Ndlovu", "Sibanda", "Maphosa", "Dube", "Gumbo", "Zhou", "Nyoni", 
    "Ncube", "Mutasa", "Mukucha", "Marere", "Shumba", "Murewa", "Chipadza",
    "Hove", "Siziba", "Mhlanga", "Daka", "Machingura", "Chauke"
];

const generateUserId = (firstName) => {
    const prefix = firstName.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
};

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB');

        const staffPassword = await bcrypt.hash("Staff@2026", 10);
        let totalUsersCreated = 0;

        for (const province of provinces) {
            console.log(`\n🏥 Generating data for ${province}...`);
            const code = provinceCodes[province];

            for (let i = 1; i <= 10; i++) {
                const hospitalId = `HOSP-${code}-${String(i).padStart(3, '0')}`;
                const hospitalName = `${province} ${hospitalSuffixes[i - 1]}`;
                
                // Define staff for this hospital
                const staffRoles = [
                    { role: 'admin', position: 'Hospital Administrator', count: 1 },
                    { role: 'doctor', position: 'Senior Medical Officer', count: 2 },
                    { role: 'nurse', position: 'Registered General Nurse', count: 3 },
                    { role: 'data_entry', position: 'Health Information Clerk', count: 1 },
                    { role: 'viewer', position: 'Medical Student', count: 1 }
                ];

                for (const staffDef of staffRoles) {
                    for (let j = 0; j < staffDef.count; j++) {
                        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${totalUsersCreated}@health.gov.zw`;
                        
                        const user = {
                            firstName,
                            lastName,
                            email,
                            phoneNumber: `+26377${Math.floor(1000000 + Math.random() * 8999999)}`,
                            employeeId: `EMP-${code}-${Math.floor(10000 + Math.random() * 89999)}`,
                            hospitalName,
                            hospitalId,
                            province,
                            position: staffDef.position,
                            userId: generateUserId(firstName),
                            password: staffPassword,
                            role: staffDef.role,
                            approvalStatus: 'approved',
                            isActive: true,
                            approvedAt: new Date()
                        };

                        await User.create(user);
                        totalUsersCreated++;
                    }
                }
                console.log(`   ✅ Hospital: ${hospitalName} (${hospitalId}) - 8 staff members created`);
            }
        }

        console.log(`\n🎉 SEEDING COMPLETE! Total users created: ${totalUsersCreated}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
