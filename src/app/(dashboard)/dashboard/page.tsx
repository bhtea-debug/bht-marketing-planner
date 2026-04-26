// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles, Rocket, Megaphone, TrendingUp, Users, Wallet,
  ArrowRight, Plug, Plus, CheckCircle2, AlertCircle, Calendar as CalendarIcon,
  Brain, Activity, Radio,
} from 'lucide-react';
import Link from 'next/link';
import { HeroBanner } from '@/components/shell';

interface DashStats {
  campaignsActive: number;
  campaignsTotal: number;
  launchesPlanned: number;
  launchesNextDate?: string;
  budgetSpent: number;
  budgetPlanned: number;
  leadsCount: number;
  integrationsActive: number;
  integrationsTotal: number;
  brain?: { configured: boolean; live: boolean; sections: number };
  recentLaunches: any[];
  upcomingCampaigns: any[];
  conflicts: number;
  trends?: { count: number; last_scanned_at: string | null; top: any[] };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, l, i, b, conflicts, b2b, trends] = await Promise.all([
          fetch('/api/campaigns').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/launches').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
          fetch('/api/integrations').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/brain/status').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/launches/conflicts').then(r => r.ok ? r.json() : { conflicts: [] }).catch(() => ({ conflicts: [] })),
          fetch('/api/b2b-leads').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/trends?limit=20').then(r => r.ok ? r.json() : { count: 0, last_scanned_at: null }).catch(() => ({ count: 0, last_scanned_at: null })),
        ]);

        const launches = l?.data || [];
        const upcoming = launches.filter((x: any) => x.planned_launch_date && !['cancelled','launched'].includes(x.status))
          .sort((a: any, b: any) => (a.planned_launch_date || '').localeCompare(b.planned_launch_date || ''));

        const upcomingCampaigns = (Array.isArray(c) ? c : []).filter((x: any) => x.status === 'active').slice(0, 3);

        setStats({
          campaignsActive: (Array.isArray(c) ? c : []).filter((x: any) => x.status === 'active').length,
          campaignsTotal: (Array.isArray(c) ? c : []).length,
          launchesPlanned: upcoming.length,
          launchesNextDate: upcoming[0]?.planned_launch_date,
          budgetSpent: (Array.isArray(c) ? c : []).reduce((s: number, x: any) => s + (Number(x.budget_spent) || 0), 0),
          budgetPlanned: (Array.isArray(c) ? c : []).reduce((s: number, x: any) => s + (Number(x.budget_planned) || 0), 0),
          leadsCount: Array.isArray(b2b) ? b2b.reduce((s: number, x: any) => s + (Number(x.leads_count) || 0), 0) : 0,
          integrationsActive: (Array.isArray(i) ? i : []).filter((x: any) => x.status === 'active').length,
          integrationsTotal: 6,
          brain: b ? { configured: b.configured, live: b.live?.ok, sections: b.cache?.entries || 0 } : undefined,
          recentLaunches: upcoming.slice(0, 4),
          upcomingCampaigns,
          conflicts: (conflicts?.conflicts || []).length,
          trends: trends ? { count: trends.count || 0, last_scanned_at: trends.last_scanned_at, top: (trends.trends || []).slice(0, 5) } : { count: 0, last_scanned_at: null, top: [] },
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-7">
      {/* Hero */}
      <HeroBanner
        eyebrow="Marketing platform"
        icon={Sparkles}
        title="Witaj w BHT Planner"
        description="Centrum planowania marketingu Brown House & Tea — kampanie, launche, kanały, integracje i strategia AI w jednym miejscu."
        chips={stats ? [
          <span key="c" className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />{stats.campaignsActive} aktywnych kampanii</span>,
          <span key="l" className="inline-flex items-center gap-1.5"><Rocket size={11} />{stats.launchesPlanned} launchów w pipeline</span>,
          stats.brain?.live && <span key="b" className="inline-flex items-center gap-1.5"><Brain size={11} />Brain · {stats.brain.sections} sekcji</span>,
          stats.conflicts > 0 && <span key="cf" className="inline-flex items-center gap-1.5 text-amber-100"><AlertCircle size={11} />{stats.conflicts} kolizji</span>,
          stats.trends && stats.trends.count > 0 && <span key="tr" className="inline-flex items-center gap-1.5"><Radio size={11} />Trendy · {stats.trends.count} live</span>,
        ].filter(Boolean) : []}
        action={(
          <div className="flex gap-2">
            <Link href="/launches" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-violet-700 rounded-full text-[12px] font-semibold hover:bg-violet-50 transition-colors shadow-sm">
              Pipeline launchów <ArrowRight size={13} />
            </Link>
            <Link href="/calendar" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 text-white rounded-full text-[12px] font-semibold hover:bg-white/25 transition-colors ring-1 ring-white/30">
              Kalendarz
            </Link>
          </div>
        )}
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile icon={Megaphone} label="Aktywne kampanie" value={loading ? '—' : `${stats?.campaignsActive ?? 0}`} sub={`${stats?.campaignsTotal ?? 0} łącznie`} accent="indigo" href="/campaigns" />
        <KpiTile icon={Rocket} label="Launche w pipeline" value={loading ? '—' : `${stats?.launchesPlanned ?? 0}`} sub={stats?.launchesNextDate ? `najbliższy: ${stats.launchesNextDate}` : 'brak zaplanowanych'} accent="violet" href="/launches" />
        <KpiTile icon={Wallet} label="Budżet wydany" value={loading ? '—' : `${(stats?.budgetSpent ?? 0).toLocaleString('pl-PL')} zł`} sub={`z ${(stats?.budgetPlanned ?? 0).toLocaleString('pl-PL')} zł`} accent="emerald" href="/budget" />
        <KpiTile icon={Users} label="Leady B2B" value={loading ? '—' : `${stats?.leadsCount ?? 0}`} sub="łącznie z kampanii" accent="fuchsia" href="/b2b-leads" />
      </div>

      {/* Two-column layout: pipeline + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                <Rocket size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900">Najbliższe launche</h2>
                <p className="text-[11px] text-slate-400">{stats?.recentLaunches?.length || 0} pozycji</p>
              </div>
            </div>
            <Link href="/launches" className="text-[12px] font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
              Wszystkie <ArrowRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="p-6">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse mb-2" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse mb-2" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : (stats?.recentLaunches?.length || 0) === 0 ? (
            <div className="p-10 text-center">
              <Rocket className="w-9 h-9 text-slate-300 mx-auto mb-3" />
              <p className="text-[13px] text-slate-500">Brak zaplanowanych launchów</p>
              <Link href="/launches" className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-lg text-[12px] font-semibold shadow-sm">
                <Plus size={13} /> Dodaj launch
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats!.recentLaunches.map((l: any) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-[10px] font-bold text-violet-700 ring-1 ring-violet-200/50">
                    {(l.planned_launch_date || '').slice(5,10)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{l.name}</p>
                    <p className="text-[11px] text-slate-400">{l.category || l.launch_type || 'launch'}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column: integrations + brain status */}
        <div className="space-y-5">
          {/* Integrations summary */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Plug size={15} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-900">Integracje</h2>
                  <p className="text-[11px] text-slate-400">{stats?.integrationsActive ?? 0} z {stats?.integrationsTotal ?? 0}</p>
                </div>
              </div>
              <Link href="/integrations" className="text-[12px] font-medium text-indigo-600 hover:text-indigo-800">
                <ArrowRight size={13} />
              </Link>
            </div>
            <div className="p-4 space-y-2">
              {(stats?.integrationsActive ?? 0) > 0 ? (
                <>
                  <Pill icon={CheckCircle2} label="Meta (Facebook + Instagram)" status="ok" />
                  <Pill icon={CheckCircle2} label="GetResponse" status="ok" />
                  <Pill icon={Plus} label="Dodaj kolejną" status="add" href="/integrations" />
                </>
              ) : (
                <Link href="/integrations" className="block p-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-[12px] text-slate-500 hover:bg-slate-50 transition-colors">
                  Brak integracji — <span className="font-semibold text-indigo-600">połącz pierwszą →</span>
                </Link>
              )}
            </div>
          </div>

          {/* Brain status */}
          {stats?.brain && (
            <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-violet-500/20 overflow-hidden text-white relative">
              <div className="absolute inset-0 opacity-[0.10] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white, transparent 50%)' }} />
              <div className="relative px-5 py-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
                    <Brain size={15} />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-semibold">BH&amp;T Brain</h2>
                    <p className="text-[11px] opacity-80">baza wiedzy firmy</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[24px] font-bold tracking-tight">{stats.brain.sections}</span>
                  <span className="text-[12px] opacity-85">sekcji w cache</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${stats.brain.live ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                  <span className="opacity-90">{stats.brain.live ? 'Live · synchronizacja OK' : 'Cache · brak live ping'}</span>
                </div>
                <Link href="/integrations" className="block mt-3 text-[11.5px] font-semibold opacity-95 hover:opacity-100 inline-flex items-center gap-1">
                  Zarządzaj <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          )}

          {/* Live Trends */}
          <TrendsCard trends={stats?.trends} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-indigo-600" strokeWidth={2.2} />
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-700">Szybkie akcje</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/launches" icon={Rocket} label="Nowy launch" gradient="from-violet-500 to-purple-600" />
          <QuickAction href="/campaigns" icon={Megaphone} label="Nowa kampania" gradient="from-indigo-500 to-blue-600" />
          <QuickAction href="/calendar" icon={CalendarIcon} label="Kalendarz" gradient="from-blue-500 to-cyan-600" />
          <QuickAction href="/analytics" icon={TrendingUp} label="Analityka" gradient="from-fuchsia-500 to-pink-600" />
        </div>
      </div>
    </div>
  );
}

function TrendsCard({ trends }: any) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const lastScan = trends?.last_scanned_at;
  const ageHours = lastScan ? Math.floor((Date.now() - new Date(lastScan).getTime()) / 3600000) : null;
  const ageLabel = ageHours == null ? 'nigdy' : ageHours < 24 ? `${ageHours}h temu` : `${Math.floor(ageHours / 24)} dni temu`;
  const stale = ageHours != null && ageHours > 168; // > 7 days

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const r = await fetch('/api/trends/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (j.ok) {
        setScanResult(`Zaktualizowano: ${j.trends_count} trendów`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setScanResult('Błąd: ' + (j.error || 'unknown'));
      }
    } catch (e: any) {
      setScanResult('Błąd: ' + e.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl shadow-lg shadow-emerald-500/20 overflow-hidden text-white relative">
      <div className="absolute inset-0 opacity-[0.10] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white, transparent 50%)' }} />
      <div className="relative px-5 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
            <Radio size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold">Live trendy social</h2>
            <p className="text-[11px] opacity-80">TT · IG · FB · skan tygodniowy</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[24px] font-bold tracking-tight">{trends?.count || 0}</span>
          <span className="text-[12px] opacity-85">aktywnych trendów</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] mb-3">
          <span className={`w-1.5 h-1.5 rounded-full ${stale ? 'bg-amber-300' : 'bg-emerald-300'}`} />
          <span className="opacity-90">{stale ? `Wygasa (${ageLabel})` : `Świeże · ${ageLabel}`}</span>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-[11.5px] font-semibold transition-colors disabled:opacity-50"
        >
          {scanning ? 'Skanuję rynek... (~2 min)' : '↻ Skanuj trendy teraz'}
        </button>
        {scanResult && <p className="text-[10.5px] opacity-90 mt-2">{scanResult}</p>}
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, sub, accent, href }: any) {
  const accentMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-blue-600',
    violet: 'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
  };
  return (
    <Link href={href} className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">{label}</span>
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center shadow-md`}>
          <Icon size={13} className="text-white" strokeWidth={2.2} />
        </div>
      </div>
      <div className="text-[26px] font-bold text-slate-900 leading-none tracking-tight">{value}</div>
      <p className="text-[11.5px] text-slate-500 mt-2">{sub}</p>
    </Link>
  );
}

function Pill({ icon: Icon, label, status, href }: any) {
  const cls = status === 'ok'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
    : status === 'warn'
    ? 'bg-amber-50 text-amber-800 border-amber-100'
    : 'bg-slate-50 text-slate-600 border-dashed border-slate-200 hover:bg-slate-100';
  const Wrap = href ? Link : 'div';
  const props = href ? { href } : {};
  return (
    <Wrap {...props} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium ${cls} transition-colors`}>
      <Icon size={13} />
      <span>{label}</span>
    </Wrap>
  );
}

function QuickAction({ href, icon: Icon, label, gradient }: any) {
  return (
    <Link href={href} className="group flex items-center gap-3 p-3.5 rounded-xl bg-slate-50/60 hover:bg-white border border-slate-200/60 hover:border-indigo-200/80 hover:shadow-md transition-all">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
        <Icon size={16} className="text-white" strokeWidth={2.2} />
      </div>
      <span className="text-[13px] font-semibold text-slate-900">{label}</span>
      <ArrowRight size={13} className="ml-auto text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
