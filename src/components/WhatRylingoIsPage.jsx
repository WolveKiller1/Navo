import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/WhatRylingoIsPage.css';

function WhatRylingoIsPage() {
  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Focus on h1 for screen reader announcement
    const heading = document.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }, []);

  return (
    <main className="what-rylingo-is-page">
      <h1>What Navo is / isn't</h1>
      <p className="subtitle">
        Navo is a real-time conversation space for speaking practice.
      </p>
      
      <section aria-labelledby="what-it-is">
        <h2 id="what-it-is">What it is</h2>
        <ul>
          <li>A conversation that responds to what you say.</li>
          <li>Short replies that keep the exchange moving.</li>
          <li>Optional microphone input and voice output.</li>
          <li>Conversations saved locally in your browser.</li>
        </ul>
      </section>
      
      <section aria-labelledby="what-it-isnt">
        <h2 id="what-it-isnt">What it isn't</h2>
        <ul>
          <li>Not a course or structured program.</li>
          <li>Not grammar instruction or drills.</li>
          <li>Not a progress tracker.</li>
          <li>Not coaching or evaluation.</li>
          <li>Not adaptive across sessions unless you direct it.</li>
        </ul>
      </section>
      
      <section aria-labelledby="data-privacy">
        <h2 id="data-privacy">Data & privacy</h2>
        <ul>
          <li>Conversations are stored only on this device.</li>
          <li>You can export conversations as a JSON file.</li>
          <li>You can delete individual conversations or all local data.</li>
          <li>Microphone audio is not stored.</li>
          <li>Stored data does not influence responses.</li>
        </ul>
      </section>
      
      <section aria-labelledby="limits">
        <h2 id="limits">Limits</h2>
        <ul>
          <li>It may misunderstand or respond imperfectly.</li>
          <li>Do not rely on it for medical, legal, or safety-critical matters.</li>
        </ul>
      </section>
      
      <Link to="/">Back to home</Link>
    </main>
  );
}

export default WhatRylingoIsPage;
