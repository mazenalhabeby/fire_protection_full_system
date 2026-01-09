"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/ui/settings-card";
import { FormPasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield,
  Lock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authApi, type TwoFactorStatus } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { ActiveSessionsSection } from "./ActiveSessionsSection";
import { SessionActivitySection } from "./SessionActivitySection";
import { TwoFactorSetupModal } from "./TwoFactorSetupModal";

export function SecuritySection() {
  const t = useTranslations("settings.security");
  const t2FA = useTranslations("settings.security.twoFactor");
  const { user, changePassword, setPassword } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState("");
  const [regenerateLoading, setRegenerateLoading] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Check if user already has a password set
  const hasPassword = user?.hasPassword ?? false;

  // Check if user can set/change password (has email for credentials auth)
  const canManagePassword = user?.email;

  // Fetch 2FA status on mount
  useEffect(() => {
    fetchTwoFactorStatus();
  }, []);

  const fetchTwoFactorStatus = async () => {
    setTwoFactorLoading(true);
    try {
      const status = await authApi.getTwoFactorStatus();
      setTwoFactorStatus(status);
    } catch (err) {
      console.error("Failed to fetch 2FA status:", err);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      toast.error(t2FA("enterCode"));
      return;
    }

    setDisableLoading(true);
    try {
      await authApi.disableTwoFactor(disableCode);
      toast.success(t2FA("disabled"));
      setShowDisableConfirm(false);
      setDisableCode("");
      fetchTwoFactorStatus();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t2FA("disableError"));
      }
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRegenerateCodes = async () => {
    if (regenerateCode.length !== 6) {
      toast.error(t2FA("enterCode"));
      return;
    }

    setRegenerateLoading(true);
    try {
      const response = await authApi.regenerateRecoveryCodes(regenerateCode);
      // Show recovery codes in a modal or download
      const content = `HBCT Fire Protection - New Recovery Codes
=========================================

${response.recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

Generated: ${new Date().toISOString()}
`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hbct-recovery-codes.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t2FA("regenerateSuccess"));
      setShowRegenerateConfirm(false);
      setRegenerateCode("");
      fetchTwoFactorStatus();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t2FA("regenerateError"));
      }
    } finally {
      setRegenerateLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error(t("passwordMismatch"));
      return;
    }

    if (passwords.new.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }

    // Validate password complexity
    const hasUppercase = /[A-Z]/.test(passwords.new);
    const hasLowercase = /[a-z]/.test(passwords.new);
    const hasNumber = /\d/.test(passwords.new);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error(t("passwordComplexity"));
      return;
    }

    setIsUpdating(true);
    try {
      await changePassword(passwords.current, passwords.new);
      toast.success(t("passwordSuccess"));
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetPassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error(t("passwordMismatch"));
      return;
    }

    if (passwords.new.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }

    // Validate password complexity
    const hasUppercase = /[A-Z]/.test(passwords.new);
    const hasLowercase = /[a-z]/.test(passwords.new);
    const hasNumber = /\d/.test(passwords.new);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error(t("passwordComplexity"));
      return;
    }

    setIsUpdating(true);
    try {
      await setPassword(passwords.new, passwords.confirm);
      toast.success(t("passwordSetSuccess"));
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to set password";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Management - Set or Change based on hasPassword */}
      <SettingsCard
        icon={hasPassword ? Lock : KeyRound}
        title={hasPassword ? t("changePassword") : t("setPassword")}
        description={hasPassword
          ? t("changePasswordDescription")
          : t("setPasswordDescription")
        }
      >
        {!canManagePassword ? (
          // Wallet-only users without email
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {t("passwordNotAvailable")}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t("walletAuthOnly")}
              </p>
            </div>
          </div>
        ) : !hasPassword ? (
          // User has email but no password - show Set Password form
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {t("noPasswordSet")}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You signed up using {user?.authProvider === 'wallet' ? 'wallet' : 'social'} authentication.
                  Set a password to enable login with your email ({user?.email}).
                </p>
              </div>
            </div>

            <FormPasswordInput
              label={t("newPassword")}
              value={passwords.new}
              onChange={(value) => setPasswords((prev) => ({ ...prev, new: value }))}
              placeholder="••••••••"
            />

            <FormPasswordInput
              label={t("confirmPassword")}
              value={passwords.confirm}
              onChange={(value) => setPasswords((prev) => ({ ...prev, confirm: value }))}
              placeholder="••••••••"
            />

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("passwordHint")}
            </p>

            <div className="pt-2">
              <Button
                variant="default"
                onClick={handleSetPassword}
                disabled={
                  isUpdating ||
                  !passwords.new ||
                  !passwords.confirm
                }
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("settingPassword")}
                  </>
                ) : (
                  t("setPassword")
                )}
              </Button>
            </div>
          </div>
        ) : (
          // User has password - show Change Password form
          <div className="space-y-4">
            <FormPasswordInput
              label={t("currentPassword")}
              value={passwords.current}
              onChange={(value) => setPasswords((prev) => ({ ...prev, current: value }))}
              placeholder="••••••••"
            />

            <FormPasswordInput
              label={t("newPassword")}
              value={passwords.new}
              onChange={(value) => setPasswords((prev) => ({ ...prev, new: value }))}
              placeholder="••••••••"
            />

            <FormPasswordInput
              label={t("confirmPassword")}
              value={passwords.confirm}
              onChange={(value) => setPasswords((prev) => ({ ...prev, confirm: value }))}
              placeholder="••••••••"
            />

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("passwordHint")}
            </p>

            <div className="pt-2">
              <Button
                variant="default"
                onClick={handlePasswordChange}
                disabled={
                  isUpdating ||
                  !passwords.current ||
                  !passwords.new ||
                  !passwords.confirm
                }
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("updating")}
                  </>
                ) : (
                  t("updatePassword")
                )}
              </Button>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Two-Factor Authentication */}
      <SettingsCard
        icon={Shield}
        title={t2FA("title")}
        description={t2FA("description")}
      >
        {twoFactorLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : twoFactorStatus?.isEnabled ? (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t2FA("enabled")}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t2FA("recoveryCodesRemaining", { count: twoFactorStatus.recoveryCodesRemaining })}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegenerateConfirm(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t2FA("regenerateCodes")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisableConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {t2FA("disable")}
              </Button>
            </div>

            {/* Disable Confirmation */}
            {showDisableConfirm && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 space-y-3">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  {t2FA("disableConfirm")}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    value={disableCode}
                    onChange={(e) =>
                      setDisableCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    className="flex-1 text-center font-mono"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDisable2FA}
                    disabled={disableLoading || disableCode.length !== 6}
                  >
                    {disableLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t2FA("confirm")
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDisableConfirm(false);
                      setDisableCode("");
                    }}
                  >
                    {t2FA("cancel")}
                  </Button>
                </div>
              </div>
            )}

            {/* Regenerate Confirmation */}
            {showRegenerateConfirm && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  {t2FA("regenerateConfirm")}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t2FA("regenerateWarning")}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    value={regenerateCode}
                    onChange={(e) =>
                      setRegenerateCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    className="flex-1 text-center font-mono"
                  />
                  <Button
                    variant="default"
                    onClick={handleRegenerateCodes}
                    disabled={regenerateLoading || regenerateCode.length !== 6}
                  >
                    {regenerateLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t2FA("generate")
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRegenerateConfirm(false);
                      setRegenerateCode("");
                    }}
                  >
                    {t2FA("cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <AlertTriangle className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {t2FA("disabled")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t2FA("enableHint")}
                </p>
              </div>
            </div>
            <Button variant="default" onClick={() => setShowSetupModal(true)}>
              {t2FA("enable")}
            </Button>
          </div>
        )}
      </SettingsCard>

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSuccess={() => fetchTwoFactorStatus()}
      />

      {/* Active Sessions */}
      <ActiveSessionsSection />

      {/* Session Activity */}
      <SessionActivitySection />
    </div>
  );
}
