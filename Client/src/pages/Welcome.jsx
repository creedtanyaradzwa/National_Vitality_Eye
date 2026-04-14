import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChatBubbleLeftRightIcon
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
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: BoltIcon,
      title: 'Real-time Outbreak Alerts',
      description: 'Instant notifications when disease outbreaks are detected across Zimbabwe',
      gradient: 'from-pink-500 to-orange-500'
    },
    {
      icon: CloudArrowUpIcon,
      title: 'Offline-First Architecture',
      description: 'Works seamlessly even without internet connection in remote areas',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: MapIcon,
      title: 'Interactive Disease Map',
      description: 'Visualize disease distribution across all 10 provinces of Zimbabwe',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      icon: ChartBarIcon,
      title: 'Advanced Analytics',
      description: 'Comprehensive insights and predictive trends for public health decisions',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Enterprise Security',
      description: 'Role-based access with military-grade encryption and audit trails',
      gradient: 'from-indigo-500 to-purple-500'
    },
  ];

  const stats = [
    { value: '10+', label: 'Provinces Covered', icon: MapIcon, gradient: 'from-emerald-500 to-teal-500' },
    { value: '99.9%', label: 'Uptime Guaranteed', icon: BoltIcon, gradient: 'from-blue-500 to-cyan-500' },
    { value: '24/7', label: 'Real-time Monitoring', icon: ChartBarIcon, gradient: 'from-purple-500 to-pink-500' },
    { value: '256-bit', label: 'Bank-level Encryption', icon: LockClosedIcon, gradient: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Bar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? 'bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50 animate-pulse"></div>
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                National Vitality Eye
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="text-gray-300 hover:text-white transition-all duration-300 px-4 py-2 rounded-xl hover:bg-white/10"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="relative px-5 py-2 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 group"
              >
                <span className="flex items-center">
                  Get Started
                  <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-float">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
              <CpuChipIcon className="h-4 w-4 text-purple-400 animate-pulse" />
              <span className="text-sm text-gray-300">AI-Powered • Offline-First • Real-time</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
              National Vitality Eye
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Zimbabwe's first AI-powered national health system. Predict diseases, detect outbreaks, and manage patient care — even without internet.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="relative px-8 py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 group text-lg"
            >
              <span className="flex items-center">
                Start Free Trial
                <SparklesIcon className="h-5 w-5 ml-2 group-hover:rotate-12 transition-transform" />
              </span>
            </button>
            <button
              onClick={() => {
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 group text-lg"
            >
              <span className="flex items-center">
                Explore Features
                <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="group relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] hover:scale-105 transition-all duration-500">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-5 text-center">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <SparklesIcon className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-300">Revolutionary Technology</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Revolutionary Features
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage national health efficiently with cutting-edge AI technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="group relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] hover:scale-105 transition-all duration-500 cursor-pointer" onClick={() => navigate('/register')}>
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6 h-full">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Demo Section */}
      <section className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-purple-500/20 rounded-full px-4 py-2 mb-4">
                <CpuChipIcon className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-purple-400">AI in Action</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                See AI in Action
              </h2>
              <p className="text-gray-400 mb-6">
                Watch how our AI predicts diseases from symptoms in real-time, learns from every patient interaction, and gets smarter over time.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  '85%+ prediction accuracy',
                  'Real-time outbreak detection',
                  'Continuous learning from every record',
                  'Patient risk assessment',
                  'Treatment success prediction'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/register')}
                className="relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 group"
              >
                <span className="flex items-center">
                  Try AI Predictor Now
                  <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px]">
              <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-500 text-sm ml-2">AI Terminal</span>
                  <CpuChipIcon className="h-4 w-4 text-purple-400 ml-auto animate-pulse" />
                </div>
                <div className="space-y-2 font-mono text-sm">
                  <p className="text-purple-400"> Analyzing symptoms: fever, headache, chills...</p>
                  <p className="text-blue-400"> Matching with 1,247 similar cases</p>
                  <p className="text-pink-400"> Province prevalence: Harare (72% match)</p>
                  <p className="text-white font-bold mt-3"> Prediction: Malaria (87.5% confidence)</p>
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-yellow-400 animate-pulse"> Risk assessment: MODERATE (42 points)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto text-center px-4">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px]">
            <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Healthcare?
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Join the revolution in national health management. Experience the future of healthcare today.
              </p>
              <button
                onClick={() => navigate('/register')}
                className="relative px-8 py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 group text-lg"
              >
                <span className="flex items-center">
                  Get Started Now
                  <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ShieldCheckIcon className="h-5 w-5 text-purple-400" />
            <span className="text-gray-400 text-sm">National Vitality Eye</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 National Vitality Eye. All rights reserved. | AI-Powered Healthcare Intelligence
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;