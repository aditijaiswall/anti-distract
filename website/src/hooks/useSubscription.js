import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * useSubscription — fetches subscription tier and daily scan usage from Supabase.
 * Falls back to local extension storage if Supabase is unavailable.
 */
const useSubscription = (user) => {
  const [tier, setTier] = useState('free');         // 'free' | 'pro'
  const [scansUsed, setScansUsed] = useState(0);
  const [scanLimit, setScanLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_tier, daily_scans_used, last_reset_date')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const today = new Date().toISOString().split('T')[0];
        const isNewDay = data.last_reset_date !== today;
        const used = isNewDay ? 0 : (data.daily_scans_used ?? 0);
        const t = data.subscription_tier ?? 'free';

        setTier(t);
        setScansUsed(used);
        setScanLimit(t === 'pro' ? 200 : 10);

        // Push authoritative DB values to extension on load as well
        // Added 1000ms delay to prevent race conditions where React fetches faster than the Content script loads
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('UPDATE_SCAN_DATA', {
            detail: {
              aiScansUsed: used,
              aiScansDate: data.last_reset_date,
              subscriptionTier: t,
              scanLimitReached: false
            }
          }));
        }, 1000);
      } catch (err) {
        console.warn('[useSubscription] Supabase fetch failed, using defaults:', err.message);
        // Keep defaults (free / 0)
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    // Use a unique channel name to prevent "already subscribed" errors in React Strict Mode
    const channelId = `profile-updates-${user.id}-${Math.floor(Math.random() * 10000)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        const d = payload.new;
        const t = d.subscription_tier ?? 'free';
        setTier(t);
        setScanLimit(t === 'pro' ? 200 : 10);
        const today = new Date().toISOString().split('T')[0];
        const used = d.last_reset_date !== today ? 0 : (d.daily_scans_used ?? 0);
        setScansUsed(used);

        // Push authoritative DB values to extension via sync bridge
        window.dispatchEvent(new CustomEvent('UPDATE_SCAN_DATA', {
          detail: {
            aiScansUsed: used,
            aiScansDate: d.last_reset_date,
            subscriptionTier: t,
            scanLimitReached: false
          }
        }));
      })
      .subscribe();

    // Auto-refetch at midnight so counts reset to 0
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    const midnightTimer = setTimeout(() => fetchSubscription(), msUntilMidnight);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(midnightTimer);
    };
  }, [user?.id]);

  const scansRemaining = Math.max(0, scanLimit - scansUsed);
  const usagePercent = Math.min(100, (scansUsed / scanLimit) * 100);
  const isPro = tier === 'pro';
  const isNearLimit = !isPro && scansRemaining <= 3;

  return { tier, isPro, scansUsed, scansRemaining, scanLimit, usagePercent, isNearLimit, loading };
};

export default useSubscription;
