'use client';

import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { authApi } from '@/lib/api/auth';

interface AdminVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (redirectUrl: string) => void;
  has2FAEnabled: boolean;
}

export function AdminVerifyModal({
  isOpen,
  onClose,
  onSuccess,
  has2FAEnabled,
}: AdminVerifyModalProps) {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && has2FAEnabled) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen, has2FAEnabled]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCode(['', '', '', '', '', '']);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last character
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every((digit) => digit !== '') && newCode.join('').length === 6) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (codeValue?: string) => {
    const verificationCode = codeValue || code.join('');
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyAdminAccess(verificationCode);
      if (response.success) {
        onSuccess(response.redirectUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToSettings = () => {
    onClose();
    router.push('/settings?tab=security');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-amber-500/20 rounded-full">
              <ShieldCheck className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white text-center mb-2">
            Admin Verification Required
          </h2>

          {!has2FAEnabled ? (
            // 2FA not enabled message
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400 text-sm">
                  Two-factor authentication must be enabled for admin access
                </p>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Please enable 2FA in your security settings before accessing the admin panel.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoToSettings}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
                >
                  Go to Settings
                </button>
              </div>
            </div>
          ) : (
            // 2FA verification form
            <>
              <p className="text-gray-400 text-center text-sm mb-6">
                Enter your 6-digit authentication code to access the admin panel
              </p>

              {/* Code input */}
              <div className="flex justify-center gap-2 mb-4">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={isLoading}
                    className="w-12 h-14 text-center text-2xl font-bold bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors disabled:opacity-50"
                  />
                ))}
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Recovery code hint */}
              <p className="text-gray-500 text-xs text-center mb-6">
                <KeyRound className="w-3 h-3 inline mr-1" />
                You can also use a recovery code (XXXX-XXXX format)
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || code.some((d) => !d)}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Security note */}
        <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-700 rounded-b-2xl">
          <p className="text-gray-500 text-xs text-center">
            Admin verification expires after 30 minutes of activity
          </p>
        </div>
      </div>
    </div>
  );
}
