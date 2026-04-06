// @ts-nocheck
'use client';

import React, { useState, useCallback, useEffect } from 'react';
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

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Load tasks, channels and campaigns from API
  useEffect(() => {
    (async () => {
      try {
        const [tRes, cRes, ccRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/channels'),
          fetch('/api/campaigns'),
        ]);
        const tJson = await tRes.json();
        const cJson = await cRes.json();
        const ccJson = await ccRes.json();
        const ch: Channel[] = Array.isArray(cJson)
          ? cJson.map((c: any) => ({ id: String(c.id), name: c.name, color: c.color || '#64748b' }))
          : [];
        const cm: Campaign[] = Array.isArray(ccJson)
          ? ccJson.map((c: any) => ({ id: String(c.id), name: c.name }))
          : [];
        setChannels(ch);
        setCampaigns(cm);
        if (Array.isArray(tJson)) {
          setTasks(
            tJson.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              description: t.description,
              scheduled_date: t.scheduled_date,
              status: t.status,
              priority: t.priority,
              channel: ch.find((x) => x.id === String(t.channel_id)) || { id: '0', name: '—', color: '#64748b' },
              campaign: cm.find((x) => x.id === String(t.campaign_id)),
            }))
          );
        }
      } catch (e) {
        console.error('Failed to load planner data:', e);
      }
    })();
  }, []);

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
    const statusCycle: Record<string, Task['status']> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const newStatus = statusCycle[task.status];
        // Persist async (fire and forget)
        fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }).catch((e) => console.error('Failed to update task status:', e));
        return { ...task, status: newStatus };
      })
    );
  }, []);

  const handleSaveTask = useCallback(
    async (data: Partial<Task>) => {
      try {
        if (editingTask) {
          const r = await fetch(`/api/tasks/${editingTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              description: data.description,
              scheduled_date: data.scheduled_date,
              status: data.status,
              priority: data.priority,
              channel_id: data.channel?.id ? Number(data.channel.id) : undefined,
              campaign_id: data.campaign?.id ? Number(data.campaign.id) : undefined,
            }),
          });
          if (r.ok) {
            setTasks((prev) =>
              prev.map((t) => (t.id === editingTask.id ? { ...t, ...data } as Task : t))
            );
          }
        } else {
          const r = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              description: data.description,
              scheduled_date: data.scheduled_date,
              status: data.status || 'todo',
              priority: data.priority || 'medium',
              channel_id: data.channel?.id ? Number(data.channel.id) : undefined,
              campaign_id: data.campaign?.id ? Number(data.campaign.id) : undefined,
            }),
          });
          const created = await r.json();
          if (r.ok && created?.id) {
            setTasks((prev) => [
              ...prev,
              {
                id: String(created.id),
                title: created.title,
                description: created.description,
                scheduled_date: created.scheduled_date,
                status: created.status,
                priority: created.priority,
                channel: data.channel!,
                campaign: data.campaign,
              },
            ]);
          }
        }
      } catch (e) {
        console.error('Failed to save task:', e);
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kalendarz marketingowy</h1>
        <p className="text-slate-600 mt-2">
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
          channels={channels}
          campaigns={campaigns}
          selectedDate={selectedDate}
          onSave={handleSaveTask}
          onCancel={handleCancel}
        />
      </Modal>
    </div>
  );
}
