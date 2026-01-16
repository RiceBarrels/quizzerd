"use client";

import { cn } from "@/lib/utils";

interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  className?: string;
  barColor?: string;
  showLabels?: boolean;
  height?: number;
}

export function SimpleBarChart({
  data,
  className,
  barColor = "bg-primary",
  showLabels = true,
  height = 120
}: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-end justify-between gap-1 sm:gap-2"
        style={{ height: `${height}px` }}
      >
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * 100;
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs text-muted-foreground font-medium">
                {point.value > 0 ? point.value : ''}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all duration-300",
                  barColor,
                  point.value === 0 && "bg-muted"
                )}
                style={{
                  height: `${Math.max(barHeight, point.value > 0 ? 8 : 4)}%`,
                  minHeight: point.value > 0 ? '8px' : '4px'
                }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-between mt-2">
          {data.map((point, index) => (
            <div key={index} className="flex-1 text-center">
              <span className="text-xs text-muted-foreground">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface StatRingProps {
  value: number;
  max?: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function StatRing({
  value,
  max = 100,
  label,
  size = 80,
  strokeWidth = 8,
  className
}: StatRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
