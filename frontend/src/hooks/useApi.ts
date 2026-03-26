import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';

import api from '../lib/api';

export function useApiQuery<TData>(
  queryKey: readonly unknown[],
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      const response = await api.get<TData>(url, { params });
      return response.data;
    },
    ...options,
  });
}

export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
  });
}
