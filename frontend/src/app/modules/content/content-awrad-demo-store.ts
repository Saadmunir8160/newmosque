import { WirdCollectionDetail } from '../../core/services/content-editor.service';
import { WirdCollection } from '../../core/models';

const DELETED_KEY = 'awrad-demo-deleted-ids';
const COLLECTION_PREFIX = 'awrad-fallback-';

export function getDemoDeletedIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(DELETED_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

export function markDemoDeleted(id: number): void {
  const ids = getDemoDeletedIds();
  ids.add(id);
  sessionStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
  sessionStorage.removeItem(`${COLLECTION_PREFIX}${id}`);
}

export function saveDemoCollection(detail: WirdCollectionDetail): void {
  try {
    sessionStorage.setItem(`${COLLECTION_PREFIX}${detail.collection.id}`, JSON.stringify(detail));
  } catch { /* ignore */ }
}

export function loadDemoCollection(id: number): WirdCollectionDetail | null {
  try {
    const raw = sessionStorage.getItem(`${COLLECTION_PREFIX}${id}`);
    return raw ? JSON.parse(raw) as WirdCollectionDetail : null;
  } catch {
    return null;
  }
}

export function listDemoCollectionSummaries(fallback: WirdCollection[]): WirdCollection[] {
  const deleted = getDemoDeletedIds();
  const map = new Map<number, WirdCollection>();

  for (const c of fallback) {
    if (!deleted.has(c.id)) map.set(c.id, c);
  }

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith(COLLECTION_PREFIX)) continue;
    const id = Number(key.slice(COLLECTION_PREFIX.length));
    if (!id || deleted.has(id)) continue;
    const detail = loadDemoCollection(id);
    if (detail?.collection) map.set(id, detail.collection);
  }

  return [...map.values()].sort((a, b) => a.id - b.id);
}

export function nextDemoCollectionId(): number {
  const ids = listDemoCollectionSummaries([{ id: 1, name: '', tariqa: 'General', type: 'Daily' }]).map(c => c.id);
  return Math.max(1, ...ids, 0) + 1;
}
