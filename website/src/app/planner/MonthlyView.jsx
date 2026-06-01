import React, { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay 
} from 'date-fns';
import { motion } from 'framer-motion';

const MonthlyView = ({ currentDate, tasks, onEditTask, onToggleComplete }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  return (
    <div className="rounded-3xl border border-border overflow-hidden bg-card/30">
      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-border bg-white/5">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const dayTasks = tasks.filter(t => isSameDay(new Date(t.due_date), day));

          return (
            <div 
              key={idx}
              className={`min-h-[140px] p-4 border-r border-b border-border/50 relative transition-colors ${
                !isCurrentMonth ? 'opacity-20' : ''
              } ${isToday ? 'bg-accent/5' : ''}`}
            >
              <span className={`text-sm font-black ${isToday ? 'text-accent' : 'text-primary'}`}>
                {format(day, 'd')}
              </span>

              {/* Task Indicators */}
              <div className="mt-4 space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <div 
                    key={task.id}
                    className="h-1.5 rounded-full overflow-hidden flex items-center gap-2"
                  >
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                     <span className="text-[8px] font-bold truncate opacity-60">{task.name}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[9px] font-bold text-secondary">+{dayTasks.length - 3} more</p>
                )}
              </div>

              {/* Density Indicator */}
              {dayTasks.length > 0 && (
                <div className="absolute bottom-4 right-4 text-[10px] font-black opacity-20">
                  {dayTasks.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyView;
