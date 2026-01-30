# 📘 Guía de Usuario para No Técnicos

Esta guía te ayudará a utilizar la herramienta de automatización de pruebas escribiendo escenarios en lenguaje natural (Gherkin).

## ¿Qué puedo hacer?
1. **Generar escenarios automáticamente** con ayuda de la Inteligencia Artificial.
2. **Leer y entender las pruebas** existentes en la carpeta `features/`.
3. **Ejecutar pruebas** para verificar el funcionamiento.

---

## 🤖 1. Generar una Prueba con IA

Si quieres probar una nueva funcionalidad, usa el comando `ai:gen`.

**Comando:**
```bash
# Formato: npm run ai:gen "Descripción" nombre_archivo_sin_extension
npm run ai:gen "El usuario busca 'iPhone' y ve resultados" busqueda
```

**¿Qué sucede?**
La IA creará dos archivos:
- `features/busqueda.feature`: El escenario en texto plano (Given/When/Then).
- `features/step_definitions/busqueda.steps.ts`: El código necesario para ejecutarlo.

---

## 📖 2. Entendiendo las Pruebas (Gherkin)

Las pruebas están en la carpeta `features/`. Tienen este aspecto:

```gherkin
Feature: Búsqueda de productos

  Scenario: Usuario encuentra un iPhone
    Given que el Actor "Cliente" está en la tienda
    When busca el término "iPhone"
    Then debería ver al menos 1 resultado
```

Es lenguaje natural que puedes leer y validar como requerimiento de negocio.

---

## ▶️ 3. Ejecutar Pruebas

Para correr todas las pruebas:

**Comando:**
```bash
npm test
```

Este comando leerá todos los archivos `.feature` y ejecutará los pasos definidos.

---

## 📊 4. Reporte Visual (Serenity BDD)

Para ver el resultado detallado de las pruebas con capturas de pantalla y pasos paso a paso:

1. **Prerrequisito**: Debes tener **Java** instalado.
2. **Generar reporte**:
   ```bash
   npm run report
   ```
3. **Ver reporte**:
   Abre el archivo `target/site/serenity/index.html` en tu navegador.

Verás un dashboard con gráficos de ejecución, tiempos y detalles de cada paso.
