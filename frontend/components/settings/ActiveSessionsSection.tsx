"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Loader2,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Laptop,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { Session } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

// Session limits (should match backend)
const MAX_SESSIONS_PER_USER = 5;

// Device icon mapping
const getDeviceIcon = (deviceType: string | null) => {
  if (!deviceType) return Monitor;
  const d = deviceType.toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) return Smartphone;
  if (d.includes("tablet") || d.includes("ipad")) return Tablet;
  if (d.includes("laptop")) return Laptop;
  return Monitor;
};

// OS icon/color mapping
const getOSInfo = (os: string | null) => {
  if (!os) return { color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800" };
  const o = os.toLowerCase();
  if (o.includes("mac") || o.includes("ios")) {
    return { color: "text-gray-700 dark:text-gray-300", bgColor: "bg-gray-100 dark:bg-gray-800" };
  }
  if (o.includes("windows")) {
    return { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/30" };
  }
  if (o.includes("android")) {
    return { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/30" };
  }
  if (o.includes("linux")) {
    return { color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/30" };
  }
  return { color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800" };
};

// Mask IP address for privacy
const maskIpAddress = (ip: string | null, showFull: boolean = false) => {
  if (!ip) return "Unknown";
  if (showFull) return ip;

  // Handle localhost
  if (ip === "::1" || ip === "127.0.0.1") return "localhost";

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  // IPv6
  if (ip.includes(":")) {
    const v6Parts = ip.split(":");
    if (v6Parts.length >= 2) {
      return `${v6Parts[0]}:${v6Parts[1]}:****`;
    }
  }
  return ip.slice(0, 8) + "***";
};

// Format time ago
const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

// Format full date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Check if session might be suspicious
const isSessionSuspicious = (session: Session, currentSession: Session | null) => {
  if (session.isCurrent) return false;

  // VPN detected
  if (session.isVpnDetected) return true;

  // Different country than current session
  if (currentSession?.country && session.country && session.country !== currentSession.country) {
    return true;
  }

  return false;
};

export function ActiveSessionsSection() {
  const { getSessions, revokeSession, logoutAllOtherSessions, trustDevice, untrustDevice } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [trustingSessionId, setTrustingSessionId] = useState<string | null>(null);
  const [showFullIp, setShowFullIp] = useState(false);

  const loadSessions = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const sessionsData = await getSessions();
      setSessions(sessionsData);
    } catch (error) {
      toast.error("Failed to load sessions");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setIsRevokingAll(true);
    try {
      const count = await logoutAllOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success(`Revoked ${count} session${count !== 1 ? "s" : ""}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke sessions");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const handleTrustDevice = async (sessionId: string) => {
    setTrustingSessionId(sessionId);
    try {
      await trustDevice(sessionId);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, isTrusted: true } : s
        )
      );
      toast.success("Device marked as trusted");
    } catch (error: any) {
      toast.error(error.message || "Failed to trust device");
    } finally {
      setTrustingSessionId(null);
    }
  };

  const handleUntrustDevice = async (sessionId: string) => {
    setTrustingSessionId(sessionId);
    try {
      await untrustDevice(sessionId);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, isTrusted: false, trustDeviceName: null } : s
        )
      );
      toast.success("Device trust removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove trust");
    } finally {
      setTrustingSessionId(null);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const currentSessionData = sessions.find((s) => s.isCurrent);
    const otherSessions = sessions.filter((s) => !s.isCurrent);
    const suspiciousSessions = otherSessions.filter((s) => isSessionSuspicious(s, currentSessionData || null));
    const trustedSessions = sessions.filter((s) => s.isTrusted);

    return {
      total: sessions.length,
      other: otherSessions.length,
      suspicious: suspiciousSessions.length,
      trusted: trustedSessions.length,
      currentSession: currentSessionData,
      otherSessions,
      suspiciousSessions,
    };
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/30 dark:to-brand-800/30 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                  stats.suspicious > 0
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/25"
                    : "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25"
                )}>
                  {stats.suspicious > 0 ? (
                    <ShieldAlert className="h-7 w-7 text-white" />
                  ) : (
                    <ShieldCheck className="h-7 w-7 text-white" />
                  )}
                </div>
                {stats.suspicious > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{stats.suspicious}</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Active Sessions
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Manage devices logged into your account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullIp(!showFullIp)}
                className="text-gray-500 hover:text-gray-700"
                title={showFullIp ? "Hide full IP" : "Show full IP"}
              >
                {showFullIp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadSessions(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.total}<span className="text-sm font-normal text-gray-400">/{MAX_SESSIONS_PER_USER}</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span className="text-xs text-brand-600 dark:text-brand-400">Trusted</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-brand-700 dark:text-brand-300">{stats.trusted}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400">Other</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-300">{stats.other}</p>
            </div>
            <div className={cn(
              "p-3 rounded-xl border",
              stats.suspicious > 0
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700"
            )}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  stats.suspicious > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500"
                )} />
                <span className={cn(
                  "text-xs",
                  stats.suspicious > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500 dark:text-gray-400"
                )}>Review</span>
              </div>
              <p className={cn(
                "mt-1 text-2xl font-semibold",
                stats.suspicious > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-gray-900 dark:text-white"
              )}>{stats.suspicious}</p>
            </div>
          </div>

          {/* Revoke All Button */}
          {stats.other > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeAllOthers}
                disabled={isRevokingAll}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                {isRevokingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Revoke All Other Sessions
              </Button>
            </div>
          )}
        </div>

        {/* Security Alert */}
        {stats.suspicious > 0 && (
          <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Suspicious activity detected
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  {stats.suspicious} session{stats.suspicious !== 1 ? "s" : ""} from
                  {stats.suspicious === 1 ? " a different location" : " different locations"}.
                  Review and revoke any you don't recognize.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Current Session */}
        {stats.currentSession && (
          <div className="border-b border-gray-100 dark:border-gray-800">
            <div className="px-6 py-3 bg-brand-50/50 dark:bg-brand-900/10 border-b border-brand-100 dark:border-brand-800/50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                  Current Session
                </span>
              </div>
            </div>
            <SessionCard
              session={stats.currentSession}
              isExpanded={expandedSession === stats.currentSession.id}
              onToggleExpand={() => setExpandedSession(
                expandedSession === stats.currentSession!.id ? null : stats.currentSession!.id
              )}
              onRevoke={() => {}}
              isRevoking={false}
              isCurrent={true}
              onTrust={() => handleTrustDevice(stats.currentSession!.id)}
              onUntrust={() => handleUntrustDevice(stats.currentSession!.id)}
              isTrusting={trustingSessionId === stats.currentSession.id}
              showFullIp={showFullIp}
            />
          </div>
        )}

        {/* Other Sessions */}
        {stats.otherSessions.length > 0 ? (
          <div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Other Sessions ({stats.other})
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.otherSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggleExpand={() => setExpandedSession(
                    expandedSession === session.id ? null : session.id
                  )}
                  onRevoke={() => handleRevokeSession(session.id)}
                  isRevoking={revokingSessionId === session.id}
                  isSuspicious={isSessionSuspicious(session, stats.currentSession || null)}
                  onTrust={() => handleTrustDevice(session.id)}
                  onUntrust={() => handleUntrustDevice(session.id)}
                  isTrusting={trustingSessionId === session.id}
                  showFullIp={showFullIp}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              No other active sessions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This is the only device logged into your account
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Session Card Component
interface SessionCardProps {
  session: Session;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRevoke: () => void;
  isRevoking: boolean;
  isCurrent?: boolean;
  isSuspicious?: boolean;
  onTrust?: () => void;
  onUntrust?: () => void;
  isTrusting?: boolean;
  showFullIp?: boolean;
}

function SessionCard({
  session,
  isExpanded,
  onToggleExpand,
  onRevoke,
  isRevoking,
  isCurrent = false,
  isSuspicious = false,
  onTrust,
  onUntrust,
  isTrusting = false,
  showFullIp = false,
}: SessionCardProps) {
  const DeviceIcon = getDeviceIcon(session.deviceType);
  const osInfo = getOSInfo(session.os);

  return (
    <div className={cn(
      "transition-colors",
      isSuspicious && "bg-amber-50/50 dark:bg-amber-900/10"
    )}>
      {/* Main Row */}
      <div
        className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Device Icon */}
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
              osInfo.bgColor
            )}>
              <DeviceIcon className={cn("h-5 w-5", osInfo.color)} />
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {session.browser || "Unknown Browser"}
                </span>
                {isCurrent && (
                  <Badge variant="success" size="sm">
                    This device
                  </Badge>
                )}
                {session.isTrusted && (
                  <Badge variant="default" size="sm" className="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Trusted
                  </Badge>
                )}
                {session.isVpnDetected && (
                  <Badge variant="danger" size="sm">
                    <WifiOff className="h-3 w-3 mr-1" />
                    VPN
                  </Badge>
                )}
                {isSuspicious && !session.isVpnDetected && (
                  <Badge variant="warning" size="sm">
                    Review
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="truncate">{session.os || "Unknown OS"}</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{getTimeAgo(session.lastActivityAt)}</span>
                </div>
                {(session.city || session.country) && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {session.city && session.country
                          ? `${session.city}, ${session.country}`
                          : session.city || session.country}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <ChevronDown
              className={cn(
                "h-5 w-5 text-gray-400 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 space-y-4">
            {/* Location & IP Card */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                session.isVpnDetected
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-brand-100 dark:bg-brand-900/30"
              )}>
                <MapPin className={cn(
                  "h-5 w-5",
                  session.isVpnDetected
                    ? "text-red-600 dark:text-red-400"
                    : "text-brand-600 dark:text-brand-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {session.browserCity || session.browserCountry ? "GPS Location" : "IP Location"}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {session.browserCity && session.browserCountry
                    ? `${session.browserCity}, ${session.browserCountry}`
                    : session.city && session.country
                    ? `${session.city}, ${session.country}`
                    : session.country || session.city || "Unknown location"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">IP Address</p>
                <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
                  {maskIpAddress(session.ipAddress, showFullIp)}
                </p>
              </div>
            </div>

            {/* VPN Warning */}
            {session.isVpnDetected && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    VPN or Proxy Detected
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    IP location ({session.city || "Unknown"}, {session.country || "Unknown"})
                    differs from GPS location ({session.browserCity || "Unknown"}, {session.browserCountry || "Unknown"})
                  </p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Device</p>
                <p className="text-gray-900 dark:text-white capitalize">
                  {session.deviceType || "Desktop"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Browser</p>
                <p className="text-gray-900 dark:text-white">
                  {session.browser || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Active</p>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(session.lastActivityAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Session Started</p>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(session.createdAt)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {session.isTrusted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUntrust?.();
                  }}
                  disabled={isTrusting}
                >
                  {isTrusting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-1.5" />
                      Remove Trust
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrust?.();
                  }}
                  disabled={isTrusting}
                  className="text-brand-600 border-brand-200 hover:bg-brand-50 dark:border-brand-800 dark:hover:bg-brand-900/20"
                >
                  {isTrusting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      Trust Device
                    </>
                  )}
                </Button>
              )}
              {!isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevoke();
                  }}
                  disabled={isRevoking}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  {isRevoking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Revoke Session
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
