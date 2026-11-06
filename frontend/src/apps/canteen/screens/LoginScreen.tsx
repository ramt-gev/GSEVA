import { useState } from 'react';
import styles from '../canteen.module.css';
import { useAuth } from '../../../lib/auth';
import { ApiError } from '../../../lib/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Check credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.loginBg}>
      <div className={styles.loginBlob3} />
      <div className={styles.loginBlob4} />
      <div className={styles.loginBgContent}>
        <img
          src="/annakshetra-logo.webp"
          alt="Govardhan Annakshetra"
          style={{ height: 200, marginBottom: 18, display: 'block', margin: '0 auto 18px', filter: 'drop-shadow(0 4px 16px rgba(112,61,26,0.25))' }}
        />
        <div className={styles.loginCard}>
          <div className={styles.loginField}>
            <label className={styles.loginLabel}>Username</label>
            <input
              className={styles.loginInput}
              type="text"
              placeholder="e.g. anandprem"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div className={styles.loginField}>
            <label className={styles.loginLabel}>Password</label>
            <input
              className={styles.loginInput}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <button className={styles.loginBtn} disabled={submitting} onClick={handleLogin}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
          {error && <div className={styles.loginError}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
