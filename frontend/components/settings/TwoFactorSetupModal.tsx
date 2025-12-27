"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  Shield,
  Loader2,
  CheckCircle,
  Copy,
  Download,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "qr" | "verify" | "recovery";

export function TwoFactorSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<Step>("qr");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesDownloaded, setCodesDownloaded] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("qr");
      setVerificationCode("");
      setRecoveryCodes([]);
      setCodesDownloaded(false);
      initSetup();
    }
  }, [isOpen]);

  const initSetup = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.setupTwoFactor();
      setQrCodeUrl(response.qrCodeDataUrl);
      setManualSecret(response.secret);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to initialize 2FA setup");
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyTwoFactorSetup(verificationCode);
      setRecoveryCodes(response.recoveryCodes);
      setStep("recovery");
      toast.success("2FA enabled successfully!");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Invalid verification code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(manualSecret);
    toast.success("Secret copied to clipboard");
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied to clipboard");
  };

  const handleDownloadCodes = () => {
    const content = `HBCT Fire Protection - Two-Factor Authentication Recovery Codes
==============================================================

IMPORTANT: Keep these codes in a safe place. Each code can only be used once.
If you lose access to your authenticator app, you can use one of these codes to log in.

Recovery Codes:
${recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

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
    setCodesDownloaded(true);
    toast.success("Recovery codes downloaded");
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            {step === "qr" && "Set Up Two-Factor Authentication"}
            {step === "verify" && "Verify Your Code"}
            {step === "recovery" && "Save Recovery Codes"}
          </DialogTitle>
          <DialogDescription>
            {step === "qr" &&
              "Scan the QR code with your authenticator app"}
            {step === "verify" &&
              "Enter the 6-digit code from your authenticator"}
            {step === "recovery" &&
              "Store these codes safely - they're your backup access"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: QR Code */}
          {step === "qr" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* QR Code with Logo - matches deposit page styling */}
                  <div className="flex justify-center">
                    <div className="p-5 bg-white rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                      {qrCodeUrl && (
                        <div className="relative w-56 h-56">
                          <img
                            src={qrCodeUrl}
                            alt="2FA QR Code"
                            className="w-56 h-56 rounded-lg"
                          />
                          {/* Logo overlay in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-xl border border-gray-200">
                              <Image
                                src="/images/logo-dark.svg"
                                alt="Logo"
                                width={48}
                                height={48}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scan instruction */}
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Scan with Google Authenticator, Authy, or similar app
                  </p>

                  {/* Manual Secret */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Can&apos;t scan? Enter this code manually:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono text-center break-all">
                        {manualSecret}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopySecret}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => setStep("verify")}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Verify */}
          {step === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Verification Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(
                      e.target.value.replace(/[^0-9]/g, "").slice(0, 6)
                    )
                  }
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("qr")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleVerify}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Enable
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Recovery Codes */}
          {step === "recovery" && (
            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Save these codes now. They won&apos;t be shown again. Each code
                  can only be used once.
                </p>
              </div>

              {/* Recovery Codes Grid */}
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {recoveryCodes.map((code, index) => (
                  <code
                    key={index}
                    className="px-2 py-1 text-sm font-mono text-center bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                  >
                    {code}
                  </code>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyCodes}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCodes}
                  className={cn(
                    "flex-1",
                    codesDownloaded &&
                      "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {codesDownloaded ? "Downloaded" : "Download"}
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={handleComplete}
                disabled={!codesDownloaded}
              >
                {codesDownloaded ? (
                  <>
                    Complete Setup
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  "Download codes to continue"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
