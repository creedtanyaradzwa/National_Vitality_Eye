const mongoose = require('mongoose');

const citizenReportSchema = new mongoose.Schema({
    location: {
        province: { type: String, required: true },
        district: { type: String, required: true },
        ward: String,
        village: String
    },
    symptoms: [{ type: String, required: true }],
    onset: { type: Date, default: Date.now },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient' // Optional: link to patient if logged in
    },
    contactInfo: {
        phone: String,
        isAnonymous: { type: Boolean, default: true }
    },
    verificationStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Flagged'],
        default: 'Pending'
    },
    metadata: {
        userAgent: String,
        ipHash: String // For basic rate limiting/de-duplication
    }
}, { timestamps: true });

module.exports = mongoose.model('CitizenReport', citizenReportSchema);
