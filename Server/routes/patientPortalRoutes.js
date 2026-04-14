const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const PatientUser = require("../models/PatientUser");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

// Rate limiting for patient endpoints
const patientLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 failed attempts
    skipSuccessfulRequests: true
});

// ============ PATIENT REGISTRATION ============

// Register patient for portal access
router.post("/register", [
    body("nationalId").notEmpty().withMessage("National ID required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("phoneNumber").optional(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("consent").equals("true").withMessage("Consent is required")
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { nationalId, email, phoneNumber, password } = req.body;
        
        // Find patient by national ID
        const patient = await Patient.findOne({ nationalId });
        if (!patient) {
            return res.status(404).json({ error: "Patient not found with this National ID" });
        }
        
        // Check if already registered
        const existingUser = await PatientUser.findOne({ $or: [{ email }, { patientId: patient._id }] });
        if (existingUser) {
            return res.status(400).json({ error: "Account already exists for this patient" });
        }
        
        // Create patient user account
        const patientUser = new PatientUser({
            patientId: patient._id,
            nationalId,
            email,
            phoneNumber,
            password,
            consentGiven: true,
            consentDate: new Date(),
            consentVersion: "1.0",
            isVerified: false,
            verificationToken: crypto.randomBytes(32).toString("hex"),
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });
        
        await patientUser.save();
        
        // Generate verification email (implement email service)
        // await sendVerificationEmail(email, patientUser.verificationToken);
        
        res.status(201).json({
            message: "Registration successful! Please verify your email.",
            requiresVerification: true
        });
        
    } catch (error) {
        console.error("Patient registration error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT LOGIN ============

router.post("/login", authLimiter, [
    body("email").isEmail(),
    body("password").notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { email, password } = req.body;
        
        const patientUser = await PatientUser.findOne({ email }).populate("patientId");
        if (!patientUser) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Check if account is locked
        if (patientUser.isLocked()) {
            return res.status(401).json({ error: "Account locked. Try again later." });
        }
        
        // Check if active
        if (!patientUser.isActive) {
            return res.status(401).json({ error: "Account deactivated. Contact support." });
        }
        
        // Verify password
        const isValid = await patientUser.comparePassword(password);
        if (!isValid) {
            patientUser.loginAttempts += 1;
            if (patientUser.loginAttempts >= 5) {
                patientUser.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
            }
            await patientUser.save();
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Reset login attempts on success
        patientUser.loginAttempts = 0;
        patientUser.lockedUntil = null;
        patientUser.lastLogin = new Date();
        patientUser.lastLoginIP = req.ip;
        patientUser.auditLog.push({
            action: "LOGIN",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
        });
        await patientUser.save();
        
        // Generate JWT (shorter expiry for patients)
        const token = jwt.sign(
            { 
                id: patientUser._id, 
                patientId: patientUser.patientId._id,
                role: "patient",
                nationalId: patientUser.nationalId
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );
        
        res.json({
            token,
            user: {
                id: patientUser._id,
                patientId: patientUser.patientId._id,
                name: `${patientUser.patientId.firstName} ${patientUser.patientId.lastName}`,
                email: patientUser.email,
                nationalId: patientUser.nationalId
            }
        });
        
    } catch (error) {
        console.error("Patient login error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT DATA ACCESS (READ-ONLY) ==========

// Middleware to verify patient token
const verifyPatientToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Access denied" });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "patient") {
            return res.status(403).json({ error: "Access denied" });
        }
        req.patient = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

// Get patient's own profile
router.get("/profile", verifyPatientToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.patient.patientId).select("-clinicalProfile");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        res.json({
            id: patient._id,
            name: `${patient.firstName} ${patient.lastName}`,
            nationalId: patient.nationalId,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            province: patient.province,
            contactInfo: patient.contactInfo
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get patient's medical records (READ ONLY)
router.get("/records", verifyPatientToken, patientLimiter, async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        
        const records = await MedicalRecord.find({ patientId: req.patient.patientId })
            .sort({ visitDate: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .select("-createdBy -updatedBy"); // Exclude internal fields
        
        const total = await MedicalRecord.countDocuments({ patientId: req.patient.patientId });
        
        // Audit log
        await PatientUser.findByIdAndUpdate(req.patient.id, {
            $push: {
                auditLog: {
                    action: "VIEW_RECORDS",
                    ipAddress: req.ip,
                    userAgent: req.get("User-Agent"),
                    details: { recordCount: records.length }
                }
            }
        });
        
        res.json({
            records,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single medical record
router.get("/records/:recordId", verifyPatientToken, async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({
            _id: req.params.recordId,
            patientId: req.patient.patientId
        }).select("-createdBy -updatedBy");
        
        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        
        // Audit log
        await PatientUser.findByIdAndUpdate(req.patient.id, {
            $push: {
                auditLog: {
                    action: "VIEW_RECORD",
                    ipAddress: req.ip,
                    userAgent: req.get("User-Agent"),
                    details: { recordId: req.params.recordId }
                }
            }
        });
        
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Request correction (doesn't edit directly)
router.post("/records/:recordId/request-correction", verifyPatientToken, [
    body("reason").notEmpty().withMessage("Reason required"),
    body("suggestedCorrection").notEmpty().withMessage("Suggested correction required")
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const record = await MedicalRecord.findOne({
            _id: req.params.recordId,
            patientId: req.patient.patientId
        });
        
        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        
        // Store correction request (you'd need a new collection for this)
        // For now, log it
        console.log("Correction request:", {
            patientId: req.patient.patientId,
            recordId: req.params.recordId,
            reason: req.body.reason,
            suggestedCorrection: req.body.suggestedCorrection
        });
        
        res.json({ message: "Correction request submitted. A doctor will review it." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download records as PDF
router.get("/records/download/pdf", verifyPatientToken, async (req, res) => {
    try {
        const records = await MedicalRecord.find({ patientId: req.patient.patientId })
            .sort({ visitDate: -1 })
            .lean();
        
        const patient = await Patient.findById(req.patient.patientId);
        
        // Generate PDF (using pdfkit or similar)
        // For now, return JSON
        res.json({
            message: "PDF download endpoint ready",
            data: { patient, records }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get audit log (patient can see who accessed their data)
router.get("/audit", verifyPatientToken, async (req, res) => {
    try {
        const patientUser = await PatientUser.findById(req.patient.id).select("auditLog");
        res.json(patientUser.auditLog.slice(-50)); // Last 50 entries
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deactivate account (patient can request deactivation)
router.post("/deactivate", verifyPatientToken, async (req, res) => {
    try {
        await PatientUser.findByIdAndUpdate(req.patient.id, {
            isActive: false,
            dataAccess: { isActive: false, deactivatedAt: new Date(), deactivationReason: "User requested" }
        });
        
        res.json({ message: "Account deactivated. Contact support to reactivate." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;