# Automation Front AI

Framework de automatización de pruebas front-end impulsado por **IA Multi-Agente**, **Serenity/JS**, **Playwright** y un **Dashboard Next.js** en tiempo real.

> **Estado actual:** Fase 15 completada — Biblioteca Screenplay completa + arquitectura plug-in PipelineStep.

---

## ✨ ¿Qué hace este sistema?

Describes un requerimiento en lenguaje natural y el sistema:

1. **Analiza y alinea** el requerimiento con el contexto de negocio
2. **Detecta duplicados** semánticamente con ChromaDB (vectores)
3. **Genera** un escenario Gherkin con score de calidad ≥ 70/100
4. **Produce** Step Definitions en TypeScript (patrón Screenplay de Serenity/JS)
5. **Revisa** el código con análisis estático TypeScript (`tsc --noEmit`)
6. **Ejecuta una preview** headless con Playwright MCP (capturas de pantalla)
7. **Implementa** el archivo `.feature` y `.steps.ts` en el repositorio

Todo esto es visible en tiempo real en el **Dashboard web** (puerto 3001).

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 16.2.1, React 19, Tailwind v4, Geist |
| **UI Server (REST)** | Express.js 5, puerto 3000 |
| **Pipeline Server (SSE)** | Express.js 5, puerto 4000 |
| **IA Local** | Ollama (llama3.2, dockerizado) |
| **IA Cloud** | OpenAI API (gpt-4o) |
| **Vector Store** | ChromaDB (deduplicación semántica) |
| **Browser Automation** | Playwright MCP (Model Context Protocol) |
| **Framework de pruebas** | Serenity/JS 3.38 + Playwright 1.58 + Cucumber 10.9 |
| **Lenguaje** | TypeScript 5.x strict mode, Node.js |
| **Contenedores** | Docker Compose (Ollama, Playwright MCP) |

---

## 📋 Prerrequisitos

- Node.js v18 o superior
- Docker + Docker Compose (para Ollama y Playwright MCP)
- Java (para reportes Serenity BDD, opcional)

---

## 🛠️ Instalación

```bash
# 1. Clona el repositorio
git clone <url-del-repo>
cd "Automation Front AI"

# 2. Instala dependencias del backend
npm install

# 3. Instala dependencias del frontend
cd frontend && npm install && cd ..

# 4. Configura las variables de entorno
cp .env.example .env
# Edita .env con tu configuración de IA

# 5. Crea el archivo de entorno del frontend
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_UI_API_URL=http://localhost:3000
NEXT_PUBLIC_PIPE_API_URL=http://localhost:4000
EOF
```

### Variables de entorno principales (`.env`)

```bash
# Proveedor de IA
AI_PROVIDER=ollama          # 'ollama' | 'openai'
OPENAI_API_KEY=sk-...       # Solo si AI_PROVIDER=openai
AI_MODEL=llama3.2           # Modelo a usar

# Ollama (si es local sin Docker)
OLLAMA_BASE_URL=http://localhost:11434

# Logging
LOG_LEVEL=info              # 'debug' | 'info' | 'warn' | 'error'
```

---

## 🚀 Arranque Rápido

### Opción A: Stack completo (Recomendado)

```bash
# 1. Levanta la infraestructura Docker
docker-compose up -d

# 2. Arranca los 3 servidores de forma simultánea
npm run dev:all
```

Abre tu navegador en **`http://localhost:3001`** y describe un requerimiento.

### Opción B: Servidores individuales

```bash
# Terminal 1 — UI Server (REST: preview, implement, status)
npm run ai:web        # → http://localhost:3000

# Terminal 2 — Pipeline Server (SSE: 7 agentes en streaming)
npm run ai:api        # → http://localhost:4000

# Terminal 3 — Dashboard Next.js
npm run frontend:dev  # → http://localhost:3001
```

### Opción C: CLI interactivo (sin dashboard)

```bash
npm run ai:cli
```

### Opción D: Generación directa (legacy)

```bash
npm run ai:gen "El usuario hace login con credenciales válidas"
```

---

## 🤖 Pipeline de 7 Pasos (Plug-in Architecture)

El sistema usa una arquitectura de **pipeline plug-in**: cada agente está
envuelto en un `PipelineStep` que lee y escribe un `PipelineContext`
compartido. Para agregar o quitar un paso solo se edita `defaultPipeline.ts`.

```
[1] DuplicatePreventionStep — Búsqueda semántica en ChromaDB → ShortCircuit si cache hit
      ↓
[2] RequirementsStep        — Genera Gherkin + loop BusinessAlignment (máx. 3)
      ↓
[3] CodeGeneratorStep       — Genera TypeScript Screenplay (usa ProjectContextLoader RAG)
      ↓
[4] PersistToCacheStep      — Guarda Gherkin en ChromaDB
      ↓
[5] ValidationStep          — Preview headless con Playwright MCP (no bloqueante)
      ↓
[6] ReportingStep           — Genera reporte Markdown
      ↓
[7] ReviewImplementerStep   — tsc --noEmit + escritura .feature + .steps.ts
      ↓
   Resultado: archivos listos para integrar en la suite de pruebas
```

Cada paso emite eventos SSE en tiempo real, visibles en el dashboard.

## 📚 Biblioteca Screenplay

Step definitions generados por la IA usan clases Serenity/JS reales:

| Capa | Módulos | Ejemplo |
|------|---------|---------|
| **Tasks** | `NavigateToPage`, `SearchForItem`, `AddProductToCart`, `OpenShoppingCart`, `FillField`, `ClickButton`, `SelectDropdownOption` | `actorCalled('user').attemptsTo(SearchForItem.called('laptop'))` |
| **UI** | `NavigationUI`, `SearchUI`, `ProductListUI`, `CartUI`, `FormUI`, `LoginUI` | `CartUI.cartItemByName('Winter Top')` |
| **Questions** | `TextOf`, `CountOf`, `IsVisible`, `CurrentUrl`, `ElementExists` | `Ensure.that(TextOf.element(el), equals('Hola'))` |

---

## 🖥️ Dashboard (Puerto 3001)

El dashboard en Next.js conecta directamente con los dos servidores backend:

| Sección | Descripción |
|---------|-------------|
| **Formulario** | Ingresa el requerimiento en lenguaje natural |
| **Pipeline Timeline** | Barra de progreso + estado de cada agente en tiempo real |
| **Gherkin Viewer** | Escenario generado con colorización de sintaxis |
| **TypeScript Viewer** | Step Definitions con números de línea y colapsable |
| **Preview Carousel** | Screenshots y estado de cada paso Playwright |
| **Status Badge** | Indicador online/offline del servidor (polling 30s) |
| **Quality Badge** | Semáforo APROBADO / OBSERVACIONES / RECHAZADO |

---

## 🧪 Ejecución de Pruebas

```bash
# Tests E2E completos (Cucumber + Serenity)
npm test

# Feature específico
npx cucumber-js features/login.feature

# Tests unitarios del motor IA
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage

# Reporte HTML Serenity (requiere Java)
npm run report
# → target/site/serenity/index.html
```

---

## 📂 Estructura del Proyecto

```
Automation Front AI/
├── frontend/                    # Dashboard Next.js (Phase 14)
│   ├── src/
│   │   ├── app/                 # App Router (page.tsx, layout.tsx)
│   │   ├── components/
│   │   │   ├── gherkin/         # GherkinViewer, TypeScriptViewer
│   │   │   ├── pipeline/        # AgentTimeline, AgentStep
│   │   │   ├── preview/         # PreviewCarousel, PreviewStep, ScreenshotViewer
│   │   │   └── ui/              # StatusBadge, QualityBadge, Spinner, Toast
│   │   ├── hooks/               # useSSEPipeline, useImplement, usePreview
│   │   └── lib/                 # types.ts, api.ts
│   └── package.json
│
├── src/
│   ├── ai/
│   │   ├── agents/              # Agentes especializados del pipeline
│   │   ├── core/
│   │   │   ├── AgentOrchestrator.ts     # Orquestador plug-in (PipelineStep[])
│   │   │   ├── PipelineStep.ts          # Interfaz + PipelineContext (blackboard)
│   │   │   ├── ProjectContextLoader.ts  # RAG: firmas de Screenplay → LLM
│   │   │   └── GherkinQualityScorer.ts  # Score 0-100
│   │   ├── pipeline/
│   │   │   ├── defaultPipeline.ts       # Factory: agents → PipelineStep[]
│   │   │   └── steps/                   # 7 PipelineSteps concretos
│   │   └── infrastructure/
│   │       ├── AIProvider.ts            # Interfaz unificada (DIP)
│   │       ├── ChromaVectorStore.ts     # Vector store + retry
│   │       ├── ContextBuilder.ts        # Builder de mensajes chat
│   │       └── Logger.ts                # Logger abstraction
│   │
│   ├── api/server.ts            # Pipeline SSE server (puerto 4000)
│   ├── ui/server.ts             # UI REST server (puerto 3000)
│   ├── cli/index.ts             # CLI interactivo (Inquirer.js)
│   └── screenplay/              # Biblioteca Screenplay (Serenity/JS)
│       ├── tasks/               # 8 Tasks de negocio reutilizables
│       ├── ui/                  # 6 módulos de UI locators
│       ├── questions/           # 5 Questions para assertions
│       └── index.ts             # Barrel re-export
│
├── features/                    # Especificaciones BDD (Cucumber)
├── docs/                        # Documentación técnica y de usuario
├── docker-compose.yml           # Ollama + Playwright MCP
├── package.json
└── tsconfig.json
```

---

## 🐛 Solución de Problemas

| Problema | Solución |
|----------|----------|
| `ERR_CONNECTION_REFUSED` en :3000 o :4000 | Verificar que `npm run ai:web` y `npm run ai:api` estén corriendo |
| `ERR_CONNECTION_REFUSED` en :3001 | Verificar que `npm run frontend:dev` esté corriendo |
| `dev:all` falla con "concurrently not found" | `npm install --save-dev concurrently` |
| Timeout de Ollama (>60s) | Normal para modelos grandes; timeout configurado en 5 min |
| `sqlite3` error en Mac ARM | `npm rebuild sqlite3` |
| ChromaDB no disponible | El sistema usa fallback gracioso; ChromaDB es opcional |
| CORS error en el frontend | Verificar `NEXT_PUBLIC_UI_API_URL` y `NEXT_PUBLIC_PIPE_API_URL` en `frontend/.env.local` |

---

## 📚 Documentación Detallada

| Documento | Descripción |
|-----------|-------------|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Arquitectura técnica completa, diagramas, patrones de diseño |
| [`docs/GUIA_TECNICA.md`](docs/GUIA_TECNICA.md) | Guía para desarrolladores (BDD, Screenplay, agentes) |
| [`docs/GUIA_USUARIO.md`](docs/GUIA_USUARIO.md) | Guía de uso para no técnicos |
