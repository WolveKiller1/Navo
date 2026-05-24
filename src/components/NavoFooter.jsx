import React from 'react';
import { Link } from 'react-router-dom';

function NavoFooter() {
  const linkGroups = [
    {
      label: 'Practice',
      links: [
        { to: '/loop', label: 'Practice Loop' },
        { to: '/playground', label: 'Pattern Playground' },
        { to: '/room', label: 'The Room' },
        { to: '/map', label: 'Pattern Map' }
      ]
    },
    {
      label: 'Support',
      links: [
        { to: '/sessions', label: 'Sessions' },
        { to: '/account', label: 'Account' },
        { to: '/settings', label: 'Settings' }
      ]
    },
    {
      label: 'Navo',
      links: [
        { to: '/about', label: 'About' },
        { to: '/pricing', label: 'Pricing' },
        { to: '/access', label: 'Access' }
      ]
    }
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
          {linkGroups.map((group) => (
            <div key={group.label} className="navo-footer-group">
              <p className="navo-footer-group-label">{group.label}</p>
              {group.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="navo-container navo-footer-meta">
        <p>Preview build</p>
      </div>
    </footer>
  );
}

export default NavoFooter;
