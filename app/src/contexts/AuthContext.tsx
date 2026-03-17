import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  profile: Profile | null
  isPro: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  pollUntilPro: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (u: User) => {
    console.log('[Auth] fetching profile for', u.id)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single()
    if (error) {
      console.error('[Auth] profile fetch error:', error.message, error.code)
      return null
    }
    console.log('[Auth] profile fetched:', data)
    return data as Profile
  }, [])

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION —
    // the session token is guaranteed to be set at this point
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] event:', event, '| user:', session?.user?.email ?? 'none')
      const u = session?.user ?? null
      setUser(u)
      setLoading(false)
      if (u) {
        // Defer profile fetch one tick so Supabase client has auth token committed
        setTimeout(async () => {
          const p = await fetchProfile(u)
          console.log('[Auth] profile:', p)
          setProfile(p)
        }, 0)
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // Realtime subscription: keep is_pro in sync if admin flips it in DB
  useEffect(() => {
    if (!user) return
    const sub = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, payload => {
        setProfile(payload.new as Profile)
      })
      .subscribe()
    return () => { void supabase.removeChannel(sub) }
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await fetchProfile(user)
    setProfile(p)
  }, [user, fetchProfile])

  const pollUntilPro = useCallback(async (maxAttempts = 10, intervalMs = 1500) => {
    if (!user) return
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, intervalMs))
      const p = await fetchProfile(user)
      setProfile(p)
      if (p?.is_pro) return
    }
  }, [user, fetchProfile])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/app'
  }

  const isPro = profile?.is_pro ?? false

  return (
    <AuthContext.Provider value={{ user, profile, isPro, loading, signIn, signUp, signOut, refreshProfile, pollUntilPro }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
