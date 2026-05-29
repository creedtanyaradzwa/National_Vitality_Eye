import React from 'react';
import PatientNavbar from './PatientNavbar';

/**
 * PatientLayout — wraps every patient portal page with the shared navbar.
 * Matches the same structure as the staff ProtectedRoute wrapper.
 */
const PatientLayout = ({ children }) => (
    <div className="bg-brand-dark-950 min-h-screen">
        <PatientNavbar />
        <div className="pt-0">
            {children}
        </div>
    </div>
);

export default PatientLayout;
