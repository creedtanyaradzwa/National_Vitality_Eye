import React from 'react';
import { Outlet } from 'react-router-dom';
import PatientNavbar from './PatientNavbar';

/**
 * PatientLayout — wraps every patient portal page with the shared navbar.
 */
const PatientLayout = () => (
    <div className="bg-[#020617] min-h-screen text-slate-200 selection:bg-emerald-500/30">
        {/* Subtle background decoration */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10">
            <PatientNavbar />
            <main className="max-w-7xl mx-auto pb-12">
                <Outlet />
            </main>
        </div>
    </div>
);

export default PatientLayout;
