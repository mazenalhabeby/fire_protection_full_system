"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Crown, Star, Zap, Trophy, ChevronRight, Lock } from "lucide-react";
import type { AffiliateTier } from "@/types/api";

interface AffiliateTierCardProps {
  currentTier?: AffiliateTier;
  nextTier?: AffiliateTier;
  progress?: number;
  totalReferrals: number;
  totalVolume: string;
  className?: string;
}

const tierIcons: Record<number, React.ReactNode> = {
  1: <Star className="h-5 w-5" />,
  2: <Zap className="h-5 w-5" />,
  3: <Trophy className="h-5 w-5" />,
  4: <Crown className="h-5 w-5" />,
};

const tierColors: Record<number, string> = {
  1: "from-gray-400 to-gray-500",
  2: "from-blue-400 to-blue-600",
  3: "from-purple-400 to-purple-600",
  4: "from-amber-400 to-amber-600",
};

export function AffiliateTierCard({
  currentTier,
  nextTier,
  progress = 0,
  totalReferrals,
  totalVolume,
  className,
}: AffiliateTierCardProps) {
  const tierLevel = currentTier?.level || 1;
  const tierName = currentTier?.name || "Starter";
  const commissionRate = currentTier?.commissionRate || "5";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Tier</CardTitle>
          <Badge
            className={cn(
              "bg-gradient-to-r text-white border-0 px-3 py-1",
              tierColors[tierLevel]
            )}
          >
            {tierIcons[tierLevel]}
            <span className="ml-1">{tierName}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier Info */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br",
                  tierColors[tierLevel]
                )}
              >
                {tierIcons[tierLevel]}
              </div>
              <div>
                <p className="font-semibold text-foreground">{tierName}</p>
                <p className="text-sm text-muted-foreground">Level {tierLevel}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{commissionRate}%</p>
              <p className="text-xs text-muted-foreground">Commission Rate</p>
            </div>
          </div>

          {/* Benefits */}
          {currentTier?.benefits && currentTier.benefits.length > 0 && (
            <div className="space-y-1 mt-3 pt-3 border-t border-primary/10">
              {currentTier.benefits.slice(0, 3).map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {benefit}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTier.name}</span>
              <span className="font-medium text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-500",
                  tierColors[nextTier.level]
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {totalReferrals} / {nextTier.minReferrals} referrals
              </span>
              <span>
                ${parseFloat(totalVolume).toLocaleString()} / $
                {parseFloat(nextTier.minVolume).toLocaleString()} volume
              </span>
            </div>
          </div>
        )}

        {/* Next Tier Preview */}
        {nextTier && (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br opacity-60",
                    tierColors[nextTier.level]
                  )}
                >
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{nextTier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {nextTier.commissionRate}% commission
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
