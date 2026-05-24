import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaUser } from 'react-icons/fa';

function NavoNav({ showEnterRoom = true, compact = false }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const grantRoomAccess = () => {
    sessionStorage.setItem('rylingo_access', 'granted');
  };

  const links = [
    { to: '/about', label: 'About' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/access', label: 'Access' }
  ];

  const isActive = (to) => location.pathname === to;

  return (
    <header className={`navo-topbar navo-container ${compact ? 'compact' : ''}`}>
      <Link to="/" className="brand brand-link">
        <span className="navo-dot" />
        <span className="brand-text">Navo</span>
      </Link>

      <nav className="header-nav desktop">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
        {showEnterRoom && (
          <Link to="/room" className="room-entry-chip" onClick={grantRoomAccess}>
            Enter Navo
          </Link>
        )}
        <Link to="/account" className="account-chip" aria-label="Account">
          <FaUser />
        </Link>
      </nav>

      <button
        className="nav-mobile-toggle"
        aria-label="Toggle menu"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <FaTimes /> : <FaBars />}
      </button>

      {open && (
        <div className="mobile-nav-wrap">
          <nav className="mobile-nav navo-card navo-hairline-top">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`mobile-nav-link ${isActive(link.to) ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {showEnterRoom && (
              <Link
                to="/room"
                className="mobile-nav-link room"
                onClick={() => {
                  grantRoomAccess();
                  setOpen(false);
                }}
              >
                Enter Navo
              </Link>
            )}
            <Link to="/account" className="mobile-nav-link" onClick={() => setOpen(false)}>
              Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export default NavoNav;
