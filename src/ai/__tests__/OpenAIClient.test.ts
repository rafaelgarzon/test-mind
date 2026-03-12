import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIClient } from '../infrastructure/OpenAIClient';
import { ContextBuilder } from '../infrastructure/ContextBuilder';

// Mock the openai module
vi.mock('openai', () => {
    return {
        default: class MockOpenAI {
            chat = {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [{
                            message: { content: '```typescript\nMocked Response\n```' }
                        }]
                    })
                }
            };
        }
    };
});

describe('OpenAIClient', () => {
    let client: OpenAIClient;

    beforeEach(() => {
        vi.clearAllMocks();
        // Set env variable to avoid initialization errors
        process.env.OPENAI_API_KEY = 'test-key';
        client = new OpenAIClient('test-model');
    });

    it('should strip markdown tags from the response correctly in generateChat', async () => {
        const builder = new ContextBuilder();
        builder.addSystemPrompt('System');
        builder.addUserMessage('User');

        const result = await client.generateChat(builder.build());

        // Assert that ```typescript is cleaned out
        expect(result).toBe('\nMocked Response\n');
    });

    it('should map legacy generate correctly into generateChat', async () => {
        const generateChatSpy = vi.spyOn(client, 'generateChat').mockResolvedValue('Legacy Result');

        const result = await client.generate('System rules', 'User request');

        expect(result).toBe('Legacy Result');
        expect(generateChatSpy).toHaveBeenCalledWith([
            { role: 'system', content: 'System rules' },
            { role: 'user', content: 'User request' }
        ]);
    });
});
