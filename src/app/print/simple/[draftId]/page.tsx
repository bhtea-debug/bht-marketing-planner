// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PL_MONTH = ['','styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];

// Mapowanie tygodnia → konkretne reelsy/grafiki/maile/sklep
// Generowane semi-statycznie z istniejących danych draftu + planning_knowledge
function buildWeekConcrete(week: any, weekIdx: number, allEmails: any[]) {
  const heroNames = (week.hero_products || []).map((p: any) => p.name || p);
  const heroFirst = heroNames[0] || '';

  // Mapowanie konkretnych reelsów per typ tygodnia (heuristic)
  // Każdy reel: { tytuł, kto, scena/ujęcie, tekst-do-powiedzenia, tagline-on-screen }
  const w = week.isoWeek || (18 + weekIdx);
  let reels: any[] = [];
  let grafiki: any[] = [];

  // Zwróć z week.mia_tiktok_variants jeśli są, inaczej derive
  if (Array.isArray(week.mia_tiktok_variants) && week.mia_tiktok_variants.length > 0) {
    reels = week.mia_tiktok_variants.slice(0, 3).map((v: any) => ({
      tytul: v.title || 'Reel',
      ujecie: v.opening_first_2_seconds || v.hook_seconds_1_3 || '—',
      tekst: v.body || v.script || '—',
      kto: v.creator || 'Mama / Mia',
    }));
  }

  // Per tydzień (W18-W22) konkretne propozycje
  const concreteByWeek: Record<number, any> = {
    18: {
      reels: [
        {
          tytul: 'Mama parzy spring tea na balkonie',
          kto: 'Mama (face-to-cam)',
          ujecie: 'Balkon, słońce, kwitnące rośliny w tle. Mama w lekkim swetrze, zalewa Spring Tea wrzątkiem.',
          tekst: 'Najlepsza herbata na majówkę? Spring Tea z igłami sosny. Pachnie jak las po deszczu. Zalewam, czekam 4 minuty, wynoszę na balkon — i niech sobie majówka leci.',
          tagline: '🌿 Spring Tea — naturalny aromat sosny',
        },
        {
          tytul: 'BTS pakowania zamówień przed weekendem',
          kto: 'Mia',
          ujecie: 'Stół z paczkami, klasyk InPost, ręka pakuje, naklejki. Speed-up x2.',
          tekst: '(brak voiceover, muzyka spokojna). Tekst on-screen: "Pakuję 47 zamówień przed majówką. Twoja matcha leci do Ciebie 🍵"',
          tagline: '47 paczek przed weekendem',
        },
      ],
      grafiki: [
        {
          format: 'IG carousel 6 slajdów (1080×1080)',
          opis: 'Slajd 1: foto Spring Tea w przezroczystym dzbanku, tło drewno + zielone gałązki, hasło "Herbata na majówkę". Slajd 2-5: 4 propozycje "co dodać do herbaty na balkonie" (cytryna, miód, świeża mięta, lód). Slajd 6: link do sklepu.',
          format2: 'Pastel zielony + cream tło, rustykalny mood, soft natural light',
        },
      ],
    },
    19: {
      reels: [
        {
          tytul: 'Mama: "Co to gyokuro?" — quick edukacja',
          kto: 'Mama (face-to-cam, kuchnia)',
          ujecie: 'Mama trzyma puszkę matchy w jednej ręce, puszkę gyokuro w drugiej. Tło: kuchnia, naturalne światło.',
          tekst: 'Pijesz matchę codziennie? To posłuchaj. Gyokuro to japońska herbata z TYCH SAMYCH zacienianych liści, ale innego kultywaru. Smak głębszy, więcej umami, i — co fajne — łagodniejsza od matchy. Za tydzień otwieramy przedsprzedaż naszej własnej. Pierwsza taka w Polsce.',
          tagline: '🍵 Gyokuro Powder — 19.05 premiera',
        },
        {
          tytul: 'Mia: "POV — czytam na Substacku że gyokuro jest hit"',
          kto: 'Mia (face-to-cam, pokój)',
          ujecie: 'Mia leży na łóżku z laptopem, screenshot artykułu o gyokuro w tle.',
          tekst: 'POV: czytasz Substack o herbacie i widzisz że gyokuro to nowe matcha. A potem zaglądasz do sklepu mamy i okazuje się że za tydzień otwieracie przedsprzedaż TEJ herbaty w Polsce. Jako pierwsi. Halo, mama, dlaczego mi nie powiedziałaś?',
          tagline: 'Pre-sale 12.05 → notify',
        },
        {
          tytul: 'Carousel "Gyokuro vs Matcha — 5 różnic"',
          kto: 'Static (designer)',
          ujecie: 'Patrz Grafika nr 1.',
          tekst: '(brak)',
          tagline: 'Carousel edukacyjny',
        },
      ],
      grafiki: [
        {
          format: 'IG/TikTok carousel 6 slajdów (1080×1080)',
          opis: 'Slajd 1: tytuł "Gyokuro vs Matcha — 5 różnic". Slajd 2: produkcja (oba mielone w kamiennych młynach). Slajd 3: liście (matcha = tencha, gyokuro = liść Gyokuro z łodyżką → mocniejszy umami). Slajd 4: porcja (matcha 2-3g vs gyokuro 1.5g). Slajd 5: temperatura (70-80°C vs 50-70°C). Slajd 6: CTA "Pre-sale 12.05" + link.',
          format2: 'Cream tło, deep matcha green akcenty, japońska estetyka, minimalistyczne ikony',
        },
        {
          format: 'IG Story 5-slajd serial (1080×1920)',
          opis: 'Story 1: zbliżenie liścia gyokuro. Story 2: zacieniana plantacja Hattori (stock JP). Story 3: kamienne młyny. Story 4: gotowy proszek w chawanie. Story 5: "Pre-sale 12.05 — zapisz się na maila".',
          format2: 'Vertical, soft light, japoński mood',
        },
      ],
    },
    20: {
      reels: [
        {
          tytul: 'Mama unboxing pierwszej puszki Gyokuro',
          kto: 'Mama (face-to-cam, kuchnia)',
          ujecie: 'Mama otwiera puszkę BHT 30g Gyokuro Powder, sypie 1.5g do chawanu, ubija chasenem.',
          tekst: '12 maja otwieramy pre-sale. Pierwsze 100 puszek po 69 zł zamiast 79. To nasz pierwszy sproszkowany gyokuro — zamawialiśmy 100 kg z farmy Hattori w Shizuoce. Patrzcie, jakie to ma zielone — to przez te 21 dni zacieniania. Ubijam chasenem jak matchę, ale używam tylko 1.5 gramów. Smakuje... rosół z kwiatami. Serio. Spróbujcie sami.',
          tagline: '🍵 Pre-sale 12.05 — 69 zł first 100',
        },
        {
          tytul: 'Mia: "POV early access do Gyokuro"',
          kto: 'Mia (face-to-cam, pokój)',
          ujecie: 'Mia z paczką (mock-up), pokazuje opakowanie, otwiera, pokazuje zawartość.',
          tekst: 'POV: dostałaś maila o 18:00 że pre-sale otwarty 24h tylko dla bazy. Klikasz "kup", wybierasz puszkę 30g, płacisz 69 zł zamiast 79. Czujesz że zrobiłaś coś dobrego. Bo zrobiłaś. Cena wraca do normalnej za 24h.',
          tagline: 'Early access mailing list 12.05 18:00',
        },
        {
          tytul: 'BTS — pakowanie 20 paczek influencer',
          kto: 'Mia / Mama',
          ujecie: 'Stół, 20 paczek BHT, chasen w każdej, kartka z imieniem.',
          tekst: '(speed-up + tekst on-screen) "20 wybranych herbaciarek dostaje pierwszą Gyokuro Powder w Polsce — 7 dni przed premierą. Ich kody zniżkowe wkrótce."',
          tagline: 'Influencer seeding 14-15.05',
        },
      ],
      grafiki: [
        {
          format: 'Email hero (600×300)',
          opis: 'Foto puszki BHT Gyokuro Powder 30g, na cream tle, obok zielona piana w chawanie po ubiciu. Subject: "🍵 Pre-sale Gyokuro Powder otwarty (-13% first 100 puszek)". CTA "Zamów teraz".',
          format2: 'Email-friendly, minimal text, focus na produkt',
        },
        {
          format: 'IG Story countdown 7-dni (1080×1920)',
          opis: '7 storiek codziennie 12-18.05: każda z licznikiem "Pre-sale -7d", "-6d"... + cytat z Mamy/influencerek. Cream tło, zielony akcent.',
          format2: 'Vertical, urgency mood',
        },
      ],
    },
    21: {
      reels: [
        {
          tytul: 'Launch ceremony — Mama parzy pierwsze',
          kto: 'Mama (face-to-cam, kuchnia)',
          ujecie: 'Mama formalnie sypia 1.5g, ubija, pije, milknie. Cisza 3s, potem mówi.',
          tekst: 'Drugi raz w życiu piłam coś takiego. Pierwsze było matcha 18 lat temu. Gyokuro — to inny smak ale dokładnie taki sam moment "WOW". Otwieramy oficjalnie, maj 19. Już dostępne w sklepie. Jeśli kupiliście pre-sale — wysyłka leci dzisiaj.',
          tagline: '19.05 OFICJALNA PREMIERA — w sklepie',
        },
        {
          tytul: 'Mia: "Mój 3-pak na World Tea Day"',
          kto: 'Mia (face-to-cam)',
          ujecie: 'Mia ma 3 puszki na stole: Matcha Lattea, Crazy Good, Strawberry Lemonade. Bierze, wkłada do koszyka online (kamera follow phone screen).',
          tekst: 'Dzień Herbaty 21 maja — bierzesz 3 paczki dowolne, najtańsza GRATIS. Robię tak: Matcha Lattea, Crazy Good i Strawberry Lemonade. Strawberry najtańsza = darmowa. Wartość koszyka 180 zł, płacę 130. Halo? Idę po klikać.',
          tagline: '21.05 WTD — 2+1 najtańsza GRATIS',
        },
        {
          tytul: 'IG Live "Parzymy Gyokuro razem"',
          kto: 'Mama + Mia (live, 30 min)',
          ujecie: 'Kuchnia, dwa chawan, dwa zestawy. Mama parzy, Mia komentuje.',
          tekst: 'Scenariusz Q&A: jak parzyć / jaka temperatura / vs matcha / czy mogę pić wieczorem / dla kogo. Plus link do sklepu w opisie.',
          tagline: '21.05 11:00 IG Live',
        },
      ],
      grafiki: [
        {
          format: 'Banner sklepu hero (1920×640)',
          opis: 'Foto Gyokuro w chawanie + hasło "Pierwsza Gyokuro Powder w Polsce — premiera 19.05". CTA "Zamów". Cream tło, deep green akcent.',
        },
        {
          format: '3 statyki ad Meta (1080×1080 + 1080×1350)',
          opis: '(1) Foto produktu z 5 argumentami "Następny krok po matchy". (2) Carousel-style "Twoje 3-paki na WTD" — przykładowe koszyki z ceną. (3) UGC-style: zrzut DM od influencerki "Pierwsza taka w Polsce".',
        },
        {
          format: 'IG Reel cover (1080×1920)',
          opis: 'Mama trzyma puszkę gyokuro w jednej ręce, chawan w drugiej, hasło "19.05 — w sklepie".',
        },
      ],
    },
    22: {
      reels: [
        {
          tytul: 'Mia: "Co podarować mamie która już ma wszystko"',
          kto: 'Mia (face-to-cam)',
          ujecie: 'Mia na łóżku, scrolluje IG, znajduje bundle na stronie BHT.',
          tekst: 'Co kupić mamie która ma już 50 perfumów i 8 par butów? Herbatę. Nie byle jaką — Gyokuro którą mama będzie pić jak dama. Bundle 250 zł, w środku Gyokuro + Matcha Lattea + chasen do ubijania. Bezpłatne pakowanie, kartka z napisem co napiszesz. Zamów do 24 maja, idzie z dostawą InPost.',
          tagline: 'Bundle Premium Gift dla Mamy 250 zł',
        },
        {
          tytul: 'Mama: "Last call 2+1"',
          kto: 'Mama (face-to-cam)',
          ujecie: 'Mama trzyma 3 paczki: Matcha Lattea, Crazy Good, Caramel Pear.',
          tekst: 'Ostatnie 24 godziny Dnia Herbaty. Trzy dowolne paczki, najtańsza za darmo. Jutro o 18 wracamy do normalnych cen. Jeśli czekałaś na refill — to teraz.',
          tagline: '⏳ 25.05 do 23:59 ostatnie godziny 2+1',
        },
      ],
      grafiki: [
        {
          format: 'Email hero Premium Gift (600×300)',
          opis: 'Foto bundle: Gyokuro + Matcha Lattea + chasen ułożone w trójkąt na drewnianym blacie, wstążka w tle, hasło "Premium Gift dla Mamy". CTA "Zamów".',
        },
        {
          format: 'Banner Mother\'s Day sklepu (1920×640)',
          opis: 'Foto bundle z tła pastelowo-różowo, kwiat wiśni, "Mama która zna matchę". Aktywny 24-26.05.',
        },
        {
          format: 'IG Reel cover (1080×1920)',
          opis: 'Foto Mama + Mia obok bundle, cream tło, hasło "Mamie której nic nie brakuje".',
        },
      ],
    },
  };

  const wkData = concreteByWeek[w] || { reels: [], grafiki: [] };
  if (reels.length === 0) reels = wkData.reels;
  grafiki = wkData.grafiki || [];

  // Maile pasujące do tygodnia
  const weekStart = week._startDay || (week.start_date ? parseInt(week.start_date.slice(8)) : 1);
  const weekEnd = week._endDay || (week.end_date ? parseInt(week.end_date.slice(8)) : 31);
  const maile = allEmails.filter((e: any) => e.day >= weekStart && e.day <= weekEnd);

  // Sklep zadania (z week.store_tasks)
  const sklepZadania = Array.isArray(week.store_tasks) ? week.store_tasks.slice(0, 3) : [];

  // Promo
  const promo = (week.promo && week.promo.type && week.promo.type !== 'none') ? week.promo : null;

  return { reels, grafiki, maile, sklepZadania, promo };
}

export default function SimplePlan() {
  const params = useParams();
  const draftId = params?.draftId;
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/planner/drafts/${draftId}`).then(r => r.json()).then(j => {
      const d = j.data;
      let p: any = null;
      try { p = typeof d?.payload === 'string' ? JSON.parse(d.payload) : d?.payload; } catch {}
      setDraft({ ...d, payload: p });
      setLoading(false);
      if (d?.month) {
        const [y, m] = d.month.split('-');
        document.title = `Prosty plan ${PL_MONTH[parseInt(m)]} ${y}`;
      }
    });
  }, [draftId]);

  if (loading) return <p style={{ padding: 24 }}>Ładuję…</p>;
  if (!draft) return <p style={{ padding: 24 }}>Brak draftu.</p>;

  const month = draft.month || '2026-05';
  const [yStr, mStr] = month.split('-');
  const m = parseInt(mStr);
  const y = parseInt(yStr);

  const plan = draft.payload?.plan || draft.payload || {};
  const weeks: any[] = plan.weeks || plan.week_plans || [];

  // Wszystkie maile maja
  const allEmails = m === 5 && y === 2026 ? [
    { day: 8, time: '18:00', label: 'Teaser', subject: 'Coś nowego nadchodzi 12 maja…', body: 'W tym tygodniu otwieramy coś co zamawialiśmy 6 miesięcy temu z Japonii. 12 maja o 18:00 — pre-sale dla Was pierwsze 24h.', cta: 'Zostań na mailu' },
    { day: 12, time: '18:00', label: 'Pre-sale start', subject: '🍵 Pre-sale Gyokuro Powder otwarty (-13% first 100 puszek)', body: 'Pierwsza sproszkowana Gyokuro w Polsce. Hattori, Shizuoka. Mielona w kamiennych młynach jak matcha. Pierwsze 100 puszek po 69 zł zamiast 79. Wysyłka 19.05.', cta: 'Zamów teraz' },
    { day: 16, time: '11:00', label: 'Pre-sale reminder', subject: 'Ostatni weekend pre-sale — 100 puszek po 69 zł', body: 'Niedzielę 18.05 23:59 zamykamy pre-sale. Cena wraca do 79 zł. Jeśli czekałaś — to ostatni moment.', cta: 'Złap zniżkę' },
    { day: 19, time: '10:00', label: 'Launch', subject: '🍵 Japan Gyokuro Powder oficjalnie w sklepie', body: 'Premiera 19.05. Wysyłki pre-sale lecą dzisiaj. Reszta Polski może już zamawiać. Plus: w tym tygodniu Dzień Herbaty — 2+1 na cały katalog.', cta: 'Zobacz Gyokuro' },
    { day: 21, time: '09:00', label: 'WTD', subject: 'Dzień Herbaty: 3 paczki, najtańsza GRATIS', body: 'Wybierz 3 dowolne herbaty z całego katalogu. Najtańsza idzie GRATIS. Aktywne do 25.05 23:59. Przykład Mii: Lattea + Crazy Good + Strawberry = 130 zł zamiast 180.', cta: 'Zrób swój 3-pak' },
    { day: 24, time: '11:00', label: 'Mother Gift', subject: 'Premium Gift dla Mamy — Gyokuro + Lattea + chasen', body: 'Mama która zna matchę zasługuje na coś więcej. Bundle 250 zł: Gyokuro Powder + Matcha Lattea + chasen, w pakowaniu prezentowym. Zamów do 24.05 wieczorem, idzie InPost paczkomatem.', cta: 'Premium Gift' },
    { day: 24, time: '18:00', label: 'Last 2+1', subject: 'Ostatnie godziny 2+1 — kończymy o północy', body: 'Tomorrow 26.05 wracamy do normalnych cen. Jeśli czekałaś z koszykiem — teraz.', cta: 'Last call' },
    { day: 28, time: '11:00', label: 'Last chance', subject: 'Gyokuro w maju — jeszcze 3 dni', body: 'Maj się kończy. Jeśli nie spróbowałaś jeszcze pierwszej Gyokuro Powder w Polsce — to ostatni moment przed letnim spowolnieniem dostaw. Wysyłka standardowo 24h.', cta: 'Zamów Gyokuro' },
  ] : [];

  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: 24,
      fontFamily: '-apple-system, "Segoe UI", system-ui, sans-serif',
      color: '#1e293b',
    }}>
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .week-section { page-break-before: always; }
          .week-section:first-of-type { page-break-before: auto; }
        }
      `}</style>
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', gap: 8, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => window.print()} style={{ background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>🖨 Drukuj A4</button>
        <button onClick={() => window.close()} style={{ background: '#f1f5f9', color: '#64748b', padding: '8px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>✕ Zamknij</button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, color: '#64748b' }}>Każdy tydzień = osobna strona PDF</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>Prosty plan na {PL_MONTH[m]} {y}</h1>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Cel: <strong style={{ color: '#dc2626' }}>70 000 zł netto</strong>. Per tydzień: o czym, co nagrać, co zaprojektować, co wysłać, co w sklepie.</p>

      {weeks.map((week: any, i: number) => {
        const w = week.isoWeek || (18 + i);
        const c = buildWeekConcrete(week, i, allEmails);
        const colors = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'];
        const accent = colors[i % colors.length];

        return (
          <section key={i} className="week-section" style={{ marginBottom: 32, paddingTop: 8 }}>
            {/* Header tygodnia */}
            <div style={{ borderLeft: `5px solid ${accent}`, paddingLeft: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Tydzień {w} · {week.start_date} – {week.end_date}</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 8px', color: '#1e293b', fontFamily: 'Georgia, serif' }}>{week.theme}</h2>
              <p style={{ fontSize: 14, color: '#475569', margin: 0, lineHeight: 1.5 }}>{week.rationale}</p>
              {Array.isArray(week.hero_products) && week.hero_products.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <strong>Hero produkt:</strong> {(week.hero_products[0]?.name || week.hero_products[0])} {week.hero_products[0]?.why ? `· ${week.hero_products[0].why}` : ''}
                </div>
              )}
              {week.weekly_budget_pln && (
                <div style={{ marginTop: 4, fontSize: 12, color: accent, fontWeight: 700 }}>Budżet ads tygodnia: {week.weekly_budget_pln} zł</div>
              )}
            </div>

            {/* Promo */}
            {c.promo && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1.5 }}>🛒 PROMO TEN TYDZIEŃ</div>
                <div style={{ fontSize: 14, marginTop: 4, color: '#78350f' }}>
                  <strong>{c.promo.type} {c.promo.value || ''}</strong>
                  {c.promo.mechanics && ` — ${c.promo.mechanics}`}
                  {c.promo.code && ` · kod ${c.promo.code}`}
                </div>
              </div>
            )}

            {/* Reelsy / TikToki */}
            {c.reels.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>📱 Reels / TikTok ({c.reels.length})</h3>
                {c.reels.map((r: any, ri: number) => (
                  <div key={ri} style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{ri + 1}. {r.tytul}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>Kto: {r.kto}</div>
                    <div style={{ marginTop: 6 }}><strong style={{ color: '#475569' }}>Ujęcie:</strong> {r.ujecie}</div>
                    <div style={{ marginTop: 6 }}><strong style={{ color: '#475569' }}>Tekst do nagrania:</strong> <em style={{ color: '#1e293b', background: '#fef3c7', padding: '2px 6px', borderRadius: 3 }}>{r.tekst}</em></div>
                    {r.tagline && <div style={{ marginTop: 6, fontSize: 11, color: accent, fontWeight: 700 }}>📌 Tagline / on-screen: {r.tagline}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Grafiki */}
            {c.grafiki.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>🎨 Grafiki ({c.grafiki.length})</h3>
                {c.grafiki.map((g: any, gi: number) => (
                  <div key={gi} style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>{gi + 1}. {g.format}</div>
                    <div style={{ marginTop: 6, color: '#78350f' }}>{g.opis}</div>
                    {g.format2 && <div style={{ marginTop: 4, fontSize: 11, color: '#a16207', fontStyle: 'italic' }}>Mood: {g.format2}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Maile */}
            {c.maile.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>✉️ Newslettery ({c.maile.length})</h3>
                {c.maile.map((mail: any, mi: number) => (
                  <div key={mi} style={{ background: '#ecfeff', border: '1px solid #67e8f9', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 13 }}>
                    <div style={{ fontSize: 11, color: '#0e7490', fontWeight: 700 }}>📬 {String(mail.day).padStart(2, '0')}.{String(m).padStart(2, '0')} {mail.time} · {mail.label}</div>
                    <div style={{ fontWeight: 700, marginTop: 4, color: '#1e293b' }}>Subject: <em style={{ background: '#cffafe', padding: '2px 6px', borderRadius: 3, fontStyle: 'normal' }}>{mail.subject}</em></div>
                    <div style={{ marginTop: 6, color: '#334155', lineHeight: 1.5 }}><strong>Body:</strong> {mail.body}</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: '#0e7490' }}>CTA: <strong>{mail.cta}</strong></div>
                  </div>
                ))}
              </div>
            )}

            {/* Sklep */}
            {c.sklepZadania.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>🛒 W sklepie ({c.sklepZadania.length})</h3>
                {c.sklepZadania.map((t: any, ti: number) => (
                  <div key={ti} style={{ background: '#fdf2f8', border: '1px solid #f9a8d4', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, color: '#9d174d' }}>{ti + 1}. {t.title}</div>
                    <div style={{ marginTop: 4, color: '#831843' }}>{t.description}</div>
                    {t.placement && <div style={{ marginTop: 4, fontSize: 11, color: '#be185d', fontStyle: 'italic' }}>Gdzie: {t.placement}</div>}
                    {t.deadline && <div style={{ marginTop: 4, fontSize: 11, color: '#be185d', fontWeight: 700 }}>Deadline: {t.deadline}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px dashed #cbd5e1', fontSize: 11, color: '#94a3b8' }}>
        Wydrukowano z BHT Marketing Planner · {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} · prosty plan miesiąca · cel 70 000 zł netto
      </div>
    </div>
  );
}
