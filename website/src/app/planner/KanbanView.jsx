import React, { useMemo } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Layout } from 'lucide-react';

// Components
import TaskCard, { SortableTaskCard } from './TaskCard';

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: Circle, color: 'text-secondary' },
  { id: 'in-progress', title: 'In Progress', icon: Clock, color: 'text-accent' },
  { id: 'completed', title: 'Completed', icon: CheckCircle2, color: 'text-green-500' }
];

const KanbanView = ({ tasks, onEditTask, onStatusChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeId, setActiveId] = React.useState(null);
  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  const tasksByStatus = useMemo(() => {
    const map = { 'todo': [], 'in-progress': [], 'completed': [] };
    tasks.forEach(task => {
      const status = task.status || (task.completed ? 'completed' : 'todo');
      if (map[status]) map[status].push(task);
      else map['todo'].push(task);
    });
    return map;
  }, [tasks]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    let newStatus = over.id;

    // Resolve column ID if dropped over a task
    if (over.data?.current?.sortable?.containerId) {
      newStatus = over.data.current.sortable.containerId;
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status || (overTask.completed ? 'completed' : 'todo');
      }
    }

    const validStatuses = COLUMNS.map(c => c.id);
    if (validStatuses.includes(newStatus)) {
      onStatusChange(taskId, newStatus);
    }
  };

  return (
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col md:flex-row gap-6 min-h-[600px] overflow-x-auto pb-6">
          {COLUMNS.map((column) => (
            <KanbanColumn 
              key={column.id}
              id={column.id}
              title={column.title}
              icon={column.icon}
              color={column.color}
              tasks={tasksByStatus[column.id] || []}
              onEditTask={onEditTask}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80 scale-105 rotate-2 transition-transform cursor-grabbing w-[300px]">
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

const KanbanColumn = ({ id, title, icon: Icon, color, tasks, onEditTask, onStatusChange }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className="flex-1 min-w-[300px] flex flex-col rounded-3xl bg-white/5 border border-white/5 border-dashed"
    >
      {/* Column Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-white/5 ${color}`}>
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
            <p className="text-[10px] font-bold text-secondary opacity-40">{tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-secondary">
          {tasks.length}
        </div>
      </div>

      {/* Task List (Droppable area) */}
      <div className="flex-1 p-4 space-y-4">
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
              onToggleComplete={() => {
                const nextStatus = task.completed ? 'todo' : 'completed';
                onStatusChange(task.id, nextStatus);
              }}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/5 rounded-2xl opacity-20"
          >
            <Layout size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Drop tasks here</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default KanbanView;
