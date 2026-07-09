import React from 'react';
import { Outlet } from 'react-router-dom';
import PatientNavbar from './PatientNavbar';

/**
 * PatientLayout — wraps every patient portal page with the shared navbar.
 * Uses the same dark cyber theme as the staff interface.
 */
const PatientLayout = () => (
    <div className="bg-brand-dark-950 min-h-screen text-white">
        {/* Ambient background decorations — same as staff interface */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-15%] left-[-10%] w-[35%] h-[35%] bg-cyber-blue/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-cyber-purple/5 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10">
            <PatientNavbar />
            <main className="max-w-[1600px] mx-auto px-4 pb-12">
                <Outlet />
            </main>
        </div>
    </div>
);

export default PatientLayout;
