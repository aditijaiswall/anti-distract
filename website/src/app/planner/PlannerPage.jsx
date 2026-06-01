import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  addDays,
  startOfWeek as dnsStartOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay
} from 'date-fns';
import { supabase } from '../../lib/supabaseClient';

// Components
import PlannerHeader from './PlannerHeader';
import DailyView from './DailyView';
import WeeklyView from './WeeklyView';
import MonthlyView from './MonthlyView';
import KanbanView from './KanbanView';
import TaskModal from './TaskModal';

const PlannerPage = ({ user }) => {
  const [viewMode, setViewMode] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPlannerData();
    }
  }, [user, currentDate, viewMode]);

  useEffect(() => {
    if (!user) return;

    const channelId = `planner-tasks-updates-${user.id}-${Math.floor(Math.random() * 10000)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'planner_tasks',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('🔄 planner_tasks change detected:', payload);
        fetchPlannerData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPlannerData = async () => {
    setLoading(true);
    try {
      let start, end;
      if (viewMode === 'weekly') {
        start = dnsStartOfWeek(currentDate, { weekStartsOn: 1 });
        end = addDays(start, 7);
      } else if (viewMode === 'monthly' || viewMode === 'kanban') {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      } else {
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
      }

      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.warn('⚠️ planner_tasks table missing. Please apply SQL schema in Supabase Editor.');
          setTasks([]);
        } else throw error;
      } else {
        setTasks(data || []);
      }

      // Fetch today's tasks specifically to sync with Chrome extension popup
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: todayTasksData } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', todayStart.toISOString())
        .lte('due_date', todayEnd.toISOString())
        .order('due_date', { ascending: true });

      if (todayTasksData) {
        const extensionTasks = todayTasksData.map(t => ({
          id: t.id,
          text: t.name,
          completed: !!t.completed,
          status: t.status
        }));
        console.log('📡 Syncing tasks to extension:', extensionTasks);
        window.dispatchEvent(new CustomEvent('SYNC_PLANNER_TASKS', { detail: extensionTasks }));
      }

      // Fetch Goals
      const { data: goalsData } = await supabase
        .from('planner_goals')
        .select('*')
        .eq('user_id', user.id);

      if (goalsData) {
        const goalMap = {};
        goalsData.forEach(g => { goalMap[g.date] = g.goal_minutes; });
        setGoals(goalMap);
      }

    } catch (err) {
      console.error('Error fetching planner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    // 🚀 Optimistic Update
    const isCompleting = newStatus === 'completed';
    const completedAt = isCompleting ? new Date().toISOString() : null;

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, completed: isCompleting, completed_at: completedAt }
        : t
    ));

    try {
      const { error } = await supabase
        .from('planner_tasks')
        .update({
          status: newStatus,
          completed: isCompleting,
          completed_at: completedAt
        })
        .eq('id', taskId);

      if (error) throw error;
      // We don't necessarily need to fetchPlannerData() here if we trust the optimistic update,
      // but it's good for ensuring consistency. We'll skip it for speed unless error.
    } catch (err) {
      console.error('Error changing task status:', err);
      fetchPlannerData(); // Revert on error
    }
  };

  const handleToggleComplete = async (task) => {
    // 🚀 Optimistic Update
    const isCompleting = !task.completed;
    const completedAt = isCompleting ? new Date().toISOString() : null;
    const newStatus = isCompleting ? 'completed' : 'todo';

    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, completed: isCompleting, completed_at: completedAt, status: newStatus }
        : t
    ));

    try {
      const { error } = await supabase
        .from('planner_tasks')
        .update({
          completed: isCompleting,
          completed_at: completedAt,
          status: newStatus
        })
        .eq('id', task.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling task completion:', err);
      fetchPlannerData(); // Revert on error
    }
  };

  const handleNavigate = (direction) => {
    if (viewMode === 'weekly') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else if (viewMode === 'monthly') {
      const delta = direction === 'next' ? 1 : -1;
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
      setCurrentDate(nextMonth);
    } else {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : addDays(prev, -1));
    }
  };

  const handleOpenModal = (task = null) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 min-h-screen">
      <PlannerHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentDate={currentDate}
        onNavigate={handleNavigate}
        onAddTask={() => handleOpenModal()}
      />

      <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-[32px] p-6 shadow-2xl">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-8 h-8 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40">Syncing Planner...</p>
            </motion.div>
          ) : (
            <motion.div
              key={viewMode + currentDate.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === 'daily' && (
                <DailyView
                  currentDate={currentDate}
                  tasks={tasks}
                  onEditTask={handleOpenModal}
                  onToggleComplete={handleToggleComplete}
                />
              )}
              {viewMode === 'weekly' && (
                <WeeklyView
                  currentDate={currentDate}
                  tasks={tasks}
                  goals={goals}
                  onEditTask={handleOpenModal}
                  onToggleComplete={handleToggleComplete}
                />
              )}
              {viewMode === 'monthly' && (
                <MonthlyView
                  currentDate={currentDate}
                  tasks={tasks}
                  onEditTask={handleOpenModal}
                  onToggleComplete={handleToggleComplete}
                />
              )}
              {viewMode === 'kanban' && (
                <KanbanView
                  tasks={tasks}
                  onEditTask={handleOpenModal}
                  onStatusChange={handleStatusChange}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        user={user}
        onRefresh={fetchPlannerData}
      />
    </div>
  );
};

export default PlannerPage;
