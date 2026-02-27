import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getMatchStatus(status: string): {
  label: string
  color: string
} {
  const statusMap: Record<string, { label: string; color: string }> = {
    'Match not started': { label: 'Upcoming', color: 'blue' },
    'Match in progress': { label: 'Live', color: 'green' },
    'Match finished': { label: 'Finished', color: 'gray' },
    'Match abandoned': { label: 'Abandoned', color: 'red' },
  }
  return statusMap[status] || { label: status, color: 'gray' }
}
