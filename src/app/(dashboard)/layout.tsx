import { Sidebar } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 w-full lg:ml-[244px] min-h-screen">
        <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-[1320px] mx-auto page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
