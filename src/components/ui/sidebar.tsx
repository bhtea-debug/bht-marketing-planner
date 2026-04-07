"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Megaphone,
  Share2,
  Wallet,
  BarChart3,
  FileText,
  TrendingUp,
  Plug,
  Sparkles,
  Rocket,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Kalendarz", href: "/calendar", icon: Calendar },
  { label: "Kampanie", href: "/campaigns", icon: Megaphone },
  { label: "Reklamy (Ads)", href: "/ads", icon: Sparkles },
  { label: "Launche", href: "/launches", icon: Rocket },
  { label: "Analityka", href: "/analytics", icon: TrendingUp },
  { label: "Kanały", href: "/channels", icon: Share2 },
  { label: "Budżet", href: "/budget", icon: Wallet },
  { label: "KPI", href: "/kpi", icon: BarChart3 },
  { label: "Raporty", href: "/reports", icon: FileText },
  { label: "Integracje", href: "/integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 hover:shadow-md lg:hidden transition-all duration-200"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-white border-r border-slate-200/80 transform transition-all duration-300 ease-out lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="px-6 py-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm tracking-tight">BH</span>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-none">
                BHT Planner
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Marketing Platform</p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-slate-100" />

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            <p className="px-3 pt-1 pb-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 relative ${
                    active
                      ? "bg-amber-50 text-amber-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-700 rounded-r-full" />
                  )}
                  
                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.75}
                    className={`flex-shrink-0 transition-colors duration-150 ${
                      active ? "text-amber-700" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <ChevronRight size={14} className="text-amber-600/60" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <span className="text-amber-800 text-xs font-semibold">BT</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">Brown House & Tea</p>
                <p className="text-[10px] text-slate-400">Pro Plan</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
