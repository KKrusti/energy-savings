import { useMutation, useQueryClient } from '@tanstack/react-query'
import { simulationApi } from '@/api/client'
import type { AnnualSimulationResponse } from '@/types'

/** Cache key used to share the last annual simulation result across pages. */
export const ANNUAL_SIMULATION_QUERY_KEY = ['annualSimulation'] as const

export function useAnnualSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: simulationApi.simulateAnnual,
    onSuccess: (data: AnnualSimulationResponse) => {
      qc.setQueryData(ANNUAL_SIMULATION_QUERY_KEY, data)
    },
  })
}
