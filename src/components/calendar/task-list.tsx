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
  channel: {
    name: string;
    color: string;
  };
}

interface TaskListProps {
  tasks: Task[];
  selectedDate: Date | null;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedDate,
  onAddTask,
  onEditTask,
  onToggleStatus,
}) => {
  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((task) => {
      const taskDate = task.scheduled_date instanceof Date
        ? task.scheduled_date
        : new Date(task.scheduled_date);
      return isSameDay(taskDate, selectedDate);
    });
  }, [tasks, selectedDate]);

  // Group tasks by channel
  const tasksByChannel = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    selectedTasks.forEach((task) => {
      if (!grouped[task.channel.name]) {
        grouped[task.channel.name] = [];
      }
      grouped[task.channel.name].push(task);
    });
    return grouped;
  }, [selectedTasks]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'medium':
        return <AlertCircle size={16} className="text-amber-500" />;
      default:
        return <AlertCircle size={16} className="text-stone-400" />;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Wysoki';
      case 'medium':
        return 'Średni';
      default:
        return 'Niski';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-6 h-fit sticky top-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-stone-900 mb-2">
          {selectedDate ? format(selectedDate, 'EEEE, d LLLL', { locale: pl }) : 'Wybierz dzień'}
        </h2>
        <Button
          variant="primary"
          size="md"
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2"
          disabled={!selectedDate}
        >
          <Plus size={18} />
          Dodaj zadanie
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-6">
        {Object.keys(tasksByChannel).length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-stone-500 text-sm">Brak zadań na ten dzień</p>
          </div>
        ) : (
          Object.entries(tasksByChannel).map(([channelName, channelTasks]) => (
            <div key={channelName}>
              <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">
                {channelName}
              </h3>
              <div className="space-y-2">
                {channelTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer"
                    onClick={() => onEditTask(task)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(task.id);
                        }}
                        className="mt-0.5 flex-shrink-0 hover:text-amber-700 transition-colors"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 size={20} className="text-green-600" />
                        ) : (
                          <Circle size={20} className="text-stone-300" />
                        )}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-tight ${
                            task.status === 'done'
                              ? 'line-through text-stone-500'
                              : 'text-stone-900'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            color={task.channel.color}
                            size="sm"
                            variant="solid"
                          >
                            {task.channel.name}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-stone-600">
                            {getPriorityIcon(task.priority)}
                            <span>{getPriorityLabel(task.priority)}</span>
                          </div>
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
  );
};

export default TaskList;
