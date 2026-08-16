import { useQuery } from '@tanstack/react-query'
import client from './client'

export const useBackendHealth = () => {
  const { isError, isFetched } = useQuery({
    queryKey: ['__health'],
    queryFn: () => client.get('/health', { timeout: 5000 }).then(r => r.data),
    retry: 1,
    retryDelay: 2000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  })

  return { isOffline: isFetched && isError }
}
