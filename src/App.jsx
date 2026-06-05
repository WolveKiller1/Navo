import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getUserPreferences, initStorage } from './services/storage'
import { initAccountSystem } from './services/accountSync'
import LandingPage from './components/LandingPage'
import CallScreen from './components/CallScreen'
import PlaygroundScreen from './components/PlaygroundScreen'
import PlaygroundLabScreen from './components/PlaygroundLabScreen'
import DevOnlyRoute from './components/DevOnlyRoute'
import ImitationLoop from './components/ImitationLoop'
import WhatRylingoIsPage from './components/WhatRylingoIsPage'
import SessionsPage from './components/SessionsPage'
import AccountPage from './components/AccountPage'
import SettingsPage from './components/SettingsPage'
import AccessPage from './components/AccessPage'
import AboutPage from './components/AboutPage'
import PatternMapPage from './components/PatternMapPage'

function ProtectedRoute({ children }) {
  const hasAccess = sessionStorage.getItem('rylingo_access') === 'granted'
  
  if (!hasAccess) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function App() {
  useEffect(() => {
    const initializeApp = async () => {
      await initStorage();
      await initAccountSystem();
      const preferences = await getUserPreferences();
      const theme = preferences.theme || 'dark';
      if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      }
    };
    initializeApp();
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/what-rylingo-is" element={<WhatRylingoIsPage />} />
          <Route path="/loop" element={<ImitationLoop />} />
          <Route 
            path="/room"
            element={
              <ProtectedRoute>
                <CallScreen />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/playground" 
            element={
              <ProtectedRoute>
                <PlaygroundScreen />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/playground-lab"
            element={
              <ProtectedRoute>
                <DevOnlyRoute>
                  <PlaygroundLabScreen />
                </DevOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pricing" element={<AccessPage />} />
          <Route path="/access" element={<AccessPage />} />
          <Route path="/map" element={<PatternMapPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
