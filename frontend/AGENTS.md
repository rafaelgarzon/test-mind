<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Automation Front AI — Frontend Dashboard

> **Read the root `../AGENTS.md` first** for the overall system context
> (multi-agent pipeline, Screenplay library, conventions).
> This file adds frontend-specific rules on top of that.

---

## 1. What this app is

Next.js 16 dashboard that visualises the AI test-generation pipeline in
real time. It consumes two backends:

- `http://localhost:4000` — Pipeline SSE server (`src/api/server.ts`)
- `http://localhost:3000` — REST server (`src/ui/server.ts`)

Dev server runs on **port 3001**. Start it from the repo root with
`npm run frontend:dev`, or start all three services with `npm run dev:all`.

---

## 2. Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript 5** strict mode
- **Tailwind CSS 4** (PostCSS plugin, no `tailwind.config.js` needed)
- **ESLint 9** flat config (`eslint.config.mjs`)
- No global state library — data flows through hooks + SSE

---

## 3. Directory layout

```
frontend/src/
├── app/
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main dashboard page
├── components/
│   ├── ui/                   # StatusBadge, QualityBadge, Toast, Spinner
│   ├── pipeline/             # AgentStep, AgentTimeline
│   ├── gherkin/              # GherkinViewer, TypeScriptViewer
│   └── preview/              # PreviewCarousel, PreviewStep, ScreenshotViewer
├── hooks/
│   ├── useSSEPipeline.ts     # Subscribes to /api/pipeline SSE stream
│   ├── useImplement.ts       # POST /api/implement
│   └── usePreview.ts         # Poll preview screenshots
└── lib/
    ├── api.ts                # Fetch helpers
    └── types.ts              # Shared types (mirror backend contracts)
```

---

## 4. Conventions

- **Strict TypeScript** — no `any`; use `unknown` + type guards
- **Server vs client** — default to server components; add `'use client'`
  only when you need state, effects, or browser APIs
- **Data fetching** — hooks under `src/hooks/` own all network I/O;
  components stay presentational
- **Types** — keep SSE event shapes in `src/lib/types.ts` in sync with
  the backend (`src/api/server.ts`)
- **Styling** — Tailwind utility classes; shared variants go in the
  relevant `ui/` component, not scattered across pages
- **Imports** — use `@/` alias (configured in `tsconfig.json`) for
  intra-frontend paths

---

## 5. Common tasks

### Add a new pipeline step to the timeline
1. Add the step name to the backend event payload (`src/api/server.ts`)
2. Update `src/lib/types.ts` with the new step identifier
3. Render it inside `components/pipeline/AgentTimeline.tsx`

### Add a new viewer / panel
1. Create the component under `components/<domain>/`
2. Feed it from a hook in `hooks/` (never call `fetch` from the view)
3. Compose it into `app/page.tsx`

### Consume a new backend endpoint
1. Add the fetch helper to `src/lib/api.ts`
2. Add the response type to `src/lib/types.ts`
3. Expose it via a hook in `src/hooks/`

---

## 6. Verification

```bash
cd frontend
npm run lint          # ESLint 9
npm run build         # Next.js production build — must pass before PR
```

Type errors from the frontend are caught by the build. The root
`tsc --noEmit` check (run by the pre-commit hook) only covers
`src/` in the repo root, **not** `frontend/src/` — so always run
`npm run build` here after frontend changes.

---

## 7. Anti-patterns

- **Do NOT** call `fetch` directly from a component — use a hook
- **Do NOT** introduce a global state library (Redux, Zustand, …)
  without discussion; current SSE + hooks pattern is intentional
- **Do NOT** duplicate backend types; re-declare them in `lib/types.ts`
  only if the backend does not export them
- **Do NOT** assume a stable Next.js API across minor versions —
  see the `<!-- BEGIN:nextjs-agent-rules -->` banner above
