#!/usr/bin/env node
import inquirer from 'inquirer';
import { ScenarioGenerator } from '../ai/ScenarioGenerator';
import { OllamaProvider } from '../ai/OllamaProvider';

const generator = new ScenarioGenerator();
const provider = new OllamaProvider();

async function main() {
    console.log('🤖 Generador de Pruebas Automatizado con IA (Fase 4) - Stack FREE');

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
                    console.log(result);
                    console.log('\n-------------------------\n');
                    console.log('✅ Escenario guardado en la Base de Conocimiento.');

                    const { generateSteps } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'generateSteps',
                            message: '¿Quieres generar Step Definitions para este escenario?',
                            default: true
                        }
                    ]);

                    if (generateSteps) {
                        const steps = await generator.generateStepDefinitions(result);
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
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
