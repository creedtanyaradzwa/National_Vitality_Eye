const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/patientEmailService");
const { generateMedicalReport } = require("../utils/pdfService");

// ============ PATIENT REGISTRATION ============
router.post("/register", async (req, res) => {
    try {
        const { nationalId, email, phoneNumber, password, consent } = req.body;
        
        console.log("Registration attempt for:", nationalId);
        
        // Find patient by national ID
        const patient = await Patient.findOne({ nationalId });
        if (!patient) {
            return res.status(404).json({ error: "Patient not found. Please contact your healthcare provider." });
        }
        
        // Check if patient already has portal access
        if (patient.portalAccount && patient.portalAccount.hasAccount) {
            return res.status(400).json({ error: "Account already exists. Please login." });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Update patient with portal account info
        patient.portalAccount = {
            hasAccount: true,
            email: email,
            phoneNumber: phoneNumber || "",
            password: hashedPassword,
            createdAt: new Date(),
            consentGiven: consent === "true" || consent === true,
            consentDate: new Date(),
            isActive: true,
            isVerified: false,
            verificationToken: verificationToken,
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            auditLog: [{
                action: "REGISTER",
                timestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.get("User-Agent")
            }]
        };
        
        await patient.save();
        
        // Send verification email
        await sendVerificationEmail(email, `${patient.firstName} ${patient.lastName}`, verificationToken);
        
        console.log("Patient portal account created for:", email);
        
        res.status(201).json({
            message: "Registration successful! Please check your email to verify your account.",
            success: true,
            requiresVerification: true
        });
        
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ EMAIL VERIFICATION ============
router.get("/verify/:token", async (req, res) => {
    try {
        const { token } = req.params;
        
        const patient = await Patient.findOne({
            "portalAccount.verificationToken": token,
            "portalAccount.verificationExpires": { $gt: Date.now() }
        });
        
        if (!patient) {
            return res.status(400).json({ error: "Invalid or expired verification token" });
        }
        
        patient.portalAccount.isVerified = true;
        patient.portalAccount.verificationToken = null;
        patient.portalAccount.verificationExpires = null;
        await patient.save();
        
        // Redirect to login page with success message
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/login?verified=true`);
        
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ RESEND VERIFICATION EMAIL ============
router.post("/resend-verification", async (req, res) => {
    try {
        const { email } = req.body;
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (patient.portalAccount.isVerified) {
            return res.status(400).json({ error: "Account already verified" });
        }
        
        const verificationToken = crypto.randomBytes(32).toString('hex');
        patient.portalAccount.verificationToken = verificationToken;
        patient.portalAccount.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await patient.save();
        
        await sendVerificationEmail(email, `${patient.firstName} ${patient.lastName}`, verificationToken);
        
        res.json({ message: "Verification email resent successfully" });
        
    } catch (error) {
        console.error("Resend verification error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT LOGIN ============
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log("Login attempt for:", email);
        
        // Find patient by portal email
        const patient = await Patient.findOne({ "portalAccount.email": email });
        if (!patient) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Check if email is verified
        if (!patient.portalAccount.isVerified) {
            return res.status(401).json({ 
                error: "Please verify your email before logging in. Check your inbox for the verification link.",
                needsVerification: true 
            });
        }
        
        // Check if portal account is active
        if (!patient.portalAccount || !patient.portalAccount.isActive) {
            return res.status(401).json({ error: "Account deactivated. Contact support." });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, patient.portalAccount.password);
        if (!isValid) {
            // Record failed attempt
            if (!patient.portalAccount.loginAttempts) patient.portalAccount.loginAttempts = 0;
            patient.portalAccount.loginAttempts += 1;
            await patient.save();
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Reset login attempts and update last login
        patient.portalAccount.loginAttempts = 0;
        patient.portalAccount.lastLogin = new Date();
        if (!patient.portalAccount.auditLog) patient.portalAccount.auditLog = [];
        patient.portalAccount.auditLog.push({
            action: "LOGIN",
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
        });
        await patient.save();
        
        // Generate JWT
        const token = jwt.sign(
            { 
                patientId: patient._id,
                nationalId: patient.nationalId,
                role: "patient"
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        
        res.json({
            token,
            user: {
                patientId: patient._id,
                name: `${patient.firstName} ${patient.lastName}`,
                email: patient.portalAccount.email,
                nationalId: patient.nationalId
            }
        });
        
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ FORGOT PASSWORD ============
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        if (!patient) {
            // Don't reveal that email doesn't exist for security
            return res.json({ message: "If an account exists, a password reset link has been sent." });
        }
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        patient.portalAccount.resetToken = resetToken;
        patient.portalAccount.resetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await patient.save();
        
        await sendPasswordResetEmail(email, `${patient.firstName} ${patient.lastName}`, resetToken);
        
        res.json({ message: "If an account exists, a password reset link has been sent." });
        
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ RESET PASSWORD ============
router.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        
        if (!password || password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
        
        const patient = await Patient.findOne({
            "portalAccount.resetToken": token,
            "portalAccount.resetExpires": { $gt: Date.now() }
        });
        
        if (!patient) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        patient.portalAccount.password = hashedPassword;
        patient.portalAccount.resetToken = null;
        patient.portalAccount.resetExpires = null;
        await patient.save();
        
        res.json({ message: "Password reset successfully! Please login." });
        
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ VERIFY TOKEN MIDDLEWARE ============
const verifyPatientToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "patient") {
            return res.status(403).json({ error: "Forbidden" });
        }
        req.patientId = decoded.patientId;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

// ============ GET PATIENT PROFILE ============
router.get("/profile", verifyPatientToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.patientId)
            .select("firstName lastName nationalId dateOfBirth gender province");
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        res.json({
            name: `${patient.firstName} ${patient.lastName}`,
            nationalId: patient.nationalId,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            province: patient.province
        });
    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ GET PATIENT MEDICAL RECORDS ============
router.get("/records", verifyPatientToken, async (req, res) => {
    try {
        const records = await MedicalRecord.find({ patientId: req.patientId })
            .sort({ visitDate: -1 })
            .limit(50);
        
        res.json({ records });
    } catch (error) {
        console.error("Records error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ DOWNLOAD MEDICAL RECORDS AS PDF ============
router.get("/records/download/pdf", verifyPatientToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.patientId);
        const records = await MedicalRecord.find({ patientId: req.patientId })
            .sort({ visitDate: -1 });
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (records.length === 0) {
            return res.status(404).json({ error: "No medical records found" });
        }
        
        const pdfBuffer = await generateMedicalReport(patient, records);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=medical_report_${patient.nationalId}.pdf`);
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error("PDF generation error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ CHANGE PASSWORD (Authenticated) ============
router.post("/change-password", verifyPatientToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: "New password must be at least 8 characters" });
        }
        
        const patient = await Patient.findById(req.patientId);
        
        const isValid = await bcrypt.compare(currentPassword, patient.portalAccount.password);
        if (!isValid) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        patient.portalAccount.password = hashedPassword;
        patient.portalAccount.auditLog.push({
            action: "PASSWORD_CHANGE",
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
        });
        await patient.save();
        
        res.json({ message: "Password changed successfully" });
        
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ GET AUDIT LOG ============
router.get("/audit", verifyPatientToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.patientId)
            .select("portalAccount.auditLog");
        
        res.json(patient.portalAccount?.auditLog?.slice(-50) || []);
        
    } catch (error) {
        console.error("Audit log error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;