# BHT Marketing Planner

Nowoczesny planista marketingowy dla marki Brown House & Tea. Aplikacja wspiera zarządzanie kampaniami marketingowymi, harmonogramem postów, budżetem oraz śledzeniem KPI na wszystkich głównych kanałach marketingowych.

[English version](#english-version)

---

## Stos technologiczny

- **Next.js 15** - Framework React z App Router
- **Turso (LibSQL)** - Eżdatowa baza danych SQL
- **Drizzle ORM** - Type-safe ORM dla Node.js
- **Tailwind CSS v4** - Utility-first CSS framework
- **Recharts** - Biblioteka do wizualizacji danych
- **Vercel** - Platforma wdrażania aplikacji

## Funkcje

- **Kalendarz marketingowy** - Wizualny harmonogram zadań i postów
- **Zarządzanie kampaniami** - Tworzenie, edycja i śledzenie kampanii marketingowych
- **Kanały marketingowe** - Obsługa wielu kanałów (Instagram, Facebook, TikTok, Pinterest, Email, SEO, Google Ads)
- **Zarządzanie budżetem** - Planowanie i śledzenie wydatków marketingowych z wykresami
- **KPI i wskaźniki wydajności** - Monitorowanie metryk takich jak reach, engagement, conversions
- **Raporty i analityka** - Wgląd w wydajność kampanii i kanałów
- **System zadań** - Przypisywanie zadań z priorytetami i terminami

## Szybki start

### Wymagania wstępne

- Node.js 18+ (zalecane 20.x)
- npm lub yarn
- Konto na Turso (https://turso.tech)
- Konto na Vercel (do deploymentu - opcjonalne)

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/YOUR_USERNAME/bht-marketing-planner.git
cd bht-marketing-planner
npm install
```

### 2. Konfiguracja Turso

#### a) Instalacja CLI Turso

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Lub jeśli używasz macOS z Homebrew:
```bash
brew install tursodatabase/tap/turso
```

#### b) Zalogowanie się

```bash
turso auth login
```

Polecenie otworzy przeglądarkę z procesem logowania. Postępuj zgodnie z instrukcjami na ekranie.

#### c) Tworzenie bazy danych

```bash
turso db create bht-marketing-planner
```

#### d) Pobranie adresu URL bazy danych

```bash
turso db show bht-marketing-planner --url
```

Skopiuj wyświetlony URL - będzie potrzebny do konfiguracji.

#### e) Tworzenie tokenu autentykacyjnego

```bash
turso db tokens create bht-marketing-planner
```

Skopiuj wygenerowany token - będzie potrzebny do konfiguracji.

### 3. Konfiguracja zmiennych środowiska

Skopiuj plik `.env.local.example` do `.env.local`:

```bash
cp .env.local.example .env.local
```

Otwórz `.env.local` i wypełnij zmienne:

```env
TURSO_DATABASE_URL=libsql://YOUR_DB_URL
TURSO_AUTH_TOKEN=YOUR_TOKEN
```

Zastąp `YOUR_DB_URL` i `YOUR_TOKEN` wartościami uzyskanymi w poprzednich krokach.

### 4. Migracja bazy danych

Drizzle ORM będzie automatycznie zarządzać schematem bazy danych. Aby zsynchronizować schemat lokalnie, uruchom:

```bash
npm run db:push
```

Jeśli potrzebujesz wygenerować nowe migracje (po zmianach w schemacie):

```bash
npm run db:generate
```

### 5. Uruchomienie aplikacji lokalnie

```bash
npm run dev
```

Aplikacja dostępna będzie na `http://localhost:3000`.

### 6. Budowanie dla produkcji

```bash
npm run build
npm run start
```

## Wdrażanie na Vercel

### Opcja 1: Automatyczne wdrażanie przez GitHub

1. **Wypchnij kod na GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/bht-marketing-planner.git
   git branch -M main
   git push -u origin main
   ```

2. **Połącz repozytorium w Vercel**
   - Przejdź na https://vercel.com
   - Zaloguj się na konto
   - Kliknij "New Project"
   - Wybierz swoje repozytorium
   - Vercel automatycznie wykryje Next.js

3. **Dodaj zmienne środowiska**
   - W sekcji "Environment Variables" dodaj:
     - `TURSO_DATABASE_URL` - URL bazy danych Turso
     - `TURSO_AUTH_TOKEN` - Token autentykacyjny Turso

4. **Wdrażaj**
   - Kliknij "Deploy"
   - Czekaj na ukończenie wdrażania

### Opcja 2: Ręczne wdrażanie

1. Instalacja Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Wdrażanie:
   ```bash
   vercel
   ```

3. Podaj wymagane zmienne środowiska gdy zostaniesz poproszony.

## Struktura projektu

```
bht-marketing-planner/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── campaigns/     # Campaign endpoints
│   │   │   └── tasks/         # Task endpoints
│   │   ├── (dashboard)/       # Dashboard pages
│   │   │   ├── calendar/      # Strona kalendarza
│   │   │   ├── campaigns/     # Strona kampanii
│   │   │   ├── channels/      # Strona kanałów
│   │   │   ├── budget/        # Strona budżetu
│   │   │   ├── kpi/           # Strona KPI
│   │   │   ├── reports/       # Strona raportów
│   │   │   └── layout.tsx     # Dashboard layout
│   │   ├── page.tsx           # Strona główna
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/                # Komponenty UI
│   │   ├── calendar/          # Komponenty kalendarza
│   │   ├── campaigns/         # Komponenty kampanii
│   │   ├── budget/            # Komponenty budżetu
│   │   ├── kpi/               # Komponenty KPI
│   │   └── reports/           # Komponenty raportów
│   ├── db/                    # Konfiguracja bazy danych
│   │   ├── schema.ts          # Drizzle schemat
│   │   └── index.ts           # Klient bazy danych
│   └── lib/                   # Utility functions
│
├── public/                    # Pliki statyczne
├── package.json              # Zależności projektu
├── tsconfig.json             # Konfiguracja TypeScript
├── next.config.ts            # Konfiguracja Next.js
├── drizzle.config.ts         # Konfiguracja Drizzle ORM
├── vercel.json               # Konfiguracja wdrażania Vercel
├── tailwind.config.ts        # Konfiguracja Tailwind CSS
└── README.md                 # Ten plik
```

## Modele danych

### Channels (Kanały)
Reprezentują kanały marketingowe (Instagram, Facebook, TikTok, itd.)
- `id` - Unikalny identyfikator
- `name` - Nazwa kanału
- `color` - Kolor w formacie hex
- `icon` - Identyfikator ikony

### Campaigns (Kampanie)
Kampanie marketingowe przypisane do kanałów
- `id` - Unikalny identyfikator
- `name` - Nazwa kampanii
- `description` - Opis
- `channel_id` - Przypisany kanał
- `status` - Status (draft, active, completed, paused)
- `start_date` - Data rozpoczęcia
- `end_date` - Data zakończenia
- `budget_planned` - Planowany budżet
- `budget_spent` - Wydatkowany budżet

### Tasks (Zadania)
Indywidualne zadania w ramach kampanii
- `id` - Unikalny identyfikator
- `campaign_id` - Przypisana kampania
- `channel_id` - Przypisany kanał
- `title` - Tytuł zadania
- `description` - Opis
- `status` - Status (todo, in_progress, done)
- `priority` - Priorytet (low, medium, high)
- `scheduled_date` - Data zaplanowania
- `completed_at` - Data ukończenia

### Budget Entries (Wpisy budżetu)
Śledzenie budżetu według miesiąca i kategorii
- `id` - Unikalny identyfikator
- `campaign_id` - Przypisana kampania
- `channel_id` - Przypisany kanał
- `month` - Miesiąc (format YYYY-MM)
- `planned_amount` - Kwota planowana
- `actual_amount` - Kwota faktyczna
- `category` - Kategoria (content, ads, tools, influencers, other)

### KPI Entries (Wpisy KPI)
Metyki wydajności kampanii
- `id` - Unikalny identyfikator
- `channel_id` - Przypisany kanał
- `campaign_id` - Przypisana kampania (opcjonalne)
- `date` - Data pomiaru
- `metric_name` - Nazwa metryki (followers, engagement_rate, reach, impressions, clicks, conversions, open_rate, ctr, revenue)
- `metric_value` - Wartość metryki

## API Endpoints

### Kampanie

**GET `/api/campaigns`**
- Pobiera listę wszystkich kampanii
- Query parameters: `status`, `channel_id`

**POST `/api/campaigns`**
- Tworzy nową kampanię
- Body: `{ name, description, channel_id, start_date?, end_date?, budget_planned? }`

**GET `/api/campaigns/:id`**
- Pobiera szczegóły kampanii

**PUT `/api/campaigns/:id`**
- Aktualizuje kampanię
- Body: `{ name?, description?, status?, start_date?, end_date?, budget_planned? }`

**DELETE `/api/campaigns/:id`**
- Usuwa kampanię

### Zadania

**GET `/api/tasks`**
- Pobiera listę wszystkich zadań
- Query parameters: `status`, `priority`, `campaign_id`, `channel_id`

**POST `/api/tasks`**
- Tworzy nowe zadanie
- Body: `{ campaign_id, channel_id, title, description?, status?, priority?, scheduled_date? }`

**GET `/api/tasks/:id`**
- Pobiera szczegóły zadania

**PUT `/api/tasks/:id`**
- Aktualizuje zadanie
- Body: `{ title?, description?, status?, priority?, scheduled_date?, completed_at? }`

**DELETE `/api/tasks/:id`**
- Usuwa zadanie

## Zmienne środowiska

| Zmienna | Opis | Wymagana |
|---------|------|----------|
| `TURSO_DATABASE_URL` | Adres URL bazy danych Turso w formacie libsql:// | Tak |
| `TURSO_AUTH_TOKEN` | Token autentykacyjny do Turso | Tak |

## Zaawansowana konfiguracja

### Drizzle ORM

Konfiguracja znajduje się w pliku `drizzle.config.ts`. Obsługiwane operacje:

```bash
# Wygeneruj migracje na podstawie zmian schematu
npm run db:generate

# Przeprowadź migracje
npm run db:migrate

# Prześlij schemat do bazy (dev mode)
npm run db:push
```

### TypeScript

Projekt wykorzystuje TypeScript dla bezpieczeństwa typów. Konfiguracja w `tsconfig.json`.

### Tailwind CSS v4

Konfiguracja w `tailwind.config.ts`. Framework zawiera:
- Domyślny system color
- Responsywny design
- Dark mode support (można włączyć w konfiguracji)

## Rozwiązywanie problemów

### Problem: "TURSO_DATABASE_URL nie jest ustawiony"
**Rozwiązanie:** Upewnij się, że plik `.env.local` istnieje i zawiera prawidłową wartość `TURSO_DATABASE_URL`.

### Problem: "Nie mogę się połączyć z bazą danych"
**Rozwiązanie:**
1. Sprawdź, czy token Turso jest aktualny
2. Upewnij się, że Twoja sieć pozwala na połączenia do Turso
3. Sprawdź, czy baza danych istnieje: `turso db list`

### Problem: Migracje nie działają
**Rozwiązanie:**
```bash
# Wyczyść cache Drizzle
rm -rf .drizzle

# Spróbuj ponownie
npm run db:push
```

### Problem: Strona nie ładuje się lokalnie
**Rozwiązanie:**
1. Upewnij się, że port 3000 jest dostępny
2. Wyczyść cache Next.js: `rm -rf .next`
3. Uruchom ponownie: `npm run dev`

## Development

### Linting

```bash
npm run lint
```

### Dodawanie nowych stron

1. Utwórz folder w `src/app/(dashboard)/`
2. Stwórz plik `page.tsx`
3. Zaimportuj komponenty z `src/components/`

### Dodawanie nowych komponentów

1. Stwórz plik w odpowiednim folderze w `src/components/`
2. Eksportuj komponenty jako named exports
3. Zaimportuj w swoim pliku strony

### Zmiana schematu bazy danych

1. Edytuj `src/db/schema.ts`
2. Uruchom `npm run db:generate` aby wygenerować migracje
3. Uruchom `npm run db:push` aby zastosować zmiany
4. Odśwież TypeScript aby uzyskać nowe typy

## Licencja

MIT

---

# English Version

## BHT Marketing Planner

Modern marketing planning application for the Brown House & Tea brand. The app supports marketing campaign management, posting schedule, budget tracking, and KPI monitoring across all major marketing channels.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Turso (LibSQL)** - Edge-deployed SQL database
- **Drizzle ORM** - Type-safe ORM for Node.js
- **Tailwind CSS v4** - Utility-first CSS framework
- **Recharts** - Data visualization library
- **Vercel** - Application deployment platform

## Features

- **Marketing Calendar** - Visual schedule of tasks and posts
- **Campaign Management** - Create, edit, and track marketing campaigns
- **Marketing Channels** - Support for multiple channels (Instagram, Facebook, TikTok, Pinterest, Email, SEO, Google Ads)
- **Budget Management** - Plan and track marketing expenses with charts
- **KPI and Performance Metrics** - Monitor metrics such as reach, engagement, conversions
- **Reports and Analytics** - Insights into campaign and channel performance
- **Task Management** - Assign tasks with priorities and deadlines

## Quick Start

### Prerequisites

- Node.js 18+ (recommended 20.x)
- npm or yarn
- Turso account (https://turso.tech)
- Vercel account (for deployment - optional)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bht-marketing-planner.git
cd bht-marketing-planner
npm install
```

### 2. Turso Configuration

#### a) Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Or on macOS with Homebrew:
```bash
brew install tursodatabase/tap/turso
```

#### b) Log In

```bash
turso auth login
```

The command will open a browser with the login process. Follow the on-screen instructions.

#### c) Create Database

```bash
turso db create bht-marketing-planner
```

#### d) Get Database URL

```bash
turso db show bht-marketing-planner --url
```

Copy the displayed URL - you'll need it for configuration.

#### e) Create Authentication Token

```bash
turso db tokens create bht-marketing-planner
```

Copy the generated token - you'll need it for configuration.

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the variables:

```env
TURSO_DATABASE_URL=libsql://YOUR_DB_URL
TURSO_AUTH_TOKEN=YOUR_TOKEN
```

Replace `YOUR_DB_URL` and `YOUR_TOKEN` with the values obtained in the previous steps.

### 4. Database Migration

Drizzle ORM will automatically manage the database schema. To synchronize the schema locally, run:

```bash
npm run db:push
```

If you need to generate new migrations (after schema changes):

```bash
npm run db:generate
```

### 5. Run Application Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 6. Build for Production

```bash
npm run build
npm run start
```

## Deploying to Vercel

### Option 1: Automatic Deployment via GitHub

1. **Push code to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/bht-marketing-planner.git
   git branch -M main
   git push -u origin main
   ```

2. **Connect repository in Vercel**
   - Go to https://vercel.com
   - Log in to your account
   - Click "New Project"
   - Select your repository
   - Vercel will automatically detect Next.js

3. **Add Environment Variables**
   - In the "Environment Variables" section add:
     - `TURSO_DATABASE_URL` - Turso database URL
     - `TURSO_AUTH_TOKEN` - Turso authentication token

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

### Option 2: Manual Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Provide the required environment variables when prompted.

## Project Structure

```
bht-marketing-planner/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── campaigns/     # Campaign endpoints
│   │   │   └── tasks/         # Task endpoints
│   │   ├── (dashboard)/       # Dashboard pages
│   │   │   ├── calendar/      # Calendar page
│   │   │   ├── campaigns/     # Campaigns page
│   │   │   ├── channels/      # Channels page
│   │   │   ├── budget/        # Budget page
│   │   │   ├── kpi/           # KPI page
│   │   │   ├── reports/       # Reports page
│   │   │   └── layout.tsx     # Dashboard layout
│   │   ├── page.tsx           # Home page
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/                # UI components
│   │   ├── calendar/          # Calendar components
│   │   ├── campaigns/         # Campaign components
│   │   ├── budget/            # Budget components
│   │   ├── kpi/               # KPI components
│   │   └── reports/           # Reports components
│   ├── db/                    # Database configuration
│   │   ├── schema.ts          # Drizzle schema
│   │   └── index.ts           # Database client
│   └── lib/                   # Utility functions
│
├── public/                    # Static files
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
├── next.config.ts            # Next.js configuration
├── drizzle.config.ts         # Drizzle ORM configuration
├── vercel.json               # Vercel deployment config
├── tailwind.config.ts        # Tailwind CSS configuration
└── README.md                 # This file
```

## Data Models

### Channels
Represent marketing channels (Instagram, Facebook, TikTok, etc.)
- `id` - Unique identifier
- `name` - Channel name
- `color` - Hex color code
- `icon` - Icon identifier

### Campaigns
Marketing campaigns assigned to channels
- `id` - Unique identifier
- `name` - Campaign name
- `description` - Description
- `channel_id` - Assigned channel
- `status` - Status (draft, active, completed, paused)
- `start_date` - Start date
- `end_date` - End date
- `budget_planned` - Planned budget
- `budget_spent` - Spent budget

### Tasks
Individual tasks within campaigns
- `id` - Unique identifier
- `campaign_id` - Assigned campaign
- `channel_id` - Assigned channel
- `title` - Task title
- `description` - Description
- `status` - Status (todo, in_progress, done)
- `priority` - Priority (low, medium, high)
- `scheduled_date` - Scheduled date
- `completed_at` - Completion date

### Budget Entries
Budget tracking by month and category
- `id` - Unique identifier
- `campaign_id` - Assigned campaign
- `channel_id` - Assigned channel
- `month` - Month (YYYY-MM format)
- `planned_amount` - Planned amount
- `actual_amount` - Actual amount
- `category` - Category (content, ads, tools, influencers, other)

### KPI Entries
Campaign performance metrics
- `id` - Unique identifier
- `channel_id` - Assigned channel
- `campaign_id` - Assigned campaign (optional)
- `date` - Measurement date
- `metric_name` - Metric name (followers, engagement_rate, reach, impressions, clicks, conversions, open_rate, ctr, revenue)
- `metric_value` - Metric value

## API Endpoints

### Campaigns

**GET `/api/campaigns`**
- Get list of all campaigns
- Query parameters: `status`, `channel_id`

**POST `/api/campaigns`**
- Create new campaign
- Body: `{ name, description, channel_id, start_date?, end_date?, budget_planned? }`

**GET `/api/campaigns/:id`**
- Get campaign details

**PUT `/api/campaigns/:id`**
- Update campaign
- Body: `{ name?, description?, status?, start_date?, end_date?, budget_planned? }`

**DELETE `/api/campaigns/:id`**
- Delete campaign

### Tasks

**GET `/api/tasks`**
- Get list of all tasks
- Query parameters: `status`, `priority`, `campaign_id`, `channel_id`

**POST `/api/tasks`**
- Create new task
- Body: `{ campaign_id, channel_id, title, description?, status?, priority?, scheduled_date? }`

**GET `/api/tasks/:id`**
- Get task details

**PUT `/api/tasks/:id`**
- Update task
- Body: `{ title?, description?, status?, priority?, scheduled_date?, completed_at? }`

**DELETE `/api/tasks/:id`**
- Delete task

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TURSO_DATABASE_URL` | Turso database URL in libsql:// format | Yes |
| `TURSO_AUTH_TOKEN` | Authentication token for Turso | Yes |

## Advanced Configuration

### Drizzle ORM

Configuration is in `drizzle.config.ts`. Supported operations:

```bash
# Generate migrations based on schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema to database (dev mode)
npm run db:push
```

### TypeScript

Project uses TypeScript for type safety. Configuration in `tsconfig.json`.

### Tailwind CSS v4

Configuration in `tailwind.config.ts`. Framework includes:
- Default color system
- Responsive design
- Dark mode support (can be enabled in configuration)

## Troubleshooting

### Issue: "TURSO_DATABASE_URL is not set"
**Solution:** Make sure `.env.local` file exists and contains the correct value for `TURSO_DATABASE_URL`.

### Issue: "Cannot connect to database"
**Solution:**
1. Check if Turso token is current
2. Make sure your network allows connections to Turso
3. Check if database exists: `turso db list`

### Issue: Migrations not working
**Solution:**
```bash
# Clear Drizzle cache
rm -rf .drizzle

# Try again
npm run db:push
```

### Issue: Page not loading locally
**Solution:**
1. Make sure port 3000 is available
2. Clear Next.js cache: `rm -rf .next`
3. Run again: `npm run dev`

## Development

### Linting

```bash
npm run lint
```

### Adding New Pages

1. Create folder in `src/app/(dashboard)/`
2. Create `page.tsx` file
3. Import components from `src/components/`

### Adding New Components

1. Create file in appropriate folder in `src/components/`
2. Export components as named exports
3. Import in your page file

### Changing Database Schema

1. Edit `src/db/schema.ts`
2. Run `npm run db:generate` to generate migrations
3. Run `npm run db:push` to apply changes
4. Refresh TypeScript to get new types

## License

MIT
