const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'thediscoverytanya@gmail.com', // Change to your email
            subject: 'Test Email from Vitality Eye',
            text: 'If you receive this, patient emails will work!',
        });
        console.log('✅ Email sent successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testEmail();