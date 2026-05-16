import { Router } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const MODES = ["mentor", "shapeshifter", "keeper", "tracker"] as const;
export type Mode = (typeof MODES)[number];

const PERSONAS_BASE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../personas"
);

// Static per-mode data that never changes via the dashboard
const MODE_STATIC: Record<Mode, { accent: string; mascot: string; defaultName: string }> = {
  mentor:       { accent: "#4CAF50", mascot: "frog", defaultName: "Mentor"      },
  shapeshifter: { accent: "#FF6135", mascot: "fox",  defaultName: "Shapeshifter" },
  keeper:       { accent: "#FFD54F", mascot: "bee",  defaultName: "Keeper"      },
  tracker:      { accent: "#42A5F5", mascot: "bird", defaultName: "Tracker"     },
};

// Keep MODE_META for callers that still import it (backwards compat)
export const MODE_META: Record<Mode, { id: Mode; name: string; accent: string; mascot: string }> = {
  mentor:       { id: "mentor",       name: "Mentor",       accent: "#4CAF50", mascot: "frog" },
  shapeshifter: { id: "shapeshifter", name: "Shapeshifter", accent: "#FF6135", mascot: "fox"  },
  keeper:       { id: "keeper",       name: "Keeper",       accent: "#FFD54F", mascot: "bee"  },
  tracker:      { id: "tracker",      name: "Tracker",      accent: "#42A5F5", mascot: "bird" },
};

function readPersonaFrontmatter(mode: Mode): { name: string; emoji: string } {
  try {
    const raw = fs.readFileSync(path.join(PERSONAS_BASE, mode, "PERSONA.md"), "utf8");
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { name: MODE_STATIC[mode].defaultName, emoji: "" };
    let name = MODE_STATIC[mode].defaultName;
    let emoji = "";
    for (const line of match[1].split("\n")) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (!kv) continue;
      if (kv[1] === "name") name = kv[2].trim();
      if (kv[1] === "emoji") emoji = kv[2].trim();
    }
    return { name, emoji };
  } catch {
    return { name: MODE_STATIC[mode].defaultName, emoji: "" };
  }
}

/** Returns the live mode list, reading name/emoji from PERSONA.md files each time. */
export function getModeInfos(): Array<{ id: Mode; name: string; emoji: string; accent: string; mascot: string }> {
  return MODES.map((m) => {
    const { name, emoji } = readPersonaFrontmatter(m);
    return { id: m, name, emoji, accent: MODE_STATIC[m].accent, mascot: MODE_STATIC[m].mascot };
  });
}

export function createRouter(): Router {
  const router = Router();

  router.get("/modes", (_req, res) => {
    res.json({ modes: getModeInfos() });
  });

  return router;
}
