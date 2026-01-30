# 📘 Guía de Usuario para No Técnicos

Esta guía te ayudará a utilizar la herramienta de automatización sin necesidad de conocimientos profundos de programación.

## ¿Qué puedo hacer?
1. **Generar pruebas automáticamente** describiendo lo que quieres probar.
2. **Ejecutar pruebas** para verificar que la aplicación funciona.
3. **Ver reportes** visuales de los resultados.

---

## 🤖 1. Generar una Prueba con IA

Si quieres probar una nueva funcionalidad (ej. Buscador), usa el comando `ai:gen`.

**Comando:**
```bash
npm run ai:gen "Descripción del escenario" nombre_archivo.spec.ts
```

**Ejemplo:**
```bash
npm run ai:gen "El usuario busca 'iPhone' y ve resultados" busqueda.spec.ts
```
> Esto creará un archivo nuevo en la carpeta de tests con el código necesario.

---

## ▶️ 2. Ejecutar Pruebas

Para correr todas las pruebas y asegurar que todo está verde:

**Comando:**
```bash
npm run test
```

Si quieres ver el navegador abriéndose y haciendo clicks (Modo Visual):
```bash
npm run test:ui
```

---

## 📊 3. Ver Resultados

Si alguna prueba falla, genera un reporte detallado con pasos y capturas de pantalla.

**Comando:**
```bash
npm run report
```
Se abrirá una página web en tu navegador con los detalles.
