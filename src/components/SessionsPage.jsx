import React from 'react';
import SubPageLayout from './SubPageLayout';
import SessionHistoryContent from './SessionHistoryContent';

function SessionsPage() {
  return (
    <SubPageLayout
      title="Sessions"
      headline="Rooms you've been in"
      subtitle="Quiet traces of previous conversations. Re-enter any thread."
    >
      <SessionHistoryContent />
    </SubPageLayout>
  );
}

export default SessionsPage;
