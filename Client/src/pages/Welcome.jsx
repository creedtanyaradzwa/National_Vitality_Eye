import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRightIcon, 
  ShieldCheckIcon, 
  BeakerIcon, 
  MapIcon, 
  ChartBarIcon,
  BoltIcon,
  CloudArrowUpIcon,
  UserGroupIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  SparklesIcon,
  CpuChipIcon,
  LockClosedIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  CircleStackIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

const Welcome = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: BeakerIcon,
      title: 'AI Disease Predictor',
      description: 'Advanced AI that predicts diseases from symptoms with 85%+ accuracy',
      color: 'text-cyber-blue',
      glow: 'shadow-cyber-blue/20'
    },
    {
      icon: BoltIcon,
      title: 'Real-time Outbreak Alerts',
      description: 'Instant notifications when disease outbreaks are detected across Zimbabwe',
      color: 'text-cyber-purple',
      glow: 'shadow-cyber-purple/20'
    },
    {
      icon: CloudArrowUpIcon,
      title: 'Offline-First Architecture',
      description: 'Works seamlessly even without internet connection in remote areas',
      color: 'text-cyber-green',
      glow: 'shadow-cyber-green/20'
    },
    {
      icon: MapIcon,
      title: 'Interactive Disease Map',
      description: 'Visualize disease distribution across all 10 provinces of Zimbabwe',
      color: 'text-cyber-pink',
      glow: 'shadow-cyber-pink/20'
    },
    {
      icon: ChartBarIcon,
      title: 'Advanced Analytics',
      description: 'Comprehensive insights and predictive trends for public health decisions',
      color: 'text-cyber-blue',
      glow: 'shadow-cyber-blue/20'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Enterprise Security',
      description: 'Role-based access with military-grade encryption and audit trails',
      color: 'text-cyber-purple',
      glow: 'shadow-cyber-purple/20'
    },
  ];

  const stats = [
    { value: '10+', label: 'Provinces Covered', icon: MapIcon, color: 'text-cyber-blue' },
    { value: '99.9%', label: 'Uptime Guaranteed', icon: BoltIcon, color: 'text-cyber-green' },
    { value: '24/7', label: 'Real-time Monitoring', icon: ChartBarIcon, color: 'text-cyber-purple' },
    { value: '256-bit', label: 'Military Encryption', icon: LockClosedIcon, color: 'text-cyber-pink' },
  ];

  return (
    <div className="min-h-screen bg-brand-dark-950 text-gray-200 selection:bg-cyber-blue/30 selection:text-white">
      {/* Navigation Bar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-brand-dark-900/90 backdrop-blur-xl border-b border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-cyber-blue blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-dark-800 to-brand-dark-950 border border-cyber-blue/30 flex items-center justify-center">
                  <ShieldCheckIcon className="h-6 w-6 text-cyber-blue" />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-cyber-blue bg-clip-text text-transparent">
                VITALITY<span className="text-cyber-blue">EYE</span>
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/login')}
                className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 hover:text-white transition-all duration-300"
              >
                Access Portal
              </button>
              <button
                onClick={() => navigate('/register')}
                className="btn-primary-modern py-2.5 px-6 text-[10px] uppercase tracking-[0.2em] font-bold"
              >
                Initialize Node
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Futuristic Background Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[-5%] w-[40%] h-[40%] bg-cyber-purple/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-cyber-blue/10 blur-[120px] rounded-full animate-pulse delay-700" />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" 
               style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-3 bg-brand-dark-900/50 backdrop-blur-md border border-white/5 rounded-full px-5 py-2 mb-10 shadow-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-green"></span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400">Clinical Intelligence Node v3.0</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter">
            <span className="text-white">NATIONAL</span><br/>
            <span className="bg-gradient-to-r from-cyber-blue via-white to-cyber-purple bg-clip-text text-transparent">
              VITALITY EYE
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed uppercase tracking-wide">
            Zimbabwe's Decentralized AI Health Infrastructure. <br/>
            <span className="text-gray-400">Predict. Analyze. Protect.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary-modern px-10 py-5 text-xs uppercase tracking-[0.3em] font-bold group"
            >
              <span className="flex items-center">
                Initiate Registration
                <CommandLineIcon className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              onClick={() => {
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-10 py-5 rounded-2xl bg-brand-dark-900 border border-white/5 text-white font-bold text-xs uppercase tracking-[0.3em] hover:bg-brand-dark-800 transition-all duration-300 backdrop-blur-xl group shadow-2xl"
            >
              <span className="flex items-center">
                System Specs
                <ArrowRightIcon className="h-4 w-4 ml-3 group-hover:translate-x-1 transition-transform opacity-50" />
              </span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-24">
            {stats.map((stat, idx) => (
              <div key={idx} className="glass-card-modern p-6 text-center border border-white/5 group">
                <div className={`w-10 h-10 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-4 group-hover:border-cyber-blue/30 transition-all duration-500 shadow-2xl`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-white tracking-tighter mb-1">{stat.value}</p>
                <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative bg-brand-dark-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl text-left">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-purple animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-500">Core Modules</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                REVOLUTIONARY <br/>
                <span className="text-cyber-purple">HEALTH INTELLIGENCE</span>
              </h2>
            </div>
            <p className="text-gray-500 font-medium text-sm max-w-sm text-left border-l border-white/10 pl-8">
              Everything required for national health governance, powered by decentralized clinical logic and real-time biometric telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="stat-card group hover:scale-[1.02] transition-all duration-500 cursor-default">
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mb-8 shadow-2xl group-hover:border-cyber-blue/20 transition-colors`}>
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 tracking-tight uppercase tracking-[0.1em]">{feature.title}</h3>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed">{feature.description}</p>
                  
                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">Protocol 0{idx + 1}</span>
                    <div className="w-1 h-1 rounded-full bg-brand-dark-800" />
                  </div>
                </div>
                
                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent h-1/2 w-full -translate-y-full group-hover:animate-[scan_3s_linear_infinite]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-brand-dark-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-5 w-5 text-gray-700" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-700">© 2026 Clinical Intelligence Node</span>
            </div>
            <div className="flex space-x-8">
              {['Security', 'Privacy', 'Compliance', 'API'].map((link) => (
                <a key={link} href="#" className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-700 hover:text-cyber-blue transition-colors">{link}</a>
              ))}
            </div>
            <div className="px-4 py-1.5 rounded-full bg-brand-dark-900 border border-white/5 flex items-center space-x-3">
              <span className="w-1 h-1 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest font-bold text-gray-600">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
