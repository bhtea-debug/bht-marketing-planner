// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PL_MONTH = ['','styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];

export default function MonthPrint() {
  const params = useParams();
  const draftId = params?.draftId;
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/planner/drafts/${draftId}`).then(r => r.json()).then(j => {
      const d = j.data;
      if (!d) { setLoading(false); return; }
      let payload: any = null;
      try { payload = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload; } catch {}
      setDraft({ ...d, payload });
      setLoading(false);
      if (d.month) {
        const [y, m] = d.month.split('-');
        document.title = `Plan miesięczny ${PL_MONTH[parseInt(m)]} ${y}`;
      }
    });
  }, [draftId]);

  if (loading) return <p>Ładuję plan miesięczny…</p>;
  if (!draft) return <p>Nie znaleziono planu draft={draftId}.</p>;

  const payload = draft.payload || {};
  const weeks: any[] = payload.weeks || payload.week_plans || [];
  const [yStr, mStr] = (draft.month || '').split('-');
  const monthLabel = mStr ? `${PL_MONTH[parseInt(mStr)]} ${yStr}` : draft.month;

  // Sumy
  const totalBudget = weeks.reduce((sum, w) => sum + (Number(w.weekly_budget_pln) || 0), 0);
  const totalAds = weeks.flatMap((w: any) => Array.isArray(w.channels) ? w.channels : [])
    .reduce((sum, ch: any) => sum + (Number(ch.budget_pln) || 0), 0);

  return (
    <>
      <h1>Plan marketingowy — {monthLabel}</h1>
      <div className="meta-row">
        <span><b>Draft:</b> #{draft.id} {draft.name ? `· ${draft.name}` : ''}</span>
        <span><b>Tygodnie:</b> {weeks.length}</span>
        <span><b>Status:</b> {draft.status || 'draft'}</span>
        <span><b>Budżet łączny:</b> {totalBudget.toLocaleString('pl-PL')} zł</span>
        {totalAds > 0 && <span><b>w tym ads:</b> {totalAds.toLocaleString('pl-PL')} zł</span>}
        <span><b>Wdrożone:</b> {draft.deployed_count || 0} / {draft.weeks_count || weeks.length}</span>
      </div>

      {payload.month_overview && (
        <>
          <h2>Przegląd miesiąca</h2>
          <div className="box" style={{ whiteSpace: 'pre-wrap' }}>{payload.month_overview}</div>
        </>
      )}

      {payload.month_kpi && (
        <>
          <h2>KPI miesięczne</h2>
          {Array.isArray(payload.month_kpi) ? (
            <ul>{payload.month_kpi.map((k: any, i: number) => <li key={i}>{typeof k === 'string' ? k : `${k.metric}: ${k.target}`}</li>)}</ul>
          ) : (
            <p style={{ whiteSpace: 'pre-wrap' }}>{String(payload.month_kpi)}</p>
          )}
        </>
      )}

      {weeks.map((week: any, wi: number) => {
        const isoWeek = week.isoWeek || week.iso_week || (wi + 1);
        return (
          <section key={isoWeek} style={{ marginTop: 32, paddingTop: 16, borderTop: '2px solid #c7d2fe', pageBreakBefore: wi > 0 ? 'always' : 'auto' }}>
            <div className="meta-row" style={{ marginTop: 0 }}>
              <span><b>Tydzień ISO {isoWeek}</b></span>
              {week.dateRange && <span>{week.dateRange}</span>}
              {!week.dateRange && week.start_date && <span>{week.start_date} – {week.end_date}</span>}
              {week.weekly_budget_pln && <span><b>Budżet:</b> {week.weekly_budget_pln} zł</span>}
            </div>
            <h2 style={{ marginTop: 4, paddingBottom: 4, borderBottom: '2px solid #6366f1' }}>{week.theme || `Tydzień ${isoWeek}`}</h2>
            {week.rationale && <p>{week.rationale}</p>}

            {Array.isArray(week.hero_products) && week.hero_products.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3>Hero produkty</h3>
                <div>
                  {week.hero_products.map((p: any, i: number) => (
                    <div key={i} style={{ padding: 8, marginBottom: 4, background: '#f8fafc', borderRadius: 4, fontSize: 12.5 }}>
                      <strong>{p.name || p}</strong>
                      {p.why && <div style={{ color: '#64748b', marginTop: 2 }}>{p.why}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {week.launch_context && (
              <div className="box" style={{ marginTop: 8 }}><b>Premiery:</b> {week.launch_context}</div>
            )}

            {week.promo && week.promo.type && week.promo.type !== 'none' && (
              <div style={{ marginTop: 8 }}>
                <h3>Promo</h3>
                <div className="box">
                  <b>Typ:</b> {week.promo.type} {week.promo.value || ''}
                  {week.promo.mechanics && <><br /><b>Mechanika:</b> {week.promo.mechanics}</>}
                  {week.promo.code && <><br /><b>Kod:</b> {week.promo.code}</>}
                </div>
              </div>
            )}

            {Array.isArray(week.channels) && week.channels.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3>Plan per kanał</h3>
                <div className="grid-2">
                  {week.channels.map((ch: any, i: number) => (
                    <div key={i} className="col">
                      <b>{ch.platform || ch.channel || 'Kanał'} {ch.budget_pln ? `· ${ch.budget_pln} zł` : ''}</b>
                      {ch.creative_hook && <div><strong>Hook:</strong> {ch.creative_hook}</div>}
                      {ch.body && <div><strong>Body:</strong> {ch.body}</div>}
                      {ch.audience && <div><strong>Audience:</strong> {ch.audience}</div>}
                      {ch.cta && <div><strong>CTA:</strong> {ch.cta}</div>}
                      {ch.format && <div><strong>Format:</strong> {ch.format}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {week.team_tasks && typeof week.team_tasks === 'object' && (
              <div style={{ marginTop: 8 }}>
                <h3>📋 Zakres obowiązków zespołu</h3>
                <div className="grid-2">
                  {week.team_tasks.marketing_owner && <div className="col"><b>Marketing/Brand</b><div>{week.team_tasks.marketing_owner}</div></div>}
                  {week.team_tasks.copywriter && <div className="col"><b>Copywriter</b><div>{week.team_tasks.copywriter}</div></div>}
                  {week.team_tasks.designer && <div className="col"><b>Designer</b><div>{week.team_tasks.designer}</div></div>}
                  {week.team_tasks.ads_meta && <div className="col"><b>Ads/Meta</b><div>{week.team_tasks.ads_meta}</div></div>}
                  {week.team_tasks.content_mia && <div className="col"><b>Content/Mia</b><div>{week.team_tasks.content_mia}</div></div>}
                  {week.team_tasks.operations && <div className="col"><b>Operacje (WC)</b><div>{week.team_tasks.operations}</div></div>}
                  {week.team_tasks.influencer_pr && <div className="col"><b>Influencer/PR</b><div>{week.team_tasks.influencer_pr}</div></div>}
                </div>
              </div>
            )}

            {Array.isArray(week.store_tasks) && week.store_tasks.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3>Zadania sklepu (WooCommerce)</h3>
                <ul>{week.store_tasks.map((t: any, i: number) => (
                  <li key={i}><strong>{t.title}</strong> ({t.placement}) — {t.description} {t.deadline ? `· deadline ${t.deadline}` : ''}</li>
                ))}</ul>
              </div>
            )}

            {Array.isArray(week.mia_tiktok_variants) && week.mia_tiktok_variants.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3>🎬 Warianty TikTok / Reels (Mia)</h3>
                {week.mia_tiktok_variants.map((v: any, i: number) => (
                  <div key={i} style={{ padding: 8, marginBottom: 4, background: '#fef3c7', borderRadius: 4, fontSize: 12.5 }}>
                    {v.title && <strong>{v.title}</strong>}
                    {(v.opening_first_2_seconds || v.hook_seconds_1_3) && <div><b>Pierwsze 2s:</b> {v.opening_first_2_seconds || v.hook_seconds_1_3}</div>}
                    {v.body && <div style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>{v.body}</div>}
                  </div>
                ))}
              </div>
            )}

            {week.designer_summary && (
              <div style={{ marginTop: 8 }}>
                <h3>🎨 Brief designera</h3>
                <div className="box" style={{ whiteSpace: 'pre-wrap' }}>{week.designer_summary}</div>
              </div>
            )}
          </section>
        );
      })}

      <div className="footer">
        Wydrukowano z BHT Marketing Planner · {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} · plan miesiąca {monthLabel} · draft #{draft.id}
      </div>
    </>
  );
}
