import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from "axios"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps HTTP status codes to user-friendly error messages.
 * Each call-site provides its own `statusMap` tailored to that specific action,
 * so the same HTTP status code can return a different message in different contexts.
 *
 * @param err       - The caught error (any type)
 * @param statusMap - Per-action map of HTTP status : friendly message
 * @param fallback  - Shown when no status matches or there's no HTTP response 
 */
export function getFriendlyError(
  err: unknown,
  statusMap: Record<number, string>,
  fallback: string,
): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status !== undefined && statusMap[status]) return statusMap[status];
    // Network error (no response at all)
    if (!err.response) return "Network error, please check your connection.";
  }
  return fallback;
}
