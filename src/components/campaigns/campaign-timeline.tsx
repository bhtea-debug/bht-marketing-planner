// @ts-nocheck
'use client';

import React, { useMemo, useState } from 'react';

type CampaignStatus = 'Szkic' | 'Aktywne' | 'Zakończone' | 'Wstrzymane';

interface Campaign {
  id: string;
  name: string;
  description: string;
  channelName: string;
  channelColor: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budgetPlanned: number;
  budgetSpent: number;
  tasksDone: number;
  tasksTotal: number;
}

interface CampaignTimelineProps {
  campaigns: Campaign[];
}

const STATUS_ICONS: Record<CampaignStatus, { bg: string; ring: string; label: string }> = {
  'Szkic':       { bg: 'bg-slate-400',   ring: 'ring-slate-200', label: 'Szkic' },
  'Aktywne':     { bg: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Aktywne' },
  'Zakończone':  { bg: 'bg-blue-500',    ring: 'ring-blue-200', label: 'Zakończone' },
  'Wstrzymane':  { bg: 'bg-amber-500',   ring: 'ring-amber-200', label: 'Wstrzymane' },
};

const MONTH_NAMES_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

function getDaysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDatePL(d: string) {
  const date = new Date(d);
  return `${date.getDate()} ${MONTH_NAMES_PL[date.getMonth()]}`;
}

export default function CampaignTimeline({ campaigns }: CampaignTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { timelineStart, timelineEnd, totalDays, months, sortedCampaigns } = useMemo(() => {
    if (campaigns.length === 0) {
      const now = new Date();
      return {
        timelineStart: now,
        timelineEnd: new Date(now.getFullYear(), now.getMonth() + 3, 0),
        totalDays: 90,
        months: [],
        sortedCampaigns: [],
      };
    }

    const allStarts = campaigns.map(c => new Date(c.startDate));
    const allEnds = campaigns.map(c => new Date(c.endDate));

    // Start from beginning of earliest month, end at end of latest month + some padding
    const earliest = new Date(Math.min(...allStarts.map(d => d.getTime())));
    const latest = new Date(Math.max(...allEnds.map(d => d.getTime())));

    const tStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const tEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 0);

    // Add padding: 1 week before, 1 week after
    const paddedStart = new Date(tStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const paddedEnd = new Date(tEnd.getTime() + 14 * 24 * 60 * 60 * 1000);

    const total = getDaysBetween(paddedStart, paddedEnd);

    // Generate month markers
    const monthMarkers: { name: string; year: number; left: number; width: number }[] = [];
    let current = new Date(tStart);
    while (current <= paddedEnd) {
      const monthStart = new Date(current);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const effectiveStart = monthStart < paddedStart ? paddedStart : monthStart;
      const effectiveEnd = monthEnd > paddedEnd ? paddedEnd : monthEnd;

      const left = (getDaysBetween(paddedStart, effectiveStart) / total) * 100;
      const width = (getDaysBetween(effectiveStart, effectiveEnd) / total) * 100;

      monthMarkers.push({
        name: MONTH_NAMES_PL[current.getMonth()],
        year: current.getFullYear(),
        left,
        width,
      });

      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    // Sort: active first, then by start date
    const statusOrder: Record<string, number> = { 'Aktywne': 0, 'Szkic': 1, 'Wstrzymane': 2, 'Zakończone': 3 };
    const sorted = [...campaigns].sort((a, b) => {
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    return {
      timelineStart: paddedStart,
      timelineEnd: paddedEnd,
      totalDays: total,
      months: monthMarkers,
      sortedCampaigns: sorted,
    };
  }, [campaigns]);

  // Today marker
  const today = new Date();
  const todayPosition = (getDaysBetween(timelineStart, today) / totalDays) * 100;
  const showToday = todayPosition >= 0 && todayPosition <= 100;

  function getBarStyle(campaign: Campaign) {
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    const left = Math.max(0, (getDaysBetween(timelineStart, start) / totalDays) * 100);
    const right = Math.min(100, (getDaysBetween(timelineStart, end) / totalDays) * 100);
    const width = right - left;
    return { left: `${left}%`, width: `${Math.max(width, 0.8)}%` };
  }

  function getProgressWidth(campaign: Campaign) {
    if (campaign.tasksTotal === 0) return 0;
    return (campaign.tasksDone / campaign.tasksTotal) * 100;
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
        <p className="text-slate-400 text-sm">Brak kampanii do wyświetlenia na osi czasu</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Legend */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {Object.entries(STATUS_ICONS).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${config.bg}`} />
              <span className="text-[11px] text-slate-500 font-medium">{config.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-[2px] h-3.5 bg-rose-500 rounded-full" />
          <span className="text-[11px] text-slate-500 font-medium">Dziś</span>
        </div>
      </div>

      {/* Timeline body */}
      <div className="relative">
        {/* Month headers */}
        <div className="relative h-10 border-b border-slate-100 bg-slate-50/60">
          {months.map((m, i) => (
            <div
              key={`${m.name}-${m.year}-${i}`}
              className="absolute top-0 h-full flex items-center border-r border-slate-100 last:border-r-0"
              style={{ left: `${m.left}%`, width: `${m.width}%` }}
            >
              <span className="pl-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                {m.name}
                {(i === 0 || m.name === 'Sty') && (
                  <span className="ml-1 text-slate-400 font-normal">{m.year}</span>
                )}
              </span>
            </div>
          ))}
          {/* Today line in header */}
          {showToday && (
            <div
              className="absolute top-0 h-full w-[2px] bg-rose-500 z-10"
              style={{ left: `${todayPosition}%` }}
            />
          )}
        </div>

        {/* Rows */}
        <div className="relative">
          {/* Vertical month guides */}
          {months.map((m, i) => (
            <div
              key={`guide-${i}`}
              className="absolute top-0 h-full border-r border-slate-50"
              style={{ left: `${m.left + m.width}%` }}
            />
          ))}

          {/* Today vertical line */}
          {showToday && (
            <div
              className="absolute top-0 h-full w-[2px] bg-rose-500/20 z-[1]"
              style={{ left: `${todayPosition}%` }}
            >
              <div className="absolute top-0 left-[-3px] w-2 h-2 rounded-full bg-rose-500" />
            </div>
          )}

          {sortedCampaigns.map((campaign, index) => {
            const barStyle = getBarStyle(campaign);
            const progress = getProgressWidth(campaign);
            const isHovered = hoveredId === campaign.id;
            const statusStyle = STATUS_ICONS[campaign.status];

            return (
              <div
                key={campaign.id}
                className={`relative flex items-center h-[68px] border-b border-slate-50 transition-colors duration-150 ${
                  isHovered ? 'bg-slate-50/80' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
                onMouseEnter={() => setHoveredId(campaign.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Campaign bar */}
                <div className="absolute inset-0">
                  <div
                    className="absolute top-[14px] h-[40px] rounded-lg cursor-pointer transition-all duration-200 group"
                    style={{
                      ...barStyle,
                      backgroundColor: `${campaign.channelColor}10`,
                      border: `1.5px solid ${campaign.channelColor}30`,
                      ...(isHovered ? {
                        backgroundColor: `${campaign.channelColor}18`,
                        border: `1.5px solid ${campaign.channelColor}50`,
                        boxShadow: `0 2px 8px ${campaign.channelColor}15`,
                      } : {}),
                    }}
                  >
                    {/* Progress fill */}
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-l-lg transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: `${campaign.channelColor}20`,
                        borderRight: progress > 0 && progress < 100 ? `1px dashed ${campaign.channelColor}40` : 'none',
                        borderRadius: progress >= 100 ? '7px' : '7px 0 0 7px',
                      }}
                    />

                    {/* Bar content */}
                    <div className="relative h-full flex items-center gap-2 px-3 overflow-hidden z-[2]">
                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusStyle.bg} ring-2 ${statusStyle.ring}`} />

                      {/* Name */}
                      <span className="text-[12px] font-semibold text-slate-800 truncate leading-none">
                        {campaign.name}
                      </span>

                      {/* Channel badge */}
                      <span
                        className="ml-auto flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{
                          color: campaign.channelColor,
                          backgroundColor: `${campaign.channelColor}12`,
                        }}
                      >
                        {campaign.channelName}
                      </span>
                    </div>

                    {/* Hover tooltip */}
                    {isHovered && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white rounded-lg p-3 shadow-xl z-50 pointer-events-none"
                        style={{ minWidth: '220px' }}
                      >
                        <div className="text-[13px] font-semibold mb-1.5">{campaign.name}</div>
                        <div className="text-[11px] text-slate-400 mb-2">{campaign.description}</div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                          <div className="text-slate-500">Kanał</div>
                          <div className="font-medium" style={{ color: campaign.channelColor }}>{campaign.channelName}</div>

                          <div className="text-slate-500">Okres</div>
                          <div className="font-medium text-slate-300">{formatDatePL(campaign.startDate)} — {formatDatePL(campaign.endDate)}</div>

                          <div className="text-slate-500">Budżet</div>
                          <div className="font-medium text-slate-300">
                            {campaign.budgetSpent.toLocaleString()} / {campaign.budgetPlanned.toLocaleString()} PLN
                          </div>

                          <div className="text-slate-500">Zadania</div>
                          <div className="font-medium text-slate-300">
                            {campaign.tasksDone}/{campaign.tasksTotal}
                            <span className="ml-1 text-slate-500">({progress.toFixed(0)}%)</span>
                          </div>

                          <div className="text-slate-500">Status</div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.bg}`} />
                            <span className="font-medium text-slate-300">{campaign.status}</span>
                          </div>
                        </div>

                        {/* Progress bar in tooltip */}
                        <div className="mt-2.5 pt-2 border-t border-slate-700">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span>Postęp zadań</span>
                            <span className="text-slate-400 font-medium">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: campaign.channelColor,
                              }}
                            />
                          </div>
                        </div>

                        {/* Tooltip arrow */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-900" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>
              <span className="font-semibold text-slate-700">{campaigns.length}</span> kampanii
            </span>
            <span className="text-slate-300">•</span>
            <span>
              <span className="font-semibold text-emerald-600">{campaigns.filter(c => c.status === 'Aktywne').length}</span> aktywnych
            </span>
            <span className="text-slate-300">•</span>
            <span>
              <span className="font-semibold text-slate-700">
                {campaigns.reduce((acc, c) => acc + c.budgetPlanned, 0).toLocaleString()} PLN
              </span> łączny budżet
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {formatDatePL(timelineStart.toISOString())} — {formatDatePL(timelineEnd.toISOString())}
          </div>
        </div>
      </div>
    </div>
  );
}
