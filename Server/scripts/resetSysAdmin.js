const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

async function resetSysAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");
        
        const password = "SYS@2026";
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log("Password to set:", password);
        console.log("Generated hash:", hashedPassword);
        
        // Update the SYS1000 user
        const result = await User.updateOne(
            { userId: "SYS1000" },
            {
                $set: {
                    password: hashedPassword,
                    approvalStatus: "approved",
                    isActive: true,
                    role: "admin",
                    hospitalName: "National Referral Hospital",
                    province: "Harare",
                    position: "System Administrator"
                }
            }
        );
        
        console.log("Update result:", result);
        
        // Verify it worked
        const user = await User.findOne({ userId: "SYS1000" }).select("+password");
        console.log("\n🔐 VERIFICATION:");
        console.log("User ID:", user.userId);
        console.log("Stored hash:", user.password);
        
        // Test the password
        const isValid = await bcrypt.compare(password, user.password);
        console.log("Password test:", isValid ? "✅ SUCCESS" : "❌ FAILED");
        
        if (isValid) {
            console.log("\n✅ Admin password reset successfully!");
            console.log("====================================");
            console.log("🔐 LOGIN CREDENTIALS:");
            console.log("   User ID: SYS1000");
            console.log("   Password: SYS@2026");
            console.log("====================================");
        } else {
            console.log("\n❌ Password verification failed!");
        }
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

resetSysAdmin();