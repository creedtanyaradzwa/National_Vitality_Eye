const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { hasRole, isApproved } = require("../middleware/rbac");
const { validateRegistration, validateLogin, validatePasswordChange } = require("../middleware/validation");
const { uploadDocuments, handleUploadError } = require("../middleware/upload");
const { sendApprovalEmail, sendRejectionEmail, sendRegistrationConfirmation } = require("../utils/emailService");

const router = express.Router();

// Helper to generate userId
const generateUserId = (firstName) => {
    const prefix = firstName.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
};

// ============ PUBLIC ROUTES ============

// 1. User Registration with Document Upload
router.post("/register", uploadDocuments, handleUploadError, validateRegistration, async (req, res) => {
    try {
        const {
            firstName, lastName, email, phoneNumber,
            employeeId, hospitalName, hospitalId,
            province, position, qualifications
        } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { employeeId }]
        });

        if (existingUser) {
            // Clean up uploaded files
            if (req.files) {
                Object.values(req.files).forEach(fileArray => {
                    fileArray.forEach(file => {
                        try {
                            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                        } catch (e) {}
                    });
                });
            }
            return res.status(400).json({
                error: "User with this email or employee ID already exists"
            });
        }

        // Process uploaded files
        const verificationDocuments = {};
        if (req.files) {
            if (req.files.nationalId) verificationDocuments.nationalId = req.files.nationalId[0].path;
            if (req.files.employmentLetter) verificationDocuments.employmentLetter = req.files.employmentLetter[0].path;
            if (req.files.practicingLicense) verificationDocuments.practicingLicense = req.files.practicingLicense[0].path;
            if (req.files.profilePhoto) verificationDocuments.profilePhoto = req.files.profilePhoto[0].path;
        }

        // Validate required documents
        if (!verificationDocuments.nationalId) {
            return res.status(400).json({ error: "National ID document is required" });
        }
        if (!verificationDocuments.employmentLetter) {
            return res.status(400).json({ error: "Employment verification letter is required" });
        }

        // Generate userId
        const userId = generateUserId(firstName);

        // Create user with pending status
        const user = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            employeeId,
            hospitalName,
            hospitalId,
            province,
            position,
            qualifications: qualifications ? qualifications.split(",") : [],
            verificationDocuments,
            userId,
            role: "pending",
            approvalStatus: "pending",
            isActive: true
        });

        // Send registration confirmation email
        await sendRegistrationConfirmation(
            user.email,
            `${user.firstName} ${user.lastName}`,
            user.userId
        );

        res.status(201).json({
            message: "Registration successful! Your documents have been submitted for review.",
            userId: user.userId,
            approvalStatus: user.approvalStatus,
            documentsUploaded: {
                nationalId: !!verificationDocuments.nationalId,
                employmentLetter: !!verificationDocuments.employmentLetter,
                practicingLicense: !!verificationDocuments.practicingLicense,
                profilePhoto: !!verificationDocuments.profilePhoto
            }
        });
    } catch (error) {
        // Clean up uploaded files if there's an error
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    try {
                        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    } catch (e) {}
                });
            });
        }
        console.error("Registration error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Login
router.post("/login", validateLogin, async (req, res) => {
    try {
        const { userId, password } = req.body;
        
        console.log("=== LOGIN ATTEMPT ===");
        console.log("User ID:", userId);
        
        // Find user by userId (not _id)
        const user = await User.findOne({ userId }).select("+password");
        
        if (!user) {
            console.log("User not found:", userId);
            return res.status(401).json({ error: "Invalid User ID or password" });
        }
        
        console.log("User found:", user.userId);
        console.log("Role:", user.role);
        console.log("Has password:", !!user.password);
        console.log("Approval status:", user.approvalStatus);
        console.log("Is active:", user.isActive);
        
        // Check if user has a password set (approved users only)
        if (!user.password) {
            console.log("No password set - user not approved");
            return res.status(401).json({
                error: "Account not yet approved. Please wait for admin approval."
            });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        console.log("Password valid:", isValid);
        
        if (!isValid) {
            console.log("Invalid password for user:", userId);
            return res.status(401).json({ error: "Invalid User ID or password" });
        }

        // Check if account is active
        if (!user.isActive) {
            console.log("Account deactivated:", userId);
            return res.status(403).json({ error: "Account is deactivated. Contact admin." });
        }

        // Check approval status
        if (user.approvalStatus !== "approved") {
            console.log("Account not approved:", user.approvalStatus);
            return res.status(403).json({
                error: `Account ${user.approvalStatus}. Please wait for admin approval.`
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, userId: user.userId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log("Login successful for:", userId);
        console.log("====================");
        
        res.json({
            message: "Login successful",
            token,
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                approvalStatus: user.approvalStatus,
                hospitalName: user.hospitalName,
                province: user.province
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ADMIN ROUTES (Protected) ============

// 3. Get all pending approvals
router.get("/admin/pending-users", protect, hasRole("admin"), async (req, res) => {
    try {
        const pendingUsers = await User.find({
            approvalStatus: "pending",
            role: "pending"
        }).select("-password");

        res.json(pendingUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Approve or reject user
router.post("/admin/process-approval/:userId", protect, hasRole("admin"), async (req, res) => {
    try {
        const { action, role, rejectionReason } = req.body;
        const targetUser = await User.findOne({ userId: req.params.userId });

        if (!targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (action === "approve") {
            // Validate role
            if (!["doctor", "nurse", "data_entry", "viewer"].includes(role)) {
                return res.status(400).json({ error: "Invalid role selected" });
            }

            // Generate temporary password
            const tempPassword = `${targetUser.firstName}@${Math.floor(1000 + Math.random() * 9000)}`;
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            targetUser.password = hashedPassword;
            targetUser.role = role;
            targetUser.approvalStatus = "approved";
            targetUser.approvedAt = new Date();
            
            await targetUser.save();

            console.log(`✅ User approved: ${targetUser.userId} - Password: ${tempPassword}`);

            // Send approval email
            await sendApprovalEmail(
                targetUser.email, 
                targetUser.userId, 
                tempPassword, 
                `${targetUser.firstName} ${targetUser.lastName}`,
                role
            );

            res.json({
                message: "User approved successfully",
                user: {
                    userId: targetUser.userId,
                    name: `${targetUser.firstName} ${targetUser.lastName}`,
                    role: targetUser.role,
                    credentials: {
                        userId: targetUser.userId,
                        password: tempPassword
                    }
                }
            });
        } 
        else if (action === "reject") {
            if (!rejectionReason) {
                return res.status(400).json({ error: "Rejection reason required" });
            }

            targetUser.approvalStatus = "rejected";
            targetUser.rejectionReason = rejectionReason;
            
            await targetUser.save();

            // Send rejection email
            await sendRejectionEmail(
                targetUser.email,
                `${targetUser.firstName} ${targetUser.lastName}`,
                rejectionReason
            );

            res.json({
                message: "User rejected",
                reason: rejectionReason
            });
        }
        else {
            return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
        }
    } catch (error) {
        console.error("Approval error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Get all users (admin only)
router.get("/admin/users", protect, hasRole("admin"), async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Suspend/activate user (admin only)
router.patch("/admin/users/:userId/toggle-status", protect, hasRole("admin"), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`,
            isActive: user.isActive
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Change user role (admin only)
router.patch("/admin/users/:userId/change-role", protect, hasRole("admin"), async (req, res) => {
    try {
        const { newRole } = req.body;
        const user = await User.findOne({ userId: req.params.userId });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!["doctor", "nurse", "data_entry", "viewer", "admin"].includes(newRole)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        user.role = newRole;
        await user.save();

        res.json({
            message: `User role changed to ${newRole}`,
            user: {
                userId: user.userId,
                name: `${user.firstName} ${user.lastName}`,
                newRole: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 8. View user's documents (admin only)
router.get("/admin/users/:userId/documents", protect, hasRole("admin"), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const documents = user.verificationDocuments || {};
        
        // Create URLs for document access
        const documentUrls = {};
        for (const [key, filePath] of Object.entries(documents)) {
            if (filePath) {
                const urlPath = filePath.replace(/\\/g, '/');
                documentUrls[key] = `/uploads/${urlPath.split('uploads/')[1]}`;
            }
        }
        
        res.json({
            userId: user.userId,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            hospitalName: user.hospitalName,
            position: user.position,
            documents: documentUrls
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. Download a specific document (admin only)
router.get("/admin/users/:userId/documents/:docType/download", protect, hasRole("admin"), async (req, res) => {
    try {
        const { userId, docType } = req.params;
        const user = await User.findOne({ userId });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const docPath = user.verificationDocuments?.[docType];
        
        if (!docPath) {
            return res.status(404).json({ error: "Document not found" });
        }
        
        // Check if file exists
        if (!fs.existsSync(docPath)) {
            return res.status(404).json({ error: "Document file not found on server" });
        }
        
        // Send the file
        res.sendFile(path.resolve(docPath));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ USER ROUTES (Protected) ============

// 10. Get current user profile
router.get("/profile", protect, isApproved, async (req, res) => {
    res.json({
        user: {
            userId: req.user.userId,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            role: req.user.role,
            approvalStatus: req.user.approvalStatus,
            hospitalName: req.user.hospitalName,
            province: req.user.province,
            position: req.user.position
        }
    });
});

// 11. Change password
router.post("/change-password", protect, isApproved, validatePasswordChange, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user._id).select("+password");
        
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        
        res.json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 12. Get staff by hospital (for tagging/handovers)
router.get("/staff", protect, async (req, res) => {
    try {
        const hospital = req.query.hospital || req.user.hospitalName;
        const query = {
            approvalStatus: "approved",
            isActive: true,
            role: { $in: ["doctor", "nurse", "data_entry", "admin"] }
        };

        if (hospital) {
            query.hospitalName = hospital;
        }

        const staff = await User.find(query).select("firstName lastName position role hospitalName");
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;