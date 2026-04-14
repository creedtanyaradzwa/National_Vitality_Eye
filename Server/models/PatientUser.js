const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const patientUserSchema = new mongoose.Schema({
    // ============ LINK TO PATIENT ============
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
        unique: true
    },
    
    // ============ IDENTIFICATION ============
    nationalId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    
    // ============ CONTACT INFORMATION ============
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        index: true
    },
    phoneNumber: { type: String },
    
    // ============ AUTHENTICATION ============
    password: { type: String, required: true },
    
    // ============ VERIFICATION ============
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // ============ ACCOUNT STATUS ============
    isActive: { 
        type: Boolean, 
        default: true,
        index: true
    },
    deactivatedAt: Date,
    deactivationReason: String,
    reactivationDate: Date,
    deactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    
    // ============ SECURITY ============
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLogin: Date,
    lastLoginIP: String,
    lastLoginUserAgent: String,
    
    // ============ CONSENT ============
    consentGiven: { type: Boolean, default: false },
    consentDate: Date,
    consentVersion: { type: String, default: "1.0" },
    consentHistory: [{
        version: String,
        agreedAt: Date,
        ipAddress: String
    }],
    
    // ============ PREFERENCES ============
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        language: { type: String, default: "en" },
        twoFactorEnabled: { type: Boolean, default: false },
        twoFactorSecret: String
    },
    
    // ============ SUSPENSION (ADMIN ACTION) ============
    suspendedAt: Date,
    suspensionReason: String,
    suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    suspensionDuration: Number, // in days, null = indefinite
    scheduledReactivation: Date,
    
    // ============ AUDIT LOG ============
    auditLog: [{
        action: {
            type: String,
            enum: ["LOGIN", "LOGIN_FAILED", "LOGOUT", "VIEW_RECORD", "VIEW_RECORDS", 
                   "DOWNLOAD", "REQUEST_CORRECTION", "CONSENT_CHANGE", "SUSPEND", 
                   "REACTIVATE", "PASSWORD_CHANGE", "PASSWORD_RESET_REQUEST", 
                   "PASSWORD_RESET_COMPLETE", "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED"]
        },
        timestamp: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
        details: mongoose.Schema.Types.Mixed
    }],
    
    // ============ DEVICE MANAGEMENT ============
    devices: [{
        deviceId: String,
        deviceName: String,
        deviceType: {
            type: String,
            enum: ["mobile", "tablet", "desktop", "unknown"]
        },
        lastUsed: Date,
        isTrusted: { type: Boolean, default: false }
    }],
    
    // ============ SESSION MANAGEMENT ============
    currentSessionId: String,
    sessionExpiresAt: Date,
    
    // ============ METADATA ============
    registeredAt: { type: Date, default: Date.now },
    registeredIP: String,
    lastActivityAt: Date
    
}, { timestamps: true });

// ============ INDEXES ============
patientUserSchema.index({ email: 1 });
patientUserSchema.index({ nationalId: 1 });
patientUserSchema.index({ patientId: 1 });
patientUserSchema.index({ isActive: 1 });
patientUserSchema.index({ verificationToken: 1 });
patientUserSchema.index({ passwordResetToken: 1 });
patientUserSchema.index({ "devices.deviceId": 1 });
patientUserSchema.index({ currentSessionId: 1 });

// ============ PRE-SAVE HOOKS ============

// Hash password before saving
patientUserSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Update timestamps
patientUserSchema.pre("save", function(next) {
    this.updatedAt = Date.now();
    next();
});

// ============ INSTANCE METHODS ============

// Compare password
patientUserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
patientUserSchema.methods.isLocked = function() {
    if (this.lockedUntil && this.lockedUntil > Date.now()) {
        return true;
    }
    return false;
};

// Check if account is suspended
patientUserSchema.methods.isSuspended = function() {
    if (!this.isActive) return true;
    if (this.suspendedAt) {
        if (this.suspensionDuration) {
            const suspensionEnd = new Date(this.suspendedAt);
            suspensionEnd.setDate(suspensionEnd.getDate() + this.suspensionDuration);
            if (suspensionEnd > Date.now()) {
                return true;
            }
        } else {
            return true; // Indefinite suspension
        }
    }
    return false;
};

// Record login attempt
patientUserSchema.methods.recordLoginAttempt = async function(success, ipAddress, userAgent) {
    if (success) {
        this.loginAttempts = 0;
        this.lockedUntil = null;
        this.lastLogin = new Date();
        this.lastLoginIP = ipAddress;
        this.lastLoginUserAgent = userAgent;
        this.auditLog.push({
            action: "LOGIN",
            ipAddress,
            userAgent,
            details: { success: true }
        });
    } else {
        this.loginAttempts += 1;
        this.auditLog.push({
            action: "LOGIN_FAILED",
            ipAddress,
            userAgent,
            details: { attempts: this.loginAttempts }
        });
        
        // Lock account after 5 failed attempts
        if (this.loginAttempts >= 5) {
            this.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
            this.auditLog.push({
                action: "ACCOUNT_LOCKED",
                ipAddress,
                userAgent,
                details: { reason: "Too many failed login attempts" }
            });
        }
    }
    await this.save();
};

// Record action in audit log
patientUserSchema.methods.recordAction = async function(action, ipAddress, userAgent, details = {}) {
    this.auditLog.push({
        action,
        timestamp: new Date(),
        ipAddress,
        userAgent,
        details
    });
    
    // Keep only last 500 audit entries
    if (this.auditLog.length > 500) {
        this.auditLog = this.auditLog.slice(-500);
    }
    
    await this.save();
};

// Generate verification token
patientUserSchema.methods.generateVerificationToken = function() {
    const token = crypto.randomBytes(32).toString("hex");
    this.verificationToken = token;
    this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return token;
};

// Generate password reset token
patientUserSchema.methods.generatePasswordResetToken = function() {
    const token = crypto.randomBytes(32).toString("hex");
    this.passwordResetToken = token;
    this.passwordResetExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
    return token;
};

// ============ STATIC METHODS ============

// Find by email with patient details
patientUserSchema.statics.findByEmailWithPatient = function(email) {
    return this.findOne({ email }).populate("patientId");
};

// Find by national ID
patientUserSchema.statics.findByNationalId = function(nationalId) {
    return this.findOne({ nationalId }).populate("patientId");
};

// Get all suspended accounts
patientUserSchema.statics.getSuspendedAccounts = function() {
    return this.find({ 
        isActive: false,
        suspendedAt: { $exists: true }
    }).populate("patientId", "firstName lastName nationalId");
};

// Get accounts pending verification
patientUserSchema.statics.getPendingVerification = function() {
    return this.find({ 
        isVerified: false,
        verificationExpires: { $gt: Date.now() }
    });
};

module.exports = mongoose.model("PatientUser", patientUserSchema);