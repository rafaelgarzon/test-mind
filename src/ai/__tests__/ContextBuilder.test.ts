import { describe, it, expect } from 'vitest';
import { ContextBuilder } from '../infrastructure/ContextBuilder';

describe('ContextBuilder', () => {
    it('should add a system prompt correctly', () => {
        const builder = new ContextBuilder();
        builder.addSystemPrompt('You are an AI assistant.');
        const messages = builder.build();

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({
            role: 'system',
            content: 'You are an AI assistant.',
            type: 'system_prompt'
        });
    });

    it('should add domain knowledge as a system prompt', () => {
        const builder = new ContextBuilder();
        builder.addDomainKnowledge('Example 1: Do this.');
        const messages = builder.build();

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({
            role: 'system',
            content: 'Example 1: Do this.',
            type: 'domain_knowledge'
        });
    });

    it('should format memory files correctly as a user prompt', () => {
        const builder = new ContextBuilder();
        builder.addMemoryFile('Previous scenario: login');
        const messages = builder.build();

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({
            role: 'user',
            content: '[MEMORY FILE (Similar Previous Context)]\nPrevious scenario: login',
            type: 'memory_file'
        });
    });

    it('should add a user message correctly', () => {
        const builder = new ContextBuilder();
        builder.addUserMessage('Generate a login test.');
        const messages = builder.build();

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({
            role: 'user',
            content: 'Generate a login test.',
            type: 'user_message'
        });
    });

    it('should add an assistant message correctly', () => {
        const builder = new ContextBuilder();
        builder.addAssistantMessage('Here is your test.');
        const messages = builder.build();

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({
            role: 'assistant',
            content: 'Here is your test.',
            type: 'assistant_message'
        });
    });

    it('should chain builder methods correctly to create a full context window', () => {
        const builder = new ContextBuilder();
        const messages = builder
            .addSystemPrompt('System rules')
            .addDomainKnowledge('Domain examples')
            .addMemoryFile('Memory content')
            .addUserMessage('Do task')
            .addAssistantMessage('Wait')
            .build();

        expect(messages).toHaveLength(5);
        expect(messages.map(m => m.type)).toEqual([
            'system_prompt',
            'domain_knowledge',
            'memory_file',
            'user_message',
            'assistant_message'
        ]);
    });
});
