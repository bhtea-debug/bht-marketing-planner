// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mail,
  Target,
  Palette,
  FileText,
  Wallet,
  MessageSquare,
  Copy,
  Check,
  CheckCircle2,
  Play,
  Pause,
  Zap,
  RotateCcw,
} from "lucide-react";

type B2bCampaign = {
  id: number;
  name: string;
  segment: string;
  status: string;
  objective?: string;
  ai_campaign_json?: string;
  user_notes?: string;
  monthly_budget_pln?: number;
  leads_count?: number;
  created_at?: string;
  updated_at?: string;
};

const SEGMENTS = [
  { value: "kawiarnia", label: "Kawiarnia", emoji: "☕" },
  { value: "kawiarnia_weganska", label: "Kawiarnia wegańska", emoji: "🌿" },
  { value: "bistro_brunch", label: "Bistro / brunch", emoji: "🍳" },
  { value: "piekarnia", label: "Piekarnia", emoji: "🥐" },
  { value: "palarnia_kawy", label: "Palarnia kawy", emoji: "🔥" },
  { value: "delikatesy", label: "Delikatesy", emoji: "🧀" },
  { value: "sklep_online", label: "Sklep online", emoji: "🛒" },
  { value: "concept_store", label: "Concept store", emoji: "🏬" },
  { value: "firma_prezentowa", label: "Firma prezentowa", emoji: "🎁" },
  { value: "hotel_boutique", label: "Hotel boutique", emoji: "🏨" },
  { value: "sklep_eko", label: "Sklep eko", emoji: "🌱" },
  { value: "sklep_naturalny", label: "Sklep naturalny", emoji: "💚" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Do zatwierdzenia",
  approved: "Zatwierdzona",
  active: "Aktywna",
  paused: "Wstrzymana",
  completed: "Zakończona",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-indigo-100 text-indigo-800",
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-orange-100 text-orange-800",
  completed: "bg-blue-100 text-blue-800",
};

async function parseStreamedJSON(res: Response): Promise<any> {
  const text = await res.text();
  const trimmed = text.trim();
  const lastNewline = trimmed.lastIndexOf("\n");
  const jsonStr = lastNewline >= 0 ? trimmed.slice(lastNewline + 1) : trimmed;
  return JSON.parse(jsonStr);
}

export default function B2bLeadsPage() {
  const [campaigns, setCampaigns] = useState<B2bCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSegment, setNewSegment] = useState("kawiarnie");
  const [newObjective, setNewObjective] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [creating, setCreating] = useState(false);

  // Selected campaign detail
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Feedback for re-generation
  const [feedback, setFeedback] = useState("");

  // Expanded sections in detail view
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    strategy: true,
    ads: true,
    creative: true,
    targeting: true,
    form: true,
    budget: true,
    emails: true,
  });

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bulk generation
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; segment: string } | null>(null);

  async function fetchCampaigns() {
    try {
      const r = await fetch("/api/b2b-leads");
      const j = await r.json();
      if (j.data) setCampaigns(j.data);
    } catch (e) {
      console.error("fetch error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const selected = campaigns.find((c) => c.id === selectedId);
  const campaignData = selected?.ai_campaign_json
    ? typeof selected.ai_campaign_json === "string"
      ? JSON.parse(selected.ai_campaign_json)
      : selected.ai_campaign_json
    : null;

  async function createCampaign() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch("/api/b2b-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          segment: newSegment,
          objective: newObjective || null,
          monthly_budget_pln: newBudget ? Number(newBudget) : null,
        }),
      });
      const j = await r.json();
      if (j.data?.id) {
        setNewName("");
        setNewObjective("");
        setNewBudget("");
        setShowCreate(false);
        await fetchCampaigns();
        setSelectedId(j.data.id);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  async function deleteCampaign(id: number) {
    if (!confirm("Usunąć tę kampanię?")) return;
    await fetch("/api/b2b-leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedId === id) setSelectedId(null);
    fetchCampaigns();
  }

  async function generateCampaign(campaignId?: number) {
    const target = campaignId ? campaigns.find((c) => c.id === campaignId) : selected;
    if (!target) return;

    setGenerating(true);
    setGenError(null);

    try {
      const r = await fetch("/api/b2b-leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment: target.segment,
          objective: target.objective,
          budget_pln: target.monthly_budget_pln,
          user_notes: feedback || target.user_notes || null,
          previousCampaign: campaignData,
        }),
      });

      let j: any = null;
      try {
        j = await parseStreamedJSON(r);
      } catch (e: any) {
        setGenError("Błąd parsowania: " + e.message);
        return;
      }

      if (!r.ok || j?.error || !j?.data?.campaign) {
        setGenError(j?.error || `HTTP ${r.status}`);
        return;
      }

      // Save generated campaign to DB and set status to pending_review
      await fetch("/api/b2b-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          ai_campaign_json: j.data.campaign,
          user_notes: feedback || target.user_notes,
          status: "pending_review",
        }),
      });

      setFeedback("");
      await fetchCampaigns();
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function updateCampaignStatus(id: number, status: string) {
    await fetch("/api/b2b-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await fetchCampaigns();
  }

  async function bulkGenerate() {
    setBulkGenerating(true);
    const segmentsToGenerate = SEGMENTS.filter(
      (s) => !campaigns.find((c) => c.segment === s.value && c.ai_campaign_json)
    );
    const total = segmentsToGenerate.length;

    for (let i = 0; i < segmentsToGenerate.length; i++) {
      const seg = segmentsToGenerate[i];
      setBulkProgress({ current: i + 1, total, segment: seg.label });

      // Check if campaign exists for this segment
      let existing = campaigns.find((c) => c.segment === seg.value);
      if (!existing) {
        // Create campaign first
        const r = await fetch("/api/b2b-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${seg.emoji} ${seg.label} — Rejestracja B2B`,
            segment: seg.value,
            objective: `Pozyskanie klientów hurtowych z segmentu "${seg.label}" do rejestracji w panelu B2B`,
          }),
        });
        const j = await r.json();
        if (j.data?.id) {
          existing = { id: j.data.id, name: seg.label, segment: seg.value, status: "draft" } as B2bCampaign;
        }
      }

      if (existing) {
        // Generate AI campaign
        try {
          const r = await fetch("/api/b2b-leads/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              segment: seg.value,
              objective: `Pozyskanie klientów hurtowych z segmentu "${seg.label}" do rejestracji w panelu B2B (b2b.brownhouseandtea.pl)`,
            }),
          });
          const j = await parseStreamedJSON(r);
          if (j?.data?.campaign) {
            await fetch("/api/b2b-leads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: existing.id,
                ai_campaign_json: j.data.campaign,
                status: "pending_review",
              }),
            });
          }
        } catch (e) {
          console.error(`Bulk generate error for ${seg.value}:`, e);
        }
      }
    }

    setBulkGenerating(false);
    setBulkProgress(null);
    await fetchCampaigns();
  }

  function toggleSection(key: string) {
    setExpandedSections((p) => ({ ...p, [key]: !p[key] }));
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const segmentEmoji = (seg: string) => SEGMENTS.find((s) => s.value === seg)?.emoji || "🏪";
  const segmentLabel = (seg: string) => SEGMENTS.find((s) => s.value === seg)?.label || seg;

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          eyebrow="Sprzedaż B2B"
          icon={Users}
          title="Leady B2B"
          description="Kampanie lead generation dla kawiarni, restauracji i sklepów — Meta Lead Ads z AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={bulkGenerate}
            disabled={bulkGenerating}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
          >
            {bulkGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {bulkProgress ? `${bulkProgress.current}/${bulkProgress.total} — ${bulkProgress.segment}` : "Generuję..."}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generuj dla wszystkich segmentów
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nowa kampania
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Nowa kampania B2B</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nazwa kampanii</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="np. Kawiarnie Warszawa Q2"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Segment</label>
              <select
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Cel kampanii (opcjonalnie)</label>
              <input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="np. 50 leadów / miesiąc z kawiarni specialty"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Budżet miesięczny (PLN)</label>
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                placeholder="np. 2000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={createCampaign}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Utwórz
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
              Anuluj
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Kampanie</h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Brak kampanii. Utwórz pierwszą!</p>
            </div>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                  selectedId === c.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{segmentEmoji(c.segment)}</span>
                      <h4 className="font-medium text-slate-900 text-sm truncate">{c.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">{segmentLabel(c.segment)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] || STATUS_COLOR.draft}`}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                      {c.ai_campaign_json && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                          AI wygenerowana
                        </span>
                      )}
                    </div>
                    {c.monthly_budget_pln && (
                      <p className="text-xs text-slate-400 mt-1">{c.monthly_budget_pln} PLN/msc</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCampaign(c.id);
                    }}
                    className="text-slate-300 hover:text-rose-500 ml-2 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Wybierz kampanię z listy lub utwórz nową</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-xl">{segmentEmoji(selected.segment)}</span>
                      {selected.name}
                    </h2>
                    {selected.objective && (
                      <p className="text-sm text-slate-500 mt-0.5">{selected.objective}</p>
                    )}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLOR[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>

                {/* Generate / Re-generate */}
                {!generating ? (
                  <div className="space-y-3">
                    {campaignData && (
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          Uwagi do przegenerowania (opcjonalnie)
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="np. Skup się bardziej na matcha latte, dodaj info o szkoleniach..."
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => generateCampaign()}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      {campaignData ? "Przelicz kampanię z AI" : "Generuj kampanię z AI"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    <span className="text-sm text-slate-600">
                      AI generuje pełną kampanię B2B... (może zająć do 60s)
                    </span>
                  </div>
                )}

                {genError && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                    {genError}
                  </div>
                )}

                {/* Approval workflow buttons */}
                {campaignData && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    {(selected.status === "draft" || selected.status === "pending_review") && (
                      <button
                        onClick={() => updateCampaignStatus(selected.id, "approved")}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Zatwierdź kampanię
                      </button>
                    )}
                    {selected.status === "approved" && (
                      <button
                        onClick={() => updateCampaignStatus(selected.id, "active")}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Aktywuj kampanię
                      </button>
                    )}
                    {selected.status === "active" && (
                      <button
                        onClick={() => updateCampaignStatus(selected.id, "paused")}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                        Wstrzymaj
                      </button>
                    )}
                    {selected.status === "paused" && (
                      <button
                        onClick={() => updateCampaignStatus(selected.id, "active")}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Wznów
                      </button>
                    )}
                    {selected.status !== "draft" && (
                      <button
                        onClick={() => updateCampaignStatus(selected.id, "draft")}
                        className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-sm transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Wróć do draftu
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Campaign detail sections */}
              {campaignData && (
                <div className="space-y-3">
                  {/* Strategy */}
                  {campaignData.strategy && (
                    <Section
                      title="Strategia kampanii"
                      icon={<Target className="w-4 h-4" />}
                      color="indigo"
                      expanded={expandedSections.strategy}
                      onToggle={() => toggleSection("strategy")}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoCard label="Cel" value={campaignData.strategy.campaign_goal} />
                        <InfoCard label="KPI" value={campaignData.strategy.kpi} />
                        <InfoCard label="USP" value={campaignData.strategy.usp} />
                        <InfoCard label="Ton komunikacji" value={campaignData.strategy.tone} />
                      </div>
                    </Section>
                  )}

                  {/* Ad Variants */}
                  {campaignData.ad_variants && (
                    <Section
                      title={`Copy reklamowe (${campaignData.ad_variants.length} warianty)`}
                      icon={<MessageSquare className="w-4 h-4" />}
                      color="amber"
                      expanded={expandedSections.ads}
                      onToggle={() => toggleSection("ads")}
                    >
                      <div className="space-y-3">
                        {campaignData.ad_variants.map((v: any, i: number) => (
                          <div key={i} className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-amber-800 uppercase">{v.variant_name}</span>
                              <span className="text-xs text-amber-600">{v.angle}</span>
                            </div>
                            <CopyableField label="Headline" value={v.headline} id={`ad-${i}-h`} copiedField={copiedField} onCopy={copyText} />
                            <CopyableField label="Primary text" value={v.primary_text} id={`ad-${i}-p`} copiedField={copiedField} onCopy={copyText} />
                            <CopyableField label="Description" value={v.description} id={`ad-${i}-d`} copiedField={copiedField} onCopy={copyText} />
                            <div className="text-xs mt-1">
                              <span className="text-slate-500">CTA:</span>{" "}
                              <span className="font-medium text-amber-800">{v.cta}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Creative */}
                  {campaignData.creative_concepts && (
                    <Section
                      title="Kierunek wizualny"
                      icon={<Palette className="w-4 h-4" />}
                      color="purple"
                      expanded={expandedSections.creative}
                      onToggle={() => toggleSection("creative")}
                    >
                      <div className="space-y-3">
                        {campaignData.creative_concepts.map((c: any, i: number) => (
                          <div key={i} className="bg-purple-50/50 rounded-lg p-4 border border-purple-100">
                            <h5 className="text-sm font-semibold text-purple-900 mb-1">{c.concept_name}</h5>
                            <p className="text-xs text-slate-700 mb-2">{c.visual_description}</p>
                            <div className="flex gap-3 text-xs">
                              <span className="text-purple-600">Mood: {c.mood}</span>
                              <span className="text-purple-600">Kolory: {c.colors}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Targeting */}
                  {campaignData.targeting && (
                    <Section
                      title="Targeting Meta"
                      icon={<Target className="w-4 h-4" />}
                      color="emerald"
                      expanded={expandedSections.targeting}
                      onToggle={() => toggleSection("targeting")}
                    >
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-medium text-slate-600">Zainteresowania:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(campaignData.targeting.interests || []).map((int: string, i: number) => (
                              <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                {int}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InfoCard label="Geo" value={campaignData.targeting.geo} />
                          <InfoCard label="Wiek" value={campaignData.targeting.age_range} />
                        </div>
                        {campaignData.targeting.lookalike && (
                          <InfoCard label="Lookalike" value={campaignData.targeting.lookalike} />
                        )}
                        {campaignData.targeting.exclusions?.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-slate-600">Wykluczenia:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {campaignData.targeting.exclusions.map((ex: string, i: number) => (
                                <span key={i} className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">
                                  {ex}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Lead Form */}
                  {campaignData.lead_form && (
                    <Section
                      title="Formularz leadowy"
                      icon={<FileText className="w-4 h-4" />}
                      color="sky"
                      expanded={expandedSections.form}
                      onToggle={() => toggleSection("form")}
                    >
                      <div className="space-y-3">
                        <div className="bg-sky-50/50 rounded-lg p-4 border border-sky-100">
                          <h5 className="font-semibold text-sm text-sky-900">{campaignData.lead_form.intro_headline}</h5>
                          <p className="text-xs text-slate-600 mt-1">{campaignData.lead_form.intro_description}</p>
                        </div>
                        <div className="space-y-2">
                          {(campaignData.lead_form.questions || []).map((q: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-medium shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <div>
                                <span className="font-medium text-slate-800">{q.question}</span>
                                <span className="text-slate-400 ml-1">({q.type})</span>
                                {q.options && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {q.options.map((o: string, oi: number) => (
                                      <span key={oi} className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                        {o}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100">
                          <span className="text-xs font-medium text-emerald-700">Thank you screen</span>
                          <h5 className="font-semibold text-sm text-emerald-900 mt-0.5">{campaignData.lead_form.thank_you_headline}</h5>
                          <p className="text-xs text-slate-600 mt-0.5">{campaignData.lead_form.thank_you_description}</p>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Budget */}
                  {campaignData.budget_plan && (
                    <Section
                      title="Budżet i harmonogram"
                      icon={<Wallet className="w-4 h-4" />}
                      color="orange"
                      expanded={expandedSections.budget}
                      onToggle={() => toggleSection("budget")}
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-100">
                            <div className="text-lg font-bold text-orange-900">
                              {campaignData.budget_plan.total_monthly_pln || "—"} PLN
                            </div>
                            <div className="text-xs text-orange-600">Budżet / msc</div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-100">
                            <div className="text-lg font-bold text-orange-900">
                              ~{campaignData.budget_plan.estimated_cpa_pln} PLN
                            </div>
                            <div className="text-xs text-orange-600">Est. CPA</div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-100">
                            <div className="text-lg font-bold text-orange-900">
                              ~{campaignData.budget_plan.estimated_leads_month}
                            </div>
                            <div className="text-xs text-orange-600">Leadów / msc</div>
                          </div>
                        </div>
                        {(campaignData.budget_plan.phases || []).map((p: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 text-xs bg-white rounded-lg p-3 border border-slate-100">
                            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <span className="font-medium text-slate-900">{p.phase_name}</span>
                              <span className="text-slate-400 ml-2">{p.duration}</span>
                            </div>
                            <span className="text-orange-700 font-medium">{p.daily_budget_pln} PLN/dzień</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Follow-up emails */}
                  {campaignData.follow_up_emails && (
                    <Section
                      title={`Follow-up emails (${campaignData.follow_up_emails.length})`}
                      icon={<Mail className="w-4 h-4" />}
                      color="rose"
                      expanded={expandedSections.emails}
                      onToggle={() => toggleSection("emails")}
                    >
                      <div className="space-y-3">
                        {campaignData.follow_up_emails.map((em: any, i: number) => (
                          <div key={i} className="bg-rose-50/50 rounded-lg p-4 border border-rose-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-rose-800">{em.email_name}</span>
                              <span className="text-xs text-rose-500">{em.send_after}</span>
                            </div>
                            <CopyableField label="Subject" value={em.subject} id={`em-${i}-s`} copiedField={copiedField} onCopy={copyText} />
                            <CopyableField label="Preview" value={em.preview_text} id={`em-${i}-p`} copiedField={copiedField} onCopy={copyText} />
                            <div className="mt-2">
                              <span className="text-xs font-medium text-slate-500">Treść:</span>
                              <ul className="mt-1 space-y-1">
                                {(em.body_points || []).map((bp: string, bi: number) => (
                                  <li key={bi} className="text-xs text-slate-700 flex items-start gap-1.5">
                                    <span className="text-rose-400 mt-0.5">•</span>
                                    {bp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== Sub-components ======

function Section({
  title,
  icon,
  color,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    sky: "bg-sky-50 border-sky-200 text-sky-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-5 py-3 text-sm font-semibold ${colorMap[color] || ""} border-b transition-colors hover:opacity-90`}
      >
        {icon}
        {title}
        <span className="ml-auto">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {expanded && <div className="p-5">{children}</div>}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className="text-sm text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function CopyableField({
  label,
  value,
  id,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string;
  id: string;
  copiedField: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 mt-1.5 group">
      <div className="flex-1">
        <span className="text-xs text-slate-500">{label}:</span>{" "}
        <span className="text-xs font-medium text-slate-800">{value}</span>
      </div>
      <button
        onClick={() => onCopy(value, id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 p-0.5"
        title="Kopiuj"
      >
        {copiedField === id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
