import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import type { SystemRole } from '../../../lib/types';

const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: 'Super Admin',
  management: 'Management',
  module_admin: 'Module Admin',
  dept_manager: 'Dept Manager',
  operator: 'Operator',
  kitchen_supervisor: 'Kitchen Supervisor',
  kitchen_hod: 'Kitchen HOD',
  kitchen_collection_distribution: 'Kitchen Collection/Distribution',
};

export default function Users() {
  const [users, setUsers] = useState<adminApi.SystemUserRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    adminApi.listUsers().then(setUsers).catch(() => setUsers([]));
  }
  useEffect(load, []);

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>System Users</span>
          <span className={styles.cardSub}>{users ? `${users.length} accounts` : 'Loading…'}</span>
          <div className={styles.cardActions}>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => setShowAdd(true)}>
              + Add User
            </button>
          </div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Role</th>
                <th>Module Access</th>
                <th>Status</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.user_id}>
                  <td style={{ fontWeight: 600 }}>{u.person?.full_name || '—'}</td>
                  <td className={styles.mono}>{u.username}</td>
                  <td>
                    <span className={`${styles.tag} ${styles.tagP}`}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td style={{ fontSize: 11 }}>{u.module_access.join(', ') || '—'}</td>
                  <td>
                    {u.is_locked ? (
                      <span className={`${styles.tag} ${styles.tagR}`}>Locked</span>
                    ) : u.is_active ? (
                      <span className={`${styles.tag} ${styles.tagG}`}>Active</span>
                    ) : (
                      <span className={`${styles.tag} ${styles.tagGrey}`}>Inactive</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>{u.last_login ? new Date(u.last_login).toLocaleString('en-IN') : 'Never'}</td>
                </tr>
              ))}
              {users && users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    No system users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={load} />}
    </>
  );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<adminApi.AdminPersonRow[]>([]);
  const [personId, setPersonId] = useState('');
  const [personLabel, setPersonLabel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SystemRole>('operator');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function runSearch(q: string) {
    setSearch(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await adminApi.personsByType({ search: q, limit: 8 });
    setResults(res.data);
  }

  async function submit() {
    setError('');
    if (!personId || !username || !password) {
      setError('Select a person, and provide a username and password.');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createUser({ person_id: personId, username, password, role });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <span style={{ fontSize: 18 }}>👤</span>
          <span className={styles.modalTitle}>Add New System User</span>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Search Person *</label>
            <input
              className={styles.dashInput}
              style={{ padding: '8px 10px' }}
              placeholder="Search by name or mobile…"
              value={personLabel || search}
              onChange={(e) => {
                setPersonLabel('');
                setPersonId('');
                runSearch(e.target.value);
              }}
            />
            {results.length > 0 && !personId && (
              <div style={{ border: '1px solid var(--border, #e8ddd4)', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {results.map((p) => (
                  <div
                    key={p.person_id}
                    style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border, #e8ddd4)' }}
                    onClick={() => {
                      setPersonId(p.person_id);
                      setPersonLabel(`${p.full_name} — ${p.mobile}`);
                      setResults([]);
                    }}
                  >
                    {p.full_name} — {p.mobile} ({p.person_type.replace(/_/g, ' ')})
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Username *</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Temporary Password *</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>System Role</label>
            <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as SystemRole)}>
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting} onClick={submit}>
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
