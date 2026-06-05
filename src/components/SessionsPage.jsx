import React from 'react';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import SessionHistoryContent from './SessionHistoryContent';
import '../styles/SubPageLayout.css';

function SessionsPage() {
  return (
    <div className="navo-shell">
      <NavoNav compact />
      <main className="subpage-content navo-container navo-container--normal">
        <header className="subpage-header navo-reveal">
          <span className="navo-pill"><span className="navo-dot" /> Local rooms</span>
          <h1 className="subpage-title">Rooms you've been in.</h1>
          <p className="subpage-subtitle">Stored on this device. Re-enter a room or export conversation data locally.</p>
        </header>
        <SessionHistoryContent />
      </main>
      <NavoFooter />
    </div>
  );
}

export default SessionsPage;
