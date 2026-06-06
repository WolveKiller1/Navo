import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { initStorage } from '../services/storage'
import { getUserPreferences } from '../services/accountService'
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
            Navo is a small, calm room. You listen, you echo, you speak.
            No scores, no streaks, just the rhythm of real conversation.
          </p>

          <div className="entry-grid">
            <button onClick={handleLoopEntry} className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">Begin softly</span>
              <span className="entry-title">Practice Loop</span>
              <span className="entry-body">Hear a phrase. Say it back. Let it settle.</span>
              <span className="entry-enter">Enter →</span>
            </button>

            <button onClick={handlePlaygroundEntry} className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">Find variations</span>
              <span className="entry-title">Pattern Playground</span>
              <span className="entry-body">See how one phrase bends into many nearby paths.</span>
              <span className="entry-enter">Enter →</span>
            </button>

            <button onClick={handleRoomEntry} className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">Speak with someone</span>
              <span className="entry-title">The Room</span>
              <span className="entry-body">A calm voice on the other end. Just talk.</span>
              <span className="entry-enter">Enter →</span>
            </button>

            <Link to="/map" className="entry-card navo-card navo-hairline-top">
              <span className="entry-kicker">See the shape</span>
              <span className="entry-title">Pattern Map</span>
              <span className="entry-body">A quiet map of phrases and paths.</span>
              <span className="entry-enter">Enter →</span>
            </Link>
          </div>
        </section>
      </main>

      <NavoFooter />
    </div>
  )
}

export default LandingPage
