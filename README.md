# Automation Front AI

Framework de automatización de pruebas Front-end impulsado por **Serenity/JS**, **Playwright** e integración con **Inteligencia Artificial**.

## 🚀 Características

- **Patrón Screenplay**: Código mantenible, legible y escalable.
- **Serenity/JS**: Reportes vivos y abstracciones poderosas.
- **Playwright**: Ejecución rápida y confiable en múltiples navegadores.
- **AI Generator**: _(Fase 4 Completada)_ Generación de pruebas a partir de descripciones en lenguaje natural. Incluye validación semántica, base de datos local de conocimiento, CLI interactivo (con soporte por lotes) y una Web UI básica.

## 📋 Prerrequisitos

- Node.js (v16 o superior)

## 🛠️ Instalación

1. Clona el repositorio:
   ```bash
   git clone <url-del-repo>
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno:
   ```bash
   cp .env.example .env
   # Edita .env con tu configuración de IA
   
   # Para usar OpenAI (default):
   # AI_PROVIDER=openai
   # OPENAI_API_KEY=sk-...

   # Para usar Ollama (gratis):
   # AI_PROVIDER=ollama
   # OLLAMA_BASE_URL=http://localhost:11434  (opcional, por defecto es este)
   # AI_MODEL=llama3                         (opcional, por defecto es llama3)
   ```

## 🤖 Generación de Pruebas con AI (Fase 4, 5 y 6)

El generador de IA cuenta con herramientas avanzadas para la creación y validación de escenarios Gherkin, potenciadas por motores de calidad y una base técnica robusta.

### 🏗️ Fundaciones Técnicas y Testing (Fase 6)
- **Providers Intercambiables**: Arquitectura unificada (`AIProvider`) que soporta instanciar fácilmente Ollama, OpenAI o nuevos modelos de forma modular.
- **Búsqueda Semántica**: La base de conocimiento SQLite ahora detecta escenarios similares previamente ejecutados utilizando el _Coeficiente de Jaccard_ (buscando superposición de palabras clave) sin necesidad de similitud exacta de strings.
- **Validación de Entornos & Unit Tests**: Configuración de `vitest.config.ts` optimizada para el motor IA (excluyendo pruebas end-to-end lentas) y un validador en `config.ts` que arranca validando el `process.env`.

### ✨ Nuevas Características de Calidad (Fase 5)
- **Language Detector**: Detecta automáticamente si tu requerimiento está en Español o Inglés y obliga al LLM a generar los pasos estrictamente en ese idioma (sin mezclar Spanglish).
- **Gherkin Quality Scorer**: Evalúa semánticamente el Gherkin devuelto por la IA, restando puntos si hay nombres genéricos o aserciones muy vagas sin datos reales.
- **Self-Healing Loop**: Si el Gherkin generado obtiene un puntaje menor a 70/100, el generador ejecuta peticiones de auto-corrección ("refinement prompts") indicándole al modelo cómo arreglarlo, con un máximo de 3 intentos computacionales invisibles para el usuario.
- **Quality Badges en Web UI**: Verás indicadores visuales del puntaje que la IA logró internamente antes de entregarte el resultado.

### 🌐 Opción 1: Web UI (Recomendado)
Levanta un servidor local con una interfaz gráfica simple para generar escenarios y pasos:
```bash
npm run ai:web
```
Abre tu navegador en `http://localhost:3000`.

### 📡 Opción 3: Backend RAG Reactivo (Fases 9-11)
El núcleo de la IA ahora opera tras un Orquestador RAG **Multi-Agente**.
Puedes interactuar asíncronamente con el modelo usando la API que transmite *Server-Sent Events* mientras los agentes (Requirements, CodeGenerator, Validation) trabajan paso a paso.
```bash
# Inicia la infraestructura Docker (Ollama y Playwright MCP)
docker-compose up -d

# Arranca el API Backend
npx ts-node src/api/server.ts

# Consulta al Orquestador (Streaming bidireccional)
curl -N -X POST http://localhost:4000/api/v1/generate-scenario \
  -H "Content-Type: application/json" \
  -d '{"userRequirement": "Hacer login"}'
```

### 💻 Opción 2: CLI Interactivo y por Lotes
Usa la interfaz de línea de comandos interactiva. Te permite generar escenarios uno a uno o por lotes (Batch):
```bash
npm run ai:cli
```

### ⚙️ Generación Directa (Legacy)
```bash
# El generador creará un archivo .feature y su steps.ts correspondiente
npm run ai:gen "Usuario busca un producto"
```

### 🏗️ Arquitectura de Generación (Serenity/JS)
El generador está estrictamente configurado (vía Prompt Templates) para emitir código TypeScript que sigue el patrón **Screenplay** nativo de **Serenity/JS**. Todas las interacciones generadas usarán `actorCalled()`, `attemptsTo()`, y clases de UI/Tasks.

### 🐛 Solución de Problemas Comunes (Troubleshooting)
- **Error `ERR_CONNECTION_REFUSED` en `localhost:3000` (Mac ARM/M1/M2):** Ocurre si `sqlite3` está compilado para x86. Soluciónalo ejecutando: `npm rebuild sqlite3`.
- **Error `AxiosError: timeout of 60000ms exceeded`:** La inferencia local de Ollama puede tardar más de 1 minuto en generar el archivo de Step Definitions complejo. El timeout ya está configurado a 5 minutos internamente, pero asegura que tu red no corte la petición y ten paciencia mientras Ollama procesa.

### Proveedores Soportados

1. **OpenAI**: Requiere `OPENAI_API_KEY`.
2. **Ollama**: Requiere tener Ollama corriendo (Recomendado: modelo local).
   
   **Opción A: Docker (Recomendado)**
   ```bash
   # Iniciar Ollama
   docker-compose up -d
   
   # Descargar el modelo (ej. llama3)
   docker exec -it ollama_ai ollama pull llama3
   ```

   **Opción B: Local**
   Instala y ejecuta `ollama serve`.

## 🧪 Ejecución de Pruebas

Ejecutar todos los tests (Cucumber):
```bash
npm test
```

Ejecutar un feature específico:
```bash
npx cucumber-js features/login.feature
```


Ver el reporte HTML (Serenity BDD):
*(Requiere Java instalado)*
```bash
npm run report
```
El reporte se generará en: `target/site/serenity/index.html`

## 📂 Estructura del Proyecto

```
src/
├── ai/                 # Módulos de Inteligencia Artificial
features/
│   ├── step_definitions/ # Código TypeScript (binding)
│   ├── support/          # Configuración de Cucumber/Serenity
│   └── login.feature     # Archivos Gherkin (.feature)
src/screenplay/
│   ├── tasks/          # Tareas de negocio (e.g., Login, Search)
│   ├── ui/             # Selectores y PageElements

```


