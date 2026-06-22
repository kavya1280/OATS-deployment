import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"

// Styles
import "bootstrap/dist/css/bootstrap.min.css" 
import "./index.css"
import "./styles/dashboard.css"

// Pages
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Auditordashboard from './pages/Auditordashboard.jsx'
import Action from './pages/Action.jsx' 
import AuditorAction from './pages/AuditorAction.jsx'
import Aibox from './pages/Aibox.jsx'
import AnalyticsReport from './pages/AnalyticsReport.jsx'


const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" />, 
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/auditordashboard", 
    element: <Auditordashboard />,
  },
  {
    path: "/action/:insightId", 
    element: <Action />,
  },
  {
    path: "/auditor_action/:insightId",
    element: <AuditorAction />,
  },
  {
    path: "/aibox/:insightId",
    element: <Aibox />,
  },
  {
    path: "/report",
    element: <AnalyticsReport />
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)