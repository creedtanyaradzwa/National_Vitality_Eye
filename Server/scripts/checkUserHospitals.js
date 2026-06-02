const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkUsers() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: { $in: ['doctor', 'nurse', 'data_entry'] } }).limit(20);
    console.log("=== STAFF HOSPITAL NAMES ===");
    users.forEach(u => {
        console.log(`${u.firstName} ${u.lastName} (${u.role}): "${u.hospitalName}"`);
    });
    process.exit(0);
}
checkUsers();
