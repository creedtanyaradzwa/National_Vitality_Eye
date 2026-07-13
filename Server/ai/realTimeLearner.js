// ai/realTimeLearner.js - Listens to database changes and emits alerts

const MedicalRecord = require("../models/MedicalRecord");
const ContinuousLearner = require("./continuousLearner");

class RealTimeLearner {
    constructor(io, alertEmitter, existingAI = null, outbreakDetector = null) {
        this.ai = existingAI || new ContinuousLearner();
        this.io = io;
        this.alertEmitter = alertEmitter;
        this.outbreakDetector = outbreakDetector; // persistent engine
        this.isListening = false;
        this.changeStream = null;
        this.lastAlertCheck = new Date();
    }

    // Initialize and start listening
    async start() {
        console.log("🎧 Real-time AI learner starting...");
        
        this.watchChanges();
        
        this.alertEmitter.sendSystemStatus({
            status: 'active',
            message: 'AI System Online',
            stats: this.ai.getStats()
        });
        
        return this.ai;
    }

    // Deprecated: handled by server.js
    async loadHistoricalData() {
        console.log("ℹ️ Skipping loadHistoricalData in RealTimeLearner (handled by server.js)");
    }

    // Watch for new records in real-time
    watchChanges() {
        try {
            this.changeStream = MedicalRecord.watch([], { fullDocument: 'updateLookup' });
            
            this.changeStream.on('change', async (change) => {
                if (change.operationType === 'insert') {
                    const newRecord = await MedicalRecord.findById(change.documentKey._id)
                        .populate('patientId');
                    
                    if (newRecord) {
                        // 1. Update the in-memory AI learning engine
                        this.ai.processNewRecord(newRecord);
                        console.log(`✨ AI updated with new ${newRecord.disease} case`);
                        
                        // 2. Broadcast AI stats update to all clients
                        this.alertEmitter.sendAIUpdate(this.ai.getStats());
                        
                        // 3. Route to the PERSISTENT OutbreakDetector for zero-tolerance
                        //    pathogens (e.g. Cholera, TB, Ebola) — immediate alert, no delay.
                        //    Statistical pathogens are handled by the hourly runFullCheck cycle.
                        if (this.outbreakDetector) {
                            this.outbreakDetector.checkNewRecord(newRecord).catch(err =>
                                console.error("❌ Real-time outbreak check error:", err.message)
                            );
                        } else {
                            // Fallback: use the lightweight in-memory check if detector not wired
                            this.checkForOutbreaks();
                        }
                        
                        // 4. Notify disease-specific room subscribers
                        this.io.to(`disease-${newRecord.disease}`).emit('new-case', {
                            disease: newRecord.disease,
                            province: newRecord.province,
                            timestamp: newRecord.visitDate
                        });
                    }
                }
                
                if (change.operationType === 'update') {
                    const updatedRecord = await MedicalRecord.findById(change.documentKey._id)
                        .populate('patientId');
                    
                    if (updatedRecord) {
                        console.log(`📝 Record updated: ${updatedRecord.disease}`);
                    }
                }
            });
            
            this.changeStream.on('error', (error) => {
                console.error("❌ Change stream error:", error);
                this.alertEmitter.sendSystemStatus({
                    status: 'error',
                    message: error.message
                });
                // Attempt reconnect after 10 seconds
                setTimeout(() => {
                    if (this.isListening) {
                        console.log("🔄 Attempting change stream reconnect...");
                        this.watchChanges();
                    }
                }, 10000);
            });
            
            this.isListening = true;
            console.log("🎧 Real-time AI learner is now listening for changes");
            
        } catch (error) {
            console.error("❌ Error starting change stream:", error);
        }
    }

    // Lightweight fallback outbreak check (used when outbreakDetector is not wired)
    checkForOutbreaks() {
        const now = new Date();
        if (now - this.lastAlertCheck < 5 * 60 * 1000) return;
        this.lastAlertCheck = now;
        
        const alerts = this.ai.detectOutbreaks();
        alerts.forEach(alert => {
            const activeAlerts = this.alertEmitter.getActiveAlerts();
            const existing = activeAlerts.find(a =>
                a.province === alert.province && a.disease === alert.disease
            );
            if (!existing) this.alertEmitter.sendOutbreakAlert(alert);
        });
        
        // Resolve alerts for diseases with no recent cases
        const activeAlerts = this.alertEmitter.getActiveAlerts();
        activeAlerts.forEach(alert => {
            const recentCases = this.ai.provinceStats
                .get(alert.province)?.diseases.get(alert.disease) || 0;
            if (recentCases === 0) {
                this.alertEmitter.resolveAlert(alert.province, alert.disease);
            }
        });
    }

    stop() {
        if (this.changeStream) {
            this.changeStream.close();
            this.isListening = false;
            console.log("🛑 Real-time AI learner stopped");
            this.alertEmitter.sendSystemStatus({
                status: 'stopped',
                message: 'AI System Stopped'
            });
        }
    }

    getAI() {
        return this.ai;
    }
}

module.exports = RealTimeLearner;