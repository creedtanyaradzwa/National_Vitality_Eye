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

// Send approval email with credentials
const sendApprovalEmail = async (userEmail, userId, password, name, role) => {
    const transport = getTransporter();
    
    // If no transporter, log to console instead
    if (!transport) {
        console.log('\n📧 ========== EMAIL WOULD BE SENT ==========');
        console.log(`To: ${userEmail}`);
        console.log(`Subject: Welcome to National Vitality Eye - Account Approved!`);
        console.log(`User ID: ${userId}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('==========================================\n');
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
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 10px;
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        color: white;
                        margin: 0;
                        font-size: 28px;
                    }
                    .header p {
                        color: rgba(255,255,255,0.9);
                        margin: 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                    }
                    .credentials {
                        background: #f8f9fa;
                        border-left: 4px solid #4F46E5;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .credentials p {
                        margin: 8px 0;
                    }
                    .credentials .label {
                        font-weight: bold;
                        color: #4F46E5;
                    }
                    .credentials .value {
                        font-family: monospace;
                        font-size: 16px;
                        background: #e9ecef;
                        padding: 4px 8px;
                        border-radius: 4px;
                        display: inline-block;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 25px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                    .role-badge {
                        display: inline-block;
                        background: #10B981;
                        color: white;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: bold;
                    }
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
                        
                        <p style="margin-top: 20px;">Based on your role (${role}), you will have access to:</p>
                        <ul>
                            ${role === 'doctor' ? '<li>✓ Full patient management (Create, Edit, Delete)</li><li>✓ Medical records management</li><li>✓ AI Disease Predictor</li><li>✓ Analytics Dashboard</li>' : ''}
                            ${role === 'nurse' ? '<li>✓ View and create patient records</li><li>✓ Medical records management</li><li>✓ Analytics Dashboard</li>' : ''}
                            ${role === 'data_entry' ? '<li>✓ Full patient data entry</li><li>✓ Medical records entry</li>' : ''}
                            ${role === 'viewer' ? '<li>✓ View patient information</li><li>✓ View medical records</li><li>✓ View analytics</li>' : ''}
                        </ul>
                    </div>
                    <div class="footer">
                        <p>© 2024 National Vitality Eye. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                        <p>If you did not request this account, please contact your system administrator.</p>
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
        // Still log credentials to console as fallback
        console.log('\n📧 ========== CREDENTIALS (Email Failed) ==========');
        console.log(`To: ${userEmail}`);
        console.log(`User ID: ${userId}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('==================================================\n');
        return false;
    }
};

// Send rejection email
const sendRejectionEmail = async (userEmail, name, reason) => {
    const transport = getTransporter();
    
    if (!transport) {
        console.log('\n📧 ========== REJECTION EMAIL WOULD BE SENT ==========');
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

module.exports = { sendApprovalEmail, sendRejectionEmail };