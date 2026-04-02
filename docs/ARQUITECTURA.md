# Arquitectura del Sistema — Automation Front AI

**Rama activa:** `master`
**Última actualización:** 2026-04-02
**Versión del sistema:** Fase 13 — Type Safety & Resilience

---

## Índice

1. [Visión General](#1-visión-general)
2. [Estructura de Directorios](#2-estructura-de-directorios)
3. [Diagrama de Arquitectura en Capas](#3-diagrama-de-arquitectura-en-capas)
4. [Módulos del Sistema](#4-módulos-del-sistema)
5. [Flujos de Datos Principales](#5-flujos-de-datos-principales)
6. [Patrones de Diseño Aplicados](#6-patrones-de-diseño-aplicados)
7. [Configuración y Entorno](#7-configuración-y-entorno)
8. [CI/CD y Despliegue](#8-cicd-y-despliegue)
9. [Deuda Técnica Identificada](#9-deuda-técnica-identificada)
10. [Mejoras Propuestas](#10-mejoras-propuestas)
11. [Evolución por Fases](#11-evolución-por-fases)

---

## 1. Visión General

El sistema es un **framework de automatización de pruebas potenciado por IA** cuyo objetivo final es la auto-implementación del código de pruebas a partir de requerimientos en lenguaje natural.

El usuario describe un comportamiento en texto libre y el sistema produce:
1. Un escenario Gherkin validado semánticamente con score de calidad
2. Step Definitions en TypeScript siguiendo el patrón Screenplay de Serenity/JS
3. Código ejecutable listo para integrarse en la suite de pruebas

### Principios de diseño

| Principio | Implementación |
|-----------|---------------|
| **Separación de responsabilidades** | 5 capas independientes (UI, Aplicación, Dominio, Infraestructura, Persistencia) |
| **Proveedor de IA intercambiable** | Interfaz `AIProvider` con implementaciones Ollama y OpenAI |
| **Calidad garantizada** | Pipeline de scoring + bucle de auto-corrección (máx. 3 intentos) |
| **Persistencia de conocimiento** | Knowledge Base SQLite para deduplicación y ciclo de aprendizaje |
| **Multi-interfaz** | Web UI, CLI interactivo y servidor MCP para IDEs |

### Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Lenguaje** | TypeScript 5.x (strict mode), Node.js |
| **IA Local** | Ollama (llama3.2, dockerizado) |
| **IA Cloud** | OpenAI API (gpt-4o) |
| **Framework de pruebas** | Serenity/JS 3.38 + Playwright 1.58 + Cucumber 10.9 |
| **Patrón de pruebas** | Screenplay Pattern |
| **Persistencia** | SQLite 3 (knowledge_base.sqlite) |
| **API Web** | Express.js 5 |
| **CLI** | Inquirer.js 13 |
| **IDE Integration** | Model Context Protocol (MCP) |
| **Contenedores** | Docker Compose (Ollama) |
| **CI/CD** | GitHub Actions |

---

## 2. Estructura de Directorios

```
Automation Front AI/
│
├── src/
│   ├── ai/                          # Motor de generación IA
│   │   ├── core/                    # Procesadores de dominio
│   │   │   ├── CodeGenerator.ts         [Fase 4 - legacy]
│   │   │   ├── DuplicateDetector.ts     [Fase 4]
│   │   │   ├── GherkinQualityScorer.ts  [Fase 5 - NUEVO]
│   │   │   ├── LanguageDetector.ts      [Fase 5 - NUEVO]
│   │   │   └── ProjectContextLoader.ts  [Fase 4]
│   │   │
│   │   ├── infrastructure/          # Adaptadores de proveedores IA
│   │   │   ├── AIProvider.ts            [interfaz]
│   │   │   ├── OllamaClient.ts          [Fase 4 - legacy]
│   │   │   └── OpenAIClient.ts          [Fase 4]
│   │   │
│   │   ├── prompts/                 # Templates para CodeGenerator
│   │   │   ├── DuplicateCheckPrompt.ts  [Fase 4]
│   │   │   └── ScreenplaySystemPrompt.ts[Fase 4]
│   │   │
│   │   ├── OllamaProvider.ts        # Cliente Ollama principal [Fase 4/5]
│   │   ├── PromptTemplates.ts       # Templates buildGherkin/buildRefinement [Fase 5]
│   │   ├── ScenarioGenerator.ts     # Orquestador principal [Fase 5]
│   │   └── generator.ts             # Punto de entrada legacy [Fase 4]
│   │
│   ├── cli/
│   │   └── index.ts                 # CLI interactivo con Inquirer [Fase 5]
│   │
│   ├── db/
│   │   └── KnowledgeBase.ts         # Persistencia SQLite [Fase 4/5]
│   │
│   ├── mcp/
│   │   └── server.ts                # Servidor MCP para IDEs [Fase 4]
│   │
│   ├── screenplay/                  # Código de pruebas (Serenity/JS)
│   │   ├── actors/
│   │   │   └── Cast.ts              # Factory de actores Playwright
│   │   ├── specs/
│   │   │   ├── login.spec.ts        # Test Playwright ejemplo
│   │   │   └── sample.spec.ts       # Test de verificación
│   │   ├── tasks/
│   │   │   └── Login.ts             # Task reutilizable de login
│   │   └── ui/
│   │       └── LoginUI.ts           # Selectores de página de login
│   │
│   └── ui/
│       ├── server.ts                # Servidor Express [Fase 5]
│       └── public/
│           └── index.html           # SPA con quality badges [Fase 5]
│
├── features/                        # Especificaciones BDD (Cucumber)
│   ├── login.feature                # Feature de ejemplo
│   ├── step_definitions/
│   │   └── login.steps.ts           # Bindings TypeScript
│   └── support/
│       ├── setup.ts                 # Hooks y configuración Cucumber
│       └── EngagePlaywright.ts      # Cast para Cucumber
│
├── docs/
│   ├── ARQUITECTURA.md              # Este documento
│   ├── GUIA_TECNICA.md
│   └── GUIA_USUARIO.md
│
├── .github/workflows/
│   └── playwright.yml               # Pipeline CI/CD
│
├── knowledge_base.sqlite            # Base de conocimiento (runtime)
├── docker-compose.yml               # Ollama local
├── cucumber.js                      # Configuración Cucumber
├── playwright.config.ts             # Configuración Playwright
├── tsconfig.json                    # Configuración TypeScript
└── package.json
```

---

## 3. Diagrama de Arquitectura en Capas

```
╔══════════════════════════════════════════════════════════════════╗
║                     CAPA DE INTERFAZ                             ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ║
║  │    Web UI        │  │  CLI Interactivo │  │   MCP Server    │  ║
║  │  Express + HTML  │  │   Inquirer.js    │  │  stdio (IDEs)   │  ║
║  │  :3000           │  │  npm run ai:cli  │  │  npm run ai:mcp │  ║
║  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ ║
╠═══════════╪═════════════════════╪═════════════════════╪═══════════╣
║           │         CAPA DE APLICACIÓN                │           ║
║           └──────────────────┬──────────────────────-─┘           ║
║                    ┌─────────┴──────────┐                         ║
║                    │  ScenarioGenerator  │  (Orquestador Fase 5)  ║
║                    │                    │                         ║
║                    │ 1. detect language  │                         ║
║                    │ 2. search KB        │                         ║
║                    │ 3. generate + score │◄── bucle max 3 veces   ║
║                    │ 4. validate syntax  │                         ║
║                    │ 5. validate semantic│                         ║
║                    │ 6. save to KB       │                         ║
║                    └─────────┬──────────┘                         ║
╠═════════════════════════════╪════════════════════════════════════╣
║         CAPA DE DOMINIO     │                                     ║
║   ┌─────────────────────────┼──────────────────────────────────┐  ║
║   │  ┌──────────────────┐   │   ┌──────────────────┐          │  ║
║   │  │ LanguageDetector  │   │   │GherkinQualityScore│          │  ║
║   │  │ 'es' / 'en'      │   │   │  Score 0-100     │          │  ║
║   │  └──────────────────┘   │   │  5 Reglas        │          │  ║
║   │                         │   └──────────────────┘          │  ║
║   │  ┌──────────────────┐   │   ┌──────────────────┐          │  ║
║   │  │ PromptTemplates   │   │   │DuplicateDetector  │          │  ║
║   │  │ buildGherkin()   │   │   │(Fase 4)           │          │  ║
║   │  │ buildRefinement()│   │   └──────────────────┘          │  ║
║   │  └──────────────────┘   │                                  │  ║
║   │  ┌──────────────────┐   │   ┌──────────────────┐          │  ║
║   │  │  CodeGenerator    │   │   │ProjectContextLoad │          │  ║
║   │  │  (Fase 4 legacy) │   │   │(Fase 4)           │          │  ║
║   │  └──────────────────┘   │   └──────────────────┘          │  ║
║   └─────────────────────────┼──────────────────────────────────┘  ║
╠═════════════════════════════╪════════════════════════════════════╣
║      CAPA DE INFRAESTRUCTURA│                                     ║
║   ┌──────────────────────┐  │  ┌──────────────────────────────┐   ║
║   │   OllamaProvider     │  │  │       OpenAIClient            │   ║
║   │ (implementación      │  │  │  (implementación AIProvider)  │   ║
║   │  principal Fase 4/5) │  │  │  requiere OPENAI_API_KEY      │   ║
║   │ localhost:11434      │  │  │  modelo: gpt-4o               │   ║
║   │ timeout: 5 min       │◄─┘  └──────────────────────────────┘   ║
║   └──────────────────────┘                                         ║
║                    ┌──────────────────────────────────┐           ║
║                    │         AIProvider (interfaz)     │           ║
║                    │  generate(system, user): string   │           ║
║                    └──────────────────────────────────┘           ║
╠════════════════════════════════════════════════════════════════════╣
║                    CAPA DE PERSISTENCIA                            ║
║                    ┌──────────────────────────────────┐           ║
║                    │       KnowledgeBase (SQLite)      │           ║
║                    │  addScenario / searchScenarios    │           ║
║                    │  updateExecutionResult            │           ║
║                    │  getFailedScenarios               │           ║
║                    └──────────────────────────────────┘           ║
╠════════════════════════════════════════════════════════════════════╣
║               CAPA DE EJECUCIÓN DE PRUEBAS                         ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │           Serenity/JS (Screenplay Pattern)                  │   ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   ║
║  │  │  Actors  │  │  Tasks   │  │    UI    │  │Questions │  │   ║
║  │  │  (Cast)  │  │ (Login)  │  │(LoginUI) │  │(Ensure)  │  │   ║
║  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │   ║
║  │       └─────────────┴─────────────┴──────────────┘        │   ║
║  │                   Playwright (Browser Driver)               │   ║
║  │              Cucumber (BDD) / feature files                 │   ║
║  └────────────────────────────────────────────────────────────┘   ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 4. Módulos del Sistema

### 4.1 Motor de Generación IA (`src/ai/`)

#### `ScenarioGenerator` — Orquestador principal (Fase 5)

La clase central del sistema. Coordina todo el pipeline de generación.

**Firma del método principal:**
```typescript
generateScenario(
  userRequirement: string,
  maxAttempts: number = 3
): Promise<{ gherkin: string; quality: QualityReport } | null>
```

**Algoritmo del bucle de calidad:**
```
1. LanguageDetector.detect(requirement)           → 'es' | 'en'
2. KnowledgeBase.searchScenarios(requirement)     → check duplicados
3. FOR attempt = 1..maxAttempts:
   │  a. prompt = attempt===1
   │       ? buildGherkinPrompt(req, lang)
   │       : buildRefinementPrompt(req, bestGherkin, suggestions, lang)
   │  b. OllamaProvider.generateCompletion(prompt) → raw gherkin
   │  c. fallback semántico si falta Feature:/Scenario:
   │  d. GherkinQualityScorer.score(gherkin, lang) → {score, issues}
   │  e. if score > bestScore → bestGherkin = gherkin
   │  f. if score >= 70 → BREAK
4. validateGherkinSyntax(bestGherkin)
5. validateGherkinSemantic(requirement, bestGherkin) via LLM
6. KnowledgeBase.addScenario(requirement, bestGherkin)
7. return { gherkin: bestGherkin, quality: bestReport }
```

#### `GherkinQualityScorer` — Motor de calidad (Fase 5 nuevo)

Evalúa la calidad del Gherkin generado con 5 reglas ponderadas:

| Regla | Deducción | Condición detectada |
|-------|-----------|---------------------|
| Nombre Feature genérico | -25 pts | `/Feature:\s*Generated Feature/i` |
| Scenario repite input crudo | -25 pts | `/Scenario:\s*Generated Scenario for/i` |
| Mezcla de idiomas (req en ES) | -20 pts | Palabras inglesas en pasos ≥ 2 |
| Then sin valor verificable | -15 pts | `should be displayed/visible/shown` sin comillas |
| When sin datos concretos | -15 pts | Sin valores entre comillas en el paso |

**Score mínimo para aprobar:** 70/100

#### `LanguageDetector` — Detección de idioma (Fase 5 nuevo)

```typescript
// Detecta español si hay 3+ palabras clave españolas
// Patrones: el, la, ingresa, realiza, valida, usuario, pagina, etc.
static detect(text: string): 'es' | 'en'
```

#### `PromptTemplates` — Ingeniería de prompts (Fase 5)

| Función / Constante | Propósito |
|---------------------|-----------|
| `buildGherkinPrompt(req, lang)` | Genera escenario inicial con reglas de calidad e idioma |
| `buildRefinementPrompt(req, prev, suggestions, lang)` | Prompt de corrección con issues específicos |
| `STEP_DEFINITION_PROMPT_TEMPLATE` | Genera TypeScript con patrón Screenplay |
| `SCENARIO_VALIDATION_PROMPT_TEMPLATE` | Valida semánticamente requirement vs Gherkin |
| `LEARNING_FEEDBACK_PROMPT_TEMPLATE` | Mejora escenarios fallidos en ejecución |
| `GHERKIN_PROMPT_TEMPLATE` | Alias de compatibilidad (Fase 4, deprecado) |

#### `OllamaProvider` — Cliente Ollama principal

```typescript
// Configuración por defecto
{ baseUrl: 'http://localhost:11434', model: 'llama3.2' }
// Timeout: 300,000ms (5 minutos)

// Métodos clave
isHealthy(): Promise<boolean>
ensureModelAvailable(fallback?: string): Promise<void>
generateCompletion(prompt: string, options?: any): Promise<string>
```

### 4.2 Knowledge Base (`src/db/`)

#### `KnowledgeBase` — Persistencia SQLite

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS scenarios (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  description      TEXT,          -- Requerimiento original
  gherkin_content  TEXT,          -- Gherkin generado
  hash             TEXT UNIQUE,   -- SHA-256 del contenido (deduplicación exacta)
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  execution_status TEXT DEFAULT 'pending',   -- pending | passed | failed
  execution_error  TEXT           -- Mensaje de error si falló
);
```

**Capacidades:**
- Deduplicación exacta por hash SHA-256
- Búsqueda por keyword con `LIKE` (búsqueda textual simple)
- Tracking de resultados de ejecución (base para ciclo de aprendizaje)

### 4.3 Interfaces de usuario

#### Web UI — `src/ui/`

```
POST /api/generate
  → Body: { requirement: string }
  ← Body: { success, gherkin, quality: { score, passed, issues } }

POST /api/generate-steps
  → Body: { gherkin: string }
  ← Body: { success, steps: string }

GET /api/status
  ← Body: { status: 'online' | 'offline' | 'error' }
```

**Quality badge visual:**
```
score >= 70  →  🟢 badge-pass  (#28a745)
score >= 50  →  🟠 badge-warn  (#fd7e14)
score < 50   →  🔴 badge-fail  (#dc3545)
```

#### CLI — `src/cli/index.ts`

```
Menú principal
├── Generar Escenario
│   ├── Input: requerimiento libre
│   ├── Output: Gherkin + score (✅ APROBADO / ⚠ CON OBSERVACIONES)
│   └── Opcional: Step Definitions
├── Generar por Lotes
│   ├── Colecta N requerimientos (termina con "FIN")
│   └── Reporta exitosos/fallidos
└── Verificar Estado de IA
    └── isHealthy() + listModels()
```

#### MCP Server — `src/mcp/server.ts`

Expone dos herramientas para IDEs compatibles con MCP (ej. Claude, Cursor):

| Tool | Input | Output |
|------|-------|--------|
| `generate_test` | `description`, `filename` | Ruta al archivo generado |
| `run_tests` | `grep` (opcional) | Resultado de ejecución de Playwright |

> **Nota:** El servidor MCP usa `CodeGenerator` (Fase 4), no `ScenarioGenerator` (Fase 5). Ver mejora propuesta §10.3.

### 4.4 Capa de ejecución de pruebas (`src/screenplay/` + `features/`)

Implementa el patrón **Screenplay** de Serenity/JS:

```
Actor (usuario)
  └── Abilities
        ├── BrowseTheWebWithPlaywright  → controla el navegador
        └── TakeNotes                   → memoria entre pasos

Actor.attemptsTo(
  Navigate.to(url),           // Task atómica
  Login.withCredentials(u,p), // Task compuesta (reutilizable)
  Ensure.that(element, equals(value))  // Question + Assertion
)
```

**Estructura de un feature completo:**
```
features/login.feature          ← Especificación (Gherkin, legible por negocio)
features/step_definitions/
  login.steps.ts                ← Binding TypeScript (Given/When/Then)
src/screenplay/
  tasks/Login.ts                ← Tarea reutilizable de dominio
  ui/LoginUI.ts                 ← Selectores de página (única fuente de verdad)
  actors/Cast.ts                ← Factory de actores con capacidades
```

---

## 5. Flujos de Datos Principales

### 5.1 Generación via Web UI

```
Browser                    Express Server             ScenarioGenerator
  │                              │                          │
  │  POST /api/generate          │                          │
  │  { requirement }             │                          │
  ├─────────────────────────────►│                          │
  │                              │  generateScenario(req)   │
  │                              ├─────────────────────────►│
  │                              │                          │ detect lang
  │                              │                          │ search KB
  │                              │                          │ ┌─── attempt 1
  │                              │                          │ │  buildGherkinPrompt
  │                              │                          │ │  OllamaProvider.generate
  │                              │    OllamaProvider         │ │  score()
  │                              │◄────────────────────────►│ │  score>=70?
  │                              │                          │ └─── attempt 2/3 si no
  │                              │                          │ validateSyntax
  │                              │                          │ validateSemantic
  │                              │                          │ KB.addScenario
  │                              │  {gherkin, quality}      │
  │                              │◄─────────────────────────┤
  │  { success, gherkin,         │                          │
  │    quality:{score,issues} }  │                          │
  │◄─────────────────────────────┤                          │
  │                              │                          │
  │  renderiza quality badge     │                          │
  │  + gherkin en pre            │                          │
```

### 5.2 Ejecución de pruebas Cucumber

```
npm test
  │
  ├── cucumber-js
  │     │
  │     ├── setup.ts:BeforeAll
  │     │     └── chromium.launch() → browser
  │     │
  │     ├── setup.ts:Before (cada scenario)
  │     │     └── EngagePlaywright.prepare(actor)
  │     │           └── actor.whoCan(BrowseTheWebWithPlaywright)
  │     │
  │     ├── Paso: Given / When / Then
  │     │     └── actorCalled('usuario').attemptsTo(
  │     │           Navigate.to(url),
  │     │           Task.withData(...),
  │     │           Ensure.that(element, condition)
  │     │         )
  │     │
  │     └── setup.ts:AfterAll
  │           └── browser.close()
  │
  └── serenity-bdd run (Java)
        └── target/site/serenity/index.html
```

---

## 6. Patrones de Diseño Aplicados

| Patrón | Dónde | Descripción |
|--------|-------|-------------|
| **Strategy** | `AIProvider` + `OpenAIClient` / `OllamaClient` / `OllamaProvider` | Proveedor de IA intercambiable vía variable de entorno |
| **Factory Method** | `Login.withCredentials()` | Crea Tasks sin exponer constructores |
| **Template Method** | `buildGherkinPrompt(req, lang)` | Estructura fija con partes variables por idioma |
| **Chain of Responsibility** | Bucle de 3 intentos en `generateScenario()` | Cada intento procesa o pasa al siguiente |
| **Repository** | `KnowledgeBase` | Encapsula todo el acceso a datos SQLite |
| **Adapter** | `Cast` / `EngagePlaywright` | Adapta Playwright a la abstracción de actores Serenity |
| **Decorator** | `GherkinQualityScorer` | Añade evaluación de calidad al resultado del LLM |

---

## 7. Configuración y Entorno

### Variables de entorno

| Variable | Requerida | Defecto | Descripción |
|----------|-----------|---------|-------------|
| `OPENAI_API_KEY` | Solo si `AI_PROVIDER=openai` | — | API key de OpenAI |
| `AI_PROVIDER` | No | `openai` | `openai` o `ollama` |
| `AI_MODEL` | No | `llama3` / `gpt-4o` | Modelo a utilizar |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | URL del servidor Ollama |
| `PORT` | No | `3000` | Puerto del servidor web |

### Archivos de configuración clave

| Archivo | Propósito |
|---------|-----------|
| `tsconfig.json` | TypeScript strict, target ES2019, rootDir: src |
| `cucumber.js` | Entry points: features/**/*.feature + support |
| `playwright.config.ts` | Chromium headless, trace on-first-retry |
| `docker-compose.yml` | Ollama en puerto 11434 con volumen persistente |

---

## 8. CI/CD y Despliegue

### Pipeline GitHub Actions (`.github/workflows/playwright.yml`)

```
Trigger: push / pull_request → main | master
Job: test (timeout: 60 min)

Pasos:
  1. actions/checkout@v4
  2. Node.js 18
  3. JDK 17 (requerido por Serenity BDD reporter)
  4. npm ci
  5. npx playwright install --with-deps
  6. npm run test:run  (continue-on-error: true)
  7. npm run report    (Serenity BDD HTML)
  8. Upload artifacts: target/site/serenity/  (retención: 30 días)
```

### Comandos de ejecución

```bash
# Desarrollo
npm run ai:web        # Web UI en localhost:3000
npm run ai:cli        # CLI interactivo
npm run ai:gen "req"  # Generación legacy directa

# Pruebas
npm test              # Cucumber + Serenity report
npm run test:run      # Solo Cucumber
npm run test:ui       # Playwright con interfaz visual
npm run test:debug    # Playwright en modo debug

# Utilidades
npm run clean         # Limpia artefactos de prueba
npm run report        # Genera reporte Serenity HTML
```

### Infraestructura Ollama local

```bash
docker-compose up -d ollama                        # Inicia Ollama
docker exec -it ollama_ai ollama pull llama3.2     # Descarga modelo
docker exec -it ollama_ai ollama list              # Lista modelos disponibles
```

---

## 9. Deuda Técnica Identificada

### DT-001 — Dos implementaciones de cliente Ollama
**Severidad:** Media
**Archivos:** `src/ai/OllamaProvider.ts` y `src/ai/infrastructure/OllamaClient.ts`
**Descripción:** Existen dos clientes Ollama con propósitos solapados. `OllamaProvider` es más completo (timeout 5min, pullModel, ensureModel) y es el que usa ScenarioGenerator. `OllamaClient` implementa `AIProvider` y es usado por `CodeGenerator` (legacy).
**Impacto:** Mantenimiento duplicado, riesgo de divergencia.

### DT-002 — CodeGenerator y ScenarioGenerator coexisten
**Severidad:** Baja
**Archivos:** `src/ai/core/CodeGenerator.ts`, `src/ai/generator.ts`
**Descripción:** `CodeGenerator` es el orquestador de Fase 4, reemplazado por `ScenarioGenerator` en Fase 5. Sigue activo porque el servidor MCP lo referencia.
**Impacto:** Dos pipelines paralelos con calidad diferente.

### DT-003 — GHERKIN_PROMPT_TEMPLATE alias en PromptTemplates
**Severidad:** Baja
**Archivo:** `src/ai/PromptTemplates.ts`
**Descripción:** `export const GHERKIN_PROMPT_TEMPLATE = buildGherkinPrompt('{requirement}', 'en')` es un alias de compatibilidad que nadie usa actualmente en el código activo.
**Impacto:** Confusión para nuevos desarrolladores.

### DT-004 — Búsqueda en KB solo por keyword (LIKE)
**Severidad:** Media
**Archivo:** `src/db/KnowledgeBase.ts`
**Descripción:** `searchScenarios()` usa `LIKE %keyword%` en SQLite. No detecta duplicados semánticos (ej. "iniciar sesión" vs "ingresar al sistema").
**Impacto:** La deduplicación solo funciona si las palabras coinciden textualmente.

### DT-005 — Validación semántica falla silenciosamente
**Severidad:** Media
**Archivo:** `src/ai/ScenarioGenerator.ts`
**Descripción:** Si el LLM falla durante `validateGherkinSemantic()`, el catch retorna `true` y el escenario se aprueba igualmente.
**Impacto:** Escenarios semánticamente incorrectos pueden persistirse en la KB.

### DT-006 — Sin tests unitarios para componentes Fase 5
**Severidad:** Media
**Descripción:** `GherkinQualityScorer` y `LanguageDetector` no tienen suite de tests automatizados. Solo se prueban manualmente.
**Impacto:** Regresiones silenciosas en futuras modificaciones.

### DT-007 — MCP Server usa pipeline Fase 4
**Severidad:** Media
**Archivo:** `src/mcp/server.ts`
**Descripción:** La herramienta `generate_test` del servidor MCP usa `CodeGenerator` (Fase 4) en lugar de `ScenarioGenerator` (Fase 5), por lo que los clientes MCP no se benefician del scoring de calidad.
**Impacto:** Los usuarios de IDEs con MCP reciben outputs de menor calidad.

---

## 10. Mejoras Propuestas

### M-01 — Unificar clientes Ollama ⭐ Prioridad Alta
**Relacionado con:** DT-001
**Acción:** Eliminar `OllamaClient.ts` y hacer que `OllamaProvider` implemente la interfaz `AIProvider`. Actualizar `CodeGenerator` para usarlo.

```typescript
// Objetivo: OllamaProvider.ts implementa AIProvider
export class OllamaProvider implements AIProvider {
  generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    return this.generateCompletion(prompt);
  }
}
```

### M-02 — Actualizar servidor MCP a Fase 5 ⭐ Prioridad Alta
**Relacionado con:** DT-007
**Acción:** Reemplazar `CodeGenerator` por `ScenarioGenerator` en `src/mcp/server.ts`. Devolver también el `quality` report en la respuesta de la herramienta.

### M-03 — Tests unitarios para GherkinQualityScorer ⭐ Prioridad Media
**Relacionado con:** DT-006
**Acción:** Crear `src/ai/core/__tests__/GherkinQualityScorer.test.ts` con Jest o Vitest. Cubrir al menos los 5 casos de reglas + casos de borde.

```typescript
// Estructura propuesta
describe('GherkinQualityScorer', () => {
  it('score 0 for fully generic Phase 4 output')
  it('score 100 for ideal Phase 5 output')
  it('deducts 20 for language mismatch in ES scenario')
  it('deducts 15 for vague Then without quoted value')
  it('deducts 15 for When without concrete data')
  it('returns passed=true only when score >= 70')
})
```

### M-04 — Eliminar alias GHERKIN_PROMPT_TEMPLATE ⭐ Prioridad Baja
**Relacionado con:** DT-003
**Acción:** En la próxima limpieza, eliminar la línea del alias y verificar que ningún import externo lo use.

### M-05 — Búsqueda semántica en Knowledge Base ⭐ Prioridad Media
**Relacionado con:** DT-004
**Acción:** Integrar un motor de embeddings ligero (ej. `@xenova/transformers` con modelo `all-MiniLM-L6-v2`) para búsqueda vectorial en la KB. Almacenar el embedding junto al hash en SQLite usando la extensión `sqlite-vss`.

```
Flujo propuesto:
  requirement → embed() → vector[384]
  searchScenarios: cosine_similarity(vector, stored_vectors) > 0.85
```

### M-06 — Validar variables de entorno al arranque ⭐ Prioridad Media
**Acción:** Añadir validación con Zod al inicio del servidor y del CLI para fallar rápido con mensajes claros.

```typescript
// src/config.ts (nuevo)
import { z } from 'zod';

const EnvSchema = z.object({
  AI_PROVIDER: z.enum(['openai', 'ollama']).default('ollama'),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  PORT: z.coerce.number().default(3000),
}).refine(
  (env) => env.AI_PROVIDER !== 'openai' || !!env.OPENAI_API_KEY,
  { message: 'OPENAI_API_KEY is required when AI_PROVIDER=openai' }
);

export const config = EnvSchema.parse(process.env);
```

### M-07 — Limpieza formal de CodeGenerator (Fase 4 legacy) ⭐ Prioridad Baja
**Relacionado con:** DT-002
**Acción:** Una vez completada M-02 (MCP a Fase 5), marcar `CodeGenerator.ts` y `generator.ts` como `@deprecated` con JSDoc y planificar su eliminación en Fase 6.

---

## 11. Evolución por Fases

| Fase | Objetivo | Componentes añadidos | Estado |
|------|----------|----------------------|--------|
| **1-2** | Framework base BDD + Serenity/JS | `features/`, `screenplay/`, Cucumber config | ✅ Completado |
| **3** | Integración IA (multi-proveedor) | `AIProvider`, `OpenAIClient`, `OllamaClient`, `CodeGenerator` | ✅ Completado |
| **4** | Generación completa con KB y CLI | `ScenarioGenerator` (v1), `KnowledgeBase`, `OllamaProvider`, `PromptTemplates`, MCP, Web UI | ✅ Completado |
| **5** | Motor de calidad Gherkin | `LanguageDetector`, `GherkinQualityScorer`, `buildGherkinPrompt()`, `buildRefinementPrompt()`, bucle auto-corrección, quality badges | ✅ Completado |
| **6** | Limpieza técnica + Config Zod | `config.ts` con Zod, `AIProvider` unificado, `OllamaProvider` como implementación principal | ✅ Completado |
| **7** | Preview en navegador + WebMCP | `PreviewAgent`, `ScenarioImplementer`, `ScenarioPreviewRunner`, `GherkinStepParser`, `playwright-client.ts`, `webmcp-server.ts` (SSE MCP) | ✅ Completado |
| **8** | Context Engineering | `ContextBuilder`, `Message[]`, `generateChat()`, alineación de capas de contexto | ✅ Completado |
| **9** | RAG Multi-Agente | `ProjectContextLoader` con RAG, `AgentOrchestrator` v1 (5 agentes), `KnowledgeBase` extendida | ✅ Completado |
| **10** | Playwright MCP en Docker | `McpPlaywrightClient` dockerizado, `CodeGeneratorAgent` con snapshot MCP | ✅ Completado |
| **11** | API Backend SSE | `src/api/server.ts` (puerto 4000), endpoint SSE `/api/v1/generate-scenario` | ✅ Completado |
| **12** | Business Alignment + ChromaDB | `BusinessAlignmentAgent`, `DuplicatePreventionAgent`, `ChromaVectorStore`, `BusinessDocumentLoader`, `OllamaEmbeddingFunction` | ✅ Completado |
| **13** | Type Safety & Resilience | `Logger` abstracto, typing fuerte en `AgentOrchestrator`, migración a `generateChat()` en `BusinessAlignmentAgent` y `CodeGeneratorAgent`, análisis estático real en `ReviewImplementerAgent` (tsc --noEmit), resiliencia con retry en `ChromaVectorStore`, script `ai:api` | ✅ Completado |

---

## 12. Pipeline de 7 Agentes (Fase 13)

```
UserRequirement (lenguaje natural)
        │
        ▼
┌─────────────────────────────────────────────────┐
│  0. DuplicatePreventionAgent                    │
│     ChromaDB searchSimilar() → similitud ≥ 0.85 │
│     → Si duplicado: retorna Gherkin en caché     │
└────────────────┬────────────────────────────────┘
                 │ (no duplicado)
        ┌────────▼────────┐
        │ Bucle BDD↔Negocio│  máx. 3 intentos
        │                  │
        │  1. RequirementsAgent                   │
        │     NL → Gherkin (ContextBuilder + RAG) │
        │                                         │
        │  1.5 BusinessAlignmentAgent             │
        │     Gherkin × docs/business_context/    │
        │     → isAligned? Si no: feedback loop   │
        └──────────────────┘
                 │ (alineado)
        ┌────────▼────────────────────────────────┐
        │  2. CodeGeneratorAgent                  │
        │     Gherkin → TypeScript (Screenplay)   │
        │     + Playwright MCP Accessibility Tree │
        └────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │  3. ValidationAgent                     │
        │     Preview en navegador real (MCP)     │
        │     Screenshot por paso                 │
        └────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │  4. ReportingAgent                      │
        │     Genera reporte Markdown/HTML        │
        └────────┬────────────────────────────────┘
                 │ (si validation pasó)
        ┌────────▼────────────────────────────────┐
        │  5. ReviewImplementerAgent              │
        │     tsc --noEmit (análisis estático)    │
        │     → escribe .feature + .steps.ts      │
        └────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │  0b. DuplicatePreventionAgent           │
        │     saveToCache() → ChromaDB            │
        └─────────────────────────────────────────┘
```

## 13. Infraestructura de Logging (Fase 13)

Todos los agentes e infraestructura usan el Logger abstracto:

```typescript
import { createLogger } from '../infrastructure/Logger';

class MyAgent {
    private readonly logger = createLogger('MyAgent');

    async run() {
        this.logger.info('Iniciando...');
        this.logger.warn('Atención', { detail: '...' });
        this.logger.error('Fallo', error);
    }
}
```

Control de nivel: variable de entorno `LOG_LEVEL=debug|info|warn|error` (default: `info`).

---

*Documento actualizado el 2026-04-02 desde análisis de la rama `master` (Fase 13).*
