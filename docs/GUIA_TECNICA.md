# 🛠️ Guía Técnica — Automation Front AI

Documentación para desarrolladores sobre la implementación del framework:
pipeline multi-agente, BDD con Serenity/JS, arquitectura de infraestructura
y guías de extensión.

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | Next.js + React + Tailwind v4 | 16.2.1 / 19 |
| **Backend** | Node.js + Express.js | v18+ / v5 |
| **Lenguaje** | TypeScript strict mode | 5.x |
| **IA Local** | Ollama (Qwen3, Gemma 4, llama3.2) | configurable |
| **IA Cloud** | OpenAI | gpt-4o |
| **Embeddings** | bge-m3 (via Ollama) | recomendado |
| **Vector Store** | ChromaDB | latest |
| **Browser Automation** | Playwright + MCP | 1.58 |
| **BDD Framework** | Cucumber + Serenity/JS | 10.9 / 3.38 |
| **Patrón de pruebas** | Screenplay Pattern | — |
| **Unit Tests** | Vitest | latest |
| **Contenedores** | Docker Compose | — |

---

## 2. Arquitectura BDD — Screenplay Pattern

### Capas del framework de pruebas

```
features/*.feature                ← Especificaciones BDD (Gherkin)
  └── step_definitions/*.ts       ← Binding: Gherkin → Screenplay
        └── src/screenplay/
              ├── tasks/*.ts       ← Tareas de negocio (Login, SearchForItem, AddProductToCart…)
              ├── ui/*.ts          ← Selectores de UI (Page Elements)
              └── questions/*.ts   ← Questions para assertions (TextOf, IsVisible…)
```

#### 2.1 Feature (Gherkin)

```gherkin
Feature: Agregar Producto al Carro

  Scenario: Agregar winter top al carrito desde feature items
    Given que estoy en la URL "https://www.automationexercise.com/"
    And la seccion "feature items" es visible en pantalla
    When busca el "Winter Top" con precio "600RS" en la seccion "feature items"
    And hace clic en el boton "Add to Cart"
    And hace clic en el boton "View Cart"
    Then deberia ver el producto agregado correctamente en el carro
    And confirme que el "Winter Top" tiene el precio "600RS" en el carro
```

#### 2.2 Step Definitions (Glue Code)

```typescript
// features/step_definitions/agregar-producto.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Ensure, includes } from '@serenity-js/assertions';
import { NavigateToPage, AddProductToCart, OpenShoppingCart, ClickButton } from '../../src/screenplay/tasks';
import { ProductListUI, CartUI } from '../../src/screenplay/ui';
import { TextOf, IsVisible } from '../../src/screenplay/questions';

Given('que estoy en la URL {string}', async (url: string) => {
  await actorCalled('usuario').attemptsTo(NavigateToPage.at(url));
});

Given('la seccion {string} es visible en pantalla', async (section: string) => {
  await actorCalled('usuario').attemptsTo(
    Ensure.that(ProductListUI.section(section), IsVisible.onScreen()),
  );
});

When('busca el {string} con precio {string} en la seccion {string}',
  async (product: string, _price: string, _section: string) => {
    await actorCalled('usuario').attemptsTo(
      AddProductToCart.named(product),
    );
  }
);

When('hace clic en el boton {string}', async (label: string) => {
  await actorCalled('usuario').attemptsTo(ClickButton.withText(label));
});

Then('deberia ver el producto agregado correctamente en el carro', async () => {
  await actorCalled('usuario').attemptsTo(
    Ensure.that(CartUI.cartContainer(), IsVisible.onScreen()),
  );
});

Then('confirme que el {string} tiene el precio {string} en el carro',
  async (product: string, price: string) => {
    await actorCalled('usuario').attemptsTo(
      Ensure.that(TextOf.element(CartUI.cartItemByName(product)), includes(price)),
    );
  }
);
```

#### 2.3 Biblioteca de Tasks

La biblioteca de Tasks disponible para los step definitions generados por IA:

| Task | Factory Methods | Descripción |
|------|----------------|-------------|
| `Login` | `withCredentials(user, pass)` | Login con email + password |
| `NavigateToPage` | `at(url)`, `reload()`, `back()` | Navegación a URL |
| `SearchForItem` | `called(query)`, `byPressingEnter(query)` | Buscar en campo de búsqueda |
| `AddProductToCart` | `named(productName)` | Encontrar producto + clic Add to Cart |
| `OpenShoppingCart` | `fromHeader()`, `fromModal()` | Abrir carrito |
| `FillField` | `byLabel(label, value)`, `byPlaceholder(ph, value)`, `byName(name, value)` | Llenar campo de texto |
| `SelectDropdownOption` | `named(text).fromDropdownLabeled(label)` | Seleccionar opción de dropdown |
| `ClickButton` | `labeled(name)`, `withText(text)`, `linkLabeled(text)` | Clic en botón o link |

**Import:** `import { NavigateToPage, SearchForItem } from '../../src/screenplay/tasks';`

#### 2.4 Biblioteca de UI Locators

| Módulo | Locators Principales |
|--------|---------------------|
| `LoginUI` | `usernameField`, `passwordField`, `loginButton`, `flashMessage` |
| `NavigationUI` | `header()`, `navLink(name)`, `menuItem(text)`, `pageHeading()` |
| `SearchUI` | `searchField()`, `searchButton()`, `resultItems()`, `resultItemContaining(text)` |
| `ProductListUI` | `section(name)`, `productByName(name)`, `addToCartButton()`, `allProducts()` |
| `CartUI` | `cartIcon()`, `viewCartButton()`, `cartItems()`, `cartItemByName(name)`, `cartTotal()` |
| `FormUI` | `fieldByLabel(label)`, `buttonByName(name)`, `buttonByText(text)`, `dropdownByLabel(label)` |

**Import:** `import { CartUI, SearchUI } from '../../src/screenplay/ui';`

#### 2.5 Biblioteca de Questions

| Question | Métodos | Uso con Ensure |
|----------|---------|----------------|
| `TextOf` | `element(el)` | `Ensure.that(TextOf.element(el), equals('texto'))` |
| `CountOf` | `elements(els)` | `Ensure.that(CountOf.elements(els), equals(3))` |
| `IsVisible` | `onScreen()`, `inDom()`, `andClickable()` | `Ensure.that(el, IsVisible.onScreen())` |
| `CurrentUrl` | `href()`, `get()` | `Ensure.that(CurrentUrl.href(), includes('/cart'))` |
| `ElementExists` | `in(el)` | `Ensure.that(ElementExists.in(el), equals(true))` |

**Import:** `import { TextOf, IsVisible } from '../../src/screenplay/questions';`

---

## 3. Pipeline Multi-Agente (Plug-in Architecture)

### 3.1 Interfaz base de agentes

```typescript
// src/ai/agents/Agent.ts
interface Agent<Req, Res> {
  name: string;
  run(request: Req): Promise<Res>;
}
```

### 3.2 Interfaz PipelineStep

Cada agente está envuelto en un `PipelineStep`. El orquestador solo conoce
esta interfaz — nunca importa agentes concretos (OCP + DIP).

```typescript
// src/ai/core/PipelineStep.ts
interface PipelineStep {
  readonly name: string;
  execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome>;
}

// StepOutcome helpers:
Continue                         // paso completado, continuar
ShortCircuit('cache hit')        // detener pipeline con éxito
Abort('razón', error?)           // detener pipeline con fallo
```

### 3.3 Crear un nuevo paso del pipeline

**Paso 1 — Crear el agente (si no existe):**

```typescript
// src/ai/agents/MyCustomAgent.ts
export class MyCustomAgent implements Agent<MyRequest, MyResponse> {
  readonly name = 'MyCustomAgent';
  private readonly logger = createLogger('MyCustomAgent');
  constructor(private readonly ai: AIProvider) {}

  async run(request: MyRequest): Promise<MyResponse> {
    const messages = new ContextBuilder()
      .addSystemPrompt('Eres un agente especializado en...')
      .addDomainKnowledge('Contexto del dominio...')
      .addUserMessage(request.requirement)
      .build();
    const result = await this.ai.generateChat(messages);
    return { success: true, result };
  }
}
```

**Paso 2 — Crear el PipelineStep:**

```typescript
// src/ai/pipeline/steps/MyCustomStep.ts
import { PipelineStep, PipelineContext, ProgressReporter, StepOutcome, Continue, Abort } from '../../core/PipelineStep';
import { MyCustomAgent } from '../../agents/MyCustomAgent';

export class MyCustomStep implements PipelineStep {
  readonly name = 'MyCustomAgent';
  constructor(private readonly agent: MyCustomAgent) {}

  async execute(ctx: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
    progress.update('Procesando...');
    const result = await this.agent.run({ requirement: ctx.userRequirement });
    if (!result.success) return Abort(result.error ?? 'Fallo');
    ctx.extras['myResult'] = result.result;    // guardar en blackboard
    progress.finish('✅ Completado.');
    return Continue;
  }
}
```

**Paso 3 — Registrar en `defaultPipeline.ts`:**

```typescript
// src/ai/pipeline/defaultPipeline.ts
export function buildDefaultPipeline(agents: DefaultPipelineAgents): PipelineStep[] {
  return [
    new DuplicatePreventionStep(agents.duplicatePreventionAgent),
    new RequirementsStep(agents.requirementsAgent, agents.businessAlignmentAgent),
    new MyCustomStep(agents.myCustomAgent),           // ← nuevo paso aquí
    new CodeGeneratorStep(agents.codeGeneratorAgent),
    // ... resto de pasos
  ];
}
```

**No se edita AgentOrchestrator.** Solo `defaultPipeline.ts` define el orden.

### 3.4 ContextBuilder — API completa

```typescript
const messages = new ContextBuilder()
  .addSystemPrompt('Instrucciones del sistema...')
  .addDomainKnowledge('Conocimiento del dominio...')
  .addMemoryFile('Contexto similar recuperado de RAG...')
  .addUserMessage('Mensaje del usuario')
  .addAssistantMessage('Respuesta anterior (para historial)')
  .addUserMessage('Siguiente turno del usuario')
  .build();
// → Message[]  ({ role: 'system'|'user'|'assistant', content: string, type?: string })
```

### 3.5 ProjectContextLoader — RAG del Screenplay

El `CodeGeneratorAgent` usa `ProjectContextLoader` para inyectar al LLM las
firmas y ejemplos de la biblioteca Screenplay existente. Esto evita que el
modelo invente APIs inexistentes.

```typescript
const loader = new ProjectContextLoader();
const context = loader.loadContext();
// Escanea src/screenplay/{tasks,ui,questions} y genera:
// #### Tasks (high-level business actions — PREFER these over raw interactions)
// - NavigateToPage (from NavigateToPage.ts):
//   - NavigateToPage.at(url: string)
//   - NavigateToPage.reload()
//   Example: actorCalled('user').attemptsTo(NavigateToPage.at('https://example.com'))
// #### UI Locators (PageElement factories)
// - SearchUI: searchField(), searchButton(), resultItems() ...
// #### Import paths
// - Tasks: import { NavigateToPage } from '../../src/screenplay/tasks';
```

---

## 4. Infraestructura de IA

### 4.1 AIProvider — Interfaz unificada

```typescript
interface AIProvider {
  generateChat(messages: ChatMessage[]): Promise<string>;
  isAvailable(): Promise<boolean>;
}
```

Para añadir un nuevo proveedor, implementa esta interfaz:

```typescript
// src/ai/infrastructure/GeminiClient.ts
export class GeminiClient implements AIProvider {
  async generateChat(messages: ChatMessage[]): Promise<string> {
    // Implementación de la API de Gemini
  }
  async isAvailable(): Promise<boolean> {
    // Health check
  }
}
```

### 4.2 Logger — Uso correcto

```typescript
import { createLogger } from '../infrastructure/Logger';

// Crear logger al inicio de la clase
private readonly logger = createLogger('NombreAgente');

// Uso
this.logger.debug('Detalle interno', { data: someObject });
this.logger.info('Acción completada', { count: 5 });
this.logger.warn('Condición inesperada', { field: value });
this.logger.error('Error crítico', error, { context: 'extra' });
```

Controla el nivel de log con la variable de entorno:
```bash
LOG_LEVEL=debug   # muestra debug, info, warn, error
LOG_LEVEL=info    # muestra info, warn, error (default)
LOG_LEVEL=warn    # solo warn y error
LOG_LEVEL=error   # solo errores
```

### 4.3 ChromaVectorStore — Deduplicación semántica

```typescript
const store = new ChromaVectorStore(ollamaClient, 'my-collection');

// Verificar disponibilidad antes de usar
if (store.isAvailable) {
  await store.addScenario(requirement, gherkin);
  const similar = await store.findSimilar(requirement, 5);
  // similar: Array<{ requirement, gherkin, similarity }>
}
// Si ChromaDB está offline, isAvailable=false y los métodos
// devuelven sin error (fallback gracioso)
```

---

## 5. Servidores Backend

### 5.1 UI Server (puerto 3000)

```
GET  /api/status       → { status: 'ok', version, agentsAvailable }
POST /api/preview      → { userRequirement } → PreviewResult
POST /api/implement    → { gherkin, tsCode, featureName } → { success, paths }
```

### 5.2 Pipeline Server (puerto 4000) — SSE

```
POST /api/v1/generate-scenario
  Body: { userRequirement: string }
  Response: text/event-stream

  Eventos emitidos:
  data: { event: 'agent_start',    agent: string, message: string }
  data: { event: 'agent_update',   agent: string, message: string }
  data: { event: 'agent_done',     agent: string, result: any }
  data: { event: 'agent_error',    agent: string, error: string }
  data: { event: 'duplicate_detected', isDuplicate: true }
  data: { event: 'pipeline_done',  gherkin, featureName, tsCode, quality, preview }
  data: { event: 'pipeline_error', error: string }
```

Ejemplo con `curl`:
```bash
curl -N -X POST http://localhost:4000/api/v1/generate-scenario \
  -H "Content-Type: application/json" \
  -d '{"userRequirement": "El usuario hace login con credenciales válidas"}'
```

---

## 6. Frontend — Hooks y Componentes

### 6.1 useSSEPipeline

Hook central que gestiona todo el estado del pipeline:

```typescript
const {
  agents,         // AgentState[]  — estado de los 7 agentes
  isRunning,      // boolean
  isDone,         // boolean
  isDuplicate,    // boolean
  gherkin,        // string | null
  featureName,    // string | null
  tsCode,         // string | null
  previewResult,  // PreviewResult | null
  error,          // string | null
  startPipeline,  // (requirement: string) => void
  cancelPipeline, // () => void
  reset,          // () => void
} = useSSEPipeline();
```

### 6.2 Tipos principales

```typescript
// src/lib/types.ts

type AgentStatus = 'pending' | 'running' | 'done' | 'error';

interface AgentState {
  name: string;
  status: AgentStatus;
  message?: string;
  result?: unknown;
}

interface PreviewResult {
  success: boolean;
  browser: string;
  totalDuration: number;
  steps: StepPreviewResult[];
}

interface StepPreviewResult {
  keyword: string;
  text: string;
  status: 'passed' | 'failed' | 'pending';
  duration?: number;
  screenshot?: string;  // base64 PNG
  error?: string;
}
```

### 6.3 Constante AGENT_ORDER

```typescript
export const AGENT_ORDER = [
  'RequirementsAgent',
  'DuplicatePreventionAgent',
  'BusinessAlignmentAgent',
  'CodeGeneratorAgent',
  'ValidationAgent',
  'ReviewImplementerAgent',
  'ScenarioPreviewRunner',
] as const;
```

---

## 7. Workflow de Desarrollo

### 7.1 Añadir una nueva Feature BDD

1. Escribe el `.feature` en `features/nuevo.feature`
2. Genera los steps con el dashboard o `npm run ai:gen "descripción"`
3. Revisa y ajusta los Step Definitions en `features/step_definitions/`
4. Implementa Tasks necesarias en `src/screenplay/tasks/`
5. Añade selectores en `src/screenplay/ui/`
6. Ejecuta: `npm test`

### 7.2 Añadir un nuevo agente al pipeline

1. Crea `src/ai/agents/MiAgente.ts` implementando `Agent<Req, Res>`
2. Usa `ContextBuilder` + `generateChat()` (no `generate()`)
3. Añade `createLogger('MiAgente')` para logging estructurado
4. Crea `src/ai/pipeline/steps/MiAgenteStep.ts` implementando `PipelineStep`
5. Registra el paso en `src/ai/pipeline/defaultPipeline.ts` (ver sección 3.3)
6. Añade el nombre a `AGENT_ORDER` en `frontend/src/lib/types.ts`
7. El `AgentTimeline` del dashboard lo mostrará automáticamente

**Importante:** NO se edita `AgentOrchestrator.ts` — solo `defaultPipeline.ts`.

### 7.3 Cambiar el modelo o proveedor de IA

No requiere cambios en el código; la interfaz `AIProvider` lo abstrae.

#### Usar Qwen3 local (recomendado)

```bash
# .env
AI_PROVIDER=ollama
AI_MODEL=qwen3:14b        # ajustar según VRAM disponible
EMBEDDING_MODEL=bge-m3    # mantener estable
```

Guía de elección por hardware:

| VRAM | Modelo | VRAM usada (Q4) |
|---|---|---|
| ≥ 24 GB | `qwen3:32b` | ~20 GB |
| 16–22 GB | `qwen3:30b-a3b` (MoE) | ~17 GB |
| 8–14 GB | `qwen3:14b` | ~10 GB |
| < 8 GB | `qwen3:8b` | ~6 GB |

#### Usar Gemma 4 local

```bash
AI_PROVIDER=ollama
AI_MODEL=gemma4:27b        # o gemma4:4b para hardware limitado
EMBEDDING_MODEL=bge-m3
```

> Nota: Qwen3 supera a Gemma 4 en generación de TypeScript y bilingüismo ES/EN. Usar Gemma 4 si hay requerimiento específico del ecosistema Google.

#### Usar OpenAI (cloud)

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o
EMBEDDING_MODEL=bge-m3    # los embeddings siempre son locales vía Ollama
```

#### Cambiar el modelo de embeddings

Si se necesita cambiar `EMBEDDING_MODEL`, limpiar ChromaDB primero para evitar vectores inconsistentes:

```bash
docker-compose down -v chromadb
docker-compose up -d chromadb
```

---

## 8. Tests

### Tests unitarios del motor IA (Vitest)

```bash
npm run test:unit           # Ejecuta una vez
npm run test:unit:watch     # Modo watch
npm run test:unit:coverage  # Con coverage
```

Los tests están en `src/ai/__tests__/`.

### Tests E2E BDD (Cucumber + Serenity)

```bash
npm test                                # Todos los features
npx cucumber-js features/login.feature  # Feature específico
npm run report                          # Reporte HTML (requiere Java)
```

### Tests de UI Playwright

```bash
npm run test:ui     # Modo UI interactivo
npm run test:debug  # Modo debug
```

---

## 9. Debugging

### Logs del pipeline

```bash
# Activa logs detallados
LOG_LEVEL=debug npm run ai:api
```

### Inspeccionar eventos SSE manualmente

```bash
curl -N -X POST http://localhost:4000/api/v1/generate-scenario \
  -H "Content-Type: application/json" \
  -d '{"userRequirement": "login con usuario válido"}' | \
  while IFS= read -r line; do echo "$(date +%T) $line"; done
```

### Verificar ChromaDB

```bash
# ChromaDB corre en Docker
docker ps | grep chroma
curl http://localhost:8000/api/v1/heartbeat
```

### Revisar el estado de Ollama

```bash
docker exec ollama_ai ollama list
curl http://localhost:11434/api/tags
```

---

## 10. Convenciones de Código

### TypeScript

- **Strict mode** activado en `tsconfig.json`
- **Sin `any`** — usar tipos concretos o `unknown`
- **Interfaces sobre types** para objetos de dominio
- **`readonly`** en propiedades de clase inyectadas por constructor
- **`error: unknown`** en catch, no `error: any`

### Agentes

- Un agente = una responsabilidad (SRP)
- Logger obligatorio: `createLogger(this.name)` o `createLogger('AgentName')`
- Siempre usar `generateChat()` + `ContextBuilder`, no `generate()` deprecado
- Exportar las constantes de prompts para testabilidad

### Frontend

- Hooks en `src/hooks/` para lógica con estado
- Componentes en `src/components/` sin lógica de negocio
- Tipos en `src/lib/types.ts` (compartidos)
- URLs de backend siempre desde `src/lib/api.ts` (nunca hardcodeadas en componentes)
