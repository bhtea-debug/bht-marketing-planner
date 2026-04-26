// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Plus, Trash2, Film } from "lucide-react";
import { PageHeader } from "@/components/shell";

type Asset = {
  id: number;
  product_name?: string;
  asset_type: "image" | "video";
  url: string;
  thumbnail_url?: string;
  alt_text?: string;
  tags?: string;
  notes?: string;
};

export default function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ asset_type: "image" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/assets");
      const json = await res.json();
      setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.url) return;
    setSaving(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ asset_type: "image" });
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Usunąć?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Zasoby"
        icon={ImageIcon}
        title="Biblioteka kreacji"
        description="Zdjęcia i wideo, których AI używa przy push'owaniu reklam do Meta.
          Wklej publiczny URL (Cloudinary, Woo, Drive z udostępnieniem). Powiąż z nazwą
          produktu (zgodnie z Woo) — wtedy AI dobierze je automatycznie do hero produktu kafelka.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-5 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Typ</label>
            <select
              value={form.asset_type}
              onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="image">Zdjęcie</option>
              <option value="video">Wideo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Powiązany produkt (jak w Woo)
            </label>
            <input
              type="text"
              value={form.product_name || ""}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="np. Matcha codzienna BIO"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">URL pliku *</label>
          <input
            type="url"
            value={form.url || ""}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            placeholder="https://..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alt text</label>
            <input
              type="text"
              value={form.alt_text || ""}
              onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="np. Zaparzona matcha w szklanej filiżance"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tagi (po przecinku)</label>
            <input
              type="text"
              value={form.tags || ""}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="np. matcha, morning, detox"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={add}
            disabled={!form.url || saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Dodaj asset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Ładowanie…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
          Brak assetów. Dodaj pierwsze zdjęcia/wideo żeby AI mogło tworzyć reklamy.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border overflow-hidden group">
              <div className="aspect-square bg-gray-100 relative">
                {a.asset_type === "image" ? (
                  <img src={a.thumbnail_url || a.url} alt={a.alt_text || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Film className="w-10 h-10" />
                  </div>
                )}
                <button
                  onClick={() => del(a.id)}
                  className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {a.product_name || "Generic"}
                </div>
                {a.tags && <div className="text-xs text-gray-500 truncate">{a.tags}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
