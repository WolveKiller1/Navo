import React from 'react';
import SubPageLayout from './SubPageLayout';
import '../styles/AboutPage.css';

function AboutPage() {
  return (
    <SubPageLayout title="About">
      <div className="about-content">
        <p className="about-text">
          Navo is a language learning system focused on natural conversation practice.
        </p>
        <p className="about-text">
          It responds to your speech, adapts to your level, and helps you build fluency through structured practice.
        </p>
        <p className="about-text">
          No lessons. No points. Just conversation.
        </p>
      </div>
    </SubPageLayout>
  );
}

export default AboutPage;
