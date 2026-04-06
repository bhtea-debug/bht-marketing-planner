import { Sidebar } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      {/* Sidebar - Fixed on desktop, collapsible on mobile */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 w-full lg:ml-64 bg-stone-50 min-h-screen">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
