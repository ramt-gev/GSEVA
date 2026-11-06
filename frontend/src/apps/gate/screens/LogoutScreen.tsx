import styles from '../gate.module.css';
import { useAuth } from '../../../lib/auth';
import type { GateOption } from '../useGateSession';

interface Props {
  gate: GateOption;
  stats: { allowed: number; denied: number };
  onCancel: () => void;
  onLoggedOut: () => void;
}

export default function LogoutScreen({ gate, stats, onCancel, onLoggedOut }: Props) {
  const { logout } = useAuth();

  function confirmLogout() {
    logout();
    onLoggedOut();
  }

  return (
    <div className={`${styles.screen} ${styles.logoutScreen}`}>
      <div className={styles.logoutCard}>
        <span className={styles.logoutIcon}>🔓</span>
        <div className={styles.logoutTitle}>End Your Shift?</div>
        <div className={styles.logoutSub}>You are logged in at:</div>
        <div className={styles.logoutGate}>{gate.name}</div>
        <div className={styles.logoutStats}>
          <div className={styles.lsItem}>
            <div className={`${styles.lsNum} ${styles.g}`}>{stats.allowed}</div>
            <div className={styles.lsLbl}>Allowed</div>
          </div>
          <div className={styles.lsItem}>
            <div className={`${styles.lsNum} ${styles.r}`}>{stats.denied}</div>
            <div className={styles.lsLbl}>Denied</div>
          </div>
          <div className={styles.lsItem}>
            <div className={`${styles.lsNum} ${styles.s}`}>{stats.allowed + stats.denied}</div>
            <div className={styles.lsLbl}>Total</div>
          </div>
        </div>
        <button className={styles.btnConfirmLogout} onClick={confirmLogout}>
          ✅ CONFIRM LOGOUT
        </button>
        <button className={styles.btnCancelLogout} onClick={onCancel}>
          ← BACK TO SCANNER
        </button>
      </div>
    </div>
  );
}
