# 📘 Guía de Usuario — Automation Front AI

Esta guía te ayudará a generar pruebas automatizadas de forma sencilla usando el **Dashboard visual** o la línea de comandos, sin necesidad de escribir código.

---

## ¿Qué puedo hacer?

1. **Generar escenarios de prueba** describiendo en español o inglés lo que quieres probar.
2. **Ver el proceso en tiempo real** a través del dashboard, con el estado de cada agente de IA.
3. **Revisar el resultado**: escenario Gherkin y código TypeScript generados.
4. **Ver una preview** de los pasos ejecutados en un navegador headless con capturas de pantalla.
5. **Implementar la prueba** directamente en el repositorio con un clic.

---

## 🚀 1. Iniciar el sistema

Antes de usar el dashboard, asegúrate de que todos los servicios estén corriendo.

**En una terminal, ejecuta:**
```bash
npm run dev:all
```

Esto levanta:
- El servidor de la UI en `http://localhost:3000`
- El servidor del pipeline IA en `http://localhost:4000`
- El dashboard visual en **`http://localhost:3001`** ← Abre este en tu navegador

> Si `dev:all` no funciona, instala la dependencia faltante con:
> `npm install --save-dev concurrently`

---

## 🖥️ 2. Usar el Dashboard (Recomendado)

Abre tu navegador en **`http://localhost:3001`**.

### Indicador de estado

En la esquina superior derecha verás un badge de color:
- 🟢 **Online** — El servidor está activo y listo
- 🔴 **Offline** — El servidor no responde (verifica que esté corriendo)
- ⚫ **Verificando** — Comprobando conexión...

### Escribir un requerimiento

En el campo de texto central, escribe lo que quieres automatizar. Sé específico:

**Ejemplos buenos:**
```
El usuario hace login con credenciales válidas (usuario: admin, contraseña: 1234)
y es redirigido al panel de administración.
```
```
El cliente busca el producto "iPhone 15" en la tienda y ve al menos 3 resultados
con precio y disponibilidad.
```
```
El administrador crea un nuevo usuario con nombre "Juan García" y rol "Editor"
y recibe confirmación de creación exitosa.
```

**Evita requerimientos vagos como:**
- ❌ "Hacer login"
- ❌ "Probar búsqueda"
- ❌ "Verificar que funciona"

### Iniciar la generación

Haz clic en **"Generar Prueba"**. Verás cómo los 7 agentes trabajan en secuencia.

---

## 🤖 3. Entendiendo el Pipeline de Agentes

El sistema usa 7 agentes especializados que trabajan en orden:

| # | Agente | ¿Qué hace? |
|---|--------|------------|
| 1 | **Requirements** | Analiza y estructura tu requerimiento |
| 2 | **Duplicate Prevention** | Busca si ya existe una prueba similar |
| 3 | **Business Alignment** | Verifica que el requerimiento sea coherente con el negocio |
| 4 | **Code Generator** | Genera el escenario Gherkin y el código TypeScript |
| 5 | **Validation** | Evalúa la calidad del escenario generado (0-100) |
| 6 | **Review** | Revisa el código TypeScript con análisis estático |
| 7 | **Preview** | Ejecuta los pasos en un navegador headless (capturas de pantalla) |

Cada agente muestra su estado en tiempo real:
- ⏳ **Pendiente** — Aún no ha empezado
- 🔄 **Ejecutando** — Trabajando ahora mismo (con spinner)
- ✅ **Listo** — Completado con éxito
- ❌ **Error** — Algo falló (el pipeline continúa si puede)

---

## 📊 4. Revisando los Resultados

Una vez que el pipeline termina, aparecen secciones progresivamente:

### Badge de Calidad

| Badge | Significado |
|-------|-------------|
| 🟢 **APROBADO** | Score ≥ 70 — La prueba es de buena calidad |
| 🟡 **OBSERVACIONES** | Score 50-69 — Funciona pero tiene mejoras posibles |
| 🔴 **RECHAZADO** | Score < 50 — La prueba necesita revisión |

Si hay observaciones, se muestran en lista debajo del badge.

### Visor Gherkin

Muestra el escenario generado con colorización de sintaxis:
- **Feature** en índigo
- **Scenario** en púrpura
- **Given / When / Then** en colores diferenciados
- Valores entre comillas en ámbar

Hay un botón 📋 para copiar el contenido al portapapeles.

### Visor TypeScript

Muestra el código de Step Definitions generado con:
- Números de línea
- Opción de colapsar/expandir
- Botón de copia

### Preview de Pasos

Muestra cada paso ejecutado en el navegador con:
- Estado (✅ pasó / ❌ falló)
- Captura de pantalla del navegador en ese momento
- Tiempo de ejecución del paso
- Mensaje de error si falló

Puedes navegar entre pasos con los botones **Anterior / Siguiente**.

---

## ⚡ 5. Implementar la Prueba

Al final de la página aparece el botón **"Implementar Prueba"**.

Al hacer clic, el sistema:
1. Guarda el archivo `.feature` en la carpeta `features/`
2. Guarda el archivo `.steps.ts` en `features/step_definitions/`
3. Muestra una notificación de éxito o error

Una vez implementada, puedes ejecutar la prueba con:
```bash
npm test
```

---

## ⚠️ 6. Caso especial: Duplicado detectado

Si el agente **Duplicate Prevention** detecta que ya existe una prueba muy similar, el pipeline se detiene y muestra un aviso:

> **"Se detectó un escenario duplicado"**

Esto significa que ya tienes una prueba cubriendo ese comportamiento. Para proceder de todas formas, modifica tu requerimiento para hacerlo más específico.

---

## 💻 7. Opciones alternativas (sin dashboard)

### CLI interactivo

Si prefieres la terminal:
```bash
npm run ai:cli
```

Verás un menú con opciones para generar, revisar y gestionar escenarios.

### Generación directa (más rápida, menos control)

```bash
npm run ai:gen "El usuario busca un producto y ve resultados"
```

Crea directamente los archivos `.feature` y `.steps.ts` sin pasar por el pipeline completo.

---

## 🧪 8. Ejecutar las Pruebas

### Todos los tests
```bash
npm test
```

### Un feature específico
```bash
npx cucumber-js features/login.feature
```

### Ver reporte HTML detallado (requiere Java)
```bash
npm run report
```
Abre el archivo `target/site/serenity/index.html` en tu navegador.
Verás capturas de pantalla, tiempos y el estado de cada paso.

---

## 🐛 9. Problemas comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| El dashboard no carga | `frontend:dev` no está corriendo | `npm run frontend:dev` en terminal separada |
| Badge "Offline" en rojo | Servidor de UI no responde | `npm run ai:web` |
| El pipeline no arranca | Servidor de API apagado | `npm run ai:api` |
| La IA tarda más de 1 minuto | Ollama procesando modelo grande | Esperar; timeout configurado en 5 min |
| Mensaje "Duplicado detectado" | Requerimiento muy similar a uno existente | Hacer el requerimiento más específico |
| Error en el preview | Playwright MCP no disponible | Verificar `docker-compose up -d` |

---

## 📖 10. Entendiendo Gherkin (para no técnicos)

Los escenarios generados siguen el formato **Gherkin**, que es lenguaje natural estructurado:

```gherkin
Feature: Búsqueda de productos

  Scenario: Usuario encuentra un iPhone
    Given que el actor "Cliente" está en la tienda online
    When busca el término "iPhone 15"
    Then debería ver al menos 3 resultados con precio visible
```

- **Feature**: El grupo al que pertenece la prueba (funcionalidad)
- **Scenario**: El caso específico que se prueba
- **Given**: La condición inicial (contexto)
- **When**: La acción que realiza el usuario
- **Then**: El resultado esperado (verificación)

Este formato lo puedes leer, validar y aprobar como requerimiento de negocio antes de que se ejecute.
