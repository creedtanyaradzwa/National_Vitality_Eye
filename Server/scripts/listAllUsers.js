const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function listUsers() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({});
    console.log("=== USERS ===");
    users.forEach(u => {
        console.log(`ID: ${u._id}, Name: ${u.firstName} ${u.lastName}, Role: ${u.role}, Hospital: ${u.hospitalName}`);
    });
    process.exit(0);
}
listUsers();
