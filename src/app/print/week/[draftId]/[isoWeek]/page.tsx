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
      const plan = payload?.plan || payload || {};
      const weeks = plan.weeks || plan.week_plans || payload?.weeks || [];
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

      {/* Zakres obowiązków zespołu */}
      <h2>📋 Zakres obowiązków zespołu — ten tydzień</h2>
      {/* PRIMARY: AI-generated team_tasks (if available from week-plan endpoint) */}
      {week.team_tasks && typeof week.team_tasks === 'object' && (
        <div className="grid-2">
          {week.team_tasks.marketing_owner && <div className="col"><b>Marketing / Brand</b><div>{week.team_tasks.marketing_owner}</div></div>}
          {week.team_tasks.copywriter && <div className="col"><b>Copywriter</b><div>{week.team_tasks.copywriter}</div></div>}
          {week.team_tasks.designer && <div className="col"><b>Designer</b><div>{week.team_tasks.designer}</div></div>}
          {week.team_tasks.ads_meta && <div className="col"><b>Ads / Meta</b><div>{week.team_tasks.ads_meta}</div></div>}
          {week.team_tasks.content_mia && <div className="col"><b>Content / Mia</b><div>{week.team_tasks.content_mia}</div></div>}
          {week.team_tasks.operations && <div className="col"><b>Operacje (WC)</b><div>{week.team_tasks.operations}</div></div>}
          {week.team_tasks.influencer_pr && <div className="col"><b>Influencer / PR</b><div>{week.team_tasks.influencer_pr}</div></div>}
        </div>
      )}
      {/* FALLBACK: auto-derived if AI didn't generate team_tasks */}
      {!week.team_tasks && (
      <>
      <div className="grid-2">
        <div className="col">
          <b>Marketing / Brand owner</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Zatwierdzić motyw tygodnia: <strong>{week.theme || 'theme TBD'}</strong>.</li>
            {week.weekly_budget_pln && <li>Zatwierdzić budżet: <strong>{week.weekly_budget_pln} PLN</strong>.</li>}
            {week.promo && week.promo.type && week.promo.type !== 'none' && <li>Zatwierdzić promo: {week.promo.type} {week.promo.value || ''}.</li>}
            {week.launch_context && <li>Synchronizacja z premierą: {week.launch_context.slice(0, 80)}…</li>}
            <li>Daily check sprzedaż vs target tygodnia.</li>
          </ul>
        </div>
        <div className="col">
          <b>Copywriter</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {Array.isArray(week.channels) && week.channels.map((ch: any, i: number) => (
              <li key={i}>{ch.platform || ch.channel}: hook + body (gotowy: {ch.creative_hook ? '✓' : '✗'})</li>
            ))}
            {(!week.channels || week.channels.length === 0) && <li>Hooki + captions per kanał (TT/IG/Email).</li>}
            <li>Email subject lines (3-5 wariantów).</li>
            {Array.isArray(week.hero_products) && week.hero_products.length > 0 && <li>Punktory dla hero produktów: {week.hero_products.map((p: any) => p.name || p).join(', ')}.</li>}
          </ul>
        </div>
        <div className="col">
          <b>Designer</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {Array.isArray(week.channels) && week.channels.map((ch: any, i: number) => (
              <li key={i}>{ch.platform || ch.channel}: kreatywka {ch.format ? `(${ch.format})` : ''}</li>
            ))}
            {week.designer_summary && <li><em>Brief: {week.designer_summary.slice(0, 100)}…</em></li>}
            {(!week.designer_summary && (!week.channels || week.channels.length === 0)) && <li>Hero foto, carousel, statyki ad — formats per kanał.</li>}
            <li>Email header / hero image.</li>
          </ul>
        </div>
        <div className="col">
          <b>Operacje (WC sklep)</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {week.promo && week.promo.type && week.promo.type !== 'none' && (
              <>
                <li>Skonfigurować mechanikę promo: <strong>{week.promo.type}</strong> {week.promo.code ? `(kod ${week.promo.code})` : ''}.</li>
                {week.promo.duration && <li>Aktywacja na czas: {week.promo.duration}.</li>}
              </>
            )}
            {Array.isArray(week.hero_products) && week.hero_products.length > 0 && <li>Sprawdzić stock hero produktów: {week.hero_products.map((p: any) => p.name || p).join(', ')}.</li>}
            <li>Preview banner sklepu / strona główna.</li>
            <li>Test koszyk + checkout (jeśli promo aktywne).</li>
          </ul>
        </div>
        <div className="col">
          <b>Ads / Meta</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {Array.isArray(week.channels) && week.channels
              .filter((ch: any) => /meta|fb|ig|instagram|facebook|tiktok|google|ads/i.test(ch.platform || ''))
              .map((ch: any, i: number) => (
                <li key={i}>{ch.platform}: budżet {ch.budget_pln || '?'} zł, audience {ch.audience || 'broad'}, cel {ch.objective || '?'}.</li>
              ))}
            {(!week.channels || !week.channels.some((c: any) => /meta|fb|ig|tiktok|ads/i.test(c.platform || ''))) && (
              <li>Setup kampanii Meta (jeśli zaplanowane). Sprawdzić plan miesiąca.</li>
            )}
            <li>Daily monitoring CTR + CPC + ROAS.</li>
            <li>Przelicz budżet jeśli ROAS odbiega od targetu &gt; 30%.</li>
          </ul>
        </div>
        <div className="col">
          <b>Content / Mia / Mama</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {Array.isArray(week.mia_tiktok_variants) && week.mia_tiktok_variants.length > 0 ? (
              week.mia_tiktok_variants.map((v: any, i: number) => (
                <li key={i}>Wariant: {v.title || `TT/Reel ${i+1}`}</li>
              ))
            ) : (
              <li>1-2 TikTok/Reels w tygodniu (face-to-cam, BTS, stitch).</li>
            )}
            <li>IG Stories codziennie (3-5 slajdów / dzień).</li>
            <li>Email blast(y) do bazy (subject + body z copywriterem).</li>
          </ul>
        </div>
      </div>

      </>
      )}
      <div className="footer">
        Wydrukowano z BHT Marketing Planner · {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} · plan {draftMeta?.month} · tydzień ISO {week.isoWeek || isoWeek}
      </div>
    </>
  );
}
