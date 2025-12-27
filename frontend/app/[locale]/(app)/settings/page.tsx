"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import { SettingsSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsSidebar, type SettingsSection } from "@/components/settings/SettingsSidebar";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { WalletsSection } from "@/components/settings/WalletsSection";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

const validSections: SettingsSection[] = ["profile", "security", "notifications", "wallets", "delete"];

export default function SettingsPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth(`/${locale}/login`);
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  // Get initial tab from URL query param
  const tabParam = searchParams.get("tab") as SettingsSection | null;
  const initialSection = tabParam && validSections.includes(tabParam) ? tabParam : "profile";

  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  // Update active section when URL tab param changes
  useEffect(() => {
    if (tabParam && validSections.includes(tabParam)) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  // Stop minimum loading once auth is done (settings page has no additional data fetch)
  useEffect(() => {
    if (!authLoading) {
      stopLoading();
    }
  }, [authLoading, stopLoading]);

  const showSkeleton = authLoading || !isAuthenticated || isMinLoading;

  if (showSkeleton) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        </div>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <SettingsSkeleton />
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection user={user} />;
      case "security":
        return <SecuritySection />;
      case "notifications":
        return <NotificationsSection />;
      case "wallets":
        return <WalletsSection user={user} />;
      case "delete":
        return <DeleteAccountSection user={user} />;
      default:
        return <ProfileSection user={user} />;
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-200/40 to-transparent dark:from-brand-900/20 dark:to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-purple-200/30 to-transparent dark:from-purple-900/15 dark:to-transparent rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        <PageHeader
          title="Settings"
          subtitle="Manage your account settings and preferences"
        />

        {/* Settings Layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            <div className="max-w-2xl">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
