// middleware/rbac.js

// Check if user has specific permission
exports.hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        
        // Define permissions for each role
        const rolePermissions = {
            admin: [
                "view:patients", "create:patients", "edit:patients", "delete:patients",
                "view:records", "view:analytics", "manage:users", "view:users"
            ],
            doctor: [
                "view:patients", "create:patients", "edit:patients",
                "view:records", "create:records", "edit:records",
                "view:analytics", "use:ai_predictor"
            ],
            nurse: [
                "view:patients", "create:patients",
                "view:records", "create:records",
                "view:analytics"
            ],
            data_entry: [
                "view:patients", "create:patients", "edit:patients",
                "view:records", "create:records"
            ],
            viewer: [
                "view:patients", "view:records", "view:analytics"
            ],
            patient: [
                "view:records", "view:patients"
            ],
            pending: []
        };
        
        const userPermissions = rolePermissions[req.user.role] || [];
        
        if (userPermissions.includes(permission)) {
            return next();
        }
        
        return res.status(403).json({ error: `Permission denied. Requires: ${permission}` });
    };
};

// Check if user has any of the specified roles
exports.hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        
        if (roles.includes(req.user.role)) {
            return next();
        }
        
        return res.status(403).json({ error: `Role required: ${roles.join(" or ")}` });
    };
};

// Check if user is approved
exports.isApproved = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    
    if (req.user.approvalStatus !== "approved") {
        return res.status(403).json({ error: `Account ${req.user.approvalStatus}. Please wait for admin approval.` });
    }
    
    if (!req.user.isActive) {
        return res.status(403).json({ error: "Account is deactivated. Contact admin." });
    }
    
    next();
};