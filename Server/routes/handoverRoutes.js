const express = require("express");
const router = express.Router();
const Handover = require("../models/Handover");
const { protect } = require("../middleware/auth");
const { hasPermission } = require("../middleware/rbac");

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
router.post("/", protect, hasPermission("edit:patients"), async (req, res) => {
    try {
        const { patientId, tasks, summaryNote, shiftType, type, targetHospital, assignedUsers } = req.body;
        
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

module.exports = router;
