// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  idea: "Pomysł",
  in_development: "W rozwoju",
  ready: "Gotowy",
  launched: "Wystartował",
  cancelled: "Anulowany",
};

const CHANNEL_LABEL: Record<string, string> = {
  d2c: "D2C sklep",
  allegro: "Allegro",
  rossmann_full: "Rossmann full",
  rossmann_test: "Rossmann test",
  rossmann_amoya: "Amo'ya",
  b2b_premium: "B2B Premium",
  export: "Eksport DE/EU",
  other_chains: "Inne sieci PL",
};

export default function LaunchPrint() {
  const params = useParams();
  const id = params?.id;
  const [launch, setLaunch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/launches`).then(r => r.json()).then(j => {
      const found = (j.data || []).find((l: any) => String(l.id) === String(id));
      setLaunch(found || null);
      setLoading(false);
      // Auto-update document title for print filename
      if (found?.name) document.title = `Launch — ${found.name}`;
    });
  }, [id]);

  if (loading) return <p>Ładuję dane launcha…</p>;
  if (!launch) return <p>Nie znaleziono launcha id={id}.</p>;

  let suggestion: any = null;
  try { suggestion = JSON.parse(launch.ai_suggestion_json || '{}'); } catch {}

  let channels: string[] = [];
  try { channels = JSON.parse(launch.target_channels || '[]'); } catch {}

  return (
    <>
      <h1>{launch.name}</h1>
      <div className="meta-row">
        {launch.category && <span><b>Kategoria:</b> {launch.category}</span>}
        {launch.price_pln && <span><b>Cena:</b> {launch.price_pln} zł</span>}
        {launch.planned_launch_date && <span><b>Data launchu:</b> {launch.planned_launch_date}</span>}
        {!launch.planned_launch_date && launch.ai_suggested_date && <span><b>AI sugeruje:</b> {launch.ai_suggested_date}</span>}
        <span><b>Status:</b> {STATUS_LABEL[launch.status] || launch.status}</span>
      </div>

      {channels.length > 0 && (
        <div>
          <h3>Kanały dystrybucji</h3>
          <div>
            {channels.map(c => <span key={c} className="pill">{CHANNEL_LABEL[c] || c}</span>)}
          </div>
        </div>
      )}

      {launch.short_pitch && (
        <>
          <h2>Pitch</h2>
          <p>{launch.short_pitch}</p>
        </>
      )}

      {launch.description && (
        <>
          <h2>Opis produktu</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{launch.description}</p>
        </>
      )}

      {launch.target_audience && (
        <>
          <h3>Target</h3>
          <p>{launch.target_audience}</p>
        </>
      )}

      {launch.user_notes && (
        <>
          <h3>Uwagi właściciela</h3>
          <div className="box">{launch.user_notes}</div>
        </>
      )}

      {suggestion?.suggested_date && (
        <>
          <h2>Analiza AI — strategia launchu</h2>
          <div className="box">
            <p><b>Sugerowana data:</b> {suggestion.suggested_date} <span className="pill">{suggestion.confidence}</span></p>
            {suggestion.rationale && <p style={{ marginTop: 8 }}>{suggestion.rationale}</p>}
          </div>
        </>
      )}

      {suggestion?.portfolio_analysis && (
        <>
          <h2>Analiza strategiczna portfolio</h2>
          {Object.entries(suggestion.portfolio_analysis).map(([key, value]: any) => {
            if (!value) return null;
            const label = ({
              calendar_map: "Kalendarz launchów",
              gaps_identified: "Luki w portfolio",
              cannibalization_risk: "Ryzyko kanibalizacji",
              brand_narrative_fit: "Fit z narracją marki",
              strategic_recommendation: "Rekomendacja strategiczna",
            } as any)[key] || key;
            return (
              <div key={key}>
                <h3>{label}</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{value}</p>
              </div>
            );
          })}
        </>
      )}

      {/* Zakres obowiązków zespołu — auto-derived */}
      <h2>📋 Zakres obowiązków zespołu</h2>
      <div className="grid-2">
        <div className="col">
          <b>Marketing / Brand owner</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Zatwierdzić finalną datę launchu i pricing.</li>
            <li>Zatwierdzić tagline / pozycjonowanie strategiczne.</li>
            {suggestion?.portfolio_analysis?.cannibalization_risk && <li>Monitorować ryzyko kanibalizacji w pierwszych 4-6 tyg po launchu.</li>}
            {Array.isArray(channels) && channels.length > 1 && <li>Rewizja target_channels — czy lista kanałów jest aktualna.</li>}
            <li>Ustawić KPI sukcesu launchu (sztuki/dzień, target obrotu).</li>
          </ul>
        </div>
        <div className="col">
          <b>Copywriter</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Long-form opis na stronę produktu (na bazie sekcji "Opis produktu").</li>
            <li>5-10 hooków / taglinów do A/B testowania w reklamach.</li>
            <li>FAQ (10 pytań) + meta title / description (SEO).</li>
            <li>Sekwencja 5-8 emaili: pre-launch teaser → launch → post-purchase.</li>
            {launch.user_notes && <li>Uwzględnić uwagi właściciela: "{launch.user_notes.slice(0, 80)}{launch.user_notes.length > 80 ? '…' : ''}"</li>}
          </ul>
        </div>
        <div className="col">
          <b>Designer</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Foto produktu: 4-6 zdjęć (front, scoop, lifestyle, comparison, macro).</li>
            <li>Hero video 30-60s (proces produkcji + use case).</li>
            <li>Comparison infographic (vs sąsiadująca kategoria).</li>
            <li>Brewing / how-to-use infografika (5-step square 1080×1080).</li>
            <li>Mockupy paczki + opakowanie GWP.</li>
          </ul>
        </div>
        <div className="col">
          <b>Operacje (WC sklep)</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Utworzyć produkt w WooCommerce (SKU, kategoria, tagi, schema.org).</li>
            <li>Skonfigurować pre-sale (jeśli zaplanowany) z osobnym pricing.</li>
            <li>Sprawdzić stock + ustawić in-stock alert &amp; refill flow.</li>
            <li>Ustawić cross-sell / up-sell links na stronie produktu.</li>
            <li>Test order flow (pre-sale + regular checkout) PRZED launchem.</li>
          </ul>
        </div>
        <div className="col">
          <b>Ads / Meta</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Kampanie: pre-launch (warm), launch day (broad), post-launch (retarget).</li>
            <li>Audience: LAL z buyers podobnego SKU + interest tea/wellness PL.</li>
            <li>Kreatywy: hero video + 3-5 carousel + 2-3 statyki.</li>
            <li>Budżet zaplanować pod ROAS target — sprawdzić w strategii miesiąca.</li>
            <li>Custom audience: email list (3k+), retarget /shop visitors 30d.</li>
          </ul>
        </div>
        <div className="col">
          <b>Content / Mia / Mama</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>TikTok/Reels: face-to-cam storytime "POV: pierwsza w Polsce".</li>
            <li>BTS unboxing pierwszej paczki + use case.</li>
            <li>Stitch z viralami matcha / wellness PL z odpowiedzią.</li>
            <li>IG Live podczas tygodnia launchu (Q&A + parzenie).</li>
            <li>Email do mailing list: subject lines (5 wariantów).</li>
          </ul>
        </div>
        <div className="col">
          <b>Influencer / PR</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Lista 15-25 micro influencerek (3-50k followers, matcha/wellness PL).</li>
            <li>Wysyłka discovery set 7-10 dni przed launchem.</li>
            <li>Brief + unikatowe kody rabatowe (jeden per influencer).</li>
            <li>Tracking publikacji + UGC content library.</li>
          </ul>
        </div>
        <div className="col">
          <b>Analytics / Reporting</b>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Setup tracking: GA4 events + Meta CAPI + email open rates.</li>
            <li>Dashboard: revenue/dzień, AOV, conversion rate, attribution per kanał.</li>
            <li>Cotygodniowe raportowanie postępu vs KPI.</li>
            <li>Po 30 dniach: post-mortem launch (co zadziałało / co nie).</li>
          </ul>
        </div>
      </div>

      {launch.ai_suggestion_notes && (
        <div className="footer">{launch.ai_suggestion_notes}</div>
      )}
      <div className="footer">
        Wydrukowano z BHT Marketing Planner · {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} · launch ID {launch.id}
      </div>
    </>
  );
}
