// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Sparkles, Plus, Trash2, Loader2, Rocket, RefreshCw, X, BarChart3, ArrowUpDown } from "lucide-react";
import { PageHeader, Section as ShellSection, EmptyState, Card as ShellCard } from "@/components/shell";

type Launch = {
  id: number;
  launch_type?: "single" | "product_line";
  name: string;
  short_pitch?: string;
  description?: string;
  ingredients?: string;
  category?: string;
  price_pln?: number;
  target_audience?: string;
  status: string;
  planned_launch_date?: string;
  ai_suggested_date?: string;
  ai_suggestion_notes?: string;
  ai_suggestion_json?: string;
  user_notes?: string;
  notes?: string;
  target_channels?: string[] | string;
  channel_rationale?: string;
};

const STATUS_LABEL: Record<string, string> = {
  idea: "Pomysł",
  in_development: "W produkcji",
  ready: "Gotowy",
  launched: "Wystartowany",
  cancelled: "Anulowany",
};

const STATUS_COLOR: Record<string, string> = {
  idea: "bg-gray-100 text-gray-700",
  in_development: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  launched: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
};

const TYPE_LABEL: Record<string, string> = {
  single: "Pojedynczy produkt",
  product_line: "Linia produktowa",
};

function SuggestionView({ s }: { s: any }) {
  if (!s) return null;
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs text-orange-700 font-medium">Sugerowana data launchu</div>
          <div className="text-xl font-bold text-orange-900">{s.suggested_date}</div>
        </div>
        {s.confidence && (
          <span className="text-xs px-2 py-1 bg-white rounded text-orange-700 font-medium">
            confidence: {s.confidence}
          </span>
        )}
      </div>
      {s.rationale && <p className="text-sm text-gray-700">{s.rationale}</p>}
      {s.portfolio_analysis && (
        <details className="text-sm border border-indigo-200 rounded-lg p-3 bg-indigo-50" open>
          <summary className="cursor-pointer font-medium text-indigo-800">📊 Analiza strategiczna portfolio</summary>
          <div className="mt-2 space-y-2 text-gray-700">
            {s.portfolio_analysis.calendar_map && (
              <div><b className="text-indigo-700">Kalendarz launchy:</b> {s.portfolio_analysis.calendar_map}</div>
            )}
            {s.portfolio_analysis.gaps_identified && (
              <div><b className="text-indigo-700">Luki w portfolio:</b> {s.portfolio_analysis.gaps_identified}</div>
            )}
            {s.portfolio_analysis.cannibalization_risk && (
              <div><b className="text-indigo-700">Ryzyko kanibalizacji:</b> {s.portfolio_analysis.cannibalization_risk}</div>
            )}
            {s.portfolio_analysis.brand_narrative_fit && (
              <div><b className="text-indigo-700">Fit z narracją marki:</b> {s.portfolio_analysis.brand_narrative_fit}</div>
            )}
            {s.portfolio_analysis.strategic_recommendation && (
              <div className="bg-white rounded p-2 border border-indigo-200">
                <b className="text-indigo-800">💡 Rekomendacja strategiczna:</b> {s.portfolio_analysis.strategic_recommendation}
              </div>
            )}
          </div>
        </details>
      )}
      {s.target_audience_refined && (
        <div className="text-sm">
          <b>Doprecyzowana grupa:</b> {s.target_audience_refined}
        </div>
      )}
      {s.pricing_check && (
        <div className="text-sm">
          <b>Cena ({s.pricing_check.verdict}):</b> {s.pricing_check.comment}
          {s.pricing_check.suggested_range_pln && (
            <span> ({s.pricing_check.suggested_range_pln[0]}-{s.pricing_check.suggested_range_pln[1]} PLN)</span>
          )}
        </div>
      )}
      {Array.isArray(s.hero_hooks) && s.hero_hooks.length > 0 && (
        <div className="text-sm">
          <b>Hooki copywriterskie:</b>
          <ul className="mt-1 space-y-1">
            {s.hero_hooks.map((h: string, i: number) => (
              <li key={i} className="text-gray-700">· {h}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(s.launch_plan) && s.launch_plan.length > 0 && (
        <details className="text-sm" open>
          <summary className="cursor-pointer font-medium text-orange-700">
            Pełny plan launchu ({s.launch_plan.length} faz)
          </summary>
          <div className="mt-2 space-y-2">
            {s.launch_plan.map((p: any, i: number) => (
              <div key={i} className="bg-white rounded p-2 border border-orange-200">
                <div className="font-medium">
                  {p.phase} (T{p.weeks_before_launch >= 0 ? "-" : "+"}
                  {Math.abs(p.weeks_before_launch)})
                </div>
                {Array.isArray(p.channels) &&
                  p.channels.map((c: any, j: number) => (
                    <div key={j} className="text-xs text-gray-600 mt-1">
                      · {c.channel} · {c.format}: {c.hook}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </details>
      )}
      {Array.isArray(s.warnings) && s.warnings.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded p-2">
          ⚠ {s.warnings.join(" · ")}
        </div>
      )}
    </div>
  );
}

export default function LaunchesPage() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<Partial<Launch>>({ status: "idea", launch_type: "single" });
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [openLaunch, setOpenLaunch] = useState<Launch | null>(null);
  const [openSuggestion, setOpenSuggestion] = useState<any>(null);
  const [openNotes, setOpenNotes] = useState("");
  const [resuggesting, setResuggesting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [portfolioReview, setPortfolioReview] = useState<any>(null);
  const [reviewingPortfolio, setReviewingPortfolio] = useState(false);
  const [showPortfolioReview, setShowPortfolioReview] = useState(false);
  const [portfolioComments, setPortfolioComments] = useState("");
  const [portfolioVersion, setPortfolioVersion] = useState(0);
  const [portfolioUpdatedAt, setPortfolioUpdatedAt] = useState("");
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [hasSavedReview, setHasSavedReview] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [assigningChannels, setAssigningChannels] = useState(false);
  const [assignResult, setAssignResult] = useState<string | null>(null);
  const [proposeChannel, setProposeChannel] = useState<string | null>(null);
  const [proposeData, setProposeData] = useState<any>(null);
  const [proposeLoading, setProposeLoading] = useState(false);
  const [proposeUserPrompt, setProposeUserPrompt] = useState('');

  async function runProposeForChannel(channel: string, userPrompt: string = '') {
    setProposeLoading(true);
    setProposeChannel(channel);
    setProposeData(null);
    try {
      const r = await fetch('/api/launches/propose-for-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, count: 4, userPrompt }),
      });
      const j = await r.json();
      if (j.ok) setProposeData(j);
      else setProposeData({ error: j.error || 'Błąd' });
    } catch (e: any) {
      setProposeData({ error: e.message });
    } finally {
      setProposeLoading(false);
    }
  }

  async function adoptProposal(p: any) {
    try {
      const r = await fetch('/api/launches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launch_type: p.category && p.category.includes('linia') ? 'product_line' : 'single',
          name: p.name,
          short_pitch: p.short_pitch,
          category: p.category,
          price_pln: p.estimated_price_pln,
          status: 'idea',
          ai_suggested_date: p.suggested_month ? p.suggested_month + '-15' : null,
          ai_suggestion_notes: [
            'Z propozycji per-kanał (' + (proposeChannel || '') + '):',
            'Why this channel: ' + (p.why_this_channel || ''),
            'Why now: ' + (p.why_now || ''),
            'Synergy: ' + (p.portfolio_synergy || ''),
            'Risk: ' + (p.risk || ''),
          ].join('\n'),
          target_channels: Array.isArray(p.target_channels) && p.target_channels.length > 0 ? p.target_channels : [proposeChannel],
          channel_rationale: p.why_this_channel,
        }),
      });
      if (r.ok) {
        await load();
      }
    } catch {}
  }

  async function assignChannels(force: boolean = false) {
    setAssigningChannels(true); setAssignResult(null);
    try {
      const r = await fetch('/api/launches/assign-channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force }) });
      const j = await r.json();
      if (j.ok) {
        setAssignResult(`✓ AI przypisała kanały do ${j.processed} launchów`);
        await load();
      } else {
        setAssignResult(`Błąd: ${j.error || 'unknown'}`);
      }
    } catch (e: any) {
      setAssignResult(`Błąd: ${e.message}`);
    } finally {
      setAssigningChannels(false);
      setTimeout(() => setAssignResult(null), 6000);
    }
  }
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [addingSuggestions, setAddingSuggestions] = useState(false);
  const [applyingDate, setApplyingDate] = useState<Record<number, 'applying' | 'refreshing' | 'done' | null>>({});
  const [applyingAll, setApplyingAll] = useState(false);
  const [savingField, setSavingField] = useState<{id: number, field: string} | null>(null);
  const [savedField, setSavedField] = useState<{id: number, field: string} | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [undatedList, setUndatedList] = useState<any[]>([]);
  const [conflictsExpanded, setConflictsExpanded] = useState(false);
  const [manualEdits, setManualEdits] = useState(0);
  const [reanalyzeDismissed, setReanalyzeDismissed] = useState(false);

  async function fetchConflicts() {
    try {
      const r = await fetch('/api/launches/conflicts');
      if (r.ok) {
        const j = await r.json();
        setConflicts(j.conflicts || []);
        setUndatedList(j.undated || []);
      }
    } catch {}
  }

  function getChannels(l: any): string[] {
    if (!l?.target_channels) return [];
    if (Array.isArray(l.target_channels)) return l.target_channels;
    try { return JSON.parse(l.target_channels) || []; } catch { return []; }
  }
  const CHANNEL_LABEL: Record<string, { label: string; color: string }> = {
    d2c: { label: 'D2C sklep', color: '#6366f1' },
    allegro: { label: 'Allegro', color: '#f97316' },
    rossmann_full: { label: 'Rossmann', color: '#dc2626' },
    rossmann_test: { label: 'Rossmann test', color: '#ef4444' },
    rossmann_amoya: { label: "Amo'ya", color: '#a16207' },
    b2b_premium: { label: 'B2B Premium', color: '#0891b2' },
    export: { label: 'Eksport', color: '#7c3aed' },
    other_chains: { label: 'Sieci PL', color: '#059669' },
  };

  async function patchLaunch(id: number, patch: Record<string, any>) {
    const fieldKey = Object.keys(patch)[0] || 'unknown';
    setSavingField({ id, field: fieldKey });
    // Optimistic update
    setLaunches((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      const res = await fetch(`/api/launches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('save failed');
      const j = await res.json();
      if (j?.data) setLaunches((prev) => prev.map((x) => (x.id === id ? { ...x, ...j.data } : x)));
      setSavedField({ id, field: fieldKey });
      fetchConflicts();
      setManualEdits((n) => n + 1);
      setReanalyzeDismissed(false);
      setTimeout(() => setSavedField((cur) => (cur && cur.id === id && cur.field === fieldKey ? null : cur)), 1200);
    } catch (e) {
      // Revert on failure: refetch from server
      load();
      alert('Nie udało się zapisać. Spróbuj ponownie.');
    } finally {
      setSavingField((cur) => (cur && cur.id === id && cur.field === fieldKey ? null : cur));
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/launches");
      const json = await res.json();
      setLaunches(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); fetchConflicts(); }, []);

  function openDetail(l: Launch) {
    setOpenLaunch(l);
    setOpenNotes(l.user_notes || "");
    let parsed: any = null;
    if (l.ai_suggestion_json) {
      try { parsed = JSON.parse(l.ai_suggestion_json); } catch {}
    }
    if (!parsed && l.ai_suggestion_notes) {
      try { parsed = JSON.parse(l.ai_suggestion_notes); } catch {}
    }
    setOpenSuggestion(parsed);
  }

  async function createLaunch() {
    setSaving(true);
    try {
      const body: any = { ...draft };
      if (suggestion) {
        body.ai_suggestion_json = suggestion;
        if (suggestion.suggested_date && !body.planned_launch_date) {
          body.ai_suggested_date = suggestion.suggested_date;
        }
        if (suggestion.rationale) body.ai_suggestion_notes = suggestion.rationale;
      }
      const res = await fetch("/api/launches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreate(false);
        setDraft({ status: "idea", launch_type: "single" });
        setSuggestion(null);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function delLaunch(id: number) {
    if (!confirm("Usunąć launch?")) return;
    await fetch(`/api/launches/${id}`, { method: "DELETE" });
    if (openLaunch?.id === id) setOpenLaunch(null);
    load();
  }

  async function suggestTiming() {
    if (!draft.name) {
      alert("Najpierw nazwij produkt lub linię");
      return;
    }
    setSuggesting(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/launches/suggest-timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (json.data?.suggestion) {
        setSuggestion(json.data.suggestion);
      } else {
        alert("Nie udało się wygenerować sugestii: " + (json.error || "?"));
      }
    } finally {
      setSuggesting(false);
    }
  }

  async function loadSavedReview() {
    setLoadingPortfolio(true);
    try {
      const res = await fetch("/api/launches/portfolio-review");
      const json = await res.json();
      if (json.data?.review) {
        setPortfolioReview(json.data.review);
        setPortfolioComments(json.data.user_comments || "");
        setPortfolioVersion(json.data.version || 1);
        setPortfolioUpdatedAt(json.data.updated_at || "");
        setHasSavedReview(true);
        return true;
      }
      return false;
    } catch { return false; }
    finally { setLoadingPortfolio(false); }
  }

  async function openPortfolioReview() {
    setShowPortfolioReview(true);
    if (!portfolioReview) {
      await loadSavedReview();
    }
  }

  async function runPortfolioReview(withComments?: boolean) {
    setReviewingPortfolio(true);
    try {
      const res = await fetch("/api/launches/portfolio-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_comments: withComments ? portfolioComments : '',
        }),
      });
      const json = await res.json();
      if (json.data?.review) {
        setPortfolioReview(json.data.review);
        setPortfolioVersion(json.data.version || 1);
        setPortfolioUpdatedAt(new Date().toISOString());
        setHasSavedReview(true);
      } else {
        alert(json.error || "Nie udało się przeanalizować portfolio");
      }
    } finally {
      setReviewingPortfolio(false);
    }
  }

  function toggleSuggestion(idx: number) {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  async function addSelectedSuggestions() {
    if (!portfolioReview?.suggested_products?.length || selectedSuggestions.size === 0) return;
    setAddingSuggestions(true);
    try {
      for (const idx of selectedSuggestions) {
        const sp = portfolioReview.suggested_products[idx];
        if (!sp) continue;
        await fetch("/api/launches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: sp.name,
            short_pitch: sp.short_pitch,
            category: sp.category,
            status: "idea",
            launch_type: "single",
            ai_suggestion_notes: `Portfolio AI: ${sp.portfolio_fit}. Sugerowany miesiąc: ${sp.suggested_month} — ${sp.month_rationale}`,
            notes: `Priorytet: ${sp.priority}. ${sp.portfolio_fit}`,
          }),
        });
      }
      setSelectedSuggestions(new Set());
      load(); // refresh launches list
    } finally {
      setAddingSuggestions(false);
    }
  }

  async function applyDate(launchId: number, newDate: string) {
    setApplyingDate(prev => ({ ...prev, [launchId]: 'applying' }));
    try {
      await fetch(`/api/launches/${launchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planned_launch_date: newDate, ai_suggested_date: newDate }),
      });
      setApplyingDate(prev => ({ ...prev, [launchId]: 'done' }));
      load();
    } catch {
      setApplyingDate(prev => ({ ...prev, [launchId]: null }));
    }
  }

  async function applyDateAndRefresh(launchId: number, newDate: string) {
    // Step 1: apply date
    setApplyingDate(prev => ({ ...prev, [launchId]: 'applying' }));
    try {
      await fetch(`/api/launches/${launchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planned_launch_date: newDate, ai_suggested_date: newDate }),
      });
    } catch {
      setApplyingDate(prev => ({ ...prev, [launchId]: null }));
      return;
    }
    // Step 2: refresh marketing plan with new date
    setApplyingDate(prev => ({ ...prev, [launchId]: 'refreshing' }));
    try {
      await fetch(`/api/launches/${launchId}/resuggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_notes: `Data launchu zmieniona na ${newDate} na podstawie analizy portfolio. Dostosuj plan marketingowy do nowej daty.`,
          persist: true,
        }),
      });
      setApplyingDate(prev => ({ ...prev, [launchId]: 'done' }));
      load();
    } catch {
      setApplyingDate(prev => ({ ...prev, [launchId]: 'done' })); // date applied but refresh failed
      load();
    }
  }

  async function applyAllDates() {
    if (!portfolioReview?.proposed_timeline?.length) return;
    const changed = portfolioReview.proposed_timeline.filter((item: any) => item.change !== 'keep' && item.launch_id);
    if (!changed.length) return;
    setApplyingAll(true);
    for (const item of changed) {
      await applyDateAndRefresh(item.launch_id, item.proposed_date);
    }
    setApplyingAll(false);
  }

  // Check for saved review on mount
  useEffect(() => {
    fetch("/api/launches/portfolio-review").then(r => r.json()).then(json => {
      if (json.data?.review) setHasSavedReview(true);
    }).catch(() => {});
  }, []);

  async function acceptSuggestedDate(overrideDate?: string) {
    if (!openLaunch) return;
    const date = overrideDate || openSuggestion?.suggested_date;
    if (!date) return;
    setApplying(true);
    try {
      const r = await fetch(`/api/launches/${openLaunch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_launch_date: date, ai_suggested_date: date }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Nie udało się zapisać daty: ${err?.error || r.statusText}`);
        return;
      }
      await load();
      setOpenLaunch(null);
    } catch (e) {
      alert(`Błąd: ${(e as Error).message}`);
    } finally {
      setApplying(false);
    }
  }

  async function resuggest() {
    if (!openLaunch) return;
    setResuggesting(true);
    try {
      const res = await fetch(`/api/launches/${openLaunch.id}/resuggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_notes: openNotes, persist: true }),
      });
      const json = await res.json();
      if (json.data?.suggestion) {
        setOpenSuggestion(json.data.suggestion);
        if (json.data.launch) setOpenLaunch(json.data.launch);
        load();
      } else {
        alert("Re-analiza nie powiodła się: " + (json.error || "?"));
      }
    } finally {
      setResuggesting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        icon={Rocket}
        title="Launche nowości"
        description="Planuj nowe produkty i całe linie z wyprzedzeniem. AI sugeruje datę, grupę, cenę i plan promocji — możesz wrócić do analizy i poprosić o re-analizę z dodatkowymi uwagami."
        actions={(
          <>
            {launches.filter(l => !['launched','cancelled'].includes(l.status)).length >= 2 && (
              <button
                onClick={openPortfolioReview}
                disabled={reviewingPortfolio || loadingPortfolio}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-[12.5px] font-semibold shadow-sm"
              >
                {(reviewingPortfolio || loadingPortfolio) ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {loadingPortfolio ? 'Ładuję...' : 'Analizuję...'}</>
                ) : (
                  <><BarChart3 className="w-3.5 h-3.5" /> {hasSavedReview ? 'Strategia launchy' : 'Przeanalizuj strategię'}</>
                )}
              </button>
            )}
            <button
              onClick={() => {
                setShowCreate(true);
                setDraft({ status: "idea", launch_type: "single" });
                setSuggestion(null);
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-[12.5px] font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nowy launch
            </button>
          </>
        )}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Ładowanie...</div>
      ) : launches.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Brak zaplanowanych launchów"
          description="Dodaj pierwszy nowy produkt lub linię — AI zasugeruje datę, kategorię, cenę i plan promocji."
          action={<button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[13px] font-semibold shadow-sm">
            Dodaj launch
          </button>}
        />
      ) : (
        <>
        {/* Pipeline po kanałach summary */}
        <div className="mb-4 bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-900">Pipeline po kanałach sprzedaży</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{launches.length} aktywnych launchów</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value=""
                onChange={(e) => { if (e.target.value) { setProposeUserPrompt(''); runProposeForChannel(e.target.value); } e.target.value = ''; }}
                className="px-3 py-1.5 text-[11.5px] font-semibold bg-white border border-slate-200 hover:border-indigo-300 rounded-lg cursor-pointer text-slate-700 hover:text-indigo-700"
                title="AI proponuje produkty SPECYFICZNIE dla wybranego kanału"
              >
                <option value="">✨ Propozycje per kanał…</option>
                <option value="d2c">D2C sklep</option>
                <option value="rossmann_full">Rossmann pełna</option>
                <option value="b2b_premium">B2B Premium (HoReCa)</option>
                <option value="export">Eksport DE/EU</option>
                <option value="other_chains">Inne sieci PL</option>
                <option value="rossmann_amoya">Amo'ya (private label)</option>
                <option value="allegro">Allegro</option>
              </select>
              <button
                onClick={() => assignChannels(false)}
                disabled={assigningChannels}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-lg text-[11.5px] font-semibold disabled:opacity-50 shadow-sm"
                title="AI przypisze kanały do launchów które ich nie mają"
              >
                {assigningChannels ? '⏳ AI przypisuje (60-90s)...' : '✨ Przypisz kanały AI'}
              </button>
            </div>
          </div>
          {assignResult && (
            <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 text-[12px] text-emerald-800">{assignResult}</div>
          )}
          <div className="p-4">
            {(() => {
              const counts: Record<string, number> = {};
              const unassigned: any[] = [];
              for (const l of launches) {
                const ch = getChannels(l);
                if (ch.length === 0) { unassigned.push(l); continue; }
                for (const c of ch) counts[c] = (counts[c] || 0) + 1;
              }
              const inMarketing = launches.filter((l: any) => {
                const ch = getChannels(l);
                if (ch.length === 0) return false;
                return ch.includes('d2c') || ch.includes('allegro');
              }).length;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-indigo-50/80 rounded-lg p-3 border border-indigo-100">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700">w marketingu</div>
                    <div className="text-[20px] font-bold text-indigo-900 mt-0.5">{inMarketing}</div>
                    <div className="text-[10.5px] text-indigo-700/80">D2C / Allegro</div>
                  </div>
                  {Object.entries(CHANNEL_LABEL).map(([key, meta]) => (
                    counts[key] > 0 && (
                      <div key={key} className="rounded-lg p-3 border flex flex-col" style={{ backgroundColor: `${meta.color}10`, borderColor: `${meta.color}30` }}>
                        <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: meta.color }}>{meta.label}</div>
                        <div className="text-[20px] font-bold mt-0.5" style={{ color: meta.color }}>{counts[key]}</div>
                        <button
                          onClick={() => { setProposeUserPrompt(''); runProposeForChannel(key); }}
                          className="text-[10px] font-semibold mt-2 px-2 py-1 rounded bg-white/70 hover:bg-white border transition-colors"
                          style={{ color: meta.color, borderColor: `${meta.color}40` }}
                          title={`AI propozycje produktów dla kanału: ${meta.label}`}
                        >
                          ✨ AI propozycje
                        </button>
                      </div>
                    )
                  ))}
                  {unassigned.length > 0 && (
                    <div className="bg-amber-50/80 rounded-lg p-3 border border-amber-200">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-amber-800">bez przypisania</div>
                      <div className="text-[20px] font-bold text-amber-900 mt-0.5">{unassigned.length}</div>
                      <div className="text-[10.5px] text-amber-700/80">kliknij ✨ powyżej</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        {(conflicts.length > 0 || undatedList.length > 0) && (
          <div className={`mb-4 rounded-xl border ${conflicts.some((c:any)=>c.severity==='warning') ? 'bg-amber-50 border-amber-200' : 'bg-sky-50 border-sky-200'}`}>
            <button
              type="button"
              onClick={() => setConflictsExpanded((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${conflicts.some((c:any)=>c.severity==='warning') ? 'bg-amber-200/60 text-amber-800' : 'bg-sky-200/60 text-sky-800'}`}>
                <span className="text-base font-bold">!</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${conflicts.some((c:any)=>c.severity==='warning') ? 'text-amber-900' : 'text-sky-900'}`}>
                  {conflicts.length === 0
                    ? `${undatedList.length} launch${undatedList.length === 1 ? '' : 'y'} bez ustalonej daty`
                    : `${conflicts.length} potencjaln${conflicts.length === 1 ? 'a kolizja' : conflicts.length < 5 ? 'e kolizje' : 'ych kolizji'} w kalendarzu launchów`}
                </div>
                <div className={`text-[11px] mt-0.5 ${conflicts.some((c:any)=>c.severity==='warning') ? 'text-amber-700' : 'text-sky-700'}`}>
                  {conflicts.filter((c:any)=>c.severity==='warning').length > 0 && `${conflicts.filter((c:any)=>c.severity==='warning').length} ostrzeżeniań`}
                  {conflicts.filter((c:any)=>c.severity==='warning').length > 0 && conflicts.filter((c:any)=>c.severity==='info').length > 0 && ' · '}
                  {conflicts.filter((c:any)=>c.severity==='info').length > 0 && `${conflicts.filter((c:any)=>c.severity==='info').length} sugestię`}
                  {undatedList.length > 0 && conflicts.length > 0 && ` · ${undatedList.length} bez daty`}
                  {!conflictsExpanded && ' — kliknij żeby rozwinąć'}
                </div>
              </div>
              <span className={`text-xs ${conflictsExpanded ? 'rotate-180' : ''} transition-transform ${conflicts.some((c:any)=>c.severity==='warning') ? 'text-indigo-600' : 'text-sky-600'}`}>▾</span>
            </button>
            {conflictsExpanded && (
              <div className="px-4 pb-3 pt-0 space-y-2">
                {conflicts.map((c:any, idx:number) => (
                  <div key={idx} className={`text-[12px] flex items-start gap-2 ${c.severity==='warning' ? 'text-amber-900' : 'text-sky-900'}`}>
                    <span className={`mt-0.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.severity==='warning' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                    <span>{c.message}</span>
                  </div>
                ))}
                {undatedList.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-current/10 text-[12px] text-slate-700">
                    <span className="font-semibold">Bez daty:</span> {undatedList.map((u:any) => u.name).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-gray-500">Kanał:</span>
          {([['all', 'Wszystkie'], ['marketing', '🎯 Marketing plan'], ['d2c', 'D2C'], ['rossmann_full', 'Rossmann'], ['b2b_premium', 'B2B'], ['export', 'Eksport']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setChannelFilter(key)}
              className={`text-xs px-2 py-1 rounded ${channelFilter === key ? 'bg-indigo-100 text-indigo-700 font-semibold ring-1 ring-indigo-200' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">Sortuj:</span>
          {([['date', 'Data'], ['name', 'Nazwa'], ['status', 'Status']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`text-xs px-2 py-1 rounded ${sortBy === key ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {[...launches]
            .filter((l) => {
              if (channelFilter === 'all') return true;
              if (channelFilter === 'marketing') {
                const ch = getChannels(l);
                if (ch.length === 0) return true; // legacy = assume marketing
                return ch.includes('d2c') || ch.includes('allegro');
              }
              return getChannels(l).includes(channelFilter);
            })
            .sort((a, b) => {
            if (sortBy === 'date') {
              const da = a.planned_launch_date || a.ai_suggested_date || '9999';
              const db2 = b.planned_launch_date || b.ai_suggested_date || '9999';
              return da.localeCompare(db2);
            }
            if (sortBy === 'name') return a.name.localeCompare(b.name, 'pl');
            if (sortBy === 'status') {
              const order: Record<string, number> = { idea: 0, in_development: 1, ready: 2, launched: 3, cancelled: 4 };
              return (order[a.status] ?? 5) - (order[b.status] ?? 5);
            }
            return 0;
          }).map((l) => (
            <div
              key={l.id}
              onClick={() => openDetail(l)}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex items-start justify-between gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{l.name}</h3>
                  {conflicts.some((c: any) => Array.isArray(c.launch_ids) && c.launch_ids.includes(l.id)) && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                      title={conflicts.filter((c: any) => Array.isArray(c.launch_ids) && c.launch_ids.includes(l.id)).map((c: any) => c.message).join('\n')}
                    >⚠ kolizja</span>
                  )}
                  {/* Inline status quick-switch */}
                  <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={l.status}
                      onChange={(e) => patchLaunch(l.id, { status: e.target.value })}
                      className={`appearance-none pl-2 pr-6 py-0.5 rounded text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${STATUS_COLOR[l.status] || "bg-gray-100 text-gray-700"}`}
                      title="Zmień status"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 opacity-60 pointer-events-none" viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {savingField?.id === l.id && savingField.field === 'status' && (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600 ml-1" />
                    )}
                    {savedField?.id === l.id && savedField.field === 'status' && (
                      <span className="ml-1 text-emerald-600 text-[10px] font-semibold">✓</span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                    {TYPE_LABEL[l.launch_type || "single"]}
                  </span>
                  {l.category && <span className="text-xs text-gray-500">{l.category}</span>}
                  {/* Channel badges */}
                  {(() => {
                    const channels = getChannels(l);
                    const isMarketingPlan = channels.length === 0 || channels.includes('d2c') || channels.includes('allegro');
                    return (
                      <>
                        {isMarketingPlan && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100" title="Wchodzi do planu marketingowego">
                            <span className="w-1 h-1 rounded-full bg-indigo-500" /> w marketingu
                          </span>
                        )}
                        {channels.map((ch) => {
                          const meta = CHANNEL_LABEL[ch];
                          if (!meta) return <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{ch}</span>;
                          return (
                            <span key={ch} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: meta.color }} /> {meta.label}
                            </span>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
                {l.short_pitch && <p className="text-sm text-gray-600 mb-2">{l.short_pitch}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  {/* Inline date editor */}
                  <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-gray-400">📅</span>
                    <span className="text-gray-500">Launch:</span>
                    <input
                      type="date"
                      value={l.planned_launch_date || ''}
                      onChange={(e) => patchLaunch(l.id, { planned_launch_date: e.target.value || null })}
                      className="text-xs font-semibold text-gray-800 bg-transparent border-b border-dashed border-gray-300 hover:border-indigo-500 focus:border-indigo-600 focus:outline-none px-0.5 py-0 cursor-pointer"
                      title="Edytuj datę launchu"
                    />
                    {!l.planned_launch_date && l.ai_suggested_date && (
                      <button
                        onClick={() => patchLaunch(l.id, { planned_launch_date: l.ai_suggested_date })}
                        className="text-orange-600 hover:text-orange-800 text-[11px] font-medium underline-offset-2 hover:underline"
                        title="Zastosuj sugestię AI"
                      >🤖 użyj {l.ai_suggested_date}</button>
                    )}
                    {savingField?.id === l.id && savingField.field === 'planned_launch_date' && (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    )}
                    {savedField?.id === l.id && savedField.field === 'planned_launch_date' && (
                      <span className="text-emerald-600 text-[10px] font-semibold">zapisano</span>
                    )}
                  </div>
                  {l.price_pln != null && <span>💰 {l.price_pln} PLN</span>}
                  {l.target_audience && <span>🎯 {l.target_audience}</span>}
                  {l.user_notes && <span className="text-amber-700">📝 uwagi do AI</span>}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); delLaunch(l.id); }}
                className="text-gray-400 hover:text-red-500 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Portfolio review modal */}
      {/* Sticky CTA: re-analyze strategy after manual edits */}
      {manualEdits > 0 && !reanalyzeDismissed && !showPortfolioReview && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm">
          <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 leading-tight">Plan zmieniony — odpal re-analizę</div>
              <p className="text-[12px] text-slate-500 mt-0.5">{manualEdits} {manualEdits === 1 ? 'edycja' : (manualEdits < 5 ? 'edycje' : 'edycji')} od ostatniej analizy AI</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setShowPortfolioReview(true); setManualEdits(0); }}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg transition-colors"
                >
                  Przeanalizuj ponownie
                </button>
                <button
                  onClick={() => setReanalyzeDismissed(true)}
                  className="px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Później
                </button>
              </div>
            </div>
            <button
              onClick={() => setReanalyzeDismissed(true)}
              className="p-1 -m-1 text-slate-400 hover:text-slate-700"
              aria-label="Zamknij"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showPortfolioReview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Strategia portfolio launchy
                </h2>
                <p className="text-xs text-gray-500 mt-1">AI przeanalizował wszystkie launche razem i proponuje optymalny układ</p>
              </div>
              <button onClick={() => setShowPortfolioReview(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Empty state — no review yet */}
              {!portfolioReview && !reviewingPortfolio && !loadingPortfolio && (
                <div className="text-center py-8">
                  <BarChart3 className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Brak zapisanej analizy. Uruchom pierwszą analizę portfolio.</p>
                  <button
                    onClick={() => runPortfolioReview(false)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg text-sm font-medium inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Uruchom analizę AI
                  </button>
                </div>
              )}
              {(reviewingPortfolio || loadingPortfolio) && !portfolioReview && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">{loadingPortfolio ? 'Ładuję zapisaną analizę...' : 'AI analizuje portfolio launchy...'}</p>
                </div>
              )}
              {/* Summary */}
              {portfolioReview?.portfolio_summary && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-indigo-800 mb-1">📋 Podsumowanie portfolio</div>
                  <p className="text-sm text-gray-700">{portfolioReview.portfolio_summary}</p>
                </div>
              )}

              {/* Year narrative */}
              {portfolioReview?.year_narrative && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-800 mb-1">📖 Narracja roczna</div>
                  <p className="text-sm text-gray-700">{portfolioReview.year_narrative}</p>
                </div>
              )}

              {/* Current issues */}
              {Array.isArray(portfolioReview?.current_issues) && portfolioReview.current_issues.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-800 mb-2">⚠️ Problemy z obecnym układem</div>
                  <ul className="space-y-1">
                    {portfolioReview.current_issues.map((issue: string, i: number) => (
                      <li key={i} className="text-sm text-red-700">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proposed timeline */}
              {Array.isArray(portfolioReview?.proposed_timeline) && portfolioReview.proposed_timeline.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-900">🗓️ Proponowana oś czasu</div>
                    {portfolioReview.proposed_timeline.some((t: any) => t.change !== 'keep') && (
                      <button
                        onClick={applyAllDates}
                        disabled={applyingAll}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                      >
                        {applyingAll ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stosuję zmiany...</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5" /> Zastosuj wszystkie zmiany + odśwież plany</>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {portfolioReview.proposed_timeline
                      .sort((a: any, b: any) => (a.order_in_sequence || 0) - (b.order_in_sequence || 0))
                      .map((item: any, i: number) => {
                        const changed = item.change !== 'keep';
                        const itemState = item.launch_id ? applyingDate[item.launch_id] : null;
                        return (
                          <div key={i} className={`rounded-lg p-4 border ${
                            itemState === 'done' ? 'bg-emerald-50 border-emerald-300' :
                            changed ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                  {item.order_in_sequence || i + 1}
                                </span>
                                <span className="font-semibold text-gray-900">{item.launch_name}</span>
                              </div>
                              <div className="text-right">
                                {changed ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="line-through text-gray-400">{item.current_date || '—'}</span>
                                    <span className="text-amber-700 font-bold">→ {item.proposed_date}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                      item.change === 'move_earlier' ? 'bg-green-100 text-green-700' :
                                      item.change === 'move_later' ? 'bg-amber-100 text-amber-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {item.change === 'move_earlier' ? '← wcześniej' :
                                       item.change === 'move_later' ? 'później →' : 'nowa data'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-sm text-green-700 font-medium">
                                    ✓ {item.proposed_date} (bez zmian)
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{item.rationale}</p>
                            {item.synergies && (
                              <p className="text-xs text-indigo-600 mt-1">🔗 {item.synergies}</p>
                            )}
                            {/* Action buttons per launch */}
                            {item.launch_id && (
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                {itemState === 'done' ? (
                                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                    ✓ Zastosowano i odświeżono plan
                                  </span>
                                ) : itemState === 'applying' ? (
                                  <span className="text-xs text-amber-700 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Zmieniam datę...
                                  </span>
                                ) : itemState === 'refreshing' ? (
                                  <span className="text-xs text-indigo-700 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Odświeżam plan marketingowy...
                                  </span>
                                ) : (
                                  <>
                                    {changed && (
                                      <>
                                        <button
                                          onClick={() => applyDateAndRefresh(item.launch_id, item.proposed_date)}
                                          className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md font-medium flex items-center gap-1"
                                        >
                                          <Sparkles className="w-3 h-3" /> Zastosuj datę + odśwież plan
                                        </button>
                                        <button
                                          onClick={() => applyDate(item.launch_id, item.proposed_date)}
                                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md font-medium"
                                        >
                                          Tylko zmień datę
                                        </button>
                                      </>
                                    )}
                                    {!changed && (
                                      <button
                                        onClick={() => applyDateAndRefresh(item.launch_id, item.proposed_date)}
                                        className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md font-medium flex items-center gap-1"
                                      >
                                        <RefreshCw className="w-3 h-3" /> Odśwież plan marketingowy
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  {portfolioReview?.launch_sequence_rationale && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                      <b className="text-gray-800">Dlaczego taka kolejność:</b> {portfolioReview.launch_sequence_rationale}
                    </div>
                  )}
                </div>
              )}

              {/* Team load */}
              {portfolioReview?.team_load_analysis && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-sky-800 mb-1">👥 Obciążenie zespołu</div>
                  <p className="text-sm text-gray-700">{portfolioReview.team_load_analysis}</p>
                </div>
              )}

              {/* Global recommendations */}
              {Array.isArray(portfolioReview?.global_recommendations) && portfolioReview.global_recommendations.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-emerald-800 mb-2">💡 Rekomendacje strategiczne</div>
                  <ul className="space-y-1">
                    {portfolioReview.global_recommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-emerald-700">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Calendar gaps */}
              {Array.isArray(portfolioReview?.calendar_gaps) && portfolioReview.calendar_gaps.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-800 mb-2">📅 Luki w kalendarzu</div>
                  <ul className="space-y-1">
                    {portfolioReview.calendar_gaps.map((gap: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600">• {gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested products */}
              {Array.isArray(portfolioReview?.suggested_products) && portfolioReview.suggested_products.length > 0 && (
                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-violet-900">🧩 Proponowane produkty uzupełniające</div>
                      <p className="text-xs text-violet-600 mt-0.5">AI sugeruje produkty wypełniające luki w portfolio. Zaznacz te, które chcesz dodać.</p>
                    </div>
                    {selectedSuggestions.size > 0 && (
                      <button
                        onClick={addSelectedSuggestions}
                        disabled={addingSuggestions}
                        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                      >
                        {addingSuggestions ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Dodaję...</>
                        ) : (
                          <><Plus className="w-3 h-3" /> Dodaj {selectedSuggestions.size} do launchy</>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {portfolioReview.suggested_products.map((sp: any, i: number) => {
                      const isSelected = selectedSuggestions.has(i);
                      const priorityStyle = sp.priority === 'must_have'
                        ? 'border-red-300 bg-red-50'
                        : sp.priority === 'nice_to_have'
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-gray-300 bg-gray-50';
                      const priorityLabel = sp.priority === 'must_have'
                        ? '🔴 Kluczowy'
                        : sp.priority === 'nice_to_have'
                        ? '🟡 Warto rozważyć'
                        : '🔵 Na przyszłość';
                      return (
                        <div
                          key={i}
                          onClick={() => toggleSuggestion(i)}
                          className={`rounded-lg p-3 border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                              : 'border-gray-200 bg-white hover:border-violet-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-sm text-gray-900">{sp.name}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{sp.category}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${priorityStyle}`}>{priorityLabel}</span>
                                {sp.suggested_month && (
                                  <span className="text-xs text-gray-500">📅 {sp.suggested_month}</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{sp.short_pitch}</p>
                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                                {sp.portfolio_fit && (
                                  <span className="text-xs text-violet-600">🧩 {sp.portfolio_fit}</span>
                                )}
                                {sp.month_rationale && (
                                  <span className="text-xs text-gray-500">🗓️ {sp.month_rationale}</span>
                                )}
                                {sp.estimated_price_range_pln?.[0] && (
                                  <span className="text-xs text-gray-500">💰 {sp.estimated_price_range_pln[0]}–{sp.estimated_price_range_pln[1]} PLN</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedSuggestions.size > 0 && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-violet-600">{selectedSuggestions.size} zaznaczonych</span>
                      <button
                        onClick={addSelectedSuggestions}
                        disabled={addingSuggestions}
                        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        {addingSuggestions ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Dodaję...</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Dodaj zaznaczone jako nowe launche</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Risks */}
              {Array.isArray(portfolioReview?.risks) && portfolioReview.risks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-amber-800 mb-2">⚡ Ryzyka</div>
                  <ul className="space-y-1">
                    {portfolioReview.risks.map((risk: string, i: number) => (
                      <li key={i} className="text-sm text-amber-700">• {risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* User comments for re-analysis */}
              {portfolioReview && <div className="border-t pt-5">
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  💬 Twoje komentarze do re-analizy
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Napisz co chcesz zmienić, z czym się nie zgadzasz, jakie masz ograniczenia — AI weźmie to pod uwagę w nowej analizie.
                </p>
                <textarea
                  value={portfolioComments}
                  onChange={(e) => setPortfolioComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="np. Matcha Shake musi być w maju bo mamy już zamówione surowce. Banofi chcę przesunąć na lato. Zespół graficzny w lipcu ma urlopy..."
                />
                <button
                  onClick={() => runPortfolioReview(true)}
                  disabled={reviewingPortfolio || !portfolioComments.trim()}
                  className="mt-3 w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {reviewingPortfolio ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> AI przelicza z uwagami...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Re-analiza z moimi uwagami</>
                  )}
                </button>
              </div>}
            </div>
            <div className="p-6 border-t flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => runPortfolioReview(false)}
                  disabled={reviewingPortfolio}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${reviewingPortfolio ? 'animate-spin' : ''}`} />
                  Od nowa (bez uwag)
                </button>
                {portfolioVersion > 0 && (
                  <span className="text-xs text-gray-400">
                    v{portfolioVersion} · {portfolioUpdatedAt ? new Date(portfolioUpdatedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPortfolioReview(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / re-analyze modal */}
      {openLaunch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{openLaunch.name}</h2>
                <div className="text-xs text-gray-500 mt-1">
                  {TYPE_LABEL[openLaunch.launch_type || "single"]}
                  {openLaunch.category && ` · ${openLaunch.category}`}
                </div>
              </div>
              <button onClick={() => setOpenLaunch(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {openLaunch.short_pitch && <p className="text-sm text-gray-700">{openLaunch.short_pitch}</p>}
              {openLaunch.description && (
                <div className="text-sm text-gray-600 whitespace-pre-wrap">{openLaunch.description}</div>
              )}

              {openSuggestion ? (
                <SuggestionView s={openSuggestion} />
              ) : (
                <div className="text-sm text-gray-400 italic">
                  Brak zapisanej analizy AI. Dodaj uwagi poniżej i kliknij „Re-analiza".
                </div>
              )}

              <div className="border-t pt-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Twoje uwagi dla AI (np. „lead time surowców 6 tygodni", „unikaj maja")
                </label>
                <textarea
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Co AI nie wiedział, a powinien uwzględnić w nowej analizie..."
                />
                <button
                  onClick={resuggest}
                  disabled={resuggesting}
                  className="mt-3 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {resuggesting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> AI przeliczają...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Re-analiza z uwagami</>
                  )}
                </button>
              </div>
            </div>
            <div className="p-6 border-t flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => delLaunch(openLaunch.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Usuń
              </button>
              <div className="flex items-center gap-3 flex-wrap">
                {openSuggestion?.suggested_date && (
                  <button
                    onClick={() => acceptSuggestedDate()}
                    disabled={applying}
                    className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                  >
                    {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
                    Akceptuj datę {openSuggestion.suggested_date}
                  </button>
                )}
                <input
                  type="date"
                  defaultValue={openLaunch.planned_launch_date || openSuggestion?.suggested_date || ''}
                  onChange={(e) => { if (e.target.value) acceptSuggestedDate(e.target.value); }}
                  disabled={applying}
                  className="text-sm px-2 py-1.5 border border-gray-300 rounded"
                  title="Wybierz inną datę"
                />
                <button
                  onClick={() => setOpenLaunch(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}

      {/* Per-channel proposals modal */}
      {proposeChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !proposeLoading && setProposeChannel(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Propozycje produktów dla kanału: <span className="text-indigo-700">{CHANNEL_LABEL[proposeChannel]?.label || proposeChannel}</span></h3>
                  <p className="text-[11.5px] text-slate-500">AI używa pełnej wiedzy z Brain (strategia, KPI, persony, marże, reguły kanału)</p>
                </div>
              </div>
              <button onClick={() => !proposeLoading && setProposeChannel(null)} disabled={proposeLoading} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {proposeLoading && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                  <p className="text-[13px] text-slate-700">AI pracuje... (60-90s)</p>
                  <p className="text-[11px] text-slate-500 mt-1">Czyta Brain, analizuje obecny pipeline kanału, projektuje propozycje</p>
                </div>
              )}
              {proposeData?.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-800">{proposeData.error}</div>
              )}
              {proposeData?.channel_diagnosis && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-1">Diagnoza kanału</div>
                  <p className="text-[13px] text-slate-800 leading-relaxed">{proposeData.channel_diagnosis}</p>
                  {Array.isArray(proposeData.gap_analysis) && proposeData.gap_analysis.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-indigo-100">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-1.5">Luki</div>
                      <ul className="space-y-1">
                        {proposeData.gap_analysis.map((g: string, i: number) => (
                          <li key={i} className="text-[12px] text-slate-700 flex gap-2"><span className="text-indigo-500">▸</span><span>{g}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {Array.isArray(proposeData?.proposals) && proposeData.proposals.map((p: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ' + (p.priority === 'must_have' ? 'bg-rose-100 text-rose-800' : p.priority === 'nice_to_have' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>{p.priority}</span>
                      {p.category && <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">{p.category}</span>}
                      {p.format_grams && <span className="text-[10px] font-mono text-violet-700 px-1.5 py-0.5 bg-violet-50 rounded">{p.format_grams}</span>}
                      {p.suggested_month && <span className="text-[10px] text-slate-500">📅 {p.suggested_month}</span>}
                      {p.estimated_price_pln && <span className="text-[10px] font-bold text-slate-700">💰 {p.estimated_price_pln} PLN</span>}
                    </div>
                    <h4 className="text-[15px] font-bold text-slate-900">{p.name}</h4>
                    <p className="text-[12.5px] text-slate-700 mt-1.5 leading-relaxed">{p.short_pitch}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11.5px] mt-3">
                    <div className="bg-indigo-50/60 rounded-lg p-2">
                      <div className="text-[9.5px] uppercase tracking-wider font-bold text-indigo-700 mb-0.5">Dlaczego TEN kanał</div>
                      <div className="text-slate-700">{p.why_this_channel}</div>
                    </div>
                    <div className="bg-emerald-50/60 rounded-lg p-2">
                      <div className="text-[9.5px] uppercase tracking-wider font-bold text-emerald-700 mb-0.5">Dlaczego TERAZ</div>
                      <div className="text-slate-700">{p.why_now}</div>
                    </div>
                    <div className="bg-violet-50/60 rounded-lg p-2">
                      <div className="text-[9.5px] uppercase tracking-wider font-bold text-violet-700 mb-0.5">Synergia</div>
                      <div className="text-slate-700">{p.portfolio_synergy}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-[9.5px] uppercase tracking-wider font-bold text-slate-600 mb-0.5">NIE pasuje gdzie indziej</div>
                      <div className="text-slate-700">{p.why_not_other_channels}</div>
                    </div>
                  </div>
                  {p.risk && <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/60 rounded px-2 py-1.5"><b>⚠ Ryzyko:</b> {p.risk}</div>}
                  <button
                    onClick={() => adoptProposal(p)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-[13px] font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" /> Dodaj do pipeline launchów
                  </button>
                </div>
              ))}
            </div>
            {!proposeLoading && proposeData && !proposeData.error && (
              <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/60 flex items-center gap-2">
                <input
                  type="text"
                  value={proposeUserPrompt}
                  onChange={(e) => setProposeUserPrompt(e.target.value)}
                  placeholder="Dodaj uwagi (np. 'fokus na zimę', 'budżet do 50zł') i wygeneruj nowe..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  onClick={() => runProposeForChannel(proposeChannel, proposeUserPrompt)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[12px] font-semibold"
                >
                  ↻ Przelicz
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nowy launch</h2>
              <button
                onClick={() => { setShowCreate(false); setSuggestion(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Typ launchu</label>
                <div className="flex gap-2">
                  {(["single", "product_line"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDraft({ ...draft, launch_type: t })}
                      className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium ${
                        (draft.launch_type || "single") === t
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-orange-300"
                      }`}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nazwa {draft.launch_type === "product_line" ? "linii" : "produktu"} *
                </label>
                <input
                  type="text"
                  value={draft.name || ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder={draft.launch_type === "product_line" ? "np. Letnia kolekcja Cold Brew 2026" : "np. Matcha Hojicha Premium"}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Krótki opis (AI uzupełni resztę — datę, grupę, cenę)
                </label>
                <textarea
                  value={draft.description || ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Co to jest, dla kogo, czym się wyróżnia. Im więcej napiszesz, tym lepsza sugestia."
                />
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 font-medium">Szczegóły opcjonalne (jeśli już znasz)</summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Krótki pitch (1 zdanie)</label>
                    <input
                      type="text"
                      value={draft.short_pitch || ""}
                      onChange={(e) => setDraft({ ...draft, short_pitch: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kategoria</label>
                      <input
                        type="text"
                        value={draft.category || ""}
                        onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cena (PLN)</label>
                      <input
                        type="number"
                        value={draft.price_pln ?? ""}
                        onChange={(e) => setDraft({ ...draft, price_pln: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Skład</label>
                    <textarea
                      value={draft.ingredients || ""}
                      onChange={(e) => setDraft({ ...draft, ingredients: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Grupa docelowa (jeśli wiesz)</label>
                    <input
                      type="text"
                      value={draft.target_audience || ""}
                      onChange={(e) => setDraft({ ...draft, target_audience: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={draft.status || "idea"}
                        onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Planowana data launchu</label>
                      <input
                        type="date"
                        value={draft.planned_launch_date || ""}
                        onChange={(e) => setDraft({ ...draft, planned_launch_date: e.target.value || undefined })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </details>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Uwagi dla AI (czego nie wie? lead time? sezon?)
                </label>
                <textarea
                  value={draft.user_notes || ""}
                  onChange={(e) => setDraft({ ...draft, user_notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="np. Surowce z Japonii — lead time 6 tygodni. Chcę uniknąć maja."
                />
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={suggestTiming}
                  disabled={suggesting || !draft.name}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {suggesting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> AI analizuje...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Zasugeruj najlepszy czas launchu (AI)</>
                  )}
                </button>
                {!draft.name && (
                  <p className="text-xs text-gray-400 mt-2 text-center">Najpierw wpisz nazwę</p>
                )}
              </div>

              {suggestion && <SuggestionView s={suggestion} />}
            </div>

            <div className="p-6 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setSuggestion(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Anuluj
              </button>
              <button
                onClick={createLaunch}
                disabled={!draft.name || saving}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saving ? "Zapisywanie..." : "Zapisz launch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
