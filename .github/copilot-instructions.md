# GitHub Copilot Instructions — Automation Front AI

> Full project context: see `AGENTS.md` at repository root.

## What this project is
A test automation framework with a multi-agent AI pipeline that converts
natural language requirements into Gherkin scenarios + TypeScript step
definitions using the Serenity/JS Screenplay pattern.

## Code style
- TypeScript strict mode, no `any`
- Serenity/JS Screenplay pattern: `Task.where()`, `PageElement.located()`, `Ensure.that()`
- Path aliases: `@screenplay/*`, `@core/*`, `@pipeline/*`, `@agents/*`, `@infra/*`

## When generating step definitions
- **ALWAYS** check existing Tasks in `src/screenplay/tasks/` first (NavigateToPage, SearchForItem, AddProductToCart, FillField, ClickButton, etc.)
- **ALWAYS** check existing UI locators in `src/screenplay/ui/` (SearchUI, CartUI, ProductListUI, FormUI, NavigationUI)
- **ALWAYS** use Questions from `src/screenplay/questions/` for assertions (TextOf, IsVisible, CountOf, CurrentUrl)
- **NEVER** fabricate UI elements that don't exist in the requirement
- **NEVER** use raw `Navigate.to()` — use `NavigateToPage.at(url)`

## When modifying the AI pipeline
- Add new steps in `src/ai/pipeline/defaultPipeline.ts`
- Implement `PipelineStep` interface from `src/ai/core/PipelineStep.ts`
- Do NOT edit `AgentOrchestrator.ts` for new steps
- Use `ContextBuilder` + `generateChat()`, never deprecated `generate()`
- Use `createLogger('Name')` for logging
