const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");

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
            auditLog: [{
                action: "REGISTER",
                timestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.get("User-Agent")
            }]
        };
        
        await patient.save();
        
        console.log("Patient portal account created for:", email);
        
        res.status(201).json({
            message: "Registration successful! Please login.",
            success: true
        });
        
    } catch (error) {
        console.error("Registration error:", error);
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