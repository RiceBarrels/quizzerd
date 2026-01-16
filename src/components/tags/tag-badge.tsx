"use client";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Tag {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  tag_category?: string;
}

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  size?: "sm" | "md";
  className?: string;
}

const colorClasses: Record<string, string> = {
  red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  pink: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
  orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

export function TagBadge({ tag, onRemove, size = "md", className }: TagBadgeProps) {
  const colorClass = colorClasses[tag.tag_color] || colorClasses.gray;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border",
        colorClass,
        size === "sm" ? "px-1.5 py-0 text-xs" : "px-2 py-0.5 text-xs",
        className
      )}
    >
      {tag.tag_name}
      {onRemove && (
        <X
          className={cn(
            "cursor-pointer hover:text-red-600 transition-colors",
            size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </Badge>
  );
}

export function TagBadgeGroup({
  tags,
  onRemove,
  size = "md",
  maxVisible = 3,
  className,
}: {
  tags: Tag[];
  onRemove?: (tagId: string) => void;
  size?: "sm" | "md";
  maxVisible?: number;
  className?: string;
}) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.tag_id}
          tag={tag}
          size={size}
          onRemove={onRemove ? () => onRemove(tag.tag_id) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <Badge variant="secondary" className={cn(
          size === "sm" ? "px-1.5 py-0 text-xs" : "px-2 py-0.5 text-xs"
        )}>
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}
