/**
 * Tests unitarios para GherkinQualityScorer — Fase 6 (M-03)
 */
import { describe, it, expect } from 'vitest';
import { GherkinQualityScorer } from '../GherkinQualityScorer';

const scorer = new GherkinQualityScorer();

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PHASE4_BAD_OUTPUT = `Feature: Generated Feature
  Scenario: Generated Scenario for ingresa al sitio de google.com y busca hoteles
    Given the user is on the google.com website
    When the user performs a hotel search near Hacienda Napoles
    Then the first result of the search should be displayed`;

const IDEAL_ES_OUTPUT = `Feature: Busqueda Hoteles
  Scenario: Busqueda exitosa cerca de Hacienda Napoles
    Given que el usuario esta en "https://google.com"
    When ingresa "hoteles cerca hacienda napoles" en la barra de busqueda
    And hace clic en "Buscar"
    Then los resultados deben contener "Hacienda Napoles" en el titulo`;

const IDEAL_EN_OUTPUT = `Feature: Hotel Search
  Scenario: Successful hotel search near Hacienda Napoles
    Given the user is on "https://google.com"
    When the user types "hotels near hacienda napoles" in the search bar
    And clicks "Search"
    Then the results should contain "Hacienda Napoles" in the first title`;

// ─── Suite: Output de Fase 4 (peor caso) ─────────────────────────────────────

describe('GherkinQualityScorer — Output Fase 4 (peor caso)', () => {

    it('detecta Feature genérico y descuenta 25 pts', () => {
        const report = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(report.issues).toContain('Feature name is generic ("Generated Feature")');
        expect(report.score).toBeLessThanOrEqual(75);
    });

    it('detecta Scenario que repite el input crudo y descuenta 25 pts', () => {
        const report = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(report.issues).toContain('Scenario name contains the raw requirement text');
        expect(report.score).toBeLessThanOrEqual(50);
    });

    it('detecta mezcla de idiomas (inglés en escenario español) y descuenta 20 pts', () => {
        const report = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(report.issues).toContain('Language mismatch: English words found in a Spanish-language scenario');
        expect(report.score).toBeLessThanOrEqual(30);
    });

    it('detecta Then vago sin valor verificable y descuenta 15 pts', () => {
        const report = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(report.issues).toContain('Then step lacks a specific verifiable value');
    });

    it('detecta When sin datos concretos y descuenta 15 pts', () => {
        const report = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(report.issues).toContain('When step lacks concrete test data (no quoted values)');
    });

    it('score total es 0 con las 5 reglas activadas', () => {
        const report = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(report.score).toBe(0);
        expect(report.passed).toBe(false);
        expect(report.issues).toHaveLength(5);
    });

});

// ─── Suite: Output ideal Fase 5 ──────────────────────────────────────────────

describe('GherkinQualityScorer — Output ideal Fase 5', () => {

    it('score 100/100 para Gherkin en español sin issues', () => {
        const report = scorer.score(IDEAL_ES_OUTPUT, 'es');
        expect(report.score).toBe(100);
        expect(report.passed).toBe(true);
        expect(report.issues).toHaveLength(0);
    });

    it('score 100/100 para Gherkin en inglés sin issues', () => {
        const report = scorer.score(IDEAL_EN_OUTPUT, 'en');
        expect(report.score).toBe(100);
        expect(report.passed).toBe(true);
        expect(report.issues).toHaveLength(0);
    });

    it('provee sugerencias solo cuando hay issues', () => {
        const goodReport = scorer.score(IDEAL_ES_OUTPUT, 'es');
        expect(goodReport.suggestions).toHaveLength(0);

        const badReport = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(badReport.suggestions.length).toBeGreaterThan(0);
    });

});

// ─── Suite: Reglas individuales ───────────────────────────────────────────────

describe('GherkinQualityScorer — Reglas individuales', () => {

    it('Regla 3: NO descuenta por idioma si el requerimiento es en inglés', () => {
        const mixedInEN = `Feature: Login
  Scenario: Successful login
    Given the user is on "https://example.com/login"
    When the user enters "admin" in the username field
    Then the user should see "Welcome"`;

        const report = scorer.score(mixedInEN, 'en');
        expect(report.issues).not.toContain('Language mismatch: English words found in a Spanish-language scenario');
    });

    it('Regla 4: NO penaliza Then con valor entre comillas aunque use "should be"', () => {
        const gherkin = `Feature: Search
  Scenario: Find results
    Given que el usuario esta en "https://google.com"
    When ingresa "hoteles" en la barra
    Then el titulo debe contener "Hacienda Napoles"`;

        const report = scorer.score(gherkin, 'es');
        expect(report.issues).not.toContain('Then step lacks a specific verifiable value');
    });

    it('Regla 5: NO penaliza When con datos entre comillas', () => {
        const gherkin = `Feature: Search
  Scenario: Find results
    Given the user is on "https://google.com"
    When the user types "hotels near napoles" in the search bar
    Then results should contain "Hacienda Napoles"`;

        const report = scorer.score(gherkin, 'en');
        expect(report.issues).not.toContain('When step lacks concrete test data (no quoted values)');
    });

    it('passed=true exactamente en score >= 70', () => {
        // Score parcialmente malo: solo Regla 5 activada (-15) → 85/100 → passed
        const partialBad = `Feature: Busqueda Hoteles
  Scenario: Busqueda exitosa
    Given que el usuario esta en "https://google.com"
    When ingresa texto en la barra de busqueda
    Then los resultados deben contener "Hacienda Napoles"`;

        const report = scorer.score(partialBad, 'es');
        expect(report.score).toBe(85);
        expect(report.passed).toBe(true);
    });

    it('passed=false con score < 70', () => {
        // Reglas 1+2 activadas (-50) → 50/100 → not passed
        const twoFails = `Feature: Generated Feature
  Scenario: Generated Scenario for hacer una cosa
    Given que el usuario esta en "https://example.com"
    When ingresa "dato" en el campo
    Then el resultado debe contener "valor"`;

        const report = scorer.score(twoFails, 'es');
        expect(report.score).toBe(50);
        expect(report.passed).toBe(false);
    });

});

// ─── Suite: Casos borde ───────────────────────────────────────────────────────

describe('GherkinQualityScorer — Casos borde', () => {

    it('string vacío devuelve score=100 (sin issues detectables)', () => {
        const report = scorer.score('', 'es');
        expect(report.score).toBe(100);
        expect(report.issues).toHaveLength(0);
    });

    it('score nunca es negativo', () => {
        const report = scorer.score(PHASE4_BAD_OUTPUT, 'es');
        expect(report.score).toBeGreaterThanOrEqual(0);
    });

    it('score nunca supera 100', () => {
        const report = scorer.score(IDEAL_ES_OUTPUT, 'es');
        expect(report.score).toBeLessThanOrEqual(100);
    });

});
