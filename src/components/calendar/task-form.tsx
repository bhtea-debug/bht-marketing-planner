'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Input, Select, Textarea } from '@/components/ui/input';
import Button from '@/components/ui/button';

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

interface TaskFormProps {
  task?: Task;
  channels: Channel[];
  campaigns: Campaign[];
  selectedDate?: Date | null;
  onSave: (data: Partial<Task>) => void;
  onCancel: () => void;
}

interface FormData {
  title: string;
  description: string;
  channel_id: string;
  campaign_id: string;
  scheduled_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  channels,
  campaigns,
  selectedDate,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    channel_id: '',
    campaign_id: '',
    scheduled_date: '',
    priority: 'medium',
    status: 'todo',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (task) {
      const taskDate = task.scheduled_date instanceof Date
        ? task.scheduled_date
        : new Date(task.scheduled_date);
      setFormData({
        title: task.title,
        description: task.description || '',
        channel_id: task.channel.id,
        campaign_id: task.campaign?.id || '',
        scheduled_date: format(taskDate, 'yyyy-MM-dd'),
        priority: task.priority,
        status: task.status,
      });
    } else if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      }));
    }
  }, [task, selectedDate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tytuł jest wymagany';
    }
    if (!formData.channel_id) {
      newErrors.channel_id = 'Kanał jest wymagany';
    }
    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Data jest wymagana';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const selectedChannel = channels.find((c) => c.id === formData.channel_id);
    const selectedCampaign = campaigns.find(
      (c) => c.id === formData.campaign_id
    );

    const submitData: Partial<Task> = {
      ...(task?.id && { id: task.id }),
      title: formData.title,
      description: formData.description,
      channel: selectedChannel!,
      campaign: selectedCampaign,
      scheduled_date: new Date(formData.scheduled_date),
      priority: formData.priority,
      status: formData.status,
    };

    onSave(submitData);
  };

  const priorityOptions = [
    { value: 'low', label: 'Niski' },
    { value: 'medium', label: 'Średni' },
    { value: 'high', label: 'Wysoki' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'Do zrobienia' },
    { value: 'in_progress', label: 'W trakcie' },
    { value: 'done', label: 'Gotowe' },
  ];

  const channelOptions = channels.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const campaignOptions = campaigns.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <Input
        label="Tytuł zadania"
        name="title"
        type="text"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        placeholder="np. Post na Instagram - nowa kolekcja"
      />

      {/* Description */}
      <Textarea
        label="Opis (opcjonalnie)"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Dodaj notatki do tego zadania..."
      />

      {/* Channel */}
      <Select
        label="Kanał"
        name="channel_id"
        value={formData.channel_id}
        onChange={handleChange}
        error={errors.channel_id}
        options={channelOptions}
      />

      {/* Campaign */}
      <Select
        label="Kampania (opcjonalnie)"
        name="campaign_id"
        value={formData.campaign_id}
        onChange={handleChange}
        options={campaignOptions}
      />

      {/* Scheduled Date */}
      <Input
        label="Data"
        name="scheduled_date"
        type="date"
        value={formData.scheduled_date}
        onChange={handleChange}
        error={errors.scheduled_date}
      />

      {/* Priority */}
      <Select
        label="Priorytet"
        name="priority"
        value={formData.priority}
        onChange={handleChange}
        options={priorityOptions}
      />

      {/* Status */}
      <Select
        label="Status"
        name="status"
        value={formData.status}
        onChange={handleChange}
        options={statusOptions}
      />

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="flex-1"
        >
          {task ? 'Zaktualizuj' : 'Dodaj'} zadanie
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={onCancel}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
