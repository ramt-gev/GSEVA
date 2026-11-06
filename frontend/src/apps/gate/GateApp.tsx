import { useState } from 'react';
import styles from './gate.module.css';
import '../../styles/tokens-operational.css';
import { RequireAuth } from '../../components/RequireAuth';
import LoginScreen from './screens/LoginScreen';
import ScannerScreen from './screens/ScannerScreen';
import AllowedScreen from './screens/AllowedScreen';
import DeniedScreen from './screens/DeniedScreen';
import EventsScreen from './screens/EventsScreen';
import LogoutScreen from './screens/LogoutScreen';
import Zone3UpgradeOverlay from './screens/Zone3UpgradeOverlay';
import { useGateSession } from './useGateSession';

type Screen = 'scanner' | 'allowed' | 'denied' | 'events' | 'logout';

function GateAuthed() {
  const [screen, setScreen] = useState<Screen>('scanner');
  const session = useGateSession();

  async function handleScan(input: { qr_id?: string; mobile?: string }) {
    const res = await session.scan(input);
    if (session.upgrade) return; // upgrade overlay takes over instead of allowed/denied
    setScreen(res.result === 'allow' ? 'allowed' : 'denied');
  }

  return (
    <>
      {screen === 'scanner' && (
        <ScannerScreen
          gate={session.gate}
          stats={session.stats}
          onScan={handleScan}
          onNavEvents={() => setScreen('events')}
          onNavLogout={() => setScreen('logout')}
        />
      )}
      {screen === 'allowed' && session.lastResult?.person && (
        <AllowedScreen
          person={session.lastResult.person}
          onNext={() => setScreen('scanner')}
          onNavEvents={() => setScreen('events')}
          onNavLogout={() => setScreen('logout')}
        />
      )}
      {screen === 'denied' && session.lastResult && (
        <DeniedScreen
          result={session.lastResult}
          gate={session.gate.id}
          onNext={() => setScreen('scanner')}
          onNavEvents={() => setScreen('events')}
          onNavLogout={() => setScreen('logout')}
        />
      )}
      {screen === 'events' && <EventsScreen gate={session.gate} events={session.events} onBack={() => setScreen('scanner')} />}
      {screen === 'logout' && (
        <LogoutScreen
          gate={session.gate}
          stats={session.stats}
          onCancel={() => setScreen('scanner')}
          onLoggedOut={() => {
            session.resetForLogout();
            setScreen('scanner');
          }}
        />
      )}

      {session.upgrade && (
        <Zone3UpgradeOverlay
          upgrade={session.upgrade}
          onConfirm={session.confirmUpgrade}
          onDismiss={() => {
            session.dismissUpgrade();
            setScreen('scanner');
          }}
        />
      )}
    </>
  );
}

export default function GateApp() {
  return (
    <div className={`theme-operational ${styles.page}`}>
      <RequireAuth fallback={<GateLoginWrapper />}>
        <GateAuthed />
      </RequireAuth>
    </div>
  );
}

// Gate selection is persisted to localStorage by useGateSession itself
// (GATE_STORAGE_KEY), so this pre-login instance and GateAuthed's post-login
// instance naturally agree on the selected gate without any explicit bridge.
function GateLoginWrapper() {
  const session = useGateSession();
  return <LoginScreen gate={session.gate} onSelectGate={session.selectGate} />;
}
