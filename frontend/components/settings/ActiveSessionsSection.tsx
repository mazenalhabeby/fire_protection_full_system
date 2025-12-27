"use client";

import { useState, useEffect } from "react";
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
  Chrome,
  Apple,
  Laptop,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import type { Session } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

// Session limits (should match backend)
const MAX_SESSIONS_PER_USER = 5;

// Browser icons mapping
const getBrowserIcon = (browser: string | null) => {
  if (!browser) return Globe;
  const b = browser.toLowerCase();
  if (b.includes("chrome")) return Chrome;
  if (b.includes("safari")) return Apple;
  if (b.includes("firefox")) return Globe;
  if (b.includes("edge")) return Globe;
  return Globe;
};

// Device icon mapping
const getDeviceIcon = (deviceType: string | null) => {
  if (!deviceType) return Monitor;
  const d = deviceType.toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) return Smartphone;
  if (d.includes("tablet") || d.includes("ipad")) return Tablet;
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
const maskIpAddress = (ip: string | null) => {
  if (!ip) return "Unknown";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  // IPv6
  if (ip.includes(":")) {
    const v6Parts = ip.split(":");
    if (v6Parts.length >= 4) {
      return `${v6Parts[0]}:${v6Parts[1]}:****:****`;
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

  // Different country than current session
  if (currentSession?.country && session.country && session.country !== currentSession.country) {
    return true;
  }

  return false;
};

export function ActiveSessionsSection() {
  const { getSessions, revokeSession, logoutAllOtherSessions, currentSession } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

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

  const currentSessionData = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);
  const suspiciousSessions = otherSessions.filter((s) => isSessionSuspicious(s, currentSessionData || null));

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                suspiciousSessions.length > 0
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              )}>
                {suspiciousSessions.length > 0 ? (
                  <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Active Sessions
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {sessions.length} of {MAX_SESSIONS_PER_USER} sessions used
                  </p>
                  {suspiciousSessions.length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 text-sm">
                      • {suspiciousSessions.length} needs attention
                    </span>
                  )}
                </div>
                {/* Session usage progress bar */}
                <div className="mt-2 w-48">
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        sessions.length >= MAX_SESSIONS_PER_USER
                          ? "bg-amber-500"
                          : sessions.length >= MAX_SESSIONS_PER_USER - 1
                          ? "bg-yellow-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${(sessions.length / MAX_SESSIONS_PER_USER) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadSessions(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              {otherSessions.length > 0 && (
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
                  Revoke All Others
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Security Alert */}
        {suspiciousSessions.length > 0 && (
          <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Suspicious activity detected
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  {suspiciousSessions.length} session{suspiciousSessions.length !== 1 ? "s" : ""} from
                  {suspiciousSessions.length === 1 ? " a different location" : " different locations"}.
                  If you don't recognize these, revoke them immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Session */}
        {currentSessionData && (
          <div className="p-6 bg-brand-50/50 dark:bg-brand-900/10 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                Current Session
              </span>
            </div>
            <SessionCard
              session={currentSessionData}
              isExpanded={expandedSession === currentSessionData.id}
              onToggleExpand={() => setExpandedSession(
                expandedSession === currentSessionData.id ? null : currentSessionData.id
              )}
              onRevoke={() => {}}
              isRevoking={false}
              isCurrent={true}
            />
          </div>
        )}

        {/* Other Sessions */}
        {otherSessions.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {otherSessions.map((session) => (
              <div key={session.id} className="p-6">
                <SessionCard
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggleExpand={() => setExpandedSession(
                    expandedSession === session.id ? null : session.id
                  )}
                  onRevoke={() => handleRevokeSession(session.id)}
                  isRevoking={revokingSessionId === session.id}
                  isSuspicious={isSessionSuspicious(session, currentSessionData || null)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No other active sessions
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              This is the only device logged into your account
            </p>
          </div>
        )}
      </div>

      {/* How Sessions Work */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          How Sessions Work
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <span>Each unique device (browser + OS) gets <strong>one session</strong>. Logging in again from the same device reuses the existing session.</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">2</span>
            </div>
            <span>You can have up to <strong>{MAX_SESSIONS_PER_USER} active sessions</strong> at once. Oldest sessions are automatically removed when you exceed this limit.</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">3</span>
            </div>
            <span>Inactive sessions expire automatically and are cleaned up regularly.</span>
          </li>
        </ul>
      </div>

      {/* Security Tips */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-500" />
          Security Tips
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Regularly review your active sessions and revoke any you don't recognize</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Use "Revoke All Others" after changing your password</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Sessions from unusual locations are flagged for your review</span>
          </li>
        </ul>
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
}

function SessionCard({
  session,
  isExpanded,
  onToggleExpand,
  onRevoke,
  isRevoking,
  isCurrent = false,
  isSuspicious = false,
}: SessionCardProps) {
  const DeviceIcon = getDeviceIcon(session.deviceType);
  const osInfo = getOSInfo(session.os);

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      isCurrent
        ? "border-brand-200 dark:border-brand-800 bg-white dark:bg-gray-900"
        : isSuspicious
        ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    )}>
      {/* Main Row */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Expand/Collapse Arrow */}
            <div className="flex items-center justify-center w-6">
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-400 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              osInfo.bgColor
            )}>
              <DeviceIcon className={cn("h-6 w-6", osInfo.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {session.browser || "Unknown Browser"}
                </span>
                {isCurrent && (
                  <Badge variant="success" size="sm">
                    This device
                  </Badge>
                )}
                {isSuspicious && (
                  <Badge variant="warning" size="sm">
                    Review
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{session.os || "Unknown OS"}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{getTimeAgo(session.lastActivityAt)}</span>
                </div>
              </div>
              {/* Location row */}
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {session.city && session.country
                    ? `${session.city}, ${session.country}`
                    : session.country
                    ? session.country
                    : session.city
                    ? session.city
                    : "Location unavailable"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevoke();
                }}
                disabled={isRevoking}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {isRevoking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    Revoke
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
            {/* Location Card */}
            <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Location</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {session.city && session.country
                      ? `${session.city}, ${session.country}`
                      : session.country
                      ? session.country
                      : session.city
                      ? session.city
                      : "Location unavailable (local network)"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">IP Address</p>
                  <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
                    {maskIpAddress(session.ipAddress)}
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Device Type</p>
                <p className="text-gray-900 dark:text-white capitalize">
                  {session.deviceType || "Desktop"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Browser</p>
                <p className="text-gray-900 dark:text-white">
                  {session.browser || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Operating System</p>
                <p className="text-gray-900 dark:text-white">
                  {session.os || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Last Active</p>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(session.lastActivityAt)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 dark:text-gray-400 mb-1">Session Started</p>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(session.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
