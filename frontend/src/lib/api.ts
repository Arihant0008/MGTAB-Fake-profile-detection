/**
 * API client for the MGTAB Detector backend.
 */

const API_BASE = '/api/v1';

interface PredictionRequest {
  features: Record<string, number | boolean>;
  tweets?: string[];
}

export interface FeatureContribution {
  featureName: string;
  displayName: string;
  importance: number;
  direction: 'bot' | 'human';
}

export interface PredictionResponse {
  id: string;
  label: 'bot' | 'human';
  confidence: number;
  botProbability: number;
  humanProbability: number;
  topFeatures: FeatureContribution[];
  modelVersion: string;
  usedTweetEmbedding: boolean;
  timestamp: string;
  latencyMs: number;
}

export interface HistoryEntry {
  id: string;
  request: PredictionRequest;
  response: {
    label: 'bot' | 'human';
    confidence: number;
    botProbability: number;
    humanProbability: number;
    topFeatures: FeatureContribution[];
    modelVersion: string;
    usedTweetEmbedding: boolean;
    latencyMs: number;
  };
  createdAt: string;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ModelInfo {
  name: string;
  version: string;
  type: string;
  featureCount: number;
  architecture: string;
  description: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  /** Submit a prediction request. */
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const response = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<PredictionResponse>(response);
  },

  /** Get prediction history. */
  async getHistory(page = 1, pageSize = 20): Promise<HistoryResponse> {
    const response = await fetch(
      `${API_BASE}/history?page=${page}&pageSize=${pageSize}`
    );
    return handleResponse<HistoryResponse>(response);
  },

  /** Get model information. */
  async getModelInfo(): Promise<ModelInfo> {
    const response = await fetch(`${API_BASE}/model/info`);
    return handleResponse<ModelInfo>(response);
  },

  /** Health check. */
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE}/model/health`);
    return handleResponse<{ status: string }>(response);
  },
};
