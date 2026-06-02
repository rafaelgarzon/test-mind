# Automation Front AI — AI Agent Context

> **Read this file first.** It is the single source of truth for any AI agent
> or IDE assistant working on this codebase. All IDE-specific files
> (CLAUDE.md, .cursorrules, copilot-instructions.md, .windsurfrules)
> reference this document.

---

## 1. What is this project?

A **test automation framework powered by a multi-agent AI pipeline**.
The user describes a requirement in natural language and the system produces:
- A Gherkin scenario (BDD)
- TypeScript step definitions using the Screenplay Pattern (Serenity/JS)
- A headless browser preview via Playwright MCP
- Files ready to integrate into the test suite

Stack: TypeScript 5 strict, Serenity/JS 3.38, Playwright 1.58, Cucumber 10.9,
Express.js 5 (SSE), Next.js 16 dashboard, Ollama/OpenAI, ChromaDB, Docker.

---

## 2. Essential commands

```bash
npx tsc --noEmit          # Type-check — MUST pass before committing
npm run test:unit          # Vitest unit tests
npm run ai:api             # Start pipeline SSE server (port 4000)
npm run ai:web             # Start UI REST server (port 3000)
npm run frontend:dev       # Start Next.js dashboard (port 3001)
npm run dev:all            # Start all 3 servers concurrently
docker compose up -d       # Start Ollama + Playwright MCP + ChromaDB
```

---

## 3. Code conventions (non-negotiable)

- **TypeScript strict mode** — `any` is forbidden; use `unknown` + type guards
- **Error handling** — `catch (error: unknown)`, never `catch (error: any)`
- **Readonly** — all constructor-injected dependencies must be `readonly`
- **Logging** — use `createLogger('AgentName')` from `src/ai/infrastructure/Logger.ts`
- **AI calls** — use `generateChat(messages)` via `ContextBuilder`, never the deprecated `generate(system, user)`
- **Imports** — use path aliases: `@screenplay/*`, `@core/*`, `@pipeline/*`, `@agents/*`, `@infra/*`
- **Exports** — every module folder has an `index.ts` barrel; import from the barrel
- **Commits** — concise message, imperative mood, `Co-Authored-By` trailer when AI-assisted

---

## 4. Architecture: Plug-in Pipeline

The pipeline is NOT hardcoded. `AgentOrchestrator` consumes a `PipelineStep[]`
array and iterates it generically. Steps communicate via a shared `PipelineContext`
(blackboard pattern).

### Key interfaces

```typescript
// src/ai/core/PipelineStep.ts
interface PipelineStep {
  readonly name: string;
  execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome>;
}

// StepOutcome = Continue | ShortCircuit(reason) | Abort(reason, error?)
```

### Current pipeline (7 steps)

```
[1] DuplicatePreventionStep  → ChromaDB lookup; ShortCircuit on cache hit
[2] RequirementsStep          → Gherkin generation + BusinessAlignment loop (max 3)
[3] CodeGeneratorStep         → TypeScript Screenplay via LLM + ProjectContextLoader RAG
[4] PersistToCacheStep        → Save Gherkin to ChromaDB
[5] ValidationStep            → Headless preview via Playwright MCP (non-blocking)
[6] ReportingStep             → Markdown report generation
[7] ReviewImplementerStep     → tsc --noEmit + write .feature + .steps.ts to disk
```

### How to add a new step

1. Create the agent: `src/ai/agents/MyAgent.ts` implementing `Agent<Req, Res>`
2. Create the step: `src/ai/pipeline/steps/MyStep.ts` implementing `PipelineStep`
3. Register it in `src/ai/pipeline/defaultPipeline.ts` — insert into the array

**Never edit `AgentOrchestrator.ts` to add steps.** Only `defaultPipeline.ts`.

---

## 5. Screenplay library (REUSE before inventing)

The AI code generator must use these real Serenity/JS abstractions — never
invent APIs like `NavigateTo()`, `ClickOnElement()`, or `VerifyText()`.

### Tasks (business-level actions)

| Task | Factory methods |
|------|----------------|
| `NavigateToPage` | `.at(url)`, `.reload()`, `.back()` |
| `SearchForItem` | `.called(query)`, `.byPressingEnter(query)` |
| `AddProductToCart` | `.named(productName)` |
| `OpenShoppingCart` | `.fromHeader()`, `.fromModal()` |
| `FillField` | `.byLabel(label, value)`, `.byPlaceholder(ph, value)`, `.byName(name, value)` |
| `ClickButton` | `.labeled(name)`, `.withText(text)`, `.linkLabeled(text)` |
| `SelectDropdownOption` | `.named(text).fromDropdownLabeled(label)` |
| `Login` | `.withCredentials(user, pass)` |

**Import:** `import { NavigateToPage, SearchForItem } from '@screenplay/tasks';`

### UI Locators (PageElement factories)

| Module | Key locators |
|--------|-------------|
| `NavigationUI` | `header()`, `navLink(name)`, `menuItem(text)`, `pageHeading()` |
| `SearchUI` | `searchField()`, `searchButton()`, `resultItems()`, `resultItemContaining(text)` |
| `ProductListUI` | `section(name)`, `productByName(name)`, `addToCartButton()`, `allProducts()` |
| `CartUI` | `cartIcon()`, `viewCartButton()`, `cartItems()`, `cartItemByName(name)`, `cartTotal()` |
| `FormUI` | `fieldByLabel(label)`, `buttonByName(name)`, `buttonByText(text)`, `dropdownByLabel(label)` |
| `LoginUI` | `usernameField`, `passwordField`, `loginButton`, `flashMessage` |

**Import:** `import { CartUI, SearchUI } from '@screenplay/ui';`

### Questions (assertions)

| Question | Method | Usage with Ensure |
|----------|--------|-------------------|
| `TextOf` | `.element(el)` | `Ensure.that(TextOf.element(el), equals('text'))` |
| `CountOf` | `.elements(els)` | `Ensure.that(CountOf.elements(els), equals(3))` |
| `IsVisible` | `.onScreen()`, `.inDom()`, `.andClickable()` | `Ensure.that(el, IsVisible.onScreen())` |
| `CurrentUrl` | `.href()`, `.get()` | `Ensure.that(CurrentUrl.href(), includes('/cart'))` |
| `ElementExists` | `.in(el)` | `Ensure.that(ElementExists.in(el), equals(true))` |

**Import:** `import { TextOf, IsVisible } from '@screenplay/questions';`

---

## 6. Directory structure (key paths)

```
src/
├── ai/
│   ├── agents/                 # Agent classes (Agent<Req, Res>)
│   ├── core/
│   │   ├── AgentOrchestrator.ts  # Generic: iterates PipelineStep[]
│   │   ├── PipelineStep.ts       # PipelineStep + PipelineContext interfaces
│   │   └── ProjectContextLoader.ts # RAG: scans screenplay/ for LLM context
│   ├── pipeline/
│   │   ├── defaultPipeline.ts    # Declarative: agents → PipelineStep[]
│   │   └── steps/                # 7 concrete PipelineStep implementations
│   └── infrastructure/
│       ├── AIProvider.ts         # Interface (DIP): Ollama | OpenAI
│       ├── ContextBuilder.ts     # Chat message builder
│       ├── ChromaVectorStore.ts  # Vector store + retry
│       └── Logger.ts             # Logger factory
├── api/server.ts               # SSE pipeline server (port 4000)
├── ui/server.ts                # REST server (port 3000)
├── screenplay/                 # Screenplay library (Serenity/JS)
│   ├── tasks/                  # 8 reusable Task classes
│   ├── ui/                     # 6 UI locator modules
│   ├── questions/              # 5 Question classes
│   └── index.ts                # Barrel re-export
└── cli/index.ts                # Interactive CLI
frontend/                       # Next.js 16 dashboard (port 3001)
features/                       # Cucumber .feature files + step_definitions/
docs/                           # ARQUITECTURA.md, GUIA_TECNICA.md
```

---

## 7. Anti-patterns (NEVER do these)

- **Do NOT** use `Navigate.to(url)` directly — use `NavigateToPage.at(url)`
- **Do NOT** fabricate UI elements not in the requirement (no invented price fields, dropdowns, etc.)
- **Do NOT** edit `AgentOrchestrator.ts` to add pipeline steps — edit `defaultPipeline.ts`
- **Do NOT** use `generate(system, user)` — use `generateChat()` + `ContextBuilder`
- **Do NOT** use `console.log` — use `createLogger('Name')`
- **Do NOT** commit `.env`, `credentials.json`, or secrets
- **Do NOT** use `any` — use `unknown` with type narrowing
- **Do NOT** assert URLs unless the requirement explicitly mentions a redirect
