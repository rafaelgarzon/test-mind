// ─── Agentes ────────────────────────────────────────────────────────────────

export type AgentStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface AgentEvent {
  agent: string;
  status: string;
  finished?: boolean;
  isDuplicate?: boolean;
  error?: string;
  result?: unknown;
}

export const AGENT_ORDER = [
  'RequirementsAgent',
  'DuplicatePreventionAgent',
  'BusinessAlignmentAgent',
  'CodeGeneratorAgent',
  'ValidationAgent',
  'ReviewImplementerAgent',
  'ScenarioPreviewRunner',
] as const;

export type AgentName = (typeof AGENT_ORDER)[number];

export interface AgentState {
  name: AgentName | string;
  status: AgentStatus;
  lastMessage: string;
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelineState {
  agents: AgentState[];
  isRunning: boolean;
  isDone: boolean;
  isDuplicate: boolean;
  gherkin: string;
  featureName: string;
  tsCode: string;
  previewResult: PreviewResult | null;
  error: string | null;
}

// ─── Quality ─────────────────────────────────────────────────────────────────

export interface QualityReport {
  score: number;
  passed: boolean;
  issues: string[];
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export interface StepPreviewResult {
  status: 'passed' | 'failed' | 'skipped';
  stepText: string;
  keyword: string;
  durationMs: number;
  screenshotBase64: string | null;
  error?: string;
}

export interface PreviewResult {
  steps: StepPreviewResult[];
  passed: boolean;
  totalDurationMs: number;
  browserUsed: string;
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface GenerateResponse {
  success: boolean;
  gherkin?: string;
  quality?: QualityReport;
  error?: string;
}

export interface GenerateStepsResponse {
  success: boolean;
  steps?: string;
  error?: string;
}

export interface PreviewResponse {
  success: boolean;
  preview?: PreviewResult;
  error?: string;
  details?: string;
}

export interface ImplementResponse {
  success: boolean;
  featurePath?: string;
  stepsPath?: string;
  error?: string;
}

export interface StatusResponse {
  status: 'online' | 'offline' | 'error';
  error?: string;
}
