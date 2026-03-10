export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
    role: MessageRole;
    content: string;
    /** Metadata tagging for observability (e.g. 'domain_knowledge', 'memory_file') */
    type?: string;
}

export interface AIProvider {
    /** Generates a completion based on a structured context window. */
    generateChat(messages: Message[]): Promise<string>;
    /** Legacy generation (deprecated) */
    generate(systemPrompt: string, userPrompt: string): Promise<string>;
}
