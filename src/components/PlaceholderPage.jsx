import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/PlaceholderPage.css'

function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">
      <Link to="/" className="back-link">← Back to home</Link>
      <div className="placeholder-content">
        <h1 className="placeholder-title">{title}</h1>
        <p className="placeholder-description">{description}</p>
      </div>
    </div>
  )
}

export default PlaceholderPage
