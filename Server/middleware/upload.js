// middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directories if they don't exist
const createUploadDirs = () => {
    const dirs = [
        "./uploads/documents/national-id",
        "./uploads/documents/employment-letters",
        "./uploads/documents/licenses",
        "./uploads/photos"
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created upload directory: ${dir}`);
        }
    });
};

// Run this when the file loads
createUploadDirs();

// Configure storage settings
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Route files to different folders based on field name
        if (file.fieldname === "nationalId") {
            cb(null, "./uploads/documents/national-id/");
        } else if (file.fieldname === "employmentLetter") {
            cb(null, "./uploads/documents/employment-letters/");
        } else if (file.fieldname === "practicingLicense") {
            cb(null, "./uploads/documents/licenses/");
        } else if (file.fieldname === "profilePhoto") {
            cb(null, "./uploads/photos/");
        } else {
            cb(null, "./uploads/documents/");
        }
    },
    filename: (req, file, cb) => {
        // Create unique filename: timestamp-fieldname-random.ext
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 10000);
        const fieldname = file.fieldname;
        const ext = path.extname(file.originalname);
        
        cb(null, `${timestamp}-${fieldname}-${random}${ext}`);
    }
});

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        nationalId: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        employmentLetter: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        practicingLicense: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        profilePhoto: ['image/jpeg', 'image/png', 'image/jpg']
    };
    
    const allowedForField = allowedTypes[file.fieldname] || ['application/pdf', 'image/jpeg', 'image/png'];
    
    if (allowedForField.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${allowedForField.join(', ')}`), false);
    }
};

// Create multer upload instance with limits
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 4 // Maximum 4 files per request
    },
    fileFilter: fileFilter
});

// Middleware for handling multiple document uploads
const uploadDocuments = upload.fields([
    { name: "nationalId", maxCount: 1 },
    { name: "employmentLetter", maxCount: 1 },
    { name: "practicingLicense", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 }
]);

// Error handler for multer errors
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large. Maximum size is 5MB'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files uploaded'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: `Unexpected field: ${err.field}. Allowed fields: nationalId, employmentLetter, practicingLicense, profilePhoto`
            });
        }
        return res.status(400).json({
            error: `Upload error: ${err.message}`
        });
    }
    
    if (err) {
        return res.status(400).json({
            error: err.message
        });
    }
    
    next();
};

module.exports = {
    uploadDocuments,
    handleUploadError
};