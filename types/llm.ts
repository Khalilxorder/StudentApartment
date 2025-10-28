// FILE: types/llm.ts

export interface LLMResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
  latency?: number;
}

export interface QueryUnderstandingResponse extends LLMResponse {
  data?: {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    structuredQuery: any;
  };
}

export interface MatchExplanationResponse extends LLMResponse {
  data?: {
    summary: string;
    pros: string[];
    cons: string[];
    score: number;
  };
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}
