import React, { useEffect, useState } from 'react';
import SubPageLayout from './SubPageLayout';
import { getLocalAccount } from '../services/accountService';
import '../styles/PatternMapPage.css';

function PatternMapPage() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const loadAccount = async () => {
      const localAccount = await getLocalAccount();
      setAccount(localAccount);
    };

    void loadAccount();
  }, []);

  const activeLanguage = account?.languageSettings?.activeLanguage === 'pt' ? 'Portuguese' : 'English';

  return (
    <SubPageLayout
      title="Pattern Map"
      headline="Continuity first, map later"
      subtitle="A quiet blueprint for where continuity could gather, without turning it into a dashboard."
    >
      <section className="pattern-map-wrap navo-card navo-hairline-top">
        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Blueprint</p>
          <h2>Held back on purpose</h2>
          <p>
            Pattern Map stays intentionally quiet in v0. Navo can carry continuity without turning nearby language
            into nodes, edges, territories, or unlocks.
          </p>
        </div>

        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Current shape</p>
          <h2>Language can linger without being counted at you</h2>
          <p>
            Practice Loop, Pattern Playground, and derived Room signals already contribute to continuity.
            Exact Room conversations still stay local to this device.
          </p>
        </div>

        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Active environment</p>
          <h2>{activeLanguage}</h2>
          <p>
            The active language and its carried phrases already shape what feels nearby. The map can wait until it
            has a calmer purpose.
          </p>
        </div>

        <div className="pattern-map-copy-block">
          <p className="pattern-map-kicker">Privacy boundary</p>
          <h2>Cloud-safe continuity only</h2>
          <p>
            Supabase can hold account identity, settings, safe profile fields, app-generated traces, movement traces,
            and derived non-verbatim Room traces. Full Room conversations remain local-only.
          </p>
        </div>
      </section>
    </SubPageLayout>
  );
}

export default PatternMapPage;
