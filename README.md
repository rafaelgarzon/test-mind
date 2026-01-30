# Automation Front AI

Framework de automatización de pruebas Front-end impulsado por **Serenity/JS**, **Playwright** e integración con **Inteligencia Artificial**.

## 🚀 Características

- **Patrón Screenplay**: Código mantenible, legible y escalable.
- **Serenity/JS**: Reportes vivos y abstracciones poderosas.
- **Playwright**: Ejecución rápida y confiable en múltiples navegadores.
- **AI Generator**: _(Experimental)_ Generación de pruebas a partir de descripciones en lenguaje natural.

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

## 🤖 Generación de Pruebas con AI (Beta)

El generador soporta múltiples proveedores. Asegúrate de configurar `.env` correctamente.

```bash
# Generar usando el proveedor configurado en .env
npx ts-node src/ai/generator.ts "Usuario busca un producto" search.spec.ts
```

### Proveedores Soportados

1. **OpenAI**: Requiere `OPENAI_API_KEY`.
2. **Ollama**: Requiere tener Ollama corriendo localmente (`ollama serve`). Ideal para modelos gratuitos como Llama 3 o Mistral.


Ejecutar todos los tests:
```bash
npx playwright test
```

Ejecutar un test específico:
```bash
npx playwright test src/screenplay/specs/login.spec.ts
```

Ver el reporte HTML:
```bash
npx playwright show-report
```

## 📂 Estructura del Proyecto

```
src/
├── ai/                 
│   ├── core/           # Orquestador (CodeGenerator)
│   ├── infrastructure/ # Clientes externos (OpenAI, etc.)
│   ├── prompts/        # Templates y lógica de prompts
│   └── generator.ts    # CLI Entry Point
├── screenplay/
│   ├── actors/         # Definición de Actores y sus habilidades
│   ├── interactions/   # Interacciones de bajo nivel
│   ├── tasks/          # Tareas de negocio (e.g., Login, Search)
│   ├── ui/             # Selectores y PageElements (Page Objects granulares)
│   └── specs/          # Archivos de prueba (.spec.ts)
```

## 🤖 Generación de Pruebas con AI (Beta)

Puedes usar el generador de pruebas para crear esqueletos de tests:

```bash
npx ts-node src/ai/generator.ts "Usuario se loguea con credenciales validas" login_ai.spec.ts
```
