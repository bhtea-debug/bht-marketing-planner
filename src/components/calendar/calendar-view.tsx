'use client';

import React, { useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isSameDay, isSameMonth, isToday,
  startOfWeek, endOfWeek,
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
  channel: { name: string; color: string; };
}

interface CalendarViewProps {
  tasks: Task[];
  onDayClick: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDayClick }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleDayClick = (date: Date) => { setSelectedDate(date); onDayClick(date); };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, (i + 1) * 7));
  const dayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  const getTasksForDay = (date: Date) =>
    tasks.filter((task) => {
      const taskDate = task.scheduled_date instanceof Date ? task.scheduled_date : new Date(task.scheduled_date);
      return isSameDay(taskDate, date);
    });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => { setCurrentMonth(new Date()); }}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
          >
            Dziś
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {dayLabels.map((label) => (
          <div key={label} className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-2.5">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-slate-100/80 last:border-b-0">
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
                    min-h-[100px] p-1.5 border-r border-slate-100/80 last:border-r-0 cursor-pointer
                    transition-all duration-100 relative
                    ${!isCurrentMonth ? 'bg-slate-50/60' : 'bg-white hover:bg-blue-50/30'}
                    ${isSelected ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-300/60' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-center mb-1">
                    <span className={`
                      w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-medium
                      ${isTodayDate ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold shadow-md shadow-indigo-500/30' : ''}
                      ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                      ${isSelected && !isTodayDate ? 'bg-indigo-100 text-indigo-800' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {/* Tasks */}
                  <div className="space-y-0.5 px-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-1 text-[10px] leading-tight font-medium px-1.5 py-[3px] rounded-md text-white truncate"
                        style={{ backgroundColor: task.channel.color + 'dd' }}
                        title={task.title}
                      >
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-slate-400 font-medium px-1.5">
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
