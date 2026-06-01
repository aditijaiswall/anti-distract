import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Global hook that keeps the Chrome Extension's dailyTargets
 * in sync whenever planner_tasks change — regardless of which page
 * the user is on (Coach, Kanban, Planner, etc.).
 */
export default function useGlobalExtensionSync(user) {
    useEffect(() => {
        if (!user) return;

        // 1. Initial sync on mount
        syncTodayTasks(user.id);

        // 2. Realtime listener: any insert/update/delete on planner_tasks → re-sync
        const channelId = `global-sync-${user.id}-${Math.floor(Math.random() * 10000)}`;
        const channel = supabase
            .channel(channelId)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'planner_tasks',
                filter: `user_id=eq.${user.id}`
            }, () => {
                syncTodayTasks(user.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);
}

async function syncTodayTasks(userId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('due_date', todayStart.toISOString())
        .lte('due_date', todayEnd.toISOString())
        .order('due_date', { ascending: true });

    if (data) {
        const extensionTasks = data.map(t => ({
            id: t.id,
            text: t.name,
            completed: !!t.completed,
            status: t.status
        }));
        window.dispatchEvent(new CustomEvent('SYNC_PLANNER_TASKS', { detail: extensionTasks }));
    }
}
