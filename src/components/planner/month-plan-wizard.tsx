// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle, Send, Palette, Wand2, Rocket, Trash2, Save } from 'lucide-react';

interface Props {
  initialMonth?: string; // 'YYYY-MM'
  onClose: () => void;
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export default function MonthPlanWizard({ initialMonth, onClose }: Props) {
  const todayMonth = new Date().toISOString().slice(0, 7);
  const [step, setStep] = useState<'config' | 'generating' | 'review' | 'saving' | 'done' | 'error'>(
    'config'
  );
  const [month, setMonth] = useState(initialMonth || todayMonth);
  const [accountId, setAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [debug, setDebug] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushResults, setPushResults] = useState<Record<string, any>>({});
  // week-by-week generation progress
  const [weekQueue, setWeekQueue] = useState<number[]>([]);
  const [weekDoneCount, setWeekDoneCount] = useState(0);
  const [weekCurrent, setWeekCurrent] = useState<number | null>(null);
  const [weekErrors, setWeekErrors] = useState<Record<number, string>>({});
  const [sharedContext, setSharedContext] = useState<any>(null);
  // selection just gates the bulk-deploy action below
  const [selectedWeeks, setSelectedWeeks] = useState<Record<number, boolean>>({});
  // which weeks have been deployed (campaigns + tasks created)
  const [deployedWeeks, setDeployedWeeks] = useState<Record<number, { ok: boolean; error?: string; createdCount?: number }>>({});
  // which week is currently being deployed (for spinner)
  const [deployingWeek, setDeployingWeek] = useState<number | null>(null);
  // open AI-refine prompt input for this isoWeek (null = closed)
  const [refineOpenFor, setRefineOpenFor] = useState<number | null>(null);
  const [refinePrompt, setRefinePrompt] = useState<string>('');
  const [refiningWeek, setRefiningWeek] = useState<number | null>(null);
  // wipe-data confirmation
  const [wiping, setWiping] = useState<boolean>(false);
  const [wipeMsg, setWipeMsg] = useState<string | null>(null);
  // ----- DRAFTS (persistence between sessions) -----
  const [drafts, setDrafts] = useState<any[]>([]); // list for current month
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [loadingDraftId, setLoadingDraftId] = useState<number | null>(null);

  function toggleWeek(isoWeek: number) {
    setSelectedWeeks((prev) => ({ ...prev, [isoWeek]: !(prev[isoWeek] ?? true) }));
  }
  function setAllWeeks(value: boolean) {
    if (!plan?.weeks) return;
    const next: Record<number, boolean> = {};
    for (const w of plan.weeks) next[w.isoWeek] = value;
    setSelectedWeeks(next);
  }
  // patch a single field on a single week (immutable update)
  function updateWeek(isoWeek: number, patch: any) {
    setPlan((prev: any) => ({
      ...prev,
      weeks: (prev?.weeks || []).map((w: any) =>
        w.isoWeek === isoWeek ? { ...w, ...patch } : w
      ),
    }));
  }
  // patch a single channel inside a week
  function updateChannel(isoWeek: number, channelIdx: number, patch: any) {
    setPlan((prev: any) => ({
      ...prev,
      weeks: (prev?.weeks || []).map((w: any) => {
        if (w.isoWeek !== isoWeek) return w;
        return {
          ...w,
          channels: (w.channels || []).map((c: any, i: number) =>
            i === channelIdx ? { ...c, ...patch } : c
          ),
        };
      }),
    }));
  }
  // wipe all campaigns + tasks (DEV cleanup)
  async function wipeAllCampaignsAndTasks() {
    if (!confirm('Na pewno wyczyścić WSZYSTKIE kampanie i zadania kalendarza? Tej operacji nie da się cofnąć.')) return;
    setWiping(true);
    setWipeMsg(null);
    try {
      const r = await fetch('/api/admin/wipe-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'YES' }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      const c = j.deleted || {};
      setWipeMsg(`Wyczyszczono: kampanie ${c.campaigns ?? '?'}, zadania ${c.tasks ?? '?'}, budget ${c.budget_entries ?? '?'}, KPI ${c.kpi_entries ?? '?'}`);
    } catch (e: any) {
      setWipeMsg('Błąd: ' + e.message);
    } finally {
      setWiping(false);
    }
  }

  // ----- DRAFT PERSISTENCE HELPERS -----
  // Snapshot of everything we need to restore the wizard later.
  function buildDraftPayload() {
    return {
      version: 1,
      month,
      accountId,
      plan,
      sharedContext,
      selectedWeeks,
      deployedWeeks,
      weekErrors,
      // we intentionally do NOT persist transient UI state (refineOpenFor etc.)
    };
  }

  async function fetchDraftsForMonth(m: string) {
    try {
      const r = await fetch(`/api/planner/drafts?month=${encodeURIComponent(m)}`);
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      setDrafts(j.data || []);
    } catch (e: any) {
      console.warn('[drafts:list]', e.message);
      setDrafts([]);
    }
  }

  async function saveDraft(opts?: { silent?: boolean; nameOverride?: string }) {
    if (!plan) {
      if (!opts?.silent) setDraftMsg('Brak planu do zapisania.');
      return;
    }
    setSavingDraft(true);
    setDraftMsg(null);
    try {
      const weeksCount = (plan.weeks || []).length;
      const deployedCount = Object.values(deployedWeeks).filter((d: any) => d?.ok).length;
      const status =
        deployedCount === 0
          ? 'draft'
          : deployedCount >= weeksCount && weeksCount > 0
            ? 'deployed'
            : 'partial';
      const body = {
        id: currentDraftId || undefined,
        month,
        name:
          opts?.nameOverride ??
          `Plan ${month} • ${new Date().toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
        payload: buildDraftPayload(),
        weeks_count: weeksCount,
        deployed_count: deployedCount,
        status,
      };
      const r = await fetch('/api/planner/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      const newId = j?.data?.id || currentDraftId;
      if (newId) setCurrentDraftId(newId);
      if (!opts?.silent) setDraftMsg(`✓ Zapisano draft (${weeksCount} tyg., ${deployedCount} wdrożonych)`);
      // refresh list
      fetchDraftsForMonth(month);
    } catch (e: any) {
      setDraftMsg('Błąd zapisu draftu: ' + e.message);
    } finally {
      setSavingDraft(false);
    }
  }

  async function loadDraft(id: number) {
    setLoadingDraftId(id);
    setDraftMsg(null);
    try {
      const r = await fetch(`/api/planner/drafts/${id}`);
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      const d = j.data;
      const p = d.payload || {};
      setCurrentDraftId(d.id);
      if (p.month) setMonth(p.month);
      if (p.accountId) setAccountId(p.accountId);
      if (p.plan) setPlan(p.plan);
      if (p.sharedContext) setSharedContext(p.sharedContext);
      if (p.selectedWeeks) setSelectedWeeks(p.selectedWeeks);
      if (p.deployedWeeks) setDeployedWeeks(p.deployedWeeks);
      if (p.weekErrors) setWeekErrors(p.weekErrors);
      // jump straight to review
      setStep('review');
      setDraftMsg(`Wczytano draft #${d.id}`);
    } catch (e: any) {
      setDraftMsg('Błąd wczytywania: ' + e.message);
    } finally {
      setLoadingDraftId(null);
    }
  }

  async function deleteDraft(id: number) {
    if (!confirm('Usunąć ten draft? Tej operacji nie da się cofnąć.')) return;
    try {
      const r = await fetch(`/api/planner/drafts/${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      if (currentDraftId === id) setCurrentDraftId(null);
      fetchDraftsForMonth(month);
      setDraftMsg(`Usunięto draft #${id}`);
    } catch (e: any) {
      setDraftMsg('Błąd usuwania: ' + e.message);
    }
  }

  // re-generate a single week with extra instructions
  async function refineWeekWithAI(isoWeek: number) {
    const instructions = refinePrompt.trim();
    if (!instructions) return;
    const currentWeek = (plan?.weeks || []).find((w: any) => w.isoWeek === isoWeek);
    if (!currentWeek) return;
    setRefiningWeek(isoWeek);
    try {
      const r = await fetch('/api/planner/week-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          isoWeek,
          context: sharedContext,
          additionalInstructions: instructions,
          currentWeek,
        }),
      });
      let j: any = null;
      try { j = await parseStreamedJSON(r); } catch (e: any) {
        throw new Error('parse: ' + e.message);
      }
      if (!r.ok || j?.error || !j?.data?.week) {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const wk = j.data.week;
      // replace the week in-place (preserve insertion order)
      setPlan((prev: any) => ({
        ...prev,
        weeks: (prev?.weeks || []).map((w: any) =>
          w.isoWeek === isoWeek ? wk : w
        ),
      }));
      setRefinePrompt('');
      setRefineOpenFor(null);
    } catch (e: any) {
      alert('Nie udało się poprawić tygodnia: ' + e.message);
    } finally {
      setRefiningWeek(null);
    }
  }
  // deploy ONE week: creates draft campaigns + linked calendar tasks
  async function acceptAndDeployWeek(isoWeek: number) {
    const wk = (plan?.weeks || []).find((w: any) => w.isoWeek === isoWeek);
    if (!wk) return;
    if (!confirm(`Wdrożyć tydzień ${isoWeek} (${wk.label || ''}) jako kampanie draft + zadania kalendarza? Po wdrożeniu możesz nadal edytować je w widoku Kampanie.`)) return;
    setDeployingWeek(isoWeek);
    try {
      const r = await fetch('/api/planner/month-plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: { ...plan, weeks: [wk] }, month }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      setDeployedWeeks((prev) => ({
        ...prev,
        [isoWeek]: { ok: true, createdCount: j.data?.createdCount || 0 },
      }));
    } catch (e: any) {
      setDeployedWeeks((prev) => ({ ...prev, [isoWeek]: { ok: false, error: e.message } }));
    } finally {
      setDeployingWeek(null);
    }
  }

  // Parse a streamed response: heartbeat spaces followed by '\n' + final JSON.
  // Falls back to plain JSON if no newline found (backwards compat).
  async function parseStreamedJSON(r: Response): Promise<any> {
    const raw = await r.text();
    const lastNewline = raw.lastIndexOf('\n');
    const jsonPart = lastNewline >= 0 ? raw.slice(lastNewline + 1) : raw;
    try {
      return JSON.parse(jsonPart);
    } catch {
      // not JSON — bubble up so caller can show snippet
      throw new Error(jsonPart.slice(0, 200) || raw.slice(0, 200) || 'empty response');
    }
  }

  // ----- ISO week helpers (mirror of server-side) -----
  function isoWeekNum(d: Date): number {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
  function futureIsoWeeksOfMonth(monthYYYYMM: string): number[] {
    const [yStr, mStr] = monthYYYYMM.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0));
    const weeks: number[] = [];
    for (let d = new Date(monthStart); d <= monthEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const w = isoWeekNum(d);
      if (!weeks.includes(w)) weeks.push(w);
    }
    const today = new Date();
    const currentWeek = isoWeekNum(today);
    return weeks.filter((w) => w >= currentWeek);
  }

  function pushKey(wi: number, ci: number) {
    return `${wi}-${ci}`;
  }

  async function pushChannel(week: any, ch: any, wi: number, ci: number) {
    const key = pushKey(wi, ci);
    setPushing(key);
    try {
      const isMeta = (ch.channel || '').toLowerCase().includes('meta');
      const isEmail = (ch.channel || '').toLowerCase().includes('email');
      const heroNames = (week.hero_products || []).map((p: any) => p.name || p);
      const linkUrl = ch.link_url || 'https://brownhouseandtea.pl';

      if (isMeta) {
        const r = await fetch('/api/push/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tile: {
              campaign_name: `[Planner] ${week.label || 'W' + week.isoWeek} - ${ch.format}`,
              adset_name: `${week.theme || 'BHT'} - ${ch.audience || 'broad'}`,
              ad_name: (ch.creative_hook || '').slice(0, 60),
              headline: ch.creative_hook || ch.headline || week.theme,
              body: ch.body || ch.creative_hook,
              cta: 'SHOP_NOW',
              link_url: linkUrl,
              audience_hint: ch.audience,
              budget_pln: Number(ch.budget_pln || 0),
              creative_format: (ch.format || '').includes('video') ? 'video' : 'single_image',
              hero_products: heroNames,
              start_date: week.start_date || null,
              end_date: week.end_date || null,
            },
            status: 'PAUSED',
            source_ref: `${month}-w${week.isoWeek}-c${ci}`,
          }),
        });
        const j = await r.json();
        setPushResults((prev) => ({ ...prev, [key]: r.ok ? j.data : { error: j.error } }));
      } else if (isEmail) {
        const r = await fetch('/api/push/getresponse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tile: {
              subject: ch.creative_hook || `${week.theme}`,
              headline: week.theme,
              body: ch.creative_hook || week.rationale,
              link_url: linkUrl,
              cta_label: ch.cta || 'Sprawdź',
              internal_name: `[Planner] ${week.label || 'W' + week.isoWeek}`,
            },
            source_ref: `${month}-w${week.isoWeek}-c${ci}`,
          }),
        });
        const j = await r.json();
        setPushResults((prev) => ({ ...prev, [key]: r.ok ? j.data : { error: j.error } }));
      } else {
        setPushResults((prev) => ({ ...prev, [key]: { error: 'Push obsługiwany tylko dla meta_* i email' } }));
      }
    } catch (e: any) {
      setPushResults((prev) => ({ ...prev, [key]: { error: e.message } }));
    } finally {
      setPushing(null);
    }
  }

  // Load Meta ad accounts on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/meta/ads/accounts');
        if (r.ok) {
          const j = await r.json();
          const list = j?.data || [];
          setAccounts(list);
          if (list[0]) setAccountId(list[0].id);
        }
      } catch {}
    })();
  }, []);

  // Re-fetch drafts whenever the selected month changes (or wizard opens).
  useEffect(() => {
    if (month) fetchDraftsForMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function generate() {
    setError(null);
    setWeekErrors({});
    setWeekDoneCount(0);
    setPlan(null);
    setDebug(null);
    setSelectedWeeks({});

    const weeks = futureIsoWeeksOfMonth(month);
    if (weeks.length === 0) {
      setError('Brak nadchodzących tygodni w tym miesiącu (wszystkie minęły).');
      setStep('error');
      return;
    }

    setWeekQueue(weeks);
    setStep('generating');

    // Step 1: fetch the heavy shared context ONCE (Meta + Woo + brand + launches)
    let sharedContext: any = null;
    try {
      const cr = await fetch('/api/planner/plan-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, accountId }),
      });
      const cj = await cr.json();
      if (!cr.ok) throw new Error(cj.error || 'plan-context failed');
      sharedContext = cj.data;
      setSharedContext(sharedContext);
    } catch (e: any) {
      setError('Nie udało się pobrać kontekstu (Meta/Woo/brand): ' + e.message);
      setStep('error');
      return;
    }

    // Seed an empty plan that we'll fill week-by-week
    const seed: any = {
      summary: `Plan tygodniowy dla ${month}`,
      totalBudget: 0,
      weeks: [],
      warnings: [],
      next_actions: [],
    };
    setPlan(seed);
    // Switch to review immediately so user sees progress + tiles as they arrive
    setStep('review');

    let runningTotal = 0;
    for (const w of weeks) {
      setWeekCurrent(w);
      try {
        const r = await fetch('/api/planner/week-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, isoWeek: w, context: sharedContext }),
        });
        let j: any = null;
        try {
          j = await parseStreamedJSON(r);
        } catch (parseErr: any) {
          setWeekErrors((prev) => ({
            ...prev,
            [w]: `HTTP ${r.status} (parse): ${parseErr.message}`,
          }));
          continue;
        }
        // Streaming endpoint always returns 200; check the body for error.
        if (!r.ok || j?.error || !j?.data?.week) {
          const detail = j?.error || `HTTP ${r.status}`;
          const extra = j?.parseError ? ` | parse: ${j.parseError}` : '';
          const rawSnip = j?.raw
            ? ` | raw: ${String(j.raw).slice(0, 300).replace(/\s+/g, ' ')}`
            : '';
          setWeekErrors((prev) => ({ ...prev, [w]: detail + extra + rawSnip }));
        } else {
          const wk = j.data.week;
          runningTotal += Number(wk?.weekly_budget_pln || 0);
          setPlan((prev: any) => ({
            ...prev,
            totalBudget: runningTotal,
            weeks: [...(prev?.weeks || []), wk],
          }));
          // default: new week is selected for save
          setSelectedWeeks((prev) => ({ ...prev, [wk?.isoWeek ?? w]: true }));
        }
      } catch (e: any) {
        setWeekErrors((prev) => ({ ...prev, [w]: e.message }));
      } finally {
        setWeekDoneCount((c) => c + 1);
      }
    }

    setWeekCurrent(null);
  }

  async function retryFailedWeeks() {
    const failed = Object.keys(weekErrors).map(Number);
    if (failed.length === 0) return;
    setWeekErrors({});
    let runningTotal = Number(plan?.totalBudget || 0);
    for (const w of failed) {
      setWeekCurrent(w);
      try {
        const r = await fetch('/api/planner/week-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, isoWeek: w, context: sharedContext }),
        });
        let j: any = null;
        try {
          j = await parseStreamedJSON(r);
        } catch (parseErr: any) {
          setWeekErrors((prev) => ({
            ...prev,
            [w]: `HTTP ${r.status} (parse): ${parseErr.message}`,
          }));
          continue;
        }
        // Streaming endpoint always returns 200; check the body for error.
        if (!r.ok || j?.error || !j?.data?.week) {
          const detail = j?.error || `HTTP ${r.status}`;
          const extra = j?.parseError ? ` | parse: ${j.parseError}` : '';
          const rawSnip = j?.raw
            ? ` | raw: ${String(j.raw).slice(0, 300).replace(/\s+/g, ' ')}`
            : '';
          setWeekErrors((prev) => ({ ...prev, [w]: detail + extra + rawSnip }));
        } else {
          const wk = j.data.week;
          runningTotal += Number(wk?.weekly_budget_pln || 0);
          setPlan((prev: any) => ({
            ...prev,
            totalBudget: runningTotal,
            weeks: [...(prev?.weeks || []), wk].sort(
              (a: any, b: any) => (a.isoWeek || 0) - (b.isoWeek || 0)
            ),
          }));
          setSelectedWeeks((prev) => ({ ...prev, [wk?.isoWeek ?? w]: true }));
        }
      } catch (e: any) {
        setWeekErrors((prev) => ({ ...prev, [w]: e.message }));
      }
    }
    setWeekCurrent(null);
  }

  async function save() {
    setStep('saving');
    try {
      // only persist weeks that are checked AND not already deployed
      const filteredWeeks = (plan?.weeks || []).filter(
        (w: any) =>
          selectedWeeks[w.isoWeek] !== false && !deployedWeeks[w.isoWeek]?.ok
      );
      if (filteredWeeks.length === 0) {
        setError('Brak nowych tygodni do wdrożenia (wszystkie już wdrożone lub odznaczone).');
        setStep('error');
        return;
      }
      const planToSave = { ...plan, weeks: filteredWeeks };
      const r = await fetch('/api/planner/month-plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planToSave, month }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'save failed');
      setSavedCount(j.data.createdCount || 0);
      // Mark all the weeks we just saved as deployed in the local state.
      const justDeployed: Record<number, { ok: boolean; createdCount: number }> = {};
      for (const w of filteredWeeks) justDeployed[w.isoWeek] = { ok: true, createdCount: 0 };
      setDeployedWeeks((prev) => ({ ...prev, ...justDeployed }));
      setStep('done');
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Kreator planu miesięcznego
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'config' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                AI sprawdzi, w których tygodniach miesiąca nie ma jeszcze planu, ściągnie historię
                kampanii Meta, dane sprzedażowe Woo i stocki, a następnie zaproponuje plan
                tygodniowy z konkretnymi produktami, mechaniką, hookami i budżetem.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Miesiąc</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Konto reklamowe Meta
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {accounts.length === 0 && <option value="">— brak połączonego konta —</option>}
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generate}
                disabled={!accountId}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Wygeneruj plan
              </button>

              {/* DRAFTS for this month */}
              {drafts.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-amber-900">
                      Drafty dla {month} ({drafts.length})
                    </div>
                    <div className="text-[11px] text-amber-700">
                      Wczytaj, edytuj, dopiero potem wdroż
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {drafts.map((d: any) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 bg-white border border-amber-200 rounded px-2.5 py-2 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {d.name || `Draft #${d.id}`}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {d.weeks_count} tyg. • {d.deployed_count} wdrożonych •{' '}
                            <span
                              className={
                                d.status === 'deployed'
                                  ? 'text-emerald-700'
                                  : d.status === 'partial'
                                    ? 'text-amber-700'
                                    : 'text-slate-600'
                              }
                            >
                              {d.status}
                            </span>{' '}
                            • zapis: {d.updated_at?.slice(0, 16).replace('T', ' ')}
                          </div>
                        </div>
                        <button
                          onClick={() => loadDraft(d.id)}
                          disabled={loadingDraftId === d.id}
                          className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded px-2 py-1 text-[11px] font-medium flex items-center gap-1"
                        >
                          {loadingDraftId === d.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : null}
                          Wczytaj
                        </button>
                        <button
                          onClick={() => deleteDraft(d.id)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          title="Usuń draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {draftMsg && (
                    <div className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded p-1.5">
                      {draftMsg}
                    </div>
                  )}
                </div>
              )}

              {/* DEV cleanup */}
              <div className="border-t border-slate-200 pt-3 mt-2">
                <button
                  onClick={wipeAllCampaignsAndTasks}
                  disabled={wiping}
                  className="w-full text-xs text-rose-600 hover:text-rose-800 underline disabled:text-slate-400"
                >
                  {wiping ? 'Czyszczę…' : 'Wyczyść WSZYSTKIE kampanie + zadania (dev reset)'}
                </button>
                {wipeMsg && (
                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
                    {wipeMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-sm text-slate-600">Pobieram historię Meta, sprzedaż Woo i profil marki…</p>
              <p className="text-xs text-slate-500">To zajmie 5–20 sekund. Potem polecą tygodnie.</p>
            </div>
          )}

          {step === 'review' && plan && (
            <div className="space-y-6">
              {/* DRAFT controls — save current state before deploying */}
              <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-700">
                  {currentDraftId ? (
                    <>
                      Edytujesz draft <strong>#{currentDraftId}</strong>. Zmiany zapisuj
                      ręcznie — kalendarz zostaje nietknięty dopóki nie wdrożysz.
                    </>
                  ) : (
                    <>
                      Plan żyje tylko w pamięci. <strong>Zapisz jako draft</strong>, żeby
                      móc do niego wrócić i edytować przed wdrożeniem.
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveDraft()}
                    disabled={savingDraft}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  >
                    {savingDraft ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    {currentDraftId ? 'Zaktualizuj draft' : 'Zapisz jako draft'}
                  </button>
                  {currentDraftId && (
                    <button
                      onClick={() => {
                        setCurrentDraftId(null);
                        setDraftMsg('Odpięto od draftu — kolejne zapisy utworzą nowy.');
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                      title="Stwórz nowy draft zamiast nadpisywać"
                    >
                      Odepnij
                    </button>
                  )}
                </div>
              </div>
              {draftMsg && (
                <div className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded p-2 -mt-4">
                  {draftMsg}
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-1">{plan.summary}</h3>
                <div className="text-xs text-amber-800">
                  Tygodni: {plan.weeks?.length || 0} / {weekQueue.length} • Łączny budżet:{' '}
                  {plan.totalBudget?.toLocaleString() || 0} PLN
                </div>
                {weekCurrent !== null && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-900">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generuję tydzień {weekCurrent}… ({weekDoneCount}/{weekQueue.length})
                  </div>
                )}
                {weekCurrent === null && weekDoneCount > 0 && weekDoneCount === weekQueue.length && (
                  <div className="mt-2 text-xs text-emerald-800 font-medium">
                    ✓ Wszystkie tygodnie wygenerowane
                  </div>
                )}
                {Object.keys(weekErrors).length > 0 && (
                  <div className="mt-2 text-xs text-rose-800">
                    <div>
                      Błędy w tygodniach:{' '}
                      {Object.entries(weekErrors).map(([w, err]) => (
                        <div key={w} className="ml-2">• T{w}: {err}</div>
                      ))}
                    </div>
                    {weekCurrent === null && (
                      <button
                        onClick={retryFailedWeeks}
                        className="mt-2 bg-rose-600 hover:bg-rose-700 text-white rounded px-3 py-1 text-xs font-medium"
                      >
                        Powtórz nieudane tygodnie
                      </button>
                    )}
                  </div>
                )}
              </div>

              {plan.warnings?.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-medium text-sm">
                    <AlertTriangle className="w-4 h-4" /> Ostrzeżenia
                  </div>
                  <ul className="text-xs text-rose-800 list-disc pl-5">
                    {plan.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.weeks?.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-600 -mt-2">
                  <div>
                    Zaznaczone do importu:{' '}
                    <strong className="text-slate-900">
                      {plan.weeks.filter((w: any) => selectedWeeks[w.isoWeek] !== false).length}
                    </strong>{' '}
                    / {plan.weeks.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllWeeks(true)}
                      className="text-amber-700 hover:text-amber-900 underline"
                    >
                      Zaznacz wszystkie
                    </button>
                    <button
                      onClick={() => setAllWeeks(false)}
                      className="text-slate-500 hover:text-slate-800 underline"
                    >
                      Odznacz wszystkie
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {plan.weeks?.map((w: any, wi: number) => {
                  const isSelected = selectedWeeks[w.isoWeek] !== false;
                  const deployed = deployedWeeks[w.isoWeek];
                  const isDeploying = deployingWeek === w.isoWeek;
                  const isRefining = refiningWeek === w.isoWeek;
                  return (
                  <div
                    key={wi}
                    className={`border rounded-lg p-4 transition-colors ${
                      deployed?.ok
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : isSelected
                          ? 'border-amber-300 bg-amber-50/30'
                          : 'border-slate-200 bg-white opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleWeek(w.isoWeek)}
                          className="mt-1 w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer flex-shrink-0"
                          title="Zaznacz aby zaimportować ten tydzień jako kampanie / zadania"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900">
                            {w.label || `Tydzień ${w.isoWeek}`}
                          </div>
                          <div className="text-xs text-slate-500 mb-1">{w.dateRange}</div>
                          <input
                            type="text"
                            value={w.theme || ''}
                            onChange={(e) => updateWeek(w.isoWeek, { theme: e.target.value })}
                            placeholder="Temat tygodnia"
                            disabled={!!deployed?.ok}
                            className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none px-0 py-0.5 disabled:opacity-60"
                          />
                        </div>
                      </label>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                          <input
                            type="number"
                            value={w.weekly_budget_pln ?? 0}
                            onChange={(e) =>
                              updateWeek(w.isoWeek, { weekly_budget_pln: Number(e.target.value) || 0 })
                            }
                            disabled={!!deployed?.ok}
                            className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none disabled:opacity-60"
                          />
                          <span className="text-xs text-slate-500">PLN</span>
                        </div>
                        {deployed?.ok && (
                          <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Wdrożony ({deployed.createdCount} kamp.)
                          </div>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={w.rationale || ''}
                      onChange={(e) => updateWeek(w.isoWeek, { rationale: e.target.value })}
                      rows={2}
                      disabled={!!deployed?.ok}
                      placeholder="Uzasadnienie"
                      className="w-full text-xs text-slate-600 mb-3 bg-transparent border border-transparent hover:border-slate-200 focus:border-amber-400 rounded px-2 py-1 resize-y focus:outline-none disabled:opacity-60"
                    />

                    {w.hero_products?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-slate-700 mb-1">Hero produkty</div>
                        <div className="flex flex-wrap gap-1">
                          {w.hero_products.map((p: any, pi: number) => (
                            <span
                              key={pi}
                              className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-0.5"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {w.promo?.type && w.promo.type !== 'none' && (
                      <div className="text-xs text-slate-700 mb-2">
                        <strong>Promo:</strong> {w.promo.type} {w.promo.value} —{' '}
                        {w.promo.mechanics}
                      </div>
                    )}

                    {w.designer_summary && (
                      <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                        <div className="font-semibold text-amber-900 flex items-center gap-1">
                          <Palette className="w-3 h-3" /> Brief wizualny tygodnia
                        </div>
                        <div className="text-amber-900 mt-0.5">{w.designer_summary}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {w.channels?.map((ch: any, ci: number) => {
                        const k = pushKey(wi, ci);
                        const result = pushResults[k];
                        const isPushable =
                          /meta/i.test(ch.channel || '') || /email/i.test(ch.channel || '');
                        const vb = ch.visual_brief;
                        return (
                          <div key={ci} className="bg-slate-50 rounded p-2 text-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900">
                                  {ch.channel} · {ch.format}
                                  {ch.objective ? ` · ${ch.objective}` : ''}
                                </div>
                                <input
                                  type="text"
                                  value={ch.creative_hook || ''}
                                  onChange={(e) =>
                                    updateChannel(w.isoWeek, ci, { creative_hook: e.target.value })
                                  }
                                  disabled={!!deployed?.ok}
                                  placeholder="Hook kreatywny"
                                  className="w-full mt-0.5 text-slate-700 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-amber-400 rounded px-1 py-0.5 focus:outline-none disabled:opacity-60"
                                />
                                <div className="text-slate-500 mt-0.5">
                                  CTA: {ch.cta} • Audience: {ch.audience} • KPI: {ch.expected_kpi}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-slate-900 font-medium">
                                  <input
                                    type="number"
                                    value={ch.budget_pln ?? 0}
                                    onChange={(e) =>
                                      updateChannel(w.isoWeek, ci, {
                                        budget_pln: Number(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!!deployed?.ok}
                                    className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none disabled:opacity-60"
                                  />
                                  <span className="text-[10px] text-slate-500">PLN</span>
                                </div>
                                {isPushable && (
                                  <button
                                    onClick={() => pushChannel(w, ch, wi, ci)}
                                    disabled={pushing === k || result?.campaign_id || result?.newsletter_id}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-[11px] px-2 py-1 rounded flex items-center gap-1"
                                  >
                                    {pushing === k ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Send className="w-3 h-3" />
                                    )}
                                    {result?.campaign_id || result?.newsletter_id ? 'Wysłano' : 'Push'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {vb && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-orange-700 font-medium text-[11px]">
                                  Brief graficzny
                                </summary>
                                <div className="mt-1 pl-2 border-l-2 border-orange-200 space-y-0.5 text-[11px]">
                                  {vb.scene && <div><b>Scena:</b> {vb.scene}</div>}
                                  {vb.props?.length && <div><b>Rekwizyty:</b> {vb.props.join(', ')}</div>}
                                  {vb.lighting && <div><b>Światło:</b> {vb.lighting}</div>}
                                  {vb.composition && <div><b>Kompozycja:</b> {vb.composition}</div>}
                                  {vb.palette?.length && (
                                    <div className="flex items-center gap-1">
                                      <b>Paleta:</b>
                                      {vb.palette.map((c: string, pi: number) => (
                                        <span
                                          key={pi}
                                          title={c}
                                          className="inline-block w-3 h-3 rounded-full border border-slate-300"
                                          style={{ background: c }}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {vb.mood_keywords?.length && (
                                    <div><b>Mood:</b> {vb.mood_keywords.join(' · ')}</div>
                                  )}
                                  {vb.do && <div className="text-emerald-700"><b>Do:</b> {vb.do}</div>}
                                  {vb.dont && <div className="text-red-700"><b>Don't:</b> {vb.dont}</div>}
                                  {vb.reference_note && (
                                    <div className="text-slate-500"><b>Ref:</b> {vb.reference_note}</div>
                                  )}
                                </div>
                              </details>
                            )}
                            {result && (
                              <div className="mt-2 text-[11px]">
                                {result.error ? (
                                  <div className="text-red-600">⚠ {result.error}</div>
                                ) : (
                                  <div className="text-emerald-700">
                                    ✓ {result.campaign_id ? 'Kampania PAUSED w Meta' : 'Draft w GR'}{' '}
                                    {result.manage_url && (
                                      <a
                                        href={result.manage_url}
                                        target="_blank"
                                        rel="noopener"
                                        className="underline ml-1"
                                      >
                                        Otwórz
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {w.linked_calendar_tasks?.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        Kalendarz: {w.linked_calendar_tasks.join(' · ')}
                      </div>
                    )}

                    {/* Store tasks — banners, landing pages, product highlights */}
                    {w.store_tasks?.length > 0 && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-900">
                          🛒 Zadania na stronie sklepu ({w.store_tasks.length})
                        </div>
                        {w.store_tasks.map((st: any, sti: number) => (
                          <div key={sti} className="bg-white border border-blue-100 rounded p-2 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                {(st.type || '').replace(/_/g, ' ')}
                              </span>
                              <span className="font-medium text-slate-900">{st.title}</span>
                              {st.deadline && (
                                <span className="text-[10px] text-slate-500 ml-auto">
                                  deadline: {st.deadline}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-700">{st.description}</div>
                            {st.placement && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Umiejscowienie: {st.placement}
                              </div>
                            )}
                            {st.visual_note && (
                              <div className="text-[10px] text-blue-700 mt-0.5">
                                Wskazówka wizualna: {st.visual_note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Per-week action toolbar */}
                    {!deployed?.ok && (
                      <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setRefineOpenFor(refineOpenFor === w.isoWeek ? null : w.isoWeek);
                              setRefinePrompt('');
                            }}
                            disabled={isRefining || isDeploying}
                            className="text-[11px] bg-purple-100 hover:bg-purple-200 text-purple-800 px-2.5 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                          >
                            <Wand2 className="w-3 h-3" />
                            {isRefining ? 'Poprawiam…' : 'Popraw z AI'}
                          </button>
                          <button
                            onClick={() => acceptAndDeployWeek(w.isoWeek)}
                            disabled={isRefining || isDeploying}
                            className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded flex items-center gap-1 disabled:opacity-50 ml-auto"
                          >
                            {isDeploying ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Rocket className="w-3 h-3" />
                            )}
                            Akceptuj i wdroż do kalendarza
                          </button>
                        </div>
                        {refineOpenFor === w.isoWeek && (
                          <div className="bg-purple-50 border border-purple-200 rounded p-2">
                            <textarea
                              value={refinePrompt}
                              onChange={(e) => setRefinePrompt(e.target.value)}
                              placeholder="Co poprawić? np. 'zmień motyw na bardziej minimalistyczny', 'dodaj kanał email z newsletterem o detoksie', 'zmniejsz budżet o 30%', 'mocniejszy hook do pierwszej reklamy'"
                              rows={3}
                              className="w-full text-xs bg-white border border-purple-200 rounded px-2 py-1 focus:outline-none focus:border-purple-400 resize-y"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setRefineOpenFor(null);
                                  setRefinePrompt('');
                                }}
                                className="text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1"
                              >
                                Anuluj
                              </button>
                              <button
                                onClick={() => refineWeekWithAI(w.isoWeek)}
                                disabled={!refinePrompt.trim() || isRefining}
                                className="text-[11px] bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white px-3 py-1 rounded flex items-center gap-1"
                              >
                                {isRefining ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Wand2 className="w-3 h-3" />
                                )}
                                Wygeneruj poprawkę
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {deployed?.ok && (
                      <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Wdrożony jako {deployed.createdCount} kampanii draft + zadania kalendarza. Edytuj dalej w widoku Kampanie.
                      </div>
                    )}
                    {deployed && !deployed.ok && (
                      <div className="mt-3 pt-3 border-t border-rose-200 text-xs text-rose-700">
                        Błąd wdrożenia: {deployed.error}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              {plan.next_actions?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Kolejne kroki</div>
                  <ul className="text-xs text-slate-600 list-disc pl-5">
                    {plan.next_actions.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 sticky bottom-0 bg-white pt-2">
                <button
                  onClick={() => setStep('config')}
                  className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Wstecz
                </button>
                {(() => {
                  // bulk: only weeks that are selected AND not yet deployed
                  const pending = (plan?.weeks || []).filter(
                    (w: any) =>
                      selectedWeeks[w.isoWeek] !== false && !deployedWeeks[w.isoWeek]?.ok
                  );
                  const pendingCount = pending.length;
                  return (
                    <button
                      onClick={save}
                      disabled={
                        weekCurrent !== null || !(plan?.weeks?.length > 0) || pendingCount === 0
                      }
                      className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2 text-sm font-medium"
                      title="Hurtowe wdrożenie wszystkich zaznaczonych jeszcze nie wdrożonych tygodni"
                    >
                      {weekCurrent !== null
                        ? 'Czekaj na zakończenie generacji…'
                        : pendingCount === 0
                          ? 'Wszystko już wdrożone lub odznaczone'
                          : `Wdroż wszystkie zaznaczone (${pendingCount})`}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-sm text-slate-600">Zapisuję kampanie i zadania w kalendarzu…</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <p className="text-base font-medium text-slate-900">
                Zapisano {savedCount} kampanii draft
              </p>
              <p className="text-sm text-slate-600">
                Otwórz zakładkę „Kampanie", żeby przejrzeć i aktywować.
              </p>
              <button
                onClick={onClose}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-6 py-2 text-sm font-medium"
              >
                Zamknij
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
              <p className="text-base font-medium text-slate-900">Coś poszło nie tak</p>
              <p className="text-sm text-slate-600 max-w-md text-center">{error}</p>
              <button
                onClick={() => setStep('config')}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-6 py-2 text-sm font-medium"
              >
                Spróbuj ponownie
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
