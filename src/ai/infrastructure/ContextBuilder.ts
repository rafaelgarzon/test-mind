import { Message, MessageRole } from './AIProvider';

/**
 * ContextBuilder assembles the "Context Window" for the AI Agent
 * according to the Context Engineering diagram.
 * It separates instructions, domain knowledge, and memory
 * into distinct semantic chunks.
 */
export class ContextBuilder {
    private messages: Message[] = [];

    /** Adds the primary configuration and rules. */
    addSystemPrompt(content: string): this {
        this.messages.push({ role: 'system', content, type: 'system_prompt' });
        return this;
    }

    /** Adds structured static examples or formatting guidelines. */
    addDomainKnowledge(content: string): this {
        // We append domain knowledge to the system instructions logically,
        // or keep them as separate system messages depending on the LLM capability.
        this.messages.push({ role: 'system', content, type: 'domain_knowledge' });
        return this;
    }

    /** Adds historical context or retrieved RAG context (similar scenarios). */
    addMemoryFile(content: string): this {
        this.messages.push({ role: 'user', content: `[MEMORY FILE (Similar Previous Context)]\n${content}`, type: 'memory_file' });
        return this;
    }

    /** Adds the actual user task to be executed. */
    addUserMessage(content: string): this {
        this.messages.push({ role: 'user', content, type: 'user_message' });
        return this;
    }

    /** Adds an assistant response to simulate a few-shot conversation flow. */
    addAssistantMessage(content: string): this {
        this.messages.push({ role: 'assistant', content, type: 'assistant_message' });
        return this;
    }

    /** Returns the assembled context window. */
    build(): Message[] {
        return this.messages;
    }
}
