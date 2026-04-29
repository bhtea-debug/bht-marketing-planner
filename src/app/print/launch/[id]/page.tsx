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

      {launch.ai_suggestion_notes && (
        <div className="footer">{launch.ai_suggestion_notes}</div>
      )}
      <div className="footer">
        Wydrukowano z BHT Marketing Planner · {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} · launch ID {launch.id}
      </div>
    </>
  );
}
