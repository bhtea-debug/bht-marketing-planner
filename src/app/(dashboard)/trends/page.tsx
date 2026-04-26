// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { Radio, Sparkles, AlertTriangle, Zap, Target, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/shell';

export default function TrendsPage() {
  const [playbook, setPlaybook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [allTrends, setAllTrends] = useState<any[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPlaybook() {
    setLoading(true);
    try {
      const r = await fetch('/api/trends/playbook');
      if (r.ok) setPlaybook(await r.json());
      else setError(`Brak playbooka — uruchom skan trendów najpierw.`);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadAllTrends() {
    try {
      const r = await fetch('/api/trends?limit=100');
      if (r.ok) {
        const j = await r.json();
        setAllTrends(j.trends || []);
        setLastScan(j.last_scanned_at);
      }
    } catch {}
  }

  useEffect(() => { loadPlaybook(); loadAllTrends(); }, []);

  async function regenerate() {
    setGenerating(true); setError(null);
    try {
      const r = await fetch('/api/trends/playbook', { method: 'POST' });
      if (r.ok) setPlaybook(await r.json());
      else { const j = await r.json(); setError(j.error || 'Błąd generowania'); }
    } catch (e: any) { setError(e.message); }
    finally { setGenerating(false); }
  }

  async function runScan() {
    setScanning(true); setError(null);
    try {
      const r = await fetch('/api/trends/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (j.ok) {
        await loadAllTrends();
        await regenerate();
      } else setError(j.error || 'Skan nieudany');
    } catch (e: any) { setError(e.message); }
    finally { setScanning(false); }
  }

  const scanAge = lastScan ? Math.floor((Date.now() - new Date(lastScan).getTime()) / 3600000) : null;
  const scanLabel = scanAge == null ? 'nigdy' : scanAge < 24 ? `${scanAge}h temu` : `${Math.floor(scanAge / 24)} dni temu`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pulse"
        icon={Radio}
        title="Trendy & playbook"
        description={`Co dzieje się TERAZ w marketingu, jak to ograć, jaki plan na 4 tygodnie. Skan: ${scanLabel}.`}
        actions={(
          <>
            <button
              onClick={regenerate}
              disabled={generating || scanning}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50"
              title="Odśwież playbook bez ponownego skanu trendów"
            >
              <RefreshCw size={13} className={generating ? 'animate-spin' : ''} /> {generating ? 'Generuję...' : 'Odśwież playbook'}
            </button>
            <button
              onClick={runScan}
              disabled={scanning || generating}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-3.5 py-2 rounded-lg text-[12.5px] font-semibold shadow-sm disabled:opacity-50"
            >
              <Radio size={13} className={scanning ? 'animate-pulse' : ''} /> {scanning ? 'Skanuję rynek...' : '↻ Pełny skan + playbook'}
            </button>
          </>
        )}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-800">
          {error}
        </div>
      )}

      {loading && !playbook && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-slate-500 mt-4">Ładuję playbook...</p>
        </div>
      )}

      {!loading && !playbook && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Radio size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-[15px] font-semibold text-slate-900 mb-1">Brak playbooka</h3>
          <p className="text-[13px] text-slate-500 mb-4">Uruchom pierwszy skan trendów żeby otrzymać konkretny plan działań.</p>
          <button onClick={runScan} disabled={scanning} className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 text-white px-4 py-2 rounded-lg text-[13px] font-semibold shadow-md">
            {scanning ? 'Skanuję...' : '↻ Skanuj trendy + zbuduj playbook'}
          </button>
        </div>
      )}

      {playbook && (
        <>
          {/* HEADLINE */}
          <section className="relative overflow-hidden rounded-2xl text-white shadow-md" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)' }}>
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 80%, white 0%, transparent 35%)' }} />
            <div className="relative px-6 py-7 md:px-8 md:py-7">
              <div className="flex items-center gap-2 mb-2 opacity-90">
                <Sparkles size={14} />
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase">Diagnoza rynku · {playbook.based_on_trends} trendów</span>
              </div>
              <h2 className="text-[20px] md:text-[24px] font-bold leading-tight max-w-3xl">{playbook.headline}</h2>
            </div>
          </section>

          {/* TOP TRENDS FOR BHT */}
          <Section icon={Target} label="Trendy które są hot dla BHT teraz" subtitle={`${(playbook.top_trends_for_bht || []).length} priorytetów`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(playbook.top_trends_for_bht || []).map((t: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-bold text-slate-900 leading-tight">{t.trend}</h3>
                      <p className="text-[12px] text-slate-500 mt-1.5"><b className="text-violet-700">Dlaczego BHT:</b> {t.why_for_bht}</p>
                      <p className="text-[12.5px] text-slate-700 mt-3 bg-violet-50/60 rounded-lg p-2.5 leading-relaxed">
                        <b className="text-violet-800">→ Konkret:</b> {t.concrete_action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* QUICK WINS */}
          <Section icon={Zap} iconColor="text-emerald-600" label="Quick wins ten tydzień" subtitle="zerowy budżet, max efekt">
            <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-2xl p-5">
              <ol className="space-y-2.5">
                {(playbook.quick_wins_this_week || []).map((q: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-[13px] text-slate-800 leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Section>

          {/* 4 WEEK PLAN */}
          <Section icon={Sparkles} label="Plan 4-tygodniowy" subtitle="tydzień po tygodniu — co robimy">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(playbook.four_week_plan || []).map((w: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">{w.week_label}</div>
                    <div className="text-[14px] font-semibold text-slate-900 mt-0.5">{w.theme}</div>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {(w.actions || []).map((a: string, ai: number) => (
                        <li key={ai} className="text-[12.5px] text-slate-700 leading-relaxed flex gap-2">
                          <span className="text-indigo-500 flex-shrink-0">▸</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* AVOID NOW */}
          <Section icon={AlertTriangle} iconColor="text-red-600" label="Czego nie robić" subtitle="anti-trends 2026">
            <div className="bg-red-50/40 border border-red-200/60 rounded-2xl p-5">
              <ul className="space-y-2.5">
                {(playbook.avoid_now || []).map((a: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-[13px] text-slate-800">
                    <span className="text-red-500 font-bold flex-shrink-0">✕</span>
                    <span className="leading-relaxed">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          {/* WSZYSTKIE TRENDY (collapsed) */}
          <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
            <button onClick={() => setShowAllTrends((v) => !v)} className="w-full px-5 py-3 flex items-center gap-2 hover:bg-slate-50 transition-colors text-left">
              <Radio size={14} className="text-slate-500 flex-shrink-0" />
              <span className="text-[12.5px] font-semibold text-slate-700">Pełna lista {allTrends.length} trendów (raw data)</span>
              <span className="text-[11px] text-slate-400 ml-auto">{showAllTrends ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
            </button>
            {showAllTrends && (
              <div className="border-t border-slate-100 max-h-[600px] overflow-y-auto">
                {allTrends.map((t: any, i: number) => (
                  <div key={i} className="px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{t.platform}</span>
                        <span className="text-[11px] font-bold text-violet-700 mt-0.5">{t.relevance_score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold text-slate-900">{t.title}</div>
                        <div className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">{t.description}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex-shrink-0">{t.kind}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Section({ icon: Icon, iconColor = 'text-indigo-600', label, subtitle, children }: any) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        {Icon && <Icon size={15} className={`${iconColor} flex-shrink-0`} strokeWidth={2.2} />}
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-700">{label}</span>
        {subtitle && (<><span className="text-slate-300">·</span><span className="text-[11.5px] text-slate-400 font-medium lowercase tracking-wide">{subtitle}</span></>)}
      </div>
      {children}
    </section>
  );
}
