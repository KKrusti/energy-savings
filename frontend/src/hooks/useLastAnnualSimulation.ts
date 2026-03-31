import { useQuery } from '@tanstack/react-query'
import { ANNUAL_SIMULATION_QUERY_KEY } from './useAnnualSimulation'
import type { AnnualSimulationResponse } from '@/types'

/**
 * Reads the last annual simulation result from the TanStack Query cache.
 * Does not trigger a network request — data is only available after the user
 * has run "Calcular año completo" at least once in the current session.
 */
export function useLastAnnualSimulation() {
  return useQuery<AnnualSimulationResponse | null>({
    queryKey: ANNUAL_SIMULATION_QUERY_KEY,
    // Never fetches from the network; data is written by useAnnualSimulation's onSuccess.
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
  })
}
