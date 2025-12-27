"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Mail, Phone, FileText, CheckCircle, Camera, KeyRound, Wallet, Link2, AtSign, Loader2, Check, X } from "lucide-react";
import type { User as UserType } from "@/types/api";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/hooks/useAuth";

// Auth provider display config (keys match backend enum values)
const authProviderConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; description: string }> = {
  CREDENTIALS: {
    label: "Email & Password",
    icon: <KeyRound className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "You signed up with your email address and password"
  },
  GOOGLE: {
    label: "Google",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
    description: "You signed up with your Google account"
  },
  FACEBOOK: {
    label: "Facebook",
    icon: (
      <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: "text-[#1877F2]",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    description: "You signed up with your Facebook account"
  },
  WALLET: {
    label: "Web3 Wallet",
    icon: <Wallet className="h-5 w-5" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    description: "You signed up with your Web3 wallet"
  }
};

interface ProfileSectionProps {
  user: UserType | null;
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const { updateUser, refreshUser } = useAuth();
  // Normalize authProvider to uppercase for config lookup
  const authProvider = user?.authProvider?.toUpperCase() || '';

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phoneNumber: user?.phoneNumber || "",
    bio: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phoneNumber: user.phoneNumber || "",
        bio: "",
      });
      setUsername(user.username || "");
    }
  }, [user]);

  // Username state
  const [username, setUsername] = useState(user?.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  // Debounced username check
  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    // Validate username format
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      setUsernameAvailable(null);
      return;
    }
    if (username.length > 20) {
      setUsernameError("Username cannot exceed 20 characters");
      setUsernameAvailable(null);
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
      setUsernameError("Username must start with a letter and contain only letters, numbers, and underscores");
      setUsernameAvailable(null);
      return;
    }

    setUsernameError(null);
    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const result = await authApi.checkUsername(username);
        setUsernameAvailable(result.available);
        if (!result.available) {
          setUsernameError(result.reason || "Username is not available");
        }
      } catch {
        setUsernameError("Failed to check username");
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  const handleSaveUsername = async () => {
    if (!username || !usernameAvailable) return;

    setIsSavingUsername(true);
    try {
      await authApi.updateUsername(username);
      await refreshUser();
      toast.success("Username updated successfully!");
      setUsernameAvailable(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to update username");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const [phoneError, setPhoneError] = useState<string | null>(null);

  // E.164 phone number validation regex
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Empty is valid (optional field)
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    return e164Regex.test(phone.replace(/\s/g, ''));
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'phoneNumber') {
      // Strip non-numeric characters except + at start
      const cleaned = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
      setFormData((prev) => ({ ...prev, [field]: cleaned }));

      // Validate phone number
      if (cleaned && !validatePhoneNumber(cleaned)) {
        setPhoneError('Please enter a valid phone number (e.g., +1234567890)');
      } else {
        setPhoneError(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    // Validate phone before saving
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-brand-500" />
            Profile Information
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update your personal information
          </p>
        </div>

        <div className="p-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-brand-500/20">
                {initials}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Camera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email?.split("@")[0]
                  || (user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "User")}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {user?.email ? (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">
                      {user.email}
                    </span>
                    {user?.isEmailVerified && (
                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </>
                ) : user?.walletAddress ? (
                  <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                    {user.walletAddress}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="John"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Doe"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={user?.email || ""}
                  disabled
                  className="pl-10 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  placeholder="+1234567890"
                  className={cn(
                    "pl-10",
                    phoneError && "border-red-500 focus:ring-red-500/20"
                  )}
                  maxLength={16}
                />
              </div>
              {phoneError ? (
                <p className="text-xs text-red-500 mt-1.5">{phoneError}</p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  International format (e.g., +1234567890)
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  placeholder="Tell us a little about yourself..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Username Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AtSign className="h-5 w-5 text-brand-500" />
            Username
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set a unique username to receive HBCT from other users
          </p>
        </div>

        <div className="p-6">
          {user?.username && (
            <div className="mb-4 p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
              <p className="text-sm text-brand-700 dark:text-brand-400">
                Your current username: <span className="font-semibold">@{user.username}</span>
              </p>
              <p className="text-xs text-brand-600/70 dark:text-brand-400/70 mt-1">
                Share this with others so they can send you HBCT
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {user?.username ? "Change Username" : "Choose a Username"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="johndoe"
                  className={cn(
                    "pl-8 pr-10",
                    usernameError && "border-red-500 focus:ring-red-500/20",
                    usernameAvailable && "border-emerald-500 focus:ring-emerald-500/20"
                  )}
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingUsername && (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                  )}
                  {!isCheckingUsername && usernameAvailable === true && (
                    <Check className="h-4 w-4 text-emerald-500" />
                  )}
                  {!isCheckingUsername && usernameAvailable === false && (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {usernameError && (
                <p className="text-xs text-red-500 mt-1.5">{usernameError}</p>
              )}
              {usernameAvailable && !usernameError && (
                <p className="text-xs text-emerald-500 mt-1.5">Username is available!</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                3-20 characters. Letters, numbers, and underscores only. Must start with a letter.
              </p>
            </div>

            {/* User ID info */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Your User ID:</span>{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">{user?.id}</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Others can also send you HBCT using this ID
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleSaveUsername}
                disabled={!usernameAvailable || isSavingUsername || username === user?.username}
              >
                {isSavingUsername ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  user?.username ? "Update Username" : "Set Username"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Type Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="h-5 w-5 text-brand-500" />
            Account Type
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            How you signed up for your account
          </p>
        </div>

        <div className="p-6">
          {authProvider && authProviderConfig[authProvider] ? (
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                authProviderConfig[authProvider].bgColor
              )}>
                <span className={authProviderConfig[authProvider].color}>
                  {authProviderConfig[authProvider].icon}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {authProviderConfig[authProvider].label}
                  </h3>
                  <Badge variant="success" size="sm">
                    Connected
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {authProviderConfig[authProvider].description}
                </p>
                {authProvider === 'WALLET' && user?.walletAddress && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Email & Password
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You signed up with your email address and password
                </p>
              </div>
            </div>
          )}

          {/* Linked Accounts Info */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your account was created on {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
