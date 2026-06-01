import React, { useMemo } from 'react';
import { format, startOfDay, differenceInMinutes, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Circle, CheckCircle2 } from 'lucide-react';

const DailyView = ({ currentDate, tasks, onEditTask, onToggleComplete }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayStart = startOfDay(currentDate);

  const { timedTasks, allDayTasks } = useMemo(() => {
    const dayTasks = tasks.filter(t => isSameDay(new Date(t.due_date), currentDate));
    return {
      timedTasks: dayTasks.filter(t => t.recurring_rule?.is_all_day === false || (new Date(t.due_date).getHours() !== 0 || new Date(t.due_date).getMinutes() !== 0)),
      allDayTasks: dayTasks.filter(t => t.recurring_rule?.is_all_day === true || (new Date(t.due_date).getHours() === 0 && new Date(t.due_date).getMinutes() === 0))
    };
  }, [tasks, currentDate]);

  return (
    <div className="flex flex-col gap-8">
      {/* Top Section: All-Day Tasks / Daily Goals */}
      <div className="p-8 rounded-3xl border border-border bg-card/50">
         <h3 className="text-xs font-black uppercase tracking-widest text-accent mb-6 flex items-center gap-2">
            <CheckCircle2 size={14} /> Goals for the Day
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDayTasks.map(task => (
               <div 
                  key={task.id} 
                  className={`flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group hover:border-accent/40 transition-all cursor-pointer ${task.completed ? 'opacity-50' : ''}`}
                  onClick={() => onEditTask(task)}
               >
                  <div className="flex items-center gap-3 min-w-0">
                     <button 
                        onClick={(e) => {
                           e.stopPropagation();
                           onToggleComplete(task);
                        }}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                     >
                        {task.completed ? <CheckCircle size={16} className="text-accent" /> : <Circle size={16} className="text-secondary" />}
                     </button>
                     <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-bold truncate ${task.completed ? 'line-through text-secondary' : ''}`}>{task.name}</span>
                        {task.completed && task.completed_at && (
                           <span className="text-[10px] text-accent font-medium opacity-60">
                              Done at {format(new Date(task.completed_at), 'h:mm a')}
                           </span>
                        )}
                     </div>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                     task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'
                  }`}>{task.priority}</span>
               </div>
            ))}
            {allDayTasks.length === 0 && (
               <p className="text-xs text-secondary opacity-40 font-medium italic">No all-day goals set for this date.</p>
            )}
         </div>
      </div>

      <div className="flex gap-6">
        {/* Time column */}
        <div className="w-16 space-y-0 text-right pr-4 border-r border-border min-h-screen">
          {hours.map(h => (
            <div key={h} className="h-20 text-[10px] font-black text-secondary/40 pt-1 uppercase tracking-widest">
              {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
            </div>
          ))}
        </div>

        {/* Timeline with blocks */}
        <div className="flex-1 relative pt-1">
          {hours.map(h => (
            <div key={h} className="h-20 border-b border-border/20 absolute w-full" style={{ top: `${h * 80}px` }} />
          ))}

          {/* Task Blocks */}
          {timedTasks.map((task) => {
            const startTime = new Date(task.due_date);
            const topOffset = differenceInMinutes(startTime, dayStart) * (80 / 60);
            const height = (task.estimated_minutes) * (80 / 60);

            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={task.id}
                className="absolute left-4 right-4 rounded-2xl p-4 border shadow-xl flex flex-col justify-center overflow-hidden bg-card"
                style={{ 
                  top: `${topOffset}px`, 
                  height: `${Math.max(40, height)}px`,
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(task);
                      }}
                      className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-accent' : 'text-secondary hover:text-primary'}`}
                    >
                      {task.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                    </button>
                    <div className="min-w-0">
                      <h4 className={`text-sm font-black truncate ${task.completed ? 'line-through opacity-40' : ''}`}>{task.name}</h4>
                      <p className="text-[10px] font-bold text-secondary flex items-center gap-1">
                        <Clock size={10} /> {format(startTime, 'h:mm a')} • {task.estimated_minutes}m
                        {task.completed && task.completed_at && (
                           <span className="text-accent font-black ml-1 flex items-center gap-1">
                             • DONE {format(new Date(task.completed_at), 'h:mm a')}
                           </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tight ${
                    task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'
                  }`}>
                    {task.priority || 'medium'}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Current Time Indicator (if today) */}
          {isSameDay(currentDate, new Date()) && (
            <div 
              className="absolute left-0 right-0 z-50 flex items-center"
              style={{ top: `${differenceInMinutes(new Date(), dayStart) * (80 / 60)}px` }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
              <div className="flex-1 h-px bg-red-500/30" />
            </div>
          )}
        </div>

        {/* Side Profile / Reflection Area */}
        <div className="hidden xl:block w-80 space-y-6">
           <div className="p-6 rounded-3xl bg-accent/5 border border-accent/10">
              <h3 className="text-xs font-black uppercase tracking-widest text-accent mb-4">Day Intentions</h3>
              <textarea 
                 placeholder="What is your singular focus for today?"
                 className="w-full h-32 bg-transparent text-sm font-medium resize-none focus:outline-none placeholder:opacity-30"
              />
           </div>
           
           <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-secondary mb-4">Deep Focus Recap</h3>
              <div className="space-y-4">
                 <p className="text-[10px] text-secondary leading-relaxed font-bold uppercase tracking-widest opacity-40">Coming from synced sessions...</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DailyView;
