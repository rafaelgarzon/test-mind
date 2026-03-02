export const GHERKIN_PROMPT_TEMPLATE = `
You are an expert QA Automation Engineer. Your task is to convert the following user requirement into a high-quality Gherkin scenario (Cucumber format).

Rules:
1. Use GIVEN, WHEN, THEN, AND keywords.
2. Be concise and specific.
3. Do NOT include any explanations or markdown formatting outside the Gherkin code.
4. Use valid Gherkin syntax.

User Requirement: "{requirement}"

Examples:

Requirement: "Login with valid credentials"
Feature: User Authentication
Scenario: Successful Login
  Given the user is on the login page
  When the user enters valid username "admin" and password "1234"
  And clicks the login button
  Then the user should be redirected to the dashboard
  And the welcome message should be displayed

Requirement: "Search for a product"
Feature: Product Search
Scenario: Product Search
  Given the user is on the homepage
  When the user searches for "Laptop"
  Then search results for "Laptop" should be displayed
  And the results list should not be empty

Output ONLY the Gherkin scenario.
`;

export const STEP_DEFINITION_PROMPT_TEMPLATE = `
You are an expert QA Automation Engineer using CucumberJS, TypeScript, and Serenity/JS (Screenplay Pattern).
Your task is to generate TypeScript step definitions for the following Gherkin scenario.

CRITICAL ARCHITECTURE RULES (SERENITY/JS SCREENPLAY PATTERN):
1. Use 'Given', 'When', 'Then' from '@cucumber/cucumber'.
2. DO NOT use generic browser APIs (like page.locator). YOU MUST strictly use Serenity/JS abstractions: \`actorCalled\`, \`attemptsTo\`, \`Navigate\`, \`Ensure\`, etc.
3. Steps should be written using an Actor. Example: \`await actorCalled('usuario').attemptsTo(...)\`
4. Assume UI elements are defined in \`src/screenplay/ui/UIComponents.ts\` and Tasks in \`src/screenplay/tasks/ActionTasks.ts\`. Do not implement them, just import them hypothetically or use standard ones.
5. Use clear and descriptive function names, strictly typed parameters.
6. Only output the step definition code, no markdown explanations.

Example of expected code style:
\`\`\`typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Navigate, Click, Enter } from '@serenity-js/web';
import { Ensure, includes } from '@serenity-js/assertions';
import { LoginUI } from '../../src/screenplay/ui/LoginUI';

Given('que el Actor {string} abre la pagina', async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(
        Navigate.to('https://example.com')
    );
});
\`\`\`

Gherkin Scenario:
"{scenario}"

Output ONLY the TypeScript code for the step definitions.
`;

export const SCENARIO_VALIDATION_PROMPT_TEMPLATE = `
You are an expert QA Automation Engineer acting as a validator.
Your task is to determine if the generated Gherkin scenario correctly and fully addresses the given user requirement.

User Requirement: "{requirement}"

Generated Gherkin Scenario:
"""
{scenario}
"""

Evaluate the scenario based on:
1. Is it generally related to the user requirement?
2. Does it have the basic logical steps for it?

If the scenario broadly implements the requirement, respond with EXACTLY the word: VALID. Do NOT be overly strict about missing edge cases, email confirmations, or implicit steps not mentioned by the user.
If it completely misses the core requirement, respond with EXACTLY the word: INVALID followed by why it failed.
Output ONLY 'VALID' or 'INVALID: reason'.
`;

export const LEARNING_FEEDBACK_PROMPT_TEMPLATE = `
You are an expert QA Automation Engineer.
The following Gherkin scenario was generated previously for a requirement, but its execution failed.
Your task is to analyze the failure and generate a corrected, improved Gherkin scenario.

User Requirement: "{requirement}"

Original Failed Scenario:
"""
{scenario}
"""

Execution Error/Feedback:
"""
{error}
"""

Fix the scenario so it addresses the error and correctly implements the requirement.
Output ONLY the corrected Gherkin scenario.
`;
