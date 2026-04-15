const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

async function fixAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        // Delete existing admin if any
        await User.deleteMany({ userId: "SYS1000" });
        console.log("✅ Removed existing SYS1000 if present");
        
        // Create new admin
        const hashedPassword = await bcrypt.hash("SYS@2026", 10);
        
        const admin = new User({
            firstName: "System",
            lastName: "Administrator",
            email: "admin@vitalityeye.health.gov.zw",
            phoneNumber: "+263771234500",
            employeeId: "ADMIN001",
            hospitalName: "Ministry of Health",
            hospitalId: "MOH001",
            province: "Harare",
            position: "System Administrator",
            userId: "SYS1000",
            password: hashedPassword,
            role: "admin",
            approvalStatus: "approved",
            isActive: true,
            verificationDocuments: {
                nationalId: "admin-verified",
                employmentLetter: "admin-verified"
            }
        });
        
        await admin.save();
        console.log("✅ Admin user created successfully!");
        console.log("\n====================================");
        console.log("🔐 LOGIN CREDENTIALS:");
        console.log("   User ID: SYS1000");
        console.log("   Password: SYS@2026");
        console.log("====================================\n");
        
        // List all admin users
        const admins = await User.find({ role: "admin" });
        console.log("All Admin Users:");
        admins.forEach(admin => {
            console.log(`   - ${admin.userId}: ${admin.firstName} ${admin.lastName}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixAdmin();