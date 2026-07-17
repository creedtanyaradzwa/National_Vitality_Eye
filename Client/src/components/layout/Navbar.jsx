import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider.jsx';
import { useAlerts } from '../../context/AlertProvider';
import {
    HomeIcon,
    UserGroupIcon,
    DocumentTextIcon,
    ChartBarIcon,
    BellIcon,
    MapIcon,
    UserIcon,
    UsersIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    HeartIcon,
    BellAlertIcon,
    ShieldCheckIcon,
    CpuChipIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';

// ─────────────────────────────────────────────────────────────────────────────
// Navigation structure aligned with VitalityEye's 4 user personas:
//
//  MODULE 1 + 3  →  Clinical Care     (Doctors · Nurses)
//    Patients · Records · AI Diagnostic · Care Hub
//
//  MODULE 2      →  Surveillance      (Epidemiologists · MoHCC)
//    Overview · Analytics · Heatmap · Alerts
//
//  MODULE 5      →  Administration    (Admins · Data Clerks)
//    Admin Panel  (admin-only)
// ─────────────────────────────────────────────────────────────────────────────

const CLINICAL_LINKS = [
    { path: '/patients',     icon: UserGroupIcon,    label: 'Patients',      desc: 'EHR & patient registry' },
    { path: '/records',      icon: DocumentTextIcon, label: 'Records',       desc: 'Clinical events & visits' },
    { path: '/ai-predictor', icon: CpuChipIcon,      label: 'AI Diagnostic', desc: 'NEWS2 triage · 9-factor prediction' },
    { path: '/care-hub',     icon: HeartIcon,        label: 'Care Hub',      desc: 'Handovers & care coordination' },
];

const SURVEILLANCE_LINKS = [
    { path: '/dashboard', icon: HomeIcon,        label: 'Overview',  desc: 'National clinical intelligence' },
    { path: '/analytics', icon: ChartBarIcon,    label: 'Analytics', desc: 'Disease trends · AI projections' },
    { path: '/map',       icon: MapIcon,         label: 'Heatmap',   desc: '10-province case distribution' },
    { path: '/alerts',    icon: BellIcon,        label: 'Alerts',    desc: '23 zero-tolerance pathogens' },
];

// Static Tailwind classes for each module to avoid purge issues
const MODULE_STYLES = {
    clinical: {
        dot:          'bg-cyan-400',
        tabActive:    'bg-cyan-400/10 text-cyan-400 border-cyan-400/25',
        tabInactive:  'text-gray-400 border-transparent hover:text-white hover:bg-white/5',
        headerText:   'text-cyan-400',
        linkActive:   'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
        linkInactive: 'text-gray-400 hover:bg-white/5 hover:text-white',
        iconActive:   'bg-cyan-400/15 border-cyan-400/30',
        iconInactive: 'bg-white/5 border-white/5',
        dotActive:    'bg-cyan-400',
        mobileLabel:  'text-cyan-400',
        mobileActive: 'bg-cyan-400/10 text-cyan-400',
    },
    surveillance: {
        dot:          'bg-violet-400',
        tabActive:    'bg-violet-400/10 text-violet-400 border-violet-400/25',
        tabInactive:  'text-gray-400 border-transparent hover:text-white hover:bg-white/5',
        headerText:   'text-violet-400',
        linkActive:   'bg-violet-400/10 text-violet-400 border border-violet-400/20',
        linkInactive: 'text-gray-400 hover:bg-white/5 hover:text-white',
        iconActive:   'bg-violet-400/15 border-violet-400/30',
        iconInactive: 'bg-white/5 border-white/5',
        dotActive:    'bg-violet-400',
        mobileLabel:  'text-violet-400',
        mobileActive: 'bg-violet-400/10 text-violet-400',
    },
};

const ROLE_LABELS = {
    admin:      'System Admin',
    doctor:     'Clinician',
    nurse:      'Nurse',
    data_entry: 'Data Clerk',
    viewer:     'Epidemiologist',
};

const Navbar = () => {
    const { user, logout, hasRole } = useAuth();
    const { activeAlerts, connected } = useAlerts();
    const navigate = useNavigate();
    const location = useLocation();

    const [mobileOpen, setMobileOpen]       = useState(false);
    const [openModule, setOpenModule]       = useState(null); // 'clinical' | 'surveillance' | null
    const [scrolled, setScrolled]           = useState(false);
    const navRef                            = useRef(null);

    // Scroll effect
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    // Close dropdowns when navigating
    useEffect(() => {
        setOpenModule(null);
        setMobileOpen(false);
    }, [location.pathname]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const fn = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) setOpenModule(null);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    const isActive    = (path) => location.pathname === path;
    const anyActive   = (links) => links.some(l => isActive(l.path));

    const roleLabel = ROLE_LABELS[user?.role] || user?.role || '';

    // ─── Reusable dropdown link ───────────────────────────────────────────
    const DropdownLink = ({ link, style }) => (
        <Link
            to={link.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive(link.path) ? style.linkActive : style.linkInactive
            }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                isActive(link.path) ? style.iconActive : style.iconInactive
            }`}>
                <link.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide leading-none">{link.label}</p>
                <p className="text-[9px] text-gray-500 mt-0.5 truncate">{link.desc}</p>
            </div>
            {isActive(link.path) && <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dotActive}`} />}
        </Link>
    );

    return (
        <>
            {/* ══════════════════════════════════════════════════════════════
                TOP NAV BAR
            ══════════════════════════════════════════════════════════════ */}
            <header className="fixed top-0 w-full z-[100] px-4 pt-3">
                <div className="max-w-[1600px] mx-auto" ref={navRef}>
                    <nav className={`flex items-center justify-between gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-500 ${
                        scrolled
                            ? 'bg-brand-dark-900/95 backdrop-blur-2xl border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
                            : 'bg-brand-dark-950/60 backdrop-blur-xl border-white/5'
                    }`}>

                        {/* ── LOGO ── */}
                        <Link to="/dashboard" className="flex items-center gap-3 group flex-shrink-0">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-lg group-hover:bg-cyan-400/40 transition-all duration-500" />
                                <div className="relative w-9 h-9 rounded-xl bg-brand-dark-950 border border-cyan-400/40 flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                                    <ShieldCheckIcon className="h-5 w-5 text-cyan-400" />
                                </div>
                            </div>
                            <div className="hidden xl:flex flex-col leading-none">
                                <span className="text-base font-black tracking-tighter text-white">
                                    VITALITY<span className="text-cyan-400">EYE</span>
                                </span>
                                <span className="text-[7px] font-black text-gray-600 uppercase tracking-[0.25em] mt-0.5">
                                    National Health Intelligence
                                </span>
                            </div>
                        </Link>

                        {/* ── DESKTOP MODULE TABS ── */}
                        <div className="hidden lg:flex items-center gap-1 flex-1">

                            {/* ── Tab: Clinical Care ── */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenModule(openModule === 'clinical' ? null : 'clinical')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                                        anyActive(CLINICAL_LINKS)
                                            ? MODULE_STYLES.clinical.tabActive
                                            : MODULE_STYLES.clinical.tabInactive
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MODULE_STYLES.clinical.dot} ${!anyActive(CLINICAL_LINKS) ? 'opacity-35' : ''}`} />
                                    Clinical Care
                                    <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${openModule === 'clinical' ? 'rotate-180' : ''} opacity-60`} />
                                </button>

                                {openModule === 'clinical' && (
                                    <div className="absolute top-full left-0 mt-2 w-60 rounded-2xl bg-brand-dark-900 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-50">
                                        <div className="px-4 py-3 border-b border-white/5">
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${MODULE_STYLES.clinical.headerText}`}>
                                                Clinical Care
                                            </p>
                                            <p className="text-[9px] text-gray-600 mt-0.5">Module 1 & 3 — EHR + AI Decision Support</p>
                                        </div>
                                        <div className="p-2 space-y-0.5">
                                            {CLINICAL_LINKS.map(link => (
                                                <DropdownLink key={link.path} link={link} style={MODULE_STYLES.clinical} />
                                            ))}
                                        </div>
                                        <div className="px-4 py-2 border-t border-white/5 bg-white/2">
                                            <p className="text-[8px] text-gray-700 uppercase tracking-widest">For: Doctors · Nurses · Clinicians</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Separator */}
                            <div className="h-5 w-px bg-white/8 mx-1 flex-shrink-0" />

                            {/* ── Tab: Surveillance ── */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenModule(openModule === 'surveillance' ? null : 'surveillance')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                                        anyActive(SURVEILLANCE_LINKS)
                                            ? MODULE_STYLES.surveillance.tabActive
                                            : MODULE_STYLES.surveillance.tabInactive
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MODULE_STYLES.surveillance.dot} ${!anyActive(SURVEILLANCE_LINKS) ? 'opacity-35' : ''}`} />
                                    Surveillance
                                    <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${openModule === 'surveillance' ? 'rotate-180' : ''} opacity-60`} />
                                </button>

                                {openModule === 'surveillance' && (
                                    <div className="absolute top-full left-0 mt-2 w-60 rounded-2xl bg-brand-dark-900 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-50">
                                        <div className="px-4 py-3 border-b border-white/5">
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${MODULE_STYLES.surveillance.headerText}`}>
                                                Surveillance
                                            </p>
                                            <p className="text-[9px] text-gray-600 mt-0.5">Module 2 — Real-Time Epidemiology</p>
                                        </div>
                                        <div className="p-2 space-y-0.5">
                                            {SURVEILLANCE_LINKS.map(link => (
                                                <DropdownLink key={link.path} link={link} style={MODULE_STYLES.surveillance} />
                                            ))}
                                        </div>
                                        <div className="px-4 py-2 border-t border-white/5 bg-white/2">
                                            <p className="text-[8px] text-gray-700 uppercase tracking-widest">For: Epidemiologists · MoHCC Officials</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Separator */}
                            <div className="h-5 w-px bg-white/8 mx-1 flex-shrink-0" />

                            {/* ── Tab: Admin (admin-only) ── */}
                            {hasRole('admin') && (
                                <Link
                                    to="/admin"
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                                        isActive('/admin')
                                            ? 'bg-amber-400/10 text-amber-400 border-amber-400/25'
                                            : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-400 ${!isActive('/admin') ? 'opacity-35' : ''}`} />
                                    <UsersIcon className="h-3.5 w-3.5" />
                                    Administration
                                </Link>
                            )}
                        </div>

                        {/* ── RIGHT: STATUS + PROFILE ── */}
                        <div className="flex items-center gap-2 flex-shrink-0">

                            {/* Live / Offline pill */}
                            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-brand-dark-950/50 border border-white/5">
                                <div className="relative flex-shrink-0">
                                    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-500'}`} />
                                    {connected && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {connected ? 'Live' : 'Offline'}
                                </span>
                            </div>

                            {/* Alert bell */}
                            <Link to="/alerts" className="relative">
                                <div className={`p-2 rounded-xl border transition-all ${
                                    activeAlerts.length > 0
                                        ? 'bg-red-500/10 border-red-500/25 text-red-400'
                                        : 'bg-brand-dark-950/50 border-white/5 text-gray-500 hover:text-white hover:border-white/10'
                                }`}>
                                    <BellAlertIcon className="h-4 w-4" />
                                </div>
                                {activeAlerts.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[7px] font-black text-white">
                                        {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
                                    </span>
                                )}
                            </Link>

                            {/* Profile */}
                            <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-white/8 group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-400/20 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all">
                                    <UserIcon className="h-4 w-4 text-white/80" />
                                </div>
                                <div className="hidden md:flex flex-col leading-none">
                                    <p className="text-[9px] font-black text-white uppercase">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{roleLabel}</p>
                                </div>
                            </Link>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                title="Sign out"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Out</span>
                            </button>

                            {/* Mobile burger */}
                            <button
                                onClick={() => setMobileOpen(true)}
                                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <Bars3Icon className="h-5 w-5" />
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* ══════════════════════════════════════════════════════════════
                MOBILE DRAWER
            ══════════════════════════════════════════════════════════════ */}
            <div className={`fixed inset-0 z-[200] lg:hidden transition-all duration-300 ${mobileOpen ? 'visible' : 'invisible pointer-events-none'}`}>
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-brand-dark-950/85 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setMobileOpen(false)}
                />

                {/* Side panel */}
                <div className={`absolute top-0 right-0 h-full w-72 bg-brand-dark-900 border-l border-white/8 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                    {/* Header */}
                    <div className="p-5 flex items-center justify-between border-b border-white/5 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-400/20 border border-white/10 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-white/80" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase">{user?.firstName} {user?.lastName}</p>
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">{roleLabel}</p>
                            </div>
                        </div>
                        <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Module sections */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-5">

                        {/* Clinical Care */}
                        <div>
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">Clinical Care</p>
                            </div>
                            <p className="text-[8px] text-gray-600 px-2 mb-2 uppercase tracking-widest">Module 1 & 3 · Doctors · Nurses</p>
                            <div className="space-y-0.5">
                                {CLINICAL_LINKS.map(link => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                            isActive(link.path)
                                                ? 'bg-cyan-400/10 text-cyan-400'
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

                        {/* Surveillance */}
                        <div>
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">Surveillance</p>
                            </div>
                            <p className="text-[8px] text-gray-600 px-2 mb-2 uppercase tracking-widest">Module 2 · Epidemiologists · MoHCC</p>
                            <div className="space-y-0.5">
                                {SURVEILLANCE_LINKS.map(link => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                            isActive(link.path)
                                                ? 'bg-violet-400/10 text-violet-400'
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

                        {/* Administration — admin only */}
                        {hasRole('admin') && (
                            <div>
                                <div className="flex items-center gap-2 px-2 mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">Administration</p>
                                </div>
                                <p className="text-[8px] text-gray-600 px-2 mb-2 uppercase tracking-widest">Module 5 · RBAC · Data Entry Clerks</p>
                                <Link
                                    to="/admin"
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                        isActive('/admin')
                                            ? 'bg-amber-400/10 text-amber-400'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <UsersIcon className="h-5 w-5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold">User Administration</p>
                                        <p className="text-[9px] text-gray-600">Approvals · roles · access control</p>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 flex-shrink-0 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-500'}`} />
                                <span className={`text-[8px] font-black uppercase tracking-widest ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {connected ? 'Live Sync' : 'Offline — PWA cache active'}
                                </span>
                            </div>
                            {activeAlerts.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-[8px] font-black text-red-400">
                                    {activeAlerts.length} Alert{activeAlerts.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => { handleLogout(); setMobileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
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

export default Navbar;
