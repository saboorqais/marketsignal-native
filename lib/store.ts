import { create } from 'zustand'
import { Alert, Profile } from '@/types'

interface AppState {
  alerts: Alert[]
  profile: Profile | null
  setAlerts: (alerts: Alert[]) => void
  setProfile: (profile: Profile | null) => void
  addAlert: (alert: Alert) => void
  updateAlert: (id: string, updates: Partial<Alert>) => void
  removeAlert: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  alerts: [],
  profile: null,
  
  setAlerts: (alerts) => set({ alerts }),
  
  setProfile: (profile) => set({ profile }),
  
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts]
  })),
  
  updateAlert: (id, updates) => set((state) => ({
    alerts: state.alerts.map(alert => 
      alert.id === id ? { ...alert, ...updates } : alert
    )
  })),
  
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter(alert => alert.id !== id)
  }))
}))

