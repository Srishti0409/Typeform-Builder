# ypeform Builder — a Typeform clone

A full-stack form builder that reproduces Typeform's creator workflow and its
signature one-question-at-a-time respondent experience.

- **Creator side** — build forms with 8 question types, reorder them, preview them
  live, publish to a shareable link, and read the results.
- **Respondent side** — a public, auth-free, full-screen conversational fill flow
  with keyboard navigation and animated transitions.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Backend | Python + FastAPI, SQLAlchemy 2 ORM |
| Database | SQLite |
| Icons | lucide-react |
| Design extraction | Playwright |

---

## Setup

Two processes: the API on `:8000` and the web app on `:3000`.

### Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt

python -m seed.seed            # create tables + sample data
python -m uvicorn app.main:app --reload --port 8000
```

API docs are then at <http://127.0.0.1:8000/docs>.

#### Optional: "Create with AI"

The builder's **Add content → Create with AI** tab writes questions from a
description. It calls the Anthropic Messages API, so it needs a key:

```bash
cp .env.example .env      # then set AI_API_KEY
```

`ANTHROPIC_API_KEY` is read as well, so an environment that already has one needs
no further setup. The key is only ever read from the environment — `.env` is
gitignored and no key appears in source.

Without a key the tab still opens and says it is unconfigured; nothing else in the
app depends on it. `AI_MODEL`, `AI_BASE_URL`, `AI_MAX_QUESTIONS` and
`AI_TIMEOUT_SECONDS` can be overridden the same way.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>.

The frontend reads the API base URL from `NEXT_PUBLIC_API_URL`, defaulting to
`http://127.0.0.1:8000/api/v1`.

### Seed data

`python -m seed.seed` creates 4 forms — 3 published, 1 draft — covering all eight
question types, plus ~49 responses so the results views are populated on first
run.

The seeder is idempotent: if the creator already has forms it reports that and
exits without touching anything. To reseed from scratch, delete
`backend/teraform.db` (plus its `-wal`/`-shm` siblings) and run it again.

To fill in a form you built yourself — which `seed.seed` won't touch — point
`seed.seed_form` at its slug or id:

```bash
python -m seed.seed_form new-form-c2ef10              # 12-22 responses
python -m seed.seed_form new-form-c2ef10 --count 20   # or a specific number
python -m seed.seed_form new-form-c2ef10 --clear      # replace what's there
```

It reuses the same answer generator, so the sample data reads like the rest, and
writes to the database directly — a draft can be filled in without recording a
submission against a form that isn't live. Seeded rows carry the user agent
`Mozilla/5.0 (Seeded Sample Data)`, so they can be told from real submissions.

---

## Architecture

```
backend/
  app/
    api/v1/         HTTP routing only — thin controllers
      forms.py        form CRUD, publish/unpublish, duplicate, reorder
      questions.py    nested question CRUD
      public.py       unauthenticated fill + submit
      responses.py    submissions, summary stats, CSV export
    models/         SQLAlchemy tables
    schemas/        Pydantic request/response contracts
    services/       business logic, kept out of the routers
      validation.py   per-type answer rules (the authority)
      stats_service.py per-question aggregation
      form_service.py  slug generation, duplication
      export_service.py CSV serialisation
    core/           config + DB session

frontend/
  app/
    page.tsx                    workspace dashboard (form list)
    forms/[id]/edit             builder
    forms/[id]/settings         theme + thank-you screen
    forms/[id]/results          summary + responses
    f/[slug]                    PUBLIC respondent flow
  components/
    builder/                    builder shell, question editor, live preview
    respondent/                 the fill experience
      FormFill.tsx                orchestrator: nav, validation, submit
      QuestionScreen.tsx          one question's layout
      fields/                     one component per input family
    results/                    stat tiles, choice bars, responses table
    shared/FormTopBar.tsx       chrome shared by builder/settings/results
  lib/
    design-tokens.ts            measured Typeform values (see below)
    theme.ts                    theme_config -> CSS custom properties
    validation.ts               client mirror of the server rules
    question-types.ts           question type registry
    api.ts                      typed API client
```

### Notable design decisions

**Services, not fat routers.** Routers parse and delegate; validation, stats,
duplication and CSV live in `services/` so they are unit-testable and reusable.

**Validation is mirrored, not duplicated in spirit.** `services/validation.py` is
the authority — every submission is re-validated server-side. `lib/validation.ts`
mirrors those rules so respondents get instant feedback. The server rejects with
`422 {validation_errors: {question_id: message}}`, and the client maps that back
onto the offending question and navigates the respondent to it.

**The preview renders the real thing.** The builder's live preview mounts the same
`QuestionScreen` and field components the public form uses, so it cannot drift
from the respondent experience. It fits into the narrow pane purely by overriding
size tokens — no duplicated field renderers.

**Theming via CSS custom properties.** A form's `theme_config` is compiled into
custom properties (`lib/theme.ts`) applied to the respondent root. Layout and
motion tokens are theme-independent; colour, font and radius are not — the same
split Typeform itself uses. Text colour is derived from background luminance so
custom themes stay legible.

---

## Database schema

Four tables. `forms` → `questions` and `forms` → `responses` →
`response_answers`, all cascading on delete.

```
forms
  id                 TEXT  PK (uuid4)
  creator_id         TEXT  indexed — a fixed default creator (see Assumptions)
  title              TEXT
  description        TEXT  nullable
  slug               TEXT  UNIQUE, indexed — the public URL segment
  status             ENUM('draft','published')
  theme_config       TEXT  JSON: {primaryColor, backgroundColor, fontFamily}
  thank_you_title    TEXT
  thank_you_message  TEXT  nullable
  created_at         DATETIME
  updated_at         DATETIME

questions
  id             TEXT  PK (uuid4)
  form_id        TEXT  FK -> forms.id  ON DELETE CASCADE, indexed
  order_index    INT   explicit ordering (drag-and-drop writes this)
  question_type  ENUM('short_text','long_text','multiple_choice','dropdown',
                      'email','number','yes_no','rating')
  title          TEXT
  description    TEXT  nullable — help text
  is_required    BOOL
  placeholder    TEXT  nullable
  options        TEXT  nullable JSON array — choice/dropdown options
  settings       TEXT  nullable JSON — per-type, e.g. {min,max} / {max_rating,shape}
  created_at     DATETIME

responses                          -- one submission
  id                       TEXT  PK (uuid4)
  form_id                  TEXT  FK -> forms.id ON DELETE CASCADE, indexed
  submitted_at             DATETIME
  completion_time_seconds  INT   nullable
  user_agent               TEXT  nullable

response_answers                   -- one answer within a submission
  id            TEXT  PK (uuid4)
  response_id   TEXT  FK -> responses.id ON DELETE CASCADE, indexed
  question_id   TEXT  FK -> questions.id ON DELETE SET NULL, indexed
  answer_value  TEXT  JSON-encoded scalar or array
```

**Why `answer_value` is JSON text.** Answers are heterogeneous — a string, a
number, or a list of selected options. Encoding as JSON keeps one row per answer
(rather than a column per type or a sparse table) while preserving the value's
real type on read. SQLite has no native JSON column, so it is `TEXT`.

**Why `order_index` rather than a linked list.** Reordering is a bulk operation
from the builder; `POST /reorder-questions` rewrites the indices in one
transaction, which is simpler and cheaper than pointer surgery.

**Why `question_id` is `SET NULL`.** Deleting a question should not destroy
history of submissions that answered it.

---

## API overview

Base path `/api/v1`.

### Forms

| Method | Path | Purpose |
|---|---|---|
| GET | `/forms` | List forms with status + response count |
| POST | `/forms` | Create a form |
| GET | `/forms/{form_id}` | Form with its ordered questions |
| PATCH | `/forms/{form_id}` | Rename, retheme, edit thank-you screen |
| DELETE | `/forms/{form_id}` | Delete form (cascades) |
| POST | `/forms/{form_id}/publish` | Publish; returns `share_url` |
| POST | `/forms/{form_id}/unpublish` | Revert to draft |
| POST | `/forms/{form_id}/duplicate` | Deep-copy form + questions |
| POST | `/forms/{form_id}/generate-questions` | Plan questions from a description and append them (503 if no AI key) |
| POST | `/forms/{form_id}/reorder-questions` | Persist drag-and-drop order |

### Questions

| Method | Path |
|---|---|
| GET | `/forms/{form_id}/questions` |
| POST | `/forms/{form_id}/questions` |
| PATCH | `/forms/{form_id}/questions/{question_id}` |
| DELETE | `/forms/{form_id}/questions/{question_id}` |

### Public (no auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/f/{slug}` | Fetch a **published** form; 404 otherwise |
| POST | `/f/{slug}/submit` | Validate + store a response |

### Results

| Method | Path | Purpose |
|---|---|---|
| GET | `/forms/{form_id}/responses` | Submission list |
| GET | `/forms/{form_id}/responses/{response_id}` | One submission in full |
| GET | `/forms/{form_id}/responses/stats/summary` | Per-question aggregates |
| GET | `/forms/{form_id}/responses/export/csv` | CSV export |

---

## How the visual design was derived

The UI was not styled by eye. Typeform's live renderer was instrumented with
Playwright: walk the rendered DOM, read `getComputedStyle()` off every visible
element, and additionally mine the stylesheets for `:hover`/`:focus` rules and
`@keyframes` — interaction states and motion that a computed-style snapshot cannot
show. The resulting values live in [`frontend/lib/design-tokens.ts`](frontend/lib/design-tokens.ts)
with their provenance, and are exposed as CSS custom properties in `app/globals.css`.

Measured and applied, rather than guessed:

- Content column is exactly **720px, centred** (measured `x=396` at a 1512px viewport).
- Question headline **26px/30px at weight 400** — not bold.
- Inputs are **underline-only, 50px tall, 26px type**.
- Choice rows **44px with an 8px gap** and a **24px** letter-key badge.
- Progress bar **3px, inset 6px**, animating `width 0.2s ease-in-out`.
- Typeform's own spacing scale (`4, 8, 12, 20, 24, 32, 36, 40, 44, 48`) and radius
  scale, read from its `--spacing-*` / `--sampler-*-radius-*` custom properties.
- The question transition is a **20px vertical slide crossfaded with opacity**
  (from Typeform's `@keyframes slideIn`/`slideOut`) — not a horizontal carousel.
- Interactive states transition over **0.25s `cubic-bezier(0.215, 0.61, 0.355, 1)`**
  (easeOutCubic).

---

## Out-of-scope features

Per the assignment, several areas are deliberately not implemented. They are still
rendered — so the app reads as complete — but are visibly inert: **50% opacity and
`cursor: not-allowed`**, via the `.oos` class in `app/globals.css`. Because
`cursor: not-allowed` only shows while pointer events reach the element, the class
keeps them on the wrapper and disables them on children.

Disabled this way:

- **Anything that drafts a form for you** — the workspace suggestion banner, the
  sidebar's "Ask Typeform AI" box, the "New form" goal composer, the builder's
  "Chat to create" bar, and the Add content dialog's "Create with AI" tab. The
  banner stays dismissable: a suggestion that can't act should still be closable.
- **Automations** and **Research Flow (Demo)** — the tabs are shown but don't
  navigate. Both pages are still built and render if visited by URL directly.
- The builder's **Workflow** tab and Logic panel (branching), video question
  prompts, Comments, and the element picker's unsupported question types.
- Per-form integrations dispatch, response limits, and the Settings page's
  Coming-soon list (logic jumps, webhooks, team collaboration, payment and
  file-upload question types).

The first two groups are driven by one flag each in `frontend/lib/scope.ts`. The
wiring behind them is intact — including the `/forms/{id}/generate-questions`
endpoint — so flipping a flag back to `true` restores the feature.

Working, by contrast: Forms, Contacts, Integrations, Brand kit, Plans, workspace
creation and Invite.

---

## Assumptions

1. **Single creator, no auth.** Every form is owned by a fixed
   `creator_id = "default-creator-001"`, as the assignment permits. There is no
   login; the dashboard is the creator's view and `/f/{slug}` is the public view.
2. **Publishing gates public access.** `GET /f/{slug}` serves only `published`
   forms, so unpublishing immediately breaks the shared link (returns 404).
3. **Slugs are stable and human-readable**, derived from the title with a random
   suffix on collision. They are not regenerated on rename, so shared links keep
   working.
4. **`multiple_choice` is single-select unless `settings.allow_multiple`** is set;
   single-select auto-advances, multi-select waits for OK.
5. **Timestamps are naive UTC.** The API stores `datetime.utcnow()`; the client
   treats values without an offset as UTC when formatting.
6. **Partial responses are not stored.** A response row is written only on submit,
   so the "Completed" dashboard column is a placeholder.
7. **SQLite, single-node.** Fine for this assignment; concurrent writes would need
   Postgres in production.

---

## Verification

The respondent flow was exercised end-to-end with Playwright across all eight
question types — keyboard-only navigation (Enter, arrows, letter keys for choices,
number keys for ratings) through to submission — and the persisted rows were
checked in SQLite to confirm each type round-trips with the right shape.

```bash
cd frontend && npx tsc --noEmit    # typecheck
```
