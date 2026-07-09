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
} from '@heroicons/react/24/outline';

const PatientNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const patient = (() => {
        try { return JSON.parse(localStorage.getItem('patient') || localStorage.getItem('patientUser') || '{}'); }
        catch { return {}; }
    })();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patient');
        localStorage.removeItem('patientUser');
        navigate('/patient/login');
    };

    const navLinks = [
        { path: '/patient/dashboard',        icon: HomeIcon,          label: 'Home' },
        { path: '/patient/records',           icon: DocumentTextIcon,  label: 'My Records' },
        { path: '/patient/vitals',            icon: HeartIcon,         label: 'My Vitals' },
        { path: '/patient/surveillance',      icon: BellAlertIcon,     label: 'Community' },
        { path: '/patient/trusted-providers', icon: UserGroupIcon,     label: 'Care Team' },
        { path: '/patient/ai/health-summary', icon: ChartBarIcon,      label: 'Health Score' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            <header className={`fixed top-0 w-full z-[100] transition-all duration-500 px-4 pt-3`}>
                <div className="max-w-[1600px] mx-auto">
                    <nav className={`relative flex items-center justify-between px-6 py-2 rounded-2xl border transition-all duration-500 ${
                        scrolled
                            ? 'bg-brand-dark-900/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                            : 'bg-brand-dark-950/40 backdrop-blur-md border-white/5'
                    }`}>

                        {/* Logo */}
                        <Link to="/patient/dashboard" className="flex items-center space-x-3 group flex-shrink-0">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-xl bg-cyber-blue/30 blur-md group-hover:bg-cyber-blue/50 transition-all duration-500" />
                                <div className="relative w-9 h-9 rounded-xl bg-brand-dark-950 border border-cyber-blue/40 flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                                    <SparklesIcon className="h-5 w-5 text-cyber-blue" />
                                </div>
                            </div>
                            <div className="hidden xl:flex flex-col">
                                <span className="text-lg font-black tracking-tighter text-white leading-none">
                                    VITALITY<span className="text-cyber-blue">EYE</span>
                                </span>
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Patient Portal</span>
                            </div>
                        </Link>

                        {/* Desktop nav links */}
                        <div className="hidden lg:flex items-center space-x-0.5 mx-4">
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                                        isActive(link.path)
                                            ? 'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <link.icon className="h-4 w-4 opacity-80" />
                                    <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">{link.label}</span>
                                </Link>
                            ))}
                        </div>

                        {/* Right section */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            {/* Patient badge */}
                            <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1.5 rounded-xl bg-brand-dark-950/30 border border-white/5">
                                <div className="relative">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-green" />
                                    <div className="absolute inset-0 rounded-full bg-cyber-green animate-ping opacity-40" />
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-cyber-green">Active</span>
                            </div>

                            <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-blue/20 to-cyber-purple/20 border border-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase">
                                    {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                                </div>
                                <div className="text-left hidden xl:block">
                                    <p className="text-[9px] font-black text-white uppercase leading-none">{patient?.firstName} {patient?.lastName}</p>
                                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-tighter">Patient</p>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Logout</span>
                            </button>

                            {/* Mobile burger */}
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="lg:hidden p-2 text-white"
                            >
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Mobile Slide-out */}
            <div className={`fixed inset-0 z-[200] lg:hidden transition-all duration-500 ${mobileMenuOpen ? 'visible' : 'invisible'}`}>
                <div
                    className={`absolute inset-0 bg-brand-dark-950/80 backdrop-blur-sm transition-opacity ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setMobileMenuOpen(false)}
                />
                <div className={`absolute top-0 right-0 h-full w-72 bg-brand-dark-900 border-l border-white/10 transition-transform duration-500 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-blue/20 to-cyber-purple/20 border border-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase">
                                {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase">{patient?.firstName} {patient?.lastName}</p>
                                <p className="text-[9px] font-bold text-cyber-blue uppercase tracking-widest">Patient Portal</p>
                            </div>
                        </div>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="p-4 space-y-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                                    isActive(link.path)
                                        ? 'bg-cyber-blue/10 text-cyber-blue'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <link.icon className="h-5 w-5" />
                                <span className="text-sm font-bold">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5">
                        <button
                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                            className="flex items-center space-x-3 text-gray-400 hover:text-red-400 transition-colors"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span className="text-sm font-bold uppercase tracking-widest">Log Out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Spacer matching staff navbar */}
            <div className="h-20" />
        </>
    );
};

export default PatientNavbar;
