// In production the API is served same-origin by the Cloud Run service;
// in local dev the Vite app runs on :5173 and the API on :3001.
export const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:3001");
export const SAVE_URL = `${API_BASE}/api/progress`;

export interface ProgressPayload {
  campaign: Record<string, string>;
  skirmish: { wins: number; losses: number };
}

export function getPlayerId(): string {
  const KEY = "wars.playerId";
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}

export async function saveProgress(progress: ProgressPayload): Promise<boolean> {
  try {
    const res = await fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: getPlayerId(), ...progress }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadProgress(): Promise<ProgressPayload | null> {
  try {
    const res = await fetch(`${SAVE_URL}?playerId=${encodeURIComponent(getPlayerId())}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { campaign: data.campaign ?? {}, skirmish: data.skirmish ?? { wins: 0, losses: 0 } };
  } catch {
    return null;
  }
}
