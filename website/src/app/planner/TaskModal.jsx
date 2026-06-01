import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Flag, RefreshCcw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';

const TaskModal = ({ isOpen, onClose, task, user, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [isTimed, setIsTimed] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
    estimated_minutes: 25,
    priority: 'medium',
    recurring: 'none',
    status: 'todo'
  });

  useEffect(() => {
    if (task) {
      const d = new Date(task.due_date);
      const isAllDay = d.getHours() === 0 && d.getMinutes() === 0;
      setIsTimed(!isAllDay);
      setFormData({
        name: task.name,
        date: format(d, "yyyy-MM-dd"),
        time: format(d, "HH:mm"),
        estimated_minutes: task.estimated_minutes,
        priority: task.priority || 'medium',
        recurring: task.recurring_rule?.type || 'none',
        status: task.status || (task.completed ? 'completed' : 'todo')
      });
    } else {
      setIsTimed(false); 
      setFormData({
        name: '',
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00",
        estimated_minutes: 25,
        priority: 'medium',
        recurring: 'none',
        status: 'todo'
      });
    }
  }, [task, isOpen]);

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    
    setLoading(true);
    try {
      await supabase.from('planner_tasks').delete().eq('id', task.id);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Error deleting task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dateObj = new Date(formData.date);
      if (isTimed) {
        const [h, m] = formData.time.split(':');
        dateObj.setHours(parseInt(h), parseInt(m), 0);
      } else {
        dateObj.setHours(0, 0, 0, 0);
      }

      const payload = {
        name: formData.name,
        due_date: dateObj.toISOString(),
        estimated_minutes: parseInt(formData.estimated_minutes),
        priority: formData.priority,
        status: formData.status,
        completed: formData.status === 'completed',
        completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
        user_id: user.id,
        recurring_rule: { 
          type: formData.recurring === 'none' ? null : formData.recurring,
          is_all_day: !isTimed 
        }
      };

      if (task) {
        await supabase.from('planner_tasks').update(payload).eq('id', task.id);
      } else {
        await supabase.from('planner_tasks').insert(payload);
      }

      onRefresh();
      onClose();
    } catch (err) {
      console.error('Error saving task:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md p-6 bg-card border border-border rounded-3xl shadow-2xl"
        style={{ background: 'var(--card-bg)' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black">{task ? 'Edit Task' : 'New Plan'}</h2>
          <div className="flex items-center gap-2">
            {task && (
               <button 
                  onClick={handleDelete}
                  className="p-2 hover:bg-red-500/10 text-secondary hover:text-red-500 rounded-lg transition-colors"
                  title="Delete Task"
               >
                  <Trash2 size={18} />
               </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-secondary">
               <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-2">Task Description</label>
            <input 
              autoFocus
              required
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-all"
              placeholder="What are we focusing on?"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Clock size={16} className={isTimed ? 'text-accent' : 'text-secondary'} />
               <span className="text-xs font-bold">Set specific time</span>
            </div>
            <button 
               type="button"
               onClick={() => setIsTimed(!isTimed)}
               className={`w-10 h-5 rounded-full relative transition-colors ${isTimed ? 'bg-accent' : 'bg-white/10'}`}
               style={isTimed ? { backgroundColor: 'var(--accent-color)' } : {}}
            >
               <motion.div 
                  animate={{ x: isTimed ? 22 : 2 }}
                  className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
               />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <label className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-2 flex items-center gap-2">
              <RefreshCcw size={10} /> Workflow Status
            </label>
            <div className="flex gap-2">
              {['todo', 'in-progress', 'completed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, status })}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.status === status 
                      ? 'bg-accent text-white shadow-lg' 
                      : 'bg-white/5 text-secondary hover:bg-white/10'
                  }`}
                  style={formData.status === status ? { backgroundColor: 'var(--accent-color)' } : {}}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-2 flex items-center gap-2">
                <Calendar size={10} /> Date
              </label>
              <input 
                type="date"
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-accent"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className={isTimed ? 'block' : 'opacity-30 pointer-events-none'}>
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-2 flex items-center gap-2">
                <Clock size={10} /> Time
              </label>
              <input 
                type="time"
                disabled={!isTimed}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-accent"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-2 flex items-center gap-2">
                <Clock size={10} /> Minutes
              </label>
              <input 
                type="number"
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-accent"
                value={formData.estimated_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-2 flex items-center gap-2">
                <Flag size={10} /> Priority
              </label>
              <select 
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-accent"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">Urgent / High</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 rounded-2xl text-sm font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-accent/20"
            style={{ background: 'var(--accent-color)', color: '#fff' }}
          >
            {loading ? 'Syncing...' : task ? 'Update Task' : 'Add to Schedule'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default TaskModal;
