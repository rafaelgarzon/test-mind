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
| **IA Local** | Ollama | llama3.2 |
| **IA Cloud** | OpenAI | gpt-4o |
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
features/*.feature            ← Especificaciones BDD (Gherkin)
  └── step_definitions/*.ts   ← Binding: Gherkin → Screenplay
        └── tasks/*.ts         ← Tareas de negocio (Login, Search…)
              └── ui/*.ts      ← Selectores de UI (Page Elements)
```

#### 2.1 Feature (Gherkin)

```gherkin
Feature: Login de usuarios

  Scenario: Login exitoso con credenciales válidas
    Given que el actor "Admin" está en la página de login
    When ingresa el usuario "admin@empresa.com" y contraseña "S3cret!"
    Then es redirigido al panel de administración
```

#### 2.2 Step Definitions (Glue Code)

```typescript
// features/step_definitions/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';
import { Login } from '../../src/screenplay/tasks/Login';

Given('que el actor {string} está en la página de login', async (name: string) => {
  await actorCalled(name).attemptsTo(
    Navigate.to('https://app.example.com/login')
  );
});

When('ingresa el usuario {string} y contraseña {string}', async (user: string, pass: string) => {
  await actorInTheSpotlight().attemptsTo(
    Login.withCredentials(user, pass)
  );
});
```

#### 2.3 Tasks (Screenplay)

```typescript
// src/screenplay/tasks/Login.ts
import { Task } from '@serenity-js/core';
import { Enter, Click } from '@serenity-js/web';
import { LoginUI } from '../ui/LoginUI';

export const Login = {
  withCredentials: (user: string, pass: string) =>
    Task.where(`#actor logs in as ${user}`,
      Enter.theValue(user).into(LoginUI.emailField()),
      Enter.theValue(pass).into(LoginUI.passwordField()),
      Click.on(LoginUI.submitButton())
    )
};
```

#### 2.4 UI Elements (Page Elements)

```typescript
// src/screenplay/ui/LoginUI.ts
import { By, PageElement } from '@serenity-js/web';

export const LoginUI = {
  emailField:    () => PageElement.located(By.id('email')).describedAs('campo email'),
  passwordField: () => PageElement.located(By.id('password')).describedAs('campo contraseña'),
  submitButton:  () => PageElement.located(By.css('[type=submit]')).describedAs('botón login'),
};
```

---

## 3. Pipeline Multi-Agente

### 3.1 Interfaz base de agentes

```typescript
// src/ai/agents/Agent.ts
interface Agent<Req, Res> {
  name: string;
  run(request: Req): Promise<Res>;
}
```

### 3.2 Crear un nuevo agente

```typescript
// src/ai/agents/MyCustomAgent.ts
import { Agent } from './Agent';
import { AIProvider } from '../infrastructure/AIProvider';
import { ContextBuilder } from '../infrastructure/ContextBuilder';
import { createLogger } from '../infrastructure/Logger';

interface MyRequest { requirement: string; }
interface MyResponse { result: string; }

export class MyCustomAgent implements Agent<MyRequest, MyResponse> {
  readonly name = 'MyCustomAgent';
  private readonly logger = createLogger('MyCustomAgent');

  constructor(private readonly ai: AIProvider) {}

  async run(request: MyRequest): Promise<MyResponse> {
    this.logger.info('Procesando requerimiento', { req: request.requirement });

    const messages = new ContextBuilder()
      .withSystemPrompt('Eres un agente especializado en...')
      .withDomainKnowledge('Contexto del dominio...')
      .withUserMessage(request.requirement)
      .build();

    const result = await this.ai.generateChat(messages);
    this.logger.info('Resultado generado', { length: result.length });
    return { result };
  }
}
```

### 3.3 Registrar el agente en el Orquestador

```typescript
// src/ai/core/AgentOrchestrator.ts
// Añadir instancia en el constructor y llamarlo en el método run()
```

### 3.4 ContextBuilder — API completa

```typescript
const messages = new ContextBuilder()
  .withSystemPrompt('Instrucciones del sistema...')
  .withDomainKnowledge('Conocimiento del dominio...')
  .withUserMessage('Mensaje del usuario')
  .withAssistantMessage('Respuesta anterior (para historial)')
  .withUserMessage('Siguiente turno del usuario')
  .build();
// → ChatMessage[]  ({ role: 'system'|'user'|'assistant', content: string })
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
4. Registra el agente en `AgentOrchestrator.ts`
5. Añade el nombre a `AGENT_ORDER` en `frontend/src/lib/types.ts`
6. El `AgentTimeline` del dashboard lo mostrará automáticamente

### 7.3 Cambiar el proveedor de IA

```bash
# En .env:
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o
```

No requiere cambios en el código; la interfaz `AIProvider` lo abstrae.

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
