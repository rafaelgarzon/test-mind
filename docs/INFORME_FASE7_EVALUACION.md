# Informe de Evaluación: Ramas feature/phase-7 vs master

**Fecha:** 2026-03-28
**Analista:** Claude Code
**Alcance:** Comparación de `feature/phase-7.1-playwright-mcp` y `feature/phase-7.2-web-mcp` contra la rama `master` actual.

---

## 1. Resumen Ejecutivo

Las ramas de Fase 7 están prácticamente absorbidas por `master`. La totalidad de su código funcional fue integrado en fases posteriores (8–12). La única diferencia real con `master` son **2 archivos** que las ramas de Fase 7 tienen en una versión más moderna (patrón Phase 8 / ContextBuilder), pero que `master` mantiene en su versión legacy. **La recomendación es eliminar ambas ramas** y, de forma independiente, aplicar una corrección menor en `master` para eliminar el uso legacy.

---

## 2. Estado de las Ramas

| Rama | Último commit | Commits no en master | Archivos diferentes |
|------|--------------|---------------------|---------------------|
| `feature/phase-7.1-playwright-mcp` | 3b27f0f (2026-03-13) | 7 | 2 |
| `feature/phase-7.2-web-mcp` | 74b5cba (2026-03-13) | 1 | 2 |

### Commits únicos de Phase 7.1 (no en master)

```
3b27f0f feat(phase-7): adapt agents to Context Engineering model from Phase 8
9e279ee Merge branch 'master' into feature/phase-7.1-playwright-mcp
3cdf5e9 fix(preview): heuristic-first translation to eliminate Ollama timeout on preview
10979da fix(prompt): remove hotel-specific examples from Gherkin prompt causing LLM content copying
e03b27f fix(phase-7): make semantic validation non-blocking in ScenarioGenerator
4d83543 fix(phase-7.2): fix Promise.race generic type inference in ScenarioPreviewRunner
c697fb4 feat(phase-7.1): add auto-implementation agent with Playwright MCP preview
```

> Nota: Los commits de fix (3cdf5e9, 10979da, e03b27f, 4d83543) fueron aplicados directamente en `master` vía commits individuales durante el desarrollo. No son únicos de esta rama.

### Commits únicos de Phase 7.2 (no en master)

```
74b5cba feat(phase-7): adapt agents to Context Engineering model from Phase 8
```

---

## 3. Análisis de los Archivos Divergentes

Los únicos 2 archivos con diferencia real entre las ramas Fase 7 y `master` son:

### 3.1 `src/ai/agents/ScenarioPreviewRunner.ts`

| Aspecto | `master` (actual) | `feature/phase-7.x` |
|---------|-------------------|---------------------|
| Función de prompt | `buildGherkinToPlaywrightPrompt` | `buildGherkinToPlaywrightMessages` |
| Método de llamada al LLM | `this.ai.generate(system, user)` | `this.ai.generateChat(messages)` |
| Arquitectura | Legacy API | Phase 8 / ContextBuilder pattern |

**Impacto:** El `AIProvider` de `master` ya declara `generate()` como `@deprecated`. La rama Fase 7 usa la API moderna (`generateChat` + `Message[]`), que es la correcta según la arquitectura vigente.

### 3.2 `src/ai/prompts/GherkinToPlaywrightPrompt.ts`

| Aspecto | `master` (actual) | `feature/phase-7.x` |
|---------|-------------------|---------------------|
| Constantes exportadas | No exportadas | `GHERKIN_TO_PLAYWRIGHT_SYSTEM_PROMPT` y `GHERKIN_TO_PLAYWRIGHT_DOMAIN_KNOWLEDGE` exportadas |
| Función principal | Solo `buildGherkinToPlaywrightPrompt()` | `buildGherkinToPlaywrightMessages()` usando `ContextBuilder` + `buildGherkinToPlaywrightPrompt()` como `@deprecated` |
| Compatibilidad | Standalone | Integrado con Phase 8 ContextBuilder |

**Impacto:** La versión en Fase 7 es más completa, sigue el patrón establecido en Phase 8 y mantiene retrocompatibilidad.

---

## 4. Código de Fase 7 ya Integrado en master

El análisis de hashes git confirma que los siguientes archivos son **idénticos** en `master` y en las ramas Fase 7 (mismos blob hashes):

| Archivo | Hash blob | Presente en master |
|---------|-----------|-------------------|
| `src/mcp/playwright-client.ts` | c4e8214 | ✅ Sí |
| `src/mcp/webmcp-server.ts` | 33d64f5 | ✅ Sí |
| `src/mcp/server.ts` | 728c0cd | ✅ Sí |
| `src/ai/agents/PreviewAgent.ts` | (integrado en Phase 10) | ✅ Sí |
| `src/ai/agents/ScenarioImplementer.ts` | (integrado) | ✅ Sí |
| `src/ai/core/GherkinStepParser.ts` | (integrado) | ✅ Sí |

**Todo el valor funcional de Fase 7 ya vive en `master`.**

---

## 5. Comparación de Estado del Proyecto

### master (actual)

```
Fases integradas: 4 → 5 → 6 → 7 → 8 → 9 → 10 → 12
Última fase: Business Alignment + ChromaDB Caching (Phase 12)
```

**Capacidades activas:**
- GherkinQA Engine completo (Phase 5)
- AIProvider unificado con `generateChat` / ContextBuilder (Phase 8)
- RAG multi-agente (Phase 9)
- Playwright MCP en Docker (Phase 10)
- Business Alignment Agent + ChromaDB (Phase 12)
- Preview en navegador (`/api/preview`) + Implementación (`/api/implement`)
- Servidor MCP HTTP+SSE (`/mcp/sse`)

### feature/phase-7.1-playwright-mcp

**Capacidades:**
- Preview en navegador + implementación de archivos
- Playwright MCP client (stdio)
- Adaptación Phase 8 en `ScenarioPreviewRunner` y `GherkinToPlaywrightPrompt` (más moderna que master)
- **Faltan:** Phase 9 (RAG), Phase 10 (Docker MCP), Phase 12 (Business + ChromaDB)

### feature/phase-7.2-web-mcp

**Capacidades:**
- Todo lo de Phase 7.1
- Servidor MCP HTTP+SSE (`webmcp-server.ts`)
- Adaptación Phase 8 (idéntica a 7.1)
- **Faltan:** Phase 9, Phase 10, Phase 12

---

## 6. Evaluación de Versiones

### ¿Qué versión es mejor?

**`master` es la versión superior en todos los aspectos funcionales** excepto en la deuda técnica de 2 archivos:

| Criterio | master | Phase 7.x | Ganador |
|----------|--------|-----------|---------|
| Funcionalidad total | Fases 4–12 | Fases 4–7 | **master** |
| Arquitectura AI (ContextBuilder) | Parcial (2 archivos legacy) | Completa en esos 2 archivos | **phase-7.x** en esos archivos |
| RAG multi-agente | ✅ | ❌ | **master** |
| Docker MCP | ✅ | ❌ | **master** |
| Business Alignment | ✅ | ❌ | **master** |
| ChromaDB Caching | ✅ | ❌ | **master** |
| MCP HTTP/SSE | ✅ | ✅ | Empate |
| Deuda técnica AI API | Tiene legacy en 2 archivos | Resuelto | **phase-7.x** en esos archivos |

---

## 7. Recomendación

### Decisión: **Eliminar las ramas de Fase 7**

**Justificación:**

1. **No aportan funcionalidad nueva.** Todo el código funcional de Fase 7 (playwright-client, webmcp-server, PreviewAgent, ScenarioImplementer, GherkinStepParser) está en `master` con hashes idénticos.

2. **Están desactualizadas.** Les faltan las Fases 9, 10 y 12, que son las que dan valor diferencial al proyecto actualmente.

3. **No es viable un merge directo.** Las ramas divergen en historial; un merge añadiría complejidad sin beneficio.

4. **El único valor real es un cherry-pick menor.** La mejora en los 2 archivos divergentes es legítima (uso de `generateChat` en lugar de `generate` deprecated), pero es una corrección de 8–12 líneas que puede aplicarse directamente en `master` sin necesidad de mantener las ramas.

### Acción complementaria recomendada (independiente de la eliminación)

Aplicar en `master`, como un commit de corrección técnica, los cambios de Phase 8 que quedaron pendientes:

```
src/ai/agents/ScenarioPreviewRunner.ts
  - Reemplazar buildGherkinToPlaywrightPrompt + this.ai.generate
  + Usar buildGherkinToPlaywrightMessages + this.ai.generateChat

src/ai/prompts/GherkinToPlaywrightPrompt.ts
  + Exportar GHERKIN_TO_PLAYWRIGHT_SYSTEM_PROMPT y GHERKIN_TO_PLAYWRIGHT_DOMAIN_KNOWLEDGE
  + Añadir buildGherkinToPlaywrightMessages() con ContextBuilder
  + Marcar buildGherkinToPlaywrightPrompt() como @deprecated
```

Este cambio elimina el uso de la API legacy en el único lugar donde persiste y alinea `master` con su propia arquitectura de Context Engineering.

---

## 8. Conclusión

| Pregunta | Respuesta |
|----------|-----------|
| ¿Vale la pena continuar con Fase 7? | **No.** Ya está integrada en master. No hay funcionalidad pendiente que desarrollar. |
| ¿Vale la pena hacer merge de las ramas? | **No.** El merge añade riesgo y complejidad; la única mejora real son 2 archivos que se aplican mejor como cherry-pick. |
| ¿Se pueden eliminar las ramas? | **Sí, con seguridad.** Todo su código funcional vive en master. |
| ¿Hay algo de valor que preservar antes de eliminar? | **Sí:** el cambio en `ScenarioPreviewRunner.ts` y `GherkinToPlaywrightPrompt.ts` que usa la API moderna. Debe aplicarse en master como corrección técnica. |

---

*Informe generado mediante análisis estático del repositorio. No se modificó ningún archivo del proyecto.*
