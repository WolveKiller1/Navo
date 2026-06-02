 import React from 'react';
import { Link } from 'react-router-dom';

function NavoFooter() {
  return (
    <footer className="navo-footer navo-container navo-container--wide">
      <div className="navo-footer-inner">
        <div className="navo-footer-brand">
          <div className="navo-footer-brand-heading">
            <span className="navo-dot" />
            <span className="brand-text">Navo</span>
          </div>
          <p>A quiet conversational language environment. Listen, echo, speak.</p>
        </div>
        <div className="navo-footer-links-simple">
          <FooterLink to="/loop">Practice Loop</FooterLink>
          <FooterLink to="/playground">Playground</FooterLink>
          <FooterLink to="/room">The Room</FooterLink>
          <FooterLink to="/about">About</FooterLink>
          <FooterLink to="/pricing">Pricing</FooterLink>
          <FooterLink to="/access">Access</FooterLink>
          <FooterLink to="/sessions">Sessions</FooterLink>
          <FooterLink to="/account">Account</FooterLink>
          <FooterLink to="/settings">Settings</FooterLink>
        </div>
      </div>
      <p className="navo-footer-meta">� Navo - preview build</p>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return <Link to={to}>{children}</Link>;
}

export default NavoFooter;
