import { CodeGenerator } from './core/CodeGenerator';

// Basic CLI handler
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: ts-node src/ai/generator.ts <description> <filename.spec.ts>");
    } else {
        const generator = new CodeGenerator();
        generator.generateTestSpecs(args[0], args[1])
            .catch(err => console.error("Generation failed:", err));
    }
}
