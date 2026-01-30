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
   # Edita .env con tu OPENAI_API_KEY si usas las funciones de AI
   ```

## ▶️ Ejecución de Pruebas

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
