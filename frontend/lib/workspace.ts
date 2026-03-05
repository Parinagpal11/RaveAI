export const TOPIC_KEY = 'rave_topic';
export const SELECTED_KEY = 'rave_selected_papers';

export function getTopic(defaultValue = ''): string {
  if (typeof window === 'undefined') return defaultValue;
  return localStorage.getItem(TOPIC_KEY) || defaultValue;
}

export function setTopic(topic: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOPIC_KEY, topic);
}

export function getSelectedPaperIds(): number[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SELECTED_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  } catch {
    return [];
  }
}

export function setSelectedPaperIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SELECTED_KEY, JSON.stringify([...new Set(ids)]));
}

export function toggleSelectedPaper(id: number): number[] {
  const current = getSelectedPaperIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  setSelectedPaperIds(next);
  return next;
}
