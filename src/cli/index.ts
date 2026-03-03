#!/usr/bin/env node
import inquirer from 'inquirer';
import { ScenarioGenerator } from '../ai/ScenarioGenerator';
import { OllamaProvider } from '../ai/OllamaProvider';
import '../config'; // Fase 6 (M-06): valida variables de entorno al arranque

const generator = new ScenarioGenerator();
const provider = new OllamaProvider();

async function main() {
    console.log('🤖 Generador de Pruebas Automatizado con IA (Fase 5) - Stack FREE');

    // Initialize (check model)
    try {
        await generator.initialize();
    } catch (e) {
        console.log('⚠️  Continuando sin conexión inicial a IA (algunas funciones pueden fallar).');
    }

    while (true) {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '¿Qué te gustaría hacer?',
                choices: [
                    'Generar Escenario',
                    'Generar Escenarios por Lotes',
                    'Verificar Estado de IA',
                    'Salir'
                ]
            }
        ]);

        if (action === 'Salir') {
            console.log('¡Hasta luego!');
            generator.close();
            process.exit(0);
        }

        if (action === 'Verificar Estado de IA') {
            const isHealthy = await provider.isHealthy();
            console.log(`Estado de Ollama: ${isHealthy ? '🟢 En línea' : '🔴 Fuera de línea'}`);
            if (isHealthy) {
                const models = await provider.listModels();
                console.log('Modelos Disponibles:', models.join(', '));
            }
        }

        if (action === 'Generar Escenario') {
            const { requirement } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'requirement',
                    message: 'Ingresa el requerimiento/historia de usuario:'
                }
            ]);

            if (requirement) {
                const result = await generator.generateScenario(requirement);
                if (result) {
                    console.log('\n--- Gherkin Generado ---\n');
                    console.log(result.gherkin);
                    console.log('\n-------------------------\n');
                    console.log(`✅ Escenario guardado en la Base de Conocimiento (Calidad: ${result.quality.score}/100 - ${result.quality.passed ? 'APROBADO' : 'CON OBSERVACIONES'}).`);

                    const { generateSteps } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'generateSteps',
                            message: '¿Quieres generar Step Definitions para este escenario?',
                            default: true
                        }
                    ]);

                    if (generateSteps) {
                        const steps = await generator.generateStepDefinitions(result.gherkin);
                        if (steps) {
                            console.log('\n--- Step Definitions Generados ---\n');
                            console.log(steps);
                            console.log('\n----------------------------------\n');
                        }
                    }
                } else {
                    console.log('❌ Falló la generación del escenario.');
                }
            }
        }

        if (action === 'Generar Escenarios por Lotes') {
            console.log('Ingresa tus requerimientos uno por uno. Escribe "FIN" para terminar y procesar.');
            const requirements: string[] = [];
            while (true) {
                const { req } = await inquirer.prompt([{
                    type: 'input',
                    name: 'req',
                    message: `Requerimiento ${requirements.length + 1} (o 'FIN'):`
                }]);
                if (req.trim().toUpperCase() === 'FIN') break;
                if (req.trim()) requirements.push(req.trim());
            }

            if (requirements.length > 0) {
                const results = await generator.generateScenariosBatch(requirements);
                console.log(`\nSe procesaron ${results.length} escenarios.`);
                const successful = results.filter(r => r !== null).length;
                console.log(`✅ Exitosos: ${successful}`);
                console.log(`❌ Fallidos: ${results.length - successful}`);
            } else {
                console.log('No se ingresaron requerimientos.');
            }
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
