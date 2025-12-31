"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Loader2,
  RefreshCw,
  LogIn,
  LogOut,
  AlertTriangle,
  MapPin,
  Globe,
  History,
  Filter,
  ChevronDown,
  Eye,
  EyeOff,
  Fingerprint,
  Zap,
  Activity,
} from "lucide-react";
import type { SessionActivity } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

// Activity categories for filtering
type ActivityCategory = "all" | "security" | "access" | "location";

// Activity severity levels
type Severity = "info" | "success" | "warning" | "danger";

// Activity type configuration
interface ActivityTypeConfig {
  icon: React.ElementType;
  label: string;
  description: string;
  severity: Severity;
  category: ActivityCategory;
}

const activityConfig: Record<string, ActivityTypeConfig> = {
  login: {
    icon: LogIn,
    label: "Sign In",
    description: "Successfully signed into your account",
    severity: "success",
    category: "access",
  },
  logout: {
    icon: LogOut,
    label: "Sign Out",
    description: "Signed out of your account",
    severity: "info",
    category: "access",
  },
  session_reused: {
    icon: RefreshCw,
    label: "Session Resumed",
    description: "Continued an existing session",
    severity: "info",
    category: "access",
  },
  token_refresh: {
    icon: Zap,
    label: "Token Refreshed",
    description: "Session token was renewed",
    severity: "info",
    category: "access",
  },
  device_trusted: {
    icon: ShieldCheck,
    label: "Device Trusted",
    description: "Marked this device as trusted",
    severity: "success",
    category: "security",
  },
  device_untrusted: {
    icon: Shield,
    label: "Trust Removed",
    description: "Removed trust from this device",
    severity: "info",
    category: "security",
  },
  ip_country_change: {
    icon: MapPin,
    label: "Location Changed",
    description: "Access from a different country detected",
    severity: "warning",
    category: "location",
  },
  continent_change: {
    icon: Globe,
    label: "Region Changed",
    description: "Access from a different continent detected",
    severity: "warning",
    category: "location",
  },
  impossible_travel: {
    icon: AlertTriangle,
    label: "Suspicious Location",
    description: "Impossible travel detected - potential security risk",
    severity: "danger",
    category: "location",
  },
  new_location: {
    icon: Globe,
    label: "New Location",
    description: "First access from this location",
    severity: "warning",
    category: "location",
  },
  refresh_failure: {
    icon: ShieldAlert,
    label: "Refresh Failed",
    description: "Token refresh attempt failed",
    severity: "warning",
    category: "security",
  },
  session_revoked: {
    icon: ShieldAlert,
    label: "Session Revoked",
    description: "Session was terminated for security",
    severity: "danger",
    category: "security",
  },
  fingerprint_mismatch: {
    icon: Fingerprint,
    label: "Device Mismatch",
    description: "Device fingerprint didn't match",
    severity: "danger",
    category: "security",
  },
  vpn_detected: {
    icon: AlertTriangle,
    label: "VPN Detected",
    description: "VPN or proxy connection detected",
    severity: "warning",
    category: "location",
  },
};

const getActivityConfig = (action: string): ActivityTypeConfig => {
  return activityConfig[action] || {
    icon: Activity,
    label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Activity recorded",
    severity: "info",
    category: "security",
  };
};

const severityStyles: Record<Severity, { bg: string; icon: string; ring: string; badge: string }> = {
  info: {
    bg: "bg-gray-100 dark:bg-gray-800",
    icon: "text-gray-600 dark:text-gray-400",
    ring: "ring-gray-200 dark:ring-gray-700",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  success: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-200 dark:ring-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-200 dark:ring-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  danger: {
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: "text-red-600 dark:text-red-400",
    ring: "ring-red-200 dark:ring-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
};

// Date grouping helpers
const getDateGroup = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);
  const thisMonth = new Date(today);
  thisMonth.setDate(thisMonth.getDate() - 30);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= thisWeek) return "This Week";
  if (date >= thisMonth) return "This Month";
  return "Earlier";
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatFullDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Mask IP address for privacy
const maskIpAddress = (ip: string | null, showFull: boolean) => {
  if (!ip) return "Unknown";
  if (showFull) return ip;

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  // IPv6
  if (ip.includes(":")) {
    if (ip === "::1") return "localhost";
    const v6Parts = ip.split(":");
    if (v6Parts.length >= 2) {
      return `${v6Parts[0]}:${v6Parts[1]}:****`;
    }
  }
  return ip.slice(0, 8) + "***";
};

// Parse activity details JSON and extract readable info
interface ParsedDetails {
  device?: string;
  city?: string;
  country?: string;
  ipAddress?: string;
  description?: string;
}

const parseActivityDetails = (details: string | null): ParsedDetails | null => {
  if (!details) return null;

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(details);
    return parsed;
  } catch {
    // If not JSON, return as description
    return { description: details };
  }
};

// Format activity details for display
const formatActivityDescription = (
  activity: SessionActivity,
  defaultDescription: string
): string => {
  const parsed = parseActivityDetails(activity.details);

  if (!parsed) return defaultDescription;

  // If it's just a string description
  if (parsed.description && !parsed.device && !parsed.city) {
    return parsed.description;
  }

  // Build a readable description from the parsed data
  const parts: string[] = [];

  if (parsed.device) {
    parts.push(parsed.device);
  }

  if (parsed.city && parsed.country) {
    parts.push(`from ${parsed.city}, ${parsed.country}`);
  } else if (parsed.city) {
    parts.push(`from ${parsed.city}`);
  } else if (parsed.country) {
    parts.push(`from ${parsed.country}`);
  }

  return parts.length > 0 ? parts.join(" ") : defaultDescription;
};

// Filter tabs configuration
const filterTabs: { id: ActivityCategory; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: Activity },
  { id: "security", label: "Security", icon: Shield },
  { id: "access", label: "Access", icon: LogIn },
  { id: "location", label: "Location", icon: MapPin },
];

export function SessionActivitySection() {
  const { getSessionActivities } = useAuth();
  const [activities, setActivities] = useState<SessionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<ActivityCategory>("all");
  const [showFullIp, setShowFullIp] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadActivities = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const data = await getSessionActivities(100);
      setActivities(data);
    } catch (error) {
      toast.error("Failed to load security activity");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  // Filter and group activities
  const { filteredActivities, groupedActivities, stats } = useMemo(() => {
    const filtered = filter === "all"
      ? activities
      : activities.filter((a) => getActivityConfig(a.action).category === filter);

    const grouped = filtered.reduce((acc, activity) => {
      const group = getDateGroup(activity.createdAt);
      if (!acc[group]) acc[group] = [];
      acc[group].push(activity);
      return acc;
    }, {} as Record<string, SessionActivity[]>);

    // Calculate stats
    const securityEvents = activities.filter(
      (a) => getActivityConfig(a.action).severity === "warning" ||
             getActivityConfig(a.action).severity === "danger"
    ).length;

    const recentLogins = activities.filter(
      (a) => a.action === "login" &&
             new Date(a.createdAt) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      filteredActivities: filtered,
      groupedActivities: grouped,
      stats: { securityEvents, recentLogins, total: activities.length }
    };
  }, [activities, filter]);

  const dateOrder = ["Today", "Yesterday", "This Week", "This Month", "Earlier"];

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/30 dark:to-brand-800/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading activity...</p>
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                  <History className="h-7 w-7 text-white" />
                </div>
                {stats.securityEvents > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{stats.securityEvents}</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Security Activity
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Monitor all security events on your account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullIp(!showFullIp)}
                className="text-gray-500 hover:text-gray-700"
              >
                {showFullIp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadActivities(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Events</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">24h Logins</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{stats.recentLogins}</p>
            </div>
            <div className={cn(
              "p-3 rounded-xl border",
              stats.securityEvents > 0
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700"
            )}>
              <div className="flex items-center gap-2">
                <ShieldAlert className={cn(
                  "h-4 w-4",
                  stats.securityEvents > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500"
                )} />
                <span className={cn(
                  "text-xs",
                  stats.securityEvents > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500 dark:text-gray-400"
                )}>Alerts</span>
              </div>
              <p className={cn(
                "mt-1 text-2xl font-semibold",
                stats.securityEvents > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-gray-900 dark:text-white"
              )}>{stats.securityEvents}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filteredActivities.length > 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
          {dateOrder.map((dateGroup) => {
            const items = groupedActivities[dateGroup];
            if (!items?.length) return null;

            return (
              <div key={dateGroup}>
                {/* Date Group Header */}
                <div className="sticky top-0 z-10 px-6 py-3 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {dateGroup}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {items.length} event{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Activity Items */}
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-700" />

                  {items.map((activity, index) => {
                    const config = getActivityConfig(activity.action);
                    const Icon = config.icon;
                    const styles = severityStyles[config.severity];
                    const isExpanded = expandedId === activity.id;
                    const isLast = index === items.length - 1;

                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          "relative",
                          !isLast && "border-b border-gray-50 dark:border-gray-800/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors",
                            "hover:bg-gray-50/50 dark:hover:bg-gray-800/30",
                            isExpanded && "bg-gray-50/80 dark:bg-gray-800/50"
                          )}
                          onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                        >
                          {/* Timeline dot */}
                          <div className="relative z-10 flex-shrink-0">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center ring-4 ring-white dark:ring-gray-900",
                              styles.bg
                            )}>
                              <Icon className={cn("h-5 w-5", styles.icon)} />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {config.label}
                                  </span>
                                  {config.severity !== "info" && (
                                    <span className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                      styles.badge
                                    )}>
                                      {config.severity === "success" && "Success"}
                                      {config.severity === "warning" && "Warning"}
                                      {config.severity === "danger" && "Alert"}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                  {formatActivityDescription(activity, config.description)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                  {formatTime(activity.createdAt)}
                                </span>
                                <ChevronDown className={cn(
                                  "h-4 w-4 text-gray-400 transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (() => {
                              const parsed = parseActivityDetails(activity.details);
                              const ipAddress = activity.ipAddress || parsed?.ipAddress;
                              const city = activity.city || parsed?.city;
                              const country = activity.country || parsed?.country;
                              const device = activity.device || parsed?.device;

                              return (
                                <div className="mt-4 p-4 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time</p>
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        {formatFullDate(activity.createdAt)}
                                      </p>
                                    </div>
                                    {ipAddress && (
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">IP Address</p>
                                        <p className="font-mono text-gray-900 dark:text-white">
                                          {maskIpAddress(ipAddress, showFullIp)}
                                        </p>
                                      </div>
                                    )}
                                    {(city || country) && (
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</p>
                                        <div className="flex items-center gap-1.5">
                                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                          <p className="font-medium text-gray-900 dark:text-white">
                                            {city && country
                                              ? `${city}, ${country}`
                                              : city || country}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    {device && (
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Device</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {device}
                                        </p>
                                      </div>
                                    )}
                                    {activity.userAgent && !device && (
                                      <div className="col-span-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">User Agent</p>
                                        <p className="text-gray-700 dark:text-gray-300 text-xs truncate">
                                          {activity.userAgent}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              {filter === "all" ? "No Activity Yet" : `No ${filterTabs.find(t => t.id === filter)?.label} Activity`}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filter === "all"
                ? "Activity will appear here as you use your account"
                : "Try selecting a different filter to see more activity"
              }
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Activity Types</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(severityStyles).map(([severity, styles]) => (
            <div key={severity} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", styles.bg)} />
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
