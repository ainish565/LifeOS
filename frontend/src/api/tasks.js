import { apiFetch } from './client'

// Shared cache key so every view (sidebar badge, Tasks page) sees the same counts
export const TASK_STATS_QUERY_KEY = ['tasks', 'stats']

export function fetchTaskStats() {
  return apiFetch('/api/tasks/stats')
}
