import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function PublicRoute() {
  const { session } = useAuth()
  
  if (session) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <Outlet />
}
