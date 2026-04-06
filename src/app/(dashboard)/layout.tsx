import { Sidebar } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f6f8fa]">
      <Sidebar />
      <main className="flex-1 w-full lg:ml-[260px] min-h-screen">
        <div className="p-5 lg:p-8 max-w-[1400px] mx-auto page-enter">{children}</div>
      </main>
    </div>
  );
}
