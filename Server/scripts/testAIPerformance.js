// Server/scripts/testAIPerformance.js
// Run with: node scripts/testAIPerformance.js

const mongoose = require("mongoose");
require("dotenv").config();

// Import models FIRST
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const ContinuousLearner = require("../ai/continuousLearner");

async function testAIPerformance() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB\n");
        
        // Check if we have data
        const recordCount = await MedicalRecord.countDocuments();
        if (recordCount === 0) {
            console.log("⚠️ No medical records found in database. Please add some records first.");
            console.log("   Run the database reset script to add sample data:\n");
            console.log("   node scripts/resetDatabase.js\n");
            process.exit(0);
        }
        
        // Initialize AI
        const ai = new ContinuousLearner();
        
        // Load all records for training with patient data
        const allRecords = await MedicalRecord.find({})
            .populate("patientId")
            .limit(2000);
        
        console.log(`📊 Loaded ${allRecords.length} records\n`);
        
        // Filter records that have disease and symptoms
        const validRecords = allRecords.filter(r => r.disease && r.symptoms && r.symptoms.length > 0);
        
        if (validRecords.length < 10) {
            console.log("⚠️ Insufficient valid records for testing. Need at least 10 records with diseases and symptoms.");
            console.log(`   Found ${validRecords.length} valid records.\n`);
            process.exit(0);
        }
        
        // Split into training (80%) and test (20%)
        const splitPoint = Math.floor(validRecords.length * 0.8);
        const trainingRecords = validRecords.slice(0, splitPoint);
        const testRecords = validRecords.slice(splitPoint);
        
        console.log(`📚 Training on ${trainingRecords.length} records...`);
        ai.processBatch(trainingRecords);
        
        console.log(`\n🧪 Testing on ${testRecords.length} records...\n`);
        
        // Test predictions
        let correct = 0;
        let total = 0;
        let confidenceSum = 0;
        const resultsByDisease = new Map();
        
        for (const record of testRecords) {
            if (!record.disease || !record.symptoms || record.symptoms.length === 0) continue;
            
            const month = new Date(record.visitDate).getMonth();
            const patientAge = record.patientId?.age || null;
            const patientGender = record.patientId?.gender || null;
            
            const predictions = ai.predictDisease(
                record.symptoms,
                record.province || "Harare",
                month,
                patientAge,
                patientGender,
                [], // risk factors
                {}, // vitals
                [], // chronic conditions
                {}  // family history
            );
            
            const topPrediction = predictions.predictions[0];
            const wasCorrect = topPrediction?.disease === record.disease;
            
            if (wasCorrect) {
                correct++;
                confidenceSum += topPrediction.confidence;
            }
            total++;
            
            // Track per-disease accuracy
            if (!resultsByDisease.has(record.disease)) {
                resultsByDisease.set(record.disease, { correct: 0, total: 0, confidenceSum: 0 });
            }
            const stats = resultsByDisease.get(record.disease);
            if (wasCorrect) {
                stats.correct++;
                stats.confidenceSum += topPrediction.confidence;
            }
            stats.total++;
        }
        
        const overallAccuracy = total > 0 ? (correct / total) * 100 : 0;
        const avgConfidence = correct > 0 ? confidenceSum / correct : 0;
        
        console.log("=".repeat(60));
        console.log("📊 AI PERFORMANCE TEST RESULTS");
        console.log("=".repeat(60));
        console.log(`\n🎯 Overall Accuracy: ${overallAccuracy.toFixed(1)}% (${correct}/${total})`);
        console.log(`📈 Average Confidence (when correct): ${avgConfidence.toFixed(1)}%`);
        console.log(`🎲 Calibration Score: ${(avgConfidence - overallAccuracy).toFixed(1)}% (lower is better)\n`);
        
        if (resultsByDisease.size > 0) {
            console.log("📋 Per-Disease Accuracy:");
            console.log("-".repeat(55));
            
            const sortedResults = Array.from(resultsByDisease.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 10);
            
            for (const [disease, stats] of sortedResults) {
                const accuracy = (stats.correct / stats.total) * 100;
                const avgConf = stats.correct > 0 ? stats.confidenceSum / stats.correct : 0;
                const barLength = Math.round(accuracy / 2);
                const bar = "█".repeat(barLength) + "░".repeat(50 - barLength);
                console.log(`   ${disease.padEnd(25)}: ${accuracy.toFixed(1)}% ${bar} (${stats.correct}/${stats.total})`);
            }
        }
        
        // Provide recommendations based on accuracy
        console.log("\n" + "=".repeat(60));
        console.log("💡 RECOMMENDATIONS");
        console.log("=".repeat(60));
        
        if (overallAccuracy >= 85) {
            console.log("✅ AI performance is EXCELLENT! Ready for production deployment.");
        } else if (overallAccuracy >= 75) {
            console.log("👍 AI performance is GOOD. Consider adding more training data.");
        } else if (overallAccuracy >= 65) {
            console.log("⚠️ AI performance is FAIR. More training data and feature engineering recommended.");
        } else {
            console.log("🔴 AI performance needs improvement. Add more diverse training data.");
        }
        
        console.log(`\n📊 Training data size: ${trainingRecords.length} records`);
        console.log(`🧪 Test data size: ${testRecords.length} records`);
        console.log(`🦠 Diseases tracked: ${ai.diseasePatterns.size}`);
        
        console.log("\n✅ Test complete!");
        console.log("=".repeat(60));
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

testAIPerformance();