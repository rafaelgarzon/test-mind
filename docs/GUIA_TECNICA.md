# 🛠️ Guía Técnica y Arquitectura

Documentación para desarrolladores y QA Automation Engineers.

## Arquitectura

El proyecto sigue el **Patrón Screenplay** implementado con [Serenity/JS](https://serenity-js.org/).

### Principios SOLID
- **Single Responsibility (SRP)**: Cada archivo tiene un propósito único.
  - `Tasks/`: Solo contienen lógica de negocio (el "Qué").
  - `UI/`: Solo mapean selectores (el "Dónde").
  - `Actors/`: Solo definen quién interactúa.
- **Open/Closed (OCP)**: Extendemos funcionalidades creando nuevas Tasks/Abilities sin modificar las existentes.

### Estructura de Directorios
- `src/screenplay/tasks`: Acciones de alto nivel (ej. `Login`, `AddToCart`).
- `src/screenplay/ui`: Mapeo de Page Elements.
- `src/ai`: Módulo de generación de código (Arquitectura modular).

## Workflow de Desarrollo

1. **Crear UI Mappings**: Antes de la lógica, define los elementos en `src/screenplay/ui`.
2. **Crear Tasks**: Compón interacciones simples (`Click`, `Enter`) en tareas de negocio.
3. **Crear Specs**: Escribe el test invocando al Actor y sus tareas.

### Configuración de IA
El módulo de IA soporta múltiples proveedores (OpenAI, Ollama).
Configura `.env`:
```env
AI_PROVIDER=ollama   # o 'openai'
AI_MODEL=llama3      # modelo específico
```

## CI/CD
El proyecto incluye workflows de Github Actions en `.github/workflows`.
