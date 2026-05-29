const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const path = require("path");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const medicalRoutes = require("./routes/medicalRoutes");
const patientPortalRoutes = require("./routes/patientPortalRoutes");
const handoverRoutes = require("./routes/handoverRoutes");
const citizenReportRoutes = require("./routes/citizenReportRoutes");
const { router: realTimeAIRoutes, setAIInstance } = require("./routes/realTimeAIRoutes");
const ContinuousLearner = require("./ai/continuousLearner");
const AlertEmitter = require("./ai/alertEmitter");
const RealTimeLearner = require("./ai/realTimeLearner");
const MedicalRecord = require("./models/MedicalRecord");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const jwt = require("jsonwebtoken");
const User = require("./models/User");

io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (!token) {
        console.log("WebSocket connection rejected: No token provided");
        return next(new Error("Authentication error"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        User.findById(decoded.id).select("-password").then(user => {
            if (!user) {
                console.log("WebSocket connection rejected: User not found");
                return next(new Error("Authentication error"));
            }
            socket.user = user;
            next();
        }).catch(err => {
            console.log("WebSocket connection error:", err.message);
            next(new Error("Authentication error"));
        });
    } catch (err) {
        console.log("WebSocket connection rejected:", err.message);
        next(new Error("Authentication error"));
    }
});

global.io = io;

// ============ SOCKET.IO CONNECTION HANDLER ============
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.user?.firstName} ${socket.user?.lastName} (${socket.user?.role})`);

    // Send welcome event with current active alerts so the client
    // can populate its state immediately without an HTTP round-trip
    const currentAlerts = alertEmitter ? alertEmitter.getActiveAlerts() : [];
    socket.emit('welcome', {
        message: 'Connected to National Vitality Eye',
        activeAlerts: currentAlerts,
        timestamp: new Date()
    });

    // ── Room subscriptions ──────────────────────────────────────────
    // Allow clients to subscribe to province-specific or disease-specific rooms
    socket.on('subscribe', (topics) => {
        if (!Array.isArray(topics)) return;
        topics.forEach(topic => {
            if (
                topic.startsWith('province-') ||
                topic.startsWith('disease-') ||
                topic.startsWith('patient-') ||
                topic === 'all-alerts'
            ) {
                socket.join(topic);
                console.log(`📡 ${socket.user?.firstName} joined room: ${topic}`);
            }
        });
    });

    socket.on('unsubscribe', (topics) => {
        if (!Array.isArray(topics)) return;
        topics.forEach(topic => socket.leave(topic));
    });

    // ── Alert acknowledgement ───────────────────────────────────────
    socket.on('acknowledge-alert', ({ alertId }) => {
        if (!alertId) return;
        if (alertEmitter) {
            alertEmitter.acknowledgeAlert(alertId, socket.user?._id);
            console.log(`✅ Alert ${alertId} acknowledged by ${socket.user?.firstName}`);
        }
    });

    // ── Disconnect ──────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.user?.firstName} — ${reason}`);
    });
});

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ============ ROUTES ============
app.use("/api/handovers", handoverRoutes);
app.use("/api/auth", authRoutes);
app.use("/patients", patientRoutes);
app.use("/medical-records", medicalRoutes);
app.use("/api/patient/surveillance", citizenReportRoutes);
app.use("/ai", realTimeAIRoutes);
app.use("/api/patient", patientPortalRoutes);

// ============ PUBLIC ENDPOINTS ============
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
});

app.get("/", (req, res) => {
    res.json({ name: "Zimbabwe National Health System API", version: "3.0.0" });
});

// ============ AI INITIALIZATION ============
let realTimeAI = null;
let alertEmitter = null;

async function initializeAI() {
    try {
        console.log("\n🧠 Initializing Enhanced Clinical AI...");
        
        // Load ALL records with patient data — confidentiality only controls patient portal visibility,
        // not what feeds the AI. The AI never receives patient names or identifiers;
        // it only reads clinical fields (disease, symptoms, vitals, province, disposition, age, gender).
        const records = await MedicalRecord.find({})
            .populate('patientId', 'dateOfBirth gender clinicalProfile')
            .select({
                disease: 1, symptoms: 1, province: 1, visitDate: 1,
                vitalSigns: 1, disposition: 1, patientId: 1
            });
        
        console.log(`📊 Found ${records.length} medical records`);
        
        const ai = new ContinuousLearner();
        const emitter = new AlertEmitter(io);
        
        if (records.length > 0) {
            // Process batch with patient profiles
            records.forEach(record => {
                if (record && record.disease) {
                    ai.processNewRecord(record, record.patientId);
                }
            });
            console.log(`✅ AI trained with ${records.length} records`);
        }
        
        console.log(`📊 Tracking ${ai.diseasePatterns.size} diseases`);
        
        // Store references
        realTimeAI = ai;
        alertEmitter = emitter;

        // ── Start RealTimeLearner so MongoDB change stream watches for new records ──
        // This is what makes the AI update in real time as new records are saved,
        // and what triggers outbreak detection and 'new-case' WebSocket events.
        const rtLearner = new RealTimeLearner(io, emitter);
        rtLearner.start().catch(err =>
            console.error("❌ RealTimeLearner start error:", err.message)
        );

        // Set in the routes module
        setAIInstance(ai, emitter);
        
        // Make available to other routes via app.locals
        app.locals.aiInstance = ai;
        app.locals.alertEmitter = emitter;
        
        return ai;
    } catch (error) {
        console.error("❌ AI initialization error:", error.message);
        return null;
    }
}

// ============ DATABASE CONNECTION & SERVER START ============
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error("❌ Missing MONGO_URI. Create `Server/.env` (see `Server/.env.example`).");
    process.exit(1);
}

const maskedMongoUri = mongoUri
    .replace(/\/\/([^:]+):([^@]+)@/i, (m, user) => `//${user}:***@`);

mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
})
    .then(() => {
        console.log("📦 MongoDB Connected");
        
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, async () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            await initializeAI();
            console.log(`\n✅ System ready!\n`);
        });
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err?.message || err);
        console.error(`   MONGO_URI: ${maskedMongoUri}`);
        if (String(err?.message || "").toLowerCase().includes("authentication failed")) {
            console.error("   Hint: verify Atlas DB user/password, URL-encode special characters, and ensure authSource/db name are correct.");
        }
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (io) io.close();
    mongoose.connection.close(() => process.exit(0));
});