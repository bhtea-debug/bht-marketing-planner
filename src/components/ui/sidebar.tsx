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
  Menu,
  X,
} from "lucide-react";

const navItems = [
  {
    label: "Kalendarz",
    href: "/calendar",
    icon: Calendar,
  },
  {
    label: "Kampanie",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    label: "Kanały",
    href: "/channels",
    icon: Share2,
  },
  {
    label: "Budżet",
    href: "/budget",
    icon: Wallet,
  },
  {
    label: "KPI",
    href: "/kpi",
    icon: BarChart3,
  },
  {
    label: "Raporty",
    href: "/reports",
    icon: FileText,
  },
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
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-stone-800 text-amber-100 hover:bg-stone-700 lg:hidden"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-stone-900 text-stone-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="p-6 border-b border-stone-800">
            <h1 className="text-2xl font-bold text-amber-100">BHT</h1>
            <p className="text-xs text-stone-400 mt-1">Marketing Planner</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    active
                      ? "bg-amber-900 text-amber-50 font-medium"
                      : "text-stone-300 hover:bg-stone-800 hover:text-amber-100"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-stone-800 text-xs text-stone-500">
            <p>Brown House & Tea</p>
            <p className="mt-1">© 2026</p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
