const express = require("express");
const router = express.Router();
const CitizenReport = require("../models/CitizenReport");
const Alert = require("../models/Alert");
const { protect } = require("../middleware/auth");

// POST community report
// This is used by patients to report symptoms in their area
router.post("/report", async (req, res) => {
    try {
        const { location, symptoms, isAnonymous, contactPhone } = req.body;
        
        // Try to identify the reporter if they are logged in (optional for this route)
        let reportedBy = null;
        if (req.headers.authorization) {
            try {
                // We don't strictly require 'protect' middleware here to allow anonymous reports
                // but we can try to extract user if token is present
                const token = req.headers.authorization.split(' ')[1];
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                if (decoded.role === 'patient') {
                    reportedBy = decoded.id;
                }
            } catch (e) {
                // Ignore decoding errors for optional auth
            }
        }

        const report = new CitizenReport({
            location,
            symptoms,
            contactInfo: {
                phone: contactPhone,
                isAnonymous: isAnonymous !== undefined ? isAnonymous : true
            },
            reportedBy
        });

        await report.save();

        res.status(201).json({ 
            message: "Report submitted successfully",
            reportId: report._id 
        });
    } catch (error) {
        console.error("Citizen report error:", error);
        res.status(500).json({ error: "Failed to submit report" });
    }
});

// GET all reports (Protected for personnel)
router.get("/reports", protect, async (req, res) => {
    try {
        // Only allow staff/admin to view all reports
        if (!['admin', 'doctor', 'nurse', 'staff'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { province, district, status } = req.query;
        const query = {};
        if (province) query["location.province"] = province;
        if (district) query["location.district"] = district;
        if (status) query.verificationStatus = status;

        const reports = await CitizenReport.find(query)
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ reports });
    } catch (error) {
        console.error("Fetch reports error:", error);
        res.status(500).json({ error: "Failed to fetch community reports" });
    }
});

// GET local alerts based on location (province, district, ward)
router.get("/alerts", async (req, res) => {
    try {
        const { province, district, ward } = req.query;
        
        // Build granular query
        const query = { status: { $ne: "RESOLVED" } };
        if (province) query["location.province"] = province;
        if (district) query["location.district"] = district;
        if (ward) query["location.ward"] = ward;
        
        // Find active/monitoring alerts for this area
        const alerts = await Alert.find(query)
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({ alerts });
    } catch (error) {
        console.error("Fetch alerts error:", error);
        res.status(500).json({ error: "Failed to fetch alerts" });
    }
});

module.exports = router;
