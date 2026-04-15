const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
    // ============ IDENTIFICATION ============
    nationalId: {
        type: String,
        required: [true, "National ID is required"],
        unique: true,
        match: [/^\d{2}-\d{6}-[A-Z]\d{2}$/, "Invalid Zimbabwe National ID format"]
    },
    firstName: {
        type: String,
        required: [true, "First name is required"]
    },
    lastName: {
        type: String,
        required: [true, "Last name is required"]
    },
    dateOfBirth: {
        type: Date,
        required: [true, "Date of birth is required"]
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
    
    // ============ COMPREHENSIVE CLINICAL PROFILE ============
    clinicalProfile: {
        bloodType: {
            type: String,
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
            default: "Unknown"
        },
        chronicConditions: [{
            condition: String,
            diagnosisDate: Date,
            status: {
                type: String,
                enum: ["Active", "Controlled", "Remission", "Resolved"],
                default: "Active"
            },
            severity: {
                type: String,
                enum: ["Mild", "Moderate", "Severe", "Critical"],
                default: "Moderate"
            },
            medications: [String],
            notes: String,
            diagnosedBy: String,
            hospital: String
        }],
        allergies: [{
            allergen: String,
            reaction: String,
            severity: {
                type: String,
                enum: ["Mild", "Moderate", "Severe", "Life-Threatening"],
                default: "Moderate"
            },
            diagnosedDate: Date,
            notes: String
        }],
        currentMedications: [{
            medication: String,
            dosage: String,
            frequency: String,
            route: {
                type: String,
                enum: ["Oral", "IV", "IM", "Topical", "Inhalation", "Other"],
                default: "Oral"
            },
            prescribedDate: {
                type: Date,
                default: Date.now
            },
            prescribedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            endDate: Date,
            active: {
                type: Boolean,
                default: true
            }
        }],
        vitalSigns: {
            height: Number,
            weight: Number,
            bmi: Number,
            bloodPressure: {
                systolic: Number,
                diastolic: Number
            },
            heartRate: Number,
            temperature: Number,
            respiratoryRate: Number,
            oxygenSaturation: Number,
            lastUpdated: Date,
            recordedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        },
        riskFactors: [{
            factor: {
                type: String,
                enum: ["Smoking", "Alcohol Use", "Substance Use", "Obesity", 
                       "Family History", "Occupational Hazard", "Other"]
            },
            details: String,
            since: Date,
            status: {
                type: String,
                enum: ["Current", "Former", "Never"],
                default: "Current"
            },
            notes: String
        }],
        surgicalHistory: [{
            procedure: String,
            date: Date,
            hospital: String,
            surgeon: String,
            notes: String
        }],
        familyHistory: {
            mother: [String],
            father: [String],
            siblings: [String],
            notes: String
        }
    },
    
    // ============ PREGNANCY TRACKING ============
    pregnancyInfo: {
        isPregnant: { type: Boolean, default: false },
        dueDate: Date,
        gravida: Number,
        para: Number,
        abortions: Number,
        livingChildren: Number,
        lastMenstrualPeriod: Date,
        highRisk: { type: Boolean, default: false },
        antenatalVisits: [{
            visitDate: Date,
            facility: String,
            notes: String
        }],
        notes: String
    },
    
    // ============ PEDIATRIC INFORMATION ============
    pediatricInfo: {
        birthWeight: Number,
        birthLength: Number,
        gestationalAge: Number,
        deliveryType: {
            type: String,
            enum: ["Vaginal", "C-Section", "Assisted"]
        },
        apgarScore: {
            oneMinute: Number,
            fiveMinute: Number
        },
        developmentalMilestones: [{
            milestone: String,
            achievedDate: Date,
            notes: String
        }]
    },
    
    // ============ INSURANCE INFORMATION ============
    insuranceInfo: {
        provider: String,
        policyNumber: String,
        memberId: String,
        validFrom: Date,
        validTo: Date,
        coverageType: {
            type: String,
            enum: ["Private", "Government", "NGO", "None"],
            default: "None"
        }
    },
    
    // ============ SPECIAL NEEDS ============
    specialNeeds: {
        hasDisability: { type: Boolean, default: false },
        disabilityType: String,
        requiresAssistance: { type: Boolean, default: false },
        notes: String
    },
    
    // ============ ACCOUNT STATUS (FOR ADMIN MANAGEMENT) ============
    isActive: {
        type: Boolean,
        default: true
    },
    deactivatedAt: Date,
    deactivationReason: String,
    reactivationDate: Date,
    deactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    
    // ============ PATIENT PORTAL ACCOUNT ============
    portalAccount: {
        hasAccount: { type: Boolean, default: false },
        email: { type: String, lowercase: true, sparse: true },
        phoneNumber: String,
        password: String,
        createdAt: Date,
        lastLogin: Date,
        loginAttempts: { type: Number, default: 0 },
        lockedUntil: Date,
        isVerified: { type: Boolean, default: false },
        verificationToken: String,
        verificationExpires: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        consentGiven: { type: Boolean, default: false },
        consentDate: Date,
        consentVersion: { type: String, default: "1.0" },
        isActive: { type: Boolean, default: true },
        suspendedAt: Date,
        suspensionReason: String,
        suspensionDuration: Number,
        auditLog: [{
            action: {
                type: String,
                enum: ["REGISTER", "VERIFY_EMAIL", "LOGIN", "LOGIN_FAILED", "LOGOUT", 
                       "VIEW_RECORD", "VIEW_RECORDS", "DOWNLOAD", "REQUEST_CORRECTION", 
                       "CONSENT_CHANGE", "SUSPEND", "REACTIVATE", "PASSWORD_CHANGE", 
                       "PASSWORD_RESET_REQUEST", "PASSWORD_RESET_COMPLETE","PASSWORD_RESET", 
                       "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED"]
            },
            timestamp: { type: Date, default: Date.now },
            ipAddress: String,
            userAgent: String,
            details: mongoose.Schema.Types.Mixed
        }],
        preferences: {
            emailNotifications: { type: Boolean, default: true },
            smsNotifications: { type: Boolean, default: false },
            language: { type: String, default: "en" }
        }
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
    notes: String
    
}, { timestamps: true });

// ============ VIRTUALS ============
patientSchema.virtual("fullName").get(function() {
    return `${this.firstName} ${this.lastName}`;
});

patientSchema.virtual("age").get(function() {
    if (!this.dateOfBirth) return null;
    const ageDiff = Date.now() - this.dateOfBirth.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// ============ INDEXES ============
patientSchema.index({ nationalId: 1 });
patientSchema.index({ firstName: 1, lastName: 1 });
patientSchema.index({ "portalAccount.email": 1 });
patientSchema.index({ "portalAccount.verificationToken": 1 });
patientSchema.index({ "portalAccount.passwordResetToken": 1 });
patientSchema.index({ isActive: 1 });
patientSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Patient", patientSchema);