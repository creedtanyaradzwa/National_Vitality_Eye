import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    DocumentTextIcon,
    HeartIcon,
    UserGroupIcon,
    SparklesIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    ChartBarIcon,
    BellAlertIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const PatientNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const patient = (() => {
        try { return JSON.parse(localStorage.getItem('patient') || '{}'); } catch { return {}; }
    })();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patient');
        navigate('/patient/login');
    };

    const navLinks = [
        { path: '/patient/dashboard',         icon: HomeIcon,           label: 'Dashboard' },
        { path: '/patient/records',            icon: DocumentTextIcon,   label: 'Records' },
        { path: '/patient/vitals',             icon: HeartIcon,          label: 'Vitals' },
        { path: '/patient/trusted-providers',  icon: UserGroupIcon,      label: 'Care Team' },
        { path: '/patient/ai/health-summary',  icon: ChartBarIcon,       label: 'Health Score' },
        { path: '/patient/ai/vitals-insights', icon: ArrowTrendingUpIcon, label: 'Insights' },
        { path: '/patient/ai/reminders',       icon: BellAlertIcon,      label: 'Reminders' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
                scrolled
                    ? 'bg-brand-dark-900/90 backdrop-blur-xl border-b border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
                    : 'bg-transparent'
            }`}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/patient/dashboard" className="flex items-center space-x-3 group">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-xl bg-cyber-purple blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-dark-800 to-brand-dark-950 border border-cyber-purple/30 flex items-center justify-center">
                                    <SparklesIcon className="h-5 w-5 text-cyber-purple" />
                                </div>
                            </div>
                            <div>
                                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-cyber-purple bg-clip-text text-transparent">
                                    VITALITY<span className="text-cyber-purple">EYE</span>
                                </span>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-gray-600 font-bold -mt-0.5">Patient Portal</p>
                            </div>
                        </Link>

                        {/* Desktop nav links */}
                        <div className="hidden lg:flex items-center space-x-1">
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                                        isActive(link.path)
                                            ? 'bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/20 shadow-[0_0_15px_rgba(188,19,254,0.1)]'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <link.icon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{link.label}</span>
                                </Link>
                            ))}
                        </div>

                        {/* Right section */}
                        <div className="flex items-center space-x-4">
                            {/* Patient name */}
                            <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-white/5">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{patient?.firstName} {patient?.lastName}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-cyber-purple font-bold opacity-80">Patient</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-xl hover:bg-red-500/10 transition-all duration-300 group"
                                    title="Sign out"
                                >
                                    <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-500 group-hover:text-red-400" />
                                </button>
                            </div>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition-all duration-300"
                            >
                                {mobileMenuOpen
                                    ? <XMarkIcon className="h-6 w-6 text-white" />
                                    : <Bars3Icon className="h-6 w-6 text-white" />}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile menu */}
            <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${
                mobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
            }`}>
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={() => setMobileMenuOpen(false)} />
                <div className={`relative z-10 flex flex-col h-full w-64 bg-gradient-to-b from-brand-dark-900 to-brand-dark-950 border-r border-white/10 transform transition-transform duration-500 ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-blue flex items-center justify-center">
                                <SparklesIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{patient?.firstName} {patient?.lastName}</p>
                                <p className="text-xs text-cyber-purple">Patient Portal</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 py-6 overflow-y-auto">
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-6 py-3 transition-all duration-300 ${
                                    isActive(link.path)
                                        ? 'bg-cyber-purple/20 text-cyber-purple border-l-4 border-cyber-purple'
                                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <link.icon className="h-5 w-5" />
                                <span className="text-sm font-medium">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="p-6 border-t border-white/10">
                        <button
                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                            className="flex items-center space-x-3 text-gray-400 hover:text-red-400 transition-colors duration-300"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="h-16" />
        </>
    );
};

export default PatientNavbar;
