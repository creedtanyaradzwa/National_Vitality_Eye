import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useAlerts } from '../../context/useAlerts';
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
    SparklesIcon
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

    const navLinks = [
        { path: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
        { path: '/patients', icon: UserGroupIcon, label: 'Patients' },
        { path: '/records', icon: DocumentTextIcon, label: 'Records' },
        { path: '/ai-predictor', icon: BeakerIcon, label: 'AI Predictor' },
        { path: '/analytics', icon: ChartBarIcon, label: 'Analytics' },
        { path: '/map', icon: MapIcon, label: 'Map' },
    ];

    if (hasRole('admin')) {
        navLinks.push({ path: '/admin', icon: UsersIcon, label: 'Admin' });
    }
    navLinks.push({ path: '/profile', icon: UserIcon, label: 'Profile' });

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Desktop Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
                scrolled 
                    ? 'bg-slate-900/90 backdrop-blur-xl border-b border-white/10 shadow-2xl' 
                    : 'bg-transparent'
            }`}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex items-center space-x-3 group">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                    <SparklesIcon className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                                VITALITY EYE
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                                        isActive(link.path)
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <link.icon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{link.label}</span>
                                </Link>
                            ))}
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center space-x-4">
                            {/* Alerts */}
                            <Link 
                                to="/alerts" 
                                className="relative p-2 rounded-xl hover:bg-white/5 transition-all duration-300 group"
                            >
                                <BellIcon className="h-5 w-5 text-gray-400 group-hover:text-white" />
                                {activeAlerts.length > 0 && (
                                    <>
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
                                            {activeAlerts.length}
                                        </span>
                                        <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping opacity-75" />
                                    </>
                                )}
                            </Link>

                            {/* Connection Status */}
                            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <div className={`relative w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`}>
                                    {connected && (
                                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                                    )}
                                </div>
                                <span className="text-xs text-gray-400">
                                    {connected ? 'Live' : 'Offline'}
                                </span>
                            </div>

                            {/* User Menu */}
                            <div className="hidden md:flex items-center space-x-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-xs text-purple-400">{user?.role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-xl hover:bg-red-500/10 transition-all duration-300 group"
                                >
                                    <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400 group-hover:text-red-400" />
                                </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-xl hover:bg-white/5 transition-all duration-300"
                            >
                                {mobileMenuOpen ? (
                                    <XMarkIcon className="h-6 w-6 text-white" />
                                ) : (
                                    <Bars3Icon className="h-6 w-6 text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            <div className={`fixed inset-0 z-40 md:hidden transition-all duration-500 ${
                mobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
            }`}>
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={() => setMobileMenuOpen(false)} />
                <div className={`relative z-10 flex flex-col h-full w-64 bg-gradient-to-b from-slate-900 to-purple-900 border-r border-white/10 transform transition-transform duration-500 ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <SparklesIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-purple-400">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 py-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-6 py-3 transition-all duration-300 ${
                                    isActive(link.path)
                                        ? 'bg-purple-500/20 text-purple-400 border-l-4 border-purple-500'
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
                            onClick={() => {
                                handleLogout();
                                setMobileMenuOpen(false);
                            }}
                            className="flex items-center space-x-3 text-gray-400 hover:text-red-400 transition-colors duration-300"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="h-16" />
        </>
    );
};

export default Navbar;