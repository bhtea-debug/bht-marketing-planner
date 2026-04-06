import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BHT Marketing Planner",
  description:
    "Plan i zarządzaj kampaniami marketingowymi Brown House & Tea - aplikacja do planowania strategii, budżetów i raportów.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
