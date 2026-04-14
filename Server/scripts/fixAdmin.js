const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

async function fixAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB\n");
        
        // Find the SYS ADMIN user
        const sysAdmin = await User.findOne({ firstName: "SYS", lastName: "ADMIN" });
        
        if (sysAdmin) {
            console.log(`Found: ${sysAdmin.firstName} ${sysAdmin.lastName}`);
            console.log(`Current UserID: ${sysAdmin.userId}`);
            console.log(`Current Role: ${sysAdmin.role}`);
            
            // Update to admin role and set a consistent userId
            sysAdmin.role = "admin";
            sysAdmin.userId = "SYS1000";
            
            // Reset password to ensure it's correct
            const password = "SYS@2026";
            sysAdmin.password = await bcrypt.hash(password, 10);
            
            await sysAdmin.save();
            
            console.log(`\n✅ Updated:`);
            console.log(`   UserID: ${sysAdmin.userId}`);
            console.log(`   Role: ${sysAdmin.role}`);
            console.log(`   Password: ${password}`);
        } else {
            console.log("SYS ADMIN not found!");
        }
        
        // Also list all admin users for reference
        const admins = await User.find({ role: "admin" });
        console.log("\n=== ADMIN USERS ===");
        for (const admin of admins) {
            console.log(`UserID: ${admin.userId}, Name: ${admin.firstName} ${admin.lastName}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

fixAdmin();