/**
 * socket.js — WebSocket event reference for National Vitality Eye
 *
 * The Socket.IO connection is managed by AlertProvider (context/AlertProvider.jsx).
 * Use the useAlerts() hook to access the socket state and helper functions.
 *
 * ── SERVER → CLIENT EVENTS ──────────────────────────────────────────────────
 *
 * 'welcome'            Sent on connect. Payload: { activeAlerts[], timestamp }
 * 'outbreak-alert'     New outbreak detected. Payload: { id, province, disease,
 *                        severity, message, recentCases, timestamp, ... }
 * 'alert-resolved'     Outbreak resolved. Payload: { province, disease, message, timestamp }
 * 'alert-acknowledged' Alert acknowledged by a user. Payload: { alertId, userId, timestamp }
 * 'ai-update'          AI stats refreshed. Payload: { totalRecords, diseasesTracked, lastUpdated }
 * 'system-status'      AI system status change. Payload: { status, message, timestamp }
 * 'new-case'           New case in a disease room. Payload: { disease, province, timestamp }
 *                      (requires subscribing to 'disease-{name}' room first)
 * 'province-alert'     Alert for a specific province room. Same payload as outbreak-alert.
 *                      (requires subscribing to 'province-{name}' room first)
 * 'risk-update'        Patient risk update. Payload: { patientId, ...riskData, timestamp }
 *                      (requires subscribing to 'patient-{id}' room first)
 * 'trend-update'       Disease trend update. Payload: { disease, ...trend, timestamp }
 *                      (requires subscribing to 'disease-{name}' room first)
 *
 * ── CLIENT → SERVER EVENTS ──────────────────────────────────────────────────
 *
 * 'subscribe'          Join rooms for targeted events.
 *                      Payload: string[] — e.g. ['province-Harare', 'disease-Malaria']
 *                      Valid prefixes: 'province-', 'disease-', 'patient-', 'all-alerts'
 *
 * 'unsubscribe'        Leave rooms.
 *                      Payload: string[] — same format as subscribe
 *
 * 'acknowledge-alert'  Mark an alert as acknowledged.
 *                      Payload: { alertId: string }
 *
 * ── USAGE EXAMPLE ───────────────────────────────────────────────────────────
 *
 * import { useAlerts } from '../context/AlertProvider';
 *
 * const { activeAlerts, connected, acknowledgeAlert, subscribeToRooms } = useAlerts();
 *
 * // Subscribe to a province room for targeted alerts
 * useEffect(() => {
 *   subscribeToRooms(['province-Harare', 'disease-Malaria']);
 * }, []);
 *
 * // Listen for new-case events via custom DOM event
 * useEffect(() => {
 *   const handler = (e) => console.log('New case:', e.detail);
 *   window.addEventListener('new-disease-case', handler);
 *   return () => window.removeEventListener('new-disease-case', handler);
 * }, []);
 *
 * // Listen for AI stats updates
 * useEffect(() => {
 *   const handler = (e) => console.log('AI update:', e.detail);
 *   window.addEventListener('ai-stats-update', handler);
 *   return () => window.removeEventListener('ai-stats-update', handler);
 * }, []);
 */

export const SOCKET_EVENTS = {
    // Server → Client
    WELCOME:              'welcome',
    OUTBREAK_ALERT:       'outbreak-alert',
    ALERT_RESOLVED:       'alert-resolved',
    ALERT_ACKNOWLEDGED:   'alert-acknowledged',
    AI_UPDATE:            'ai-update',
    SYSTEM_STATUS:        'system-status',
    NEW_CASE:             'new-case',
    PROVINCE_ALERT:       'province-alert',
    RISK_UPDATE:          'risk-update',
    TREND_UPDATE:         'trend-update',

    // Client → Server
    SUBSCRIBE:            'subscribe',
    UNSUBSCRIBE:          'unsubscribe',
    ACKNOWLEDGE_ALERT:    'acknowledge-alert',
};

export const ROOM_PREFIX = {
    PROVINCE: 'province-',
    DISEASE:  'disease-',
    PATIENT:  'patient-',
    ALL:      'all-alerts',
};

/**
 * Build a province room name
 * @param {string} province
 * @returns {string}
 */
export const provinceRoom = (province) => `${ROOM_PREFIX.PROVINCE}${province}`;

/**
 * Build a disease room name
 * @param {string} disease
 * @returns {string}
 */
export const diseaseRoom = (disease) => `${ROOM_PREFIX.DISEASE}${disease}`;

/**
 * Build a patient room name
 * @param {string} patientId
 * @returns {string}
 */
export const patientRoom = (patientId) => `${ROOM_PREFIX.PATIENT}${patientId}`;
