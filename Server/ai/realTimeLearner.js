// ai/realTimeLearner.js - Listens to database changes and emits alerts

const MedicalRecord = require("../models/MedicalRecord");
const ContinuousLearner = require("./continuousLearner");

class RealTimeLearner {
    constructor(io, alertEmitter) {
        this.ai = new ContinuousLearner();
        this.io = io;
        this.alertEmitter = alertEmitter;
        this.isListening = false;
        this.changeStream = null;
        this.lastAlertCheck = new Date();
    }

    // Initialize and start listening
    async start() {
        console.log("🎧 Real-time AI learner starting...");
        
        // Load existing records
        await this.loadHistoricalData();
        
        // Start listening to changes
        this.watchChanges();
        
        // Send initial status
        this.alertEmitter.sendSystemStatus({
            status: 'active',
            message: 'AI System Online',
            stats: this.ai.getStats()
        });
        
        return this.ai;
    }

    // Load all existing records for initial training
    async loadHistoricalData() {
        try {
            console.log("📚 Loading historical medical records...");
            
            const records = await MedicalRecord.find({})
                .populate('patientId')
                .sort({ visitDate: -1 });
            
            if (records.length > 0) {
                this.ai.processBatch(records);
                console.log(`✅ Loaded ${records.length} historical records`);
                
                // Send initial stats
                this.alertEmitter.sendAIUpdate(this.ai.getStats());
            } else {
                console.log("ℹ️ No historical records found");
            }
        } catch (error) {
            console.error("❌ Error loading historical data:", error);
        }
    }

    // Watch for new records in real-time
    watchChanges() {
        try {
            // Create change stream on MedicalRecord collection
            this.changeStream = MedicalRecord.watch([], { fullDocument: 'updateLookup' });
            
            this.changeStream.on('change', async (change) => {
                console.log("🔄 Database change detected:", change.operationType);
                
                if (change.operationType === 'insert') {
                    // New record added
                    const newRecord = await MedicalRecord.findById(change.documentKey._id)
                        .populate('patientId');
                    
                    if (newRecord) {
                        this.ai.processNewRecord(newRecord);
                        console.log(`✨ AI updated with new ${newRecord.disease} case`);
                        
                        // Send AI update to clients
                        this.alertEmitter.sendAIUpdate(this.ai.getStats());
                        
                        // Check for outbreaks after new data
                        this.checkForOutbreaks();
                        
                        // Emit to disease-specific room
                        this.io.to(`disease-${newRecord.disease}`).emit('new-case', {
                            disease: newRecord.disease,
                            province: newRecord.province,
                            timestamp: newRecord.visitDate
                        });
                    }
                }
                
                if (change.operationType === 'update') {
                    // Record updated
                    const updatedRecord = await MedicalRecord.findById(change.documentKey._id)
                        .populate('patientId');
                    
                    if (updatedRecord) {
                        console.log(`📝 Record updated: ${updatedRecord.disease}`);
                        // You could emit update events here
                    }
                }
            });
            
            this.changeStream.on('error', (error) => {
                console.error("❌ Change stream error:", error);
                this.alertEmitter.sendSystemStatus({
                    status: 'error',
                    message: error.message
                });
            });
            
            this.isListening = true;
            console.log("🎧 Real-time AI learner is now listening for changes");
            
        } catch (error) {
            console.error("❌ Error starting change stream:", error);
        }
    }

    // Check for outbreaks and send alerts
    checkForOutbreaks() {
        const now = new Date();
        
        // Only check every 5 minutes to avoid alert spam
        if (now - this.lastAlertCheck < 5 * 60 * 1000) {
            return;
        }
        
        this.lastAlertCheck = now;
        
        const alerts = this.ai.detectOutbreaks();
        
        alerts.forEach(alert => {
            // Check if this is a new outbreak (not already alerted)
            const activeAlerts = this.alertEmitter.getActiveAlerts();
            const existingAlert = activeAlerts.find(a => 
                a.province === alert.province && 
                a.disease === alert.disease
            );
            
            if (!existingAlert) {
                this.alertEmitter.sendOutbreakAlert(alert);
            }
        });
        
        // Check if any active alerts should be resolved
        const activeAlerts = this.alertEmitter.getActiveAlerts();
        activeAlerts.forEach(alert => {
            // If no new cases in the last 7 days, resolve alert
            const recentCases = this.ai.provinceStats.get(alert.province)?.diseases.get(alert.disease) || 0;
            if (recentCases === 0) {
                this.alertEmitter.resolveAlert(alert.province, alert.disease);
            }
        });
    }

    // Stop listening
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

    // Get AI instance
    getAI() {
        return this.ai;
    }
}

module.exports = RealTimeLearner;