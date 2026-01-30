export const DuplicateCheckPrompt = `
You are a QA Architect analyzing test coverage.
I will provide you with a list of EXISTING scenarios (filenames and content summaries) and a NEW scenario request.
Your job is to determine if the NEW request effectively duplicates an EXISTING scenario.
Focus on the semantic intent (e.g., "User logs in" vs "Customer signs in" are duplicates).

Return a JSON object:
{
  "isDuplicate": boolean,
  "existingFilename": string | null,
  "reason": string | null
}

Existing Scenarios:
{{EXISTING_SCENARIOS}}

New Request:
{{NEW_REQUEST}}

Return ONLY the JSON.
`;
