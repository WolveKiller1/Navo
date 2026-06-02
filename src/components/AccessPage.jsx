import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import SubPageLayout from './SubPageLayout';
import '../styles/AccessPage.css';

const TIERS = [
  {
    name: 'Visit',
    price: 'Free',
    cadence: 'no card',
    body: 'A small open room to try Loop and short Room sessions.',
    features: ['Practice Loop', 'Short Room sessions', '1 language'],
    cta: 'Enter',
    to: '/'
  },
  {
    name: 'Resident',
    price: '$9',
    cadence: 'per month',
    body: 'Unlimited time in the Room and full Playground flow.',
    features: ['Unlimited Room time', 'Pattern Playground', 'Session archive', '3 languages'],
    cta: 'Become Resident',
    to: '/access',
    featured: true
  },
  {
    name: 'Patron',
    price: '$24',
    cadence: 'per month',
    body: 'Support ongoing development and early feature drops.',
    features: ['Everything in Resident', 'Early access updates'],
    cta: 'Support Navo',
    to: '/access'
  }
];

function AccessPage() {
  const location = useLocation();
  const pricingView = location.pathname === '/pricing';

  if (pricingView) {
    return (
      <SubPageLayout
        title="Pricing"
        headline="Quiet, honest pricing."
        subtitle="One number, monthly, cancel from the account page. Nothing is sold by the lesson."
      >

        <section className="tier-grid">
          {TIERS.map((tier) => (
            <article key={tier.name} className={`tier-card navo-card navo-hairline-top ${tier.featured ? 'featured' : ''}`}>
              <p className="tier-name">{tier.name}</p>
              <p className="tier-price">{tier.price}</p>
              <p className="tier-cadence">{tier.cadence}</p>
              <p className="tier-body">{tier.body}</p>
              <ul className="tier-features">
                {tier.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <Link to={tier.to} className={`tier-cta ${tier.featured ? 'featured' : ''}`}>{tier.cta}</Link>
            </article>
          ))}
        </section>
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout title="Access" headline="Entry and access" subtitle="Access controls are still frontend-only in this build.">
      <section className="access-panel navo-card navo-hairline-top">
        <h2>Current build status</h2>
        <p>Billing and auth integrations are not wired yet. All product routes shown in this prototype are local-app behavior.</p>
        <div className="access-actions">
          <Link to="/pricing" className="access-link">View pricing</Link>
          <Link to="/room" className="access-link" onClick={() => sessionStorage.setItem('rylingo_access', 'granted')}>Enter the Room</Link>
        </div>
      </section>
    </SubPageLayout>
  );
}

export default AccessPage;
