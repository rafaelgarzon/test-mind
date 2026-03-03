/**
 * Tests unitarios para LanguageDetector — Fase 6 (M-03)
 */
import { describe, it, expect } from 'vitest';
import { LanguageDetector } from '../LanguageDetector';

// ─── Suite: Detección español ─────────────────────────────────────────────────

describe('LanguageDetector — Español', () => {

    it('detecta español en el caso de las imágenes del proyecto', () => {
        const req = 'ingresa al sitio de google.com , realiza una consulta de hoteles cercanos a la hacienda napoles y valida cual es el primer resultado de la busqueda';
        expect(LanguageDetector.detect(req)).toBe('es');
    });

    it('detecta español con 3 o más palabras clave', () => {
        expect(LanguageDetector.detect('el usuario ingresa al sistema')).toBe('es');
    });

    it('detecta español con palabras de acción en español', () => {
        expect(LanguageDetector.detect('realiza una busqueda y valida el resultado')).toBe('es');
    });

    it('detecta español en requerimiento largo dominantemente español', () => {
        const req = 'el usuario debe ingresar al portal y hacer clic en el boton de login';
        expect(LanguageDetector.detect(req)).toBe('es');
    });

    it('detecta español aunque tenga palabras en inglés mezcladas', () => {
        const req = 'el usuario clicks en el boton de login';
        expect(LanguageDetector.detect(req)).toBe('es');
    });

});

// ─── Suite: Detección inglés ──────────────────────────────────────────────────

describe('LanguageDetector — Inglés', () => {

    it('detecta inglés en texto puramente inglés', () => {
        expect(LanguageDetector.detect('navigate to the login page and verify the dashboard')).toBe('en');
    });

    it('detecta inglés con solo 2 palabras españolas (bajo el umbral de 3)', () => {
        expect(LanguageDetector.detect('el usuario clicks on the button')).toBe('en');
    });

    it('detecta inglés en requerimiento corto', () => {
        expect(LanguageDetector.detect('login with valid credentials')).toBe('en');
    });

    it('detecta inglés en requerimiento de una palabra', () => {
        expect(LanguageDetector.detect('search')).toBe('en');
    });

});

// ─── Suite: Casos borde ───────────────────────────────────────────────────────

describe('LanguageDetector — Casos borde', () => {

    it('string vacío retorna inglés (fallback seguro)', () => {
        expect(LanguageDetector.detect('')).toBe('en');
    });

    it('solo números y símbolos retorna inglés', () => {
        expect(LanguageDetector.detect('123 !! @@ ## 456')).toBe('en');
    });

    it('exactamente 3 palabras españolas activa la detección', () => {
        // "ingresa", "valida", "busca" son 3 patrones → español
        expect(LanguageDetector.detect('ingresa valida busca')).toBe('es');
    });

    it('exactamente 2 palabras españolas NO activa la detección', () => {
        // Solo "ingresa" y "el" → 2 matches → inglés
        expect(LanguageDetector.detect('ingresa el button')).toBe('en');
    });

    it('retorna un tipo SupportedLanguage válido', () => {
        const result = LanguageDetector.detect('cualquier texto');
        expect(['es', 'en']).toContain(result);
    });

});
