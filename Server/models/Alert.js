const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    disease: {
        type: String,
        required: true,
        index: true
    },
    location: {
        province: { type: String, required: true },
        district: String,
        ward: String
    },
    status: {
        type: String,
        enum: ['MONITORING', 'CONFIRMED', 'RESOLVED'],
        default: 'MONITORING',
        index: true
    },
    severity: {
        type: String,
        enum: ['CRITICAL', 'WARNING', 'INFO', 'MONITORING'],
        default: 'MONITORING'
    },
    strikeCount: {
        type: Number,
        default: 1
    },
    firstDetected: {
        type: Date,
        default: Date.now
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    metrics: {
        weightedCount: Number,
        rawCount: Number,
        threshold: Number,
        score: Number,
        increase: Number
    },
    context: {
        environmentalFactors: [String],
        hasCitizenSignal: { type: Boolean, default: false }
    },
    patientIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    }],
    protocol: {
        treatment: String,
        diagnosticSigns: String,
        source: String
    },
    recommendations: {
        type: [String],
        default: []
    },
    isAcknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: Date
}, { timestamps: true });

// Index for quick lookup of active alerts in a specific area
alertSchema.index({ 'location.province': 1, 'location.district': 1, disease: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
