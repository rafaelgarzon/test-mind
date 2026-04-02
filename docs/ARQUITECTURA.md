# Arquitectura del Sistema — Automation Front AI

**Rama activa:** `master`
**Última actualización:** 2026-04-02
**Versión del sistema:** Fase 14 — Next.js Dashboard & Pipeline Visual

---

## Índice

1. [Visión General](#1-visión-general)
2. [Estructura de Directorios](#2-estructura-de-directorios)
3. [Diagrama de Arquitectura en Capas](#3-diagrama-de-arquitectura-en-capas)
4. [Pipeline Multi-Agente](#4-pipeline-multi-agente)
5. [Módulos del Sistema](#5-módulos-del-sistema)
6. [Frontend (Phase 14)](#6-frontend-phase-14)
7. [Flujos de Datos Principales](#7-flujos-de-datos-principales)
8. [Patrones de Diseño Aplicados](#8-patrones-de-diseño-aplicados)
9. [Configuración y Entorno](#9-configuración-y-entorno)
10. [Evolución por Fases](#10-evolución-por-fases)

---

## 1. Visión General

El sistema es un **framework de automatización de pruebas potenciado por IA multi-agente** cuyo objetivo es la generación e implementación automática de código de pruebas a partir de requerimientos en lenguaje natural.

El usuario describe un comportamiento en texto libre y el sistema produce:
1. Un escenario Gherkin validado semánticamente con score de calidad
2. Step Definitions en TypeScript siguiendo el patrón Screenplay de Serenity/JS
3. Preview visual headless ejecutada con Playwright MCP
4. Código listo para integrarse en la suite de pruebas

Todo el proceso es **observable en tiempo real** desde el Dashboard Next.js vía Server-Sent Events.

### Principios de diseño

| Principio | Implementación |
|-----------|---------------|
| **Separación de responsabilidades** | 5 capas independientes + capa frontend |
| **Dependency Inversion** | Interfaz `AIProvider` con implementaciones Ollama/OpenAI |
| **Calidad garantizada** | Scoring + bucle de auto-corrección (máx. 3 intentos) |
| **Observabilidad** | Logger abstraction + SSE streaming a dashboard |
| **Resiliencia** | ChromaVectorStore con retry exponencial + fallback gracioso |
| **Análisis estático** | `tsc --noEmit` no bloqueante en ReviewImplementerAgent |
| **Multi-interfaz** | Dashboard Next.js, CLI interactivo, API REST/SSE |

### Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Next.js 16.2.1, React 19, Tailwind v4, Geist |
| **Lenguaje** | TypeScript 5.x (strict mode), Node.js |
| **IA Local** | Ollama (llama3.2, dockerizado) |
| **IA Cloud** | OpenAI API (gpt-4o) |
| **Framework de pruebas** | Serenity/JS 3.38 + Playwright 1.58 + Cucumber 10.9 |
| **Patrón de pruebas** | Screenplay Pattern |
| **Vector Store** | ChromaDB (deduplicación semántica) |
| **Persistencia** | SQLite 3 (knowledge_base.sqlite) |
| **API Web** | Express.js 5 (puerto 3000 REST + puerto 4000 SSE) |
| **CLI** | Inquirer.js 13 |
| **Browser Automation** | Playwright MCP (Model Context Protocol) |
| **Contenedores** | Docker Compose (Ollama, Playwright MCP) |

---

## 2. Estructura de Directorios

```
Automation Front AI/
│
├── frontend/                          # Dashboard Next.js (Phase 14)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Dashboard principal
│   │   │   └── layout.tsx             # Layout con metadatos
│   │   ├── components/
│   │   │   ├── gherkin/
│   │   │   │   ├── GherkinViewer.tsx  # Colorización de sintaxis Gherkin
│   │   │   │   └── TypeScriptViewer.tsx # Visor con números de línea
│   │   │   ├── pipeline/
│   │   │   │   ├── AgentTimeline.tsx  # Barra de progreso + lista de agentes
│   │   │   │   └── AgentStep.tsx      # Estado visual de un agente
│   │   │   ├── preview/
│   │   │   │   ├── PreviewCarousel.tsx # Navegación por pasos con screenshots
│   │   │   │   ├── PreviewStep.tsx     # Estado + screenshot de un paso
│   │   │   │   └── ScreenshotViewer.tsx # Renderizado de PNG base64
│   │   │   └── ui/
│   │   │       ├── StatusBadge.tsx    # Online/offline (polling 30s)
│   │   │       ├── QualityBadge.tsx   # Semáforo de calidad Gherkin
│   │   │       ├── Spinner.tsx        # Indicador de carga animado
│   │   │       └── Toast.tsx          # Notificaciones (success/error)
│   │   ├── hooks/
│   │   │   ├── useSSEPipeline.ts      # Consume stream SSE del pipeline
│   │   │   ├── useImplement.ts        # POST /api/implement
│   │   │   └── usePreview.ts          # POST /api/preview
│   │   └── lib/
│   │       ├── types.ts               # Tipos compartidos (AgentState, etc.)
│   │       └── api.ts                 # Capa de acceso a los 2 backends
│   ├── .env.local                     # URLs de backend (no versionado)
│   └── package.json                   # port 3001, Next.js 16.2.1
│
├── src/
│   ├── ai/
│   │   ├── agents/                    # Agentes especializados del pipeline
│   │   │   ├── Agent.ts               # Interfaz base Agent<Req, Res>
│   │   │   ├── RequirementsAgent.ts   # [1] Análisis de requerimiento
│   │   │   ├── DuplicatePreventionAgent.ts # [2] Búsqueda semántica ChromaDB
│   │   │   ├── BusinessAlignmentAgent.ts   # [3] Alineación con negocio
│   │   │   ├── CodeGeneratorAgent.ts  # [4] Generación Gherkin + TypeScript
│   │   │   ├── ValidationAgent.ts     # [5] Score de calidad Gherkin
│   │   │   ├── ReviewImplementerAgent.ts   # [6] tsc --noEmit estático
│   │   │   ├── ScenarioPreviewRunner.ts    # [7] Preview Playwright MCP
│   │   │   ├── ReportingAgent.ts      # Generación de reportes
│   │   │   ├── ScenarioImplementer.ts # Escritura de archivos .feature/.steps.ts
│   │   │   └── PreviewAgent.ts        # Agente de preview alternativo
│   │   │
│   │   ├── core/
│   │   │   ├── AgentOrchestrator.ts   # Orquestador central del pipeline
│   │   │   ├── DuplicateDetector.ts   # Detección Jaccard (legacy)
│   │   │   ├── GherkinQualityScorer.ts # Score 0-100, 5 reglas
│   │   │   ├── GherkinStepParser.ts   # Parser de pasos Gherkin
│   │   │   ├── LanguageDetector.ts    # Detección ES/EN
│   │   │   └── ProjectContextLoader.ts
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── AIProvider.ts          # Interfaz unificada (DIP)
│   │   │   ├── OllamaClient.ts        # Implementación Ollama
│   │   │   ├── OpenAIClient.ts        # Implementación OpenAI
│   │   │   ├── OllamaEmbeddingFunction.ts # Embeddings para ChromaDB
│   │   │   ├── ChromaVectorStore.ts   # Vector store con retry exponencial
│   │   │   ├── ContextBuilder.ts      # Builder de mensajes chat (Phase 8)
│   │   │   ├── Logger.ts              # Logger abstraction (Phase 13)
│   │   │   ├── BusinessDocumentLoader.ts # Carga de contexto de negocio
│   │   │   └── McpPlaywrightClient.ts # Cliente MCP Playwright
│   │   │
│   │   ├── prompts/
│   │   │   ├── GherkinToPlaywrightPrompt.ts  # Prompt Gherkin → Playwright
│   │   │   ├── DuplicateCheckPrompt.ts
│   │   │   └── ScreenplaySystemPrompt.ts
│   │   │
│   │   ├── OllamaProvider.ts          # Proveedor Ollama principal (legacy)
│   │   ├── PromptTemplates.ts         # Templates buildGherkin/buildRefinement
│   │   └── ScenarioGenerator.ts       # Orquestador Fase 5 (legacy)
│   │
│   ├── api/
│   │   └── server.ts                  # Pipeline SSE server (puerto 4000)
│   │
│   ├── ui/
│   │   ├── server.ts                  # UI REST server (puerto 3000)
│   │   └── public/index.html          # SPA HTML legacy
│   │
│   ├── cli/
│   │   └── index.ts                   # CLI interactivo (Inquirer.js)
│   │
│   └── screenplay/                    # Código de pruebas Serenity/JS
│       ├── actors/Cast.ts
│       ├── tasks/Login.ts
│       └── ui/LoginUI.ts
│
├── features/                          # Especificaciones BDD (Cucumber)
│   ├── login.feature
│   ├── step_definitions/
│   └── support/
│
├── docs/
│   ├── ARQUITECTURA.md                # Este documento
│   ├── GUIA_TECNICA.md
│   ├── GUIA_USUARIO.md
│   └── INFORME_FASE7_EVALUACION.md
│
├── docker-compose.yml                 # Ollama + Playwright MCP
├── package.json                       # Scripts: dev:all, ai:api, frontend:dev…
├── tsconfig.json
└── vitest.config.ts
```

---

## 3. Diagrama de Arquitectura en Capas

```
╔══════════════════════════════════════════════════════════════════════╗
║                        CAPA DE INTERFAZ                              ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   ║
║  │  Dashboard Next.js│  │  CLI Interactivo  │  │  MCP / WebMCP    │   ║
║  │  React 19         │  │  Inquirer.js      │  │  HTTP+SSE /mcp   │   ║
║  │  Tailwind v4      │  │  npm run ai:cli   │  │  Claude Desktop  │   ║
║  │  :3001            │  │                   │  │                  │   ║
║  └────────┬──────────┘  └────────┬──────────┘  └────────┬─────────┘  ║
╠═══════════╪══════════════════════╪═════════════════════╪════════════╣
║           │          CAPA DE API / GATEWAY              │            ║
║  ┌────────┴──────────────────────┴──────────────────────┘            ║
║  │                                                                    ║
║  │  ┌──────────────────────────────┐  ┌────────────────────────────┐ ║
║  │  │   UI Server — Express :3000   │  │  Pipeline Server — Expr.:4000│ ║
║  │  │  GET  /api/status             │  │  POST /api/v1/generate-     │ ║
║  │  │  POST /api/preview            │  │       scenario (SSE stream) │ ║
║  │  │  POST /api/implement          │  │                            │ ║
║  │  └──────────────┬───────────────┘  └───────────┬────────────────┘ ║
╠══════════════════════════════════════════════════════════════════════╣
║                      CAPA DE APLICACIÓN                              ║
║                  ┌───────────────────────────┐                       ║
║                  │      AgentOrchestrator     │                       ║
║                  │  Coordina 7 agentes en     │                       ║
║                  │  secuencia, emite eventos  │                       ║
║                  │  SSE por cada transición   │                       ║
║                  └─────────────┬─────────────┘                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                      CAPA DE DOMINIO (AGENTES)                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │  [1]Requirements → [2]Duplicate → [3]BusinessAlignment          │ ║
║  │         → [4]CodeGenerator → [5]Validation                      │ ║
║  │                → [6]ReviewImplementer → [7]ScenarioPreview       │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
╠══════════════════════════════════════════════════════════════════════╣
║                    CAPA DE INFRAESTRUCTURA                           ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   ║
║  │   OllamaClient    │  │   OpenAIClient    │  │  ChromaVectorStore│  ║
║  │  localhost:11434  │  │  gpt-4o           │  │  Embeddings+retry│  ║
║  └────────┬──────────┘  └────────┬──────────┘  └────────┬─────────┘  ║
║           └──────────────────────┘                       │            ║
║                    ┌─────────────────────┐               │            ║
║                    │   AIProvider (i/f)   │◄─────────────┘            ║
║                    │  generateChat(msgs)  │                            ║
║                    └─────────────────────┘                            ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   ║
║  │  ContextBuilder   │  │     Logger        │  │ McpPlaywrightClient│ ║
║  │  Mensajes chat    │  │  ConsoleLogger    │  │  Browser MCP     │  ║
║  │  (Phase 8)        │  │  (Phase 13)       │  │  (Phase 10)      │  ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘   ║
╠══════════════════════════════════════════════════════════════════════╣
║                      CAPA DE PERSISTENCIA                            ║
║  ┌────────────────────────────┐   ┌──────────────────────────────┐  ║
║  │    KnowledgeBase (SQLite)   │   │     ChromaDB (vectores)       │  ║
║  │  addScenario / search       │   │  add / query (embeddings)     │  ║
║  │  updateExecutionResult      │   │  fallback gracioso si offline │  ║
║  └────────────────────────────┘   └──────────────────────────────┘  ║
╠══════════════════════════════════════════════════════════════════════╣
║                  CAPA DE EJECUCIÓN DE PRUEBAS                        ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │                Serenity/JS (Screenplay Pattern)                │   ║
║  │   Actors → Tasks → UI Elements → Playwright (Browser Driver)  │   ║
║  │              Cucumber BDD / .feature files                     │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 4. Pipeline Multi-Agente

### Flujo completo del AgentOrchestrator

```
POST /api/v1/generate-scenario
  { userRequirement: "..." }
         │
         ▼ SSE: { event: 'agent_start', agent: 'requirements' }
┌─────────────────────────────────────┐
│  [1] RequirementsAgent              │
│  Analiza y estructura el texto del  │
│  requerimiento, extrae entidades.   │
└─────────────────┬───────────────────┘
                  │ SSE: { event: 'agent_done', agent: 'requirements', ... }
                  ▼
┌─────────────────────────────────────┐
│  [2] DuplicatePreventionAgent       │
│  Consulta ChromaDB con embeddings.  │
│  Si similarity > umbral → STOP      │
│  (emite isDuplicate: true)          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  [3] BusinessAlignmentAgent         │
│  Valida que el req. sea coherente   │
│  con el contexto de negocio cargado │
│  desde docs/business_context/.      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  [4] CodeGeneratorAgent             │
│  Llama a OllamaClient/OpenAIClient  │
│  via ContextBuilder.buildMessages() │
│  Genera: Gherkin + TypeScript       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  [5] ValidationAgent                │
│  GherkinQualityScorer (0-100)       │
│  Si score < 70 → refinement loop   │
│  máx. 3 intentos                   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  [6] ReviewImplementerAgent         │
│  Escribe temp file → tsc --noEmit  │
│  Errores TS = warnings (no bloquea)│
│  Cleanup en finally                │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  [7] ScenarioPreviewRunner          │
│  buildGherkinToPlaywrightMessages() │
│  ContextBuilder → generateChat()    │
│  McpPlaywrightClient.runScenario()  │
│  Captura screenshots por paso      │
└─────────────────┬───────────────────┘
                  │
                  ▼ SSE: { event: 'pipeline_done', gherkin, tsCode, preview }
         Response stream ends
```

### Eventos SSE emitidos

| Evento | Payload |
|--------|---------|
| `agent_start` | `{ agent, message }` |
| `agent_update` | `{ agent, message }` |
| `agent_done` | `{ agent, result, message }` |
| `agent_error` | `{ agent, error }` |
| `duplicate_detected` | `{ isDuplicate: true }` |
| `pipeline_done` | `{ gherkin, featureName, tsCode, quality, preview }` |
| `pipeline_error` | `{ error }` |

---

## 5. Módulos del Sistema

### 5.1 Infrastructure

#### `AIProvider` — Interfaz unificada (DIP)

```typescript
interface AIProvider {
  generateChat(messages: ChatMessage[]): Promise<string>;
  generate(system: string, user: string): Promise<string>; // @deprecated
  isAvailable(): Promise<boolean>;
}
```

Implementaciones: `OllamaClient`, `OpenAIClient`.

#### `ContextBuilder` — Construcción de mensajes (Phase 8)

```typescript
class ContextBuilder {
  withSystemPrompt(prompt: string): ContextBuilder
  withDomainKnowledge(knowledge: string): ContextBuilder
  withUserMessage(message: string): ContextBuilder
  withAssistantMessage(response: string): ContextBuilder
  build(): ChatMessage[]
}
```

Todos los agentes de la Phase 13+ usan `generateChat(builder.build())` en lugar del deprecated `generate(system, user)`.

#### `ChromaVectorStore` — Deduplicación semántica (Phase 11)

```typescript
class ChromaVectorStore {
  isAvailable: boolean;           // fallback gracioso si ChromaDB offline
  addScenario(req, gherkin): Promise<void>    // con withRetry()
  findSimilar(req, k?): Promise<SimilarScenario[]>  // con withRetry()
  private withRetry<T>(fn, operation): Promise<T>   // 3 intentos, 500ms base
}
```

#### `Logger` — Abstracción de logging (Phase 13)

```typescript
interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}
// Implementación: ConsoleLogger (controlada por LOG_LEVEL env var)
// Factory: createLogger(agentName: string): Logger
```

### 5.2 Core

#### `AgentOrchestrator` — Coordinador del pipeline (Phase 9+)

- Tipo-safe: usa tipos concretos `DuplicatePreventionAgent`, `BusinessAlignmentAgent`
- Sin `any`: eliminado totalmente en Phase 13
- Bucle de alineación: `for` loop (máx. 3 intentos) en lugar de `while`
- Logger integrado: `createLogger('Orchestrator')`

#### `GherkinQualityScorer` — Motor de calidad (Phase 5)

| Regla | Deducción | Condición |
|-------|-----------|-----------|
| Nombre Feature genérico | -25 pts | `/Feature:\s*Generated Feature/i` |
| Scenario repite input crudo | -25 pts | `/Scenario:\s*Generated Scenario for/i` |
| Mezcla de idiomas (req en ES) | -20 pts | ≥2 palabras inglesas en pasos |
| Then sin valor verificable | -15 pts | `should be displayed/visible/shown` sin comillas |
| When sin datos concretos | -15 pts | Sin valores entre comillas en el paso |

**Score mínimo para pasar a implementación:** 70/100

### 5.3 ReviewImplementerAgent — Análisis estático (Phase 13)

```typescript
// Algoritmo de análisis estático no bloqueante:
async runStaticAnalysis(tsCode: string): Promise<{ warnings: string[] }> {
  const tmpFile = `/tmp/review-${Date.now()}.ts`;
  try {
    writeFileSync(tmpFile, tsCode);
    execSync(`npx tsc --noEmit --strict --target ES2020 ${tmpFile}`);
    return { warnings: [] };
  } catch (err) {
    // TypeScript errors → warnings, no bloquean el pipeline
    return { warnings: parseErrors(err) };
  } finally {
    unlinkSync(tmpFile); // cleanup garantizado
  }
}
```

---

## 6. Frontend (Phase 14)

### Arquitectura del Dashboard

```
page.tsx
  │
  ├── useSSEPipeline()       ← fetch POST /api/v1/generate-scenario (SSE)
  │     ├── AbortController  ← cancelación limpia
  │     └── line-by-line parsing de stream SSE
  │
  ├── useImplement()         ← fetch POST /api/implement (REST :3000)
  │
  ├── <StatusBadge />        ← polling GET /api/status cada 30s
  ├── <AgentTimeline />      ← estado de los 7 agentes en tiempo real
  ├── <GherkinViewer />      ← colorización de sintaxis + copy to clipboard
  ├── <TypeScriptViewer />   ← números de línea, colapsable, copy
  ├── <PreviewCarousel />    ← navegación por pasos + screenshots
  └── <QualityBadge />       ← APROBADO / OBSERVACIONES / RECHAZADO
```

### Comunicación con backends

| Hook/Componente | Endpoint | Puerto |
|----------------|----------|--------|
| `useSSEPipeline` | `POST /api/v1/generate-scenario` | 4000 |
| `useImplement` | `POST /api/implement` | 3000 |
| `usePreview` | `POST /api/preview` | 3000 |
| `StatusBadge` | `GET /api/status` | 3000 |

### Variables de entorno del frontend

```bash
# frontend/.env.local (no versionado)
NEXT_PUBLIC_UI_API_URL=http://localhost:3000
NEXT_PUBLIC_PIPE_API_URL=http://localhost:4000
```

---

## 7. Flujos de Datos Principales

### Flujo 1: Generación completa (Dashboard)

```
Usuario (browser :3001)
  → form submit → useSSEPipeline
  → fetch POST http://localhost:4000/api/v1/generate-scenario
  → SSE stream: agent_start → agent_done × 7 → pipeline_done
  → Dashboard actualiza AgentTimeline en tiempo real
  → GherkinViewer + TypeScriptViewer aparecen al finalizar
  → PreviewCarousel con screenshots por paso
  → Botón "Implementar" → useImplement → POST :3000/api/implement
```

### Flujo 2: Detección de duplicados

```
[2] DuplicatePreventionAgent
  → ChromaVectorStore.findSimilar(requirement)
  → Si ChromaDB offline → isAvailable=false → skip (gracioso)
  → Si similarity > 0.85 → SSE: duplicate_detected
  → AgentOrchestrator devuelve { isDuplicate: true }
  → Dashboard muestra advertencia de duplicado
```

### Flujo 3: Preview headless

```
[7] ScenarioPreviewRunner
  → buildGherkinToPlaywrightMessages(gherkin)
  → ContextBuilder.build() → generateChat()
  → OllamaClient devuelve código Playwright
  → McpPlaywrightClient.runScenario(code)
  → Playwright MCP ejecuta headless, captura screenshots base64
  → SSE: pipeline_done con preview: { steps[], screenshots[] }
  → ScreenshotViewer renderiza PNG desde base64
```

---

## 8. Patrones de Diseño Aplicados

| Patrón | Módulo | Propósito |
|--------|--------|-----------|
| **Strategy** | `AIProvider` | Intercambiar Ollama/OpenAI sin cambiar consumidores |
| **Builder** | `ContextBuilder` | Construcción fluida de arrays de mensajes chat |
| **Observer** | SSE + useSSEPipeline | Dashboard reacciona a eventos del pipeline |
| **Chain of Responsibility** | AgentOrchestrator | Cada agente pasa resultado al siguiente |
| **Retry + Backoff** | ChromaVectorStore.withRetry() | Resiliencia ante ChromaDB inestable |
| **Factory** | `createLogger(name)` | Logger pre-configurado por agente |
| **Screenplay** | Serenity/JS | Abstracción de pruebas en capas Actor/Task/UI |
| **Facade** | AgentOrchestrator | Oculta complejidad del pipeline a los servidores HTTP |

---

## 9. Configuración y Entorno

### Variables de entorno backend (`.env`)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `AI_PROVIDER` | `ollama` | `ollama` \| `openai` |
| `AI_MODEL` | `llama3.2` | Modelo a usar |
| `OPENAI_API_KEY` | — | Requerido si `AI_PROVIDER=openai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL de Ollama |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `PORT` | `4000` | Puerto del Pipeline Server |

### Scripts npm disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev:all` | Levanta los 3 servidores simultáneamente (concurrently) |
| `npm run ai:web` | UI Server Express en :3000 |
| `npm run ai:api` | Pipeline SSE Server en :4000 |
| `npm run frontend:dev` | Dashboard Next.js en :3001 |
| `npm run frontend:build` | Build de producción del frontend |
| `npm run ai:cli` | CLI interactivo |
| `npm run ai:gen` | Generación directa legacy |
| `npm test` | Tests E2E (Cucumber + Serenity) |
| `npm run test:unit` | Tests unitarios (Vitest) |
| `npm run test:unit:coverage` | Coverage de tests unitarios |

---

## 10. Evolución por Fases

| Fase | Nombre | Aporte Principal |
|------|--------|-----------------|
| 1-3 | Fundamentos | Serenity/JS + Playwright + Cucumber base |
| 4 | AI Generator | OllamaProvider, CodeGenerator, KnowledgeBase SQLite, CLI, MCP |
| 5 | Quality Loop | GherkinQualityScorer, LanguageDetector, self-healing (3 intentos) |
| 6 | Foundations | AIProvider interface, búsqueda Jaccard, Vitest unit tests |
| 7 | Playwright MCP | McpPlaywrightClient, WebMCP server (evaluado y absorbido por master) |
| 8 | Context Engineering | ContextBuilder, `generateChat()` reemplaza `generate()` deprecated |
| 9 | Multi-Agent Core | AgentOrchestrator, 5 agentes iniciales, SSE streaming |
| 10 | Browser Integration | ScenarioPreviewRunner, Playwright MCP en pipeline |
| 11 | Vector Dedup | ChromaVectorStore, embeddings Ollama, DuplicatePreventionAgent |
| 12 | Business Cache | BusinessAlignmentAgent, BusinessDocumentLoader, contexto de dominio |
| 13 | Type Safety & Resilience | Logger abstraction, `any` eliminado, retry exponencial, `tsc --noEmit` |
| 14 | **Next.js Dashboard** | **Dashboard React 19 con SSE en tiempo real, 7 agentes visibles** |
