const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    // Personal Information
    firstName: String,
    lastName: String,
    email: String,
    phoneNumber: String,
    employeeId: String,
    hospitalName: String,
    hospitalId: String,
    province: String,
    position: String,
    
    // Authentication
    userId: {
        type: String,
        unique: true,
        sparse: true
    },
    password: String,
    
    // RBAC & Status
    role: {
        type: String,
        default: 'pending'
    },
    approvalStatus: {
        type: String,
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Document Upload Fields
    verificationDocuments: {
        nationalId: String,
        employmentLetter: String,
        practicingLicense: String,
        profilePhoto: String
    },
    
    // Admin Actions
    rejectionReason: String,
    approvedAt: Date,
    lastLogin: Date
    
}, { timestamps: true });

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const { normaliseHospital, normaliseProvince } = require("../utils/normalise");

UserSchema.pre("save", async function() {
    if (this.hospitalName) {
        this.hospitalName = normaliseHospital(this.hospitalName);
    }
    if (this.province) {
        this.province = normaliseProvince(this.province);
    }
});

module.exports = mongoose.model('User', UserSchema);