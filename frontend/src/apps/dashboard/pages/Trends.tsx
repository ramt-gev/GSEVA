import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as reportsApi from '../../../lib/endpoints/reports';
import BarChart from '../BarChart';

const CATEGORIES: reportsApi.VisitorCategory[] = [
  'Day Visitors', 'Staff & Family', 'Volunteers/Students', 'Labourers', 'Room Guests', 'Ashram', 'Others',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Day Visitors': 'var(--blue)',
  'Staff & Family': 'var(--purple)',
  'Volunteers/Students': 'var(--teal)',
  Labourers: 'var(--amber)',
  'Room Guests': 'var(--saffron)',
  Ashram: 'var(--green)',
  Others: 'var(--text3)',
};

const CATEGORY_TAG: Record<string, keyof typeof styles> = {
  'Day Visitors': 'tagB',
  'Staff & Family': 'tagP',
  'Volunteers/Students': 'tagT',
  Labourers: 'tagA',
  'Room Guests': 'tagO',
  Ashram: 'tagG',
  Others: 'tagGrey',
};

const PAGE_SIZE = 50;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export default function Trends() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<reportsApi.RegistrationsReport | null>(null);

  useEffect(() => {
    setData(null);
    reportsApi
      .registrationsReport({
        from,
        to,
        category: selected.size ? Array.from(selected).join(',') : undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then(setData)
      .catch(() => setData({ from, to, trend: [], totals: [], rows: [], total: 0, page: 1, limit: PAGE_SIZE }));
  }, [from, to, selected, search, page]);

  function toggleCategory(cat: string) {
    setPage(1);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const grandTotal = data?.totals.reduce((sum, t) => sum + t.count, 0) ?? 0;

  const dailyTotals = new Map<string, number>();
  for (const t of data?.trend ?? []) dailyTotals.set(t.date, (dailyTotals.get(t.date) ?? 0) + t.count);
  const chartData = Array.from(dailyTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ label: date.slice(5), value }));

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>📅</span>
          <span className={styles.cardTitle}>Registration Date Range</span>
          <div className={styles.cardActions} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className={styles.dashInput}
              style={{ padding: '6px 10px', fontSize: 12 }}
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
            />
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>to</span>
            <input
              className={styles.dashInput}
              style={{ padding: '6px 10px', fontSize: 12 }}
              type="date"
              value={to}
              min={from}
              max={daysAgo(0)}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
            />
          </div>
        </div>
        <div className={styles.cardBody} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.tag} ${styles[CATEGORY_TAG[cat]]}`}
              style={{
                cursor: 'pointer', border: selected.has(cat) ? '1.5px solid currentColor' : '1.5px solid transparent',
                opacity: selected.size === 0 || selected.has(cat) ? 1 : 0.45,
              }}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
          {selected.size > 0 && (
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              onClick={() => {
                setPage(1);
                setSelected(new Set());
              }}
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <div className={styles.g3}>
        <div>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>📈</span>
              <span className={styles.cardTitle}>Registrations per Day</span>
              <span className={styles.cardSub}>{from} → {to}</span>
            </div>
            <div className={styles.cardBody}>
              {data ? (
                chartData.length ? (
                  <BarChart data={chartData} color="#703d1a" />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>No registrations in this range.</div>
                )
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>👥</span>
              <span className={styles.cardTitle}>By Visitor Type</span>
              <span className={styles.cardSub}>{grandTotal} total</span>
            </div>
            <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
              {data?.totals.map((t) => (
                <div className={styles.legendItem} key={t.category} style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <div className={styles.legDot} style={{ background: CATEGORY_COLORS[t.category] }} />
                  <span className={styles.legLbl} style={{ flex: 1 }}>{t.category}</span>
                  <span className={styles.legVal}>{t.count}</span>
                </div>
              ))}
              {data && data.totals.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No registrations in this range.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>📋</span>
          <span className={styles.cardTitle}>Registrations</span>
          <span className={styles.cardSub}>{data ? `${data.total} people` : 'Loading…'}</span>
          <div className={styles.cardActions}>
            <input
              className={styles.dashInput}
              style={{ padding: '6px 10px', fontSize: 12, width: 200 }}
              placeholder="Search name or mobile…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Person</th>
                <th>Type</th>
                <th>Category</th>
                <th>Department</th>
                <th>Status</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {data === null && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    Loading…
                  </td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.person_id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.mobile}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.person_type.replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`${styles.tag} ${styles[CATEGORY_TAG[r.category] || 'tagGrey']}`}>{r.category}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.dept_name || '—'}</td>
                  <td>
                    <span className={`${styles.tag} ${r.status === 'on_campus' ? styles.tagG : styles.tagGrey}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={styles.mono} style={{ fontSize: 11 }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {data && data.rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    No registrations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 16px' }}>
            <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>
              Page {page} of {totalPages}
            </span>
            <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
