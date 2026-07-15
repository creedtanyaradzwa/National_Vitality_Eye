import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon, BeakerIcon, MapIcon,
  BoltIcon, UserGroupIcon, LockClosedIcon, ArrowRightIcon,
  CpuChipIcon, SparklesIcon, HeartIcon, BellAlertIcon,
  DocumentTextIcon, GlobeAltIcon, CheckCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

const FEATURES = [
  {
    icon: BeakerIcon, color: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'bg-cyan-500/5', accent: 'from-cyan-500/20',
    tag: 'AI Engine v5.0', num: '01',
    title: 'Pre-trained EDLIZ Baseline',
    desc: 'Operational from day one. Pre-seeded with 120 diseases from Zimbabwe\'s Essential Drugs List — symptoms, vital sign ranges, ICD-11 codes, and treatment protocols before a single patient record exists.',
    highlights: ['120 EDLIZ diseases', 'ICD-11 coded', 'Zero cold-start'],
  },
  {
    icon: BoltIcon, color: 'text-purple-400', border: 'border-purple-500/20', glow: 'bg-purple-500/5', accent: 'from-purple-500/20',
    tag: 'Surveillance Engine', num: '02',
    title: 'Province-Level Outbreak Detection',
    desc: 'Dual-tier detection runs province by province. Zero-tolerance pathogens trigger instant CONFIRMED alerts. Statistical diseases use 8-week rolling Z-score analysis with environmental and citizen signal multipliers.',
    highlights: ['Zero-tolerance pathogens', 'Z-score analysis', 'WebSocket broadcast'],
  },
  {
    icon: HeartIcon, color: 'text-red-400', border: 'border-red-500/20', glow: 'bg-red-500/5', accent: 'from-red-500/20',
    tag: 'NEWS2 Triage', num: '03',
    title: 'Automated Clinical Triage',
    desc: 'NEWS2 (National Early Warning Score 2) runs automatically on every saved record — scoring respiratory rate, SpO₂, temperature, BP, and heart rate. Shock index detection triggers fluid resuscitation alerts.',
    highlights: ['Auto-scored vitals', 'Shock index detection', 'RCP standard'],
  },
  {
    icon: MapIcon, color: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'bg-emerald-500/5', accent: 'from-emerald-500/20',
    tag: 'Analytics Dashboard', num: '04',
    title: 'Real-time Provincial Intelligence',
    desc: 'Interactive map of all 10 Zimbabwe provinces. Disease prevalence, 30-day growth rates, outcome rates, hotspot detection, and AI-driven 3-month projections — updating live as records are saved.',
    highlights: ['10-province map', 'Live projections', 'Hotspot detection'],
  },
  {
    icon: SparklesIcon, color: 'text-amber-400', border: 'border-amber-500/20', glow: 'bg-amber-500/5', accent: 'from-amber-500/20',
    tag: '9-Factor Model', num: '05',
    title: 'Multi-Dimensional Prediction',
    desc: 'Symptom matching, province prevalence, seasonal patterns, age, gender, risk factors, vital sign variance, chronic conditions, and family history — all weighted and confidence-calibrated.',
    highlights: ['9 weighted factors', 'Confidence scores', 'Patient-linked context'],
  },
  {
    icon: UserGroupIcon, color: 'text-blue-400', border: 'border-blue-500/20', glow: 'bg-blue-500/5', accent: 'from-blue-500/20',
    tag: 'Patient Portal', num: '06',
    title: 'Secure Self-Service Portal',
    desc: 'Separate authentication domain. Patients access full medical history, AI health score, vitals anomaly detection, medication reminders, symptom checker, and anonymous community surveillance reporting.',
    highlights: ['Isolated auth domain', 'AI health score', 'Anonymous reporting'],
  },
  {
    icon: ClipboardDocumentListIcon, color: 'text-pink-400', border: 'border-pink-500/20', glow: 'bg-pink-500/5', accent: 'from-pink-500/20',
    tag: 'Clinical Workflow', num: '07',
    title: 'Complete EHR + Handovers',
    desc: 'Full visit documentation — physical exam by body system, lab tests, radiology with image upload, IV fluid tracking, referrals, and discharge summaries. Shift handover module for morning, afternoon, and night transfers.',
    highlights: ['Full EHR', 'Image uploads', 'Shift handovers'],
  },
  {
    icon: LockClosedIcon, color: 'text-slate-400', border: 'border-slate-500/20', glow: 'bg-slate-500/5', accent: 'from-slate-500/20',
    tag: 'Security', num: '08',
    title: 'Query-Level Data Scoping',
    desc: 'Six staff roles with permissions enforced at the MongoDB query level — not just the UI. Staff see only records they created or were tagged in. Confidential records excluded at the database level.',
    highlights: ['6 RBAC roles', 'DB-level scoping', 'Doc-verified onboarding'],
  },
];

const PROVINCES = ['Harare','Bulawayo','Manicaland','Mashonaland Central','Mashonaland East','Mashonaland West','Masvingo','Matabeleland North','Matabeleland South','Midlands'];

const STATS = [
  { value: '120', label: 'EDLIZ Diseases', sub: 'Pre-trained baseline', icon: BeakerIcon, color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  { value: '10', label: 'Provinces', sub: 'Province-isolated detection', icon: MapIcon, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  { value: 'NEWS2', label: 'Triage Standard', sub: 'Royal College of Physicians', icon: HeartIcon, color: 'text-red-400', glow: 'shadow-red-500/20' },
  { value: '6', label: 'Staff Roles', sub: 'Query-level RBAC', icon: ShieldCheckIcon, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
];

const DISEASE_BADGES = ['Malaria','Cholera','Tuberculosis','COVID-19','Typhoid','HIV','Mpox','Pneumonia','Measles','Ebola'];

const PIPELINE_STEPS = [
  { n:'01', icon: DocumentTextIcon, color:'text-cyan-400', ring:'border-cyan-500/30', title:'Record Created', desc:'Clinician saves a visit — vitals, diagnosis, symptoms, and treatment plan.' },
  { n:'02', icon: CpuChipIcon, color:'text-purple-400', ring:'border-purple-500/30', title:'AI Learns', desc:'ContinuousLearner v5.0 instantly updates disease patterns and epidemiological counters.' },
  { n:'03', icon: BellAlertIcon, color:'text-red-400', ring:'border-red-500/30', title:'Outbreak Check', desc:'OutbreakDetector evaluates the province. Zero-tolerance pathogens alert immediately; others go through Z-score analysis.' },
  { n:'04', icon: GlobeAltIcon, color:'text-emerald-400', ring:'border-emerald-500/30', title:'Broadcast', desc:'CONFIRMED alerts push to all connected staff via WebSocket with EDLIZ protocols and prevention recommendations.' },
];

// ── Animated counter hook ────────────────────────────────────────────────────
function useCounter(end, duration = 1400, trigger = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger || isNaN(Number(end))) return;
    const target = Number(end);
    const step = Math.ceil(target / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, trigger]);
  return count;
}

// ── Stat card with animated counter ────────────────────────────────────────
function StatCard({ stat, visible }) {
  const numeric = !isNaN(Number(stat.value));
  const count = useCounter(numeric ? Number(stat.value) : 0, 1400, visible && numeric);
  return (
    <div className={`relative bg-brand-dark-900/70 border border-white/5 rounded-2xl p-6 text-center hover:border-white/10 hover:shadow-lg ${stat.glow} transition-all duration-300 group overflow-hidden`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${stat.glowRgb || 'rgba(6,182,212,0.06)'} 0%, transparent 70%)` }} />
      <div className="relative">
        <div className="w-11 h-11 rounded-xl bg-brand-dark-950 border border-white/5 flex items-center justify-center mx-auto mb-4">
          <stat.icon className={`h-5 w-5 ${stat.color}`} />
        </div>
        <p className={`text-3xl font-black tracking-tighter mb-1 ${stat.color}`}>
          {numeric ? count : stat.value}
        </p>
        <p className="text-xs font-black text-white uppercase tracking-tight">{stat.label}</p>
        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">{stat.sub}</p>
      </div>
    </div>
  );
}

const Welcome = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);
  const featuresRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Trigger stat counters when the stats grid scrolls into view
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark-950 text-gray-200 selection:bg-cyan-500/30 selection:text-white overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-brand-dark-900/95 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl bg-cyan-500/25 blur-lg" />
              <div className="relative w-10 h-10 rounded-xl bg-brand-dark-900 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.15)]">
                <GlobeAltIcon className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tighter leading-none">National Vitality Eye</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Zimbabwe Health Intelligence</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#pipeline' },
              { label: 'Portals', href: '#portals' },
            ].map(l => (
              <a key={l.label} href={l.href}
                className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/patient/login')}
              className="hidden sm:flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white border border-white/5 hover:border-white/15 transition-all">
              Patient Portal
            </button>
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white border border-white/5 hover:border-white/15 transition-all">
              Staff Login
            </button>
            <button onClick={() => navigate('/register')}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] transition-all">
              Register Facility
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Layered ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-5%] left-[-15%] w-[60%] h-[60%] bg-cyan-500/5 blur-[160px] rounded-full" />
          <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[55%] bg-blue-600/7 blur-[160px] rounded-full" />
          <div className="absolute top-[35%] left-[25%] w-[35%] h-[35%] bg-purple-500/4 blur-[120px] rounded-full" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.018]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
          {/* Top radial vignette */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-brand-dark-950 to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">

          {/* Live status badge */}
          <div className="inline-flex items-center gap-3 bg-brand-dark-900/70 backdrop-blur-xl border border-white/8 rounded-full px-5 py-2.5 mb-12 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-400">
              Clinical Intelligence System · v5.0 · Live
            </span>
            <span className="hidden sm:flex items-center gap-1.5 pl-3 ml-1 border-l border-white/10">
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">EDLIZ 2024/2025</span>
            </span>
          </div>

          {/* Main heading */}
          <div className="mb-8">
            <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-black tracking-[-0.04em] leading-[0.88] mb-0">
              <span className="text-white">NATIONAL</span>
            </h1>
            <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-black tracking-[-0.04em] leading-[0.88]">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
                VITALITY EYE
              </span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto mb-4 font-medium leading-relaxed">
            Zimbabwe's sovereign AI-powered health intelligence platform — integrating electronic health records,
            real-time disease surveillance, clinical decision support, and a secure patient portal
            purpose-built for Zimbabwe's ten provinces.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mb-12 text-sm font-semibold">
            <span className="text-gray-600">Pre-trained on</span>
            <span className="text-amber-400">EDLIZ 2024/2025</span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-500">WHO ICD-11</span>
            <span className="text-gray-700">·</span>
            <span className="text-cyan-400">NEWS2 Triage Standard</span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-500">Zimbabwe AI Strategy 2026–2030</span>
          </div>

          {/* CTA group */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-16">
            <button onClick={() => navigate('/register')}
              className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(6,182,212,0.2)] hover:shadow-[0_0_60px_rgba(6,182,212,0.4)] transition-all duration-300 overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Register Your Facility</span>
              <ArrowRightIcon className="relative h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <button onClick={() => navigate('/patient/login')}
              className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-brand-dark-900 border border-white/8 text-white font-black text-sm uppercase tracking-widest hover:border-cyan-500/30 hover:bg-brand-dark-800 transition-all duration-300">
              <UserGroupIcon className="h-4 w-4 text-cyan-400" />
              Patient Access
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-brand-dark-900 border border-white/8 text-gray-300 font-black text-sm uppercase tracking-widest hover:border-white/15 hover:bg-brand-dark-800 transition-all duration-300">
              <ShieldCheckIcon className="h-4 w-4 text-gray-500" />
              Staff Login
            </button>
          </div>

          {/* Disease coverage badges */}
          <div className="mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-gray-700 mb-4">
              120 pre-trained diseases — sample coverage
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {DISEASE_BADGES.map(d => (
                <span key={d} className="px-3 py-1.5 rounded-full bg-brand-dark-900/80 border border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-300 hover:border-white/10 transition-all cursor-default">
                  {d}
                </span>
              ))}
              <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[10px] font-bold text-cyan-500 uppercase tracking-wider">
                +110 more
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Explore</span>
          <div className="w-px h-10 bg-gradient-to-b from-gray-500 to-transparent" />
        </div>
      </section>

      {/* ── PROVINCE STRIP ───────────────────────────────────────── */}
      <section className="py-10 bg-brand-dark-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 text-center mb-6">
            Deployed across all 10 provinces of Zimbabwe
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {PROVINCES.map(p => (
              <div key={p} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-dark-950 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 transition-all duration-300 group cursor-default">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-300 transition-colors">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEY METRICS ──────────────────────────────────────────── */}
      <section ref={statsRef} className="py-16 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <StatCard key={i} stat={s} visible={statsVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section ref={featuresRef} id="features" className="py-28 relative">
        {/* Section ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-blue-600/3 blur-[180px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-600 mb-4">
              Platform Capabilities
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-[-0.03em] mb-5">
              Built for<br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
                Zimbabwe's Healthcare Reality
              </span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed font-medium">
              Every module was designed around Zimbabwe's operational public-health context —
              paper-to-digital transition, multi-facility coordination, and real-time outbreak containment.
            </p>
          </div>

          {/* Feature cards — 4-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i}
                className={`relative rounded-2xl ${f.glow} border ${f.border} p-6 cursor-default group
                  hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}
                onMouseEnter={() => setActiveFeature(i)}
                onMouseLeave={() => setActiveFeature(null)}
              >
                {/* Hover top-gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${f.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Tag + number row */}
                <div className="flex items-center justify-between mb-5">
                  <span className="px-2.5 py-1 rounded-full bg-brand-dark-950/80 border border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-600">
                    {f.tag}
                  </span>
                  <span className="text-[10px] font-black text-gray-800 tabular-nums">{f.num}</span>
                </div>

                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-brand-dark-950 border border-white/5 group-hover:border-white/10 flex items-center justify-center mb-5 transition-all duration-300">
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>

                {/* Text */}
                <h3 className="text-[13px] font-black text-white uppercase tracking-tight mb-3 leading-tight">{f.title}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-medium mb-5">{f.desc}</p>

                {/* Highlights */}
                <div className="pt-4 border-t border-white/5 space-y-1.5">
                  {f.highlights.map(h => (
                    <div key={h} className="flex items-center gap-2">
                      <CheckCircleIcon className={`h-3 w-3 ${f.color} flex-shrink-0`} />
                      <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DATA PIPELINE ────────────────────────────────────────── */}
      <section id="pipeline" className="py-28 bg-brand-dark-900/40 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4">
              Data Pipeline
            </p>
            <h2 className="text-4xl font-black text-white tracking-[-0.03em] mb-4">
              From Clinic to
              <span className="text-cyan-400"> National Intelligence</span>
            </h2>
            <p className="text-gray-500 text-sm font-medium max-w-xl mx-auto">
              Every record saved at any facility triggers a chain of automated analysis that flows from bedside to nationwide surveillance in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-[38px] left-[calc(12.5%)] right-[calc(12.5%)] h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

            {PIPELINE_STEPS.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center px-5 group">
                {/* Step icon */}
                <div className={`relative z-10 w-[76px] h-[76px] rounded-2xl bg-brand-dark-950 border ${step.ring} flex items-center justify-center mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-300`}>
                  <step.icon className={`h-7 w-7 ${step.color}`} />
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-brand-dark-900 border border-white/10 text-[9px] font-black text-gray-500 flex items-center justify-center">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2">{step.title}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TWO-PORTAL SECTION ───────────────────────────────────── */}
      <section id="portals" className="py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4">Access</p>
            <h2 className="text-4xl font-black text-white tracking-[-0.03em] mb-4">
              Two Portals.{' '}
              <span className="text-gray-600">One Platform.</span>
            </h2>
            <p className="text-gray-500 font-medium text-sm max-w-xl mx-auto">
              Clinical staff and patients operate on completely separate, secured authentication domains with distinct permission models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ── Staff card */}
            <div className="relative rounded-3xl overflow-hidden border border-cyan-500/20 group">
              {/* Card background */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-blue-600/4 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center gap-4 mb-7">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <ShieldCheckIcon className="h-7 w-7 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500 mb-1">For Clinicians & Administrators</p>
                    <h3 className="text-xl font-black text-white tracking-tight">Staff Portal</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-8">
                  {[
                    'Patient management & EHR',
                    'Real-time outbreak alerts',
                    'AI disease prediction',
                    'Province-level analytics',
                    'NEWS2 triage scoring',
                    'Shift handover module',
                    'Radiology & lab uploads',
                    'Document-verified access',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-cyan-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-gray-400 font-medium leading-tight">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate('/login')}
                    className="flex-1 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-black text-[11px] uppercase tracking-widest hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300">
                    Staff Login
                  </button>
                  <button onClick={() => navigate('/register')}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[11px] uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] transition-all duration-300">
                    Register Facility
                  </button>
                </div>
              </div>
            </div>

            {/* ── Patient card */}
            <div className="relative rounded-3xl overflow-hidden border border-purple-500/20 group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-pink-600/4 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center gap-4 mb-7">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                    <UserGroupIcon className="h-7 w-7 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-500 mb-1">For Patients & Citizens</p>
                    <h3 className="text-xl font-black text-white tracking-tight">Patient Portal</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-8">
                  {[
                    'Full medical history access',
                    'AI health score & insights',
                    'Vital signs trend charts',
                    'Vitals anomaly detection',
                    'Medication reminders',
                    'AI symptom checker',
                    'Trusted provider list',
                    'Anonymous community reporting',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-gray-400 font-medium leading-tight">{item}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => navigate('/patient/login')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black text-[11px] uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] transition-all duration-300">
                  Access Patient Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE TRUST BAR ─────────────────────────────────── */}
      <section className="py-12 bg-brand-dark-900/40 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-700 text-center mb-6">
            Clinical &amp; Regulatory Standards
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'EDLIZ 2024/2025', color: 'text-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
              { label: 'WHO ICD-11', color: 'text-cyan-500', border: 'border-cyan-500/20', bg: 'bg-cyan-500/5' },
              { label: 'NEWS2 Standard', color: 'text-red-500', border: 'border-red-500/20', bg: 'bg-red-500/5' },
              { label: 'Zimbabwe AI Strategy 2026–2030', color: 'text-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
              { label: 'MOH Zimbabwe', color: 'text-blue-500', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
            ].map(b => (
              <div key={b.label} className={`flex items-center gap-2 px-4 py-2 rounded-full ${b.bg} border ${b.border}`}>
                <CheckCircleIcon className={`h-3.5 w-3.5 ${b.color}`} />
                <span className={`text-[10px] font-black uppercase tracking-wider ${b.color}`}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="py-12 bg-brand-dark-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-xl bg-cyan-500/15 blur-md" />
                <div className="relative w-8 h-8 rounded-xl bg-brand-dark-900 border border-cyan-500/25 flex items-center justify-center">
                  <GlobeAltIcon className="h-4 w-4 text-cyan-500/70" />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">National Vitality Eye</p>
                <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">© 2026 Zimbabwe Health Intelligence System</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-5">
              <button onClick={() => navigate('/login')} className="text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-gray-400 transition-colors">Staff Login</button>
              <button onClick={() => navigate('/patient/login')} className="text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-gray-400 transition-colors">Patient Portal</button>
              <button onClick={() => navigate('/register')} className="text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-gray-400 transition-colors">Register</button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-dark-900 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
