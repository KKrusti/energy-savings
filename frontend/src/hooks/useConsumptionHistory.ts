import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consumptionApi } from '@/api/client'
import type { ConsumptionHistoryResponse } from '@/types'

const QUERY_KEY = ['consumptionHistory'] as const

export function useConsumptionHistory() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: consumptionApi.getHistory,
  })
}

export function useSaveConsumptionHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ConsumptionHistoryResponse) => consumptionApi.saveHistory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
