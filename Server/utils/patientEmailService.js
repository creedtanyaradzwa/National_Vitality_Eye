const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email credentials not configured. EMAIL_USER:', process.env.EMAIL_USER);
        console.log('⚠️ EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
        return null;
    }
    
    if (!transporter) {
        console.log('📧 Creating email transporter with user:', process.env.EMAIL_USER);
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email transporter error:', error.message);
            } else {
                console.log('✅ Email transporter ready');
            }
        });
    }
    return transporter;
};

// Send verification email
const sendVerificationEmail = async (email, name, verificationToken) => {
    console.log('\n📧 ========== SENDING VERIFICATION EMAIL ==========');
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    
    const transport = getTransporter();
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/verify/${verificationToken}`;
    
    console.log(`Verification Link: ${verificationLink}`);
    
    if (!transport) {
        console.log('❌ No email transporter available');
        console.log(`📋 Please use this link to verify: ${verificationLink}`);
        console.log('==========================================\n');
        return false;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email - National Vitality Eye Patient Portal',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Verify Your Email</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Patient Portal</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>Thank you for registering for the Patient Portal. Please verify your email address to activate your account.</p>
                        <div style="text-align: center;">
                            <a href="${verificationLink}" class="button">Verify Email Address</a>
                        </div>
                        <p>This link will expire in 24 hours.</p>
                        <p>If you did not create an account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    
    try {
        const info = await transport.sendMail(mailOptions);
        console.log(`✅ Verification email sent successfully to ${email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
        console.log('==========================================\n');
        return true;
    } catch (error) {
        console.error('❌ Failed to send verification email:');
        console.error(`Error code: ${error.code}`);
        console.error(`Error message: ${error.message}`);
        console.log('\n📋 Manual verification link:');
        console.log(verificationLink);
        console.log('==========================================\n');
        return false;
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetToken) => {
    console.log('\n📧 ========== SENDING PASSWORD RESET EMAIL ==========');
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    
    const transport = getTransporter();
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/reset-password/${resetToken}`;
    
    console.log(`Reset Link: ${resetLink}`);
    
    if (!transport) {
        console.log('❌ No email transporter available');
        console.log(`📋 Please use this link to reset password: ${resetLink}`);
        console.log('==========================================\n');
        return false;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Reset Your Password - National Vitality Eye Patient Portal',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reset Your Password</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Patient Portal</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>We received a request to reset your password. Click the button below to create a new password.</p>
                        <div style="text-align: center;">
                            <a href="${resetLink}" class="button">Reset Password</a>
                        </div>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you did not request this, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };
    
    try {
        const info = await transport.sendMail(mailOptions);
        console.log(`✅ Password reset email sent successfully to ${email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
        console.log('==========================================\n');
        return true;
    } catch (error) {
        console.error('❌ Failed to send password reset email:');
        console.error(`Error code: ${error.code}`);
        console.error(`Error message: ${error.message}`);
        console.log('\n📋 Manual reset link:');
        console.log(resetLink);
        console.log('==========================================\n');
        return false;
    }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };