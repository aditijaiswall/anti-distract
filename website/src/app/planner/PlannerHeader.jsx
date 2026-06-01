import React from 'react';
import { format } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  LayoutGrid,
  Clock
} from 'lucide-react';
import { startOfWeek, addDays } from 'date-fns';

const PlannerHeader = ({ viewMode, setViewMode, currentDate, onNavigate, onAddTask }) => {
  const getNavText = () => {
    if (viewMode === 'weekly') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'MMM d')} - ${format(addDays(start, 6), 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM do, yyyy');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Focus Planner
        </h1>
        <div className="flex items-center gap-2 text-secondary text-sm font-medium">
          <CalendarIcon size={14} className="text-accent" />
          {format(currentDate, 'MMMM yyyy')}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border">
          <button 
            onClick={() => onNavigate('prev')}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-secondary hover:text-primary"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="px-4 text-xs font-black uppercase tracking-widest min-w-[120px] text-center">
            {viewMode === 'weekly' ? 'This Week' : format(currentDate, 'MMM do')}
          </div>

          <button 
            onClick={() => onNavigate('next')}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-secondary hover:text-primary"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-card border border-border">
          {[
            { id: 'daily', label: 'Daily', icon: Clock },
            { id: 'weekly', label: 'Weekly', icon: LayoutGrid },
            { id: 'monthly', label: 'Monthly', icon: CalendarIcon },
            { id: 'kanban', label: 'Kanban', icon: LayoutGrid } // Using LayoutGrid for now as placeholder for Trello
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === mode.id 
                  ? 'bg-accent text-white shadow-lg shadow-accent/25' 
                  : 'text-secondary hover:text-primary hover:bg-white/5'
              }`}
              style={viewMode === mode.id ? { backgroundColor: 'var(--accent-color)' } : {}}
            >
              <mode.icon size={14} />
              <span className="hidden lg:inline">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Add */}
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
          style={{ background: 'var(--accent-color)', color: '#fff' }}
        >
          <Plus size={18} strokeWidth={3} />
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>
    </div>
  );
};

export default PlannerHeader;
