import React from 'react';
import { Link } from 'react-router-dom';
import NavoNav from './NavoNav';
import NavoFooter from './NavoFooter';
import '../styles/SubPageLayout.css';

function SubPageLayout({ title, subtitle, children }) {
  return (
    <div className="subpage-container navo-shell">
      <NavoNav compact />

      <main className="subpage-content navo-container">
        <header className="subpage-header navo-reveal">
          <span className="navo-pill"><span className="navo-dot" /> {title}</span>
          <h1 className="subpage-title">{title}</h1>
          {subtitle && <p className="subpage-subtitle">{subtitle}</p>}
        </header>

        <div className="subpage-body">
          {children}
        </div>

        <div className="subpage-home-link-wrap">
          <Link to="/" className="subpage-home-link">Back to home</Link>
        </div>
      </main>

      <NavoFooter />
    </div>
  );
}

export default SubPageLayout;
