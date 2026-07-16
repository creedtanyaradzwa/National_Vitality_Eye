import axios from 'axios';
import { saveOfflineOperation, isOnline, syncPendingOperations } from '../utils/offlineSync';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL ;

const API = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to every request
API.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only intercept NON-GET requests for offline saving
    if (!isOnline() && config.method.toLowerCase() !== 'get') {
        await saveOfflineOperation(config.url, config.method, config.data);
        toast.success('Saved locally! Data will sync when you are back online.');
        const error = new Error('OFFLINE_SAVED');
        error.offline = true;
        return Promise.reject(error);
    }
    
    return config;
});

// Add response interceptor to handle errors
API.interceptors.response.use(
    response => response,
    async error => {
        if (error.offline) {
            // Return a fake response that has offline flag for non-GET requests
            return Promise.resolve({ 
                data: { 
                    offline: true, 
                    message: 'Saved locally, will sync when online' 
                } 
            });
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

// ============ AUTH ============
export const login = (data) => API.post('/api/auth/login', data);
export const register = (data) => API.post('/api/auth/register', data);
export const registerUser = (formData) => API.post('/api/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const getProfile = () => API.get('/api/auth/profile');
export const updateProfile = (data) => API.patch('/api/auth/profile', data);
export const changePassword = (data) => API.post('/api/auth/change-password', data);
export const getStaffByHospital = (hospital) => API.get(`/api/auth/staff?hospital=${encodeURIComponent(hospital)}`);

// ============ ADMIN (AUTH-BASED) ============
export const getPendingUsers = () => API.get('/api/auth/admin/pending-users');
export const processApproval = (userId, data) => API.post(`/api/auth/admin/process-approval/${userId}`, data);
export const getAllUsers = () => API.get('/api/auth/admin/users');
export const toggleUserStatus = (userId) => API.patch(`/api/auth/admin/users/${userId}/toggle-status`);
export const changeUserRole = (userId, newRole) => API.patch(`/api/auth/admin/users/${userId}/change-role`, { newRole });
export const getUserDocuments = (userId) => API.get(`/api/auth/admin/users/${userId}/documents`);

// ============ PATIENTS ============
export const getPatients = (page = 1, limit = 10, search = "", sortBy = "", triage = "") => {
    let url = `/patients?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
    if (sortBy) url += `&sortBy=${sortBy}`;
    if (triage) url += `&triage=${triage}`;
    return API.get(url);
};
export const getPatient = (id) => API.get(`/patients/${id}`);
export const createPatient = (data) => API.post('/patients', data);
export const updatePatient = (id, data) => API.patch(`/patients/${id}`, data);
export const deletePatient = (id) => API.delete(`/patients/${id}`);
export const getPatientByNationalId = (id) => API.get(`/patients/id/${id}`);
export const getClinicalProfile = (id) => API.get(`/patients/${id}/clinical-profile`);
export const updateClinicalProfile = (id, data) => API.patch(`/patients/${id}/clinical-profile`, data);
export const addChronicCondition = (id, data) => API.post(`/patients/${id}/chronic-condition`, data);
export const addAllergy = (id, data) => API.post(`/patients/${id}/allergy`, data);
export const addMedication = (id, data) => API.post(`/patients/${id}/medication`, data);
export const updateVitalSigns = (id, data) => API.patch(`/patients/${id}/vital-signs`, data);
export const addRiskFactor = (id, data) => API.post(`/patients/${id}/risk-factor`, data);

// ============ MEDICAL RECORDS ============
export const getMedicalRecords = (page = 1, limit = 10, search = "") => 
    API.get(`/medical-records?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
export const getPatientRecords = (patientId) => API.get(`/medical-records/patient/${patientId}`);
export const getPatientVitalsHistory = (patientId) => API.get(`/medical-records/patient/${patientId}/vitals-history`);
export const createMedicalRecord = (data) => API.post('/medical-records', data);
export const updateMedicalRecord = (id, data) => API.patch(`/medical-records/${id}`, data);
export const addObservation = (id, data) => API.post(`/medical-records/${id}/observations`, data);
export const deleteMedicalRecord = (id) => API.delete(`/medical-records/${id}`);
export const getMedicalRecordById = (id) => API.get(`/medical-records/${id}`);
export const uploadRadiologyImages = (patientId, studyType, files) => {
    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('studyType', studyType || 'radiology');
    (files || []).forEach((file) => formData.append('images', file));
    return API.post('/medical-records/upload/radiology-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
// ============ ANALYTICS ============
export const getPatientCount = () => API.get('/medical-records/stats/patient-count');
export const getTopDiseases = () => API.get('/medical-records/stats/top-diseases');
export const getAllDiseases = () => API.get('/medical-records/stats/all-diseases');
export const getProvinceStats = (period = 'all', disease = '') => {
    let url = `/medical-records/stats/by-province?period=${period}`;
    if (disease) url += `&disease=${encodeURIComponent(disease)}`;
    return API.get(url);
};
export const getDiseaseInsights = (disease, period = 'all') => API.get(`/ai/disease-insights/${encodeURIComponent(disease)}?period=${period}`);
export const getDiseaseAnalytics = (disease, period = 'all') => API.get(`/medical-records/stats/disease-analytics/${encodeURIComponent(disease)}?period=${period}`);
export const getMonthlyTrends = (disease) => API.get(`/medical-records/stats/monthly-trends?disease=${encodeURIComponent(disease)}`);
export const getGlobalSummary = (hospital = "") => {

    let url = '/medical-records/stats/summary';
    if (hospital) url += `?hospital=${encodeURIComponent(hospital)}`;
    return API.get(url);
};
export const getSystemLoad = () => API.get('/medical-records/stats/system-load');
export const getAIStats = () => API.get('/ai/stats');
export const getDiseaseTrends = (disease) => API.get(`/medical-records/stats/disease-trends/${encodeURIComponent(disease)}`);
export const getPrevalence = () => API.get('/medical-records/stats/prevalence');
export const getGrowthRate = () => API.get('/medical-records/stats/growth-rate');

// ============ ALERTS ============
export const getAlerts = () => API.get('/ai/alerts');
export const refreshAI = () => API.post('/ai/refresh');

// ============ PATIENT PORTAL ============
export const getPatientPortalProfile = () => API.get('/api/patient-portal/profile');
export const getPatientPortalRecords = () => API.get('/api/patient-portal/records');
export const getPatientPortalVitals = () => API.get('/api/patient-portal/vitals');
export const getPatientPortalTrustedProviders = () => API.get('/api/patient-portal/trusted-providers');
export const addPatientPortalTrustedProvider = (providerId) => API.post('/api/patient-portal/trusted-providers', { providerId });
export const removePatientPortalTrustedProvider = (providerId) => API.delete(`/api/patient-portal/trusted-providers/${providerId}`);
export const getPatientPortalDashboard = () => API.get('/api/patient-portal/dashboard');
export const updatePatientPortalVitals = (vitals) => API.patch('/api/patient-portal/vitals', { vitals });

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
export const getHospitalHandovers = (hospitalName = "") => {
    let url = '/api/handovers/my-hospital';
    if (hospitalName) url += `?hospital=${encodeURIComponent(hospitalName)}`;
    return API.get(url);
};
export const getPatientHandovers = (patientId) => API.get(`/api/handovers/patient/${patientId}`);
export const createHandover = (data) => API.post('/api/handovers', data);
export const completeHandoverTask = (handoverId, taskId, status = 'Completed') => 
    API.patch(`/api/handovers/${handoverId}/task/${taskId}`, { status });
export const getPendingTaskCount = () => API.get('/api/handovers/pending-count');
export const getHospitalStaff = (hospitalName = "") => API.get(`/api/auth/staff${hospitalName ? `?hospital=${encodeURIComponent(hospitalName)}` : ''}`);
export const assignHandoverStaff = (handoverId, userIds) => API.patch(`/api/handovers/${handoverId}/assign`, { userIds });

// ============ AI FEATURES ============
export const getClinicalSnapshot = (patientId) => API.get(`/ai/clinical-snapshot/${patientId}`);
export const getRecordSnapshot = (recordId) => API.get(`/ai/record-snapshot/${recordId}`);
export const getPatientTriage = (patientId, data = null) => 
    data ? API.post('/api/ai/predict-triage', data) : API.get(`/api/ai/patient-triage/${patientId}`);
export const getPatientAnomalies = (patientId, currentVitals = null) => 
    API.post(`/api/ai/anomaly-detection/${patientId}`, { currentVitals });
export const getAnomalyDetection = getPatientAnomalies;
export const getPatientSimilarPatients = (patientId) => API.post(`/api/ai/similar-patients/${patientId}`);
export const getSimilarPatients = getPatientSimilarPatients;
export const getRecordProgress = (recordId) => API.get(`/api/ai/record-progress/${recordId}`);
export const getClinicalRisk = (patientId) => API.get(`/api/ai/clinical-risk/${patientId}`);
export const getAIStatus = () => API.get('/ai/status');
export const predictDisease = (data) => API.post('/ai/predict', data);
export const getPatientRisk = (patientId) => API.get(`/ai/risk/${patientId}`);
export const getAISymptoms = () => API.get('/ai/symptoms');

// ============ COMMUNITY SURVEILLANCE ============
export const getCommunityReports = (params = {}) => {
    let url = '/api/patient/surveillance/reports';
    const query = new URLSearchParams(params).toString();
    if (query) url += `?${query}`;
    return API.get(url);
};

export default API;