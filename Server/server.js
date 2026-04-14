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
const { router: realTimeAIRoutes, setAIInstance } = require("./routes/realTimeAIRoutes");
const ContinuousLearner = require("./ai/continuousLearner");
const AlertEmitter = require("./ai/alertEmitter");
const MedicalRecord = require("./models/MedicalRecord");
const patientPortalRoutes = require("./routes/patientPortalRoutes");

// ... imports ...

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

global.io = io;

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ============ ROUTES ============
app.use("/api/auth", authRoutes);
app.use("/patients", patientRoutes);
app.use("/medical-records", medicalRoutes);
app.use("/ai", realTimeAIRoutes);
app.use("/api/patient", patientPortalRoutes);

// ============ PUBLIC ENDPOINTS ============
// Add this temporary test endpoint

app.get("/medical-records", async (req, res) => {
    try {
        const MedicalRecord = require("./models/MedicalRecord");
        const records = await MedicalRecord.find().limit(10);
        res.json(records);
    } catch (error) {
        res.json([]);
    }
});

app.get("/patients", async (req, res) => {
    try {
        const Patient = require("./models/Patient");
        const patients = await Patient.find().limit(10);
        res.json(patients);
    } catch (error) {
        res.json([]);
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
});

app.get("/", (req, res) => {
    res.json({ name: "Zimbabwe National Health System API", version: "3.0.0" });
});

// ============ AI INITIALIZATION ============
async function initializeAI() {
    try {
        console.log("\n🧠 Initializing Enhanced Clinical AI...");
        
        const records = await MedicalRecord.find({})
            .populate("patientId")
            .limit(5000);
        
        console.log(`📊 Found ${records.length} medical records`);
        
        const ai = new ContinuousLearner();
        const emitter = new AlertEmitter(io);
        
        if (records.length > 0) {
            ai.processBatch(records);
            console.log(`✅ AI trained with ${records.length} records`);
        }
        
        console.log(`📊 Tracking ${ai.diseasePatterns.size} diseases`);
        
        setAIInstance(ai, emitter);
        
        return ai;
    } catch (error) {
        console.error("❌ AI initialization error:", error.message);
        return null;
    }
}

// ============ DATABASE CONNECTION & SERVER START ============
mongoose.connect(process.env.MONGO_URI)
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
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (io) io.close();
    await mongoose.connection.close();
    process.exit(0);
});