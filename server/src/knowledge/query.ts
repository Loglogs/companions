import path from "node:path";
import fs from "node:fs";
import { loadMemory, memoryStrength, bumpReinforced } from "./memory.js";

const VAULT_ROOT = process.env.COMPANION_VAULT
  ? path.resolve(process.env.COMPANION_VAULT)
  : path.resolve(process.cwd(), "..");

export interface QueryResult {
  answer: string;
  sources: string[];
  chunks: { path: string; heading: string; text: string; score?: number }[];
}

/**
 * Karpathy-style page selection: scan _index.md entries for keyword overlap with input.
 * Returns up to topK wiki page paths with the highest word-overlap score.
 */
export function findRelatedFromIndex(
  indexContent: string,
  inputText: string,
  topK: number,
  filter?: string[]
): string[] {
  const inputWords = new Set((inputText.toLowerCase().match(/\b\w{4,}\b/g) ?? []));
  const scored: { path: string; score: number }[] = [];

  for (const line of indexContent.split('\n')) {
    const pathMatch = line.match(/\[\[([^\]|]+)/);
    if (!pathMatch) continue;
    const p = pathMatch[1].trim();
    if (!p.startsWith('wiki/') || p.includes('_index') || p.includes('log.md')) continue;
    if (filter && filter.length > 0 && !filter.some(f => p.startsWith(f))) continue;

    const words = line.toLowerCase().match(/\b\w{4,}\b/g) ?? [];
    const score = words.filter(w => {
      if (inputWords.has(w)) return true;
      if (w.length >= 5) return [...inputWords].some(iw => iw.length >= 5 && (iw.includes(w) || w.includes(iw)));
      return false;
    }).length;
    if (score > 0) scored.push({ path: p, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(e => e.path);
}

/**
 * Load the last N raw dumps as working memory (most recent files by filename sort).
 */
async function loadWorkingMemory(count = 5): Promise<string> {
  const rawDir = path.join(VAULT_ROOT, "raw");
  try {
    const files = (await fs.promises.readdir(rawDir))
      .filter(f => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md")
      .sort()
      .slice(-count);

    const parts: string[] = [];
    for (const f of files) {
      const content = await fs.promises.readFile(path.join(rawDir, f), "utf-8").catch(() => null);
      if (content) parts.push(`[Recent: raw/${f}]\n${content.slice(0, 1000)}`);
    }
    return parts.join("\n\n---\n\n");
  } catch {
    return "";
  }
}

/**
 * Query knowledge with inverted memory scoring.
 * - Widens candidate pool to 10 keyword matches
 * - Scores each by memory strength (older + more-reinforced = higher)
 * - Takes top 4 by strength
 * - Injects last 5 raw dumps as working memory context
 * - Bumps reinforced count for pages used
 */
export async function queryKnowledge(question: string, topK: number = 6, filter?: string[]): Promise<QueryResult> {
  const indexPath = path.join(VAULT_ROOT, "wiki", "_index.md");
  let indexContent = "";
  try { indexContent = await fs.promises.readFile(indexPath, "utf-8"); } catch { /* no index yet */ }

  if (!indexContent.trim()) {
    return { answer: "No wiki index found.", sources: [], chunks: [] };
  }

  // Widen candidate pool to 10, then score by memory strength
  const candidates = findRelatedFromIndex(indexContent, question, 10, filter);

  if (candidates.length === 0) {
    return { answer: "No relevant knowledge found.", sources: [], chunks: [] };
  }

  // Score candidates by memory strength (older + reinforced = higher)
  const memory = await loadMemory();
  const scored = await Promise.all(candidates.map(async (p) => {
    let strength: number;
    if (memory[p]) {
      strength = memoryStrength(memory[p]);
    } else {
      // Unknown page: use file mtime as proxy for age
      const abs = path.join(VAULT_ROOT, p.endsWith(".md") ? p : `${p}.md`);
      try {
        const stat = await fs.promises.stat(abs);
        const ageDays = (Date.now() - stat.mtimeMs) / 86_400_000;
        strength = ageDays; // reinforced=0 for untracked pages
      } catch {
        strength = 0;
      }
    }
    return { path: p, strength };
  }));

  // Sort descending by strength (oldest/most-reinforced first)
  scored.sort((a, b) => b.strength - a.strength);
  const topPages = scored.slice(0, 4).map(e => e.path);

  console.log(`[query] ${candidates.length} candidates → top 4 by memory strength: ${topPages.join(", ")}`);

  // Read full pages
  const contextParts: string[] = [];
  const sources: string[] = [];

  for (const p of topPages) {
    const abs = path.join(VAULT_ROOT, p.endsWith(".md") ? p : `${p}.md`);
    try {
      const content = await fs.promises.readFile(abs, "utf-8");
      contextParts.push(`[Source: ${p}]\n${content}`);
      sources.push(p);
    } catch { /* file may have been deleted */ }
  }

  // Inject working memory (last 5 raw dumps)
  const workingMemory = await loadWorkingMemory(5);
  if (workingMemory) {
    contextParts.push(`[Working Memory — Recent Dumps]\n${workingMemory}`);
    sources.push("raw/working-memory");
  }

  // Always include the index
  contextParts.push(`[Source: wiki/_index.md]\n${indexContent}`);
  if (!sources.includes("wiki/_index.md")) sources.push("wiki/_index.md");

  // Bump reinforced count for pages used (fire-and-forget)
  bumpReinforced(topPages).catch(() => {});

  return {
    answer: contextParts.join("\n\n---\n\n"),
    sources,
    chunks: sources
      .filter(s => s !== "wiki/_index.md" && s !== "raw/working-memory")
      .map(s => ({
        path: s,
        heading: "",
        text: contextParts.find(c => c.startsWith(`[Source: ${s}]`))?.slice(0, 500) ?? "",
      })),
  };
}
