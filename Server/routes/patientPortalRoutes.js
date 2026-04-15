const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { sendPatientVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");

// ============ PATIENT REGISTRATION ============
router.post("/register", async (req, res) => {
    try {
        const { nationalId, email, phoneNumber, password, consent } = req.body;
        
        console.log("Registration attempt for nationalId:", nationalId);
        
        if (!nationalId) return res.status(400).json({ error: "National ID required" });
        if (!email) return res.status(400).json({ error: "Email required" });
        if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
        if (consent !== "true" && consent !== true) return res.status(400).json({ error: "Consent is required" });
        
        const patient = await Patient.findOne({ nationalId });
        if (!patient) {
            return res.status(404).json({ error: "Patient not found. Please contact your healthcare provider." });
        }
        
        if (patient.portalAccount && patient.portalAccount.hasAccount) {
            return res.status(400).json({ error: "Account already exists. Please login." });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const verificationToken = crypto.randomBytes(32).toString("hex");
        
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
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000,
            auditLog: [{
                action: "REGISTER",
                timestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.get("User-Agent")
            }]
        };
        
        await patient.save();
        
        await sendPatientVerificationEmail(email, `${patient.firstName} ${patient.lastName}`, verificationToken);
        
        console.log("Patient portal account created for:", email);
        console.log("Verification token:", verificationToken);
        
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
router.get("/verify", async (req, res) => {
    try {
        const { token } = req.query;
        
        console.log("Verification attempt with token:", token);
        
        if (!token) {
            return res.status(400).json({ error: "Verification token required" });
        }
        
        const patient = await Patient.findOne({ 
            "portalAccount.verificationToken": token,
            "portalAccount.verificationExpires": { $gt: Date.now() }
        });
        
        console.log("Patient found:", patient ? "YES" : "NO");
        
        if (!patient) {
            const expiredPatient = await Patient.findOne({ 
                "portalAccount.verificationToken": token
            });
            if (expiredPatient) {
                return res.status(400).json({ error: "Verification token has expired. Please register again." });
            }
            return res.status(400).json({ error: "Invalid verification token" });
        }
        
        patient.portalAccount.isVerified = true;
        patient.portalAccount.verificationToken = null;
        patient.portalAccount.verificationExpires = null;
        
        if (!patient.portalAccount.auditLog) patient.portalAccount.auditLog = [];
        patient.portalAccount.auditLog.push({
            action: "VERIFY_EMAIL",
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
        });
        
        await patient.save();
        
        console.log("Email verified for patient:", patient._id);
        
        res.json({ 
            message: "Email verified successfully! You can now login.",
            success: true 
        });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT LOGIN ============
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log("Patient login attempt for:", email);
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        if (!patient) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        if (!patient.portalAccount || !patient.portalAccount.isActive) {
            return res.status(401).json({ error: "Account deactivated. Contact support." });
        }
        
        if (!patient.portalAccount.isVerified) {
            return res.status(401).json({ error: "Please verify your email before logging in." });
        }
        
        const isValid = await bcrypt.compare(password, patient.portalAccount.password);
        if (!isValid) {
            patient.portalAccount.loginAttempts = (patient.portalAccount.loginAttempts || 0) + 1;
            await patient.save();
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
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
        
        const token = jwt.sign(
            { patientId: patient._id, nationalId: patient.nationalId, role: "patient" },
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
        
        if (!email) {
            return res.status(400).json({ error: "Email required" });
        }
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        
        if (patient && patient.portalAccount && patient.portalAccount.hasAccount) {
            const resetToken = crypto.randomBytes(32).toString("hex");
            patient.portalAccount.passwordResetToken = resetToken;
            patient.portalAccount.passwordResetExpires = Date.now() + 3600000;
            await patient.save();
            
            await sendPasswordResetEmail(email, `${patient.firstName} ${patient.lastName}`, resetToken);
            console.log("Password reset token sent for:", email);
        }
        
        res.json({ message: "If an account exists, a reset link has been sent." });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ RESET PASSWORD ============
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and new password required" });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
        
        const patient = await Patient.findOne({
            "portalAccount.passwordResetToken": token,
            "portalAccount.passwordResetExpires": { $gt: Date.now() }
        });
        
        if (!patient) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        patient.portalAccount.password = hashedPassword;
        patient.portalAccount.passwordResetToken = null;
        patient.portalAccount.passwordResetExpires = null;
        if (!patient.portalAccount.auditLog) patient.portalAccount.auditLog = [];
        patient.portalAccount.auditLog.push({
            action: "PASSWORD_RESET",
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
        });
        
        await patient.save();
        
        res.json({ message: "Password reset successfully! You can now login." });
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

module.exports = router;