/**
 * Interfaces base para la Arquitectura RAG Multi-Agente
 */

export interface AgentRequest {
    [key: string]: any;
}

export interface AgentResponse {
    success: boolean;
    error?: string;
}

export interface Agent<TRequest extends AgentRequest, TResponse extends AgentResponse> {
    readonly name: string;
    run(request: TRequest): Promise<TResponse>;
}
