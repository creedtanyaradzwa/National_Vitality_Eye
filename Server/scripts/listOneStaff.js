const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function listOneStaff() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ role: 'doctor' }).select('firstName lastName email userId');
        if (user) {
            console.log("\n=== STAFF DOCTOR ACCOUNT ===");
            console.log("Name:", `${user.firstName} ${user.lastName}`);
            console.log("Email:", user.email);
            console.log("User ID:", user.userId);
            console.log("Password:", "Staff@2026 (standard for seeded staff)");
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
listOneStaff();