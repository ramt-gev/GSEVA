import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../../styles/backoffice.module.css';
import * as reportsApi from '../../../lib/endpoints/reports';

type Fetcher = () => Promise<unknown>;

interface ReportDef {
  icon: string;
  title: string;
  sub: string;
  freq: string;
  freqCls: keyof typeof styles;
  owner: string;
  action: { type: 'modal'; fetch: Fetcher } | { type: 'nav'; path: string } | { type: 'soon' };
}

const REPORTS: ReportDef[] = [
  { icon: '🏕️', title: 'Daily Campus Occupancy', sub: 'Count by visitor type, gate entries/denials', freq: 'Daily', freqCls: 'tagG', owner: 'Management · Security', action: { type: 'modal', fetch: () => reportsApi.occupancyReport() } },
  { icon: '🚪', title: 'Gate Activity Log', sub: 'All entry/exit events, denied entries, overrides', freq: 'Daily', freqCls: 'tagG', owner: 'Premanjan P · Admin', action: { type: 'nav', path: '/dashboard/gates' } },
  { icon: '🌿', title: 'VF Tour Slot Utilisation', sub: 'Bookings vs. actual per slot', freq: 'Daily', freqCls: 'tagG', owner: 'Tour Team', action: { type: 'soon' } },
  { icon: '🏗️', title: 'Contractor Camp Strength', sub: 'Registered vs. actual per contractor company', freq: 'Daily', freqCls: 'tagG', owner: 'Anandnimai P · Laxmanpran P', action: { type: 'soon' } },
  { icon: '🍽️', title: 'Annakshetra B/D Consumption', sub: 'Registered vs. served counts', freq: 'Daily', freqCls: 'tagG', owner: 'Anand Prem P', action: { type: 'modal', fetch: () => reportsApi.mealConsumption() } },
  { icon: '🙏', title: 'Free Meals Served', sub: 'Free lunch + Khichadi AM + Khichadi PM counts', freq: 'Daily', freqCls: 'tagG', owner: 'Anand Prem P · Finance', action: { type: 'modal', fetch: () => reportsApi.mealConsumption() } },
  { icon: '📊', title: 'Meal Forecast vs. Actual', sub: 'Accuracy %, trend analysis', freq: 'Weekly', freqCls: 'tagB', owner: 'Annakshetra · Management', action: { type: 'soon' } },
  { icon: '☕', title: 'Café Revenue Summary', sub: 'Zone 3 upgrade payments by café', freq: 'Weekly', freqCls: 'tagB', owner: 'Finance · Accounts', action: { type: 'modal', fetch: () => reportsApi.cafeRevenueSummary() } },
  { icon: '🏨', title: 'eZee Guest Occupancy', sub: 'Current + upcoming, OTA vs direct booking', freq: 'Weekly', freqCls: 'tagB', owner: 'Front Desk', action: { type: 'soon' } },
  { icon: '🤲', title: 'Volunteer / Intern Status', sub: 'Active, pending approval, upcoming departures', freq: 'Weekly', freqCls: 'tagB', owner: 'Balaji Govind P', action: { type: 'soon' } },
  { icon: '📈', title: 'Monthly Visitor Statistics', sub: 'Total by type, source, repeat vs. new', freq: 'Monthly', freqCls: 'tagP', owner: 'Management', action: { type: 'soon' } },
  { icon: '🌸', title: 'Monthly Prasadam Service Report', sub: 'Total free meals, cost per category — donor format', freq: 'Monthly', freqCls: 'tagP', owner: 'Finance · Donors', action: { type: 'soon' } },
  { icon: '🚔', title: 'Monthly Police Resident Report', sub: 'All overnight campus residents', freq: 'Monthly · 1st', freqCls: 'tagR', owner: 'Premanjan P → Local Police', action: { type: 'nav', path: '/dashboard/police' } },
  { icon: '🔐', title: 'Audit Trail Log', sub: 'Every action by every user', freq: 'On-demand', freqCls: 'tagGrey', owner: 'Super Admin only', action: { type: 'nav', path: '/dashboard/audit' } },
  { icon: '🎊', title: 'Festival Post-Event Report', sub: 'Footfall, prasad served, cost per person', freq: 'Post-Event', freqCls: 'tagO', owner: 'Festival Committee', action: { type: 'soon' } },
  { icon: '📖', title: 'Annual Community Report', sub: 'All statistics, awards, donors — full year', freq: 'Annual', freqCls: 'tagP', owner: 'Vasudev Prabhuji', action: { type: 'soon' } },
  { icon: '⚠️', title: 'Overstay Alerts', sub: 'Guests past check-out without exit scan', freq: 'Real-time', freqCls: 'tagR', owner: 'Front Desk', action: { type: 'soon' } },
];

export default function ReportsLibrary() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ title: string; data: unknown } | null>(null);

  async function handleClick(report: ReportDef) {
    if (report.action.type === 'nav') navigate(report.action.path);
    else if (report.action.type === 'modal') {
      const data = await report.action.fetch();
      setModal({ title: report.title, data });
    }
  }

  return (
    <>
      <div className={styles.reportGrid}>
        {REPORTS.map((r) => (
          <div
            key={r.title}
            className={`${styles.reportCard} ${r.action.type === 'soon' ? styles.disabled : ''} ${r.title.includes('Police') ? styles.featured : ''}`}
            onClick={() => r.action.type !== 'soon' && handleClick(r)}
          >
            <span className={styles.rcIcon}>{r.icon}</span>
            <div className={styles.rcTitle}>{r.title}</div>
            <div className={styles.rcSub}>{r.sub}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span className={`${styles.tag} ${styles[r.freqCls]}`}>{r.action.type === 'soon' ? 'Coming soon' : r.freq}</span>
              <span style={{ fontSize: 10, color: 'var(--saffron)' }}>{r.owner}</span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span style={{ fontSize: 18 }}>📄</span>
              <span className={styles.modalTitle}>{modal.title}</span>
              <button className={styles.modalClose} onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--text2)', margin: 0 }}>{JSON.stringify(modal.data, null, 2)}</pre>
            </div>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
