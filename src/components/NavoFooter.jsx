import React from 'react';
import { Link } from 'react-router-dom';

function NavoFooter() {
  const links = [
    { to: '/loop', label: 'Practice Loop' },
    { to: '/playground', label: 'Playground' },
    { to: '/room', label: 'The Room' },
    { to: '/about', label: 'About' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/access', label: 'Access' },
    { to: '/sessions', label: 'Sessions' },
    { to: '/account', label: 'Account' }
  ];

  return (
    <footer className="navo-footer">
      <div className="navo-container navo-footer-inner">
        <div className="navo-footer-brand">
          <span className="navo-dot" />
          <span className="brand-text">Navo</span>
          <p>A quiet conversational language environment.</p>
        </div>
        <div className="navo-footer-links">
          {links.map(link => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default NavoFooter;
