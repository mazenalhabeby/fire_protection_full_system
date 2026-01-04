import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "HBCT Admin Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
