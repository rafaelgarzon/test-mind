import fs from 'fs';
import path from 'path';

export class BusinessDocumentLoader {
    private docsPath: string;

    constructor(docsPath: string = path.resolve(process.cwd(), 'docs/business_context')) {
        this.docsPath = docsPath;
    }

    /**
     * Carga recursivamente o iterativamente todos los documentos Markdown o TXT
     * depositados en la carpeta de contexto y los concatena como un bloque maestro.
     */
    public loadAllContext(): string {
        try {
            if (!fs.existsSync(this.docsPath)) {
                return 'No hay reglas de negocio definidas actualmente.';
            }

            const files = fs.readdirSync(this.docsPath);
            let combinedContext = '';

            for (const file of files) {
                // Ignore the README or hidden files if necessary, but actually reading README is fine
                // since it just contains meta-instructions, although ideally we skip it.
                if (file === 'README.md' || file.startsWith('.')) continue;

                const ext = path.extname(file).toLowerCase();
                if (['.md', '.txt', '.csv', '.json'].includes(ext)) {
                    const filePath = path.join(this.docsPath, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.isFile()) {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        combinedContext += `--- INICIO DOCUMENTO: ${file} ---\n${content}\n--- FIN DOCUMENTO ---\n\n`;
                    }
                }
            }

            return combinedContext.trim() || 'No se encontraron documentos de reglas de negocio válidos.';
            
        } catch (error) {
            console.error('Error cargando el Business Context:', error);
            return 'Error cargando contexto de negocio.';
        }
    }
}
