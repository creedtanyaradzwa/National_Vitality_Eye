const express = require("express");
const router = express.Router();
const Handover = require("../models/Handover");
const { protect } = require("../middleware/auth");
const { hasPermission, isApproved, hasRole } = require("../middleware/rbac");

// @route   PATCH /api/handovers/:id/assign
// @desc    Admin assigns staff to a handover (External Transfer)
// @access  Private (Admin)
router.patch("/:id/assign", protect, isApproved, hasRole("admin"), async (req, res) => {
    try {
        const { assignedUsers } = req.body;
        const MedicalRecord = require("../models/MedicalRecord");

        const handover = await Handover.findById(req.params.id);
        if (!handover) return res.status(404).json({ error: "Handover not found" });

        // Ensure only admin of the target hospital can assign
        if (req.user.hospitalName !== handover.targetHospital && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. Only target facility admin can assign." });
        }

        handover.assignedUsers = assignedUsers;
        await handover.save();

        // Tag the assigned users in the latest medical record to grant visibility
        if (assignedUsers && assignedUsers.length > 0) {
            const latestRecord = await MedicalRecord.findOne({ patientId: handover.patientId }).sort({ visitDate: -1 });
            if (latestRecord) {
                const currentTags = latestRecord.taggedUsers?.map(id => id.toString()) || [];
                const newTags = assignedUsers.filter(id => !currentTags.includes(id.toString()));
                
                if (newTags.length > 0) {
                    latestRecord.taggedUsers.push(...newTags);
                    await latestRecord.save();
                }
            }
        }

        res.json(handover);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error assigning staff" });
    }
});

// @route   GET /api/handovers/my-hospital
// @desc    Get all pending tasks (shift or incoming transfer) for the user's hospital
// @access  Private (Clinicians)
router.get("/my-hospital", protect, hasPermission("view:patients"), async (req, res) => {
    try {
        const hospital = req.user.hospitalName;
        
        const handovers = await Handover.find({
            $or: [
                { sourceHospital: hospital, type: "Shift" },
                { targetHospital: hospital, type: "Transfer" }
            ],
            "tasks.status": "Pending"
        })
        .sort({ createdAt: -1 })
        .populate("patientId", "firstName lastName nationalId")
        .populate("assignedUsers", "firstName lastName role position")
        .populate("creatorId", "firstName lastName role hospitalName");

        res.json(handovers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching hospital handovers" });
    }
});

// @route   POST /api/handovers
// @desc    Create a new handover
// @access  Private (Clinicians)
router.post("/", protect, isApproved, hasPermission("edit:patients"), async (req, res) => {
    try {
        const { patientId, tasks, summaryNote, shiftType, type, targetHospital, assignedUsers } = req.body;
        const Patient = require("../models/Patient");
        const MedicalRecord = require("../models/MedicalRecord");

        const handover = new Handover({
            patientId,
            creatorId: req.user._id,
            tasks,
            summaryNote,
            shiftType,
            type: type || "Shift",
            sourceHospital: req.user.hospitalName,
            targetHospital,
            assignedUsers
        });

        await handover.save();

        // Access Control Toggling (Gap: Siloed Shift Fix)
        const patient = await Patient.findById(patientId);
        if (patient) {
            // 1. If it's a transfer, update the patient's current hospital location
            if (type === 'Transfer' && targetHospital) {
                patient.currentHospital = targetHospital;
                await patient.save();
            }

            // 2. Tag assigned users in the latest medical record to ensure visibility
            if (assignedUsers && assignedUsers.length > 0) {
                const latestRecord = await MedicalRecord.findOne({ patientId }).sort({ visitDate: -1 });
                if (latestRecord) {
                    // Combine existing tagged users with the new ones, ensuring uniqueness
                    const currentTags = latestRecord.taggedUsers?.map(id => id.toString()) || [];
                    const newTags = assignedUsers.filter(id => !currentTags.includes(id.toString()));
                    
                    if (newTags.length > 0) {
                        latestRecord.taggedUsers.push(...newTags);
                        await latestRecord.save();
                    }
                }
            }
        }

        res.status(201).json(handover);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error creating handover" });
    }
});

// @route   GET /api/handovers/patient/:patientId
// @desc    Get active handover tasks for a patient (Global visibility for continuity)
// @access  Private (Clinicians)
router.get("/patient/:patientId", protect, hasPermission("view:patients"), async (req, res) => {
    try {
        const handovers = await Handover.find({ patientId: req.params.patientId })
            .sort({ createdAt: -1 })
            .populate("creatorId", "name firstName lastName role hospitalName")
            .populate("assignedUsers", "firstName lastName role position")
            .populate("tasks.completedBy", "name firstName lastName role");

        res.json(handovers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching handovers" });
    }
});

// @route   PATCH /api/handovers/:handoverId/task/:taskId
// @desc    Complete a specific task
// @access  Private (Clinicians)
router.patch("/:handoverId/task/:taskId", protect, hasPermission("edit:patients"), async (req, res) => {
    try {
        const handover = await Handover.findById(req.params.handoverId);
        if (!handover) return res.status(404).json({ error: "Handover not found" });

        const task = handover.tasks.id(req.params.taskId);
        if (!task) return res.status(404).json({ error: "Task not found" });

        task.status = req.body.status || "Completed";
        if (task.status === "Completed") {
            task.completedBy = req.user._id;
            task.completedAt = new Date();
        }

        await handover.save();
        res.json(handover);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error updating task" });
    }
});

// @route   GET /api/handovers/pending-count
// @desc    Get total count of pending tasks relevant to the user's hospital
// @access  Private (Clinicians)
router.get("/pending-count", protect, hasPermission("view:patients"), async (req, res) => {
    try {
        const hospital = req.user.hospitalName;
        
        // Count internal shift tasks + incoming transfers
        const countResult = await Handover.aggregate([
            { 
                $match: {
                    $or: [
                        { sourceHospital: hospital, type: "Shift" },
                        { targetHospital: hospital, type: "Transfer" }
                    ]
                }
            },
            { $unwind: "$tasks" },
            { $match: { "tasks.status": "Pending" } },
            { $count: "total" }
        ]);

        res.json({ count: countResult.length > 0 ? countResult[0].total : 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching task count" });
    }
});

module.exports = router;
