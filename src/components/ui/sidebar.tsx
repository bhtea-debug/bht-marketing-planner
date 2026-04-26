"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  Megaphone,
  Share2,
  Wallet,
  BarChart3,
  FileText,
  TrendingUp,
  Plug,
  Sparkles,
  Rocket,
  Palette,
  Image as ImageIcon,
  Menu,
  X,
  Users,
  ChevronRight,
  Radio,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: any; badge?: string };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Pulpit",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Trendy & playbook", href: "/trends", icon: Radio },
    ],
  },
  {
    title: "Planowanie",
    items: [
      { label: "Kalendarz", href: "/calendar", icon: Calendar },
      { label: "Kampanie", href: "/campaigns", icon: Megaphone },
      { label: "Launche", href: "/launches", icon: Rocket },
      { label: "Reklamy (Ads)", href: "/ads", icon: Sparkles },
      { label: "Leady B2B", href: "/b2b-leads", icon: Users },
    ],
  },
  {
    title: "Marka & Treści",
    items: [
      { label: "Profil marki", href: "/brand", icon: Palette },
      { label: "Biblioteka", href: "/assets", icon: ImageIcon },
    ],
  },
  {
    title: "Pomiar & Wydajność",
    items: [
      { label: "Analityka", href: "/analytics", icon: TrendingUp },
      { label: "KPI", href: "/kpi", icon: BarChart3 },
      { label: "Raporty", href: "/reports", icon: FileText },
    ],
  },
  {
    title: "Operacje",
    items: [
      { label: "Kanały", href: "/channels", icon: Share2 },
      { label: "Budżet", href: "/budget", icon: Wallet },
      { label: "Integracje", href: "/integrations", icon: Plug },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile menu trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 hover:shadow-md lg:hidden transition-all duration-200"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[244px] bg-white/80 backdrop-blur-xl border-r border-slate-200/60 transform transition-all duration-300 ease-out lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/40">
              <span className="text-white font-bold text-[13px] tracking-tight">BH</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] font-bold text-slate-900 tracking-tight leading-none">
                BHT Planner
              </h1>
              <p className="text-[10.5px] text-slate-400 mt-1 font-medium">Marketing Platform</p>
            </div>
          </div>

          {/* Search-like quick action */}
          <div className="px-3 mb-1">
            <Link
              href="/calendar"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="opacity-60">⌘</span>
              <span>Skocz do kalendarza…</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 pt-1 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative ${
                          active
                            ? "bg-indigo-50/80 text-indigo-700 shadow-sm shadow-indigo-500/10"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-r-full" />
                        )}
                        <Icon
                          size={16}
                          strokeWidth={active ? 2.2 : 1.8}
                          className={`flex-shrink-0 transition-colors duration-150 ${
                            active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"
                          }`}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {active && <ChevronRight size={12} className="text-indigo-500/70" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 via-violet-400 to-purple-500 flex items-center justify-center ring-1 ring-white/40 shadow-sm">
                <span className="text-white text-[11px] font-bold">BT</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-700 truncate">Brown House &amp; Tea</p>
                <p className="text-[10px] text-slate-400">Pro Plan</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
