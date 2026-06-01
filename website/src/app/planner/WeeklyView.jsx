import React, { useMemo } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { motion } from 'framer-motion';

// Components
import TaskCard, { SortableTaskCard } from './TaskCard';

const WeeklyView = ({ currentDate, tasks, goals, onEditTask, onToggleComplete }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const days = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const tasksByDay = useMemo(() => {
    const map = {};
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map[dateStr] = tasks.filter(t => isSameDay(new Date(t.due_date), day));
    });
    return map;
  }, [days, tasks]);

  const [activeId, setActiveId] = React.useState(null);
  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    let newDateStr = over.id; 

    // If we dropped on a task, find which day it belongs to
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      newDateStr = format(new Date(overTask.due_date), 'yyyy-MM-dd');
    }

    console.log(`Dragging task ${taskId} to ${newDateStr}`);
    
    const { error } = await supabase
      .from('planner_tasks')
      .update({ due_date: new Date(newDateStr).toISOString() })
      .eq('id', taskId);
    
    if (error) console.error('Error updating task date:', error);
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          const dayTasks = tasksByDay[dateStr] || [];
          const goal = goals[dateStr] || 300; // Default 5h
          const totalFocus = dayTasks.reduce((acc, t) => acc + (t.completed ? t.estimated_minutes : 0), 0);
          const progress = Math.min(100, (totalFocus / goal) * 100);

          return (
            <DayColumn 
              key={dateStr}
              id={dateStr}
              day={day}
              isToday={isToday}
              tasks={dayTasks}
              progress={progress}
              totalFocus={totalFocus}
              onEditTask={onEditTask}
              onToggleComplete={onToggleComplete}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80 scale-105 rotate-2 transition-transform cursor-grabbing w-full max-w-[200px]">
            <TaskCard 
              task={activeTask} 
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const DayColumn = ({ id, day, isToday, tasks, progress, totalFocus, onEditTask, onToggleComplete }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col min-h-[500px] rounded-2xl border transition-colors ${
        isToday ? 'bg-accent/5 border-accent/20' : 'bg-card/50 border-border'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border/50">
        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isToday ? 'text-accent' : 'text-secondary'}`}>
          {format(day, 'EEEE')}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black">{format(day, 'd')}</span>
          <span className="text-xs text-secondary">{format(day, 'MMM')}</span>
        </div>
      </div>

      {/* Task List (Droppable area) */}
      <div className="flex-1 p-2 space-y-2">
        <SortableContext 
          id={id}
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onEditTask(task)}
              onToggleComplete={() => onToggleComplete(task)}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-20 flex items-center justify-center border-2 border-dashed border-border/20 rounded-xl opacity-20 italic text-[10px]">
            No plans
          </div>
        )}
      </div>

      {/* Progress Footer */}
      <div className="p-4 mt-auto border-t border-border/50 bg-white/5 rounded-b-2xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter">Deep Focus</span>
          <span className="text-[9px] font-bold text-primary">{Math.floor(totalFocus / 60)}h {totalFocus % 60}m</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-accent"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
        </div>
      </div>
    </div>
  );
};

export default WeeklyView;
