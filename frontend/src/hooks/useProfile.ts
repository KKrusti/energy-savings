import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/api/client'
import type { UserProfile } from '@/types'

const PROFILE_KEY = ['profile'] as const

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: PROFILE_KEY,
    queryFn: profileApi.get,
    staleTime: 5 * 60 * 1000, // 5 min — profile changes rarely
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Pick<UserProfile, 'has_solar_panels'>>) =>
      profileApi.update(data),
    onSuccess: (_data, variables) => {
      // Optimistically update the cached profile
      queryClient.setQueryData<UserProfile>(PROFILE_KEY, (old) =>
        old ? { ...old, ...variables } : old,
      )
    },
  })
}
