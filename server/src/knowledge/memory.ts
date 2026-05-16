import path from "node:path";
import fs from "node:fs";

const VAULT_ROOT = process.env.COMPANION_VAULT
  ? path.resolve(process.env.COMPANION_VAULT)
  : path.resolve(process.cwd(), "..");

const MEMORY_PATH = path.join(VAULT_ROOT, "wiki", "_memory.json");

export interface MemoryEntry {
  created: string;   // ISO date string YYYY-MM-DD
  reinforced: number; // count of times surfaced in Ask
}

export type MemoryStore = Record<string, MemoryEntry>;

export async function loadMemory(): Promise<MemoryStore> {
  try {
    const raw = await fs.promises.readFile(MEMORY_PATH, "utf-8");
    return JSON.parse(raw) as MemoryStore;
  } catch {
    return {};
  }
}

export async function saveMemory(store: MemoryStore): Promise<void> {
  try {
    await fs.promises.writeFile(MEMORY_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch { /* non-fatal */ }
}

export function memoryStrength(entry: MemoryEntry): number {
  const ageDays = (Date.now() - new Date(entry.created).getTime()) / 86_400_000;
  return ageDays + entry.reinforced * ageDays * 0.5;
}

/** Register a new wiki page. If already tracked, leave it alone. */
export async function registerPage(pagePath: string, reinforced = 0): Promise<void> {
  const store = await loadMemory();
  if (!store[pagePath]) {
    store[pagePath] = {
      created: new Date().toISOString().slice(0, 10),
      reinforced,
    };
    await saveMemory(store);
  }
}

/** Bump reinforced count for a list of pages. */
export async function bumpReinforced(pagePaths: string[]): Promise<void> {
  if (pagePaths.length === 0) return;
  const store = await loadMemory();
  for (const p of pagePaths) {
    if (store[p]) {
      store[p].reinforced += 1;
    }
  }
  await saveMemory(store);
}
