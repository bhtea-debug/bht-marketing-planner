// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PL_MONTH = ['','styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];

function parseDate(s: any): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function dayInMonth(d: Date | null, monthYear: string): number | null {
  if (!d) return null;
  const [y, m] = monthYear.split('-').map(Number);
  if (d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m) return d.getUTCDate();
  return null;
}

export default function TimelinePrint() {
  const params = useParams();
  const draftId = params?.draftId;
  const [draft, setDraft] = useState<any>(null);
  const [launches, setLaunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/planner/drafts/${draftId}`).then(r => r.json()),
      fetch('/api/launches').then(r => r.json()),
    ]).then(([dj, lj]) => {
      const d = dj.data;
      let p: any = null;
      try { p = typeof d?.payload === 'string' ? JSON.parse(d.payload) : d?.payload; } catch {}
      setDraft({ ...d, payload: p });
      setLaunches(lj.data || []);
      setLoading(false);
      if (d?.month) {
        const [y, m] = d.month.split('-');
        document.title = `Timeline ${PL_MONTH[parseInt(m)]} ${y}`;
      }
    });
  }, [draftId]);

  if (loading) return <p style={{ padding: 24 }}>Ładuję timeline…</p>;
  if (!draft) return <p style={{ padding: 24 }}>Brak draftu {draftId}.</p>;

  const month = draft.month || '2026-05';
  const [yStr, mStr] = month.split('-');
  const y = parseInt(yStr);
  const m = parseInt(mStr);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate(); // 31 dla maja

  const plan = draft.payload?.plan || draft.payload || {};
  const weeks: any[] = plan.weeks || plan.week_plans || [];
  const totalBudget = plan.totalBudget != null ? Number(plan.totalBudget) : weeks.reduce((s, w) => s + (Number(w.weekly_budget_pln) || 0), 0);

  // Ustal pozycje w gridzie dla każdego tygodnia (start/end day)
  const weekBars = weeks.map((w: any, i: number) => {
    const sd = parseDate(w.start_date);
    const ed = parseDate(w.end_date);
    let startDay = dayInMonth(sd, month);
    let endDay = dayInMonth(ed, month);
    // Jeśli tydzień zaczyna się w innym miesiącu, ucina do 1
    if (startDay == null) startDay = sd && sd < new Date(Date.UTC(y, m-1, 1)) ? 1 : null;
    if (endDay == null) endDay = ed && ed > new Date(Date.UTC(y, m, 0)) ? daysInMonth : null;
    return { ...w, _startDay: startDay, _endDay: endDay, _idx: i };
  }).filter((w: any) => w._startDay != null && w._endDay != null);

  // Kolory dla 5 tygodni
  const weekColors = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185', '#a3e635'];

  // Identyfikacja kluczowych dat
  const keyDates: { day: number; label: string; emoji: string; color: string }[] = [];
  // Święta polskie maja
  if (m === 5) {
    keyDates.push({ day: 1, label: 'Św. Pracy', emoji: '🛠', color: '#94a3b8' });
    keyDates.push({ day: 3, label: 'Konstytucji', emoji: '🇵🇱', color: '#94a3b8' });
    keyDates.push({ day: 12, label: 'Dz. Pielęgniarki', emoji: '👩‍⚕️', color: '#94a3b8' });
    keyDates.push({ day: 21, label: 'World Tea Day', emoji: '🍵', color: '#dc2626' });
    keyDates.push({ day: 26, label: 'Dzień Matki', emoji: '🌸', color: '#ec4899' });
  }

  // Launche w tym miesiącu (D2C only)
  const launchMarkers = launches
    .map((l: any) => {
      const date = parseDate(l.planned_launch_date || l.ai_suggested_date);
      const day = dayInMonth(date, month);
      if (!day) return null;
      let chans: string[] = [];
      try { chans = JSON.parse(l.target_channels || '[]'); } catch {}
      const isD2C = chans.length === 0 || chans.includes('d2c');
      if (!isD2C) return null;
      return { id: l.id, day, name: l.name, status: l.status };
    })
    .filter(Boolean) as any[];

  // Pre-sale Gyokuro 12-18.05 (z planning_knowledge)
  const presaleBars = m === 5 && y === 2026 ? [
    { startDay: 12, endDay: 18, label: '🍵 Pre-sale Gyokuro', color: '#7c3aed' }
  ] : [];

  // Promo bars — szukaj w weeks.promo
  const promoBars = weekBars.flatMap((w: any) => {
    if (!w.promo || w.promo.type === 'none') return [];
    return [{
      startDay: w._startDay,
      endDay: w._endDay,
      label: `${w.promo.type}${w.promo.value ? ` ${w.promo.value}` : ''}`,
      color: '#f59e0b',
    }];
  });

  // Influencer seeding 14-15.05 (z planning_knowledge entry 36)
  const influBar = m === 5 && y === 2026 ? { startDay: 14, endDay: 15, label: '📦 Influencer seeding (20 paczek)', color: '#06b6d4' } : null;

  // Bundle Dzień Matki 24-26.05
  const motherBar = m === 5 && y === 2026 ? { startDay: 24, endDay: 26, label: '🌸 Bundle "Mama która zna matchę"', color: '#ec4899' } : null;

  // Email blasts — z planning_knowledge content calendar 8 emaili
  // Czas wysyłki dobrany pod e-commerce wellness PL (sweet spot 18:00-20:00 weekdays, 10:00-11:00 weekend)
  const emailDays = m === 5 && y === 2026 ? [
    { day: 8, time: '18:00', label: 'E1: Teaser', subject: 'Coś nowego nadchodzi 12 maja…' },
    { day: 12, time: '18:00', label: 'E2: Pre-sale start', subject: '🍵 Pre-sale Gyokuro Powder otwarty (-13% first 100 puszek)' },
    { day: 16, time: '11:00', label: 'E3: Reminder', subject: 'Ostatni weekend pre-sale — 100 puszek po 69 zł' },
    { day: 19, time: '10:00', label: 'E4: Launch day', subject: '🍵 Japan Gyokuro Powder oficjalnie w sklepie' },
    { day: 21, time: '09:00', label: 'E5: WTD', subject: 'Dzień Herbaty: 3 paczki, najtańsza GRATIS' },
    { day: 24, time: '11:00', label: 'E7: Mother Gift', subject: 'Premium Gift dla Mamy — Gyokuro + Lattea + chasen' },
    { day: 24, time: '18:00', label: 'E6: Last 2+1', subject: 'Ostatnie godziny 2+1 — kończymy o północy' },
    { day: 28, time: '11:00', label: 'E8: Last chance', subject: 'Gyokuro w maju — jeszcze 3 dni' },
  ] : [];

  // ============== DEADLINY PRZYGOTOWANIA (lead-time przed publikacją) ==============
  // Reguły lead-time:
  //  Email newsletter: -1 dzień (zatwierdzenie + wysyłka)
  //  Kreatywki Meta/IG (Reels, carousel, statyk): -2 dni
  //  Landing page / banner sklepu (storeTask): -3 dni
  //  Ad campaign setup (Meta) start: -2 dni
  //  Promo mechanism (kupon WC / 2+1): -2 dni
  //  Bundle product (Mother's Day): -5 dni
  //  Influencer seeding (wysyłka paczek): -7 dni przed publikacjami
  type Dl = { day: number; role: string; what: string; emoji: string; color: string };
  const deadlines: Dl[] = [];

  // Z emailDays — newsletter -1 dzień (zatwierdzenie + harmonogram wysyłki)
  for (const e of emailDays) {
    if (e.day - 1 >= 1) deadlines.push({
      day: e.day - 1,
      role: 'Copy',
      what: `${e.label} (${String(e.day).padStart(2,'0')}.${String(m).padStart(2,'0')} ${e.time}) — newsletter w mailing-tool: subject "${e.subject?.slice(0, 60)}", body, segment, harmonogram wysyłki`,
      emoji: '✉️',
      color: '#0891b2',
    });
  }

  // Pre-sale Gyokuro 12.05 — landing/produkt + email + carousel gotowe -2
  if (m === 5 && y === 2026) {
    deadlines.push({ day: 10, role: 'Sklep', what: 'Pre-sale Gyokuro: produkt w WC + cena 69 zł first 100 + landing gotowe', emoji: '🛒', color: '#7c3aed' });
    deadlines.push({ day: 10, role: 'Grafika', what: 'Carousel "Gyokuro vs Matcha 5 różnic" gotowy do publikacji 11.05', emoji: '🎨', color: '#ec4899' });
    deadlines.push({ day: 11, role: 'Tekst', what: 'Email #2 "Pre-sale 12.05 + 69 zł first 100" gotowy', emoji: '✉️', color: '#0891b2' });

    // Influencer seeding 14-15.05 — brief + paczki gotowe -7 = 7-8.05
    deadlines.push({ day: 8, role: 'Decyzje', what: 'Lista 20 influencerek + briefy + 20 unikalnych kodów rabatowych w WC', emoji: '📋', color: '#f59e0b' });
    deadlines.push({ day: 13, role: 'Sklep', what: 'Spakowanie 20 paczek "Gyokuro Discovery Set" (Gyokuro + chasen) + InPost paczkomaty', emoji: '📦', color: '#06b6d4' });

    // Launch Gyokuro 19.05 — kreatywki -2 (do 17.05) + LP -3 (do 16.05) + ads -2
    deadlines.push({ day: 16, role: 'Grafika', what: 'Hero video Mama unboxing Gyokuro (60s vertical) + 3 statyki ad gotowe', emoji: '🎬', color: '#ec4899' });
    deadlines.push({ day: 17, role: 'Sklep', what: 'Strona produktu Gyokuro Powder w WC: status pre-sale → in-stock 19.05', emoji: '🛒', color: '#7c3aed' });
    deadlines.push({ day: 17, role: 'Reklamy', what: 'Kampania Meta WTD week setup (LAL + retarget): kreatywki + audiences + budżet 1500/dzień', emoji: '📱', color: '#3b82f6' });
    deadlines.push({ day: 18, role: 'Tekst', what: 'Email #4 "Launch Gyokuro" gotowy + email #5 "WTD 21.05 + 2+1" zaplanowane', emoji: '✉️', color: '#0891b2' });

    // 2+1 mechanic active 19-25.05 — kupon WTD3 lub plugin gotowy -2 = 17.05
    deadlines.push({ day: 17, role: 'Sklep', what: 'Mechanizm 2+1 w WC: kupon WTD3 (cheapest free, exclude Gyokuro/akcesoria/zestawy) + test koszyka', emoji: '🛒', color: '#f59e0b' });

    // WTD 21.05 IG Live — przygotowanie scenariusza -2 = 19.05
    deadlines.push({ day: 19, role: 'Mama+Mia', what: 'IG Live "Parzymy Gyokuro razem" 21.05 — scenariusz, plansze, link do strony', emoji: '🎙', color: '#ec4899' });

    // Mother's Day bundle 24.05 — bundle gotowy -5 = 19.05
    deadlines.push({ day: 19, role: 'Sklep', what: 'Bundle "Mama która zna matchę" w WC (Gyokuro + Lattea + chasen) za 250 zł + opcja pakowania prezentowego', emoji: '🌸', color: '#ec4899' });
    deadlines.push({ day: 22, role: 'Grafika', what: 'Banner sklepu Mother\'s Day + foto bundle premium gift', emoji: '🎨', color: '#ec4899' });
    deadlines.push({ day: 23, role: 'Tekst', what: 'Email #7 "Premium Gift dla Mamy" gotowy', emoji: '✉️', color: '#0891b2' });

    // Daily content briefs (designer summary) — co tydzień przed startem
    for (const w of weekBars) {
      if (w._startDay > 1) {
        deadlines.push({ day: w._startDay - 2, role: 'Grafika', what: `Brief tygodnia W${w.isoWeek}: "${(w.theme || '').slice(0, 40)}" — kreatywki + visual moodboard`, emoji: '🎨', color: '#ec4899' });
      }
    }

    // Promo wszelkie z weeks.promo — setup -2
    for (const w of weekBars) {
      if (w.promo && w.promo.type && w.promo.type !== 'none' && w._startDay > 2) {
        deadlines.push({ day: w._startDay - 2, role: 'Sklep', what: `Setup promo W${w.isoWeek}: ${w.promo.type} ${w.promo.value || ''} ${w.promo.code ? `(kod ${w.promo.code})` : ''}`, emoji: '🛒', color: '#f59e0b' });
      }
    }
  }

  // Sortuj deadliny po dniu
  deadlines.sort((a, b) => a.day - b.day);

  return (
    <div style={{
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '12px',
      fontFamily: '-apple-system, "Segoe UI", system-ui, sans-serif',
      color: '#1e293b',
      fontSize: '10px',
    }}>
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        .tl-row { display: grid; grid-template-columns: 130px repeat(${daysInMonth}, 1fr); align-items: stretch; min-height: 24px; border-bottom: 1px solid #e2e8f0; position: relative; overflow: hidden; }
        .tl-row .label { padding: 4px 8px; font-weight: 600; font-size: 10px; color: #475569; background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; align-items: center; }
        .tl-cell { border-right: 1px dotted #f1f5f9; position: relative; }
        .tl-bar { position: absolute; top: 4px; bottom: 4px; left: 1px; right: 1px; border-radius: 4px; padding: 2px 5px; color: #fff; font-size: 9px; font-weight: 600; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; }
        .tl-marker { position: absolute; top: 50%; transform: translateY(-50%); left: 0; right: 0; text-align: center; font-size: 9px; font-weight: 600; }
        .tl-marker .pip { display: inline-block; padding: 1px 4px; border-radius: 3px; }
      `}</style>
      <div className="no-print" style={{ marginBottom: 12, display: 'flex', gap: 8, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => window.print()} style={{ background: '#6366f1', color: '#fff', padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>🖨 Drukuj A4 landscape</button>
        <button onClick={() => window.close()} style={{ background: '#f1f5f9', color: '#64748b', padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>✕ Zamknij</button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', alignSelf: 'center' }}>Best: print A4 landscape, marginesy 8mm</span>
      </div>
      <h1 style={{ fontSize: 18, margin: '0 0 4px', color: '#1e293b' }}>Harmonogram marketing — {PL_MONTH[m]} {y}</h1>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
        Draft #{draft.id} · {weeks.length} tygodni · łączny budżet <b>{totalBudget.toLocaleString('pl-PL')} zł</b> · cel <b>70 000 zł netto</b>
      </div>

      {/* Day numbers row */}
      <div className="tl-row" style={{ background: '#f1f5f9', minHeight: 18, borderBottom: '2px solid #cbd5e1' }}>
        <div className="label">Dzień</div>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const date = new Date(Date.UTC(y, m - 1, d));
          const dow = date.getUTCDay();
          const isWknd = dow === 0 || dow === 6;
          return (
            <div key={d} className="tl-cell" style={{ background: isWknd ? '#fef3c7' : 'transparent', textAlign: 'center', fontSize: 9, fontWeight: 600, color: isWknd ? '#92400e' : '#64748b' }}>{d}</div>
          );
        })}
      </div>

      {/* Tygodnie */}
      <div className="tl-row" style={{ minHeight: 36 }}>
        <div className="label">Tygodnie</div>
        {Array.from({ length: daysInMonth }, (_, i) => <div key={i} className="tl-cell"></div>)}
        {weekBars.map((w: any, i: number) => (
          <div key={i} className="tl-bar" style={{
            backgroundColor: weekColors[i % weekColors.length],
            gridColumn: `${w._startDay + 1} / ${w._endDay + 2}`,
            gridRow: 1,
            position: 'relative',
            top: 'auto', bottom: 'auto', left: 'auto', right: 'auto',
            margin: '4px 1px',
          }}>
            <span style={{ fontWeight: 700, marginRight: 6 }}>W{w.isoWeek || w._idx + 18}</span>
            <span style={{ opacity: 0.95 }}>{(w.theme || '').slice(0, 50)}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.85 }}>{w.weekly_budget_pln ? `${w.weekly_budget_pln} zł` : ''}</span>
          </div>
        ))}
      </div>

      {/* Pre-sale + Launch row */}
      <div className="tl-row" style={{ minHeight: 28 }}>
        <div className="label">Premiery</div>
        {Array.from({ length: daysInMonth }, (_, i) => <div key={i} className="tl-cell"></div>)}
        {presaleBars.map((b: any, i: number) => (
          <div key={i} className="tl-bar" style={{
            backgroundColor: b.color,
            gridColumn: `${b.startDay + 1} / ${b.endDay + 2}`,
            gridRow: 1,
            position: 'relative', top: 'auto', bottom: 'auto', left: 'auto', right: 'auto', margin: '4px 1px',
          }}>{b.label}</div>
        ))}
        {launchMarkers.map((lm: any, i: number) => (
          <div key={`lm-${i}`} className="tl-marker" style={{ gridColumn: `${lm.day + 1} / ${lm.day + 2}`, gridRow: 1 }}>
            <span className="pip" style={{ background: '#1e40af', color: '#fff' }}>★ {lm.name?.slice(0, 18)}</span>
          </div>
        ))}
      </div>

      {/* Promo */}
      <div className="tl-row" style={{ minHeight: 24 }}>
        <div className="label">Promocje</div>
        {Array.from({ length: daysInMonth }, (_, i) => <div key={i} className="tl-cell"></div>)}
        {promoBars.map((b: any, i: number) => (
          <div key={i} className="tl-bar" style={{
            backgroundColor: b.color,
            gridColumn: `${b.startDay + 1} / ${b.endDay + 2}`,
            gridRow: 1,
            position: 'relative', top: 'auto', bottom: 'auto', left: 'auto', right: 'auto', margin: '3px 1px',
          }}>{b.label}</div>
        ))}
      </div>

      {/* Deadliny przygotowania */}
      <div className="tl-row" style={{ minHeight: 26 }}>
        <div className="label">📋 Deadliny</div>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const todays = deadlines.filter(d => d.day === dayNum);
          return (
            <div key={i} className="tl-cell" style={{ position: 'relative' }}>
              {todays.length > 0 && (
                <div style={{ position: 'absolute', top: 2, left: 1, right: 1, fontSize: 8, fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>
                  {todays.slice(0, 3).map((d, idx) => (
                    <span key={idx} title={`${d.role}: ${d.what}`} style={{ display: 'inline-block', padding: '0px 2px', margin: '0 1px 1px 0', borderRadius: 2, background: d.color, color: '#fff' }}>{d.emoji}</span>
                  ))}
                  {todays.length > 3 && <span style={{ color: '#64748b' }}>+{todays.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bundle Mother's Day */}
      {motherBar && (
        <div className="tl-row" style={{ minHeight: 24 }}>
          <div className="label">Zestaw prez.</div>
          {Array.from({ length: daysInMonth }, (_, i) => <div key={i} className="tl-cell"></div>)}
          <div className="tl-bar" style={{
            backgroundColor: motherBar.color,
            gridColumn: `${motherBar.startDay + 1} / ${motherBar.endDay + 2}`,
            gridRow: 1,
            position: 'relative', top: 'auto', bottom: 'auto', left: 'auto', right: 'auto', margin: '3px 1px',
          }}>{motherBar.label}</div>
        </div>
      )}

      {/* Influencer */}
      {influBar && (
        <div className="tl-row" style={{ minHeight: 22 }}>
          <div className="label">Influencerzy</div>
          {Array.from({ length: daysInMonth }, (_, i) => <div key={i} className="tl-cell"></div>)}
          <div className="tl-bar" style={{
            backgroundColor: influBar.color,
            gridColumn: `${influBar.startDay + 1} / ${influBar.endDay + 2}`,
            gridRow: 1,
            position: 'relative', top: 'auto', bottom: 'auto', left: 'auto', right: 'auto', margin: '3px 1px',
          }}>{influBar.label}</div>
        </div>
      )}

      {/* Kluczowe dni */}
      <div className="tl-row" style={{ minHeight: 26 }}>
        <div className="label">Kluczowe dni</div>
        {Array.from({ length: daysInMonth }, (_, i) => <div key={i} className="tl-cell"></div>)}
        {keyDates.map((kd: any, i: number) => (
          <div key={i} className="tl-marker" style={{ gridColumn: `${kd.day + 1} / ${kd.day + 2}`, gridRow: 1 }}>
            <span className="pip" style={{ background: kd.color, color: '#fff' }}>{kd.emoji} {kd.label}</span>
          </div>
        ))}
      </div>

      {/* Email blasts — compact: 1 marker/dzień; pełna lista poniżej */}
      <div className="tl-row" style={{ minHeight: 24 }}>
        <div className="label">✉️ Email</div>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const todayEmails = emailDays.filter((e: any) => e.day === dayNum);
          return (
            <div key={i} className="tl-cell" style={{ position: 'relative' }}>
              {todayEmails.length > 0 && (
                <div style={{ position: 'absolute', top: 2, left: 1, right: 1, fontSize: 7.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }} title={todayEmails.map((e: any) => `${e.time} ${e.label}`).join(', ')}>
                  <span style={{ display: 'inline-block', padding: '1px 3px', borderRadius: 2, background: '#0891b2', color: '#fff' }}>
                    {todayEmails.length === 1 ? `✉️ ${todayEmails[0].time}` : `✉️ ×${todayEmails.length}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tygodniowe motywy details (compressed under timeline) */}
      <h2 style={{ fontSize: 13, marginTop: 16, marginBottom: 6, color: '#4338ca', borderBottom: '1px solid #c7d2fe', paddingBottom: 3 }}>Motywy tygodni — w skrócie</h2>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekBars.length}, 1fr)`, gap: 6, fontSize: 9 }}>
        {weekBars.map((w: any, i: number) => (
          <div key={i} style={{ padding: 6, background: '#f8fafc', borderLeft: `3px solid ${weekColors[i % weekColors.length]}`, borderRadius: 3 }}>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>W{w.isoWeek || w._idx + 18} · {w.start_date?.slice(5) || ''}–{w.end_date?.slice(5) || ''}</div>
            <div style={{ fontWeight: 600, marginTop: 2, color: '#4338ca', fontSize: 10 }}>{w.theme}</div>
            {Array.isArray(w.hero_products) && w.hero_products.length > 0 && (
              <div style={{ marginTop: 2, color: '#475569' }}><b>Hero:</b> {w.hero_products.slice(0, 2).map((p: any) => p.name || p).join(', ')}</div>
            )}
            <div style={{ marginTop: 2, color: '#64748b' }}><b>Budżet:</b> {w.weekly_budget_pln || 0} zł</div>
          </div>
        ))}
      </div>

      {/* Lista deadlinów posortowana po dniu */}
      {deadlines.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, marginTop: 14, marginBottom: 4, color: '#4338ca', borderBottom: '1px solid #c7d2fe', paddingBottom: 3 }}>📋 Deadliny przygotowania — co do kiedy musi być gotowe</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 1fr', gap: '2px 8px', fontSize: 9, alignItems: 'baseline' }}>
            <div style={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #cbd5e1', paddingBottom: 2 }}>Data</div>
            <div style={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #cbd5e1', paddingBottom: 2 }}>Rola</div>
            <div style={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #cbd5e1', paddingBottom: 2 }}>Co musi być gotowe</div>
            {deadlines.map((d: Dl, i: number) => {
              const date = new Date(Date.UTC(y, m - 1, d.day));
              const dow = ['nd','pn','wt','śr','cz','pt','sb'][date.getUTCDay()];
              return (
                <>
                  <div key={`d-${i}-date`} style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{String(d.day).padStart(2, '0')}.{String(m).padStart(2, '0')} <span style={{ color: '#94a3b8', fontSize: 8 }}>{dow}</span></div>
                  <div key={`d-${i}-role`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span>{d.emoji}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 2, background: d.color, color: '#fff' }}>{d.role}</span>
                  </div>
                  <div key={`d-${i}-what`} style={{ color: '#334155' }}>{d.what}</div>
                </>
              );
            })}
          </div>
        </>
      )}

      {/* Mailing — szczegóły z subject + datą + godziną */}
      {emailDays.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, marginTop: 14, marginBottom: 4, color: '#0891b2', borderBottom: '1px solid #67e8f9', paddingBottom: 3 }}>✉️ Harmonogram mailingu — {emailDays.length} blastów</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 60px 1fr', gap: '2px 8px', fontSize: 9, alignItems: 'baseline' }}>
            <div style={{ fontWeight: 700, color: '#0e7490', borderBottom: '1px solid #cbd5e1', paddingBottom: 2 }}>Data + godz.</div>
            <div style={{ fontWeight: 700, color: '#0e7490', borderBottom: '1px solid #cbd5e1', paddingBottom: 2 }}>ID</div>
            <div style={{ fontWeight: 700, color: '#0e7490', borderBottom: '1px solid #cbd5e1', paddingBottom: 2 }}>Subject + segment</div>
            {emailDays.map((e: any, i: number) => {
              const date = new Date(Date.UTC(y, m - 1, e.day));
              const dow = ['nd','pn','wt','śr','cz','pt','sb'][date.getUTCDay()];
              return (
                <>
                  <div key={`em-${i}-d`} style={{ fontWeight: 600, color: '#0e7490', whiteSpace: 'nowrap' }}>{String(e.day).padStart(2, '0')}.{String(m).padStart(2, '0')} {e.time} <span style={{ color: '#94a3b8', fontSize: 8 }}>{dow}</span></div>
                  <div key={`em-${i}-id`} style={{ fontWeight: 700, color: '#0891b2' }}>{e.label.split(':')[0]}</div>
                  <div key={`em-${i}-s`} style={{ color: '#334155' }}><b>{e.label.replace(/^E\d:\s*/, '')}</b> — &ldquo;{e.subject}&rdquo;</div>
                </>
              );
            })}
          </div>
        </>
      )}

      <div style={{ marginTop: 12, fontSize: 9, color: '#94a3b8' }}>
        Wydrukowano z BHT Marketing Planner · {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} · cel maja {totalBudget.toLocaleString('pl-PL')} zł budżet / 70 000 zł netto target
      </div>
    </div>
  );
}
