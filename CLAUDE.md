@AGENTS.md

# Claude Code — Project-specific rules

## Verification after edits
- Run `npx tsc --noEmit` after any TypeScript change
- Run `npm run test:unit` if modifying agents or pipeline steps

## Commit conventions
- Concise message, imperative mood ("add", "fix", "refactor")
- End with: `Co-Authored-By: Claude <model> <noreply@anthropic.com>`
- Stage specific files — never `git add -A`

## Key file locations
- Pipeline config: `src/ai/pipeline/defaultPipeline.ts`
- Screenplay library: `src/screenplay/` (tasks/, ui/, questions/)
- Agent orchestrator: `src/ai/core/AgentOrchestrator.ts` (do NOT edit to add steps)
- SSE server: `src/api/server.ts`
- AI provider interface: `src/ai/infrastructure/AIProvider.ts`
