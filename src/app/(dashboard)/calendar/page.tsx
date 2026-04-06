'use client';

import React, { useState, useCallback } from 'react';
import CalendarView from '@/components/calendar/calendar-view';
import TaskList from '@/components/calendar/task-list';
import TaskForm from '@/components/calendar/task-form';
import Modal from '@/components/ui/modal';

interface Task {
  id: string;
  title: string;
  description?: string;
  scheduled_date: Date | string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  channel: {
    id: string;
    name: string;
    color: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
}

interface Channel {
  id: string;
  name: string;
  color: string;
}

interface Campaign {
  id: string;
  name: string;
}

// Mock Data
const CHANNELS: Channel[] = [
  { id: '1', name: 'Instagram', color: '#E1306C' },
  { id: '2', name: 'Newsletter', color: '#8B4513' },
  { id: '3', name: 'Google Ads', color: '#4285F4' },
  { id: '4', name: 'SEO / Blog', color: '#34A853' },
  { id: '5', name: 'TikTok', color: '#000000' },
  { id: '6', name: 'Email', color: '#B91C1C' },
];

const CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Wiosenna kolekcja' },
  { id: '2', name: 'Earl Great launch' },
  { id: '3', name: 'Matcha specjał' },
];

// Generate mock tasks for different dates
const generateMockTasks = (): Task[] => {
  const today = new Date();
  const tasks: Task[] = [];
  const titles = [
    {
      title: 'Post na Instagram - nowa herbata Frida',
      channel: 'Instagram',
      priority: 'high' as const,
    },
    {
      title: 'Newsletter - promocja wiosenna',
      channel: 'Newsletter',
      priority: 'high' as const,
    },
    {
      title: 'Google Ads - kampania Earl Great',
      channel: 'Google Ads',
      priority: 'medium' as const,
    },
    {
      title: 'SEO - blog o matchach',
      channel: 'SEO / Blog',
      priority: 'medium' as const,
    },
    {
      title: 'TikTok - behind the scenes pakowanie',
      channel: 'TikTok',
      priority: 'low' as const,
    },
    {
      title: 'Email - powitanie nowych klientów',
      channel: 'Email',
      priority: 'high' as const,
    },
    {
      title: 'Instagram Stories - poranne herbata',
      channel: 'Instagram',
      priority: 'low' as const,
    },
    {
      title: 'Google Ads - retargeting',
      channel: 'Google Ads',
      priority: 'medium' as const,
    },
    {
      title: 'Newsletter - artykuł gościnny',
      channel: 'Newsletter',
      priority: 'medium' as const,
    },
    {
      title: 'SEO - optymalizacja stron produktowych',
      channel: 'SEO / Blog',
      priority: 'high' as const,
    },
    {
      title: 'TikTok - challenge #TeaLover',
      channel: 'TikTok',
      priority: 'medium' as const,
    },
    {
      title: 'Email - przypomnienie o promocji',
      channel: 'Email',
      priority: 'medium' as const,
    },
    {
      title: 'Instagram Carousel - porady parzenia',
      channel: 'Instagram',
      priority: 'medium' as const,
    },
    {
      title: 'Google Ads - nowe słowa kluczowe',
      channel: 'Google Ads',
      priority: 'low' as const,
    },
    {
      title: 'TikTok - test nowego formatu',
      channel: 'TikTok',
      priority: 'low' as const,
    },
  ];

  // Distribute tasks across days
  for (let i = 0; i < 15; i++) {
    const taskTitle = titles[i];
    const daysOffset = Math.floor(Math.random() * 30) - 15;
    const taskDate = new Date(today);
    taskDate.setDate(taskDate.getDate() + daysOffset);

    const channel = CHANNELS.find((c) => c.name === taskTitle.channel)!;
    const campaign = Math.random() > 0.5 ? CAMPAIGNS[Math.floor(Math.random() * CAMPAIGNS.length)] : undefined;

    tasks.push({
      id: `task-${i + 1}`,
      title: taskTitle.title,
      description: `Zadanie dla kanału ${channel.name}`,
      scheduled_date: taskDate,
      status: Math.random() > 0.7 ? 'done' : Math.random() > 0.5 ? 'in_progress' : 'todo',
      priority: taskTitle.priority,
      channel,
      campaign,
    });
  }

  return tasks;
};

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>(generateMockTasks());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleAddTask = useCallback(() => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const handleToggleStatus = useCallback((taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          const statusCycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
          return {
            ...task,
            status: statusCycle[task.status as keyof typeof statusCycle] as Task['status'],
          };
        }
        return task;
      })
    );
  }, []);

  const handleSaveTask = useCallback(
    (data: Partial<Task>) => {
      if (editingTask) {
        // Update existing task
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === editingTask.id ? { ...task, ...data } : task
          )
        );
      } else {
        // Create new task
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: data.title || '',
          description: data.description,
          scheduled_date: data.scheduled_date || new Date(),
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          channel: data.channel!,
          campaign: data.campaign,
        };
        setTasks((prevTasks) => [...prevTasks, newTask]);
      }
      setIsModalOpen(false);
      setEditingTask(undefined);
    },
    [editingTask]
  );

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setEditingTask(undefined);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Kalendarz marketingowy</h1>
        <p className="text-stone-600 mt-2">
          Zaplanuj i zarządzaj harmonogramem kampanii marketingowych Brown House & Tea
        </p>
      </div>

      {/* Main Content - Calendar and Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View - Left Side (2 columns) */}
        <div className="lg:col-span-2">
          <CalendarView tasks={tasks} onDayClick={handleDayClick} />
        </div>

        {/* Task List - Right Side (1 column) */}
        <div className="lg:col-span-1">
          <TaskList
            tasks={tasks}
            selectedDate={selectedDate}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </div>

      {/* Task Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingTask ? 'Edytuj zadanie' : 'Nowe zadanie'}
        size="lg"
      >
        <TaskForm
          task={editingTask}
          channels={CHANNELS}
          campaigns={CAMPAIGNS}
          selectedDate={selectedDate}
          onSave={handleSaveTask}
          onCancel={handleCancel}
        />
      </Modal>
    </div>
  );
}
