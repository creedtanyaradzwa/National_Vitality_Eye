import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthProvider.jsx';
import AlertProvider from './context/AlertProvider.jsx';
import DataRefreshProvider from './context/DataRefreshProvider.jsx';
import Navbar from './components/layout/Navbar';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetailsPage from './pages/PatientDetailsPage';
import MedicalRecords from './pages/MedicalRecords';
import AIPredictor from './pages/AIPredictor';
import Analytics from './pages/Analytics';
import MapView from './pages/MapView';
import CareHub from './pages/CareHub';
import Admin from './pages/Admin';
import Alerts from './pages/Alerts';
import Register from './pages/Register';
import Profile from './pages/Profile';
import VitalsTrendPage from './pages/VitalsTrendPage';
import OfflineStatus from './components/ui/OfflineStatus';

// Patient Portal Components
import PatientLogin from './pages/PatientPortal/Login';
import PatientDashboard from './pages/PatientPortal/Dashboard';
import PatientMedicalRecords from './pages/PatientPortal/MedicalRecords';
import PatientVitals from './pages/PatientPortal/Vitals';
import PatientForgotPassword from './pages/PatientPortal/ForgotPassword';
import PatientResetPassword from './pages/PatientPortal/ResetPassword';
import PatientVerify from './pages/PatientPortal/Verify';
// Patient Portal — AI Features
import AIHealthSummary from './pages/PatientPortal/AIHealthSummary';
import AIVitalsInsights from './pages/PatientPortal/AIVitalsInsights';
import AIReminders from './pages/PatientPortal/AIReminders';
import AISymptomChecker from './pages/PatientPortal/AISymptomChecker';
import TrustedProviders from './pages/PatientPortal/TrustedProviders';
import CitizenSurveillance from './pages/PatientPortal/CitizenSurveillance';
import PatientLayout from './components/layout/PatientLayout';

export function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-brand-dark-950">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyber-blue/20 rounded-full animate-spin border-t-cyber-blue"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    return (
        <div className="bg-brand-dark-950 min-h-screen">
            <Navbar />
            <div className="pt-16">
                {children}
            </div>
        </div>
    );
}

// Patient Portal Protected Route
export function PatientProtectedRoute({ children }) {
    const token = localStorage.getItem('patientToken');
    
    if (!token) {
        return <Navigate to="/patient/login" />;
    }
    
    return <React.Fragment>{children}</React.Fragment>;
}

export function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Patient Portal Routes */}
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/forgot-password" element={<PatientForgotPassword />} />
            <Route path="/patient/reset-password" element={<PatientResetPassword />} />
            <Route path="/patient/verify" element={<PatientVerify />} />
            
            <Route path="/patient" element={
                <PatientProtectedRoute>
                    <PatientLayout />
                </PatientProtectedRoute>
            }>
                <Route path="dashboard" element={<PatientDashboard />} />
                <Route path="records" element={<PatientMedicalRecords />} />
                <Route path="vitals" element={<PatientVitals />} />
                <Route path="ai/health-summary" element={<AIHealthSummary />} />
                <Route path="ai/vitals-insights" element={<AIVitalsInsights />} />
                <Route path="ai/reminders" element={<AIReminders />} />
                <Route path="ai/symptom-checker" element={<AISymptomChecker />} />
                <Route path="trusted-providers" element={<TrustedProviders />} />
                <Route path="surveillance" element={<CitizenSurveillance />} />
                <Route path="profile-details" element={<PatientDetailsPage />} />
            </Route>
            
            {/* Admin/Doctor Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/care-hub" element={<ProtectedRoute><CareHub /></ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
            <Route path="/patients/:id" element={<ProtectedRoute><PatientDetailsPage /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute><MedicalRecords /></ProtectedRoute>} />
            <Route path="/ai-predictor" element={<ProtectedRoute><AIPredictor /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AlertProvider>
                    <DataRefreshProvider>
                        <Toaster 
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: '#0a0a0b',
                                    color: '#fff',
                                    border: '1px solid rgba(0, 242, 255, 0.2)',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 40px -5px rgba(0, 0, 0, 0.5)',
                                    backdropFilter: 'blur(20px)',
                                },
                            }}
                        />
                        <OfflineStatus />
                        <AppRoutes />
                    </DataRefreshProvider>
                </AlertProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;