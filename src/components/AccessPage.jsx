import React from 'react';
import SubPageLayout from './SubPageLayout';
import '../styles/AccessPage.css';

function AccessPage() {
  return (
    <SubPageLayout title="Access">
      <div className="access-content">
        <p className="access-text">
          Navo is currently free to use.
        </p>
      </div>
    </SubPageLayout>
  );
}

export default AccessPage;
