import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SessionProvider } from './context/SessionContext.jsx'
import App from './App.jsx'
import PublicWorkoutView from './views/PublicWorkoutView.jsx'
import './index.css'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isPublicView = path.toLowerCase() === '/training'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPublicView ? (
      <PublicWorkoutView />
    ) : (
      <SessionProvider>
        <App />
      </SessionProvider>
    )}
  </StrictMode>,
)
