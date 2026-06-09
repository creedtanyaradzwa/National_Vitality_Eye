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
const aiFeaturesRoutes = require("./routes/aiFeaturesRoutes");
const { router: realTimeAIRoutes, setAIInstance } = require("./routes/realTimeAIRoutes");
const ContinuousLearner = require("./ai/continuousLearner");
const AlertEmitter = require("./ai/alertEmitter");
const RealTimeLearner = require("./ai/realTimeLearner");
const OutbreakDetector = require("./ai/outbreakDetector");
const MedicalRecord = require("./models/MedicalRecord");
const Patient = require("./models/Patient");

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
app.use("/api/ai", aiFeaturesRoutes);
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
        const startTime = Date.now();
        
        const ai = new ContinuousLearner();
        const emitter = new AlertEmitter(io);

        // 1. Load all patients into a Map first. 
        // This is MUCH faster than using .populate() on 100k+ records.
        console.log("👥 Loading patient index...");
        const patients = await Patient.find({})
            .select('dateOfBirth gender clinicalProfile')
            .lean();
        
        const patientMap = new Map();
        patients.forEach(p => patientMap.set(p._id.toString(), p));
        console.log(`✅ Indexed ${patientMap.size} patients`);

        // 2. Stream medical records and use the patientMap for demographics
        console.log("📚 Training AI with medical records...");
        const cursor = MedicalRecord.find({})
            .select({
                disease: 1, symptoms: 1, province: 1, visitDate: 1,
                vitalSigns: 1, disposition: 1, patientId: 1
            })
            .lean()
            .cursor({ batchSize: 2000 });
        
        let count = 0;
        for await (const record of cursor) {
            if (record && record.disease) {
                const patient = record.patientId ? patientMap.get(record.patientId.toString()) : null;
                ai.processNewRecord(record, patient);
                
                count++;
                
                // Yield the event loop frequently to keep the process responsive
                if (count % 1000 === 0) {
                    await new Promise(resolve => setImmediate(resolve));
                }

                if (count % 10000 === 0) {
                    process.stdout.write(`⏳ Trained with ${count} records...\r`);
                }
            }
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ AI trained with ${count} records in ${duration}s`);
        console.log(`📊 Tracking ${ai.diseasePatterns.size} diseases`);
        
        // Store references
        realTimeAI = ai;
        alertEmitter = emitter;

        // Pass the already trained AI instance to RealTimeLearner
        const rtLearner = new RealTimeLearner(io, emitter, ai);
        rtLearner.start().catch(err =>
            console.error("❌ RealTimeLearner start error:", err.message)
        );

        // Set in the routes module
        setAIInstance(ai, emitter);
        
        // Initialize and start the persistent Outbreak Detector
        const outbreakDetector = new OutbreakDetector(io, emitter);
        outbreakDetector.start();
        
        // Make available to other routes via app.locals
        app.locals.aiInstance = ai;
        app.locals.alertEmitter = emitter;
        app.locals.outbreakDetector = outbreakDetector;
        
        return ai;
    } catch (error) {
        console.error("❌ AI initialization error:", error.message);
        // Ensure we at least have an empty AI if training fails
        realTimeAI = realTimeAI || new ContinuousLearner();
        alertEmitter = alertEmitter || new AlertEmitter(io);
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
    serverSelectionTimeoutMS: 30000, 
    connectTimeoutMS: 30000,
    socketTimeoutMS: 120000, // 2 minutes for initial load
})
    .then(async () => {
        console.log("📦 MongoDB Connected");
        
        // Initialize AI BEFORE starting the server to ensure readiness
        await initializeAI();

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`✅ System ready!\n`);
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
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (io) io.close();
    try {
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
    }
});