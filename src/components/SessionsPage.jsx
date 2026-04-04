import React from 'react';
import SubPageLayout from './SubPageLayout';
import SessionHistoryContent from './SessionHistoryContent';

function SessionsPage() {
  return (
    <SubPageLayout title="Sessions">
      <SessionHistoryContent />
    </SubPageLayout>
  );
}

export default SessionsPage;
