import React from 'react';
import SubPageLayout from './SubPageLayout';
import '../styles/WhatRylingoIsPage.css';

function WhatRylingoIsPage() {
  return (
    <SubPageLayout
      title="What it is"
      headline="Conversation and pattern exposure first"
      subtitle="Conversation and pattern exposure first."
    >
      <section className="what-grid">
        <article className="what-card navo-card navo-hairline-top">
          <h2>What it is</h2>
          <ul>
            <li>A real-time speaking space with short responses.</li>
            <li>Pattern exposure through imitation and variation.</li>
            <li>Session traces saved locally on this device.</li>
          </ul>
        </article>

        <article className="what-card navo-card navo-hairline-top">
          <h2>What it is not</h2>
          <ul>
            <li>Not a lesson plan or grammar course.</li>
            <li>Not a test, score system, or coach.</li>
            <li>Not a source for medical, legal, or safety advice.</li>
          </ul>
        </article>
      </section>

      <section className="what-card navo-card navo-hairline-top">
        <h2>Data and privacy</h2>
        <ul>
          <li>Conversations stay local unless you export them.</li>
          <li>Microphone audio is not stored.</li>
          <li>You can delete individual sessions or wipe all local data.</li>
        </ul>
      </section>
    </SubPageLayout>
  );
}

export default WhatRylingoIsPage;
