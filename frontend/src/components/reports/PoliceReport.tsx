import { useEffect, useState } from 'react';
import styles from '../../styles/backoffice.module.css';
import * as reportsApi from '../../lib/endpoints/reports';

const CATEGORY_LABELS: { key: string; label: string; types: string[] }[] = [
  { key: 'staff', label: 'Payroll Staff', types: ['resident_staff'] },
  { key: 'ashram', label: 'Ashram Residents', types: ['brahmachari', 'varishtha_vaishnava'] },
  { key: 'labourers', label: 'Labourers', types: ['construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation'] },
  { key: 'volunteers', label: 'Volunteers', types: ['volunteer_seva', 'sustainability_intern', 'course_student'] },
  { key: 'dependants', label: 'Dependants', types: ['staff_dependant'] },
];

export default function Police() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<{ month: string; total: number; records: reportsApi.PoliceReportRecord[] } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    reportsApi.policeReportJson(year, month).then(setReport).catch(() => {});
  }, [year, month]);

  const counts = Object.fromEntries(
    CATEGORY_LABELS.map((c) => [c.key, report?.records.filter((r) => c.types.includes(r.person_type)).length ?? 0])
  );

  return (
    <div className={styles.g2} style={{ alignItems: 'start' }}>
      <div>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>⚙️</span>
            <span className={styles.cardTitle}>Report Configuration</span>
          </div>
          <div className={styles.cardBody}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              {new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{ background: 'var(--surface, #f8eee4)', borderRadius: 8, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14, textAlign: 'center' }}>
              {CATEGORY_LABELS.map((c) => (
                <div key={c.key}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--blue)' }}>{counts[c.key]}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>{c.label}</div>
                </div>
              ))}
              <div style={{ background: 'var(--saffron-dim, rgba(112,61,26,.1))', borderRadius: 6, padding: 4 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--saffron)' }}>{report?.total ?? '—'}</div>
                <div style={{ fontSize: 9, color: 'var(--saffron)' }}>Total Records</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ flex: 1 }} onClick={() => setShowPreview(true)}>
                📄 Preview Report
              </button>
              <a
                className={`${styles.btn} ${styles.btnOutline}`}
                style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                href={reportsApi.policeReportPdfUrl(year, month)}
                target="_blank"
                rel="noreferrer"
              >
                ⬇ Download PDF
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>📋</span>
          <span className={styles.cardTitle}>Police Report — Required Fields</span>
        </div>
        <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
          {['Full name', 'Date of birth · Gender', 'Department / relation to GEV', 'Permanent address + city, state, pincode', 'Date of arrival · Expected duration', 'ID proof type & number', 'Contractor company (labourers only)'].map((f) => (
            <div className={styles.feedItem} key={f}>
              <div className={styles.feedDot} style={{ background: 'var(--green)' }} />
              <div className={styles.feedText}>{f}</div>
            </div>
          ))}
        </div>
      </div>

      {showPreview && report && (
        <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && setShowPreview(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span style={{ fontSize: 18 }}>🚔</span>
              <span className={styles.modalTitle}>Police Report Preview — {report.month}</span>
              <button className={styles.modalClose} onClick={() => setShowPreview(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.policePreview}>
                <div className={styles.prHeader}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Govardhan EcoVillage — ISKCON GEV</h2>
                  <p style={{ fontSize: 11 }}>
                    Monthly Campus Resident Register — {report.month}
                    <br />
                    Galtare, Hamrapur, Wada, Palghar — 421303, Maharashtra
                  </p>
                  <p style={{ marginTop: 4, fontSize: 10 }}>Total Records: {report.total} · Prepared by: Premanjan P (Security HOD)</p>
                </div>
                <table className={styles.prTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Full Name</th>
                      <th>Type</th>
                      <th>Dept / Company</th>
                      <th>ID Proof</th>
                      <th>Arrived</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.records.slice(0, 10).map((r, i) => (
                      <tr key={r.person_id}>
                        <td>{i + 1}</td>
                        <td>{r.full_name}</td>
                        <td>{r.person_type.replace(/_/g, ' ')}</td>
                        <td>{r.contractor_name || r.dept_name || '—'}</td>
                        <td>{r.id_proof_type ? `${r.id_proof_type} ${r.id_proof_number ? '···' + String(r.id_proof_number).slice(-4) : ''}` : '—'}</td>
                        <td>{r.check_in_date ? new Date(r.check_in_date).toLocaleDateString('en-IN') : 'Permanent'}</td>
                      </tr>
                    ))}
                    {report.records.length > 10 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 10 }}>
                          ... {report.records.length - 10} more records in full report ...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className={styles.prFooter}>
                  <span>
                    Premanjan P — Security HOD
                    <br />
                    Signature: ______________
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    Vasudev Prabhuji — Final Authority
                    <br />
                    Signature: ______________
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setShowPreview(false)}>
                Close
              </button>
              <a className={`${styles.btn} ${styles.btnPrimary}`} style={{ textDecoration: 'none' }} href={reportsApi.policeReportPdfUrl(year, month)} target="_blank" rel="noreferrer">
                📄 Download PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
