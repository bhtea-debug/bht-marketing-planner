# Brown House & Tea Marketing Planner - Project Structure

## Overview
A Next.js marketing planning application for Brown House & Tea with a warm brown/tea-inspired theme.

## Technology Stack
- **Framework**: Next.js App Router
- **Styling**: Tailwind CSS v4
- **Icons**: lucide-react
- **Font**: Inter from next/font/google
- **Language**: Polish UI with TypeScript

## File Structure

### Core Layout Files
- `src/app/layout.tsx` - Root layout with HTML lang="pl", Inter font, and globals CSS
- `src/app/globals.css` - Tailwind configuration with warm brown/tea color palette
- `src/app/page.tsx` - Root page that redirects to /calendar

### Dashboard
- `src/app/(dashboard)/layout.tsx` - Dashboard layout with sidebar wrapper
- `src/app/(dashboard)/calendar/page.tsx` - Calendar page placeholder

### Components
- `src/components/ui/sidebar.tsx` - Main navigation sidebar
  - Brand header with "BHT" and "Marketing Planner"
  - Navigation items with lucide-react icons:
    - Kalendarz (Calendar) → /calendar
    - Kampanie (Megaphone) → /campaigns
    - Kanały (Share2) → /channels
    - Budżet (Wallet) → /budget
    - KPI (BarChart3) → /kpi
    - Raporty (FileText) → /reports
  - Active state highlighting with warm brown background
  - Mobile-responsive with hamburger menu
  - Collapsible overlay on mobile devices

### Design System
**Colors** (from globals.css):
- Primary: Warm brown (#8b6f47)
- Secondary: Tea/caramel (#d4a574)
- Accent: Earth tone (#a67c52)
- Neutral: Cream (#faf8f5), Beige (#f5f1ea)
- Status: Success (sage green), Warning (caramel), Error (warm red-brown)

**Component Classes**:
- `.btn-primary`, `.btn-secondary`, `.btn-outline` - Button variants
- `.card`, `.card-elevated` - Card components
- `.input-field` - Input styling
- `.badge`, `.badge-success`, `.badge-warning`, `.badge-error` - Badge variants
- `.glass-effect`, `.gradient-warm`, `.gradient-subtle` - Utility classes

## Key Features Implemented

### Responsive Design
- Desktop: Fixed sidebar (264px width)
- Mobile: Collapsible hamburger menu with overlay
- Smooth transitions and animations

### Navigation
- Active route highlighting using `usePathname()`
- Clean, Polish labels for all sections
- Keyboard-friendly navigation

### Accessibility
- Semantic HTML with proper lang attribute
- ARIA labels on interactive elements
- Focus states on buttons and links
- High contrast colors

### Performance
- Server-side rendered layout
- Client-side sidebar for interactivity
- Optimized font loading with next/font/google

## Development Notes

### Adding New Pages
1. Create new route folder under `src/app/(dashboard)/[section]/`
2. Add `page.tsx` file
3. Navigation links automatically activate based on pathname

### Styling
- Use Tailwind utility classes for styling
- Leverage CSS custom properties for theme colors
- Follow warm brown/tea color palette

### Component Usage
```tsx
import { Sidebar } from "@/components/ui/sidebar";

// Sidebar is included in DashboardLayout automatically
```

## Next Steps
- Add calendar component to calendar page
- Create campaign management interface
- Implement channel tracking
- Build budget dashboard
- Set up KPI tracking
- Create reporting views
