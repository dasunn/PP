import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import LoginScreen from './LoginScreen'

const AUTH_KEY = 'preprod-auth-v1'

/**
 * Placeholder credentials, checked in the browser.
 *
 * This is a gate, not security: the values below are compiled into the shipped
 * JavaScript bundle and can be read by anyone who opens dev tools. It keeps a
 * casual visitor out of the dashboard and nothing more. Replace it with a real
 * identity provider once the data moves off `localStorage`.
 */
const USERNAME = 'Brandix_admin'
// The 11th character is a literal backslash, so it is escaped as `\\` here.
// Written as a single `\`, JavaScript would silently drop it and the real
// password would never match.
const PASSWORD = 'Dh^Nu3h_Nu\\^/an_96'

interface AuthValue {
  signOut: () => void
}

const AuthContext = createContext<AuthValue>({ signOut: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === 'yes')

  const signIn = useCallback((user: string, pass: string) => {
    // Only the username is trimmed — spaces inside a password are significant.
    const ok = user.trim() === USERNAME && pass === PASSWORD
    if (ok) {
      localStorage.setItem(AUTH_KEY, 'yes')
      setAuthed(true)
    }
    return ok
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setAuthed(false)
  }, [])

  if (!authed) return <LoginScreen onSubmit={signIn} />

  return <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  return useContext(AuthContext)
}
