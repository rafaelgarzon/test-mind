 Crea la fase 4 como mejora a la version original, todo debe trabajarse en una rama aparte y al final se debe realizar la actualizacion/creacion de la documentacion necesaria para poder utilizar el framework
 
 Fase 4: Generación de Pruebas Automatizada con IA (Stack FREE)
 4.1. Configuración e Integración de Ollama
	- Crear docker-compose.yml con el servicio Ollama
	- Seleccionar modelo óptimo (llama3.2, codellama, mistral)
	- Implementar OllamaProvider (cliente REST API)
	- Agregar automatización de descarga de modelos
	- Implementar health check y fallback a modelos más pequeños
 4.2 Ingeniería de Prompts (Optimizado para modelos locales)
	- Diseñar prompts concisos (modelos locales = menos contexto)
	- Ejemplos few-shot en los prompts
	- Templates de Gherkin para consistencia
	- Formateo de salida estructurada
 4.3 Motor de Generación de Escenarios
	- Convertidor lenguaje natural → Gherkin
	- Detección de duplicados (basado en hash, sin embeddings)
	- Validador de escenarios (sintaxis + semántica)
	- Generador de step definitions
	- Cola de procesamiento por lotes
 4.4 Base de Conocimiento (Local y Simple)
	- Base de datos SQLite (cero dependencias)
	- Indexación de escenarios (hash + palabras clave)
	- Búsqueda simple por palabras clave (sin vector DB para V1)
	- Almacenamiento de resultados de ejecución 
	- Ciclo de aprendizaje por retroalimentación
 4.5 Interfaz de Usuario (Técnicos y No Técnicos)
	- CLI para desarrolladores
	- Asistente interactivo (preguntas → escenarios)
	- Web UI simple (Express + HTML) [opcional V1]
	- Extensión de VS Code [V2]
