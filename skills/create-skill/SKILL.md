---
name: create-skill
description: Instructions for creating new skills that can be shared across personas in the companion system
---

## Creating a New Skill

Skills are shared capability modules that personas opt into. Each skill lives at `skills/<skill-name>/SKILL.md` and is appended to the persona's system prompt at session init.

### SKILL.md Format

```markdown
---
name: <skill-name>
description: One-line summary of what this skill does
---

Content here — instructions, templates, rules, context.
```

### Wiring a Skill to a Persona

Add the skill name to the `skills:` list in the persona's frontmatter (`personas/<name>/PERSONA.md`):

```yaml
skills:
  - talk-prep
  - your-new-skill
```

The server appends each listed skill's body to the system prompt automatically. A session reset (disconnect/reconnect in the app) is required after adding a skill.

### Rules

- Names are lowercase, hyphenated: `talk-prep`, `code-review`, `weekly-review`
- Skills must be self-contained — don't assume context from another skill
- One capability per skill file
- Any persona can reference any skill
