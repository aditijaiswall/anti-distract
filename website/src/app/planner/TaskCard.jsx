import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const TaskCard = ({ task, onClick, onToggleComplete, isDragging, dragStyles, listeners, attributes, setNodeRef }) => {
  const style = {
    ...dragStyles,
    opacity: isDragging ? 0.2 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return 'var(--accent-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const d = new Date(task.due_date);
  const isAllDay = task.recurring_rule?.is_all_day || (d.getHours() === 0 && d.getMinutes() === 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group p-3 rounded-xl border border-border bg-card hover:border-accent/40 transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          className={`mt-0.5 transition-colors shrink-0 ${task.completed ? 'text-accent' : 'text-secondary hover:text-primary'}`}
        >
          {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        </button>
        
        <div 
          className="flex-1 min-w-0"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {/* Drag Handle Area */}
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
            <div className="flex items-center justify-between gap-1">
              <p className={`text-xs font-bold truncate ${task.completed ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
                {task.name}
              </p>
              {task.completed && task.completed_at && (
                <span className="text-[8px] font-black text-accent shrink-0 opacity-60">
                  {format(new Date(task.completed_at), 'h:mm')}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              {!isAllDay && (
                <div className="flex items-center gap-1 text-[9px] font-bold text-secondary">
                  <Clock size={10} />
                  {format(d, 'h:mm a')}
                </div>
              )}
              <div className="flex items-center gap-1 text-[9px] font-bold text-secondary/60">
                {task.estimated_minutes}m
              </div>
              {task.priority && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }} />
                  <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">{task.priority}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SortableTaskCard = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.task.id });

  const dragStyles = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <TaskCard 
      {...props} 
      isDragging={isDragging} 
      dragStyles={dragStyles}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef}
    />
  );
};

export default TaskCard;
