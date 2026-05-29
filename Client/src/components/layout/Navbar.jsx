import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider.jsx';
import { useAlerts } from '../../context/AlertProvider';
import { 
    HomeIcon, 
    UserGroupIcon, 
    DocumentTextIcon,
    ChartBarIcon,
    BellIcon,
    BeakerIcon,
    MapIcon,
    UserIcon,
    UsersIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    SparklesIcon,
    HeartIcon,
    BellAlertIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
    const { user, logout, hasRole } = useAuth();
    const { activeAlerts, connected } = useAlerts();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navGroups = [
        {
            title: 'Intelligence',
            color: 'cyber-blue',
            links: [
                { path: '/dashboard', icon: HomeIcon, label: 'Overview' },
                { path: '/analytics', icon: ChartBarIcon, label: 'Trends' },
                { path: '/map', icon: MapIcon, label: 'Hotspots' },
                { path: '/alerts', icon: BellIcon, label: 'Alerts' },
            ]
        },
        {
            title: 'Clinical',
            color: 'cyber-purple',
            links: [
                { path: '/patients', icon: UserGroupIcon, label: 'Patients' },
                { path: '/records', icon: DocumentTextIcon, label: 'Records' },
                { path: '/ai-predictor', icon: BeakerIcon, label: 'AI Diagnostic' },
                { path: '/care-hub', icon: HeartIcon, label: 'Hub' },
            ]
        }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Main Navigation Bar */}
            <header className={`fixed top-0 w-full z-[100] transition-all duration-500 px-4 pt-3`}>
                <div className="max-w-[1600px] mx-auto">
                    <nav className={`relative flex items-center justify-between px-6 py-2 rounded-2xl border transition-all duration-500 ${
                        scrolled
                            ? 'bg-brand-dark-900/90 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                            : 'bg-brand-dark-950/40 backdrop-blur-md border-white/5'
                    }`}>
                        
                        {/* 1. Logo Section */}
                        <Link to="/dashboard" className="flex items-center space-x-3 group flex-shrink-0">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-xl bg-cyber-blue/30 blur-md group-hover:bg-cyber-blue/50 transition-all duration-500" />
                                <div className="relative w-9 h-9 rounded-xl bg-brand-dark-950 border border-cyber-blue/40 flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                                    <SparklesIcon className="h-5 w-5 text-cyber-blue" />
                                </div>
                            </div>
                            <span className="text-lg font-black tracking-tighter text-white hidden xl:block">
                                VITALITY<span className="text-cyber-blue">EYE</span>
                            </span>
                        </Link>

                        {/* 2. Central Categorized Navigation (Desktop) */}
                        <div className="hidden lg:flex items-center space-x-8 mx-6">
                            {navGroups.map((group) => (
                                <div key={group.title} className="flex items-center space-x-2">
                                    {/* Category Label */}
                                    <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 mr-1">
                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-gray-500`}>
                                            {group.title}
                                        </span>
                                    </div>
                                    
                                    {/* Category Links */}
                                    <div className="flex items-center space-x-1">
                                        {group.links.map((link) => (
                                            <Link
                                                key={link.path}
                                                to={link.path}
                                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all duration-300 group/link ${
                                                    isActive(link.path)
                                                        ? `bg-${group.color}/10 text-${group.color} border border-${group.color}/20`
                                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <link.icon className={`h-4 w-4 ${isActive(link.path) ? '' : 'group-hover/link:text-white opacity-70'}`} />
                                                <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">{link.label}</span>
                                            </Link>
                                        ))}
                                    </div>

                                    {/* Divider if not last */}
                                    {group === navGroups[0] && (
                                        <div className="h-8 w-px bg-white/5 mx-2" />
                                    )}
                                </div>
                            ))}

                            {hasRole('admin') && (
                                <div className="flex items-center ml-2 border-l border-white/5 pl-6">
                                    <Link
                                        to="/admin"
                                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                                            isActive('/admin')
                                                ? 'bg-cyber-pink/10 text-cyber-pink border border-cyber-pink/20'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <UsersIcon className="h-4 w-4" />
                                        <span className="text-[11px] font-bold tracking-tight">Admin</span>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* 3. Status & Profile Section */}
                        <div className="flex items-center space-x-4 flex-shrink-0">
                            {/* Live/Sync Status */}
                            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-brand-dark-950/30 border border-white/5">
                                <div className="relative">
                                    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cyber-green' : 'bg-red-500'}`} />
                                    {connected && <div className="absolute inset-0 rounded-full bg-cyber-green animate-ping opacity-40" />}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${connected ? 'text-cyber-green' : 'text-red-500'}`}>
                                    {connected ? 'Live' : 'Offline'}
                                </span>
                            </div>

                            {/* Alert Count */}
                            <Link to="/alerts" className="relative group">
                                <div className="p-2 rounded-xl bg-brand-dark-950/30 border border-white/5 hover:border-cyber-purple/30 transition-all">
                                    <BellAlertIcon className={`h-5 w-5 ${activeAlerts.length > 0 ? 'text-cyber-purple' : 'text-gray-500 group-hover:text-white'}`} />
                                </div>
                                {activeAlerts.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyber-purple text-[9px] font-black text-white">
                                        {activeAlerts.length}
                                    </span>
                                )}
                            </Link>

                            {/* Profile Action */}
                            <div className="flex items-center space-x-2 pl-2 border-l border-white/5">
                                <Link to="/profile" className="flex items-center space-x-2 group">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-purple/20 to-cyber-blue/20 border border-white/10 flex items-center justify-center transition-transform group-hover:scale-105">
                                        <UserIcon className="h-4 w-4 text-white/80" />
                                    </div>
                                    <div className="text-left hidden md:block">
                                        <p className="text-[10px] font-black text-white uppercase leading-none">{user?.firstName}</p>
                                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">{user?.role}</p>
                                    </div>
                                </Link>
                                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Mobile Burger */}
                            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-white">
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Mobile Sidebar (Slide out) */}
            <div className={`fixed inset-0 z-[200] lg:hidden transition-all duration-500 ${mobileMenuOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-brand-dark-950/80 backdrop-blur-sm transition-opacity ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMobileMenuOpen(false)} />
                <div className={`absolute top-0 right-0 h-full w-72 bg-brand-dark-900 border-l border-white/10 transition-transform duration-500 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 flex items-center justify-between border-b border-white/5">
                        <span className="text-lg font-black text-white uppercase tracking-tighter">System Hub</span>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400"><XMarkIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="p-4 space-y-6">
                        {navGroups.map(group => (
                            <div key={group.title}>
                                <h3 className="px-4 mb-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">{group.title}</h3>
                                <div className="space-y-1">
                                    {group.links.map(link => (
                                        <Link key={link.path} to={link.path} onClick={() => setMobileMenuOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive(link.path) ? `bg-${group.color}/10 text-${group.color}` : 'text-gray-400 hover:bg-white/5'}`}>
                                            <link.icon className="h-5 w-5" />
                                            <span className="text-sm font-bold">{link.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="h-20" />
        </>
    );
};

export default Navbar;
