import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthProvider';
import AlertProvider from './context/AlertProvider';
import { DataRefreshProvider } from './context/DataRefreshProvider';
import { useAuth } from './context/useAuth';
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

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-secondary-900">
                {children}
            </div>
        </>
    );
};

// Patient Portal Protected Route
const PatientProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('patientToken');
    const [isAuthenticated, setIsAuthenticated] = React.useState(!!token);
    const [loading, setLoading] = React.useState(false);
    
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
    
    return <>{children}</>;
};

function AppRoutes() {
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
            {/* ADD THESE MISSING ROUTES */}
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
            
            {/* Admin/Doctor Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
            <Route path="/patients/:id" element={<ProtectedRoute><PatientDetailsPage /></ProtectedRoute>} />
            <Route path="/patients/:id/vitals-trend" element={<ProtectedRoute><VitalsTrendPage /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute><MedicalRecords /></ProtectedRoute>} />
            <Route path="/ai-predictor" element={<ProtectedRoute><AIPredictor /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
    );
}

function App() {
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
                                    background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
                                    color: '#fff',
                                    border: '1px solid rgba(79, 70, 229, 0.3)',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
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