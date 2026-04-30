// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PL_MONTH = ['','styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];

// Mapowanie tygodnia → konkretne reelsy/grafiki/karuzele/maile/sklep
// Generowane semi-statycznie z istniejących danych draftu + planning_knowledge
function buildWeekConcrete(week: any, weekIdx: number, allEmails: any[]) {
  const heroNames = (week.hero_products || []).map((p: any) => p.name || p);
  const heroFirst = heroNames[0] || '';

  const w = week.isoWeek || (18 + weekIdx);
  let reels: any[] = [];
  let grafiki: any[] = [];
  let karuzele: any[] = [];

  if (Array.isArray(week.mia_tiktok_variants) && week.mia_tiktok_variants.length > 0) {
    reels = week.mia_tiktok_variants.slice(0, 3).map((v: any) => ({
      tytul: v.title || 'Reel',
      ujecie: v.opening_first_2_seconds || v.hook_seconds_1_3 || '—',
      tekst: v.body || v.script || '—',
      kto: v.creator || 'Kasia / Mia / Sasza',
    }));
  }

  // Per tydzień (W18-W22) konkretne propozycje
  const concreteByWeek: Record<number, any> = {
    18: {
      reels: [
        {
          tytul: 'Kasia parzy spring tea na balkonie',
          kto: 'Kasia (face-to-cam) — opcj. Sasza',
          ujecie: 'Balkon, słońce, kwitnące rośliny w tle. Kasia w lekkim swetrze, zalewa Spring Tea wrzątkiem (Sasza może być za kamerą lub w kadrze obok).',
          tekst: 'Najlepsza herbata na majówkę? Spring Tea z igłami sosny. Pachnie jak las po deszczu. Zalewam, czekam 4 minuty, wynoszę na balkon — i niech sobie majówka leci.',
          tagline: '🌿 Spring Tea — naturalny aromat sosny',
        },
        {
          tytul: 'Hands-only ASMR: pakowanie 47 zamówień',
          kto: 'Studio / hands-only (bez twarzy)',
          ujecie: 'Stół z paczkami, klasyk InPost, ręce pakują (dowolna osoba, kamera w pionie nad blatem), naklejki, taśma. Speed-up x2 lub real-time z lo-fi muzyką.',
          tekst: '(brak voiceover). Tekst on-screen: "Pakuję 47 zamówień przed majówką. Twoja herbata leci do Ciebie 🍵". Lub trending audio bez tekstu.',
          tagline: '47 paczek przed weekendem',
        },
      ],
      karuzele: [
        {
          tytul: 'Spring Tea — 5 sposobów na majówkę',
          format: 'IG carousel 6 slajdów (1080×1080)',
          mood: 'Pastel zielony + cream tło, rustykalny mood, soft natural light, gałązki sosny',
          slides: [
            { headline: 'Spring Tea na majówkę', body: '5 sposobów żeby zrobić ją Twoją. Igły sosny + zielona herbata + cytryna. Pachnie jak las po deszczu.', visual: 'Foto Spring Tea w przezroczystym dzbanku, gałązki sosny w tle' },
            { headline: '1. Cytryna + lód', body: 'Plasterek cytryny + 2 kostki lodu po 4 minutach parzenia. Świeżość bez słodzenia. Klasyk na ciepły dzień na balkonie.', visual: 'Szklanka z lodem, plasterki cytryny, mięta' },
            { headline: '2. Świeża mięta', body: '3-4 listki mięty wrzuć do ciepłej herbaty. Ostudź, dodaj lód. Idealne na grilla z rodziną — rześkie, bez kalorii.', visual: 'Mięta świeża obok szklanki z herbatą' },
            { headline: '3. Miód lipowy', body: 'Łyżeczka do ciepłej (nie wrzącej, bo niszczy enzymy) herbaty. Spring Tea + igły sosny + miód = pakiet na zmianę pogody.', visual: 'Łyżeczka miodu nad parującą szklanką' },
            { headline: '4. Lód + tonic', body: 'Schłodź herbatę, wlej do szklanki z lodem, dolej tonic 50/50. Letni mocktail bez alkoholu — idealne na grilla.', visual: 'Wysoka szklanka z lodem, bąbelki, gałązka rozmarynu' },
            { headline: 'W sklepie do 4.05', body: 'Spring Tea czeka — pakuj w plecak, parz na balkonie. Link w bio. Wysyłka 24h InPostem do paczkomatu.', visual: 'Foto puszki Spring Tea + CTA "Zamów"' },
          ],
        },
      ],
      grafiki: [
        {
          format: 'IG Story serial 4-slajdy (1080×1920)',
          opis: 'Story 1: poranek — kubek z herbatą na parapecie. Story 2: w połowie dnia — szklanka z lodem na balkonie. Story 3: wieczór — herbata + książka. Story 4: CTA "Zamów Spring Tea".',
          mood: 'Vertical, soft natural light, candid, lifestyle',
        },
      ],
    },
    19: {
      reels: [
        {
          tytul: 'Kasia: "Co to gyokuro?" — quick edukacja',
          kto: 'Kasia (face-to-cam, kuchnia) — opcj. Sasza',
          ujecie: 'Kasia trzyma puszkę matchy w jednej ręce, puszkę gyokuro w drugiej. Tło: kuchnia, naturalne światło.',
          tekst: 'Pijesz matchę codziennie? To posłuchaj. Gyokuro to japońska herbata z TYCH SAMYCH zacienianych liści, ale innego kultywaru. Smak głębszy, więcej umami, i — co fajne — łagodniejsza od matchy. Za tydzień otwieramy przedsprzedaż naszej własnej. Pierwsza taka w Polsce.',
          tagline: '🍵 Gyokuro Powder — 19.05 premiera',
        },
        {
          tytul: 'Macro b-roll: "Skąd to zielone?"',
          kto: 'Studio macro (bez twarzy) + voice-over',
          ujecie: 'Slow-mo close-up: liść gyokuro → kamienny młyn (stock JP) → drobny proszek wysypany na łyżkę → woda 60°C wlewana do chawanu → ubijanie chasenem → piana. 6 ujęć po 2-3s. ASMR audio + spokojny voice-over.',
          tekst: 'Voice-over (Kasia lub Sasza): "Trzy tygodnie zacieniania na japońskiej plantacji. Ręczny zbiór najmłodszych pąków. Mielenie w kamiennym młynie — godzina pracy na 30 gramów proszku. To dlatego gyokuro jest takie zielone i takie głębokie w smaku. Pre-sale za tydzień." Tekst on-screen: "21 dni cienia → 1h młyn → Twój chawan".',
          tagline: '🍵 Gyokuro — od plantacji do chawanu · pre-sale 12.05',
        },
      ],
      karuzele: [
        {
          tytul: 'Gyokuro vs Matcha — 5 różnic',
          format: 'IG/TikTok carousel 6 slajdów (1080×1080)',
          mood: 'Cream tło, deep matcha green akcenty, japońska estetyka, minimalistyczne ikony, czcionka serif na headlines',
          slides: [
            { headline: 'Gyokuro vs Matcha — 5 różnic których nikt Ci nie powiedział', body: 'Obie japońskie. Obie zielone. Obie sproszkowane. Ale to NIE to samo. Swipe →', visual: 'Dwie puszki obok siebie: matcha + gyokuro, na cream tle' },
            { headline: '1. Te same kamienne młyny', body: 'Po zbiorze liście schną, a potem trafiają w te same tradycyjne japońskie kamienne młyny. To dlatego oba mają ten intensywny, świetlisty zielony kolor.', visual: 'Foto kamiennego młyna ishiusu, japońska manufaktura' },
            { headline: '2. Inny liść = inny smak', body: 'Matcha = liść tencha (delikatny, lekko słodki). Gyokuro = liść gyokuro z nutą umami i głębszym profilem. To ta różnica która dzieli kawiarki na dwa obozy.', visual: 'Dwa liście obok siebie + ikony "tencha" i "gyokuro"' },
            { headline: '3. Mniej znaczy więcej', body: 'Matcha potrzebuje 2-3g na chawan. Gyokuro Powder — 1.5g wystarczy. Jedna puszka 30g daje 20 porcji. Wystarcza na cały miesiąc codziennego picia.', visual: 'Łyżka miarowa nad chawanem + cyfra "1.5g"' },
            { headline: '4. Niższa woda, więcej smaku', body: 'Matcha lubi 70-80°C. Gyokuro woli chłodniej — 50-70°C. Niższa temperatura wydobywa umami i unika goryczy. Termometr w kuchni? Tak, dziś.', visual: 'Termometr w wodzie + skala temperatury' },
            { headline: 'Pre-sale 12 maja 18:00', body: 'Pierwsze 100 puszek po 69 zł zamiast 79. Premiera 19.05. Wysyłka tego samego dnia. Zapisz się na maila → link w bio.', visual: 'Foto puszki BHT Gyokuro + CTA + countdown "12.05 18:00"' },
          ],
        },
        {
          tytul: 'Skąd pochodzi nasze Gyokuro',
          format: 'IG carousel 5 slajdów (1080×1080)',
          mood: 'Stock photo Japan + minimal text overlay, cream tło, deep green',
          slides: [
            { headline: 'Hattori, Shizuoka', body: 'Małe gospodarstwo na zboczu góry, 320m n.p.m. Mgła z Pacyfiku, zacieniana plantacja. Tutaj rośnie Twoje gyokuro.', visual: 'Stock photo zacienianej plantacji w Japonii' },
            { headline: '21 dni w cieniu', body: 'Trzy tygodnie przed zbiorem liście są zacieniane matami. To wymusza większą produkcję chlorofilu i L-teaniny — stąd umami i głęboki kolor.', visual: 'Maty na plantacji, light filtering' },
            { headline: 'Ręczny zbiór', body: 'Tylko najmłodsze pąki + 2 listki. Po zbiorze blanszowanie parą i suszenie w ciągu 24h żeby zachować enzymy.', visual: 'Ręka zbierająca liście + tradycyjny koszyk' },
            { headline: 'Mielenie na kamieniu', body: 'Ten sam młyn który robi matchę robi gyokuro. 30g zajmuje 1h pracy młyna. Drobny, jedwabisty proszek.', visual: 'Kamienny młyn w ruchu' },
            { headline: '100kg w drodze do Polski', body: 'Zamówienie złożyliśmy w listopadzie. 100 kg = 3300 puszek. Pierwsza taka skala bezpośredniego importu Gyokuro Powder w Polsce.', visual: 'Mapa Japonia → Polska + foto puszki BHT' },
          ],
        },
      ],
      grafiki: [
        {
          format: 'IG Story 5-slajd serial (1080×1920)',
          opis: 'Story 1: zbliżenie liścia gyokuro. Story 2: zacieniana plantacja Hattori (stock JP). Story 3: kamienne młyny. Story 4: gotowy proszek w chawanie. Story 5: "Pre-sale 12.05 — zapisz się na maila".',
          mood: 'Vertical, soft light, japoński mood',
        },
      ],
    },
    20: {
      reels: [
        {
          tytul: 'Kasia unboxing pierwszej puszki Gyokuro',
          kto: 'Kasia (face-to-cam, kuchnia) — opcj. Sasza',
          ujecie: 'Kasia otwiera puszkę BHT 30g Gyokuro Powder, sypie 1.5g do chawanu, ubija chasenem.',
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
          tytul: 'BTS hands-only: pakowanie 20 paczek influencer',
          kto: 'Studio / hands-only (bez twarzy)',
          ujecie: 'Top-down (kamera nad blatem), 20 paczek BHT w rzędach, ręce pakują puszkę Gyokuro + chasen + kartkę z imieniem do każdej. Speed-up x3.',
          tekst: '(brak voiceover, lo-fi/ambient muzyka). Tekst on-screen: "20 wybranych herbaciarek dostaje pierwszą Gyokuro Powder w Polsce — 7 dni przed premierą. Ich kody zniżkowe @influencer1, @influencer2... pojawią się w ich postach.".',
          tagline: 'Influencer seeding 14-15.05',
        },
      ],
      karuzele: [
        {
          tytul: 'Jak parzyć Gyokuro Powder — 4 kroki',
          format: 'IG carousel 5 slajdów (1080×1080)',
          mood: 'Cream tło, kroki 1-2-3-4, foto produktu na każdym slajdzie',
          slides: [
            { headline: 'Jak parzyć Gyokuro Powder', body: '4 kroki, 90 sekund, 1 chawan. Przepis który dostajesz w pudełku, ale tutaj raz jeszcze — bo warto.', visual: 'Foto pełnego chawanu zielonej piany na cream tle' },
            { headline: 'Krok 1: 1.5g proszku', body: 'Łyżka miarowa BHT (jest w pudełku) lub czubata pół-łyżeczka. Mniej niż matcha, ale dużo bardziej skoncentrowane w smaku.', visual: 'Łyżka miarowa nad chawanem' },
            { headline: 'Krok 2: 60ml wody 60°C', body: 'Termometr lub gotowanie + 4 minuty czekania. Niższa temperatura = więcej umami, mniej goryczy. To NIE to samo co matcha.', visual: 'Termometr + woda nad chawanem' },
            { headline: 'Krok 3: Ubij chasenem', body: '15-20 sekund w "M" zigzag. Piana lekka, kremowa, jasnozielona. Jeśli nie masz chasenu — w naszym Premium Gift jest.', visual: 'Ręka z chasenem nad chawanem, piana się tworzy' },
            { headline: 'Krok 4: Pij od razu', body: 'Pij małymi łykami przez 2-3 minuty. Bez cukru, bez mleka — gyokuro to inny rytuał niż matcha latte. Premiera 19.05 — link w bio.', visual: 'Pełen chawan + napis "Premiera 19.05"' },
          ],
        },
      ],
      grafiki: [
        {
          format: 'Email hero (600×300)',
          opis: 'Foto puszki BHT Gyokuro Powder 30g, na cream tle, obok zielona piana w chawanie po ubiciu. Subject: "🍵 Pre-sale Gyokuro Powder otwarty (-13% first 100 puszek)". CTA "Zamów teraz".',
          mood: 'Email-friendly, minimal text, focus na produkt',
        },
        {
          format: 'IG Story countdown 7-dni (1080×1920)',
          opis: '7 storiek codziennie 12-18.05: każda z licznikiem "Pre-sale -7d", "-6d"... + cytat z Mamy/influencerek. Cream tło, zielony akcent.',
          mood: 'Vertical, urgency mood',
        },
      ],
    },
    21: {
      reels: [
        {
          tytul: 'Launch ceremony — Kasia parzy pierwsze',
          kto: 'Kasia (face-to-cam, kuchnia) — opcj. Sasza',
          ujecie: 'Kasia formalnie sypie 1.5g, ubija, pije, milknie. Cisza 3s, potem mówi.',
          tekst: 'Drugi raz w życiu piłam coś takiego. Pierwsze było matcha 18 lat temu. Gyokuro — to inny smak ale dokładnie taki sam moment "WOW". Otwieramy oficjalnie, maj 19. Już dostępne w sklepie. Jeśli kupiliście pre-sale — wysyłka leci dzisiaj.',
          tagline: '19.05 OFICJALNA PREMIERA — w sklepie',
        },
        {
          tytul: 'Screen recording: "Mój 3-pak za 130 zamiast 180"',
          kto: 'Phone screen + ręce (bez twarzy) + voice-over',
          ujecie: 'Pionowe nagranie ekranu telefonu: scrollowanie sklepu BHT, wkładanie 3 puszek do koszyka (Matcha Lattea + Crazy Good + Strawberry Lemonade), aplikacja kuponu WTD2PLUS1, screen z ceną 130 zamiast 180. Voice-over Mamy lub neutralny.',
          tekst: 'Voice-over: "Dzień Herbaty — 3 paczki, najtańsza gratis. Bierzemy: Matcha Lattea, Crazy Good, Strawberry Lemonade. Strawberry najtańsza, czyli za darmo. 180 zł na 130. Klikasz, masz." Tekst on-screen na końcu: "21-25.05 · cały katalog · kupon WTD2PLUS1".',
          tagline: '21-25.05 WTD — 2+1 najtańsza GRATIS',
        },
        {
          tytul: 'IG Live "Parzymy Gyokuro razem"',
          kto: 'Kasia + Sasza (split-screen lub jedno ujęcie) — opcj. influencerka po seedingu',
          ujecie: 'Kuchnia, jeden chawan + zestaw. Kasia parzy live, opowiada, odpowiada na pytania widzów (Sasza może odczytywać pytania z chatu). Opcjonalnie split-screen z influencerką która dostała seeding 14.05 i też parzy u siebie.',
          tekst: 'Scenariusz Q&A: jak parzyć / jaka temperatura / vs matcha / czy mogę pić wieczorem / dla kogo. Kasia prowadzi 30 min (Sasza wspiera od strony chatu). Plus link do sklepu w opisie + przyklejony comment z kuponem.',
          tagline: '21.05 11:00 IG Live z Mamą',
        },
      ],
      karuzele: [
        {
          tytul: 'Twoje 3 paki na Dzień Herbaty (2+1)',
          format: 'IG carousel 6 slajdów (1080×1080)',
          mood: 'Kolorowe, każdy slajd inna paleta zgodnie z heroes, czytelne ceny',
          slides: [
            { headline: 'Dzień Herbaty 21 maja', body: '2+1 najtańsza GRATIS na cały katalog. Wybierz 3 dowolne, najtańsza schodzi z koszyka. Aktywne 21-25.05 23:59.', visual: 'Foto 3 puszek różnych kolorów, układ trójkąt' },
            { headline: 'Pak "Matcha codziennie"', body: 'Matcha Lattea + Matcha Crazy Good + Matcha Strawberry Lemonade. Wartość 180 zł — płacisz 130. Strawberry najtańsza idzie GRATIS.', visual: 'Trzy puszki matcha + cena przekreślona 180 → 130' },
            { headline: 'Pak "Owocowo na lato"', body: 'Strawberry Lemonade + Caramel Pear + Mojito Tea. Wartość 145 zł — płacisz 100. Mojito najtańsze GRATIS.', visual: 'Trzy puszki owocowe + cena 145 → 100' },
            { headline: 'Pak "Pierwsze gyokuro"', body: 'Gyokuro Powder + Matcha Lattea + Spring Tea. Wartość 195 zł — płacisz 140. Spring Tea najtańsza GRATIS — premium tester.', visual: 'Trzy puszki + Gyokuro w środku + cena 195 → 140' },
            { headline: 'Pak "Prezent dla mamy"', body: 'Gyokuro + Lattea + Caramel Pear. Wartość 200 zł — płacisz 145. Pakowanie prezentowe za darmo do każdego pakietu Mother\'s Day.', visual: 'Trzy puszki ze wstążką + cena 200 → 145' },
            { headline: 'Wybierz swoje 3', body: 'Cały katalog dostępny — nie ma wykluczeń. Aktywne 5 dni do 25.05 23:59. Po przeklik linka kod aktywuje się sam. Link w bio.', visual: 'Smartfon ze sklepem BHT + CTA "Zacznij koszyk"' },
          ],
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
          opis: 'Kasia trzyma puszkę gyokuro w jednej ręce, chawan w drugiej, hasło "19.05 — w sklepie".',
        },
      ],
    },
    22: {
      reels: [
        {
          tytul: 'UGC compilation: "Co kupujący napisali o Gyokuro"',
          kto: 'Edycja screenshotów DM + influencer reposts (zewnętrzne twarze)',
          ujecie: '15-20 sekund: szybkie cuts (po 0.8s) ze screenshotów DM/komentarzy + 2-3 ujęć z reelsów influencerek z seedingu (14.05) parzących gyokuro u siebie. Voice-over na końcu zaprasza do bundle.',
          tekst: 'Tekst on-screen w trakcie cuts: "Pierwszy łyk i milczenie — @ola..." / "Smakuje jak rosół z kwiatami — @kasia..." / "Dziękuję za pierwszy raz — @marta..." / "Mama napisała że jej życie się zmieniło — @ania". Voice-over (Kasia, ostatnie 4s): "Mama która zna matchę zasługuje na coś więcej. Premium Gift 250 zł — Gyokuro + Lattea + chasen, w pakowaniu prezentowym. Zamów do 24 maja."',
          tagline: 'Premium Gift dla Mamy 250 zł · zamów do 24.05',
        },
        {
          tytul: 'Kasia: "Last call 2+1"',
          kto: 'Kasia (face-to-cam) — opcj. Sasza',
          ujecie: 'Kasia trzyma 3 paczki: Matcha Lattea, Crazy Good, Caramel Pear.',
          tekst: 'Ostatnie 24 godziny Dnia Herbaty. Trzy dowolne paczki, najtańsza za darmo. Jutro o 18 wracamy do normalnych cen. Jeśli czekałaś na refill — to teraz.',
          tagline: '⏳ 25.05 do 23:59 ostatnie godziny 2+1',
        },
      ],
      karuzele: [
        {
          tytul: 'Premium Gift dla Mamy — co w środku',
          format: 'IG carousel 5 slajdów (1080×1080)',
          mood: 'Pastel pink + cream + deep green, rustykalne, kwiaty wiśni w tle',
          slides: [
            { headline: 'Premium Gift dla Mamy', body: 'Mama która zna matchę zasługuje na coś więcej. Bundle 250 zł — w środku trzy rzeczy które uczynią jej poranki lepszymi.', visual: 'Bundle BHT na drewnianym blacie, wstążka, kwiat wiśni' },
            { headline: '1. Gyokuro Powder 30g', body: 'Pierwsza taka w Polsce. Łagodniejsza od matchy, bardziej umami, niższa kofeina (~30mg/szklanka). Idealne dla mamy która chce spokojnego rytuału.', visual: 'Puszka Gyokuro + chawan' },
            { headline: '2. Matcha Lattea 50g', body: 'Klasyk BHT — matcha gotowa do latte z mlekiem owsianym. Mama która już zna matchę — pije to codziennie. Sprawdzone.', visual: 'Puszka Matcha Lattea + szklanka latte' },
            { headline: '3. Chasen bambusowy', body: 'Tradycyjny japoński trzepaczek. Bez niego matcha jest "płaska". Mama nauczy się ubijać w 5 minut, używać będzie codziennie.', visual: 'Chasen na białym blacie, zbliżenie' },
            { headline: 'Pakowanie + kartka', body: 'Bezpłatne pakowanie prezentowe + kartka z Twoim tekstem. Zamów do 24.05 wieczorem — InPost dostarczy do paczkomatu na czas Dnia Matki 26.05.', visual: 'Pełne pakowanie ze wstążką + ręka z kartką' },
          ],
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
          opis: 'Foto Kasia + Sasza + Mia obok bundle, cream tło, hasło "Mamie której nic nie brakuje".',
        },
      ],
    },
  };

  const wkData = concreteByWeek[w] || { reels: [], grafiki: [], karuzele: [] };
  if (reels.length === 0) reels = wkData.reels || [];
  grafiki = wkData.grafiki || [];
  karuzele = wkData.karuzele || [];

  // Maile pasujące do tygodnia
  const weekStart = week._startDay || (week.start_date ? parseInt(week.start_date.slice(8)) : 1);
  const weekEnd = week._endDay || (week.end_date ? parseInt(week.end_date.slice(8)) : 31);
  const maile = allEmails.filter((e: any) => e.day >= weekStart && e.day <= weekEnd);

  // Sklep zadania (z week.store_tasks)
  const sklepZadania = Array.isArray(week.store_tasks) ? week.store_tasks.slice(0, 3) : [];

  // Promo
  const promo = (week.promo && week.promo.type && week.promo.type !== 'none') ? week.promo : null;

  // Dzień po dniu — Pon-Niedz timeline z konkretami
  // Każdy item: { kind: 'publish'|'send'|'prep'|'live'|'decision', who: string, what: string, time?: string }
  const dailyByWeek: Record<number, any[]> = {
    18: [
      { day: 'Pon', date: '27.04', items: [
        { kind: 'prep', who: 'Tekst', what: 'Tekst do reela "Kasia parzy spring tea" i pierwszy mail teaser na czwartek' },
        { kind: 'prep', who: 'Sklep', what: 'Hero banner w sklepie zmieniamy na Spring Tea — komunikat o herbacie na majówkowy weekend' },
        { kind: 'prep', who: 'Reklamy', what: 'Stawiamy kampanię brand awareness Spring Tea na Mecie — ok. 600 zł dziennie' },
      ]},
      { day: 'Wt', date: '28.04', items: [
        { kind: 'prep', who: 'Grafika', what: 'Karuzela "5 sposobów na Spring Tea" — pierwsze 3 slajdy (cover, cytryna, mięta)' },
        { kind: 'prep', who: 'Kasia', what: 'Kasia nagrywa Spring Tea na balkonie — wystarczy 15 minut, Sasza za kamerą' },
      ]},
      { day: 'Śr', date: '29.04', items: [
        { kind: 'prep', who: 'Grafika', what: 'Kończymy karuzelę "5 sposobów" — slajdy 4-6 i finalna obróbka' },
        { kind: 'prep', who: 'Studio', what: 'Studio nagrywa ASMR pakowania — top-down kamera, ręce w kadrze, lo-fi muzyka' },
      ]},
      { day: 'Czw', date: '30.04', items: [
        { kind: 'publish', who: 'Kasia', what: 'Reel "Kasia parzy spring tea" idzie na IG i TikTok' },
        { kind: 'prep', who: 'Grafika', what: 'Seria 4 storiek — poranek, dzień, wieczór, na końcu CTA' },
      ]},
      { day: 'Pt', date: '01.05', items: [
        { kind: 'publish', who: 'Grafika', what: 'Karuzela "5 sposobów na majówkę" idzie na IG' },
        { kind: 'prep', who: 'Sklep', what: 'Sprawdzamy stan magazynowy Spring Tea — weekend może odpalić sprzedaż' },
      ]},
      { day: 'Sob', date: '02.05', items: [
        { kind: 'publish', who: 'Studio', what: 'ASMR pakowania leci z plana (scheduled)' },
      ]},
      { day: 'Niedz', date: '03.05', items: [
        { kind: 'publish', who: 'Grafika', what: 'Seria storiek leci z plana — lifestyle mood' },
      ]},
    ],
    19: [
      { day: 'Pon', date: '04.05', items: [
        { kind: 'prep', who: 'Tekst', what: 'Tekst do reela "Co to gyokuro?" i wszystkie 6 slajdów karuzeli (headline + body do każdego)' },
        { kind: 'decision', who: 'Decyzje (Michał)', what: 'Michał potwierdza: cena pre-sale 69 zł, limit 100 puszek, start 12 maja o 18:00' },
        { kind: 'prep', who: 'Sklep', what: 'Pierwszy draft strony Gyokuro w sklepie — z gotowego briefu' },
      ]},
      { day: 'Wt', date: '05.05', items: [
        { kind: 'prep', who: 'Grafika', what: 'Karuzela "Gyokuro vs Matcha — 5 różnic" — projekt 6 slajdów' },
        { kind: 'prep', who: 'Kasia', what: 'Kasia nagrywa edukacyjny reel "Co to gyokuro?" w kuchni — 10 minut, dwie puszki w rękach' },
      ]},
      { day: 'Śr', date: '06.05', items: [
        { kind: 'publish', who: 'Kasia', what: 'Reel "Kasia: Co to gyokuro?" idzie na IG i TikTok' },
        { kind: 'prep', who: 'Studio', what: 'W studio macro b-roll w slow-mo: liść, młyn (ze stocku JP), proszek, woda 60°C, chasen, piana — ok. 3h pracy' },
      ]},
      { day: 'Czw', date: '07.05', items: [
        { kind: 'publish', who: 'Grafika', what: 'Karuzela "Gyokuro vs Matcha — 5 różnic" idzie na IG' },
        { kind: 'prep', who: 'Tekst', what: 'Tekst maila teaser na piątek 18:00 — subject "Coś nowego nadchodzi 12 maja"' },
      ]},
      { day: 'Pt', date: '08.05', items: [
        { kind: 'publish', who: 'Studio', what: 'Macro b-roll "Skąd to zielone" idzie na IG i TikTok' },
        { kind: 'send', who: 'Sklep', what: '18:00 mailing teaser leci do całej bazy (~5000 osób)', time: '18:00' },
        { kind: 'decision', who: 'Influencerzy', what: 'Zamykamy listę 20 herbaciarek do paczek influencer — research IG i TikToka' },
      ]},
      { day: 'Sob', date: '09.05', items: [
        { kind: 'prep', who: 'Grafika', what: '7 storiek countdown na 12-18 maja — "Pre-sale -7d, -6d..."' },
        { kind: 'prep', who: 'Sklep', what: 'Strona Gyokuro w sklepie — finalne sprawdzenie grafik, opisów i instrukcji parzenia' },
      ]},
      { day: 'Niedz', date: '10.05', items: [
        { kind: 'publish', who: 'Grafika', what: 'Pierwsza story countdown "Pre-sale -2d" leci z plana' },
        { kind: 'prep', who: 'Sklep', what: 'Test pre-sale: kupon GYOKURO69 działa, limit 100 sztuk się trzyma, strona OK na telefonie' },
      ]},
    ],
    20: [
      { day: 'Pon', date: '11.05', items: [
        { kind: 'publish', who: 'Grafika', what: 'Story countdown "-1d do pre-sale" leci z plana' },
        { kind: 'decision', who: 'Decyzje (Michał)', what: 'Michał ostatnie sprawdzenie: cena 69 zł, limit 100, kupon GYOKURO69 włącza się jutro o 18:00' },
        { kind: 'prep', who: 'Reklamy', what: 'Kampania pre-sale na Mecie gotowa — start zaplanowany na jutro o 18:01' },
      ]},
      { day: 'Wt', date: '12.05', items: [
        { kind: 'live', who: 'Sklep', what: '18:00 ruszamy pre-sale Gyokuro w sklepie — kupon GYOKURO69 aktywny', time: '18:00' },
        { kind: 'send', who: 'Sklep', what: '18:00 mailing "Pre-sale start" do całej bazy', time: '18:00' },
        { kind: 'publish', who: 'Kasia', what: 'Reel "Kasia unboxing pierwszej puszki Gyokuro" idzie na IG i TikTok' },
        { kind: 'live', who: 'Reklamy', what: 'Kampania pre-sale na Mecie wystartowała — ok. 800 zł dziennie, retargeting plus lookalike' },
      ]},
      { day: 'Śr', date: '13.05', items: [
        { kind: 'publish', who: 'Grafika', what: 'Story countdown "-5 dni do końca pre-sale" leci z plana' },
        { kind: 'prep', who: 'Mia', what: 'Mia nagrywa POV "early access do Gyokuro" — to jej jedyny reel w tym miesiącu, Gen-Z relatable' },
      ]},
      { day: 'Czw', date: '14.05', items: [
        { kind: 'publish', who: 'Mia', what: 'Reel Mii idzie na IG i TikTok, plus screenshot z mailingu' },
        { kind: 'prep', who: 'Influencerzy', what: 'Wysyłamy 20 paczek do herbaciarek — Gyokuro 30g, chasen i kartka z imieniem każdej' },
        { kind: 'prep', who: 'Grafika', what: 'Karuzela "Jak parzyć Gyokuro w 4 krokach" — projekt' },
      ]},
      { day: 'Pt', date: '15.05', items: [
        { kind: 'publish', who: 'Studio', what: 'BTS "pakowanie 20 paczek influencer" idzie na IG i TikTok (top-down, ASMR)' },
        { kind: 'publish', who: 'Grafika', what: 'Karuzela "Jak parzyć Gyokuro" idzie na IG' },
        { kind: 'prep', who: 'Reklamy', what: 'Aktualizacja kampanii — retargeting na każdego kto wszedł na stronę Gyokuro' },
      ]},
      { day: 'Sob', date: '16.05', items: [
        { kind: 'send', who: 'Sklep', what: '11:00 mailing "Pre-sale reminder — ostatni weekend"', time: '11:00' },
        { kind: 'decision', who: 'Decyzje (Michał)', what: 'Michał sprawdza ile zostało puszek po 69 zł — jeśli mniej niż 30, dorzucamy story z licznikiem' },
      ]},
      { day: 'Niedz', date: '17.05', items: [
        { kind: 'prep', who: 'Sklep', what: 'Przygotowujemy premiera-wtorek 19.05 — banner hero w sklepie i kolejka wysyłek pre-sale' },
        { kind: 'prep', who: 'Grafika', what: 'Banner hero "19.05 — pierwsza Gyokuro Powder w Polsce" do sklepu' },
      ]},
    ],
    21: [
      { day: 'Pon', date: '18.05', items: [
        { kind: 'live', who: 'Sklep', what: '23:59 pre-sale się zamyka — kupon GYOKURO69 przestaje działać', time: '23:59' },
        { kind: 'prep', who: 'Reklamy', what: 'Wyłączamy kampanię pre-sale, włączamy kampanię premierową (od jutra)' },
        { kind: 'prep', who: 'Tekst', what: 'Tekst maila launch — subject "🍵 Japan Gyokuro Powder oficjalnie w sklepie"' },
      ]},
      { day: 'Wt', date: '19.05', items: [
        { kind: 'live', who: 'Sklep', what: '10:00 Gyokuro oficjalnie idzie do sklepu — dla wszystkich, nie tylko pre-sale', time: '10:00' },
        { kind: 'send', who: 'Sklep', what: '10:00 mailing "Launch" do całej bazy', time: '10:00' },
        { kind: 'publish', who: 'Kasia', what: 'Reel "Launch ceremony — Kasia parzy pierwsze" idzie na IG i TikTok' },
        { kind: 'prep', who: 'Sklep', what: 'Wysyłamy 100 paczek pre-sale — priorytet, dziś i jutro' },
      ]},
      { day: 'Śr', date: '20.05', items: [
        { kind: 'live', who: 'Reklamy', what: 'Kampania premierowa Gyokuro startuje — retargeting plus lookalike, ok. 1000 zł dziennie' },
        { kind: 'prep', who: 'Tekst', what: 'Tekst maila na Dzień Herbaty — subject "Dzień Herbaty: 3 paczki, najtańsza GRATIS"' },
      ]},
      { day: 'Czw', date: '21.05', items: [
        { kind: 'send', who: 'Sklep', what: '09:00 mailing "Dzień Herbaty 2+1" do całej bazy', time: '09:00' },
        { kind: 'live', who: 'Sklep', what: '11:00 włączamy promo 2+1 — kupon WTD2PLUS1, działa do 25.05 23:59', time: '11:00' },
        { kind: 'live', who: 'Kasia', what: '11:00 IG Live "Parzymy Gyokuro razem" — Kasia prowadzi, Sasza pilnuje chatu, ok. 30 min Q&A. Opcjonalnie split-screen z jedną z herbaciarek po seedingu', time: '11:00' },
        { kind: 'publish', who: 'Studio', what: 'Screen recording "3-pak za 130 zł zamiast 180" idzie na IG i TikTok — telefon w kadrze, voice-over Kasi' },
      ]},
      { day: 'Pt', date: '22.05', items: [
        { kind: 'publish', who: 'Grafika', what: 'Karuzela "Twoje 3-paki na Dzień Herbaty" idzie na IG' },
        { kind: 'live', who: 'Reklamy', what: 'Kampania 2+1 na WTD startuje — Meta plus ewentualnie Google Search ("world tea day promocja")' },
      ]},
      { day: 'Sob', date: '23.05', items: [
        { kind: 'publish', who: 'Sklep', what: 'Story z liczbą zamówień — "Już 200 koszyków w 3 dni"' },
        { kind: 'prep', who: 'Influencerzy', what: 'Repostujemy posty 20 herbaciarek z seedingu — story i grid' },
      ]},
      { day: 'Niedz', date: '24.05', items: [
        { kind: 'send', who: 'Sklep', what: '11:00 mailing "Premium Gift dla Mamy" do całej bazy', time: '11:00' },
        { kind: 'send', who: 'Sklep', what: '18:00 mailing "Last call 2+1 — promocja kończy się o północy"', time: '18:00' },
        { kind: 'publish', who: 'Studio', what: 'UGC compilation "Co kupujący napisali o Gyokuro" idzie na IG i TikTok — screenshoty DM, posty herbaciarek, voice-over Kasi' },
        { kind: 'prep', who: 'Grafika', what: 'Banner Mother\'s Day do sklepu — włącza się jutro rano' },
      ]},
    ],
    22: [
      { day: 'Pon', date: '25.05', items: [
        { kind: 'live', who: 'Sklep', what: '23:59 promo 2+1 się kończy — kupon WTD2PLUS1 przestaje działać', time: '23:59' },
        { kind: 'prep', who: 'Reklamy', what: 'Wyłączamy kampanię WTD 2+1, włączamy kampanię Premium Gift dla Mamy' },
        { kind: 'publish', who: 'Grafika', what: 'Banner Mother\'s Day idzie do sklepu i jako IG hero' },
      ]},
      { day: 'Wt', date: '26.05', items: [
        { kind: 'live', who: 'Sklep', what: 'Dzień Matki — bundle Premium Gift 250 zł na froncie sklepu' },
        { kind: 'live', who: 'Reklamy', what: 'Kampania Premium Gift na Mecie startuje — ok. 600 zł dziennie, do dziś wieczora' },
        { kind: 'prep', who: 'Kasia', what: 'Kasia nagrywa krótki reel "Last call 2+1" — kuchnia, 5 minut roboty' },
      ]},
      { day: 'Śr', date: '27.05', items: [
        { kind: 'publish', who: 'Kasia', what: 'Reel Kasi "Last call 2+1 wczoraj" idzie na IG i TikTok' },
        { kind: 'prep', who: 'Tekst', what: 'Tekst maila "Last chance Gyokuro w maju" na czwartek' },
      ]},
      { day: 'Czw', date: '28.05', items: [
        { kind: 'send', who: 'Sklep', what: '11:00 mailing "Gyokuro w maju — jeszcze 3 dni"', time: '11:00' },
        { kind: 'publish', who: 'Kasia', what: 'Reel Kasi "Last chance Gyokuro" idzie na IG i TikTok' },
      ]},
      { day: 'Pt', date: '29.05', items: [
        { kind: 'live', who: 'Reklamy', what: 'Final push Gyokuro w kampaniach — 3 ostatnie dni maja, kreacje z urgency' },
        { kind: 'prep', who: 'Sklep', what: 'Przygotowanie czerwca — jakie premiery (Czarne Sencha?), banery do sklepu, plan promocji' },
      ]},
      { day: 'Sob', date: '30.05', items: [
        { kind: 'decision', who: 'Decyzje (Michał)', what: 'Michał patrzy na KPI maja — sprzedaż netto, średni koszyk, ROAS reklam, ile schodzi pre-sale Gyokuro' },
        { kind: 'prep', who: 'Tekst', what: 'Wstępny szkielet planu na czerwiec — 3 priorytety na początek' },
      ]},
      { day: 'Niedz', date: '31.05', items: [
        { kind: 'live', who: 'Kasia', what: 'IG Live "Co było w maju" — Kasia z Saszą, krótkie podsumowanie miesiąca i zapowiedź czerwca (15 min)' },
        { kind: 'decision', who: 'Decyzje (Michał)', what: 'Michał decyduje czy zamawiamy kolejną partię Gyokuro — jeśli zostało mniej niż 30%, składamy order' },
      ]},
    ],
  };

  const daily = dailyByWeek[w] || [];

  return { reels, grafiki, karuzele, maile, sklepZadania, promo, daily };
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
          .karuzela-card { break-inside: avoid; }
          .slide-card { break-inside: avoid; }
          .day-row { break-inside: avoid; }
        }
      `}</style>
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', gap: 8, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => window.print()} style={{ background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>🖨 Drukuj A4</button>
        <button onClick={() => window.close()} style={{ background: '#f1f5f9', color: '#64748b', padding: '8px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>✕ Zamknij</button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, color: '#64748b' }}>Każdy tydzień = osobna strona PDF</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>Prosty plan na {PL_MONTH[m]} {y}</h1>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Cel: <strong style={{ color: '#dc2626' }}>70 000 zł netto</strong>. Per tydzień: o czym, co nagrać, co zaprojektować, co napisać, co wysłać, co w sklepie.</p>

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

            {/* DZIEŃ PO DNIU — Pon-Niedz */}
            {Array.isArray(c.daily) && c.daily.length > 0 && (
              <div className="daily-block" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)', border: `2px solid ${accent}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>📅 DZIEŃ PO DNIU — co kto robi i kiedy</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {c.daily.map((d: any, di: number) => {
                    const isWeekend = d.day === 'Sob' || d.day === 'Niedz';
                    return (
                      <div key={di} className="day-row" style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 10, padding: '6px 8px', background: isWeekend ? '#fef3c7' : '#fff', border: `1px solid ${isWeekend ? '#fde68a' : '#e2e8f0'}`, borderRadius: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isWeekend ? '#92400e' : accent, textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'start', paddingTop: 2 }}>
                          {d.day}<br/><span style={{ fontSize: 10, fontWeight: 600, opacity: 0.75 }}>{d.date}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {(d.items || []).map((it: any, ii: number) => {
                            const kindLabel: Record<string, string> = {
                              publish: '📢 PUBLIKUJ',
                              send: '📤 WYŚLIJ',
                              live: '🔴 GO LIVE',
                              prep: '🔧 Przygotuj',
                              decision: '🎯 Decyzja',
                            };
                            const kindColor: Record<string, string> = {
                              publish: '#dc2626',
                              send: '#0891b2',
                              live: '#dc2626',
                              prep: '#64748b',
                              decision: '#7c3aed',
                            };
                            const lbl = kindLabel[it.kind] || it.kind;
                            const col = kindColor[it.kind] || '#64748b';
                            return (
                              <div key={ii} style={{ fontSize: 11.5, lineHeight: 1.45, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                                <span style={{ background: col, color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{lbl}</span>
                                {it.time && <span style={{ background: '#1e293b', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 9.5, fontWeight: 700 }}>⏰ {it.time}</span>}
                                <span style={{ background: '#f1f5f9', color: '#1e293b', padding: '1px 5px', borderRadius: 3, fontSize: 9.5, fontWeight: 700 }}>{it.who}</span>
                                <span style={{ color: '#1e293b' }}>{it.what}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                  Legenda ról: Tekst (copy), Grafika (design statyków/karuzel), Sklep (Woo/strona/promo/wysyłka maili), Reklamy (Meta/Google ads), Kasia (główna twarz sklepu, face-to-cam autorytet), Mia (POV Gen-Z — tylko 1× w maju, W20 early access), Sasza (alternatywna twarz/voice-over, BTS, wsparcie Kasi), Studio (hands-only ASMR/macro b-roll/screen recordings/UGC compilation — bez twarzy), Influencerzy (outreach + seeding), Decyzje (Michał).
                </div>
              </div>
            )}

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

            {/* Karuzele — z copy per slajd */}
            {c.karuzele.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>🎠 Karuzele z copy ({c.karuzele.length})</h3>
                {c.karuzele.map((k: any, ki: number) => (
                  <div key={ki} className="karuzela-card" style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#9a3412' }}>{ki + 1}. {k.tytul}</div>
                    <div style={{ fontSize: 11, color: '#9a3412', marginTop: 2, fontStyle: 'italic' }}>{k.format}</div>
                    {k.mood && <div style={{ fontSize: 11, color: '#c2410c', marginTop: 2, fontStyle: 'italic' }}>Mood: {k.mood}</div>}
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(k.slides || []).map((s: any, si: number) => (
                        <div key={si} className="slide-card" style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 6, padding: 10, display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fb923c', color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{si + 1}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#7c2d12', lineHeight: 1.3 }}>📝 {s.headline}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: '#1e293b', lineHeight: 1.5, background: '#fef3c7', padding: '4px 8px', borderRadius: 3 }}>{s.body}</div>
                            {s.visual && <div style={{ marginTop: 4, fontSize: 11, color: '#9a3412', fontStyle: 'italic' }}>🖼 Wizual: {s.visual}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grafiki (statyki, story, banery) */}
            {c.grafiki.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>🎨 Grafiki / statyki ({c.grafiki.length})</h3>
                {c.grafiki.map((g: any, gi: number) => (
                  <div key={gi} style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>{gi + 1}. {g.format}</div>
                    <div style={{ marginTop: 6, color: '#78350f' }}>{g.opis}</div>
                    {g.mood && <div style={{ marginTop: 4, fontSize: 11, color: '#a16207', fontStyle: 'italic' }}>Mood: {g.mood}</div>}
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
