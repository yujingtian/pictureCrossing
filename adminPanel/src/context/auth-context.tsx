import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { User } from '@/types/auth'
import {
  getCurrentUser as fetchCurrentUser,
  login as doLogin,
  logout as doLogout,
  register as doRegister,
} from '@/services/auth'
import { getUser, clearAuth, setUser, setAccessToken, setRefreshToken } from '@/utils/storage'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        isAuthenticated: true,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      }
    default:
      return state
  }
}

interface AuthContextType extends AuthState {
  login: (login: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState, () => {
    const savedUser = getUser()
    if (savedUser) {
      return {
        ...initialState,
        user: savedUser,
        isAuthenticated: true,
      }
    }
    return initialState
  })

  const login = useCallback(async (login: string, password: string) => {
    dispatch({ type: 'LOGIN_START' })

    const response = await doLogin({ login, password })

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed')
    }

    const userResponse = await fetchCurrentUser()
    if (userResponse.success && userResponse.data) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: userResponse.data })
    }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const response = await doRegister({ username, email, password })

    if (!response.success) {
      throw new Error(response.message || 'Registration failed')
    }

    return await login(email, password)
  }, [login])

  const logout = useCallback(() => {
    doLogout()
    clearAuth()
    dispatch({ type: 'LOGOUT' })
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetchCurrentUser()
      if (response.success && response.data) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.data })
      }
    } catch (err) {
      logout()
    }
  }, [logout])

  const value = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider')
  }
  return context
}
