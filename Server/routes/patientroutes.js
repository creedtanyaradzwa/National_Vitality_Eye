const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
// const PatientUser = require("../models/PatientUser"); // REMOVED - model no longer exists
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved } = require("../middleware/rbac");

// All routes require authentication and approval
router.use(protect, isApproved);

// ============ PATIENT MANAGEMENT ============

// GET all patients
router.get("/", hasPermission("view:patients"), async (req, res) => {
    try {
        const patients = await Patient.find().select("-clinicalProfile");
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create patient
router.post("/", hasPermission("create:patients"), async (req, res) => {
    try {
        const patient = new Patient(req.body);
        patient.createdBy = req.user._id;
        await patient.save();
        res.status(201).json(patient);
    } catch (error) {
        console.error("Error creating patient:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET patient count (for analytics)
router.get("/stats/count", hasPermission("view:analytics"), async (req, res) => {
    try {
        const count = await Patient.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET patient by National ID
router.get("/national/:nationalId", hasPermission("view:patients"), async (req, res) => {
    try {
        const patient = await Patient.findOne({
            nationalId: req.params.nationalId
        });
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET patient by ID
router.get("/:id", hasPermission("view:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update patient
router.patch("/:id", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user._id },
            { new: true, runValidators: true }
        );
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE patient
router.delete("/:id", hasPermission("delete:patients"), async (req, res) => {
    try {
        const patient = await Patient.findByIdAndDelete(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json({ message: "Patient deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ CLINICAL PROFILE ENDPOINTS ============

// GET patient's full clinical profile
router.get("/:id/clinical-profile", hasPermission("view:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select("clinicalProfile");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient.clinicalProfile || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE clinical profile
router.patch("/:id/clinical-profile", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        patient.clinicalProfile = {
            ...patient.clinicalProfile,
            ...req.body
        };
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.clinicalProfile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADD chronic condition
router.post("/:id/chronic-condition", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.chronicConditions) patient.clinicalProfile.chronicConditions = [];
        
        patient.clinicalProfile.chronicConditions.push(req.body);
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.clinicalProfile.chronicConditions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADD allergy
router.post("/:id/allergy", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.allergies) patient.clinicalProfile.allergies = [];
        
        patient.clinicalProfile.allergies.push(req.body);
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.clinicalProfile.allergies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADD medication
router.post("/:id/medication", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.currentMedications) patient.clinicalProfile.currentMedications = [];
        
        patient.clinicalProfile.currentMedications.push({
            ...req.body,
            prescribedBy: req.user._id,
            prescribedDate: new Date()
        });
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.clinicalProfile.currentMedications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE vital signs
router.patch("/:id/vital-signs", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        
        patient.clinicalProfile.vitalSigns = {
            ...req.body,
            lastUpdated: new Date(),
            recordedBy: req.user._id
        };
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.clinicalProfile.vitalSigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADD risk factor
router.post("/:id/risk-factor", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.clinicalProfile) patient.clinicalProfile = {};
        if (!patient.clinicalProfile.riskFactors) patient.clinicalProfile.riskFactors = [];
        
        patient.clinicalProfile.riskFactors.push(req.body);
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.clinicalProfile.riskFactors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PREGNANCY ENDPOINTS ============

// GET pregnancy info
router.get("/:id/pregnancy", hasPermission("view:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select("pregnancyInfo");
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient.pregnancyInfo || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE pregnancy info
router.patch("/:id/pregnancy", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        patient.pregnancyInfo = {
            ...patient.pregnancyInfo,
            ...req.body
        };
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.pregnancyInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADD antenatal visit
router.post("/:id/antenatal-visit", hasPermission("edit:patients"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.pregnancyInfo) patient.pregnancyInfo = {};
        if (!patient.pregnancyInfo.antenatalVisits) patient.pregnancyInfo.antenatalVisits = [];
        
        patient.pregnancyInfo.antenatalVisits.push({
            ...req.body,
            visitDate: new Date()
        });
        patient.updatedBy = req.user._id;
        await patient.save();
        
        res.json(patient.pregnancyInfo.antenatalVisits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ADMIN PATIENT MANAGEMENT ============

// GET all patients with portal account status (admin only)
router.get("/admin/all", hasPermission("admin"), async (req, res) => {
    try {
        const patients = await Patient.find()
            .select("-clinicalProfile") // Exclude large clinical data
            .lean();
        
        // Get portal account status from the patient document itself
        const patientsWithPortal = patients.map(patient => ({
            ...patient,
            portal: patient.portalAccount ? {
                hasPortalAccount: patient.portalAccount.hasAccount || false,
                portalActive: patient.portalAccount.isActive !== false,
                portalEmail: patient.portalAccount.email,
                portalLastLogin: patient.portalAccount.lastLogin
            } : {
                hasPortalAccount: false,
                portalActive: null,
                portalEmail: null,
                portalLastLogin: null
            }
        }));
        
        res.json(patientsWithPortal);
    } catch (error) {
        console.error("Error fetching patients for admin:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET single patient with portal details (admin only)
router.get("/admin/:id", hasPermission("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id)
            .select("-clinicalProfile");
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        res.json({
            ...patient.toObject(),
            portal: patient.portalAccount ? {
                hasAccount: patient.portalAccount.hasAccount || false,
                isActive: patient.portalAccount.isActive !== false,
                email: patient.portalAccount.email,
                phoneNumber: patient.portalAccount.phoneNumber,
                createdAt: patient.portalAccount.createdAt,
                lastLogin: patient.portalAccount.lastLogin,
                consentGiven: patient.portalAccount.consentGiven,
                consentDate: patient.portalAccount.consentDate
            } : {
                hasAccount: false
            }
        });
    } catch (error) {
        console.error("Error fetching patient for admin:", error);
        res.status(500).json({ error: error.message });
    }
});

// SUSPEND patient portal access (admin only)
router.patch("/admin/:id/suspend-portal", hasPermission("admin"), async (req, res) => {
    try {
        const { reason, duration } = req.body;
        
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.portalAccount || !patient.portalAccount.hasAccount) {
            return res.status(404).json({ error: "Patient does not have a portal account" });
        }
        
        patient.portalAccount.isActive = false;
        patient.portalAccount.suspendedAt = new Date();
        patient.portalAccount.suspensionReason = reason || "Suspended by administrator";
        
        if (duration) {
            patient.portalAccount.suspensionDuration = parseInt(duration);
        }
        
        await patient.save();
        
        res.json({
            message: `Portal access suspended${duration ? ` for ${duration} days` : ''}`,
            suspension: {
                reason: patient.portalAccount.suspensionReason,
                suspendedAt: patient.portalAccount.suspendedAt
            }
        });
    } catch (error) {
        console.error("Error suspending portal access:", error);
        res.status(500).json({ error: error.message });
    }
});

// REACTIVATE patient portal access (admin only)
router.patch("/admin/:id/reactivate-portal", hasPermission("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        if (!patient.portalAccount || !patient.portalAccount.hasAccount) {
            return res.status(404).json({ error: "Patient does not have a portal account" });
        }
        
        patient.portalAccount.isActive = true;
        patient.portalAccount.suspendedAt = null;
        patient.portalAccount.suspensionReason = null;
        patient.portalAccount.suspensionDuration = null;
        patient.portalAccount.loginAttempts = 0;
        patient.portalAccount.lockedUntil = null;
        
        await patient.save();
        
        res.json({ message: "Portal access reactivated successfully" });
    } catch (error) {
        console.error("Error reactivating portal access:", error);
        res.status(500).json({ error: error.message });
    }
});

// DEACTIVATE patient completely (admin only)
router.patch("/admin/:id/deactivate", hasPermission("admin"), async (req, res) => {
    try {
        const { reason } = req.body;
        
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        patient.isActive = false;
        patient.deactivatedAt = new Date();
        patient.deactivationReason = reason || "Deactivated by administrator";
        patient.deactivatedBy = req.user._id;
        
        // Also suspend portal access if exists
        if (patient.portalAccount) {
            patient.portalAccount.isActive = false;
        }
        
        await patient.save();
        
        res.json({ message: "Patient account deactivated successfully" });
    } catch (error) {
        console.error("Error deactivating patient:", error);
        res.status(500).json({ error: error.message });
    }
});

// REACTIVATE patient (admin only)
router.patch("/admin/:id/reactivate", hasPermission("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        patient.isActive = true;
        patient.deactivatedAt = null;
        patient.deactivationReason = null;
        
        await patient.save();
        
        res.json({ message: "Patient account reactivated successfully" });
    } catch (error) {
        console.error("Error reactivating patient:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET patient access audit log (admin only)
router.get("/admin/:id/audit", hasPermission("admin"), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id)
            .select("portalAccount.auditLog portalAccount.loginAttempts portalAccount.lockedUntil portalAccount.isActive portalAccount.suspensionReason deactivationReason");
        
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        
        res.json({
            isActive: patient.isActive !== false,
            deactivationReason: patient.deactivationReason,
            loginAttempts: patient.portalAccount?.loginAttempts || 0,
            lockedUntil: patient.portalAccount?.lockedUntil,
            suspensionReason: patient.portalAccount?.suspensionReason,
            auditLog: patient.portalAccount?.auditLog?.slice(-50) || []
        });
    } catch (error) {
        console.error("Error fetching audit log:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;