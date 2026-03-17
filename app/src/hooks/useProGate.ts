import { useAuth } from '../contexts/AuthContext'

export function useProGate() {
  const { profile } = useAuth()
  const isPro = profile?.is_pro ?? false
  return { isPro, isFree: !isPro }
}
