const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
    // ============ IDENTIFICATION ============
    nationalId: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },
    
    // ============ CONTACT INFORMATION ============
    contactInfo: {
        phone: String,
        email: String,
        address: String,
        emergencyContact: {
            name: String,
            phone: String,
            relationship: String
        }
    },
    
    // ============ LOCATION ============
    province: {
        type: String,
        required: true,
        enum: ['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands']
    },
    district: String,
    ward: String,
    
    // ============ CLINICAL PROFILE - SIMPLIFIED ============
    clinicalProfile: {
        vitalSigns: mongoose.Schema.Types.Mixed,
        triageStatus: {
            priority: { 
                type: String, 
                enum: ["CRITICAL", "EMERGENT", "URGENT", "STABLE", "NON-URGENT"], 
                default: "STABLE" 
            },
            score: { type: Number, default: 0 },
            reasons: [String],
            color: String,
            lastAssessment: Date
        }
    },
    
    // ============ INSURANCE ============
    insuranceInfo: {
        provider: String,
        policyNumber: String,
        memberId: String,
        validFrom: Date,
        validTo: Date,
        coverageType: String
    },
    
    // ============ PATIENT PORTAL ============
    portalAccount: {
        hasAccount: { type: Boolean, default: false },
        email: String,
        phoneNumber: String,
        password: String,
        createdAt: Date,
        lastLogin: Date,
        consentGiven: { type: Boolean, default: false },
        consentDate: Date,
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false },
        auditLog: [{
            action: String,
            timestamp: Date,
            ipAddress: String,
            userAgent: String
        }],
        // Staff members the patient has explicitly granted full record access to.
        // A provider must have created or been tagged in at least one of the
        // patient's records before they can be added here.
        trustedProviders: [{
            userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            grantedAt: { type: Date, default: Date.now }
        }]
    },
    
    // ============ AUDIT FIELDS ============
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: String
    
}, { timestamps: true });

// ============ VIRTUAL FIELDS ============
patientSchema.virtual("fullName").get(function() {
    return `${this.firstName} ${this.lastName}`;
});

patientSchema.virtual("age").get(function() {
    if (!this.dateOfBirth) return null;
    const ageDiff = Date.now() - this.dateOfBirth.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
});

module.exports = mongoose.model("Patient", patientSchema);