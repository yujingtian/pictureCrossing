import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/auth-context'
import { AdminRoute } from '@/routes/admin-route'
import LoginPage from '@/pages/login'
import RegisterPage from '@/pages/register'
import ForgotPasswordPage from '@/pages/forgot-password'
import { AdminLayout } from '@/components/admin/layout'
import { AdminDashboard } from '@/pages/admin/dashboard'
import { AdminUsers } from '@/pages/admin/users'
import { AdminRecommendations } from '@/pages/admin/recommendations'

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
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'users',
        element: <AdminUsers />,
      },
      {
        path: 'recommendations',
        element: <AdminRecommendations />,
      },
    ],
  },
  {
    path: '/admin',
    element: <Navigate to="/" replace />,
  },
])

export function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
