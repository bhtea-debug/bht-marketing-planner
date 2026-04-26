// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Palette, Save, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shell";

export default function BrandPage() {
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/brand-profile");
      const json = await res.json();
      const d = json.data || {};
      // parse JSON-stored fields back to text the user can see
      const palette = parseSafe(d.color_palette);
      const refs = parseSafe(d.reference_image_urls);
      setProfile({
        ...d,
        color_palette_text: palette
          ? Array.isArray(palette)
            ? palette.map((p: any) => (p.hex ? `${p.name || ""} ${p.hex}`.trim() : p)).join("\n")
            : String(palette)
          : "",
        reference_image_urls_text: refs
          ? Array.isArray(refs)
            ? refs.join("\n")
            : String(refs)
          : "",
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function parseSafe(s: any) {
    if (!s) return null;
    if (typeof s !== "string") return s;
    try { return JSON.parse(s); } catch { return s; }
  }

  async function save() {
    setSaving(true);
    try {
      // Convert text fields back to JSON
      const paletteLines = (profile.color_palette_text || "")
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);
      const palette = paletteLines.map((line: string) => {
        const m = line.match(/(#?[0-9a-fA-F]{3,8})$/);
        return m
          ? { name: line.replace(m[0], "").trim() || m[0], hex: m[0].startsWith("#") ? m[0] : `#${m[0]}` }
          : { name: line, hex: null };
      });
      const refs = (profile.reference_image_urls_text || "")
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);

      const body = {
        brand_voice: profile.brand_voice || null,
        visual_mood: profile.visual_mood || null,
        color_palette: palette,
        fonts: profile.fonts || null,
        do_list: profile.do_list || null,
        dont_list: profile.dont_list || null,
        composition_rules: profile.composition_rules || null,
        reference_image_urls: refs,
        inspiration_keywords: profile.inspiration_keywords || null,
        target_persona: profile.target_persona || null,
      };
      const res = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setSavedAt(new Date().toLocaleTimeString());
      else alert("Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  function field(label: string, key: string, placeholder: string, rows = 2) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        <textarea
          value={profile[key] || ""}
          onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
          rows={rows}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder={placeholder}
        />
      </div>
    );
  }

  if (loading) return <div className="text-gray-400">Ładowanie profilu marki…</div>;

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Marka"
        icon={Palette}
        title="Profil wizualny marki"
        description='To jest brand book dla AI. Im więcej tu wpiszesz, tym precyzyjniejsze będą briefy wizualne dla grafika w planie miesięcznym. AI używa tego jako kontekst za każdym razem kiedy generuje plan, sugestie launchu, czy push reklamy.'
      />

      <div className="bg-white rounded-xl border p-6 space-y-5">
        {field(
          "Tone of voice (jak mówi marka)",
          "brand_voice",
          "np. ciepło, bez clickbaitu, sensorycznie, zwracanie się 'na ty', krótkie zdania, polski język bez żargonu",
          3
        )}

        {field(
          "Visual mood (klimat wizualny w jednym akapicie)",
          "visual_mood",
          "np. premium-rzemieślnicze, slow-life, ciepłe naturalne światło, papier handmade, drewno orzechowe, szkło borokrzemowe, dotyk dłoni",
          4
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Paleta kolorów (jeden na linię, format „nazwa #hex")
          </label>
          <textarea
            value={profile.color_palette_text || ""}
            onChange={(e) => setProfile({ ...profile, color_palette_text: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            placeholder={`piasek #f5f1ea
karmel #e8dbc4
orzech #8b6f4e
espresso #3d2817`}
          />
        </div>

        {field(
          "Fonty / typografia",
          "fonts",
          "np. nagłówek: serif (Playfair Display), body: sans-serif (Inter), w grafikach unikamy więcej niż 2 fontów",
          2
        )}

        {field(
          "Co MUSI być w grafikach (do)",
          "do_list",
          "naturalne światło z lewej · widoczna tekstura papieru/drewna · ciepłe tony · ręka osoby parzącej herbatę · para nad filiżanką · realne ujęcie produktu",
          4
        )}

        {field(
          "Czego NIE wolno (don't)",
          "dont_list",
          "neonowe kolory · płaski sztuczny biały tło · stockowe zdjęcia ludzi · gradient · 3D-rendery · sztuczna parą AI · clickbait grafika",
          4
        )}

        {field(
          "Zasady kompozycji",
          "composition_rules",
          "kadr 4:5 lub 1:1 dla IG · produkt w 1/3 dolnej części · powietrze nad obiektem · krzywa wzroku w kierunku CTA · max 3 obiekty w kadrze",
          3
        )}

        {field(
          "Słowa-kotwice / inspiracje",
          "inspiration_keywords",
          "kintsugi, slow morning, japandi, autumn light, hand-thrown ceramics, rynek staromiejski, leniwe niedzielne śniadanie",
          2
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            URL-e referencyjnych zdjęć (po jednym na linię — możesz wkleić linki do swoich zdjęć z IG, Drive, Cloudinary)
          </label>
          <textarea
            value={profile.reference_image_urls_text || ""}
            onChange={(e) => setProfile({ ...profile, reference_image_urls_text: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            placeholder="https://..."
          />
        </div>

        {field(
          "Persona klienta (kto kupuje)",
          "target_persona",
          "Kobieta 28-42, miastowa, świadoma, zakupy online, ceni jakość ponad cenę, czyta opisy, śledzi marki na IG, premium ale nie show-off",
          3
        )}

        <div className="pt-4 border-t flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {savedAt && <>Zapisano o {savedAt}</>}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz profil marki
          </button>
        </div>
      </div>
    </div>
  );
}
