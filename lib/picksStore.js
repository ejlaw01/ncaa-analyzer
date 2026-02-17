/**
 * Simple in-memory store for generated picks.
 * On Vercel, this persists within a single serverless function instance.
 * For MVP this is sufficient; Phase 2 would use Supabase.
 */

let storedPicks = null;

export function getStoredPicks() {
  return storedPicks;
}

export function setStoredPicks(picks) {
  storedPicks = picks;
}

export function clearStoredPicks() {
  storedPicks = null;
}
