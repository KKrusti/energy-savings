import { useMutation } from '@tanstack/react-query'
import { simulationApi } from '@/api/client'

export function useAnnualSimulation() {
  return useMutation({
    mutationFn: simulationApi.simulateAnnual,
  })
}
