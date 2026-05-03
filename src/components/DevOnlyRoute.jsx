import React from 'react'
import { Navigate } from 'react-router-dom'

/**
 * DevOnlyRoute Component
 * 
 * Renders children only in development mode (import.meta.env.DEV).
 * In production, redirects to the home page.
 * 
 * Usage:
 *   <Route 
 *     path="/playground-lab" 
 *     element={
 *       <DevOnlyRoute>
 *         <PlaygroundLabScreen />
 *       </DevOnlyRoute>
 *     } 
 *   />
 */
function DevOnlyRoute({ children }) {
  // In production (import.meta.env.DEV is false), redirect to home
  if (!import.meta.env.DEV) {
    return <Navigate to="/" replace />
  }
  
  // In development, render the children
  return children
}

export default DevOnlyRoute
