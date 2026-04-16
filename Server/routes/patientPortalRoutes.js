const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");

// ============ PATIENT AUTHENTICATION ============

// Patient Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log("Patient login attempt:", email);
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        
        if (!patient) {
            console.log("Patient not found:", email);
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        if (!patient.portalAccount?.hasAccount) {
            return res.status(401).json({ error: "No portal account found. Please contact your hospital." });
        }
        
        if (!patient.portalAccount.isActive) {
            return res.status(401).json({ error: "Account is deactivated. Contact support." });
        }
        
        if (!patient.portalAccount.isVerified) {
            return res.status(401).json({ error: "Please verify your email first." });
        }
        
        const isValid = await bcrypt.compare(password, patient.portalAccount.password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        patient.portalAccount.lastLogin = new Date();
        await patient.save();
        
        const token = jwt.sign(
            { id: patient._id, email: patient.portalAccount.email, type: "patient" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        
        console.log("Patient logged in:", patient.firstName, patient.lastName);
        
        res.json({
            token,
            patient: {
                id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.portalAccount.email,
                nationalId: patient.nationalId,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                province: patient.province
            }
        });
    } catch (error) {
        console.error("Patient login error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        const patient = await Patient.findOne({ "portalAccount.email": email });
        
        if (!patient || !patient.portalAccount?.hasAccount) {
            return res.json({ message: "If an account exists, a reset link will be sent" });
        }
        
        const resetToken = jwt.sign(
            { id: patient._id, email: patient.portalAccount.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        
        patient.portalAccount.resetToken = resetToken;
        patient.portalAccount.resetTokenExpiry = new Date(Date.now() + 3600000);
        await patient.save();
        
        res.json({ message: "Reset link sent to your email" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findOne({ 
            _id: decoded.id,
            "portalAccount.resetToken": token,
            "portalAccount.resetTokenExpiry": { $gt: new Date() }
        });
        
        if (!patient) {
            return res.status(400).json({ error: "Invalid or expired reset link" });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        patient.portalAccount.password = hashedPassword;
        patient.portalAccount.resetToken = undefined;
        patient.portalAccount.resetTokenExpiry = undefined;
        await patient.save();
        
        res.json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Verify Email
router.get("/verify", async (req, res) => {
    try {
        const { token } = req.query;
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findOne({ _id: decoded.id });
        
        if (!patient) {
            return res.status(400).json({ error: "Invalid verification link" });
        }
        
        patient.portalAccount.isVerified = true;
        await patient.save();
        
        res.json({ message: "Email verified successfully" });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT DATA ACCESS ============

// Get patient's medical records
router.get("/records", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id);
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const records = await MedicalRecord.find({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .select({
                visitDate: 1,
                visitType: 1,
                hospital: 1,
                doctorName: 1,
                disposition: 1,
                dischargeInstructions: 1,
                symptoms: 1,
                primaryDiagnosis: 1,
                secondaryDiagnoses: 1,
                disease: 1,
                differentialDiagnosis: 1,
                physicalExam: 1,
                prescribedMedications: 1,
                treatmentPlan: 1,
                investigations: 1,
                vitalSigns: 1,
                notes: 1,
                province: 1
            });
        
        res.json({ records });
    } catch (error) {
        console.error("Error fetching patient records:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get patient's vital signs history
router.get("/vitals", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id);
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const vitalsHistory = await MedicalRecord.find(
            { patientId: patient._id },
            { 
                visitDate: 1, 
                visitType: 1,
                'vitalSigns.temperature': 1,
                'vitalSigns.bloodPressure': 1,
                'vitalSigns.heartRate': 1,
                'vitalSigns.respiratoryRate': 1,
                'vitalSigns.oxygenSaturation': 1,
                'vitalSigns.weight': 1,
                'vitalSigns.height': 1,
                'vitalSigns.bmi': 1,
                'vitalSigns.painScore': 1
            }
        ).sort({ visitDate: -1 });
        
        res.json({ vitals: vitalsHistory });
    } catch (error) {
        console.error("Error fetching vitals:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get patient profile
router.get("/profile", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const patient = await Patient.findById(decoded.id).select("-portalAccount.password");
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        const recordsCount = await MedicalRecord.countDocuments({ patientId: patient._id });
        const lastVisit = await MedicalRecord.findOne({ patientId: patient._id }).sort({ visitDate: -1 });
        
        res.json({
            patient: {
                id: patient._id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                nationalId: patient.nationalId,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                province: patient.province,
                contactInfo: patient.contactInfo
            },
            stats: {
                totalRecords: recordsCount,
                lastVisitDate: lastVisit?.visitDate || null,
                lastVisitHospital: lastVisit?.hospital || null
            }
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;