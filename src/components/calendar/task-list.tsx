'use client';

import React, { useMemo } from 'react';
import { isSameDay, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  scheduled_date: Date | string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  channel: { name: string; color: string; };
}

interface TaskListProps {
  tasks: Task[];
  selectedDate: Date | null;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, selectedDate, onAddTask, onEditTask, onToggleStatus }) => {
  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((task) => {
      const taskDate = task.scheduled_date instanceof Date ? task.scheduled_date : new Date(task.scheduled_date);
      return isSameDay(taskDate, selectedDate);
    });
  }, [tasks, selectedDate]);

  const tasksByChannel = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    selectedTasks.forEach((task) => {
      if (!grouped[task.channel.name]) grouped[task.channel.name] = [];
      grouped[task.channel.name].push(task);
    });
    return grouped;
  }, [selectedTasks]);

  const getPriorityDot = (priority: string) => {
    const colors: Record<string, string> = { high: 'bg-rose-400', medium: 'bg-amber-400', low: 'bg-slate-300' };
    return <span className={`w-1.5 h-1.5 rounded-full ${colors[priority] || colors.low}`} />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-fit sticky top-6 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[15px] font-semibold text-slate-900 mb-0.5">
          {selectedDate ? format(selectedDate, 'EEEE, d LLLL', { locale: pl }) : 'Wybierz dzień'}
        </h2>
        {selectedDate && (
          <p className="text-[12px] text-slate-400">{selectedTasks.length} zadań</p>
        )}
      </div>

      {/* Add Task */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <Button
          variant="primary"
          size="md"
          onClick={onAddTask}
          className="w-full"
          disabled={!selectedDate}
        >
          <Plus size={16} />
          Dodaj zadanie
        </Button>
      </div>

      {/* Tasks List */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        <div className="space-y-5">
          {Object.keys(tasksByChannel).length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Calendar size={18} className="text-slate-400" />
              </div>
              <p className="text-slate-400 text-[13px]">Brak zadań na ten dzień</p>
            </div>
          ) : (
            Object.entries(tasksByChannel).map(([channelName, channelTasks]) => (
              <div key={channelName}>
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">
                  {channelName}
                </h3>
                <div className="space-y-1">
                  {channelTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group p-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-all duration-150 cursor-pointer"
                      onClick={() => onEditTask(task)}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleStatus(task.id); }}
                          className="mt-0.5 flex-shrink-0 transition-colors"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 size={17} className="text-emerald-500" />
                          ) : (
                            <Circle size={17} className="text-slate-300 group-hover:text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium leading-snug ${
                            task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {getPriorityDot(task.priority)}
                            <span className="text-[11px] text-slate-400">
                              {task.priority === 'high' ? 'Wysoki' : task.priority === 'medium' ? 'Średni' : 'Niski'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Need Calendar icon for empty state
import { Calendar } from 'lucide-react';

export default TaskList;
