import { AuthNavbar } from "@/components/navbar/AuthNavbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <AuthNavbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
