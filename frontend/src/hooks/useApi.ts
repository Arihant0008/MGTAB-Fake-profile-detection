/**
 * TanStack Query hooks for API interactions.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type PredictionResponse, type HistoryResponse } from '../lib/api';

/** Hook for submitting a prediction. */
export function usePredict() {
  return useMutation({
    mutationFn: (data: {
      features: Record<string, number | boolean>;
      tweets?: string[];
    }) => api.predict(data),
    mutationKey: ['predict'],
  });
}

/** Hook for fetching prediction history. */
export function useHistory(page = 1, pageSize = 20) {
  return useQuery<HistoryResponse>({
    queryKey: ['history', page, pageSize],
    queryFn: () => api.getHistory(page, pageSize),
    refetchOnWindowFocus: false,
  });
}

/** Hook for fetching model info. */
export function useModelInfo() {
  return useQuery({
    queryKey: ['model-info'],
    queryFn: () => api.getModelInfo(),
    staleTime: Infinity,
  });
}

export type { PredictionResponse };
