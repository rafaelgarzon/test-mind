/**
 * src/ai/infrastructure/Logger.ts — Fase 13
 *
 * Abstracción de logging para todos los agentes y módulos de infraestructura.
 * Reemplaza los `console.log` directos por una interfaz estructurada que permite
 * cambiar la implementación (Winston, Pino, etc.) sin modificar los agentes.
 *
 * Nivel de log controlado por variable de entorno LOG_LEVEL (default: 'info').
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

export interface Logger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
}

/**
 * Implementación por defecto: escribe a stdout/stderr con prefijo de agente
 * y nivel de log. Respeta LOG_LEVEL de la variable de entorno.
 */
export class ConsoleLogger implements Logger {
    private readonly minLevel: number;

    constructor(private readonly prefix: string = '') {
        const envLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
        this.minLevel = LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
    }

    private format(level: LogLevel, message: string): string {
        const tag = this.prefix ? `[${this.prefix}]` : '';
        return `${tag} ${message}`;
    }

    debug(message: string, context?: Record<string, unknown>): void {
        if (this.minLevel > LOG_LEVELS.debug) return;
        console.debug(this.format('debug', message), context ?? '');
    }

    info(message: string, context?: Record<string, unknown>): void {
        if (this.minLevel > LOG_LEVELS.info) return;
        console.log(this.format('info', message), context ?? '');
    }

    warn(message: string, context?: Record<string, unknown>): void {
        if (this.minLevel > LOG_LEVELS.warn) return;
        console.warn(this.format('warn', message), context ?? '');
    }

    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
        const err = error instanceof Error ? { message: error.message, stack: error.stack } : error;
        console.error(this.format('error', message), err ?? '', context ?? '');
    }
}

/** Fábrica: crea un ConsoleLogger con prefijo de agente. */
export function createLogger(agentName: string): Logger {
    return new ConsoleLogger(agentName);
}
