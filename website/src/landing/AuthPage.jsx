import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User, AtSign, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOAuth = async (provider) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'signup') {
        const { error, data } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              username: formData.username,
            }
          }
        });
        if (error) throw error;
        
        // Supabase might require email verification, handle UI accordingly.
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
           throw new Error('Email already taken.');
        }

        setSuccessMsg('Account created successfully! You can now sign in.');
        setMode('signin');
        setFormData({ ...formData, password: '' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        // On success, App.js auth listener will pickup the session and route to dashboard.
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'signin' ? 'signup' : 'signin');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[160px] opacity-[0.1]" style={{ background: 'var(--accent-color)' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[140px] opacity-[0.08]" style={{ background: 'var(--accent-color)' }} />

      <Motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-[440px] p-8 md:p-10 rounded-3xl shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
      >
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 text-sm font-semibold flex items-center gap-2 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mt-10 mb-8 text-center">
          <h2 className="text-3xl font-black mb-2 tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'signin' ? 'Enter your details to access your dashboard.' : 'Start tracking your focus effortlessly.'}
          </p>
        </div>

        {/* Global Error/Success Feedback */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <Motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <div className="flex items-center gap-2 p-3 text-sm font-semibold rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertCircle size={16} /> {errorMsg}
              </div>
            </Motion.div>
          )}
          {successMsg && (
            <Motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <div className="flex items-center gap-2 p-3 text-sm font-semibold rounded-xl" style={{ background: 'var(--accent-color)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {mode === 'signup' && (
              <Motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-4"
              >
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><User size={16} /></div>
                  <input
                    type="text" name="name"
                    placeholder="Full Name"
                    value={formData.name} onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><AtSign size={16} /></div>
                  <input
                    type="text" name="username"
                    placeholder="Username"
                    value={formData.username} onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Mail size={16} /></div>
            <input
              type="email" name="email"
              placeholder="Email address"
              value={formData.email} onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
              style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Lock size={16} /></div>
            <input
              type="password" name="password"
              placeholder="Password"
              value={formData.password} onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
              style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--accent-color)', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
          >
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
        </div>

        <div className="mt-6">
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50"
            style={{ background: '#fff', color: '#1f1f1f', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <div className="mt-8 text-center text-sm font-medium">
          <span style={{ color: 'var(--text-secondary)' }}>
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button onClick={toggleMode} className="hover:underline outline-none" style={{ color: 'var(--accent-color)' }}>
            {mode === 'signin' ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </Motion.div>
    </div>
  );
};

export default AuthPage;
