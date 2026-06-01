/**
 * TanStack Query hooks for all API operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiService from '../services/api'
import type {
  DatabaseConnectionCreate,
  SavedQueryCreate,
} from '../types'

// ─── Database Connections ───────────────────────────────────────

export function useDatabases() {
  return useQuery({
    queryKey: ['databases'],
    queryFn: () => apiService.getDatabases(),
  })
}

export function useDatabase(id: string | null) {
  return useQuery({
    queryKey: ['databases', id],
    queryFn: () => apiService.getDatabase(id!),
    enabled: !!id,
  })
}

export function useAddDatabase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DatabaseConnectionCreate) => apiService.createDatabase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] })
    },
  })
}

export function useUpdateDatabase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DatabaseConnectionCreate> }) =>
      apiService.updateDatabase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] })
    },
  })
}

export function useDeleteDatabase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiService.deleteDatabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] })
    },
  })
}

export function useTestDatabase() {
  return useMutation({
    mutationFn: (id: string) => apiService.testDatabase(id),
  })
}

export function useSchema(id: string | null) {
  return useQuery({
    queryKey: ['schema', id],
    queryFn: () => apiService.getSchema(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Query Execution ────────────────────────────────────────────

export function useExecuteQuery() {
  return useMutation({
    mutationFn: apiService.executeQuery.bind(apiService),
  })
}

// ─── Query History ──────────────────────────────────────────────

export function useQueryHistory(databaseId?: string | null) {
  return useQuery({
    queryKey: ['history', databaseId],
    queryFn: () => apiService.getHistory({
      database_id: databaseId || undefined,
      limit: 100,
    }),
  })
}

export function useSearchHistory() {
  return useMutation({
    mutationFn: ({ q, databaseId }: { q: string; databaseId?: string }) =>
      apiService.searchHistory(q, databaseId),
  })
}

export function useClearHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (databaseId?: string) => apiService.clearHistory(databaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
}

// ─── Saved Queries ──────────────────────────────────────────────

export function useSavedQueries(category?: string, tag?: string) {
  return useQuery({
    queryKey: ['saved-queries', category, tag],
    queryFn: () => apiService.getSavedQueries({ category, tag }),
  })
}

export function useCreateSavedQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SavedQueryCreate) => apiService.createSavedQuery(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] })
    },
  })
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiService.deleteSavedQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] })
    },
  })
}

// ─── App Config ─────────────────────────────────────────────────

export function useAppConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => apiService.getConfig(),
    staleTime: 30 * 60 * 1000,
  })
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiService.getHealth(),
    refetchInterval: 60_000,
  })
}
