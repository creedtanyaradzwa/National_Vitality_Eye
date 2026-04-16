// Server/scripts/createIndexes.js
// Run with: node scripts/createIndexes.js

const mongoose = require("mongoose");
require("dotenv").config();

async function createIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB\n");
        
        const db = mongoose.connection.db;
        
        console.log("🔧 Creating indexes for patients collection...");
        
        // Patients collection indexes
        await db.collection("patients").createIndex({ age: 1 });
        console.log("   ✅ age_1");
        
        await db.collection("patients").createIndex({ gender: 1 });
        console.log("   ✅ gender_1");
        
        await db.collection("patients").createIndex({ province: 1 });
        console.log("   ✅ province_1");
        
        await db.collection("patients").createIndex({ isActive: 1 });
        console.log("   ✅ isActive_1");
        
        await db.collection("patients").createIndex({ age: 1, gender: 1, province: 1 });
        console.log("   ✅ age_1_gender_1_province_1");
        
        console.log("\n🔧 Creating indexes for medicalrecords collection...");
        
        // Medical records indexes
        await db.collection("medicalrecords").createIndex({ patientId: 1 });
        console.log("   ✅ patientId_1");
        
        await db.collection("medicalrecords").createIndex({ patientId: 1, visitDate: -1 });
        console.log("   ✅ patientId_1_visitDate_-1");
        
        await db.collection("medicalrecords").createIndex({ disease: 1 });
        console.log("   ✅ disease_1");
        
        await db.collection("medicalrecords").createIndex({ visitDate: -1 });
        console.log("   ✅ visitDate_-1");
        
        await db.collection("medicalrecords").createIndex({ "vitalSigns.temperature": 1 });
        console.log("   ✅ vitalSigns.temperature_1");
        
        await db.collection("medicalrecords").createIndex({ "vitalSigns.heartRate": 1 });
        console.log("   ✅ vitalSigns.heartRate_1");
        
        await db.collection("medicalrecords").createIndex({ "vitalSigns.bloodPressure.systolic": 1 });
        console.log("   ✅ vitalSigns.bloodPressure.systolic_1");
        
        await db.collection("medicalrecords").createIndex({ patientId: 1, "vitalSigns.temperature": 1 });
        console.log("   ✅ patientId_1_vitalSigns.temperature_1");
        
        await db.collection("medicalrecords").createIndex({ patientId: 1, "vitalSigns.heartRate": 1 });
        console.log("   ✅ patientId_1_vitalSigns.heartRate_1");
        
        console.log("\n✅ All indexes created successfully!");
        
        // List all indexes for verification
        console.log("\n📋 PATIENTS INDEXES:");
        const patientIndexes = await db.collection("patients").indexes();
        patientIndexes.forEach(idx => {
            console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        
        console.log("\n📋 MEDICALRECORDS INDEXES:");
        const recordIndexes = await db.collection("medicalrecords").indexes();
        recordIndexes.forEach(idx => {
            console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        
        await mongoose.disconnect();
        console.log("\n✅ Done!");
        
    } catch (error) {
        console.error("❌ Error creating indexes:", error);
        process.exit(1);
    }
}

createIndexes();