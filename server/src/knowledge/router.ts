import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response } from "express";
import { queryKnowledge } from "./query.js";
import { synthesiseKnowledge } from "../agent.js";

const VAULT_ROOT = process.env.COMPANION_VAULT
  ? path.resolve(process.env.COMPANION_VAULT)
  : path.resolve(process.cwd(), "..");

function walkMd(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (d.name.startsWith('.')) continue;
      const abs = path.join(dir, d.name);
      if (d.isDirectory()) results.push(...walkMd(abs));
      else if (d.name.endsWith('.md')) results.push(abs);
    }
  } catch {}
  return results;
}

function tokenise(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function createKnowledgeRouter(): Router {
  const router = Router();

  /**
   * POST /knowledge/query  body: { question: string, topK?: number }
   * Returns relevant chunks + formatted context for LLM injection.
   */
  router.post("/knowledge/query", async (req: Request, res: Response) => {
    const { question, topK } = req.body as { question?: string; topK?: number };
    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "question is required" });
      return;
    }
    try {
      const result = await queryKnowledge(question, typeof topK === "number" ? topK : 6);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[knowledge] query error:", err);
      res.status(500).json({ error: "Query failed", detail: String(err) });
    }
  });

  /**
   * POST /knowledge/ask  body: { question: string, topK?: number, filter?: string[] }
   * Retrieves relevant pages (Karpathy-style: full content) then asks the LLM to synthesise an answer.
   */
  router.post("/knowledge/ask", async (req: Request, res: Response) => {
    const { question, topK, filter } = req.body as { question?: string; topK?: number; filter?: string[] };
    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "question is required" });
      return;
    }

    try {
      const result = await queryKnowledge(
        question,
        typeof topK === "number" ? topK : 6,
        Array.isArray(filter) ? filter : undefined,
      );

      if (result.sources.filter(s => s !== "wiki/_index.md").length === 0) {
        res.json({ ok: true, answer: "I don't have anything in my knowledge base about that.", sources: [] });
        return;
      }

      // Synthesise using the same Pi SDK session/model as Mentor/Shapeshifter
      const answer = await synthesiseKnowledge(result.answer, question);
      res.json({ ok: true, answer, sources: result.chunks });
    } catch (err) {
      console.error("[knowledge] ask error:", err);
      res.status(500).json({ error: "Ask failed", detail: String(err) });
    }
  });

  /**
   * GET /knowledge/dupes
   * Scans wiki/ for near-duplicate pages using Jaccard word-set similarity.
   */
  router.get("/knowledge/dupes", (_req: Request, res: Response) => {
    try {
      const wikiDir = path.join(VAULT_ROOT, "wiki");
      const files = walkMd(wikiDir).filter(f => !f.endsWith('_index.md'));

      const pages = files.map(abs => {
        const rel = path.relative(VAULT_ROOT, abs);
        const content = fs.readFileSync(abs, 'utf8');
        return { path: rel, words: tokenise(content) };
      });

      const THRESHOLD = 0.5;
      const dupes: { fileA: string; fileB: string; similarity: number }[] = [];

      for (let i = 0; i < pages.length; i++) {
        for (let j = i + 1; j < pages.length; j++) {
          const sim = jaccard(pages[i].words, pages[j].words);
          if (sim >= THRESHOLD) {
            dupes.push({ fileA: pages[i].path, fileB: pages[j].path, similarity: Math.round(sim * 100) / 100 });
          }
        }
      }

      dupes.sort((a, b) => b.similarity - a.similarity);
      res.json({ ok: true, dupes });
    } catch (err) {
      console.error("[knowledge] dupes error:", err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  return router;
}
