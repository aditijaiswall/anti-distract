import { useState, useEffect, useRef } from 'react';
import { Shield, Activity, Palette, Headphones, ArrowRight, Zap, BarChart3, Timer, CheckCircle2, Star, ChevronRight, Bot } from 'lucide-react';
import { motion as Motion, useInView, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

/* ─── Google SVG Icon ─── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/* ─── GitHub SVG Icon ─── */
const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

/* ─── Animated Counter ─── */
const AnimatedCounter = ({ target, suffix = '', duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─── Floating Grid Background ─── */
const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: `
        linear-gradient(var(--border-color) 1px, transparent 1px),
        linear-gradient(90deg, var(--border-color) 1px, transparent 1px)
      `,
      backgroundSize: '64px 64px',
      opacity: 0.3,
      maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)',
    }} />
  </div>
);

/* ═══════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════ */
const LandingPage = ({ session }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  const features = [
    { icon: <Shield size={22} />, title: 'Zero-Willpower Extension Block', desc: 'ADHD taxes your impulse control. Our Chrome extension automatically intercepts and hard-redirects you away from Reddit and YouTube the second you start a session.' },
    { icon: <Bot size={22} />, title: 'Beat Executive Dysfunction', desc: 'Overwhelmed and paralyzed by massive goals? Your personal AI Coach breaks down huge objectives into bite-sized 25-minute tasks and builds your daily roadmap for you.' },
    { icon: <Headphones size={22} />, title: 'Sensory Regulation', desc: 'Drown out external chaos and trigger hyperfocus. Built-in Lofi, Rain, and Brown Noise get you strictly into the zone without opening another tab.' },
    { icon: <BarChart3 size={22} />, title: 'Visualize Your dopamine', desc: 'ADHD brains need immediate feedback. Cloud-synced analytics track your streaks, daily focus hours, and most fatal distractions so you can gamify your focus.' },
  ];



  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-[var(--accent-color)]/30 selection:text-white" style={{ background: 'var(--bg-color)' }}>
      <GridBackground />

      {/* ─── Ambient Glow Orbs ─── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[160px] opacity-[0.12]" style={{ background: 'var(--accent-color)' }} />
        <div className="absolute top-[10%] right-[-20%] w-[400px] h-[400px] rounded-full blur-[140px] opacity-[0.08]" style={{ background: 'var(--accent-color)' }} />
      </div>

      {/* ═══ STICKY NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'color-mix(in srgb, var(--bg-color) 80%, transparent)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border-color)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-color)' }}>
              <Zap size={16} color="#fff" strokeWidth={3} />
            </div>
            <span className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              AntiDistract
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <a href="#features" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>Features</a>
            <a href="#how-it-works" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>How It Works</a>
            <a href="#faq" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(session ? '/dashboard' : '/auth')}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--accent-color)', color: '#fff' }}
            >
              {session ? 'Open Dashboard' : 'Sign In'} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <Motion.main
        className="relative z-10 max-w-7xl mx-auto px-6 pt-32 md:pt-44"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Copy */}
          <Motion.section variants={item} className="max-w-2xl">
            {/* Pill badge */}
            <Motion.div
              variants={item}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
              style={{
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-secondary)',
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--accent-color)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent-color)' }} />
              </span>
              ADHD Productivity Toolkit
            </Motion.div>

            <Motion.h1
              variants={item}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-8"
              style={{ color: 'var(--text-primary)' }}
            >
              You don't lack willpower.{' '}
              <br />
              <span className="relative">
                <span style={{ color: 'var(--accent-color)' }}>
                  You lack the right environment.
                </span>
                <Motion.span
                  className="absolute -bottom-2 left-0 h-1 rounded-full"
                  style={{ background: 'var(--accent-color)', opacity: 0.4 }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
                />
              </span>
            </Motion.h1>

            <Motion.p
              variants={item}
              className="text-lg md:text-xl leading-relaxed mb-10 max-w-xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              AntiDistract intercepts your distractions at the source. A simple, powerful Chrome extension that forces you into hyperfocus exactly when you need it.
            </Motion.p>

            {/* Auth Buttons */}
            <Motion.div variants={item} className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={() => navigate(session ? '/dashboard' : '/auth')}
                className="group flex items-center justify-center gap-3 px-8 py-4 font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg"
                style={{
                  background: 'var(--accent-color)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
              >
                Reclaim Your Focus <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Motion.div>
            <Motion.p variants={item} className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              Sign in to sync your local extension data to the cloud. No credit card required.
            </Motion.p>
          </Motion.section>

          {/* Right: Floating UI Preview Cards */}
          <Motion.section variants={item} className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-[520px] aspect-square">
              {/* Large gradient backdrop */}
              <div className="absolute inset-8 rounded-3xl bg-gradient-to-br opacity-[0.06]" style={{ background: `linear-gradient(135deg, var(--accent-color), transparent)` }} />

              {/* Card 1: Focus Active */}
              <Motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[8%] right-[4%] w-[72%] rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-color)', opacity: 0.15 }}>
                    <Shield size={18} style={{ color: 'var(--accent-color)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Focus Mode Active</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>4 sites blocked · 47 min left</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--accent-color)' }} />
                </div>
                <div className="px-5 pb-4">
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                    <Motion.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--accent-color)' }}
                      initial={{ width: '0%' }}
                      animate={{ width: '72%' }}
                      transition={{ delay: 0.6, duration: 1.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </Motion.div>

              {/* Card 2: Timer */}
              <Motion.div
                animate={{ y: [0, 14, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                className="absolute bottom-[18%] left-[0%] w-[58%] p-5 rounded-2xl shadow-2xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <Timer size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Today's Focus</span>
                </div>
                <div className="text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  2h 47m
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 size={12} style={{ color: 'var(--accent-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--accent-color)' }}>Above daily average</span>
                </div>
              </Motion.div>

              {/* Card 3: Mini stat */}
              <Motion.div
                animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                className="absolute top-[55%] right-[2%] p-4 rounded-xl shadow-xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <Star size={14} style={{ color: '#fbbf24' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>5 day streak!</span>
                </div>
              </Motion.div>
            </div>
          </Motion.section>
        </div>



        {/* ═══ THE PROBLEM (ADHD Trap) ═══ */}
        <section className="py-16 md:py-24 mt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="text-center max-w-2xl mx-auto mb-16 px-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-color)' }}>The Cycle</p>
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Does this sound familiar?
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              You sit down to do one task. You open a new tab "just for a second." Three hours later, you're deep in a rabbit hole and your day is gone. Sound familiar? That's the ADHD tax.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 px-6">
            {[
              { emoji: '🫣', title: 'The "Just One Quick Peek" Trap', desc: 'Opening Twitter for 3 seconds turns into 45 minutes of mindless scrolling when you should be working.' },
              { emoji: '🌪️', title: 'Task Paralysis', desc: 'Looking at a massive goal and feeling so overwhelmed your brain physically refuses to start the first step.' },
              { emoji: '🪫', title: 'Dopamine Exhaustion', desc: 'End of the day hits and you realize you were "busy" for 8 hours but actually accomplished nothing of value.' },
            ].map((s, i) => (
              <Motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-8 rounded-2xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div className="text-4xl mb-4">{s.emoji}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </Motion.div>
            ))}
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section id="features" className="py-16 md:py-24">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-color)' }}>Features</p>
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Built for easily distracted brains.
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              Stop losing hours to YouTube algorithms and infinite scrolls. We give you all the tools required to lock in and execute.
            </p>
          </Motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <Motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-default overflow-hidden"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                {/* Hover gradient */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 6%, transparent), transparent)' }}
                />
                <div className="relative z-10 flex gap-5">
                  <div className="flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black transition-colors duration-300"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-color) 12%, transparent)',
                        color: 'var(--accent-color)',
                      }}
                    >
                      {f.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                  </div>
                </div>
              </Motion.div>
            ))}
          </div>
        </section>

        {/* ═══ AI COACH SPOTLIGHT ═══ */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="grid lg:grid-cols-2 gap-16 items-center px-6">
            <Motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-color)' }}>AI Study Coach</p>
              <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Bypass executive dysfunction completely.
              </h2>
              <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
                Tell the AntiDistract AI what your goal is (e.g., "Learn React" or "Write my thesis"). That's it. You don't have to plan.
              </p>
              <ul className="space-y-4">
                {[
                  'It breaks your massive terrifying goal into tiny 25-minute slices.',
                  'It schedules them onto your daily calendar automatically.',
                  'It accounts for your maximum daily focus limit so you do not burn out.',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>
                    <div className="mt-1" style={{ color: 'var(--accent-color)' }}><CheckCircle2 size={18} /></div>
                    {item}
                  </li>
                ))}
              </ul>
            </Motion.div>

            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative aspect-[4/3] rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col justify-center"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            >
              {/* Fake AI Chat UI */}
              <div className="flex flex-col gap-4">
                <div className="self-end max-w-[80%] p-4 rounded-t-xl rounded-bl-xl text-sm" style={{ background: 'var(--accent-color)', color: '#fff' }}>
                  I have an exam on machine learning next week and I haven't started. I'm so overwhelmed.
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--accent-color) 15%, transparent)' }}>
                    <Bot size={16} style={{ color: 'var(--accent-color)' }} />
                  </div>
                  <div className="flex-1 p-4 rounded-t-xl rounded-br-xl text-sm" style={{ background: 'color-mix(in srgb, var(--bg-color) 40%, transparent)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <p className="mb-3 font-semibold">I've got you. Let's break this down into zero-friction tasks:</p>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg border flex justify-between items-center bg-[var(--card-bg)]"><span>1. Intro to Gradients (25m)</span><span className="text-xs text-[var(--accent-color)]">Today</span></div>
                      <div className="p-3 rounded-lg border flex justify-between items-center bg-[var(--card-bg)]"><span>2. Cost Functions (25m)</span><span className="text-xs text-[var(--accent-color)]">Today</span></div>
                      <div className="p-3 rounded-lg border flex justify-between items-center bg-[var(--card-bg)]"><span>3. Backpropagation (25m)</span><span className="text-xs text-[var(--accent-color)]">Tomorrow</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </Motion.div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how-it-works" className="py-16 md:py-24">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-color)' }}>How It Works</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Three steps to flow state.
            </h2>
          </Motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Install the Chrome Extension', desc: 'Pin the AntiDistract extension to Chrome and blacklist the specific sites that always steal your dopamine.' },
              { step: '02', title: 'Bypass Executive Dysfunction', desc: "Tell the AI Coach your massive goal. It breaks it down and automatically schedules reasonable, bite-sized tasks onto your calendar." },
              { step: '03', title: 'Trigger Hyperfocus', desc: 'Hit start. Social media goes dark, brown noise kicks in, and your brain finally shifts gears into deep, uninterrupted work.' },
            ].map((s, i) => (
              <Motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative p-8 rounded-2xl text-center"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-black mb-6"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-color) 15%, transparent)',
                    color: 'var(--accent-color)',
                  }}
                >
                  {s.step}
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </Motion.div>
            ))}
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" className="py-16 md:py-24">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-color)' }}>FAQ</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Got questions?
            </h2>
          </Motion.div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: 'Is AntiDistract free?', a: 'Yes! The core extension and dashboard are free. Free users get 15 AI scans per day. Upgrade to Pro for 200 scans/day and priority AI models.' },
              { q: 'Does it work on browsers other than Chrome?', a: 'Currently, the extension is optimized for Chrome and Chromium-based browsers like Edge, Brave, and Arc.' },
              { q: 'Can I add my own background sounds?', a: 'We offer 6 curated built-in ambient sounds out-of-the-box. Custom sounds are coming in a future update.' },
              { q: 'Are my browsing habits private?', a: 'Absolute privacy is our guarantee. We only track the time you spend focusing and the frequency of blocks on domains you explicitly track.' },
              { q: 'What happens when I hit the free scan limit?', a: 'The AI monitor pauses for the rest of the day and shows you a friendly notice. Your manual site blocker keeps working without limits.' },
            ].map((faq, i) => (
              <Motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-6 md:px-8 rounded-2xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <details className="group [&_summary::-webkit-details-marker]:hidden cursor-pointer">
                  <summary className="flex items-center justify-between font-bold outline-none" style={{ color: 'var(--text-primary)' }}>
                    <span className="text-lg">{faq.q}</span>
                    <span className="transition duration-300 group-open:-rotate-180" style={{ color: 'var(--accent-color)' }}>
                      <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {faq.a}
                  </p>
                </details>
              </Motion.div>
            ))}
          </div>
        </section>



        {/* ═══ BOTTOM CTA ═══ */}
        <Motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative my-16 md:my-24 rounded-3xl overflow-hidden"
          style={{ border: '1px solid var(--border-color)' }}
        >
          {/* Gradient background */}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, 
              color-mix(in srgb, var(--accent-color) 8%, var(--card-bg)) 0%, 
              var(--card-bg) 50%, 
              color-mix(in srgb, var(--accent-color) 4%, var(--card-bg)) 100%
            )`,
          }} />
          {/* Glow orb */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full blur-[100px] opacity-20" style={{ background: 'var(--accent-color)' }} />

          <div className="relative z-10 px-8 py-16 md:py-24 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Ready to take your time back?
            </h2>
            <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
              Stop letting algorithms steal your attention. Sign up today and build the focus muscle you've always wanted. Let's get to work.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(session ? '/dashboard' : '/auth')}
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/30 overflow-hidden"
                style={{ background: 'var(--accent-color)', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
              >
                Get Started For Free <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </Motion.section>

        {/* ═══ FOOTER ═══ */}
        <footer className="py-12 text-center" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-color)' }}>
              <Zap size={12} color="#fff" strokeWidth={3} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AntiDistract</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
            Built with focus. © {new Date().getFullYear()} AntiDistract. All rights reserved.
          </p>
        </footer>
      </Motion.main>
    </div>
  );
};

export default LandingPage;
