// API base is set per environment via .env / .env.production
// Dev: empty string (Vite proxy handles /api/* → localhost/edu/api/*)
// Prod: '/edu' so fetch('/api/topics') becomes '/edu/api/topics'
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}
