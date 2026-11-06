import { useState } from 'react';
import styles from '../gate.module.css';
import { useAuth } from '../../../lib/auth';
import { ApiError } from '../../../lib/api';
import { GATE_OPTIONS, type GateOption } from '../useGateSession';

interface Props {
  gate: GateOption;
  onSelectGate: (gate: GateOption) => void;
}

export default function LoginScreen({ gate, onSelectGate }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError('');
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid credentials. Try: gate.staff / gev123');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`${styles.screen} ${styles.loginScreen}`}>
      <div className={styles.loginTop}>
        <img src="/logo.svg" alt="GEV" style={{ height: 100, display: 'block', margin: '0 auto' }} />
        <div className={styles.loginSub}>Gate Access Control</div>
      </div>

      <div className={styles.loginCard}>
        <span className={styles.fieldLabel}>Select Your Gate</span>
        <div className={styles.gateGrid}>
          {GATE_OPTIONS.map((opt) => (
            <div
              key={opt.id}
              className={`${styles.gateOpt} ${gate.id === opt.id ? styles.sel : ''}`}
              onClick={() => onSelectGate(opt)}
            >
              <span className={styles.gateOptIc}>{opt.icon}</span>
              <div className={styles.gateOptNm}>{opt.name}</div>
              <div className={styles.gateOptSb}>{opt.sub}</div>
            </div>
          ))}
        </div>

        <div className={styles.canteenNote}>
          🍲 Annakshetra meal scanning — use the dedicated <strong>Canteen Counter App</strong>
        </div>

        <span className={styles.fieldLabel}>Username</span>
        <input
          type="text"
          className={styles.inp}
          placeholder="e.g. gate.staff or premanjan"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        <span className={styles.fieldLabel}>Password</span>
        <input
          type="password"
          className={styles.inp}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        {error && <div className={styles.errMsg}>{error}</div>}

        <button className={styles.btnLogin} disabled={submitting} onClick={handleLogin}>
          🙏 JAI GOVARDHAN — {submitting ? 'SIGNING IN…' : 'LOGIN'}
        </button>

        <div className={styles.demoHint}>
          Demo — Username: <span>gate.staff</span> &nbsp;·&nbsp; Password: <span>gev123</span>
        </div>
      </div>
    </div>
  );
}
