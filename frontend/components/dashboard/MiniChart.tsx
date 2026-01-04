"use client";

import React, { useMemo, useId } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MiniChartProps {
  data: number[];
  changePercent: number;
  changeLabel?: string;
  noDataLabel?: string;
  width?: number;
  height?: number;
  color?: string;
  showStats?: boolean;
  className?: string;
}

export const MiniChart = React.memo(function MiniChart({
  data,
  changePercent,
  changeLabel = "Last 7 days",
  noDataLabel = "No activity yet",
  width = 300,
  height = 80,
  color = "rgb(249, 115, 22)",
  showStats = true,
  className,
}: MiniChartProps) {
  const { chartPath, chartAreaPath, lastY } = useMemo(() => {
    const padding = 5;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const xStep = width / (data.length - 1);

    const coords = data.map((point, i) => ({
      x: i * xStep,
      y: padding + (height - 2 * padding) - ((point - min) / range) * (height - 2 * padding),
    }));

    // Generate smooth curve using quadratic bezier
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x + (midX - prev.x) * 0.5} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
      path += ` T ${curr.x} ${curr.y}`;
    }

    const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
    const lastPointY = coords[coords.length - 1]?.y ?? height / 2;

    return {
      chartPath: path,
      chartAreaPath: areaPath,
      lastY: lastPointY,
    };
  }, [data, width, height]);

  const gradientId = useId();

  const TrendIcon = changePercent > 0 ? TrendingUp : changePercent < 0 ? TrendingDown : Minus;
  const isPositive = changePercent > 0;
  const isNeutral = changePercent === 0;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Chart */}
      <div className="relative flex-1 h-24">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Gradient fill definition */}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={chartAreaPath} fill={`url(#${gradientId})`} />

          {/* Line */}
          <path
            d={chartPath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* End dot with glow */}
          <circle cx={width} cy={lastY} r="6" fill={color} opacity="0.3" />
          <circle cx={width} cy={lastY} r="4" fill={color} />
        </svg>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="text-right shrink-0">
          {isNeutral ? (
            <>
              <p className="text-brand-400 text-lg font-bold flex items-center justify-end gap-1">
                0%
              </p>
              <p className="text-gray-400 text-xs">{noDataLabel}</p>
            </>
          ) : (
            <>
              <p
                className={cn(
                  "text-lg font-bold flex items-center justify-end gap-1",
                  isPositive ? "text-brand-400" : "text-red-400"
                )}
              >
                <TrendIcon className="h-4 w-4" />
                {isPositive ? "+" : ""}
                {changePercent}%
              </p>
              <p className="text-gray-400 text-xs">{changeLabel}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default MiniChart;
