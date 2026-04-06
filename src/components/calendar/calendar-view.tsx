'use client';

import React, { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/button';

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

interface CalendarViewProps {
  tasks: Task[];
  onDayClick: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDayClick }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    onDayClick(date);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) =>
    days.slice(i * 7, (i + 1) * 7)
  );

  const dayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  const getTasksForDay = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = task.scheduled_date instanceof Date
        ? task.scheduled_date
        : new Date(task.scheduled_date);
      return isSameDay(taskDate, date);
    });
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-stone-900">
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="p-2"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="p-2"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {dayLabels.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-semibold text-stone-600 py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-px border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((day, dayIndex) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-24 p-2 border-r border-b border-stone-200 cursor-pointer
                    transition-colors duration-150
                    ${!isCurrentMonth ? 'bg-stone-100' : 'bg-white hover:bg-amber-50'}
                    ${isTodayDate ? 'ring-2 ring-inset ring-amber-700 bg-amber-50' : ''}
                    ${isSelected ? 'bg-amber-100 ring-2 ring-inset ring-amber-700' : ''}
                    ${dayIndex === 6 ? 'border-r-0' : ''}
                    ${weekIndex === weeks.length - 1 ? 'border-b-0' : ''}
                  `}
                >
                  <div
                    className={`
                      text-sm font-semibold mb-1
                      ${!isCurrentMonth ? 'text-stone-400' : 'text-stone-900'}
                    `}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="text-xs font-medium px-2 py-1 rounded text-white truncate"
                        style={{ backgroundColor: task.channel.color }}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-stone-600 px-2">
                        +{dayTasks.length - 3} więcej
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
