# 🛠️ Guía Técnica y Arquitectura (BDD)

Documentación para desarrolladores sobre la implementación TDD/BDD con Serenity/JS y Cucumber.

## Stack Tecnológico
- **Cucumber (Gherkin)**: Definición de escenarios.
- **Serenity/JS**: Orquestación del Screenplay Pattern.
- **Playwright**: Motor de automatización del navegador.

## Arquitectura Screenplay + BDD

### Capas del Proyecto

1.  **Capa de Negocio (Gherkin)**
    - Ubicación: `features/*.feature`
    - Responsabilidad: Definir el *comportamiento* esperado en lenguaje natural.

2.  **Capa de Pegamento (Glue Code)**
    - Ubicación: `features/step_definitions/*.steps.ts`
    - Responsabilidad: Traducir las líneas de Gherkin a tareas de Screenplay.
    - Ejemplo:
      ```typescript
      Given('que el usuario ingresa', () => actorCalled('Ben').attemptsTo(Login...));
      ```

3.  **Capa de Tareas (Screenplay Tasks)**
    - Ubicación: `src/screenplay/tasks/`
    - Responsabilidad: Agrupar interacciones de bajo nivel en acciones de negocio.

4.  **Capa de UI**
    - Ubicación: `src/screenplay/ui/`
    - Responsabilidad: Mapeo de selectores (Page Elements).

## Workflow de Desarrollo

1.  **Escribir Feature**: Define el escenario en `features/nuevo.feature` (o usa la IA para generarlo).
2.  **Definir Pasos**: Crea `features/step_definitions/nuevo.steps.ts`.
3.  **Implementar Tasks**: Si el paso requiere una acción nueva, impléméntala en `src/screenplay/tasks`.
4.  **Ejecutar**: `npm test`.

## Debugging

Para depurar los tests de Cucumber:
```bash
# (Requiere configuración adicional de debug en VSCode para node)
```
Por ahora, usa `console.log` o el reporte de Serenity para trazar errores.
