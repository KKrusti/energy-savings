import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { offersApi } from '@/api/client'
import type { UpdateOfferInput } from '@/types'

const OFFERS_KEY = ['offers']
const PUBLIC_OFFERS_KEY = ['offers', 'public']

export function useOffers() {
  return useQuery({
    queryKey: OFFERS_KEY,
    queryFn: offersApi.list,
  })
}

export function useCreateOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: offersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: OFFERS_KEY }),
  })
}

export function useUpdateOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOfferInput }) =>
      offersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: OFFERS_KEY }),
  })
}

export function useDeleteOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: offersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: OFFERS_KEY }),
  })
}

export function usePublicOffers() {
  return useQuery({
    queryKey: PUBLIC_OFFERS_KEY,
    queryFn: offersApi.listPublic,
    enabled: false, // only fetched on demand when the modal opens
  })
}

export function useImportOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: offersApi.import,
    onSuccess: () => qc.invalidateQueries({ queryKey: OFFERS_KEY }),
  })
}
