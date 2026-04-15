const nodemailer = require('nodemailer');

// Create transporter only if credentials exist
let transporter = null;

const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email credentials not configured. Emails will be logged to console instead.');
        return null;
    }
    
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    return transporter;
};

// ============ 1. ADMIN APPROVAL EMAIL (EXISTING) ============
const sendApprovalEmail = async (userEmail, userId, password, name, role) => {
    const transport = getTransporter();
    
    if (!transport) {
        console.log('\n📧 ========== APPROVAL EMAIL (Would be sent) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`User ID: ${userId}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('==================================================\n');
        return true;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🎉 Welcome to National Vitality Eye - Account Approved!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Account Approved - National Vitality Eye</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
                    .content { background: white; padding: 30px; }
                    .credentials { background: #f8f9fa; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .credentials .label { font-weight: bold; color: #4F46E5; }
                    .credentials .value { font-family: monospace; font-size: 16px; background: #e9ecef; padding: 4px 8px; border-radius: 4px; display: inline-block; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    .role-badge { display: inline-block; background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Zimbabwe's Premier AI-Powered Health System</p>
                    </div>
                    <div class="content">
                        <h2>Welcome, ${name}! 👋</h2>
                        <p>We are excited to inform you that your account has been <strong style="color: #10B981;">APPROVED</strong> by an administrator.</p>
                        
                        <div class="credentials">
                            <p><span class="label">📋 Assigned Role:</span> <span class="role-badge">${role.toUpperCase()}</span></p>
                            <p><span class="label">🆔 Your User ID:</span> <span class="value">${userId}</span></p>
                            <p><span class="label">🔐 Temporary Password:</span> <span class="value">${password}</span></p>
                        </div>
                        
                        <p><strong>⚠️ Important Security Notice:</strong></p>
                        <ul>
                            <li>You will be required to change your password on first login</li>
                            <li>Never share your password with anyone</li>
                            <li>Contact your administrator immediately if you suspect unauthorized access</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">🔐 Login to Your Account</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        console.log('\n📧 ========== CREDENTIALS (Email Failed) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`User ID: ${userId}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('==================================================\n');
        return false;
    }
};

// ============ 2. ADMIN REJECTION EMAIL (EXISTING) ============
const sendRejectionEmail = async (userEmail, name, reason) => {
    const transport = getTransporter();
    
    if (!transport) {
        console.log('\n📧 ========== REJECTION EMAIL (Would be sent) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`Reason: ${reason}`);
        console.log('==================================================\n');
        return true;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'National Vitality Eye - Registration Update',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Registration Status - National Vitality Eye</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .header { background: #dc2626; padding: 20px; text-align: center; color: white; }
                    .content { padding: 20px; }
                    .button { display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>National Vitality Eye</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>We regret to inform you that your registration application has been <strong style="color: #dc2626;">REJECTED</strong>.</p>
                        <p><strong>Reason for rejection:</strong> ${reason}</p>
                        <p>Please contact your hospital administrator for more information or to resolve the issues with your application.</p>
                        <p>You may reapply once the issues have been addressed.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/register" class="button">Apply Again</a>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Rejection email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send rejection email:', error.message);
        return false;
    }
};

// ============ 3. NEW: PATIENT VERIFICATION EMAIL ============
const sendPatientVerificationEmail = async (email, name, verificationToken) => {
    const transport = getTransporter();
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/verify?token=${verificationToken}`;
    
    if (!transport) {
        console.log('\n📧 ========== PATIENT VERIFICATION EMAIL (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Verification Link: ${verificationLink}`);
        console.log('===============================================================\n');
        return true;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📧 Please Verify Your Email - National Vitality Eye Patient Portal',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Verify Your Email</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Patient Portal Email Verification</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>Thank you for registering for the National Vitality Eye Patient Portal!</p>
                        <p>Please verify your email address by clicking the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${verificationLink}" class="button">✅ Verify Email Address</a>
                        </div>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">${verificationLink}</p>
                        
                        <p><strong>Why verify?</strong> Verification ensures that you are the rightful owner of this email and helps us keep your medical records secure.</p>
                        <p>This link will expire in 24 hours.</p>
                        <p>If you did not create an account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send verification email:', error.message);
        return false;
    }
};

// ============ 4. NEW: PASSWORD RESET EMAIL ============
const sendPasswordResetEmail = async (email, name, resetToken) => {
    const transport = getTransporter();
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/reset-password?token=${resetToken}`;
    
    if (!transport) {
        console.log('\n📧 ========== PASSWORD RESET EMAIL (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log('==========================================================\n');
        return true;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Password Reset Request - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Password Reset</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Password Reset Request</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>We received a request to reset your password for your Patient Portal account.</p>
                        
                        <div style="text-align: center;">
                            <a href="${resetLink}" class="button">🔐 Reset Your Password</a>
                        </div>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all;">${resetLink}</p>
                        
                        <div class="warning">
                            <p><strong>⚠️ Important:</strong></p>
                            <p>This link will expire in 1 hour for security reasons.</p>
                            <p>If you did not request a password reset, please ignore this email or contact support.</p>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error.message);
        return false;
    }
};

// ============ 5. NEW: MEDICAL REPORT EMAIL ============
const sendMedicalReportEmail = async (email, name, patientName, recordType, visitDate) => {
    const transport = getTransporter();
    const portalLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/dashboard`;
    
    if (!transport) {
        console.log('\n📧 ========== MEDICAL REPORT EMAIL (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Patient: ${patientName}`);
        console.log(`Record Type: ${recordType}`);
        console.log('==========================================================\n');
        return true;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📋 New Medical Record Available - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>New Medical Record</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .record-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>New Medical Record Available</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>A new medical record has been added to your health profile.</p>
                        
                        <div class="record-details">
                            <p><strong>👤 Patient:</strong> ${patientName}</p>
                            <p><strong>📋 Record Type:</strong> ${recordType}</p>
                            <p><strong>📅 Visit Date:</strong> ${new Date(visitDate).toLocaleDateString()}</p>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="${portalLink}" class="button">📊 View Your Records</a>
                        </div>
                        
                        <p>Login to your Patient Portal to view the complete medical record, including diagnoses, medications, and vital signs.</p>
                        <p>If you have any questions about this record, please contact your healthcare provider.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Medical report email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send medical report email:', error.message);
        return false;
    }
};

// ============ 6. NEW: APPOINTMENT REMINDER EMAIL ============
const sendAppointmentReminder = async (email, name, patientName, appointmentDate, appointmentType, location) => {
    const transport = getTransporter();
    
    if (!transport) {
        console.log('\n📧 ========== APPOINTMENT REMINDER (Would be sent) ==========');
        console.log(`To: ${email}`);
        console.log(`Patient: ${patientName}`);
        console.log(`Appointment: ${new Date(appointmentDate).toLocaleString()}`);
        console.log('==========================================================\n');
        return true;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📅 Upcoming Appointment Reminder - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Appointment Reminder</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .appointment-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Appointment Reminder</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>This is a reminder for your upcoming medical appointment.</p>
                        
                        <div class="appointment-details">
                            <p><strong>👤 Patient:</strong> ${patientName}</p>
                            <p><strong>📋 Appointment Type:</strong> ${appointmentType}</p>
                            <p><strong>📅 Date & Time:</strong> ${new Date(appointmentDate).toLocaleString()}</p>
                            <p><strong>📍 Location:</strong> ${location}</p>
                        </div>
                        
                        <p><strong>What to bring:</strong></p>
                        <ul>
                            <li>National ID or passport</li>
                            <li>Insurance card (if applicable)</li>
                            <li>List of current medications</li>
                            <li>Previous medical records (if any)</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/dashboard" class="button">📱 View in Portal</a>
                        </div>
                        
                        <p>Please arrive 15 minutes early for check-in.</p>
                        <p>To reschedule or cancel, please contact your healthcare provider.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Appointment reminder sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send appointment reminder:', error.message);
        return false;
    }
};

// ============ 7. NEW: REGISTRATION CONFIRMATION EMAIL ============
const sendRegistrationConfirmation = async (userEmail, name, userId) => {
    const transport = getTransporter();
    
    if (!transport) {
        console.log('\n📧 ========== REGISTRATION CONFIRMATION (Would be sent) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`Name: ${name}`);
        console.log(`User ID: ${userId}`);
        console.log(`Status: Pending Approval`);
        console.log('===============================================================\n');
        return true;
    }
    
    const mailOptions = {
        from: `"National Vitality Eye" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '📋 Registration Received - National Vitality Eye',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Registration Received</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; }
                    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white; }
                    .content { padding: 30px; background: white; }
                    .status-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; }
                    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 National Vitality Eye</h1>
                        <p>Zimbabwe's Premier AI-Powered Health System</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>Thank you for registering with the National Vitality Eye system!</p>
                        
                        <div class="status-box">
                            <p><strong>📋 Registration Status:</strong> <span style="color: #F59E0B;">PENDING APPROVAL</span></p>
                            <p><strong>🆔 Your User ID:</strong> <strong>${userId}</strong></p>
                            <p><strong>📅 Registration Date:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        
                        <p><strong>What happens next?</strong></p>
                        <ol>
                            <li>Our administrators will review your documents</li>
                            <li>You will receive another email with your login credentials</li>
                            <li>Typical approval time: 24-48 hours</li>
                        </ol>
                        
                        <p>If you have any questions, please contact your hospital administrator.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">🏠 Visit Our Website</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`✅ Registration confirmation email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send registration email:', error.message);
        return false;
    }
};

// Export all functions
module.exports = { 
    sendApprovalEmail, 
    sendRejectionEmail,
    sendPatientVerificationEmail,
    sendPasswordResetEmail,
    sendMedicalReportEmail,
    sendAppointmentReminder,
    sendRegistrationConfirmation
};