import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/Footer";
import { NavbarThemeProvider } from "@/hooks/useNavbarTheme";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavbarThemeProvider>
      <Navbar />
      {children}
      <Footer />
    </NavbarThemeProvider>
  );
}
