# Contexto de Negocio (Business Constraints & Domain)

Este directorio es la **fuente de la verdad incremental** para el `BusinessAlignmentAgent`. Toda la documentación que se coloque aquí será leída e inyectada como contexto (RAG) para auditar los escenarios Gherkin antes de convertirse en código de pruebas.

## ¿Cómo documentar para la IA?
Puedes subir uno o múltiples archivos. El Agente concatenará el contenido y lo comprenderá holísticamente.

Ejemplos de archivos soportados:
- **`glosario.md`**: Definición del vocabulario corporativo (ej. "Los clientes se denominan 'Huéspedes'").
- **`reglas_de_oro.txt`**: Políticas inquebrantables (ej. "Toda contraseña debe tener mayúsculas").
- **`export_confluence.md`**: Textos exportados directamente de wikis operativas de Atlassian.

**Nota:** Si escribes un archivo largo, asegúrate de mantener una sintaxis limpia. La IA usará todo esto para rechazar escenarios o sugerir autocorrecciones de negocio.
