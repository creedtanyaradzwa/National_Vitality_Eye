const { sendApprovalEmail } = require("../utils/emailService");
require("dotenv").config();

async function test() {
    await sendApprovalEmail(
        "thediscoverytanya@gmail.com",  // Replace with your email
        "TEST1000",
        "Test@123",
        "Test User",
        "doctor"
    );
    console.log("Test email sent");
}

test();