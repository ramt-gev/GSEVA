import { useState } from 'react';
import styles from '../styles/backoffice.module.css';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

interface Props {
  logoName: string;
  logoSub: string;
  headline: React.ReactNode;
  heroSub: string;
  description: string;
  badgeText: string;
}

// Shared split-screen login — near-identical between Admin Portal and
// Dashboard Reports prototypes (confirmed by direct comparison), so this is
// one component instead of two copies.
export default function LoginOverlay({ logoName, logoSub, headline, heroSub, description, badgeText }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cannot reach server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.loginOverlay}>
      <div className={styles.loginLeft}>
        <div className={styles.loginLogo}>
          <div>
            <div className={styles.loginLogoName}>{logoName}</div>
            <div className={styles.loginLogoSub}>{logoSub}</div>
          </div>
        </div>

        <div className={styles.loginCard}>
          <div className={styles.loginCardHead}>
            <div className={styles.loginCardTitle}>Hare Krishna</div>
            <div className={styles.loginCardSub}>Sign in to continue</div>
          </div>

          {error && (
            <div className={styles.loginErrBox}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.loginField}>
            <label>Username</label>
            <div className={styles.loginFieldWrap}>
              <svg className={styles.loginFieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                className={styles.dashInput}
                type="text"
                placeholder="ram.prabhu"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <div className={styles.loginField}>
            <label>Password</label>
            <div className={styles.loginFieldWrap}>
              <svg className={styles.loginFieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                className={styles.dashInput}
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <button className={styles.loginBtnMain} disabled={submitting} onClick={handleLogin}>
            {submitting ? 'Signing in…' : <>Sign In &nbsp;→</>}
          </button>
        </div>

        <div className={styles.loginFooterRow}>
          <div className={styles.loginContact}>
            Account issues? Contact <a href="mailto:it@iskcongev.com">it@iskcongev.com</a>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, lineHeight: 1.6 }}>
            © 2026 Govardhan
            <br />
            EcoVillage · ISKCON
          </div>
        </div>
      </div>

      <div className={styles.loginRight}>
        <div className={styles.loginRightBg} />
        <div className={styles.loginRightInner}>
          <div style={{ marginBottom: 32 }}>
            <img src="/logo.svg" alt="GEV" style={{ height: 180 }} />
          </div>
          <div className={styles.loginBadge}>
            <div className={styles.loginBadgeDot} />
            {badgeText}
          </div>
          <div className={styles.loginHeadline}>
            <div>
              <h2>{headline}</h2>
              <p className={styles.loginHeroSub}>{heroSub}</p>
            </div>
          </div>
          <div>
            <p className={styles.loginDesc}>{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
