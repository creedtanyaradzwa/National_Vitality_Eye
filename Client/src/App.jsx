import React, { useState } from 'react';
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
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);
    const [loading, setLoading] = useState(false);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
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
            <Route path="/patient/dashboard" element={
                <PatientProtectedRoute>
                    <PatientDashboard />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/records" element={
                <PatientProtectedRoute>
                    <PatientMedicalRecords />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/vitals" element={
                <PatientProtectedRoute>
                    <PatientVitals />
                </PatientProtectedRoute>
            } />
            {/* AI Feature Routes */}
            <Route path="/patient/ai/health-summary" element={
                <PatientProtectedRoute>
                    <AIHealthSummary />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/ai/vitals-insights" element={
                <PatientProtectedRoute>
                    <AIVitalsInsights />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/ai/reminders" element={
                <PatientProtectedRoute>
                    <AIReminders />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/ai/symptom-checker" element={
                <PatientProtectedRoute>
                    <AISymptomChecker />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/trusted-providers" element={
                <PatientProtectedRoute>
                    <TrustedProviders />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/surveillance" element={
                <PatientProtectedRoute>
                    <CitizenSurveillance />
                </PatientProtectedRoute>
            } />
            <Route path="/patient/profile-details" element={
                <PatientProtectedRoute>
                    <PatientDetailsPage />
                </PatientProtectedRoute>
            } />
            
            {/* Admin/Doctor Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/care-hub" element={<ProtectedRoute><CareHub /></ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
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
                        <AppRoutes />
                    </DataRefreshProvider>
                </AlertProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;