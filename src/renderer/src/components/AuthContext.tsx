import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthStatus } from '@shared/types'
import { InactivityLockTimer } from '../lib/inactivity'

type AuthScreen = 'loading' | 'setup' | 'login' | 'locked' | 'authenticated'

interface AuthValue {
  screen: AuthScreen
  officeMounted: boolean
  username: string
  setup: (username: string, password: string) => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  lock: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)
export const AUTO_LOCK_SETTINGS_EVENT = 'almohands:auto-lock-settings-changed'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [screen, setScreen] = useState<AuthScreen>('loading')
  const [officeMounted, setOfficeMounted] = useState(false)
  const [autoLockMinutes, setAutoLockMinutes] = useState(15)

  useEffect(() => {
    window.api.auth.status().then((next) => {
      setStatus(next)
      setOfficeMounted(next.authenticated)
      setScreen(next.authenticated ? 'authenticated' : next.hasAccount ? 'login' : 'setup')
    })
  }, [])

  const loadAutoLock = useCallback(() => {
    window.api.settings.getAll().then((settings) => {
      const value = Number(settings.autoLockMinutes ?? '15')
      setAutoLockMinutes(Number.isFinite(value) && value >= 0 ? value : 15)
    })
  }, [])

  useEffect(() => {
    if (screen === 'authenticated') loadAutoLock()
    window.addEventListener(AUTO_LOCK_SETTINGS_EVENT, loadAutoLock)
    return () => window.removeEventListener(AUTO_LOCK_SETTINGS_EVENT, loadAutoLock)
  }, [screen, loadAutoLock])

  const lock = useCallback(async () => {
    await window.api.auth.lock()
    setScreen('locked')
  }, [])

  useEffect(() => {
    if (screen !== 'authenticated' || autoLockMinutes === 0) return
    const inactivity = new InactivityLockTimer(autoLockMinutes * 60_000, () => void lock())
    const reset = (): void => inactivity.activity()
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'mousemove', 'keydown', 'touchstart']
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    reset()
    return () => {
      inactivity.stop()
      events.forEach((event) => window.removeEventListener(event, reset))
    }
  }, [screen, autoLockMinutes, lock])

  const value = useMemo<AuthValue>(() => ({
    screen,
    officeMounted,
    username: status?.username ?? '',
    setup: async (username, password) => {
      const result = await window.api.auth.setup(username, password)
      setStatus({ hasAccount: true, authenticated: true, username: result.username })
      setOfficeMounted(true)
      setScreen('authenticated')
    },
    login: async (username, password) => {
      const result = await window.api.auth.login(username, password)
      if (!result.success) return false
      setStatus({ hasAccount: true, authenticated: true, username: result.username ?? username })
      setOfficeMounted(true)
      setScreen('authenticated')
      return true
    },
    lock,
    logout: async () => {
      await window.api.auth.logout()
      setOfficeMounted(false)
      setScreen('login')
    }
  }), [screen, officeMounted, status, lock])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
