import { useMutation } from '@tanstack/react-query'
import { simulationApi } from '@/api/client'

export function useSimulation() {
  return useMutation({
    mutationFn: simulationApi.simulate,
  })
}
