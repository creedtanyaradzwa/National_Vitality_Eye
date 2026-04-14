// ai/alertEmitter.js - Manages real-time WebSocket alerts

class AlertEmitter {
    constructor(io) {
        this.io = io;
        this.activeAlerts = new Map(); // Store active alerts to avoid duplicates
        this.alertHistory = [];
        this.subscribers = new Map(); // Track which clients want which alerts
    }

    // Send outbreak alert to all connected clients
    sendOutbreakAlert(alert) {
        const alertId = `${alert.province}-${alert.disease}-${Date.now()}`;
        
        const enrichedAlert = {
            id: alertId,
            ...alert,
            timestamp: new Date(),
            read: false,
            acknowledged: false
        };

        // Store in history (keep last 100)
        this.alertHistory.unshift(enrichedAlert);
        if (this.alertHistory.length > 100) this.alertHistory.pop();

        // Store active alert (if not already active)
        const key = `${alert.province}-${alert.disease}`;
        if (!this.activeAlerts.has(key)) {
            this.activeAlerts.set(key, enrichedAlert);
            
            // Emit to all connected clients
            this.io.emit('outbreak-alert', enrichedAlert);
            
            // Also emit to specific province rooms if needed
            this.io.to(`province-${alert.province}`).emit('province-alert', enrichedAlert);
            
            console.log(`📢 Alert sent: ${alert.message}`);
        }
    }

    // Send real-time AI update notification
    sendAIUpdate(stats) {
        this.io.emit('ai-update', {
            timestamp: new Date(),
            totalRecords: stats.totalRecords,
            diseasesTracked: stats.diseasesTracked,
            lastUpdated: stats.lastUpdated
        });
    }

    // Send risk assessment update for specific patient
    sendPatientRiskUpdate(patientId, riskData) {
        this.io.to(`patient-${patientId}`).emit('risk-update', {
            patientId,
            ...riskData,
            timestamp: new Date()
        });
    }

    // Send disease trend update
    sendDiseaseTrend(disease, trend) {
        this.io.to(`disease-${disease}`).emit('trend-update', {
            disease,
            ...trend,
            timestamp: new Date()
        });
    }

    // Send system status
    sendSystemStatus(status) {
        this.io.emit('system-status', {
            ...status,
            timestamp: new Date()
        });
    }

    // Client subscription management
    subscribe(clientId, topics) {
        if (!this.subscribers.has(clientId)) {
            this.subscribers.set(clientId, new Set());
        }
        
        const clientTopics = this.subscribers.get(clientId);
        topics.forEach(topic => clientTopics.add(topic));
        
        // Join Socket.io rooms based on topics
        const socket = this.io.sockets.sockets.get(clientId);
        if (socket) {
            topics.forEach(topic => {
                if (topic.startsWith('province-')) socket.join(topic);
                if (topic.startsWith('disease-')) socket.join(topic);
                if (topic === 'all-alerts') socket.join('alerts');
            });
        }
    }

    // Acknowledge alert
    acknowledgeAlert(alertId, userId) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
            
            this.io.emit('alert-acknowledged', {
                alertId,
                userId,
                timestamp: new Date()
            });
        }
    }

    // Clear resolved alert
    resolveAlert(province, disease) {
        const key = `${province}-${disease}`;
        if (this.activeAlerts.has(key)) {
            const alert = this.activeAlerts.get(key);
            alert.resolved = true;
            alert.resolvedAt = new Date();
            
            this.io.emit('alert-resolved', {
                province,
                disease,
                message: `✅ Alert resolved for ${disease} in ${province}`,
                timestamp: new Date()
            });
            
            this.activeAlerts.delete(key);
        }
    }

    // Get alert history for a client
    getAlertHistory(limit = 50) {
        return this.alertHistory.slice(0, limit);
    }

    // Get active alerts
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
}

module.exports = AlertEmitter;