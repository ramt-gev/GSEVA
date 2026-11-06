import styles from '../../../styles/backoffice.module.css';
import BillingTable from '../../../components/reports/BillingTable';

export default function Billing() {
  return (
    <>
      <div className={`${styles.callout} ${styles.info}`}>
        <span className={styles.calloutIcon}>ℹ️</span>
        <div className={styles.calloutBody}>
          <strong>Annakshetra Contractor Billing</strong>
          Rate is read from system_config (bd_monthly_rate) — covers Breakfast + Dinner only. Free lunch is unrecovered. Billing
          is based on currently active registrations.
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>💳</span>
          <span className={styles.cardTitle}>Monthly Billing Recovery</span>
        </div>
        <BillingTable />
      </div>
    </>
  );
}
