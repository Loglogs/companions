<p align="center">
  <img src="docs/screenshots/logo.png" alt="Companions logo" width="160">
</p>

<h1 align="center">Companions</h1>

<p align="center"><strong>Self-hosted, four purpose-built AI helpers for organisation, creativity, and reflection.</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg" alt="Node ≥ 20"></a>
  <a href="https://github.com/sanieldoe/companions/releases/latest"><img src="https://img.shields.io/github/v/release/sanieldoe/companions" alt="Latest release"></a>
  <a href="#bring-your-own-model"><img src="https://img.shields.io/badge/LLM-Anthropic%20%7C%20OpenAI%20%7C%20Ollama-orange.svg" alt="BYO LLM"></a>
</p>

---

**One generic AI can't hold all the roles you need it to.**
Reflection needs patience. Creation needs guardrails and momentum. Knowledge needs structure. It's not that most tools can't do it, but this one is the one that helps my brain.

**Your data shouldn't live on someone else's server.**
Companions runs on your machine. Your vault is plain markdown files. No cloud account, no subscription, no lock-in. All local!

**Context gets lost when your tools don't talk to each other.**
All four agents share one vault. A calendar event from Tracker shows up if Mentor needs context. A draft from Shapeshifter becomes a wiki entry Keeper can find later.

<!-- screenshot: hero image — all four agent tabs side by side on mobile -->

---

## The four personas

Each ships with a default name, emoji, and character. Rename them and tune the personality during setup or any time from the dashboard.

| | Persona | Character |
|---|---|---|
| 🐸 | **Mentor** | Patient, ADHD-aware. Slows you down. One step, one next action, never a wall of text. |
| 🦊 | **Shapeshifter** | Bold, fast, a little mischievous. Infers intent and acts — it already built it before Mentor finished the first question. |
| 🐝 | **Keeper** | Organised, quietly curious. Tends the knowledge vault so you don't have to remember everything yourself. |
| 🐦 | **Tracker** | Precise and grounding. Holds your day's shape — tasks, calendar, rhythm, reflection. |

<!-- screenshot: four-agents — tabs side by side -->

---

## What each one does

### 🐸 Mentor
- Asks the right question before touching anything
- One step at a time — never bundles two concepts into one message
- Ends every response with exactly one next action
- `Step X of Y` numbering so progress feels real
- Canvas only when you ask for it — never by default

### 🦊 Shapeshifter
- Canvas is the default output — not a chat reply but a persistent, structured workspace saved to your vault
- 10 composable block types: rich text, interactive checklists, coloured callout notes, code blocks, links, file tabs, buttons, text inputs, section dividers, and a sandboxed HTML block for charts, custom layouts, or anything the other blocks can't express
- You ask for a plan — you get a tappable, editable canvas. You ask for a checklist — the items actually check off
- Reads and writes your vault directly: scaffolds projects, runs commands, creates files without waiting for permission

### 🐝 Keeper
- Drop in raw notes, voice dumps, or rough ideas — Keeper extracts and organises them into the wiki
- Follows a Johnny Decimal structure (identity, knowledge, projects, areas, relationships, creativity, systems, resources, media, events, questions, archive)
- Surfaces forgotten knowledge, prioritising older reinforced memories you've likely lost track of
- Updates existing pages rather than creating duplicates; keeps the index clean

### 🐦 Tracker
- **Weekly phrase** — a short line to sit with and return to through the week
- **Calendar** — pulls in Google Calendar events so the day has context and shape
- **To-dos** — p1 / p2 / p3 priorities; incomplete tasks carry forward automatically
- **Rhythms** — recurring commitments across any cadence: daily, weekly, monthly, yearly
- **Haiku** — three lines written fresh each morning as a quiet anchor for the day

<!-- screenshot: tracker-and-shapeshifter — canvas and daily view side by side -->

---

## One vault, shared by all four

```text
vault/
  raw/        quick captures — notes, clips, voice transcripts
  wiki/       linked knowledge — Keeper-maintained articles
  journal/    dated entries — Tracker reflections and logs
  projects/   long-form work — plans, drafts, active projects
```

Plain markdown. No database. Open any file in any editor.

---

## Quick start

```bash
curl -fsSL https://raw.githubusercontent.com/sanieldoe/companions/main/install.sh | bash
```

Requires Node ≥ 20, `git`, and `npm`. Clones the repo, installs dependencies, and opens the setup wizard in your browser. The wizard covers vault path, your name, server secret, LLM provider, persona names, and optional Google Calendar.

**Manual:**
```bash
git clone https://github.com/sanieldoe/companions.git
cd companions/server && npm install && npm run build && npm start
```

Then open `http://localhost:3000/install`.

---

## Bring your own model

| Provider | Example |
|---|---|
| Anthropic | `anthropic:claude-sonnet-4-6` |
| OpenAI | `openai:gpt-4o` |
| omlx (local) | `openai-compat:http://localhost:8000/v1:Qwen3.6-35B-A3B-4bit` |
| Ollama (local) | `openai-compat:http://localhost:11434/v1:llama3.2` |

Change the model any time from the dashboard — no restart needed.

### Local models with omlx

Companions works well with [omlx](https://omlx.dev) — an OpenAI-compatible local inference server optimised for Apple Silicon. On an M1 Max with 32 GB unified memory, `Qwen3.6 35B A3B 4bit` runs comfortably and handles all four agents well. The 4-bit quantised mixture-of-experts architecture keeps the memory footprint tight while preserving reasoning quality.

```env
DEFAULT_MODEL=openai-compat:http://localhost:8000/v1:Qwen3.6-35B-A3B-4bit
DEFAULT_MODEL_KEY=your-omlx-api-key
```

---

## Mobile + web

- **Android:** [Download APK](https://github.com/sanieldoe/companions/releases/latest/download/companions-android.apk) — sideload and scan the QR code from the setup wizard
- **iOS:** web app at `/app` (TestFlight build coming)
- **Dashboard:** `http://<your-server>/dashboard` — manage vault, models, personas, and updates

Recommended remote access: [Tailscale](https://tailscale.com/) — the wizard detects it automatically.

<!-- screenshot: qr-pairing — QR code screen on Android -->

---

## Tech stack

| | |
|---|---|
| Server | Node ≥ 20, Express, WebSocket, TypeScript |
| Agent engine | [`@mariozechner/pi-coding-agent`](https://github.com/badlogic/pi-mono) |
| Mobile | Expo 55, React Native 0.83 |
| Web | Vite 6, React 19 |
| Knowledge | LanceDB + HuggingFace Transformers |

---

## Acknowledgements

- [Pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) — the core agent engine
- [Andrej Karpathy](https://karpathy.ai) — inspiration for the Keeper wiki model
- [Expo / EAS](https://expo.dev/) — Android build infrastructure

---

MIT — see [LICENSE](LICENSE).
