import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Palette, User, Shield, Check, X, Crown, Zap, ExternalLink, Brain } from 'lucide-react';
import useExtensionTheme from '../../hooks/useExtensionTheme';
import useSubscription from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabaseClient';
import { useLocation } from 'react-router-dom';

// Read Polar checkout URLs from env (set in .env.local)
const POLAR_FREE_URL = null; // No checkout needed for free
const POLAR_PRO_URL = import.meta.env.VITE_POLAR_PRO_CHECKOUT_URL || '#';

const SettingsPage = ({ user }) => {
  const { activeTheme, setExtensionTheme } = useExtensionTheme();
  const { tier, isPro, scansUsed, scansRemaining, scanLimit, usagePercent, loading: subLoading } = useSubscription(user);
  const location = useLocation();

  // Determine initial tab from URL param (?tab=billing)
  const params = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(params.get('tab') || 'appearance');

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.user_metadata?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Study Profile state
  const [studyProfile, setStudyProfile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    daily_focus_hours: 3,
    peak_time: 'morning',
    focus_level: 'intermediate',
    study_style: 'structured',
  });

  useEffect(() => {
    if (user && activeTab === 'study-profile') loadStudyProfile();
  }, [user, activeTab]);

  const loadStudyProfile = async () => {
    const { data } = await supabase.from('user_study_profiles').select('*').eq('id', user.id).single();
    if (data) {
      setStudyProfile(data);
      setProfileForm({
        daily_focus_hours: data.daily_focus_hours,
        peak_time: data.peak_time,
        focus_level: data.focus_level,
        study_style: data.study_style,
      });
    }
  };

  const saveStudyProfile = async () => {
    setProfileSaving(true);
    await supabase.from('user_study_profiles').upsert({ id: user.id, ...profileForm }, { onConflict: 'id' });
    setStudyProfile(profileForm);
    setProfileSaving(false);
  };

  // Payment success toast (Webhook handles the actual DB upgrade securely behind the scenes)
  const [paymentSuccess, setPaymentSuccess] = useState(params.get('payment') === 'success');
  useEffect(() => {
    if (paymentSuccess) {
      const t = setTimeout(() => {
        setPaymentSuccess(false);
        // Clear param from URL
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [paymentSuccess]);

  const handleSaveProfile = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: newName } });
    if (!error) setIsEditing(false);
    else console.error('Error updating profile:', error);
    setIsSaving(false);
  };

  const barColor = usagePercent < 70 ? 'var(--accent-color)' : usagePercent < 90 ? '#f59e0b' : '#ef4444';

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'account', label: 'Account', icon: <User size={16} /> },
    { id: 'study-profile', label: 'Study Profile', icon: <Brain size={16} /> },
    { id: 'billing', label: 'Billing', icon: <Crown size={16} /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <header className='mb-8'>
        <h1 className='text-4xl font-black mb-2'>Settings</h1>
        <p className='text-secondary'>Manage your account, theme preferences, and subscription.</p>
      </header>

      {/* Payment success toast */}
      {paymentSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6 p-4 rounded-2xl border flex items-center gap-3'
          style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, var(--card-bg))', borderColor: 'color-mix(in srgb, var(--accent-color) 30%, transparent)' }}
        >
          <Crown size={18} style={{ color: '#f59e0b' }} />
          <div>
            <p className='font-bold text-sm'>Welcome to Pro! 🎉</p>
            <p className='text-xs text-secondary'>You now have 200 AI scans per day. The extension will sync automatically.</p>
          </div>
        </motion.div>
      )}

      {/* Tab Bar */}
      <div className='flex gap-2 mb-8 p-1 rounded-2xl border border-border w-fit' style={{ background: 'var(--card-bg)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className='flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200'
            style={activeTab === tab.id
              ? { background: 'var(--accent-color)', color: '#fff' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Appearance Tab ── */}
      {activeTab === 'appearance' && (
        <div className='p-6 rounded-2xl border border-border bg-card max-w-lg'>
          <h3 className='text-lg font-bold mb-4 flex items-center gap-2'><Palette size={18} className='text-accent' /> Appearance</h3>
          <p className='text-sm text-secondary mb-4'>Personalize your dashboard with custom color themes.</p>
          <div className='grid grid-cols-3 gap-2'>
            {[
              { id: 'default', label: 'Dark Mode' },
              { id: 'navy', label: 'Navy Blue' },
              { id: 'forest', label: 'Forest' },
              { id: 'monochrome', label: 'Monochrome' },
              { id: 'warm', label: 'Warm' },
              { id: 'purple', label: 'Deep Purple' }
            ].map(t => {
              const isActive = activeTheme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setExtensionTheme(t.id)}
                  className={`p-3 rounded-lg border text-[10px] font-bold text-center cursor-pointer transition-all duration-200 ${isActive
                    ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent scale-105'
                    : 'border-border hover:border-accent/50 text-primary'
                    }`}
                >
                  {t.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Account Tab ── */}
      {activeTab === 'account' && (
        <div className='p-6 rounded-2xl border border-border bg-card max-w-lg'>
          <h3 className='text-lg font-bold mb-4 flex items-center gap-2'><User size={18} className='text-accent' /> Account</h3>
          {!isEditing ? (
            <div className='flex flex-col gap-4'>
              <div className='flex items-center gap-3 mt-2'>
                <div className='w-12 h-12 rounded-full bg-accent text-card flex items-center justify-center font-bold text-lg' style={{ background: 'var(--accent-color)', color: '#fff' }}>
                  {(user?.user_metadata?.display_name || user?.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className='font-bold text-primary text-lg'>{user?.user_metadata?.display_name || 'No Name Set'}</p>
                  <p className='text-sm text-secondary'>{user?.email}</p>
                </div>
              </div>
              <button onClick={() => setIsEditing(true)} className='mt-2 px-4 py-2 w-max rounded-xl bg-white/5 border border-border text-xs font-bold hover:bg-white/10 transition-colors'>
                Edit Profile
              </button>
            </div>
          ) : (
            <div className='flex flex-col gap-3 mt-4'>
              <p className='text-xs font-bold text-secondary uppercase tracking-wider'>Display Name</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className='bg-timer-bg border border-border rounded-xl p-3 text-sm text-primary max-w-[250px] focus:outline-none focus:border-accent'
                placeholder='Enter display name'
                autoFocus
              />
              <div className='flex gap-2 mt-2'>
                <button onClick={handleSaveProfile} disabled={isSaving} className='px-4 py-2 flex items-center gap-2 rounded-xl bg-accent text-card text-xs font-bold hover:opacity-90 transition-opacity' style={{ background: 'var(--accent-color)', color: '#fff' }}>
                  {isSaving ? 'Saving...' : <><Check size={14} /> Save</>}
                </button>
                <button onClick={() => setIsEditing(false)} disabled={isSaving} className='px-4 py-2 rounded-xl bg-white/5 border border-border text-xs font-bold hover:bg-white/10 transition-colors'>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Study Profile Tab ── */}
      {activeTab === 'study-profile' && (
        <div className='p-6 rounded-2xl border border-border bg-card max-w-lg' style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <h3 className='text-lg font-bold mb-1 flex items-center gap-2'><Brain size={18} style={{ color: 'var(--accent-color)' }} /> Study Profile</h3>
          <p className='text-xs mb-6' style={{ color: 'var(--text-secondary)' }}>Your AI Coach uses this to schedule tasks mindfully.</p>

          <div className='space-y-5'>
            <div>
              <label className='text-[10px] font-black uppercase tracking-widest block mb-2' style={{ color: 'var(--text-secondary)' }}>Daily Focus Hours</label>
              <div className='flex items-center gap-3'>
                <input type='range' min={1} max={8} value={profileForm.daily_focus_hours} onChange={(e) => setProfileForm({ ...profileForm, daily_focus_hours: parseInt(e.target.value) })} className='flex-1' style={{ accentColor: 'var(--accent-color)' }} />
                <span className='text-sm font-black w-8' style={{ color: 'var(--accent-color)' }}>{profileForm.daily_focus_hours}h</span>
              </div>
            </div>

            <div>
              <label className='text-[10px] font-black uppercase tracking-widest block mb-2' style={{ color: 'var(--text-secondary)' }}>Peak Focus Time</label>
              <div className='flex gap-2'>
                {['morning', 'afternoon', 'evening', 'night'].map(t => (
                  <button key={t} onClick={() => setProfileForm({ ...profileForm, peak_time: t })} className='flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all' style={profileForm.peak_time === t ? { background: 'var(--accent-color)', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{t}</button>
                ))}
              </div>
            </div>

            <div>
              <label className='text-[10px] font-black uppercase tracking-widest block mb-2' style={{ color: 'var(--text-secondary)' }}>Focus Level</label>
              <div className='flex gap-2'>
                {['beginner', 'intermediate', 'advanced'].map(l => (
                  <button key={l} onClick={() => setProfileForm({ ...profileForm, focus_level: l })} className='flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all' style={profileForm.focus_level === l ? { background: 'var(--accent-color)', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{l}</button>
                ))}
              </div>
            </div>

            <div>
              <label className='text-[10px] font-black uppercase tracking-widest block mb-2' style={{ color: 'var(--text-secondary)' }}>Study Style</label>
              <div className='flex gap-2'>
                {['structured', 'flexible', 'intensive'].map(s => (
                  <button key={s} onClick={() => setProfileForm({ ...profileForm, study_style: s })} className='flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all' style={profileForm.study_style === s ? { background: 'var(--accent-color)', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{s}</button>
                ))}
              </div>
            </div>

            <button onClick={saveStudyProfile} disabled={profileSaving} className='w-full py-3 rounded-xl text-sm font-black transition-all hover:opacity-90 flex items-center justify-center gap-2' style={{ background: 'var(--accent-color)', color: '#fff' }}>
              {profileSaving ? 'Saving...' : <><Check size={14} /> Save Profile</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Billing Tab ── */}
      {activeTab === 'billing' && (
        <div className='flex flex-col gap-6 max-w-2xl'>
          {/* Current Plan Card */}
          <div className='p-6 rounded-2xl border border-border' style={{ background: 'var(--card-bg)' }}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-bold flex items-center gap-2'>
                <Crown size={18} style={{ color: isPro ? '#f59e0b' : 'var(--accent-color)' }} />
                Current Plan
              </h3>
              <span
                className='text-xs font-black px-3 py-1 rounded-full'
                style={isPro
                  ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }
                  : { background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)', color: 'var(--accent-color)', border: '1px solid color-mix(in srgb, var(--accent-color) 20%, transparent)' }
                }
              >
                {isPro ? '✦ Pro' : 'Free'}
              </span>
            </div>

            {/* Usage bar */}
            <div className='mb-5'>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-sm font-bold'>AI Scans Today</span>
                <span className='text-sm font-black' style={{ color: barColor }}>{scansRemaining} / {scanLimit} remaining</span>
              </div>
              <div className='h-2 rounded-full overflow-hidden' style={{ background: 'var(--border-color)' }}>
                <motion.div
                  className='h-full rounded-full'
                  style={{ background: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className='text-xs mt-2' style={{ color: 'var(--text-secondary)' }}>
                {isPro
                  ? 'Pro users get 200 AI scans per day. Resets at midnight.'
                  : `Free users get 10 AI scans per day. Upgrade for 200 scans/day.`
                }
              </p>
            </div>

            {/* Feature list */}
            <div className='grid grid-cols-2 gap-3 mb-5'>
              {[
                { label: '10 AI scans/day', free: true, pro: false },
                { label: '200 AI scans/day', free: false, pro: true },
                { label: 'Smart site blocking', free: true, pro: true },
                { label: 'Ambient sounds', free: true, pro: true },
                { label: 'Analytics dashboard', free: true, pro: true },
                { label: 'Priority AI models', free: false, pro: true },
              ].map((f, i) => {
                const included = isPro ? f.pro : f.free;
                return (
                  <div key={i} className='flex items-center gap-2 text-sm'>
                    <span className={included ? 'text-green-400' : 'text-red-400/50'}>
                      {included ? '✓' : '✗'}
                    </span>
                    <span style={{ color: included ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: included ? 1 : 0.5 }}>
                      {f.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            {!isPro ? (
              <a
                href={`${POLAR_PRO_URL}?metadata[supabase_user_id]=${user?.id}&success_url=${encodeURIComponent(window.location.origin + '/settings?tab=billing&payment=success')}`}
                target="_blank"
                rel="noopener noreferrer"
                className='w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]'
                style={{ background: 'var(--accent-color)', color: '#fff' }}
              >
                <Crown size={16} /> Upgrade to Pro — $5/mo
                <ExternalLink size={13} />
              </a>
            ) : (
              <div className='text-center text-sm' style={{ color: 'var(--text-secondary)' }}>
                <p>You're on Pro. Thank you for supporting AntiDistract! 🙏</p>
                <a
                  href="https://polar.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className='text-xs mt-2 inline-flex items-center gap-1 hover:opacity-75 transition-opacity'
                  style={{ color: 'var(--accent-color)' }}
                >
                  Manage subscription <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SettingsPage;
