// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Sparkles, Plus, Trash2, Loader2, Rocket } from "lucide-react";

type Launch = {
  id: number;
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
  notes?: string;
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

export default function LaunchesPage() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<Partial<Launch>>({ status: "idea" });
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  async function createLaunch() {
    setSaving(true);
    try {
      const body: any = { ...draft };
      if (suggestion?.suggested_date && !body.planned_launch_date) {
        body.ai_suggested_date = suggestion.suggested_date;
        body.ai_suggestion_notes = JSON.stringify(suggestion);
      }
      const res = await fetch("/api/launches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreate(false);
        setDraft({ status: "idea" });
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
    load();
  }

  async function suggestTiming() {
    if (!draft.name) {
      alert("Najpierw nazwij produkt");
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

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-orange-500" />
            Launche nowości
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Planuj nowe produkty z wyprzedzeniem. AI sugeruje optymalny czas
            launchu na bazie opisu, składu, ceny i kalendarza.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setDraft({ status: "idea" });
            setSuggestion(null);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nowy launch
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Ładowanie...</div>
      ) : launches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Rocket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">
            Brak zaplanowanych launchów. Dodaj pierwszy nowy produkt.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Dodaj launch
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {launches.map((l) => (
            <div
              key={l.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900">{l.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      STATUS_COLOR[l.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {STATUS_LABEL[l.status] || l.status}
                  </span>
                  {l.category && (
                    <span className="text-xs text-gray-500">{l.category}</span>
                  )}
                </div>
                {l.short_pitch && (
                  <p className="text-sm text-gray-600 mb-2">{l.short_pitch}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {l.planned_launch_date && (
                    <span>
                      📅 Launch: <b>{l.planned_launch_date}</b>
                    </span>
                  )}
                  {!l.planned_launch_date && l.ai_suggested_date && (
                    <span className="text-orange-600">
                      🤖 AI sugeruje: <b>{l.ai_suggested_date}</b>
                    </span>
                  )}
                  {l.price_pln != null && <span>💰 {l.price_pln} PLN</span>}
                  {l.target_audience && <span>🎯 {l.target_audience}</span>}
                </div>
              </div>
              <button
                onClick={() => delLaunch(l.id)}
                className="text-gray-400 hover:text-red-500 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nowy launch</h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setSuggestion(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nazwa produktu *
                </label>
                <input
                  type="text"
                  value={draft.name || ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="np. Matcha Hojicha Premium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Krótki pitch (1 zdanie)
                </label>
                <input
                  type="text"
                  value={draft.short_pitch || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, short_pitch: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="np. Prażona japońska herbata, niska kofeina, smak karmelu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Kategoria
                  </label>
                  <input
                    type="text"
                    value={draft.category || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="np. matcha, rooibos, akcesoria"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cena (PLN)
                  </label>
                  <input
                    type="number"
                    value={draft.price_pln ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        price_pln: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Opis / funkcje / korzyści
                </label>
                <textarea
                  value={draft.description || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Co to jest, dla kogo, jaki problem rozwiązuje, jakie ma cechy"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Skład
                </label>
                <textarea
                  value={draft.ingredients || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, ingredients: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="np. Camellia sinensis (japońska prażona), 100% naturalne"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Grupa docelowa (jeśli wiesz)
                </label>
                <input
                  type="text"
                  value={draft.target_audience || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, target_audience: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="np. kobiety 25-40, mindfulness, BIO"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={draft.status || "idea"}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Planowana data launchu
                  </label>
                  <input
                    type="date"
                    value={draft.planned_launch_date || ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        planned_launch_date: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={suggestTiming}
                  disabled={suggesting || !draft.name}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {suggesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI analizuje...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Zasugeruj najlepszy czas launchu (AI)
                    </>
                  )}
                </button>
                {!draft.name && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Najpierw wpisz nazwę produktu
                  </p>
                )}
              </div>

              {suggestion && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-orange-700 font-medium">
                        Sugerowana data launchu
                      </div>
                      <div className="text-xl font-bold text-orange-900">
                        {suggestion.suggested_date}
                      </div>
                    </div>
                    {suggestion.confidence && (
                      <span className="text-xs px-2 py-1 bg-white rounded text-orange-700 font-medium">
                        confidence: {suggestion.confidence}
                      </span>
                    )}
                  </div>
                  {suggestion.rationale && (
                    <p className="text-sm text-gray-700">
                      {suggestion.rationale}
                    </p>
                  )}
                  {suggestion.target_audience_refined && (
                    <div className="text-sm">
                      <b>Doprecyzowana grupa:</b>{" "}
                      {suggestion.target_audience_refined}
                    </div>
                  )}
                  {suggestion.pricing_check && (
                    <div className="text-sm">
                      <b>Cena ({suggestion.pricing_check.verdict}):</b>{" "}
                      {suggestion.pricing_check.comment}
                      {suggestion.pricing_check.suggested_range_pln && (
                        <span>
                          {" "}
                          ({suggestion.pricing_check.suggested_range_pln[0]}-
                          {suggestion.pricing_check.suggested_range_pln[1]} PLN)
                        </span>
                      )}
                    </div>
                  )}
                  {Array.isArray(suggestion.hero_hooks) &&
                    suggestion.hero_hooks.length > 0 && (
                      <div className="text-sm">
                        <b>Hooki copywriterskie:</b>
                        <ul className="mt-1 space-y-1">
                          {suggestion.hero_hooks.map((h: string, i: number) => (
                            <li key={i} className="text-gray-700">
                              · {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {Array.isArray(suggestion.launch_plan) &&
                    suggestion.launch_plan.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-orange-700">
                          Pełny plan launchu (
                          {suggestion.launch_plan.length} faz)
                        </summary>
                        <div className="mt-2 space-y-2">
                          {suggestion.launch_plan.map((p: any, i: number) => (
                            <div
                              key={i}
                              className="bg-white rounded p-2 border border-orange-200"
                            >
                              <div className="font-medium">
                                {p.phase} (T{p.weeks_before_launch >= 0 ? "-" : "+"}
                                {Math.abs(p.weeks_before_launch)})
                              </div>
                              {Array.isArray(p.channels) &&
                                p.channels.map((c: any, j: number) => (
                                  <div
                                    key={j}
                                    className="text-xs text-gray-600 mt-1"
                                  >
                                    · {c.channel} · {c.format}: {c.hook}
                                  </div>
                                ))}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  {Array.isArray(suggestion.warnings) &&
                    suggestion.warnings.length > 0 && (
                      <div className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                        ⚠ {suggestion.warnings.join(" · ")}
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="p-6 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setSuggestion(null);
                }}
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
