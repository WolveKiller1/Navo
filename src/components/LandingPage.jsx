import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getUserPreferences, initStorage } from '../services/storage'
import NavoNav from './NavoNav'
import NavoFooter from './NavoFooter'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()

  const handleLoopEntry = () => {
    navigate('/loop')
  }

  const handleRoomEntry = () => {
    sessionStorage.setItem('rylingo_access', 'granted')
    navigate('/room')
  }

  const handlePlaygroundEntry = async () => {
    sessionStorage.setItem('rylingo_access', 'granted')

    await initStorage()
    const prefs = await getUserPreferences()
    const lang = prefs.activeLanguage || 'en'

    navigate('/playground', {
      state: {
        entryMode: true,
        language: lang
      }
    })
  }

  return (
    <div className="landing-page navo-shell">
      <NavoNav />

      <main className="hero-section navo-container">
        <section className="hero-content navo-reveal">
          <span className="navo-pill"><span className="navo-dot" /> Quiet language environment</span>
          <h1 className="hero-title">
            Step inside the
            <br />
            <span className="hero-emphasis">language</span>, not a lesson.
          </h1>
          <p className="hero-subtitle">
            Navo is a calm conversational space. Listen, imitate, and speak.
            No scores, no streaks, just repeated contact with real patterns.
          </p>

          <div className="entry-grid">
            <button onClick={handleLoopEntry} className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">Begin softly</span>
              <span className="entry-title">Practice Loop</span>
              <span className="entry-body">Hear a phrase. Say it back. Let it settle.</span>
            </button>

            <button onClick={handlePlaygroundEntry} className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">Find variations</span>
              <span className="entry-title">Pattern Playground</span>
              <span className="entry-body">See how one phrase bends into nearby shapes.</span>
            </button>

            <button onClick={handleRoomEntry} className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">Speak freely</span>
              <span className="entry-title">The Room</span>
              <span className="entry-body">A real exchange, short and conversational.</span>
            </button>

            <Link to="/map" className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">See the shape</span>
              <span className="entry-title">Pattern Map</span>
              <span className="entry-body">A quiet map of phrases and paths.</span>
            </Link>
          </div>
        </section>
      </main>

      <NavoFooter />
    </div>
  )
}

export default LandingPage
