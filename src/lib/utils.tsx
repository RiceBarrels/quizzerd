import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with proper conflict resolution
 * Combines clsx for conditional classes and twMerge for Tailwind class merging
 * @param {...ClassValue[]} inputs - Variable number of class values (strings, objects, arrays)
 * @returns {string} Merged and deduplicated class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
