import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import * as gateApi from '../../../lib/endpoints/gate';
import RegisterSevakModal from '../components/RegisterSevakModal';

// Committee membership is slow-changing org-chart content with no backing
// table (confirmed via schema read — see plan doc) — kept as verified static
// data (extracted directly from the prototype, not invented) rather than
// building committees/committee_members tables for a one-time-decision
// scope call.
interface Committee {
  title: string;
  icon: string;
  lead: string;
  members: string[];
  tag: keyof typeof styles;
}

const COMMITTEES: Committee[] = [
  { title: 'Sustainability Committee', icon: '🌿', lead: 'Vasudev P', members: ['Gauranga P', 'Ganga Narayan P'], tag: 'tagG' },
  { title: 'Land & Legal Compliances', icon: '⚖️', lead: 'Sanatkumar P', members: ['Sri Nandanadan P', 'Prananand P', 'Devarshi Narad P', 'Audarya Caitanya P', 'Sri Guru Caran P'], tag: 'tagB' },
  { title: 'Local Affairs Committee', icon: '🏢', lead: 'Sanatkumar P', members: ['Sri Nandanandan P', 'Devarshi Narad P', 'Sri Gauracaran P', 'Caitanya Rup P', 'Mohan Vilas P'], tag: 'tagO' },
  { title: 'CARE Committee', icon: '💚', lead: 'Sushant Nitai P', members: ['Radha Madan Gopal P (Secretary)', 'Sri Caitanya Kripa P'], tag: 'tagT' },
  { title: 'Festival Committee', icon: '🎉', lead: 'Sanatkumar P · Secretary: Shivananda Shyam P', members: ['Rupa Raghunatha P', 'Sri Gaura Caran P', 'Hari Guru P', 'Ananta Raghav P', 'Premlila Mataji', 'Barsana Kumari M', 'Abhimanyu Pran P', 'Gauranga P', 'Vasudev P', 'Gauranga Darshan P'], tag: 'tagA' },
  { title: 'Deity Worship Committee', icon: '🛕', lead: 'Sri Nandanandan P · Secretary: Gauranga Bihari P', members: ['Sivanand Syam P', 'Ananta Raghav P', 'Jadu Thakur P', 'Audarya Caitanya P', 'Madhu Madhav P', 'Sarvatma Hari P', 'Madhav Gopal P', 'Abhimanyu Pran P', 'Ajit Mukund P', 'Maha Bhagavat P', 'Sushant Nitai P', 'Hari Priya M'], tag: 'tagP' },
  { title: 'Varishtha Vaishnava Care', icon: '🙏', lead: 'Gauranga P', members: ['Sivanand Shyam P'], tag: 'tagT' },
  { title: 'Yatra Committee', icon: '🚌', lead: 'Sanat Kumar P · HoD: Tulsi Priya P', members: ['Adi Keshav P', 'Sri Nandananda P', 'Sacipran P', 'Sridhar Nimai P', 'Acyut Patil P', 'Rupa Raghunath P', 'Abhimanyu Pran P', 'Caitanya Rupa P', 'Madhav Gaur P'], tag: 'tagB' },
  { title: 'GEV Sales', icon: '🛍️', lead: 'Vasudev P', members: ['Sanatkumar P', 'Sri Guru Caran P', 'Adikeshav P', 'Madhav Gaur P'], tag: 'tagO' },
  { title: 'Rural Development', icon: '🌾', lead: 'Ajit Mukund P', members: [], tag: 'tagG' },
  { title: 'HRDI', icon: '🎓', lead: 'Ajit Mukund P', members: ['Abhimanyu Pran P', 'Anand Prem P'], tag: 'tagB' },
  { title: 'Sastric Education / Preachers', icon: '📖', lead: '', members: ['Gauranga Darshan P', 'Gauranga Bihari P', 'Gaura Nam P', 'Madhav Prem P', 'Maha Bhagavat P'], tag: 'tagP' },
  { title: 'Master Planning', icon: '📐', lead: 'Vasudev P', members: ['Gauranga P', 'Devarshi Narad P', 'Sri Gaur Caran P', 'Sacitanuj P', 'Caitanya Rup P', 'Audarya Caitanya P', 'Anand Nimai P'], tag: 'tagA' },
  { title: 'Construction Committee', icon: '🏗️', lead: 'Vasudev P · Secretary: Saivivek P', members: ['Gauranga P', 'Sri Gaur Caran P', 'Anand Nimai P', 'Mahabhagavat P'], tag: 'tagO' },
  { title: 'Counsellor Body', icon: '🧭', lead: '', members: ['Sanat Kumar P', 'Gauranga P', 'Vasudev P', 'Adi Keshav P', 'Balaji Govind P', 'Giriraj P', 'Devarshi Narad P', 'Maha Bhagavat P', 'Abhimanyu Pran P', 'Sri Nandanandan P', 'Rupa Raghunath P', 'Madhavanand P', 'Madhav Gaur P'], tag: 'tagP' },
];

export default function OrgStructure() {
  const [gac, setGac] = useState<adminApi.GacMember[]>([]);
  const [showRegister, setShowRegister] = useState<string | null>(null);
  const [sevaks, setSevaks] = useState<{ label: string; rows: adminApi.SevakRow[] } | null>(null);

  useEffect(() => {
    adminApi.gacMembersList().then(setGac).catch(() => {});
  }, []);

  async function loadSevaks(committeeName: string) {
    setSevaks({ label: committeeName, rows: [] });
    const depts = await adminApi.listDepartments();
    const match = depts.find((d) => d.dept_name.includes(committeeName));
    const result = await adminApi.listSevaks(match ? { dept_id: match.dept_id, limit: 100 } : { limit: 100 });
    setSevaks({ label: committeeName, rows: result.data });
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Governance Hierarchy</span>
          <div className={styles.cardActions}>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => setShowRegister('')}>
              + Register Sevak
            </button>
          </div>
        </div>
        <div className={styles.cardBody}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Board of Directors</div>
            <div style={{ fontWeight: 700 }}>HH Radhanath Swami</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', marginTop: 8 }}>BoD Subcommittee</div>
            <div style={{ fontWeight: 700 }}>Krsna Candra P</div>
          </div>
          <div style={{ background: 'var(--surface, #f8eee4)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 8 }}>GEV Administrative Council (GAC) — {gac.length || 16} Members</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {gac.map((m) => (
                <span key={m.gac_id} className={`${styles.tag} ${styles.tagGrey}`}>
                  {m.gac_member_name}
                  {m.gac_position?.toLowerCase().includes('secretary') ? ' (Secretary)' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.reportGrid}>
        {COMMITTEES.map((c) => (
          <div className={styles.reportCard} key={c.title} style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span>{c.icon}</span>
              <span className={styles.rcTitle} style={{ flex: 1, marginBottom: 0 }}>
                {c.title}
              </span>
              <span className={`${styles.tag} ${styles[c.tag]}`}>{c.members.length + 1} member{c.members.length ? 's' : ''}</span>
            </div>
            {c.lead && <div style={{ fontSize: 12.5, marginBottom: 6 }}>Lead: <strong>{c.lead}</strong></div>}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {c.members.map((m) => (
                <span key={m} className={`${styles.tag} ${styles.tagGrey}`} style={{ fontSize: 10 }}>
                  {m}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => setShowRegister(c.title)}>
                + Register Sevak
              </button>
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => loadSevaks(c.title)}>
                View Sevaks
              </button>
            </div>
          </div>
        ))}
      </div>

      {sevaks && (
        <div className={styles.card} style={{ marginTop: 14 }}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>{sevaks.label} — Sevaks</span>
          </div>
          <div className={styles.tableScroll}>
            {sevaks.rows.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>No sevaks registered yet for this committee.</div>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Zones</th>
                    <th>Valid Until</th>
                    <th>Login</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sevaks.rows.map((r) => {
                    const pass = r.qr_passes?.[0];
                    return (
                      <tr key={r.person_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.department?.dept_name || '—'}</div>
                        </td>
                        <td>{r.mobile}</td>
                        <td>{pass?.zone_access.map((z) => <span key={z} className={`${styles.tag} ${styles.tagB}`} style={{ fontSize: 10, marginRight: 3 }}>{z}</span>)}</td>
                        <td>{pass?.valid_until ? new Date(pass.valid_until).toLocaleDateString('en-IN') : 'Permanent'}</td>
                        <td>{r.system_user ? <span className={`${styles.tag} ${styles.tagG}`}>{r.system_user.username}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                        <td>
                          <span className={`${styles.tag} ${r.status === 'on_campus' ? styles.tagG : styles.tagGrey}`}>{r.status}</span>
                        </td>
                        <td>
                          {pass ? (
                            <a className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} style={{ textDecoration: 'none' }} href={gateApi.passPdfUrl(pass.qr_id)} target="_blank" rel="noreferrer">
                              Pass
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text3)', fontSize: 11 }}>No QR</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showRegister !== null && (
        <RegisterSevakModal deptName={showRegister || undefined} onClose={() => setShowRegister(null)} onCreated={() => {}} />
      )}
    </>
  );
}
