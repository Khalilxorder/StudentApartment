// FILE: lib/llm/client.ts

/**
 * LLM Client for Ollama
 * Handles communication with locally running Ollama server
 */

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string = process.env.OLLAMA_API_URL || 'http://localhost:11434',
    model: string = 'llama3.2:1b'
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Generate text completion from Ollama
   */
  async generate(prompt: string, options?: OllamaRequest['options']): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            top_p: options?.top_p ?? 0.9,
            max_tokens: options?.max_tokens ?? 512,
          },
        } as OllamaRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  /**
   * Generate JSON-structured output
   */
  async generateJSON<T>(prompt: string, options?: OllamaRequest['options']): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No explanation or additional text.`;
    const response = await this.generate(jsonPrompt, { ...options, temperature: 0.3 });

    // Extract JSON from response (handles cases where model adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      console.error('JSON parse error:', error);
      console.error('Raw response:', response);
      throw new Error('Invalid JSON in LLM response');
    }
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models.map((m: any) => m.name);
    } catch {
      return [];
    }
  }
}

// Singleton instance
export const ollamaClient = new OllamaClient();
