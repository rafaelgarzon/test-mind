/**
 * src/ai/core/ProjectContextLoader.ts
 *
 * RAG-lite loader: scans the Screenplay library on disk and produces a
 * compact, structured context block that the CodeGeneratorAgent feeds to
 * the LLM. The block lists existing Tasks, UI locators and Questions with
 * their full static method signatures and a short usage example extracted
 * from the JSDoc of each file.
 *
 * Design goals:
 *  - Deterministic and cache-friendly (no LLM call).
 *  - Low-token footprint: signatures + 1 example per module, NOT full files.
 *  - Pushes the LLM to REUSE existing Tasks instead of re-inventing them.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface ModuleSummary {
    className: string;
    file: string;
    kind: 'Task' | 'UI' | 'Question';
    methods: Array<{ name: string; signature: string }>;
    example?: string;
}

export class ProjectContextLoader {
    private readonly tasksDir = path.resolve(process.cwd(), 'src/screenplay/tasks');
    private readonly uiDir = path.resolve(process.cwd(), 'src/screenplay/ui');
    private readonly questionsDir = path.resolve(process.cwd(), 'src/screenplay/questions');

    /** Build the full, markdown-formatted context block. */
    public loadContext(): string {
        const tasks = this.scan(this.tasksDir, 'Task');
        const ui = this.scan(this.uiDir, 'UI');
        const questions = this.scan(this.questionsDir, 'Question');

        const sections = [
            this.renderSection('Tasks (high-level business actions — PREFER these over raw interactions)', tasks),
            this.renderSection('UI Locators (PageElement factories — use these instead of writing new By.css())', ui),
            this.renderSection('Questions (state assertions — use with Ensure.that(...))', questions),
            this.renderImportHint(),
        ];

        return [
            '### EXISTING SCREENPLAY LIBRARY (REUSE BEFORE INVENTING):',
            ...sections.filter(Boolean),
        ].join('\n\n');
    }

    /** Same as loadContext() but returns the raw summaries (for tests / telemetry). */
    public loadSummaries(): ModuleSummary[] {
        return [
            ...this.scan(this.tasksDir, 'Task'),
            ...this.scan(this.uiDir, 'UI'),
            ...this.scan(this.questionsDir, 'Question'),
        ];
    }

    // ───────────────────────── internals ─────────────────────────

    private scan(directory: string, kind: ModuleSummary['kind']): ModuleSummary[] {
        if (!fs.existsSync(directory)) return [];

        const files = fs
            .readdirSync(directory)
            .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'index.ts');

        return files.map(file => {
            const content = fs.readFileSync(path.join(directory, file), 'utf-8');
            const className = this.extractClassName(content, file);
            const methods = this.extractStaticMembers(content);
            const example = this.extractExample(content);

            return { className, file, kind, methods, example };
        });
    }

    private extractClassName(content: string, file: string): string {
        // Handles: `export class Foo {`, `export const FooUI = {`
        const classMatch = content.match(/export\s+class\s+(\w+)/);
        if (classMatch) return classMatch[1];

        const constMatch = content.match(/export\s+const\s+(\w+)\s*=\s*\{/);
        if (constMatch) return constMatch[1];

        return file.replace(/\.ts$/, '');
    }

    /**
     * Extracts both `static foo = (args) => …` (arrow form, used by Task
     * classes) and `foo: (args) => …` (object-literal form, used by UI
     * locators like `export const FooUI = { … }`).
     */
    private extractStaticMembers(content: string): Array<{ name: string; signature: string }> {
        const results: Array<{ name: string; signature: string }> = [];

        // Pattern 1: `static foo = (args) =>` or `static foo(args)`
        const staticRegex = /static\s+(\w+)\s*(?:=\s*)?\(([^)]*)\)/g;
        let m: RegExpExecArray | null;
        while ((m = staticRegex.exec(content)) !== null) {
            const name = m[1];
            const args = m[2].trim();
            if (name === 'constructor') continue;
            results.push({ name, signature: `${name}(${args})` });
        }

        // Pattern 2: object-literal form `foo: (args) =>`
        const objRegex = /^\s{4}(\w+):\s*\(([^)]*)\)/gm;
        while ((m = objRegex.exec(content)) !== null) {
            const name = m[1];
            const args = m[2].trim();
            if (results.find(r => r.name === name)) continue;
            results.push({ name, signature: `${name}(${args})` });
        }

        return results;
    }

    /**
     * Extracts the first `Usage:` example block from the file's JSDoc.
     * Looks for lines starting with `*   ` after a line containing `Usage:`.
     */
    private extractExample(content: string): string | undefined {
        const usageMatch = content.match(/\*\s*Usage:\s*\n([\s\S]*?)(?:\*\/|\*\s*$)/);
        if (!usageMatch) return undefined;

        const raw = usageMatch[1]
            .split('\n')
            .map(line => line.replace(/^\s*\*\s?/, ''))
            .filter(line => line.trim().length > 0)
            .join('\n')
            .trim();

        return raw || undefined;
    }

    private renderSection(title: string, modules: ModuleSummary[]): string {
        if (modules.length === 0) return `#### ${title}\n(none yet — feel free to propose new ones)`;

        const lines: string[] = [`#### ${title}`];
        for (const m of modules) {
            const signatures = m.methods.length > 0
                ? m.methods.map(x => `  - ${m.className}.${x.signature}`).join('\n')
                : '  - (no static methods detected)';
            const example = m.example ? `\n  Example:\n${this.indent(m.example, 4)}` : '';
            lines.push(`- ${m.className} (from ${m.file}):\n${signatures}${example}`);
        }
        return lines.join('\n');
    }

    private renderImportHint(): string {
        return [
            '#### Import paths',
            '- Tasks:     `import { NavigateToPage, SearchForItem, AddProductToCart } from \'../../src/screenplay/tasks\';`',
            '- UI:        `import { CartUI, SearchUI, NavigationUI } from \'../../src/screenplay/ui\';`',
            '- Questions: `import { TextOf, IsVisible, CurrentUrl } from \'../../src/screenplay/questions\';`',
            '- Actor:     `import { actorCalled } from \'@serenity-js/core\';`',
            '- Assertions: `import { Ensure, equals, includes } from \'@serenity-js/assertions\';`',
        ].join('\n');
    }

    private indent(block: string, spaces: number): string {
        const pad = ' '.repeat(spaces);
        return block.split('\n').map(l => `${pad}${l}`).join('\n');
    }
}
