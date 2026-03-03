/**
 * src/db/KnowledgeBase.ts
 *
 * Fase 6 (M-05): Añadida búsqueda por similitud Jaccard sobre palabras clave
 * como alternativa semántica al LIKE textual. No requiere dependencias externas.
 * Umbral por defecto: 0.35 (35% de palabras en común sobre la unión del vocabulario).
 */
import * as sqlite3 from 'sqlite3';
import * as crypto from 'crypto';
import * as path from 'path';

export interface StoredScenario {
    id: number;
    description: string;
    gherkin_content: string;
    hash: string;
    created_at: string;
    execution_status?: string;
    execution_error?: string;
}

export interface SimilarScenario extends StoredScenario {
    similarity: number; // 0.0 a 1.0
}

// Palabras vacías ignoradas en la comparación (español + inglés)
const STOP_WORDS = new Set([
    'el','la','los','las','de','en','que','un','una','al','del','con','por','para',
    'se','es','the','a','an','of','in','on','to','and','or','for','with','at',
    'from','this','that','its','are','was','were','has','have','had','be','been',
]);

export class KnowledgeBase {
    private db: sqlite3.Database;

    constructor(dbPath: string = 'knowledge_base.sqlite') {
        const fullPath = path.resolve(process.cwd(), dbPath);
        this.db = new sqlite3.Database(fullPath, (err) => {
            if (err) {
                console.error('Could not connect to database', err);
            } else {
                console.log('Connected to Knowledge Base SQlite database.');
                this.initTable();
            }
        });
    }

    private initTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS scenarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT,
                gherkin_content TEXT,
                hash TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        this.db.run(sql, () => {
            this.db.run(`ALTER TABLE scenarios ADD COLUMN execution_status TEXT DEFAULT 'pending'`, () => { });
            this.db.run(`ALTER TABLE scenarios ADD COLUMN execution_error TEXT`, () => { });
        });
    }

    private generateHash(content: string): string {
        return crypto.createHash('sha256').update(content.trim()).digest('hex');
    }

    // ─────────────────────────────────────────────────────────────────
    // Fase 6 (M-05): Similitud Jaccard sobre palabras clave
    // ─────────────────────────────────────────────────────────────────

    /**
     * Tokeniza texto en palabras clave (≥4 chars, sin stop words, sin puntuación).
     */
    private tokenize(text: string): Set<string> {
        return new Set(
            text
                .toLowerCase()
                .replace(/[^a-z0-9\s]/gi, ' ')
                .split(/\s+/)
                .filter(w => w.length >= 4 && !STOP_WORDS.has(w))
        );
    }

    /**
     * Índice de Jaccard: |A ∩ B| / |A ∪ B|
     * Retorna 0.0 (sin similitud) a 1.0 (idéntico).
     */
    private jaccard(a: string, b: string): number {
        const setA = this.tokenize(a);
        const setB = this.tokenize(b);
        if (setA.size === 0 && setB.size === 0) return 1.0;
        if (setA.size === 0 || setB.size === 0) return 0.0;

        const intersection = [...setA].filter(w => setB.has(w)).length;
        const union = new Set([...setA, ...setB]).size;
        return intersection / union;
    }

    private async getAllScenarios(): Promise<StoredScenario[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM scenarios', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as StoredScenario[]);
            });
        });
    }

    /**
     * Fase 6 (M-05): Busca escenarios semánticamente similares.
     * Detecta duplicados semánticos como "iniciar sesión" vs "ingresar al sistema".
     *
     * @param requirement  Texto del requerimiento a comparar
     * @param threshold    Similitud mínima (0.0–1.0). Default: 0.35
     */
    async findSimilar(requirement: string, threshold: number = 0.35): Promise<SimilarScenario[]> {
        const all = await this.getAllScenarios();
        return all
            .map(s => ({ ...s, similarity: this.jaccard(requirement, s.description) }))
            .filter(s => s.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity);
    }

    // ─────────────────────────────────────────────────────────────────
    // Métodos existentes (sin cambios de comportamiento)
    // ─────────────────────────────────────────────────────────────────

    async addScenario(description: string, gherkinContent: string): Promise<number | null> {
        const hash = this.generateHash(gherkinContent);

        const isDuplicate = await this.isDuplicate(hash);
        if (isDuplicate) {
            console.log('Scenario is a duplicate.');
            return null;
        }

        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO scenarios (description, gherkin_content, hash) VALUES (?, ?, ?)`;
            this.db.run(sql, [description, gherkinContent, hash], function (err) {
                if (err) {
                    console.error('Error adding scenario:', err);
                    reject(err);
                } else {
                    console.log(`Scenario added with ID: ${this.lastID}`);
                    resolve(this.lastID);
                }
            });
        });
    }

    async isDuplicate(hash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT id FROM scenarios WHERE hash = ?`;
            this.db.get(sql, [hash], (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            });
        });
    }

    /**
     * Búsqueda textual por keyword (LIKE). Mantenida por compatibilidad.
     * Para búsqueda semántica usar findSimilar().
     */
    async searchScenarios(keyword: string): Promise<StoredScenario[]> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM scenarios WHERE description LIKE ? OR gherkin_content LIKE ?`;
            const param = `%${keyword}%`;
            this.db.all(sql, [param, param], (err, rows) => {
                if (err) reject(err);
                resolve(rows as StoredScenario[]);
            });
        });
    }

    async updateExecutionResult(id: number, status: 'passed' | 'failed', error: string = ''): Promise<void> {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE scenarios SET execution_status = ?, execution_error = ? WHERE id = ?`;
            this.db.run(sql, [status, error, id], (err) => {
                if (err) {
                    console.error('Error updating execution result:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getFailedScenarios(limit: number = 5): Promise<StoredScenario[]> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM scenarios WHERE execution_status = 'failed' ORDER BY created_at DESC LIMIT ?`;
            this.db.all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                resolve(rows as StoredScenario[]);
            });
        });
    }

    close() {
        this.db.close();
    }
}
