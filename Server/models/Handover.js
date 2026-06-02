const mongoose = require("mongoose");

const handoverTaskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    dueTime: Date,
    priority: {
        type: String,
        enum: ["High", "Medium", "Low"],
        default: "Medium"
    },
    status: {
        type: String,
        enum: ["Pending", "Completed", "Archived"],
        default: "Pending"
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    completedAt: Date
});

const handoverSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tasks: [handoverTaskSchema],
    summaryNote: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["Shift", "Transfer"],
        default: "Shift"
    },
    sourceHospital: String,
    targetHospital: String,
    shiftType: {
        type: String,
        enum: ["Morning", "Afternoon", "Night", "Other"]
    },
    assignedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance
handoverSchema.index({ patientId: 1, createdAt: -1 });

const { normaliseHospital } = require("../utils/normalise");

handoverSchema.pre("save", async function() {
    if (this.sourceHospital) {
        this.sourceHospital = normaliseHospital(this.sourceHospital);
    }
    if (this.targetHospital) {
        this.targetHospital = normaliseHospital(this.targetHospital);
    }
});

module.exports = mongoose.model("Handover", handoverSchema);
