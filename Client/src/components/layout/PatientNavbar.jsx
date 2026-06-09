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
        { path: '/patient/dashboard',         icon: HomeIcon,           label: 'Home' },
        { path: '/patient/records',            icon: DocumentTextIcon,   label: 'My Records' },
        { path: '/patient/vitals',             icon: HeartIcon,          label: 'My Vitals' },
        { path: '/patient/surveillance',       icon: BellAlertIcon,      label: 'Community Health' },
        { path: '/patient/trusted-providers',  icon: UserGroupIcon,      label: 'My Care Team' },
        { path: '/patient/ai/health-summary',  icon: ChartBarIcon,       label: 'Health Score' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                scrolled
                    ? 'bg-slate-900/80 backdrop-blur-md border-b border-emerald-500/10'
                    : 'bg-transparent'
            }`}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/patient/dashboard" className="flex items-center space-x-2.5">
                            <div className="relative group">
                                <div className="absolute inset-0 rounded-lg bg-emerald-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="relative w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                                    <SparklesIcon className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold tracking-tight text-white leading-none">
                                    Vitality<span className="text-emerald-400">Eye</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium tracking-wide">Patient Portal</span>
                            </div>
                        </Link>

                        {/* Desktop nav links */}
                        <div className="hidden lg:flex items-center space-x-1">
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center space-x-2 px-4 py-1.5 rounded-full transition-all duration-200 ${
                                        isActive(link.path)
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <link.icon className="h-4 w-4" />
                                    <span className="text-sm font-semibold">{link.label}</span>
                                </Link>
                            ))}
                        </div>

                        {/* Right section */}
                        <div className="flex items-center space-x-4">
                            <div className="hidden md:flex items-center space-x-4 pl-4 border-l border-white/5">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-white">{patient?.firstName} {patient?.lastName}</p>
                                    <p className="text-[10px] text-emerald-400/80 font-medium">Account Active</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors"
                                >
                                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                    <span>Log Out</span>
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
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                                <SparklesIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{patient?.firstName} {patient?.lastName}</p>
                                <p className="text-xs text-emerald-400 font-medium">Patient Portal</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 py-6 overflow-y-auto">
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-6 py-3 transition-all duration-200 ${
                                    isActive(link.path)
                                        ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <link.icon className="h-5 w-5" />
                                <span className="text-sm font-bold">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="p-6 border-t border-white/10">
                        <button
                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                            className="flex items-center space-x-3 text-slate-400 hover:text-rose-400 transition-colors duration-200"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span className="text-sm font-bold">Log Out</span>
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
