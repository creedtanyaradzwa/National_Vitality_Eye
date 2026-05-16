const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Patient = require("../models/Patient");

exports.protect = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        
        if (!token) {
            return res.status(401).json({
                error: "Not authorized to access this route. Please log in."
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        let user;
        if (decoded.type === "patient") {
            user = await Patient.findById(decoded.id);
            if (user) {
                // Adapt patient object to look like a user for RBAC
                user = user.toObject();
                user.role = "patient";
                user.approvalStatus = "approved"; // Patients are auto-approved for their own portal
                user.isActive = user.portalAccount?.isActive ?? true;
            }
        } else {
            user = await User.findById(decoded.id).select("-password");
        }
        
        if (!user) {
            return res.status(401).json({
                error: "User no longer exists"
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
};