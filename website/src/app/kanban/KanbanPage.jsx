import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { 
  startOfMonth, 
  endOfMonth,
  format
} from 'date-fns';

// Components
import KanbanView from '../planner/KanbanView';
import TaskModal from '../planner/TaskModal';

const KanbanPage = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    if (user) {
      fetchKanbanData();
    }
  }, [user]);

  const fetchKanbanData = async () => {
    setLoading(true);
    try {
      // For the Kanban board, we show all tasks for the current month by default
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString())
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching Kanban data:', err);
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
    } catch (err) {
      console.error('Error changing task status:', err);
      fetchKanbanData(); // Revert on error
    }
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 min-h-screen">
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Focus Kanban
          </h1>
          <p className="text-sm font-medium text-secondary mt-1">
            Manage your {format(currentDate, 'MMMM')} workflow
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           {loading && (
              <div className="flex items-center gap-2 text-secondary opacity-40">
                 <div className="w-4 h-4 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Syncing...</span>
              </div>
           )}
        </div>
      </div>

      <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-[32px] p-6 shadow-2xl">
        <AnimatePresence mode="wait">
          {loading && tasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-40 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                 <div className="w-6 h-6 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40">Initializing Board...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <KanbanView 
                tasks={tasks} 
                onEditTask={handleEditTask}
                onStatusChange={handleStatusChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        user={user}
        onRefresh={fetchKanbanData}
      />
    </div>
  );
};

export default KanbanPage;
