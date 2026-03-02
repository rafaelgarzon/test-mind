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
            // Add new columns for execution results if they don't exist
            this.db.run(`ALTER TABLE scenarios ADD COLUMN execution_status TEXT DEFAULT 'pending'`, () => { });
            this.db.run(`ALTER TABLE scenarios ADD COLUMN execution_error TEXT`, () => { });
        });
    }

    private generateHash(content: string): string {
        return crypto.createHash('sha256').update(content.trim()).digest('hex');
    }

    async addScenario(description: string, gherkinContent: string): Promise<number | null> {
        const hash = this.generateHash(gherkinContent);

        // Check for duplicate
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
