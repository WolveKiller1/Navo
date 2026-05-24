import React from 'react';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/SubPageLayout.css';

function SubPageLayout({ title, headline, subtitle, children }) {
  const displayHeadline = headline || title;

  return (
    <div className="subpage-container navo-shell">
      <NavoNav compact />

      <main className="subpage-content navo-container">
        <header className="subpage-header navo-reveal">
          <span className="navo-pill"><span className="navo-dot" /> {title}</span>
          <h1 className="subpage-title">{displayHeadline}</h1>
          {subtitle && <p className="subpage-subtitle">{subtitle}</p>}
        </header>

        <div className="subpage-body">
          {children}
        </div>
      </main>

      <NavoFooter />
    </div>
  );
}

export default SubPageLayout;
