import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/context/auth-context'
import { ProtectedRoute } from '@/routes/protected-route'
import App from '@/App'
import LoginPage from '@/pages/login'
import RegisterPage from '@/pages/register'
import ForgotPasswordPage from '@/pages/forgot-password'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
  },
])

export function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
