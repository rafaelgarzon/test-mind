export interface QualityReport {
    score: number;          // 0 a 100
    passed: boolean;        // true si score >= 70
    issues: string[];       // descripcion de cada problema encontrado
    suggestions: string[];  // como corregir cada problema
}

export class GherkinQualityScorer {

    score(gherkin: string, lang: 'es' | 'en' = 'en'): QualityReport {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let deductions = 0;

        // Regla 1 (peso: -25): Feature name es el fallback generico
        if (/Feature:\s*Generated Feature/i.test(gherkin)) {
            deductions += 25;
            issues.push('Feature name is generic ("Generated Feature")');
            suggestions.push(
                lang === 'es'
                    ? 'Usa un nombre corto que describa la capacidad del negocio, ej: "Búsqueda de Hoteles"'
                    : 'Use a short business capability name, e.g. "Hotel Search"'
            );
        }

        // Regla 2 (peso: -25): Scenario name repite el input crudo
        if (/Scenario:\s*Generated Scenario for/i.test(gherkin)) {
            deductions += 25;
            issues.push('Scenario name contains the raw requirement text');
            suggestions.push(
                lang === 'es'
                    ? 'Describe el comportamiento específico, ej: "Búsqueda exitosa cerca de Hacienda Nápoles"'
                    : 'Describe the specific behavior, e.g. "Successful hotel search near Hacienda Napoles"'
            );
        }

        // Regla 3 (peso: -20): Mezcla de idiomas en escenario español
        if (lang === 'es') {
            const englishStepWords = gherkin.match(
                /\b(the user|clicks|enters|should be|navigates|performs|searches)\b/gi
            ) ?? [];
            if (englishStepWords.length >= 2) {
                deductions += 20;
                issues.push('Language mismatch: English words found in a Spanish-language scenario');
                suggestions.push(
                    'Todos los pasos deben estar en español ya que el requerimiento fue ingresado en español'
                );
            }
        }

        // Regla 4 (peso: -15): Paso Then sin valor especifico verificable
        const thenMatch = gherkin.match(/^\s*Then\s+(.+)/im);
        if (thenMatch) {
            const thenStep = thenMatch[1].trim();
            const isVagueAssertion =
                /should be (displayed|visible|shown|present)$/i.test(thenStep) &&
                !/"[^"]+"/.test(thenStep);
            if (isVagueAssertion) {
                deductions += 15;
                issues.push('Then step lacks a specific verifiable value');
                suggestions.push(
                    lang === 'es'
                        ? 'Agrega el texto esperado entre comillas, ej: Then los resultados deben contener "Hacienda Nápoles"'
                        : 'Add the expected text in quotes, e.g. Then results should contain "Hacienda Napoles"'
                );
            }
        }

        // Regla 5 (peso: -15): Paso When sin datos concretos
        const whenMatch = gherkin.match(/^\s*When\s+(.+)/im);
        if (whenMatch) {
            const whenStep = whenMatch[1].trim();
            const lacksConcreteData = !/"[^"]+"/.test(whenStep);
            const isVagueAction = /performs a|does a|executes|runs a/i.test(whenStep);
            if (lacksConcreteData || isVagueAction) {
                deductions += 15;
                issues.push('When step lacks concrete test data (no quoted values)');
                suggestions.push(
                    lang === 'es'
                        ? 'Especifica qué escribe o en qué hace clic el usuario, ej: When ingresa "hoteles hacienda napoles" en la barra de búsqueda'
                        : 'Specify what the user types or clicks, e.g. When types "hotels near hacienda napoles" in the search bar'
                );
            }
        }

        const finalScore = Math.max(0, 100 - deductions);

        return {
            score: finalScore,
            passed: finalScore >= 70,
            issues,
            suggestions,
        };
    }
}
