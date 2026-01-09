"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Bell,
  Mail,
  Clock,
  Coins,
  Lock,
  ShieldAlert,
  Megaphone,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsCard, SettingsRow, SettingsDivider } from "@/components/ui/settings-card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SelectWithIcon } from "@/components/ui/select-with-icon";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotifications";
import type { NotificationChannel, NotificationType } from "@/types/notifications";

// Channel options
const channelOptions: { value: NotificationChannel; labelKey: string }[] = [
  { value: "BOTH", labelKey: "all" },
  { value: "IN_APP", labelKey: "inApp" },
  { value: "EMAIL", labelKey: "email" },
  { value: "NONE", labelKey: "off" },
];

// Notification type config
const notificationTypes: {
  type: NotificationType;
  key: "transactionChannel" | "securityChannel" | "lockingChannel" | "systemChannel" | "marketingChannel";
  icon: React.ReactNode;
  labelKey: string;
  descriptionKey: string;
  color: string;
}[] = [
  {
    type: "TRANSACTION",
    key: "transactionChannel",
    icon: <Coins className="h-4 w-4" />,
    labelKey: "transactions",
    descriptionKey: "transactions",
    color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    type: "SECURITY",
    key: "securityChannel",
    icon: <ShieldAlert className="h-4 w-4" />,
    labelKey: "security",
    descriptionKey: "security",
    color: "text-red-500 bg-red-100 dark:bg-red-900/30",
  },
  {
    type: "LOCKING",
    key: "lockingChannel",
    icon: <Lock className="h-4 w-4" />,
    labelKey: "locking",
    descriptionKey: "locking",
    color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  },
  {
    type: "SYSTEM",
    key: "systemChannel",
    icon: <Megaphone className="h-4 w-4" />,
    labelKey: "system",
    descriptionKey: "system",
    color: "text-gray-500 bg-gray-100 dark:bg-gray-700",
  },
  {
    type: "MARKETING",
    key: "marketingChannel",
    icon: <Sparkles className="h-4 w-4" />,
    labelKey: "marketing",
    descriptionKey: "marketing",
    color: "text-brand-500 bg-brand-100 dark:bg-brand-900/30",
  },
];

// Hour options for quiet hours
const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

export function NotificationsSection() {
  const t = useTranslations("settings.notifications");
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  // Local state for form
  const [formData, setFormData] = useState({
    transactionChannel: "BOTH" as NotificationChannel,
    securityChannel: "BOTH" as NotificationChannel,
    lockingChannel: "IN_APP" as NotificationChannel,
    systemChannel: "IN_APP" as NotificationChannel,
    marketingChannel: "NONE" as NotificationChannel,
    emailEnabled: true,
    emailDigest: false,
    quietHoursEnabled: false,
    quietHoursStart: 22,
    quietHoursEnd: 8,
  });

  // Load preferences into form
  useEffect(() => {
    if (preferences) {
      setFormData({
        transactionChannel: preferences.transactionChannel,
        securityChannel: preferences.securityChannel,
        lockingChannel: preferences.lockingChannel,
        systemChannel: preferences.systemChannel,
        marketingChannel: preferences.marketingChannel,
        emailEnabled: preferences.emailEnabled,
        emailDigest: preferences.emailDigest,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart ?? 22,
        quietHoursEnd: preferences.quietHoursEnd ?? 8,
      });
    }
  }, [preferences]);

  const handleChannelChange = async (
    key: keyof typeof formData,
    value: NotificationChannel
  ) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);

    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast.success(t("preferenceSaved"));
    } catch {
      toast.error(t("preferenceError"));
      if (preferences) {
        setFormData((prev) => ({ ...prev, [key]: preferences[key as keyof typeof preferences] }));
      }
    }
  };

  const handleToggle = async (key: "emailEnabled" | "emailDigest" | "quietHoursEnabled") => {
    const newValue = !formData[key];
    setFormData((prev) => ({ ...prev, [key]: newValue }));

    try {
      await updatePreferences.mutateAsync({ [key]: newValue });
      toast.success(t("preferenceSaved"));
    } catch {
      toast.error(t("preferenceError"));
      setFormData((prev) => ({ ...prev, [key]: !newValue }));
    }
  };

  const handleQuietHoursChange = async (field: "quietHoursStart" | "quietHoursEnd", value: string) => {
    const numValue = parseInt(value, 10);
    setFormData((prev) => ({ ...prev, [field]: numValue }));

    try {
      await updatePreferences.mutateAsync({ [field]: numValue });
      toast.success(t("preferenceSaved"));
    } catch {
      toast.error(t("preferenceError"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <SettingsCard
        icon={Bell}
        title={t("title")}
        description={t("description")}
        noPadding
        contentClassName="divide-y divide-gray-100 dark:divide-gray-800"
      >
        {notificationTypes.map((type) => (
          <div key={type.type} className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Type Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", type.color)}>
                  {type.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {t(`types.${type.labelKey}.label`)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {t(`types.${type.descriptionKey}.description`)}
                  </p>
                </div>
              </div>

              {/* Channel Selector */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {channelOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleChannelChange(type.key, option.value)}
                    disabled={updatePreferences.isPending}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                      formData[type.key] === option.value
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                  >
                    {t(`channels.${option.labelKey}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </SettingsCard>

      {/* Email Settings */}
      <SettingsCard
        icon={Mail}
        title={t("emailSettings.title")}
        noPadding
        contentClassName="divide-y divide-gray-100 dark:divide-gray-800"
      >
        <div className="px-5">
          <SettingsRow
            label={t("emailSettings.enableEmail")}
            description={t("emailSettings.enableEmailDescription")}
          >
            <ToggleSwitch
              checked={formData.emailEnabled}
              onChange={() => handleToggle("emailEnabled")}
              disabled={updatePreferences.isPending}
            />
          </SettingsRow>
        </div>
        <div className="px-5">
          <SettingsRow
            label={t("emailSettings.dailyDigest")}
            description={t("emailSettings.dailyDigestDescription")}
          >
            <ToggleSwitch
              checked={formData.emailDigest && formData.emailEnabled}
              onChange={() => handleToggle("emailDigest")}
              disabled={updatePreferences.isPending || !formData.emailEnabled}
            />
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* Quiet Hours */}
      <SettingsCard
        icon={Clock}
        title={t("quietHours.title")}
        description={t("quietHours.description")}
      >
        <SettingsRow
          label={t("quietHours.enable")}
          description={t("quietHours.enableDescription")}
          className="py-0 pb-4"
        >
          <ToggleSwitch
            checked={formData.quietHoursEnabled}
            onChange={() => handleToggle("quietHoursEnabled")}
            disabled={updatePreferences.isPending}
          />
        </SettingsRow>

        {formData.quietHoursEnabled && (
          <>
            <SettingsDivider />
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("quietHours.from")}
                </label>
                <SelectWithIcon
                  icon={Clock}
                  value={formData.quietHoursStart}
                  onChange={(value) => handleQuietHoursChange("quietHoursStart", value)}
                  options={hourOptions}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("quietHours.to")}
                </label>
                <SelectWithIcon
                  icon={Clock}
                  value={formData.quietHoursEnd}
                  onChange={(value) => handleQuietHoursChange("quietHoursEnd", value)}
                  options={hourOptions}
                />
              </div>
            </div>
          </>
        )}
      </SettingsCard>
    </div>
  );
}
