import React from 'react';
import SubPageLayout from './SubPageLayout';
import '../styles/AboutPage.css';

function AboutPage() {
  return (
    <SubPageLayout
      title="About"
      headline="A language is a place."
      subtitle="A language is a place. Navo is a quiet room inside it."
    >
      <section className="about-grid">
        <article className="about-stanza navo-card navo-hairline-top">
          <p className="stanza-label">No lessons</p>
          <p>Navo does not run you through chapters or grammar trees. It keeps you in live language contact.</p>
        </article>

        <article className="about-stanza navo-card navo-hairline-top">
          <p className="stanza-label">No scores</p>
          <p>There are no points, streaks, or grades. The signal is whether a phrase starts to feel yours.</p>
        </article>

        <article className="about-stanza navo-card navo-hairline-top">
          <p className="stanza-label">No noise</p>
          <p>One phrase, one variation, one exchange at a time. The interface stays out of your way.</p>
        </article>
      </section>

      <section className="about-flow navo-card navo-hairline-top">
        <h2>How a session feels</h2>
        <p>You begin in Practice Loop: hear a line, imitate it, repeat until it settles.</p>
        <p>In Pattern Playground, the same line shifts shape so you hear structure, not memorized text.</p>
        <p>In the Room, you speak and get a short live response. Conversation first, pattern exposure always.</p>
      </section>
    </SubPageLayout>
  );
}

export default AboutPage;
