/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        exclude: [
            'node_modules',
            'dist',
            '.idea',
            '.git',
            '.cache',
            '.claude',
            'src/screenplay/specs/**/*.ts' // Exclude playwright e2e tests
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/ai/**/*.ts', 'src/db/**/*.ts', 'src/ui/**/*.ts'],
            exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        },
    },
});
