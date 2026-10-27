import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

export interface LicenseStatus {
  isRegistered: boolean
  isLocked: boolean
  lockReason: 'NOT_REGISTERED' | 'TRIAL_EXPIRED' | 'PENDING' | 'CLOCK_TAMPERED' | null
  daysRemaining: number
  paymentStatus: 'Trial' | 'Pending' | 'Paid'
  registration: {
    fullName: string
    businessName: string
    contactNo: string
    registeredAt: string
    trialEndsAt: string
    paidUntil: string | null
    currentPrice: number
    notes: string | null
  } | null
  machineId: string
}

interface SubscriptionContextType {
  license: LicenseStatus | null
  isLoading: boolean
  isSyncing: boolean
  refreshLicense: () => Promise<LicenseStatus | null>
  syncWithServer: () => Promise<LicenseStatus | null>
  registerUser: (data: { fullName: string; businessName: string; contactNo: string }) => Promise<boolean>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [license, setLicense] = useState<LicenseStatus | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  const refreshLicense = useCallback(async (): Promise<LicenseStatus | null> => {
    // @ts-ignore
    const ipc = window.electron?.ipcRenderer
    if (!ipc) {
      setIsLoading(false)
      return null
    }

    try {
      const status: LicenseStatus = await ipc.invoke('get-license-status')
      setLicense(status)
      setIsLoading(false)
      return status
    } catch (err) {
      console.error('Failed to get license status:', err)
      setIsLoading(false)
      return null
    }
  }, [])

  const syncWithServer = useCallback(async (): Promise<LicenseStatus | null> => {
    // @ts-ignore
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return null

    setIsSyncing(true)
    try {
      const updatedStatus: LicenseStatus = await ipc.invoke('sync-subscription-status')
      if (updatedStatus) {
        setLicense(updatedStatus)
      }
      return updatedStatus
    } catch (err) {
      console.error('Failed to sync subscription with server:', err)
      return null
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const registerUser = useCallback(
    async (data: { fullName: string; businessName: string; contactNo: string }): Promise<boolean> => {
      // @ts-ignore
      const ipc = window.electron?.ipcRenderer
      if (!ipc) return false

      try {
        const newStatus: LicenseStatus = await ipc.invoke('register-app-user', data)
        setLicense(newStatus)
        return true
      } catch (err) {
        console.error('Failed to register user:', err)
        return false
      }
    },
    []
  )

  useEffect(() => {
    // 1. Instant local read so UI does not block
    refreshLicense()

    // 2. Immediate background sync with remote n8n & PostgreSQL
    syncWithServer()

    // 3. Actively poll local database integrity every 3 seconds to catch manual tampering instantly
    const localInterval = setInterval(() => {
      refreshLicense()
    }, 3 * 1000)

    // 4. Poll server periodically every 20 seconds so remote PostgreSQL updates reflect live
    const remoteInterval = setInterval(() => {
      syncWithServer()
    }, 20 * 1000)

    return () => {
      clearInterval(localInterval)
      clearInterval(remoteInterval)
    }
  }, [refreshLicense, syncWithServer])

  return (
    <SubscriptionContext.Provider
      value={{
        license,
        isLoading,
        isSyncing,
        refreshLicense,
        syncWithServer,
        registerUser
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
