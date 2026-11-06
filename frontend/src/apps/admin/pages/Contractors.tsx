import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import BillingTable from '../../../components/reports/BillingTable';

const LABOURER_TYPES = new Set(['construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation']);

export default function Contractors() {
  const [pending, setPending] = useState<adminApi.PendingApproval[] | null>(null);
  const [pendingCompanies, setPendingCompanies] = useState<adminApi.PendingContractor[] | null>(null);
  const [contractors, setContractors] = useState<adminApi.AdminContractor[] | null>(null);

  function load() {
    adminApi.pendingApprovals().then((rows) => setPending(rows.filter((r) => LABOURER_TYPES.has(r.person_type)))).catch(() => setPending([]));
    adminApi.pendingContractors().then(setPendingCompanies).catch(() => setPendingCompanies([]));
    adminApi.contractorsListAdmin().then(setContractors).catch(() => setContractors([]));
  }
  useEffect(load, []);

  async function approve(personId: string) {
    if (!confirm('Approve this worker and send QR pass via WhatsApp?')) return;
    await adminApi.approvePerson(personId);
    load();
  }

  async function approveCompany(contractorId: string) {
    if (!confirm('Approve this company? It will then be selectable on the public registration form.')) return;
    await adminApi.approveContractor(contractorId);
    load();
  }

  // Group pending workers by contractor company for the "N workers submitted" card style
  const byContractor = new Map<string, adminApi.PendingApproval[]>();
  pending?.forEach((p) => {
    const key = p.contractor_name || 'Unknown company';
    byContractor.set(key, [...(byContractor.get(key) || []), p]);
  });

  return (
    <>
      {pendingCompanies && pendingCompanies.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Pending Companies</span>
            <span className={styles.cardSub}>Submitted via "Company not listed" on the registration form</span>
          </div>
          <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
            {pendingCompanies.map((c) => (
              <div className={styles.feedItem} key={c.contractor_id}>
                <div className={styles.feedDot} style={{ background: 'var(--amber)' }} />
                <div className={styles.feedText}>
                  <strong>{c.company_name}</strong> — submitted by {c.poc_name} ({c.poc_mobile}) · {c.worker_count} worker
                  {c.worker_count === 1 ? '' : 's'} so far
                </div>
                <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => approveCompany(c.contractor_id)}>
                  Approve Company
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {byContractor.size > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Pending Worker Approvals</span>
          </div>
          <div className={styles.cardBody}>
            {[...byContractor.entries()].map(([company, workers]) => (
              <div key={company} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  {company} — {workers.length} worker{workers.length > 1 ? 's' : ''} pending
                </div>
                {workers.map((w) => (
                  <div className={styles.feedItem} key={w.person_id}>
                    <div className={styles.feedDot} style={{ background: 'var(--amber)' }} />
                    <div className={styles.feedText}>
                      {w.full_name} — {w.mobile} {w.camp_location ? `· ${w.camp_location.replace(/_/g, ' ')}` : ''}
                    </div>
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => approve(w.person_id)}>
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Monthly Billing Recovery</span>
          <span className={styles.cardSub}>Registered count × system_config rate</span>
        </div>
        <BillingTable />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Active Contractors</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Company</th>
                <th>POC</th>
                <th>Contract Type</th>
                <th>Department</th>
                <th>Workers</th>
                <th>Contract End</th>
              </tr>
            </thead>
            <tbody>
              {contractors === null && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    Loading…
                  </td>
                </tr>
              )}
              {contractors?.map((c) => (
                <tr key={c.contractor_id}>
                  <td style={{ fontWeight: 600 }}>{c.company_name}</td>
                  <td style={{ fontSize: 12 }}>
                    {c.poc_name}
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.poc_mobile}</div>
                  </td>
                  <td>
                    <span className={`${styles.tag} ${styles.tagGrey}`}>{c.contract_type}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{c.dept_name || '—'}</td>
                  <td className={styles.mono}>{c.worker_count}</td>
                  <td style={{ fontSize: 12 }}>{c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
              {contractors && contractors.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    No approved contractors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
