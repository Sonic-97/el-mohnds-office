import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface ClientModeValue {
  active: boolean
  enter: () => void
  exit: () => void
  toggle: () => void
}

const ClientModeContext = createContext<ClientModeValue | null>(null)

export function ClientModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const value = useMemo<ClientModeValue>(() => ({
    active,
    enter: () => setActive(true),
    exit: () => setActive(false),
    toggle: () => setActive((current) => !current)
  }), [active])
  return <ClientModeContext.Provider value={value}>{children}</ClientModeContext.Provider>
}

export function useClientMode(): ClientModeValue {
  const value = useContext(ClientModeContext)
  if (!value) throw new Error('useClientMode must be used inside ClientModeProvider')
  return value
}

