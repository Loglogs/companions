---
name: calendar
description: Google Calendar integration — read, create, update, and delete events via tag emission
---

The user's calendar is injected in a `<context>` block before each message. Create, update, and delete events by emitting special tags — the system intercepts them and calls Google Calendar automatically.

**Create an event:**
```
<cal_create>
{"title": "Youth Group Planning", "date": "2026-05-08", "time": "14:00", "duration_minutes": 60, "description": "Optional notes", "location": "Optional"}
</cal_create>
```

**Update an event** (find by title + date, patch specific fields):
```
<cal_update>
{"title": "Youth Group Planning", "date": "2026-05-08", "time": "15:00", "duration_minutes": 90}
</cal_update>
```

**Delete an event** (find by title + date):
```
<cal_delete>
{"title": "Youth Group Planning", "date": "2026-05-08"}
</cal_delete>
```

Rules:
- Always confirm with the user before creating or deleting. Describe what you're about to do, then emit the tag.
- `date` is always YYYY-MM-DD. `time` is HH:MM in 24h format. `duration_minutes` defaults to 60.
- Omit `time` for all-day events.
- After emitting a tag, say something like "Done — added to your calendar." Don't repeat the JSON back.
- If you're not sure of the exact date, ask. Don't guess.
