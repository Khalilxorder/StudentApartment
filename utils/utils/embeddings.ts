/**
 * Embeddings utility using Ollama for local semantic search
 * Supports Qwen, Llama, and Nomic Embed models
 */

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

/**
 * Generate embedding for a single text using Ollama
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    try {
      const embedding = await generateEmbedding(text);
      results.push({ embedding, text });
    } catch (error) {
      console.error(`Failed to generate embedding for: ${text.substring(0, 50)}...`, error);
      // Continue with other texts
    }
  }

  return results;
}

/**
 * Prepare apartment data for embedding
 * Combines title, description, and key features into searchable text
 */
export function prepareApartmentText(apartment: {
  title: string;
  description: string;
  address?: string;
  district?: number;
  bedrooms?: number;
  price_huf?: number;
  amenities?: string[];
}): string {
  const parts = [
    apartment.title,
    apartment.description,
  ];

  if (apartment.address) {
    parts.push(`Location: ${apartment.address}`);
  }

  if (apartment.district) {
    parts.push(`District ${apartment.district}`);
  }

  if (apartment.bedrooms) {
    parts.push(`${apartment.bedrooms} bedroom${apartment.bedrooms > 1 ? 's' : ''}`);
  }

  if (apartment.price_huf) {
    const priceRange = 
      apartment.price_huf < 100000 ? 'budget-friendly affordable cheap' :
      apartment.price_huf < 150000 ? 'moderate mid-range' :
      'premium luxury expensive';
    parts.push(priceRange);
  }

  if (apartment.amenities && apartment.amenities.length > 0) {
    parts.push(`Amenities: ${apartment.amenities.join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Check if Ollama is running and accessible
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Ollama health check failed:', error);
    return false;
  }
}

/**
 * Get list of available models in Ollama
 */
export async function listOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Used for comparing query embedding with apartment embeddings
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
