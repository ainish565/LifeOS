import { apiFetch } from './client'

export const EVENTS_QUERY_KEY = ['events']
export const CALENDAR_FEED_QUERY_KEY = ['calendar', 'feed']

export function fetchEvents(params = {}) {
  const query = new URLSearchParams()
  if (params.month) query.set('month', params.month)
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  if (params.category) query.set('category', params.category)
  const qs = query.toString()
  return apiFetch(`/api/events/${qs ? '?' + qs : ''}`)
}

export function fetchCalendarFeed(month) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/api/events/calendar${qs}`)
}

export function createEvent(payload) {
  return apiFetch('/api/events/', {
    method: 'POST',
    body: payload,
  })
}

export function updateEvent(id, payload) {
  return apiFetch(`/api/events/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteEvent(id) {
  return apiFetch(`/api/events/${id}`, {
    method: 'DELETE',
  })
}
