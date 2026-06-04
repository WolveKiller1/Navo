import React, { useEffect, useState } from 'react';
import SubPageLayout from './SubPageLayout';
import { getLocalAccount } from '../services/storage';
import '../styles/PatternMapPage.css';

function PatternMapPage() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const loadAccount = async () => {
      const localAccount = await getLocalAccount();
      setAccount(localAccount);
    };

    loadAccount();
  }, []);

  const recentExposure = [...(account?.continuity?.exposureTraces || [])].slice(-4).reverse();
  const recentMovement = [...(account?.continuity?.movementTraces || [])].slice(-4).reverse();

  return (
    <SubPageLayout
      title="Pattern Map"
      headline="Continuity first, map later"
      subtitle="Raw traces are gathered here without choosing nodes, edges, territories, or unlocks."
    >
      <section className="pattern-map-wrap navo-card navo-hairline-top">
        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Reserved boundary</p>
          <h2>patternMapReserved</h2>
          <p>
            This account continuity already owns a future-facing storage boundary, but it does not impose
            graph structure or visual topology yet.
          </p>
        </div>

        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Continuity</p>
          <h2>
            {(account?.continuity?.exposureTraces || []).length} nearby phrases ·{' '}
            {(account?.continuity?.movementTraces || []).length} movements
          </h2>
          <p>These traces belong to account continuity. Room transcripts still remain local-only.</p>
        </div>

        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Recently nearby</p>
          {recentExposure.length > 0 ? (
            recentExposure.map((trace) => (
              <p key={trace.id} className="pattern-map-line">"{trace.text}"</p>
            ))
          ) : (
            <p className="pattern-map-line">No nearby phrases yet.</p>
          )}
        </div>

        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Recent movements</p>
          {recentMovement.length > 0 ? (
            recentMovement.map((trace) => (
              <p key={trace.id} className="pattern-map-line">{trace.fromText} → {trace.toText}</p>
            ))
          ) : (
            <p className="pattern-map-line">No movements yet.</p>
          )}
        </div>
      </section>
    </SubPageLayout>
  );
}

export default PatternMapPage;
