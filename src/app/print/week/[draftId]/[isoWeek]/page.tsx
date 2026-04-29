// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function WeekPrint() {
  const params = useParams();
  const draftId = params?.draftId;
  const isoWeek = parseInt(String(params?.isoWeek || '0'), 10);
  const [week, setWeek] = useState<any>(null);
  const [draftMeta, setDraftMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/planner/drafts/${draftId}`).then(r => r.json()).then(j => {
      const draft = j.data;
      if (!draft) { setLoading(false); return; }
      let payload: any = null;
      try { payload = typeof draft.payload === 'string' ? JSON.parse(draft.payload) : draft.payload; } catch {}
      const weeks = payload?.weeks || payload?.week_plans || [];
      const w = weeks.find((x: any) => (x.isoWeek || x.iso_week) === isoWeek) || weeks[0];
      setWeek(w);
      setDraftMeta({ month: draft.month, name: draft.name });
      setLoading(false);
      if (w?.theme) document.title = `Tydzień ${isoWeek} — ${w.theme}`;
    });
  }, [draftId, isoWeek]);

  if (loading) return <p>Ładuję plan tygodnia…</p>;
  if (!week) return <p>Nie znaleziono tygodnia {isoWeek} w drafcie {draftId}.</p>;

  return (
    <>
      <div className="meta-row">
        <span><b>Plan miesiąca:</b> {draftMeta?.month}</span>
        <span><b>Tydzień ISO:</b> {week.isoWeek || isoWeek}</span>
        {week.dateRange && <span><b>Daty:</b> {week.dateRange}</span>}
        {!week.dateRange && week.start_date && <span><b>Daty:</b> {week.start_date} – {week.end_date}</span>}
        {week.weekly_budget_pln && <span><b>Budżet:</b> {week.weekly_budget_pln} PLN</span>}
      </div>
      <h1>{week.theme || 'Tydzień ' + (week.isoWeek || isoWeek)}</h1>
      {week.rationale && <p>{week.rationale}</p>}

      {Array.isArray(week.hero_products) && week.hero_products.length > 0 && (
        <>
          <h2>Hero produkty</h2>
          <div>
            {week.hero_products.map((p: any, i: number) => (
              <div key={i} style={{ padding: 8, marginBottom: 6, background: '#f8fafc', borderRadius: 4 }}>
                <strong>{p.name || p}</strong>
                {p.why && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.why}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {week.launch_context && (
        <div className="box"><b>Kontekst premier:</b> {week.launch_context}</div>
      )}

      {week.promo && week.promo.type && week.promo.type !== 'none' && (
        <>
          <h2>Promo</h2>
          <div className="box">
            <b>Typ:</b> {week.promo.type} {week.promo.value || ''}<br />
            {week.promo.mechanics && <><b>Mechanika:</b> {week.promo.mechanics}<br /></>}
            {week.promo.code && <><b>Kod:</b> {week.promo.code}<br /></>}
            {week.promo.duration && <><b>Czas trwania:</b> {week.promo.duration}</>}
          </div>
        </>
      )}

      {Array.isArray(week.channels) && week.channels.length > 0 && (
        <>
          <h2>Plan per kanał</h2>
          <div className="grid-2">
            {week.channels.map((ch: any, i: number) => (
              <div key={i} className="col">
                <b>{ch.platform || ch.channel || 'Kanał'} {ch.budget_pln ? `· ${ch.budget_pln} zł` : ''}</b>
                {ch.creative_hook && <div><strong>Hook:</strong> {ch.creative_hook}</div>}
                {ch.body && <div><strong>Body:</strong> {ch.body}</div>}
                {ch.audience && <div><strong>Audience:</strong> {ch.audience}</div>}
                {ch.objective && <div><strong>Cel:</strong> {ch.objective}</div>}
                {ch.format && <div><strong>Format:</strong> {ch.format}</div>}
                {ch.cta && <div><strong>CTA:</strong> {ch.cta}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {week.designer_summary && (
        <>
          <h2>🎨 Brief dla designera</h2>
          <div className="box" style={{ whiteSpace: 'pre-wrap' }}>{week.designer_summary}</div>
        </>
      )}

      {week.copywriter_summary && (
        <>
          <h2>✍️ Brief dla copywritera</h2>
          <div className="box" style={{ whiteSpace: 'pre-wrap' }}>{week.copywriter_summary}</div>
        </>
      )}

      {Array.isArray(week.mia_tiktok_variants) && week.mia_tiktok_variants.length > 0 && (
        <>
          <h2>🎬 Warianty TikTok / Reels (Mia)</h2>
          {week.mia_tiktok_variants.map((v: any, i: number) => (
            <div key={i} style={{ padding: 10, marginBottom: 8, background: '#fef3c7', borderRadius: 6, fontSize: 12.5 }}>
              {v.title && <div><strong>{v.title}</strong></div>}
              {(v.opening_first_2_seconds || v.hook_seconds_1_3) && (
                <div><strong>Pierwsze 2s:</strong> {v.opening_first_2_seconds || v.hook_seconds_1_3}</div>
              )}
              {v.body && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{v.body}</div>}
              {v.energy && <div style={{ marginTop: 4, fontStyle: 'italic', color: '#92400e' }}>Energia: {v.energy}</div>}
            </div>
          ))}
        </>
      )}

      {Array.isArray(week.kpi) && week.kpi.length > 0 && (
        <>
          <h2>KPI</h2>
          <ul>{week.kpi.map((k: any, i: number) => <li key={i}>{typeof k === 'string' ? k : `${k.metric}: ${k.target}`}</li>)}</ul>
        </>
      )}

      <div className="footer">
        Wydrukowano z BHT Marketing Planner · {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} · plan {draftMeta?.month} · tydzień ISO {week.isoWeek || isoWeek}
      </div>
    </>
  );
}
