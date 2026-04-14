// middleware/validation.js
const { body, param, query, validationResult } = require("express-validator");

// ============ AUTH VALIDATION ============

// Registration validation
exports.validateRegistration = [
    body("firstName")
        .notEmpty().withMessage("First name is required")
        .isLength({ min: 2 }).withMessage("First name must be at least 2 characters")
        .trim(),
    
    body("lastName")
        .notEmpty().withMessage("Last name is required")
        .isLength({ min: 2 }).withMessage("Last name must be at least 2 characters")
        .trim(),
    
    body("email")
        .isEmail().withMessage("Please enter a valid email address")
        .normalizeEmail()
        .trim(),
    
    body("phoneNumber")
        .notEmpty().withMessage("Phone number is required")
        .matches(/^(\+263|0)[7-9][0-9]{8}$/).withMessage("Invalid Zimbabwe phone number format"),
    
    body("employeeId")
        .notEmpty().withMessage("Employee ID is required")
        .trim(),
    
    body("hospitalName")
        .notEmpty().withMessage("Hospital name is required")
        .trim(),
    
    body("hospitalId")
        .notEmpty().withMessage("Hospital ID is required")
        .trim(),
    
    body("province")
        .notEmpty().withMessage("Province is required")
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    
    body("position")
        .notEmpty().withMessage("Position is required")
        .trim(),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// Login validation
exports.validateLogin = [
    body("userId")
        .notEmpty().withMessage("User ID is required")
        .trim(),
    
    body("password")
        .notEmpty().withMessage("Password is required"),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// Change password validation
exports.validatePasswordChange = [
    body("currentPassword")
        .notEmpty().withMessage("Current password is required"),
    
    body("newPassword")
        .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
        .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/)
        .withMessage("Password must contain at least one uppercase, one lowercase, and one number"),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// ============ PATIENT VALIDATION ============

// Patient validation - FIXED VERSION
exports.validatePatient = [
    body("nationalId")
        .optional()
        .matches(/^\d{2}-\d{6}-[A-Z]\d{2}$/).withMessage("Invalid Zimbabwe National ID format (e.g., 63-123456-A12)"),
    
    body("firstName")
        .optional()
        .isLength({ min: 2 }).withMessage("First name must be at least 2 characters")
        .trim(),
    
    body("lastName")
        .optional()
        .isLength({ min: 2 }).withMessage("Last name must be at least 2 characters")
        .trim(),
    
    body("dateOfBirth")
        .optional()
        .isISO8601().withMessage("Invalid date format"),
    
    body("gender")
        .optional()
        .isIn(["Male", "Female", "Other"]).withMessage("Gender must be Male, Female, or Other"),
    
    body("province")
        .optional()
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// ============ MEDICAL RECORD VALIDATION ============

// Medical record validation
exports.validateMedicalRecord = [
    body("patientId")
        .notEmpty().withMessage("Patient ID is required")
        .isMongoId().withMessage("Invalid patient ID"),
    
    body("hospital")
        .notEmpty().withMessage("Hospital name is required")
        .trim(),
    
    body("diagnosis")
        .notEmpty().withMessage("Diagnosis is required")
        .trim(),
    
    body("disease")
        .notEmpty().withMessage("Disease is required")
        .trim(),
    
    body("province")
        .notEmpty().withMessage("Province is required")
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    
    body("symptoms")
        .optional()
        .isArray().withMessage("Symptoms must be an array"),
    
    body("prescribedMedication")
        .optional()
        .trim(),
    
    body("visitDate")
        .optional()
        .isISO8601().withMessage("Invalid date format"),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// ============ AI PREDICTION VALIDATION ============

// AI prediction validation
exports.validatePrediction = [
    body("symptoms")
        .isArray().withMessage("Symptoms must be an array")
        .notEmpty().withMessage("At least one symptom is required"),
    
    body("province")
        .optional()
        .isIn(['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands'])
        .withMessage("Invalid province"),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// ============ PARAM VALIDATION ============

// MongoDB ID param validation
exports.validateMongoId = [
    param("id")
        .isMongoId().withMessage("Invalid ID format"),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

// Pagination validation
exports.validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: "Validation failed",
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        
        // Set defaults
        req.query.page = parseInt(req.query.page) || 1;
        req.query.limit = parseInt(req.query.limit) || 10;
        next();
    }
];