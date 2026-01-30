import * as fs from 'fs';
import * as path from 'path';

export class ProjectContextLoader {
    private tasksDir = path.resolve(process.cwd(), 'src/screenplay/tasks');
    private uiDir = path.resolve(process.cwd(), 'src/screenplay/ui');

    public loadContext(): string {
        let context = "### EXISTING PROJECT CONTEXT (Examples for Reuse):\n";

        context += this.scanDirectory(this.tasksDir, 'Tasks');
        context += "\n";
        context += this.scanDirectory(this.uiDir, 'UI/PageElements');

        return context;
    }

    private scanDirectory(directory: string, type: string): string {
        if (!fs.existsSync(directory)) return `No existing ${type} found.\n`;

        const files = fs.readdirSync(directory).filter(f => f.endsWith('.ts'));
        if (files.length === 0) return `No existing ${type} found.\n`;

        let summary = `- Existing ${type}:\n`;
        files.forEach(file => {
            const content = fs.readFileSync(path.join(directory, file), 'utf-8');
            // Extract Class Name
            const classMatch = content.match(/export class (\w+)/);
            const className = classMatch ? classMatch[1] : file.replace('.ts', '');

            // Extract static methods (Task factories)
            const methods = content.match(/static \w+/g) || [];

            summary += `  - ${className} (${methods.join(', ').replace(/static /g, '')})\n`;
        });
        return summary;
    }
}
