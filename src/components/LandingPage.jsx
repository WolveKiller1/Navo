import React, { useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PHRASE_PATTERNS_PT } from '../data/phrasePatterns'
import { generateAllPhrases } from '../services/phraseGenerator'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const howRef = useRef(null)
  const mapRef = useRef(null)
  const lowerRef = useRef(null)

  useEffect(() => {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('section-reveal')) {
          entry.target.classList.add('section-reveal')
        }
      })
    }, observerOptions)

    const sections = [heroRef.current, howRef.current, mapRef.current, lowerRef.current]
    sections.forEach(section => {
      if (section) observer.observe(section)
    })

    return () => {
      sections.forEach(section => {
        if (section) observer.unobserve(section)
      })
    }
  }, [])

  const handleLoopEntry = () => {
    navigate('/loop')
  }

  const handleRoomEntry = () => {
    sessionStorage.setItem('rylingo_access', 'granted')
    navigate('/room')
  }

  const handlePlaygroundEntry = () => {
    sessionStorage.setItem('rylingo_access', 'granted')
    
    // Use a generated pattern-backed phrase for Playground entry
    // Generate one phrase from the perder-transport pattern
    const perderTransportPattern = PHRASE_PATTERNS_PT.find(p => p.id === 'perder-transport')
    const allPhrases = generateAllPhrases([perderTransportPattern], 1)
    const defaultPhrase = allPhrases[0]
    
    // Navigate to the new guided pattern flow playground with pattern-backed seed
    navigate('/playground', {
      state: {
        guidedMode: true,
        seedSentence: defaultPhrase.text,
        seedMeaning: defaultPhrase.meaning,
        icon: defaultPhrase.icon,
        scene: defaultPhrase.scene,
        patternId: defaultPhrase.patternId,
        contextVariations: defaultPhrase.contextVariations
      }
    })
  }

  return (
    <div className="landing-page">
      {/* Header Navigation */}
      <header className="site-header">
        <div className="brand">Navo</div>
        <nav className="header-nav">
          <button onClick={handlePlaygroundEntry} className="nav-link nav-link-emphasized">Playground</button>
          <Link to="/what-rylingo-is" className="nav-link">What it is</Link>
          <button onClick={handleRoomEntry} className="nav-link">Room</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Learn a language by speaking.</h1>
          <p className="hero-subtitle">Navo responds and keeps the conversation moving.</p>
          
          <div className="hero-actions">
            <button onClick={handleLoopEntry} className="playground-button">
              <span className="playground-label">Practice Loop</span>
              <span className="playground-hint">Start here</span>
            </button>

            <button onClick={handleRoomEntry} className="room-button">
              <span className="room-label">The Room</span>
              <span className="room-hint">Conversation</span>
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howRef} className="how-section">
        <div className="how-content">
          <div className="how-step">
            <div className="step-number">1</div>
            <div className="step-text">Speak</div>
          </div>
          <div className="how-arrow">→</div>
          <div className="how-step">
            <div className="step-number">2</div>
            <div className="step-text">It responds</div>
          </div>
          <div className="how-arrow">→</div>
          <div className="how-step">
            <div className="step-number">3</div>
            <div className="step-text">You adapt naturally</div>
          </div>
        </div>
      </section>

      {/* Product Map */}
      <section ref={mapRef} className="product-map-section">
        <div className="product-map-content">
          <h2 className="section-title">Inside Navo</h2>
          <div className="map-grid">
            <Link to="/sessions" className="map-card">
              <span className="map-card-title">Sessions</span>
              <span className="map-card-descriptor">Past conversations</span>
            </Link>
            <Link to="/account" className="map-card">
              <span className="map-card-title">Account</span>
              <span className="map-card-descriptor">Your profile</span>
            </Link>
            <Link to="/pricing" className="map-card">
              <span className="map-card-title">Pricing</span>
              <span className="map-card-descriptor">Access to Navo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Lower Section */}
      <section ref={lowerRef} className="lower-section">
        <Link to="/what-rylingo-is" className="info-panel">
          <span className="info-label">What Navo is / isn't</span>
          <span className="info-hint">System overview</span>
        </Link>
      </section>
    </div>
  )
}

export default LandingPage
