import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isLoggedIn: boolean
  user: string | null
  login: (username: string) => void
  logout: () => void
  showLoginModal: boolean
  setShowLoginModal: (show: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginTime, setLoginTime] = useState<number | null>(null)

  // Strict 5-minute timeout logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (isLoggedIn && loginTime) {
      const timeElapsed = Date.now() - loginTime
      const timeLeft = 5 * 60 * 1000 - timeElapsed // 5 minutes in ms
      
      if (timeLeft <= 0) {
        logout()
      } else {
        timeoutId = setTimeout(() => {
          logout()
        }, timeLeft)
      }
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isLoggedIn, loginTime])

  const login = (username: string) => {
    setIsLoggedIn(true)
    setUser(username)
    setLoginTime(Date.now())
    setShowLoginModal(false)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUser(null)
    setLoginTime(null)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, showLoginModal, setShowLoginModal }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
