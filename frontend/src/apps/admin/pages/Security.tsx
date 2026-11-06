import styles from '../../../styles/backoffice.module.css';
import PoliceReport from '../../../components/reports/PoliceReport';

const QUICK_REPORTS = [
  { icon: '🏕️', title: 'Daily Campus Occupancy', path: '/dashboard' },
  { icon: '🚪', title: 'Gate Activity Log', path: '/admin/security' },
  { icon: '🔐', title: 'Audit Trail Log', path: '/admin/audit' },
];

export default function Security() {
  return (
    <>
      <PoliceReport />
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Other Report Types</span>
          <span className={styles.cardSub}>Full library on the Dashboard app</span>
        </div>
        <div className={styles.cardBody} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {QUICK_REPORTS.map((r) => (
            <div key={r.title} className={`${styles.tag} ${styles.tagGrey}`} style={{ padding: '6px 12px' }}>
              {r.icon} {r.title}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
