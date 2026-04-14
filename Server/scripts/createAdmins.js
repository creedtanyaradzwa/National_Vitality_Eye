const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

const admins = [
    { firstName: "SYS", lastName: "ADMIN", email: "sys.admin@health.gov.zw", phoneNumber: "+263771234501", employeeId: "ADMIN001", hospitalName: "Ministry of Health", hospitalId: "MOH001", province: "Harare", position: "System Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "HRE001", email: "admin.hre@health.gov.zw", phoneNumber: "+263771234502", employeeId: "ADMIN002", hospitalName: "Harare Central Hospital", hospitalId: "HOSP001", province: "Harare", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "BYO001", email: "admin.byo@health.gov.zw", phoneNumber: "+263771234503", employeeId: "ADMIN003", hospitalName: "Bulawayo Central Hospital", hospitalId: "HOSP002", province: "Bulawayo", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MAN001", email: "admin.man@health.gov.zw", phoneNumber: "+263771234504", employeeId: "ADMIN004", hospitalName: "Mutare Provincial Hospital", hospitalId: "HOSP003", province: "Manicaland", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MCE001", email: "admin.mce@health.gov.zw", phoneNumber: "+263771234505", employeeId: "ADMIN005", hospitalName: "Bindura Provincial Hospital", hospitalId: "HOSP004", province: "Mashonaland Central", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MEA001", email: "admin.mea@health.gov.zw", phoneNumber: "+263771234506", employeeId: "ADMIN006", hospitalName: "Marondera Provincial Hospital", hospitalId: "HOSP005", province: "Mashonaland East", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MWE001", email: "admin.mwe@health.gov.zw", phoneNumber: "+263771234507", employeeId: "ADMIN007", hospitalName: "Chinhoyi Provincial Hospital", hospitalId: "HOSP006", province: "Mashonaland West", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MSV001", email: "admin.msv@health.gov.zw", phoneNumber: "+263771234508", employeeId: "ADMIN008", hospitalName: "Masvingo Provincial Hospital", hospitalId: "HOSP007", province: "Masvingo", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MTN001", email: "admin.mtn@health.gov.zw", phoneNumber: "+263771234509", employeeId: "ADMIN009", hospitalName: "Lupane Provincial Hospital", hospitalId: "HOSP008", province: "Matabeleland North", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MTS001", email: "admin.mts@health.gov.zw", phoneNumber: "+263771234510", employeeId: "ADMIN010", hospitalName: "Gwanda Provincial Hospital", hospitalId: "HOSP009", province: "Matabeleland South", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" },
    { firstName: "ADMIN", lastName: "MID001", email: "admin.mid@health.gov.zw", phoneNumber: "+263771234511", employeeId: "ADMIN011", hospitalName: "Gweru Provincial Hospital", hospitalId: "HOSP010", province: "Midlands", position: "Provincial Administrator", role: "admin", approvalStatus: "approved" }
];

async function createAdmins() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        for (const admin of admins) {
            const existing = await User.findOne({ email: admin.email });
            if (existing) {
                console.log(`⏭️ Skipping ${admin.firstName} ${admin.lastName} - already exists`);
                continue;
            }
            
            const password = `${admin.firstName}@2026`;
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = `${admin.firstName.substring(0,3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
            
            // Create admin with placeholder documents (admins don't need uploaded docs)
            const user = new User({
                ...admin,
                password: hashedPassword,
                userId: userId,
                verificationDocuments: {
                    nationalId: "admin-verified",
                    employmentLetter: "admin-verified"
                }
            });
            
            await user.save();
            console.log(`✅ Created: ${admin.firstName} ${admin.lastName} - UserID: ${userId}, Password: ${password}`);
        }
        
        console.log("\n🎉 All admins created successfully!");
        console.log("\n📋 Admin Login Credentials:");
        console.log("==========================");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

createAdmins();