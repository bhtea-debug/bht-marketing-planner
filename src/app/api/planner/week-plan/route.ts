// @ts-nocheck
export const runtime = 'edge'; // Edge runtime: no 60s serverless limit
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MARKETING_SKILL } from '@/lib/marketing-skill-bundled';

// POST /api/planner/week-plan
// Body: { month, isoWeek, context }
// Pure LLM endpoint. Caller (wizard) is expected to fetch the heavy
// shared context (Meta history, Woo signals, brand profile, launches) ONCE
// via /api/planner/plan-context and pass it in here for every week.
// This keeps each week call to a single Anthropic round-trip (~5-15s with
// haiku) and never hits the 60s function timeout.
export async function POST(req: NextRequest) {
  try {
    const { month, isoWeek, context, additionalInstructions, currentWeek, approvedStrategy } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month required as YYYY-MM' }, { status: 400 });
    }
    if (!isoWeek || typeof isoWeek !== 'number') {
      return NextResponse.json({ error: 'isoWeek (number) required' }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const [yStr] = month.split('-');
    const y = Number(yStr);

    function isoWeekMonday(year: number, week: number): Date {
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay() || 7;
      const monday = new Date(simple);
      monday.setUTCDate(simple.getUTCDate() - dow + 1);
      return monday;
    }
    function fmt(d: Date) {
      return d.toISOString().slice(0, 10);
    }

    const weekMonday = isoWeekMonday(y, isoWeek);
    const weekSunday = new Date(weekMonday);
    weekSunday.setUTCDate(weekMonday.getUTCDate() + 6);
    const weekStartIso = fmt(weekMonday);
    const weekEndIso = fmt(weekSunday);

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const daysUntilStart = Math.max(
      0,
      Math.round((weekMonday.getTime() - today.getTime()) / 86400000)
    );

    // ----- Easter (for in-week holiday filter) -----
    function easterSunday(year: number): Date {
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d2 = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d2 - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const mm = Math.floor((a + 11 * h + 22 * l) / 451);
      const month0 = Math.floor((h + l - 7 * mm + 114) / 31);
      const day = ((h + l - 7 * mm + 114) % 31) + 1;
      return new Date(Date.UTC(year, month0 - 1, day));
    }
    const easter = easterSunday(y);
    const easterMonday = new Date(easter);
    easterMonday.setUTCDate(easter.getUTCDate() + 1);
    const allHolidays: Array<{ date: string; name: string }> = [
      { date: `${y}-01-01`, name: 'Nowy Rok' },
      { date: `${y}-01-06`, name: 'Trzech Króli' },
      { date: fmt(easter), name: 'Wielkanoc' },
      { date: fmt(easterMonday), name: 'Pon. Wielkanocny' },
      { date: `${y}-05-01`, name: 'Święto Pracy' },
      { date: `${y}-05-03`, name: 'Konstytucji 3 Maja' },
      { date: `${y}-05-26`, name: 'Dzień Matki' },
      { date: `${y}-06-01`, name: 'Dzień Dziecka' },
      { date: `${y}-06-23`, name: 'Dzień Ojca' },
      { date: `${y}-08-15`, name: 'Wniebowzięcie NMP' },
      { date: `${y}-11-01`, name: 'Wszystkich Świętych' },
      { date: `${y}-11-11`, name: 'Niepodległości' },
      { date: `${y}-12-24`, name: 'Wigilia' },
      { date: `${y}-12-25`, name: 'Boże Narodzenie' },
      { date: `${y}-12-26`, name: 'Drugi dzień świąt' },
      { date: `${y}-12-31`, name: 'Sylwester' },
      { date: `${y}-02-14`, name: 'Walentynki' },
      { date: `${y}-04-22`, name: 'Dzień Ziemi' },
      { date: `${y}-11-27`, name: 'Black Friday (orient.)' },
    ];
    const holidaysInWeek = allHolidays.filter((h) => {
      const dh = new Date(h.date);
      return dh >= weekMonday && dh <= weekSunday;
    });

    // ----- Filter pre-built context to this week -----
    const allLaunches = Array.isArray(context?.launches) ? context.launches : [];
    const launchesInWeek = allLaunches
      .filter((l: any) => {
        const d = l.launchDate;
        if (!d) return false;
        const dd = new Date(d);
        const preStart = new Date(dd);
        preStart.setUTCDate(dd.getUTCDate() - 14);
        return preStart <= weekSunday && dd >= weekMonday;
      })
      .slice(0, 3);

    // Trim long brand fields to keep input tokens small
    const trim = (s: any, n = 240) =>
      typeof s === 'string' && s.length > n ? s.slice(0, n) + '…' : s;
    const bp = context?.brandProfile || null;
    const compactBrand = bp
      ? {
          brand_voice: trim(bp.brand_voice, 200),
          visual_mood: trim(bp.visual_mood, 200),
          color_palette: bp.color_palette,
          do_list: trim(bp.do_list, 240),
          dont_list: trim(bp.dont_list, 240),
          composition_rules: trim(bp.composition_rules, 200),
          inspiration_keywords: trim(bp.inspiration_keywords, 200),
          target_persona: trim(bp.target_persona, 160),
        }
      : null;

    // ----- Build whitelist of REAL product names from Woo + launches -----
    // The AI is HARD-LOCKED to these names — no inventing.
    // Primary source: fullCatalog (every published product in the store).
    // Fallbacks: analytics slices (topProducts, slowProducts, etc.).
    const commerceObj = context?.commerce || null;
    const collectNames = (arr: any): string[] =>
      Array.isArray(arr)
        ? arr.map((p: any) => (p && typeof p.name === 'string' ? p.name.trim() : '')).filter(Boolean)
        : [];
    const allowedProductNames: string[] = Array.from(
      new Set([
        ...collectNames(commerceObj?.fullCatalog),
        ...collectNames(commerceObj?.topProducts),
        ...collectNames(commerceObj?.slowProducts),
        ...collectNames(commerceObj?.lowStock),
        ...collectNames(commerceObj?.onSale),
        ...collectNames(launchesInWeek),
      ])
    );

    // Store policies so the AI doesn't propose promos that conflict with reality.
    const storePolicies = context?.storePolicies || null;

    // Accumulated knowledge from user interactions — persistent lessons.
    const knowledgeEntries: any[] = Array.isArray(context?.knowledgeEntries)
      ? context.knowledgeEntries
      : [];
    const brainStrategy: any[] = Array.isArray(context?.brainStrategy) ? context.brainStrategy : [];
    const liveTrends: any[] = Array.isArray(context?.liveTrends) ? context.liveTrends : [];

    // Existing tasks in this month — for context awareness & dedup.
    const existingTasks: any[] = Array.isArray(context?.existingTasks)
      ? context.existingTasks
      : [];

    const userPayload = {
      month,
      today: todayIso,
      week: {
        isoWeek,
        startDate: weekStartIso,
        endDate: weekEndIso,
        daysUntilStart,
      },
      holidaysInWeek,
      meta: context?.meta || { configured: false },
      commerce: commerceObj,
      launchesInWeek,
      brandProfile: compactBrand,
      configuredAOV: Number(context?.configuredAOV || 120),
      storePolicies,
      allowedProductNames,
    };

    // ----- LLM call -----
    const client = new Anthropic({ apiKey });

    // Full marketing-planner skill (the deterministic playbook that drives quality)
    // is bundled as a string so it works in the Edge runtime. The minimal preamble
    // tells the model to call the tool exactly once.
    const QUALITY_DIRECTIVES = `

---

# DYREKTYWY JAKOŚCI — dla zespołu 2-3 osób

KONTEKST: 1-2 osoby robią grafiki, 1 pisze copy. Realny czas tygodnia: 8-12h pracy łącznie. Plan musi być WYKONALNY.

## 1. Hooki copy (creative_hook) — konkretne, nie slogany

KAŻDY creative_hook:
- max 12 słów po polsku
- konkretny moment / sytuacja (nie "miłośnicy herbaty", a "sobotni poranek")
- używaj prostego języka — bez poetyckich konstrukcji jeśli nie pasują do produktu

ŹLE: "Odkryj wyjątkowe herbaty BHT", "Smak który pokochasz", "Premium tea — sprawdź"
DOBRZE: "Sobota, herbata, nic do roboty", "Liście rozwijają się 90 sekund — zegnij się i poczekaj"

NIE wymagam minimum 2 zakotwiczeń sensorycznych. Czasem prosty hook ("Przerwa o 15:00 — twoja herbata") działa lepiej niż wymyślony obraz.

## 2. visual_brief — JEDEN dobry kierunek tygodnia

JEDEN spójny visual brief dla całego tygodnia (nie różne dla każdego kanału). Wszystkie kanały korzystają z tego samego nastroju, paletą zdjęć, props — tylko crop/format się zmienia.

Brief tygodnia ma zawierać:
- scene: 1 konkretne miejsce + pora dnia (np. "stół przy oknie, sobotni poranek 9:00")
- composition: 1 podstawowy kadr (np. "still life, flat lay 4:5") + uwaga "Reels = pionowy crop tej samej sceny"
- lighting: 1 typ światła (np. "miękkie z lewej, godzina 9:00")
- props: 3-5 rekwizytów
- mood_keywords: 3 słowa
- reference_note: jeden referans (opcjonalnie)

NIE wymagam 4 różnych briefów. Lepsza JEDNA piękna seria niż 4 średnie.

## 3. promo.mechanics — myśl mechanicznie

Jeśli promo.type ≠ none, mechanics MUSI opisywać:
- jak klient odbiera (kod / automat / wymóg minimum / okno czasowe)
- co dostaje warm baseline vs cold traffic
- jak komunikujemy w mailu vs paid vs organic (1 zdanie każdy)

ŹLE: "Standardowa zniżka -15%"
DOBRZE: "Kod WIOSNA15 ważny pn-czw, automat na koszyku >120 PLN. Email do warm bazy 7 dni wcześniej z personalizacją 'twoja zniżka', paid retargeting z hookiem 'wracają twoje ulubione', organic IG bez ceny — tylko nastrój."

## 4. theme i rationale

theme = max 6 słów, konkretny motyw nie kategoria (NIE "Wiosenne herbaty", TAK "Pierwsze ciepło na balkonie")
rationale = 2 zdania: (1) jaki sygnał z danych to wywołał (Woo top mover X / Meta winner Y / sezon Z), (2) dlaczego ten konkretny tydzień

## 5. Spójność produktów — TWARDA REGUŁA, ZERO TOLERANCJI

WSZYSTKIE pozycje w \`hero_products[].name\` MUSZĄ być dokładnym ciągiem znaków z listy \`allowedProductNames\` w danych wejściowych. Lista pochodzi z WooCommerce (topSellers + slowProducts + lowStock + newProducts + onSale) plus zaplanowane launche.

ZAKAZY:
- ❌ NIE wymyślaj nazw produktów ("Earl Grey Premium", "Złoty Yunnan Reserve", "Zimowa Mieszanka BHT" — jeśli tego nie ma w \`allowedProductNames\`, NIE WOLNO tego użyć)
- ❌ NIE tłumacz, nie skracaj, nie modyfikuj nazw (jeśli w Woo jest "Earl Grey z bławatkiem 100g", to wpisujesz dokładnie "Earl Grey z bławatkiem 100g", nie "Earl Grey")
- ❌ NIE używaj kategorii zamiast nazwy ("nasza zielona", "zimowy blend") jako wartości w \`hero_products[].name\`
- ❌ Jeśli \`allowedProductNames\` jest pusta — jako \`hero_products[].name\` użyj dosłownie \`"(brak danych Woo)"\` i dodaj \`warning\` w designer_summary; NIGDY nie zmyślaj nazw

W copy (creative_hook, headline, body) MOŻESZ używać nazw z \`allowedProductNames\` LUB ogólnej kategorii (np. "nasza zielona z jaśminem") jeśli pasuje rytmicznie — ale konkretne nazwy własne MUSZĄ pokrywać się z listą.

Jeśli zauważysz że twój pierwszy pomysł na hero product nie pasuje do \`allowedProductNames\` — wybierz inny produkt z listy zamiast forsować swój pomysł.

## 6. Body / headline

Jeśli kanał ma format reklamy (single_image, carousel, reels) WYPEŁNIJ headline (max 8 słów) i body (2-3 zdania). Nie zostawiaj pustego. Body musi prowadzić od sensorycznego obrazu do CTA, bez sprzedażowego krzyku.

## 7. Polityki sklepowe — BEZWZGLĘDNIE PRZESTRZEGAJ

Dane w \`storePolicies\` to FAKTY o sklepie. Nie ignoruj ich, nie wymyślaj alternatyw.

KLUCZOWE REGUŁY:
- Darmowa wysyłka od 129 PLN to STANDARD — to nie jest promocja. NIGDY nie komunikuj tego jako "darmowa dostawa". Klient i tak ją dostaje.
- Jeśli promo.type = free_shipping, MUSISZ ustawić próg NIŻSZY niż 129 PLN (np. 0 PLN = "darmowa wysyłka bez minimalnego zamówienia") — bo wyższy próg jest gorszy od standardowej oferty.
- Nie wymyślaj progów darmowej wysyłki "od 150 PLN" — to POGARSZA istniejącą ofertę klienta (129 PLN).
- Jeśli chcesz zaproponować promo darmowej wysyłki, jedyna sensowna mechanika to OBNIŻENIE progu (np. "darmowa wysyłka od 79 PLN" lub "darmowa wysyłka na wszystko bez minimum").

## 9. ZAKRES OBOWIĄZKÓW ZESPOŁU (team_tasks) — WYMAGANE

Dla każdego tygodnia MUSISZ wypełnić sekcję 'team_tasks' — konkretne zadania per rola, wynikające BEZPOŚREDNIO z motywu, promo i hero produktów tego tygodnia. NIE generyczne ("zrób hooki" — bzdura), ALE konkretne ("Hook na Reels: 'POV: Twoja matcha + Gyokuro w 2+1 koszyku WTD' — 3 warianty 1-3s").

Format każdego pola: 2-4 zadania w jednym stringu, oddzielone " · ". Krótkie i wykonalne.

Przykład dla tygodnia z launchem Gyokuro 19.05 + 2+1 promo:
- marketing_owner: "Zatwierdzić launch date 19.05 · Daily revenue check vs target 30k tygodnia · Decyzja go/no-go aktywacji 2+1 promo 20.05"
- copywriter: "Email subject (3 warianty) 'Pierwsza Gyokuro Powder' · Hook IG Reel 5 wariantów · Body carousel 'Gyokuro vs Matcha' 6 slajdów"
- designer: "Hero video Mama unboxing (60s vertical) · Carousel comparison 6 slajdów · 3 statyki ad (1080×1080 + 1080×1350) · Email header"
- ads_meta: "Kampania Meta WTD: budżet 1500/dzień, audience LAL Premium Japan buyers · Retarget 30d /shop · Daily check ROAS, threshold ±30%"
- content_mia: "Mia TikTok 'POV: dostałam się na early access' (15s) · Mama Reel parzenie Gyokuro live · IG Stories 5/dzień · Email blast 19.05 + 21.05 + 24.05"
- operations: "WC: aktywacja kuponu WTD3 dla 2+1 mechanizmu · Update strony Gyokuro pre-sale → in-stock · Check stock Matcha Lattea + Crazy Good · Test checkout"
- influencer_pr: "Wysyłka 20 paczek Discovery Set 14.05 · 20 unikatowych kodów IMIE10 do WC · Brief PDF + tracking sheet"

Jeśli w danym tygodniu nie ma aktywacji influencer — pomiń pole 'influencer_pr' lub ustaw na pusty string.

## 8. Zadania na stronie sklepu (store_tasks) — WYMAGANE W KAŻDYM TYGODNIU

Każdy tydzień MUSI mieć co najmniej 1 pozycję w \`store_tasks\`. Sklep internetowy to NIE pasywne tło — to aktywny kanał sprzedaży, który powinien odzwierciedlać to co się dzieje w kampaniach.

REGUŁY:
- Jeśli tydzień ma temat sezonowy (Dzień Ziemi, Wielkanoc, Black Friday) → OBOWIĄZKOWO baner na hero section z tematem + ewentualnie dedykowany landing page.
- Jeśli tydzień ma promo → popup lub footer bar z kodem rabatowym / komunikatem o promo.
- Jeśli są hero products → product_highlight lub collection_page grupująca te produkty.
- store_tasks.deadline MUSI być PRZED startem kampanii paid — baner musi wisieć zanim leci ruch z reklam.
- visual_note powinno nawiązywać do briefu wizualnego kanałów (spójność!).

TYPY:
- homepage_banner: główny baner na stronie głównej (hero section lub pod hero)
- landing_page: dedykowana strona pod kampanię (np. /dzien-ziemi, /matcha-set)
- product_highlight: wyróżnienie produktu na stronie (badge, sticker "NOWOŚĆ", "BESTSELLER")
- collection_page: kolekcja/kategoria tematyczna (np. "Herbaty na wiosnę")
- popup: exit-intent lub timed popup z promo/newsletterem
- menu_update: zmiana w nawigacji (np. dodanie "Dzień Ziemi" do menu)

## 9. Różnorodność katalogu — nie kręć się wokół 1 produktu

W \`commerce.fullCatalog\` masz PEŁNĄ listę produktów z WooCommerce — herbaty, akcesoria, zestawy, etc.
NIE skupiaj się na jednej kategorii (np. tylko matcha, tylko akcesoria).

REGUŁY:
- W \`hero_products\` tygodnia MUSZĄ być minimum 2 RÓŻNE kategorie produktowe (np. herbata + akcesorium, lub zielona + czarna).
- Jeśli w topProducts dominuje 1 produkt — weź go PLUS coś z innej kategorii żeby było ciekawie.
- Przeglądnij \`fullCatalog\` — szukaj produktów które pasują tematycznie do tygodnia (sezon, święto) a NIE tylko tych z najwyższą sprzedażą.
- Akcesoria (czajniki, miski, kubki) mogą być hero produktem — ale wtedy sparuj je z herbatą.

---
`;

    const fullSystem = `${MARKETING_SKILL}${QUALITY_DIRECTIVES}

═══════════════════════════════════════════════════════════
RZECZYWISTOŚĆ INSTAGRAMA 2026 (CZYTAJ ZANIM PISZESZ REELS/POST/STORY)
═══════════════════════════════════════════════════════════
Jeśli kanał = instagram_organic / instagram_reels / facebook_organic — TO JEST ROK 2026 NIE 2018. Brief MUSI brzmieć jak współczesny IG content, nie jak TVC z agencji.

CO DZIAŁA NA IG 2026:
- Reels storytelling 7-30s, raczej face-to-cam i głos kreatorki niż tylko makro produktu
- Carousel z text-on-image dla edukacji ("Co to gyokuro?" w 7 slajdach)
- Hook PROSTY: pytanie, kontrowersja, mocne stwierdzenie. NIE poetyckie zdania.
- Caption KONWERSACYJNY (3-5 zdań pierwsza osoba), nie korporacyjny
- Less polish > more polish (raw kuchnia, telefon w ręku, Mama tłumacząca)
- BTS, vlog-style, "moja codzienność" energy

CZEGO ZABIJESZ REELS W 2026 (red flags):
1. Briefy wizualne pisane jak shoot list dla photographera/stylist:
   - "Lniana serwetka ecru, drewniana łyżeczka, świeże maliny 5-7 sztuk" — stop. To props lista do sesji w studio.
   - "Temperatura 5000K", "kierunek światła z lewej", "godzina 9:30" — to brief do kamery, nie pomysł na content
   - "Ceramiczna miska kremowa #fffbf2" — pantone w opisie scenki to TVC żargon
2. Hooki poetic: "Para unosi się w górę, czas zwalnia", "Jak liść w mocno parzonej wodzie..." — Hallmark cards. STOP.
3. Body jak Wikipedia: "Matcha robiona z liści tencha, gyokuro z liści gyokuro..." — to wpis blogowy. Reels potrzebuje story, nie definicji.
4. Generic CTAs: "Tap link w bio – zestawy", "Kliknij link w bio – sprawdź nowość" — wymyśl coś z osobistym voice.
5. Nadmierna estetyzacja: "drewno orzechowe + paleta piaskowa #f5f1ea" jako jedyny opis sceny — to jest to samo co inne herbaciarnie, nie wyróżni was.

JAK PISAĆ BRIEF IG REELS 2026:
- scene = JEDEN konkret + wskazówka tone, np. "Mama w kuchni mówi prosto do kamery z kubkiem w ręku — autentyczne, lekko zmęczone po pracy" (NIE: "drewniany stół, lniana zasłona, godzina 9:30")
- props = MAX 2-3 pozycje, naturalne (NIE: lista jak shoot list)
- lighting = "naturalne dzienne, takie jakie jest" (NIE: "5000K, miękkie, długie cienie w prawo")
- creative_hook = jak ktoś mówi do koleżanki, max 12 słów, BEZ poezji
  GOOD: "Mama myśli że już wszystko wie o herbacie. Kupiła to."
  GOOD: "Sprzedaliśmy 3000 paczek tej herbaty w jeden dzień"
  BAD: "Para unosi się w górę, czas zwalnia"
- body = pierwszy-osobowy storytelling 3-5 zdań, NIE definicje. Jakby Mama/Mia opowiadała znajomemu.
- cta = wariuj, nie zawsze "link w bio". Może być: "komentarz jeśli próbowaliście", "save jeśli wam przyda", "share z kimś kto pije za dużo kawy"

FACEBOOK_ORGANIC 2026:
- Dłuższy storytelling OK, demograficznie 35+
- Posty dziennikarskie / personalne ("napisałam długi post...") działają
- Photo + 1-2 paragraf + ZNAJDUJ THE story, nie "nasza nowość"

═══════════════════════════════════════════════════════════

INSTRUKCJA WYKONAWCZA: Wywołaj narzędzie emit_week_plan dokładnie raz z kompletnym obiektem tygodnia. Pisz po polsku. Stosuj się ŚCIŚLE do playbooka i dyrektyw jakości powyżej. Zanim wywołasz narzędzie, w głowie sprawdź:
1. Czy hook ma 2 zakotwiczenia sensoryczne?
2. Czy briefy wizualne się od siebie różnią w 3+ wymiarach?
3. Czy headline/body są wypełnione?
4. Czy store_tasks ma min. 1 pozycję (baner/landing/highlight/popup)?
5. Czy store_tasks.deadline jest PRZED startem kampanii?
Jeśli cokolwiek brakuje — przepisz, dopiero potem wywołaj narzędzie.`;

    // If approvedStrategy is provided, we're in PHASE 2 — user already approved the strategy,
    // we just need to generate channels, content, briefs, store_tasks around it.
    const strategyBlock = approvedStrategy
      ? `\n\n========== ZATWIERDZONA STRATEGIA (FAZA 2) ==========
Użytkownik ZATWIERDZIŁ poniższą strategię. MUSISZ ją użyć DOKŁADNIE — nie zmieniaj theme, hero_products, promo ani rationale. Twoje zadanie to TYLKO dodać:
- channels (kanały z pełnymi briefami, hookami, copy, visual briefs)
- store_tasks (zadania na stronie sklepu)
- linked_calendar_tasks

Zatwierdzona strategia:
${JSON.stringify(approvedStrategy, null, 2)}

TWARDE REGUŁY FAZY 2:
- theme: użyj DOKŁADNIE "${approvedStrategy.theme}"
- rationale: użyj DOKŁADNIE "${approvedStrategy.rationale}"
- hero_products: użyj DOKŁADNIE tych samych produktów: ${(approvedStrategy.hero_products || []).map((p: any) => p.name).join(', ')}
- promo: użyj DOKŁADNIE tego samego typu i mechaniki
- designer_summary: użyj jako bazę dla visual_briefs — spójność wizualna
- weekly_budget_pln: użyj ${approvedStrategy.weekly_budget_pln || 0}
=============================================`
      : '';

    // If we're refining an existing week, show the previous version + the user's instructions
    const isRefine = !!additionalInstructions;
    const refineBlock = isRefine
      ? `\n\n========== POPRAWKA OD UŻYTKOWNIKA ==========\nTo jest kolejna iteracja tego tygodnia. Użytkownik widział poprzednią wersję i prosi o konkretne poprawki — TWOIM ZADANIEM jest podnieść jakość, nie tylko mechanicznie wprowadzić zmianę.\n\nPoprzednia wersja (do oceny i poprawy):\n${JSON.stringify(currentWeek || {}, null, 2)}\n\nInstrukcje użytkownika: "${additionalInstructions}"\n\nZASADY POPRAWKI:\n1. Realizuj prośbę użytkownika DOSŁOWNIE.\n2. Jednocześnie podnieś ogólną jakość: hooki muszą być sensoryczne i konkretne (nie "odkryj nasze herbaty"), promo musi mieć przemyślaną mechanikę, briefy wizualne muszą być realnie wykonalne dla designera.\n3. ZACHOWAJ wszystko co już było dobre w poprzedniej wersji — nie wymyślaj na nowo bez powodu.\n4. Jeśli użytkownik prosi o zmianę kanału lub produktu, sprawdź czy ma to sens biznesowy w kontekście Woo/Meta sygnałów.\n5. Nie powielaj pomysłów z poprzedniej wersji jeśli były słabe — popraw je.\n=============================================`
      : '';

    const userPrompt = `Wygeneruj plan marketingowy DLA POJEDYNCZEGO TYGODNIA ISO ${isoWeek} (${weekStartIso} → ${weekEndIso}) miesiąca ${month}.${strategyBlock}${refineBlock}

DZIŚ JEST ${todayIso}. Tydzień startuje za ${daysUntilStart} dni.
Święta w tym tygodniu: ${holidaysInWeek.length ? holidaysInWeek.map((h) => `${h.name} ${h.date}`).join(', ') : 'brak'}.

Wartości stałe (musisz ich użyć dokładnie tak):
- isoWeek: ${isoWeek}
- label: "Tydzień ${isoWeek} (${weekStartIso} – ${weekEndIso})"
- dateRange: "${weekStartIso} – ${weekEndIso}"
- start_date: "${weekStartIso}"
- end_date: "${weekEndIso}"

Reguły:
- MAKSYMALNIE 2 kanały — wybierz NAJWAŻNIEJSZE. Lepiej zrobić 2 perfekcyjnie niż 5 średnio. Typowo: 1 paid (Meta single_image) + 1 organic (IG Reels storytelling/email/TikTok). IG Reels = story-driven, face-to-cam, NIE statyczny pickup z parą. TikTok rozważ gdy: produkt ma potencjał viralowy (smaki, ASMR przygotowania herbaty, blendy), masz pomysł na pionowy filmik 15-30s z hookiem w 1-3 sek. NIE rób TikTok gdy: brak osoby do nagrania w tym tygodniu lub temat jest typowo statyczny (zdjęcie kubka).
- Briefy wizualne czerpią z brandProfile, ALE: dla IG/Reels/FB w 2026 OPISUJ POMYSŁ A NIE SHOOT-LIST. Krótko, naturalnie, z energią kreatorki — nie z agencji reklamowej. Patrz blok 'RZECZYWISTOŚĆ INSTAGRAMA 2026' w systemie. Studio briefs (props lista, temperatura światła, pantone tła) są dozwolone TYLKO dla single_image/homepage_banner/popup, NIE dla Reels/Story/post.
- Nie używaj cudzysłowów (") wewnątrz pól tekstowych — używaj ' lub « ».
- TWARDA REGUŁA PRODUKTÓW: \`hero_products[].name\` MUSI być DOKŁADNIE jednym z ciągów w \`allowedProductNames\` poniżej. Tool API odrzuci output z wymyśloną nazwą — twój request padnie. Jeśli lista jest pusta, użyj dosłownie "(brak danych Woo)".

POLITYKI SKLEPU (NIE wymyślaj — przestrzegaj):
${storePolicies ? JSON.stringify(storePolicies, null, 2) : '  (brak danych — NIE proponuj free_shipping jako promo)'}

ALLOWED PRODUCT NAMES (lista ${allowedProductNames.length} pozycji z WooCommerce — wybieraj WYŁĄCZNIE z tej listy, MIX kategorii):
${allowedProductNames.length > 0 ? allowedProductNames.map((n) => `  - ${n}`).join('\n') : '  (pusta — Woo niedostępne, użyj "(brak danych Woo)" jako name i dodaj warning w designer_summary)'}
${knowledgeEntries.length > 0 ? `
BAZA WIEDZY — lekcje i preferencje właściciela sklepu (BEZWZGLĘDNIE przestrzegaj, to nadrzędne nad ogólnymi regułami):
${knowledgeEntries.map((k: any) => `  [${k.category}] ${k.content}`).join('\n')}
` : ''}
${existingTasks.length > 0 ? `
ISTNIEJĄCE ZADANIA W KALENDARZU na ten okres (weź pod uwagę — nie duplikuj, uzupełniaj luki, wskaż priorytety):
${existingTasks.map((t: any) => `  [${t.status}/${t.priority}] ${t.scheduled_date || '?'}: ${t.title} (kampania: ${t.campaign})`).join('\n')}

Na podstawie istniejących zadań:
- NIE duplikuj zadań które już istnieją
- Jeśli widzisz luki (np. brak banneru na stronę, brak maila) — dodaj do store_tasks/linked_calendar_tasks
- Sugeruj priorytety: zadania blokujące (baner przed kampanią, landing page) = deadline wcześniejszy
` : ''}
Wywołaj narzędzie emit_week_plan ze wszystkimi polami. Dane wejściowe:\n\n${JSON.stringify(userPayload, null, 2)}`;

    const weekPlanTool = {
      name: 'emit_week_plan',
      description: 'Emituje plan marketingowy na pojedynczy tydzień ISO.',
      input_schema: {
        type: 'object',
        required: [
          'isoWeek',
          'label',
          'dateRange',
          'start_date',
          'end_date',
          'theme',
          'rationale',
          'hero_products',
          'promo',
          'weekly_budget_pln',
          'designer_summary',
          'channels',
          'store_tasks',
          'team_tasks',
        ],
        properties: {
          isoWeek: { type: 'integer' },
          label: { type: 'string' },
          dateRange: { type: 'string' },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          theme: { type: 'string', description: 'Krótki temat tygodnia' },
          rationale: { type: 'string', description: '1-2 zdania uzasadnienia' },
          hero_products: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'why'],
              properties: {
                name:
                  allowedProductNames.length > 0
                    ? {
                        type: 'string',
                        enum: [...allowedProductNames, '(brak danych Woo)'],
                        description:
                          'MUSI być dokładnym ciągiem z allowedProductNames (z WooCommerce). Brak zmyślania.',
                      }
                    : {
                        type: 'string',
                        description:
                          'allowedProductNames pusta — wpisz "(brak danych Woo)" i dodaj warning.',
                      },
                why: { type: 'string' },
              },
            },
          },
          promo: {
            type: 'object',
            required: ['type'],
            properties: {
              type: {
                type: 'string',
                enum: ['none', 'percent', 'bundle', 'gift', 'free_shipping'],
              },
              value: { type: 'string' },
              mechanics: { type: 'string' },
            },
          },
          weekly_budget_pln: { type: 'number' },
          designer_summary: {
            type: 'string',
            description: '2-3 zdania syntezy wizualnej dla całego tygodnia',
          },
          channels: {
            type: 'array',
            maxItems: 2,
            items: {
              type: 'object',
              required: [
                'channel',
                'format',
                'objective',
                'creative_hook',
                'cta',
                'audience',
                'expected_kpi',
                'budget_pln',
                'visual_brief',
              ],
              properties: {
                channel: {
                  type: 'string',
                  enum: [
                    'meta_ads_prospecting',
                    'meta_ads_retargeting',
                    'instagram_organic',
                    'facebook_organic',
                    'email',
                    'tiktok',
                    'content_blog',
                    'ecommerce_site',
                  ],
                },
                format: {
                  type: 'string',
                  enum: [
                    'single_image',
                    'carousel',
                    'reels',
                    'story',
                    'vertical_video',
                    'tiktok_organic',
                    'newsletter',
                    'post',
                    'homepage_banner',
                    'landing_page',
                    'product_highlight',
                    'collection_page',
                    'popup',
                  ],
                },
                objective: { type: 'string' },
                creative_hook: { type: 'string' },
                headline: { type: 'string' },
                body: { type: 'string' },
                cta: { type: 'string' },
                audience: { type: 'string' },
                expected_kpi: { type: 'string' },
                budget_pln: { type: 'number' },
                headline: { type: 'string', description: 'max 8 słów, wymagane dla single_image/carousel/reels/post' },
                body: { type: 'string', description: '2-3 zdania, sensorycznie do CTA, wymagane dla single_image/carousel/reels/newsletter' },
                visual_brief: {
                  type: 'object',
                  required: ['scene', 'composition', 'lighting', 'props', 'mood_keywords', 'reference_note'],
                  properties: {
                    scene: { type: 'string', description: 'konkretne miejsce + pora dnia + element narracyjny' },
                    props: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
                    lighting: { type: 'string', description: 'konkretne źródło + kierunek + pora' },
                    palette: { type: 'array', items: { type: 'string' } },
                    composition: { type: 'string', description: 'typ kadru + proporcje + układ' },
                    mood_keywords: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
                    do: { type: 'string' },
                    dont: { type: 'string' },
                    reference_note: { type: 'string', description: 'krótkie odniesienie wizualne' },
                  },
                },
              },
            },
          },
          linked_calendar_tasks: {
            type: 'array',
            items: { type: 'string' },
            description: 'Zadania organic do kalendarza (np. "Reels: parzenie hero produktu")',
          },
          store_tasks: {
            type: 'array',
            description: 'Zadania na stronie sklepu — banery, landing page, wyróżnienia produktów, kolekcje, popupy.',
            items: {
              type: 'object',
              required: ['type', 'title', 'description', 'placement'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['homepage_banner', 'landing_page', 'product_highlight', 'collection_page', 'popup', 'menu_update', 'other'],
                },
                title: { type: 'string', description: 'Krótki tytuł zadania, np. "Baner Dzień Ziemi — hero section"' },
                description: { type: 'string', description: '2-3 zdania: co zrobić, jaka treść, jaki CTA, co podlinkować' },
                placement: { type: 'string', description: 'Gdzie na stronie: hero section, pod hero, sidebar, footer bar, popup na exit, etc.' },
                visual_note: { type: 'string', description: 'Krótka wskazówka wizualna (nawiązanie do briefu kanału jeśli ten sam temat)' },
                deadline: { type: 'string', description: 'Kiedy musi być gotowe (data ISO lub "przed startem kampanii")' },
              },
            },
          },
          team_tasks: {
            type: 'object',
            description: 'Zakres obowiązków zespołu na ten tydzień, per rola. KAŻDY pole = 2-4 konkretne zadania (bullet style w jednym stringu, oddzielone " · "). Konkretne, wynikające z tematu/promo/produktów tego tygodnia, NIE generyczne.',
            required: ['marketing_owner', 'copywriter', 'designer', 'ads_meta', 'content_mia', 'operations'],
            properties: {
              marketing_owner: { type: 'string', description: 'Decyzje top-level (zatwierdzenie motywu, budżetu, promo). Daily check vs target tygodnia.' },
              copywriter: { type: 'string', description: 'Hooki + body per kanał + email subjects + punktory dla hero produktów.' },
              designer: { type: 'string', description: 'Kreatywki per format kanału + hero foto + email header. Powiąż z designer_summary.' },
              ads_meta: { type: 'string', description: 'Setup kampanii Meta/TT z budżetem i audience per kanał. Daily monitoring CTR/ROAS.' },
              content_mia: { type: 'string', description: 'TikTok/Reels Mama+Mia + IG Stories codziennie + email blast(y).' },
              operations: { type: 'string', description: 'Setup promo w WC (kod+czas), stock check hero produktów, banery sklepu, test checkout.' },
              influencer_pr: { type: 'string', description: 'OPCJONALNE: tylko jeśli w tym tygodniu jest aktywacja influencer (np. seeding paczek). Lista, briefy, kody. Pominij jeśli brak.' },
            },
          },
        },
      },
    };

    // Extract the FIRST balanced top-level {...} object from a string.
    // Tracks string state so braces inside string literals don't confuse it.
    function extractJson(raw: string): string {
      let s = raw.trim();
      s = s.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = s.indexOf('{');
      if (start === -1) return s;
      let depth = 0;
      let inStr = false;
      let escape = false;
      for (let i = start; i < s.length; i++) {
        const ch = s[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inStr = !inStr;
          continue;
        }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return s.slice(start, i + 1);
        }
      }
      // No balanced close — try to repair truncated JSON by closing open
      // strings, arrays, and braces in order.
      let repaired = s.slice(start);
      if (inStr) repaired += '"';
      // count remaining open brackets
      let openBraces = 0;
      let openBrackets = 0;
      let str = false;
      let esc = false;
      for (const ch of repaired) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { str = !str; continue; }
        if (str) continue;
        if (ch === '{') openBraces++;
        else if (ch === '}') openBraces--;
        else if (ch === '[') openBrackets++;
        else if (ch === ']') openBrackets--;
      }
      // strip dangling comma before closing
      repaired = repaired.replace(/,\s*$/, '');
      while (openBrackets-- > 0) repaired += ']';
      while (openBraces-- > 0) repaired += '}';
      return repaired;
    }

    // ----- Streaming response with heartbeat -----
    // Vercel Edge functions get killed if there's no response activity within
    // a short window. We open a ReadableStream immediately, emit a single
    // space byte every 3 seconds while Anthropic generates, then write a
    // newline + the final JSON payload at the end. The client reads the whole
    // body, splits on the LAST newline, and parses the trailing JSON.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const t0 = Date.now();
        let alive = true;
        const heartbeat = setInterval(() => {
          if (!alive) return;
          try {
            controller.enqueue(encoder.encode(' '));
          } catch {}
        }, 3000);

        try {
          // Always use Sonnet — Haiku produces repetitive, generic creatives.
          // Edge runtime + heartbeat stream gives us up to 5 minutes so latency is fine.
          const model = 'claude-sonnet-4-5';
          const llmRes = await client.messages.create({
            model,
            max_tokens: 8000,
            system: fullSystem,
            tools: [weekPlanTool as any],
            tool_choice: { type: 'tool', name: 'emit_week_plan' } as any,
            messages: [{ role: 'user', content: userPrompt }],
          });
          console.log(
            `[week-plan] iso=${isoWeek} model=${model} refine=${isRefine} took ${Date.now() - t0}ms, in=${llmRes.usage?.input_tokens} out=${llmRes.usage?.output_tokens}`
          );

          // Find the tool_use block — guaranteed valid JSON via API
          const toolUse = llmRes.content.find((b: any) => b.type === 'tool_use') as any;
          let parsed: any = toolUse?.input || null;
          let parseError: string | null = null;
          if (!parsed) {
            parseError = `no tool_use in response (stop_reason=${llmRes.stop_reason})`;
          }

          alive = false;
          clearInterval(heartbeat);

          const payload = parsed
            ? {
                data: {
                  week: parsed,
                  debug: {
                    isoWeek,
                    weekStartIso,
                    weekEndIso,
                    launchesInWeek: launchesInWeek.length,
                    elapsedMs: Date.now() - t0,
                  },
                },
              }
            : {
                error: 'LLM did not call tool',
                parseError,
                raw: JSON.stringify(llmRes.content).slice(0, 4000),
              };
          // Marker newline so client can find the JSON after the heartbeat spaces
          controller.enqueue(encoder.encode('\n' + JSON.stringify(payload)));
          controller.close();
        } catch (e: any) {
          alive = false;
          clearInterval(heartbeat);
          console.error('[week-plan] stream error', e);
          try {
            controller.enqueue(
              encoder.encode('\n' + JSON.stringify({ error: e.message || String(e) }))
            );
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (e: any) {
    console.error('[week-plan]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
