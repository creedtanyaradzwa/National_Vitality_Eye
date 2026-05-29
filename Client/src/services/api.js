import axios from 'axios';
import { saveOfflineOperation, isOnline, syncPendingOperations } from '../utils/offlineSync';


const API = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add token to requests
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ============ AUTH ============
export const login = (data) => API.post('/api/auth/login', data);
export const getProfile = () => API.get('/api/auth/profile');
export const changePassword = (data) => API.post('/api/auth/change-password', data);

// ============ ADMIN ============
export const getPendingUsers = () => API.get('/api/auth/admin/pending-users');
export const processApproval = (userId, data) => API.post(`/api/auth/admin/process-approval/${userId}`, data);
export const getAllUsers = () => API.get('/api/auth/admin/users');
export const toggleUserStatus = (userId) => API.patch(`/api/auth/admin/users/${userId}/toggle-status`);
export const changeUserRole = (userId, newRole) => API.patch(`/api/auth/admin/users/${userId}/change-role`, { newRole });
export const getUserDocuments = (userId) => API.get(`/api/auth/admin/users/${userId}/documents`);

// ============ PATIENTS ============
export const getPatients = (page = 1, limit = 10) => API.get(`/patients?page=${page}&limit=${limit}`);
export const getPatient = (id) => API.get(`/patients/${id}`);
export const getPatientByNationalId = (nationalId) => API.get(`/patients/national/${nationalId}`);
export const createPatient = (data) => API.post('/patients', data);
export const updatePatient = (id, data) => API.patch(`/patients/${id}`, data);
export const deletePatient = (id) => API.delete(`/patients/${id}`);

// ============ CLINICAL PROFILE ============
export const getClinicalProfile = (id) => API.get(`/patients/${id}/clinical-profile`);
export const updateClinicalProfile = (id, data) => API.patch(`/patients/${id}/clinical-profile`, data);
export const addChronicCondition = (id, data) => API.post(`/patients/${id}/chronic-condition`, data);
export const addAllergy = (id, data) => API.post(`/patients/${id}/allergy`, data);
export const addMedication = (id, data) => API.post(`/patients/${id}/medication`, data);
export const updateVitalSigns = (id, data) => API.patch(`/patients/${id}/vital-signs`, data);
export const addRiskFactor = (id, data) => API.post(`/patients/${id}/risk-factor`, data);

// ============ MEDICAL RECORDS ============
export const getMedicalRecords = (page = 1, limit = 10) => API.get(`/medical-records?page=${page}&limit=${limit}`);
export const getPatientRecords = (patientId) => API.get(`/medical-records/patient/${patientId}`);
export const createMedicalRecord = (data) => API.post('/medical-records', data);
export const updateMedicalRecord = (id, data) => API.patch(`/medical-records/${id}`, data);
export const deleteMedicalRecord = (id) => API.delete(`/medical-records/${id}`);
export const getHospitalStaff = () => API.get('/medical-records/staff');
export const uploadRadiologyImages = (patientId, studyType, files) => {
    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('studyType', studyType || 'radiology');
    (files || []).forEach((file) => formData.append('images', file));
    return API.post('/medical-records/upload/radiology-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// ============ STATISTICS ============
export const getGlobalSummary = () => API.get('/medical-records/stats/summary');
export const getTopDiseases = () => API.get('/medical-records/stats/top-diseases');
export const getAllDiseases = () => API.get('/medical-records/stats/all-diseases');
export const getSystemLoad = () => {
    const url = `/medical-records/stats/system-load`;
    return API.get(url);
};
// GET province statistics with optional period and disease filter
export const getProvinceStats = (period = 'all', disease = '') => {
    const params = new URLSearchParams({ period });
    if (disease && disease !== 'All Diseases') params.append('disease', disease);
    return API.get(`/medical-records/stats/by-province?${params.toString()}`).then((res) => {
        const payload = res.data;
        if (Array.isArray(payload)) {
            return {
                ...res,
                data: {
                    provinces: payload.map((p) => ({
                        ...p,
                        total: p.total ?? p.count ?? 0
                    })),
                    summary: null
                }
            };
        }
        const provinces = (payload?.provinces || []).map((p) => ({
            ...p,
            total: p.total ?? p.count ?? 0
        }));
        return { ...res, data: { provinces, summary: payload?.summary ?? null } };
    });
};
// GET deep analytics for a specific disease
export const getDiseaseAnalytics = (disease, period = 'all') => {
    const params = new URLSearchParams({ period });
    return API.get(`/medical-records/stats/disease-analytics/${encodeURIComponent(disease)}?${params}`);
};
export const getMonthlyTrends = () => API.get('/medical-records/stats/monthly-trends');
export const getGrowthRate    = () => API.get('/medical-records/stats/growth-rate');
export const getPrevalence    = () => API.get('/medical-records/stats/prevalence');

// ============ AI ============
export const getAIStatus = () => API.get('/ai/status');
export const predictDisease = (data) => API.post('/ai/predict', data);
export const getAlerts = () => API.get('/ai/alerts');
export const getPatientRisk = (patientId) => API.get(`/ai/risk/${patientId}`);
export const getDiseaseTrends = (disease) => API.get(`/medical-records/stats/disease-trends/${encodeURIComponent(disease)}`);
export const getDiseaseInsights = (disease, period = 'all') => {
    const params = new URLSearchParams({ period });
    return API.get(`/ai/disease-insights/${encodeURIComponent(disease)}?${params}`);
};
export const getAIStats = () => API.get('/ai/stats');
export const getClinicalSnapshot = (patientId) => API.get(`/ai/clinical-snapshot/${patientId}`);
export const getAnomalyDetection = (patientId, currentVitals = {}) => API.post(`/ai/anomaly-detection/${patientId}`, { currentVitals });
export const getSimilarPatients = (patientId, limit = 10) => API.post(`/ai/similar-patients/${patientId}`, { limit });
export const getPatientTriage = (patientId) => API.get(`/ai/patient-triage/${patientId}`);
export const predictTriage = (data) => API.post('/ai/predict-triage', data);
export const refreshAI = () => API.post('/ai/refresh');
export const getPatientCount = () => API.get('/patients/stats/count');
// Register new user with documents
export const registerUser = (formData) => {
    return API.post('/api/auth/register', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
// Get vitals history for a patient
export const getPatientVitalsHistory = (patientId) => API.get(`/medical-records/patient/${patientId}/vitals-history`);
// Get latest vital signs for a patient
export const getLatestVitals = (patientId) => API.get(`/medical-records/patient/${patientId}/latest-vitals`);

// Add to your existing api.js file


// Add request interceptor for offline handling
API.interceptors.request.use(async (config) => {
    // Skip offline handling for GET requests (they use cache)
    if (config.method === 'get') return config;
    
    // If offline, save to IndexedDB for later sync
    if (!isOnline()) {
        console.log('Offline: Saving operation for later sync', config);
        
        await saveOfflineOperation({
            url: config.url,
            method: config.method,
            body: config.data
        });
        
        // Return a custom response indicating offline save
        return Promise.reject({
            response: {
                data: { 
                    offline: true, 
                    message: 'Saved offline. Will sync when online.' 
                },
                status: 202
            }
        });
    }
    
    return config;
});

// Add response interceptor to handle offline saves
API.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.data?.offline === true) {
            // This is our offline save response
            return Promise.resolve(error.response);
        }
        return Promise.reject(error);
    }
);

// Add sync function to API
export const syncOfflineData = async () => {
    await syncPendingOperations();
};

// Add function to check offline status
export const getOnlineStatus = () => isOnline();
// ============ PATIENT MANAGEMENT (ADMIN) ============
export const getAllPatientsWithPortal = () => API.get('/patients/admin/all');
export const getPatientWithPortalDetails = (id) => API.get(`/patients/admin/${id}`);
export const suspendPatientPortal = (id, reason, duration = null) => 
    API.patch(`/patients/admin/${id}/suspend-portal`, { reason, duration });
export const reactivatePatientPortal = (id) => 
    API.patch(`/patients/admin/${id}/reactivate-portal`);
export const deactivatePatient = (id, reason) => 
    API.patch(`/patients/admin/${id}/deactivate`, { reason });
export const reactivatePatient = (id) => 
    API.patch(`/patients/admin/${id}/reactivate`);
export const getPatientAuditLog = (id) => 
    API.get(`/patients/admin/${id}/audit`);

// ============ HANDOVERS & CARE HUB ============
export const getHospitalHandovers = () => API.get('/api/handovers/my-hospital');
export const getPatientHandovers = (patientId) => API.get(`/api/handovers/patient/${patientId}`);
export const createHandover = (data) => API.post('/api/handovers', data);
export const completeHandoverTask = (handoverId, taskId, status = 'Completed') => 
    API.patch(`/api/handovers/${handoverId}/task/${taskId}`, { status });
export const getPendingTaskCount = () => API.get('/api/handovers/pending-count');

export default API;