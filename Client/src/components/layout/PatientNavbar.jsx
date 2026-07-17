import React, { useState, useEffect, useRef } from 'react';
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
    MagnifyingGlassIcon,
    ArrowTrendingUpIcon,
    BellIcon,
    ShieldCheckIcon,
    ChevronDownIcon,
    CpuChipIcon,
} from '@heroicons/react/24/outline';

// ─── Patient Portal nav groups — mirrors the 4th beneficiary group ──────────
// My Health   → Patient's own EHR data (records, vitals, dashboard)
// AI Assistant → AI-powered personal health tools (symptom checker, insights)
// Community   → Citizen surveillance & trusted care team
const PATIENT_MODULES = [
    {
        id: 'health',
        label: 'My Health',
        sublabel: 'Records & vitals',
        color: 'cyber-blue',
        dotColor: 'bg-cyber-blue',
        accentActive: 'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/25',
        links: [
            { path: '/patient/dashboard', icon: HomeIcon,          label: 'Dashboard',    desc: 'Wellness score & overview' },
            { path: '/patient/vitals',    icon: HeartIcon,          label: 'My Vitals',    desc: 'Blood pressure, temperature & more' },
            { path: '/patient/records',   icon: DocumentTextIcon,   label: 'My Records',   desc: 'Visit history & clinical events' },
        ],
    },
    {
        id: 'ai',
        label: 'AI Assistant',
        sublabel: 'Powered by EDLIZ',
        color: 'cyber-green',
        dotColor: 'bg-cyber-green',
        accentActive: 'bg-cyber-green/10 text-cyber-green border-cyber-green/25',
        links: [
            { path: '/patient/ai/symptom-checker',  icon: MagnifyingGlassIcon,  label: 'Symptom Checker',  desc: 'AI-guided assessment & triage' },
            { path: '/patient/ai/health-summary',   icon: ChartBarIcon,          label: 'Health Score',     desc: 'AI overview of your health metrics' },
            { path: '/patient/ai/vitals-insights',  icon: ArrowTrendingUpIcon,   label: 'Vitals Trends',    desc: 'Track changes over time' },
            { path: '/patient/ai/reminders',        icon: BellIcon,              label: 'Care Reminders',   desc: 'Medications, checkups & follow-ups' },
        ],
    },
    {
        id: 'community',
        label: 'Community',
        sublabel: 'Surveillance & care team',
        color: 'amber-400',
        dotColor: 'bg-amber-400',
        accentActive: 'bg-amber-400/10 text-amber-400 border-amber-400/25',
        links: [
            { path: '/patient/surveillance',      icon: BellAlertIcon,  label: 'Community Health', desc: 'Report & track local outbreaks' },
            { path: '/patient/trusted-providers', icon: UserGroupIcon,  label: 'My Care Team',     desc: 'Doctors & nurses you trust' },
        ],
    },
];

const PatientNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const dropdownRef = useRef(null);

    const patient = (() => {
        try {
            return JSON.parse(
                localStorage.getItem('patient') ||
                localStorage.getItem('patientUser') ||
                '{}'
            );
        } catch { return {}; }
    })();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close on route change
    useEffect(() => {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patient');
        localStorage.removeItem('patientUser');
        navigate('/patient/login');
    };

    const isActive = (path) => location.pathname === path;
    const isModuleActive = (module) => module.links.some(l => isActive(l.path));

    const initials = [patient?.firstName?.[0], patient?.lastName?.[0]]
        .filter(Boolean).join('').toUpperCase() || '?';

    return (
        <>
            {/* ── Main Bar ─────────────────────────────────────────────────────── */}
            <header className="fixed top-0 w-full z-[100] px-4 pt-3">
                <div className="max-w-[1600px] mx-auto">
                    <nav className={`relative flex items-center justify-between px-5 py-2 rounded-2xl border transition-all duration-500 ${
                        scrolled
                            ? 'bg-brand-dark-900/95 backdrop-blur-2xl border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
                            : 'bg-brand-dark-950/50 backdrop-blur-md border-white/5'
                    }`}>

                        {/* ── Logo ── */}
                        <Link to="/patient/dashboard" className="flex items-center gap-3 group flex-shrink-0 mr-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-xl bg-cyber-blue/25 blur-md group-hover:bg-cyber-blue/45 transition-all duration-500" />
                                <div className="relative w-9 h-9 rounded-xl bg-brand-dark-950 border border-cyber-blue/40 flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                                    <ShieldCheckIcon className="h-5 w-5 text-cyber-blue" />
                                </div>
                            </div>
                            <div className="hidden xl:flex flex-col leading-none">
                                <span className="text-base font-black tracking-tighter text-white">
                                    VITALITY<span className="text-cyber-blue">EYE</span>
                                </span>
                                <span className="text-[7px] font-black text-gray-600 uppercase tracking-[0.25em] mt-0.5">
                                    Patient Portal
                                </span>
                            </div>
                        </Link>

                        {/* ── Desktop Module Tabs ── */}
                        <div ref={dropdownRef} className="hidden lg:flex items-center gap-1 flex-1">
                            {PATIENT_MODULES.map((module) => {
                                const isOpen = activeDropdown === module.id;
                                const isAnyActive = isModuleActive(module);

                                return (
                                    <div key={module.id} className="relative">
                                        {/* Tab button */}
                                        <button
                                            onClick={() => setActiveDropdown(isOpen ? null : module.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                                                isAnyActive
                                                    ? `${module.accentActive} border`
                                                    : 'text-gray-400 border-transparent hover:border-white/8 hover:text-white hover:bg-white/4'
                                            }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${module.dotColor} ${!isAnyActive && 'opacity-35'}`} />
                                            <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                                                {module.label}
                                            </span>
                                            <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${!isAnyActive && 'opacity-50'}`} />
                                        </button>

                                        {/* Dropdown panel */}
                                        {isOpen && (
                                            <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-brand-dark-900/98 backdrop-blur-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.7)] overflow-hidden z-50">
                                                {/* Header */}
                                                <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-white/2 to-transparent">
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-${module.color}`}>
                                                        {module.label}
                                                    </p>
                                                    <p className="text-[9px] text-gray-500 mt-0.5">{module.sublabel}</p>
                                                </div>
                                                {/* Links */}
                                                <div className="p-2">
                                                    {module.links.map(link => (
                                                        <Link
                                                            key={link.path}
                                                            to={link.path}
                                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group/link ${
                                                                isActive(link.path)
                                                                    ? `${module.accentActive} border`
                                                                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                                                            }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                                                isActive(link.path)
                                                                    ? `bg-${module.color}/20 border border-${module.color}/30`
                                                                    : 'bg-white/5 border border-white/5 group-hover/link:border-white/10'
                                                            }`}>
                                                                <link.icon className="h-4 w-4" />
                                                            </div>
                                                            <div className="text-left min-w-0">
                                                                <p className="text-xs font-black uppercase tracking-wide leading-none">{link.label}</p>
                                                                <p className="text-[9px] text-gray-600 mt-0.5 leading-tight truncate">{link.desc}</p>
                                                            </div>
                                                            {isActive(link.path) && (
                                                                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${module.dotColor} flex-shrink-0`} />
                                                            )}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Right: status + patient badge + logout ── */}
                        <div className="flex items-center gap-2 flex-shrink-0">

                            {/* Active portal badge */}
                            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-brand-dark-950/50 border border-white/5">
                                <div className="relative flex-shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-green" />
                                    <div className="absolute inset-0 rounded-full bg-cyber-green animate-ping opacity-45" />
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-cyber-green">Active</span>
                            </div>

                            {/* Patient avatar + name */}
                            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-blue/20 to-cyber-purple/20 border border-white/10 flex items-center justify-center text-[10px] font-black text-white">
                                    {initials}
                                </div>
                                <div className="hidden xl:flex flex-col leading-none">
                                    <p className="text-[9px] font-black text-white uppercase">
                                        {patient?.firstName} {patient?.lastName}
                                    </p>
                                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Patient</p>
                                </div>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/8 border border-transparent hover:border-red-400/15 transition-all"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Out</span>
                            </button>

                            {/* Mobile burger */}
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="lg:hidden p-2 text-gray-400 hover:text-white"
                            >
                                <Bars3Icon className="h-5 w-5" />
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
            <div className={`fixed inset-0 z-[200] lg:hidden transition-all duration-400 ${mobileMenuOpen ? 'visible' : 'invisible pointer-events-none'}`}>
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-brand-dark-950/85 backdrop-blur-sm transition-opacity duration-400 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setMobileMenuOpen(false)}
                />
                {/* Panel */}
                <div className={`absolute top-0 right-0 h-full w-72 bg-brand-dark-900 border-l border-white/8 transition-transform duration-400 flex flex-col ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                    {/* Panel header */}
                    <div className="p-5 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-blue/20 to-cyber-purple/20 border border-white/10 flex items-center justify-center text-[11px] font-black text-white">
                                {initials}
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase">
                                    {patient?.firstName} {patient?.lastName}
                                </p>
                                <p className="text-[9px] text-cyber-blue uppercase tracking-widest font-bold">Patient Portal</p>
                            </div>
                        </div>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:text-white">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Nav groups */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-5">
                        {PATIENT_MODULES.map(module => (
                            <div key={module.id}>
                                {/* Group label */}
                                <div className="flex items-center gap-2 px-3 mb-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${module.dotColor}`} />
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] text-${module.color}`}>
                                        {module.label}
                                    </p>
                                    <p className="text-[8px] text-gray-600 ml-1">{module.sublabel}</p>
                                </div>
                                {/* Links */}
                                <div className="space-y-0.5">
                                    {module.links.map(link => (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                                isActive(link.path)
                                                    ? `bg-${module.color}/10 text-${module.color}`
                                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <link.icon className="h-5 w-5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold">{link.label}</p>
                                                <p className="text-[9px] text-gray-600">{link.desc}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Panel footer */}
                    <div className="p-4 border-t border-white/5">
                        <div className="flex items-center gap-1.5 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyber-green" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-cyber-green">Portal Active</span>
                        </div>
                        <button
                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/8 transition-all"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span className="text-sm font-bold uppercase tracking-widest">Log Out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="h-20" />
        </>
    );
};

export default PatientNavbar;
