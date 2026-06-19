import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouter } from './routes'
import { Toaster } from '@/components/ui/toaster'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
    <Toaster />
  </StrictMode>,
)
