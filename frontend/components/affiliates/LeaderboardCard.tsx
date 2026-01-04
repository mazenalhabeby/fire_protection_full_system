"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Crown, Star, TrendingUp, Users } from "lucide-react";
import type { LeaderboardEntry, AffiliateTier } from "@/types/api";

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  myRank?: LeaderboardEntry;
  className?: string;
}

const rankStyles: Record<number, { bg: string; text: string; icon: React.ReactNode }> = {
  1: {
    bg: "bg-gradient-to-r from-amber-400 to-amber-500",
    text: "text-amber-900",
    icon: <Crown className="h-4 w-4" />,
  },
  2: {
    bg: "bg-gradient-to-r from-gray-300 to-gray-400",
    text: "text-gray-800",
    icon: <Medal className="h-4 w-4" />,
  },
  3: {
    bg: "bg-gradient-to-r from-amber-600 to-amber-700",
    text: "text-amber-100",
    icon: <Medal className="h-4 w-4" />,
  },
};

type Period = "all" | "month" | "week";

export function LeaderboardCard({ entries, myRank, className }: LeaderboardCardProps) {
  const [period, setPeriod] = useState<Period>("all");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Leaderboard</CardTitle>
          </div>
          <div className="flex gap-1">
            {(["week", "month", "all"] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="text-xs"
              >
                {p === "all" ? "All Time" : p === "month" ? "Month" : "Week"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Top 3 Podium */}
        <div className="flex items-end justify-center gap-2 py-4">
          {/* 2nd Place */}
          {entries[1] && (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
                  {entries[1].name?.[0] || entries[1].referralCode[0]}
                </span>
              </div>
              <div className="w-16 h-20 bg-gradient-to-t from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-t-lg flex flex-col items-center justify-end pb-2">
                <span className="text-xl font-bold text-gray-800 dark:text-gray-200">2</span>
              </div>
              <p className="text-xs text-center mt-1 text-muted-foreground truncate max-w-16">
                {entries[1].name || entries[1].referralCode.slice(0, 6)}
              </p>
            </div>
          )}

          {/* 1st Place */}
          {entries[0] && (
            <div className="flex flex-col items-center -mt-4">
              <Crown className="h-6 w-6 text-amber-500 mb-1" />
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 flex items-center justify-center mb-2">
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {entries[0].name?.[0] || entries[0].referralCode[0]}
                </span>
              </div>
              <div className="w-16 h-28 bg-gradient-to-t from-amber-400 to-amber-500 rounded-t-lg flex flex-col items-center justify-end pb-2">
                <span className="text-2xl font-bold text-amber-900">1</span>
              </div>
              <p className="text-xs text-center mt-1 font-medium truncate max-w-16">
                {entries[0].name || entries[0].referralCode.slice(0, 6)}
              </p>
            </div>
          )}

          {/* 3rd Place */}
          {entries[2] && (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-2">
                <span className="text-lg font-bold text-amber-700 dark:text-amber-500">
                  {entries[2].name?.[0] || entries[2].referralCode[0]}
                </span>
              </div>
              <div className="w-16 h-16 bg-gradient-to-t from-amber-600 to-amber-700 rounded-t-lg flex flex-col items-center justify-end pb-2">
                <span className="text-xl font-bold text-amber-100">3</span>
              </div>
              <p className="text-xs text-center mt-1 text-muted-foreground truncate max-w-16">
                {entries[2].name || entries[2].referralCode.slice(0, 6)}
              </p>
            </div>
          )}
        </div>

        {/* Rest of Leaderboard */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {entries.slice(3).map((entry) => (
            <div
              key={entry.referralCode}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                entry.isCurrentUser
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-secondary/50 hover:bg-secondary/80"
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  "bg-secondary text-muted-foreground"
                )}
              >
                {entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-medium truncate">
                    {entry.name || entry.referralCode}
                  </p>
                  {entry.isCurrentUser && (
                    <Badge variant="warning" size="sm">
                      You
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {entry.totalReferrals}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />$
                    {parseFloat(entry.totalVolume).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-primary font-semibold text-sm">
                {parseFloat(entry.totalEarnings).toLocaleString()} HBCT
              </p>
            </div>
          ))}
        </div>

        {/* My Rank (if not in top 10) */}
        {myRank && !entries.find((e) => e.isCurrentUser) && (
          <>
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 border-t border-dashed border-border" />
              <span className="text-xs text-muted-foreground">Your Position</span>
              <div className="flex-1 border-t border-dashed border-border" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-primary/20 text-primary">
                {myRank.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-medium truncate">
                    {myRank.name || myRank.referralCode}
                  </p>
                  <Badge variant="warning" size="sm">
                    You
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {myRank.totalReferrals} referrals
                </p>
              </div>
              <p className="text-primary font-semibold text-sm">
                {parseFloat(myRank.totalEarnings).toLocaleString()} HBCT
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
