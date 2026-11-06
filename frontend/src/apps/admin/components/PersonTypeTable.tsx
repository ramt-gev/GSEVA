import { Fragment, useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import * as gateApi from '../../../lib/endpoints/gate';
import { ApiError } from '../../../lib/api';

const VOLUNTEER_TYPES = new Set(['volunteer_seva', 'sustainability_intern']);

const TYPE_TAG: Record<string, keyof typeof styles> = {
  room_guest: 'tagO',
  free_day_visitor: 'tagGrey',
  paid_day_visitor: 'tagA',
  corporate_tour_group: 'tagP',
  vip_dignitary: 'tagR',
  resident_staff: 'tagP',
  staff_dependant: 'tagGrey',
  volunteer_seva: 'tagT',
  sustainability_intern: 'tagT',
  course_student: 'tagB',
  brahmachari: 'tagT',
  varishtha_vaishnava: 'tagT',
  construction_labourer: 'tagA',
  weekly_labourer_local: 'tagA',
  weekly_labourer_outstation: 'tagA',
  vendor_supplier: 'tagB',
};

interface Props {
  types: string; // comma-separated person_type list
  emptyLabel: string;
  pageSize?: number;
  refreshKey?: number; // bump to force a refetch (e.g. after a bulk import)
  showDepartment?: boolean; // Guests & Day Visitors aren't dept-affiliated
  showPresentToday?: boolean; // meaningful for staff/volunteers, not one-off visitors
}

// Shared table for the 5 "by visitor type" pages (Guests/Staff/Seva/Students/
// Ashram) — all backed by the same Phase-0-extended GET /api/admin/persons
// (now accepts comma-separated `type`, returns a real `total`).
export default function PersonTypeTable({
  types, emptyLabel, pageSize = 50, refreshKey = 0, showDepartment = true, showPresentToday = true,
}: Props) {
  const [result, setResult] = useState<adminApi.PersonsByTypeResult | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sevaTarget, setSevaTarget] = useState<{ person_id: string; full_name: string; check_in_date?: string | null; check_out_date?: string | null } | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [sevaError, setSevaError] = useState('');
  const [sevaSubmitting, setSevaSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<{ person_id: string; full_name: string } | null>(null);
  const [editBlock, setEditBlock] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editMeals, setEditMeals] = useState<Set<'breakfast' | 'dinner'>>(new Set());
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  function load() {
    setResult(null);
    adminApi
      .personsByType({ type: types, page, limit: pageSize, search: search || undefined })
      .then(setResult)
      .catch(() => setResult({ data: [], count: 0, total: 0, page: 1, limit: pageSize }));
  }
  useEffect(load, [types, page, search, pageSize, refreshKey]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / pageSize)) : 1;
  const colCount = 11 - (showDepartment ? 0 : 1) - (showPresentToday ? 0 : 1);

  // Which side of "Extend / Reduce & Close" a picked date resolves to —
  // later than the current end date extends, anything else closes. null
  // until a date is actually picked, so the modal doesn't presume either way.
  const sevaResolvedAction: 'extend' | 'close' | null =
    !newEndDate || !sevaTarget ? null
      : sevaTarget.check_out_date && newEndDate > sevaTarget.check_out_date ? 'extend'
      : 'close';

  function openSevaModal(person_id: string, full_name: string, checkIn?: string | null, checkOut?: string | null) {
    setSevaTarget({ person_id, full_name, check_in_date: checkIn, check_out_date: checkOut });
    setNewEndDate('');
    setRemarks('');
    setSevaError('');
  }

  async function confirmSevaAction() {
    if (!sevaTarget || !newEndDate || !sevaResolvedAction) return;
    setSevaSubmitting(true);
    setSevaError('');
    try {
      if (sevaResolvedAction === 'extend') {
        await adminApi.extendVolunteerSeva(sevaTarget.person_id, newEndDate);
      } else {
        await adminApi.reduceAndCloseVolunteer(sevaTarget.person_id, newEndDate, remarks.trim() || undefined);
      }
      setSevaTarget(null);
      load();
    } catch (err) {
      setSevaError(err instanceof ApiError ? err.message : `Could not ${sevaResolvedAction === 'extend' ? 'extend' : 'close out'} this seva period.`);
    } finally {
      setSevaSubmitting(false);
    }
  }

  function openEditModal(p: adminApi.AdminPersonRow) {
    setEditTarget({ person_id: p.person_id, full_name: p.full_name });
    setEditBlock(p.accommodation_block || '');
    setEditRoom(p.room_number || '');
    setEditMeals(new Set(p.meal_registrations.map((m) => m.meal_type) as ('breakfast' | 'dinner')[]));
    setEditError('');
  }

  function toggleEditMeal(meal: 'breakfast' | 'dinner') {
    setEditMeals((prev) => {
      const next = new Set(prev);
      if (next.has(meal)) next.delete(meal);
      else next.add(meal);
      return next;
    });
  }

  async function confirmEdit() {
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      await adminApi.updateAccommodationMeals(editTarget.person_id, {
        accommodation_block: editBlock.trim(),
        room_number: editRoom.trim(),
        meals: Array.from(editMeals),
      });
      setEditTarget(null);
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Could not save accommodation/meal details.');
    } finally {
      setEditSubmitting(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{emptyLabel}</span>
        <span className={styles.cardSub}>{result ? `${result.total} total` : 'Loading…'}</span>
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
              {showDepartment && <th>Department</th>}
              <th>Registered On</th>
              <th>Check-in / out</th>
              <th>Accommodation</th>
              <th>Food (Annakshetra)</th>
              {showPresentToday && <th>Present Today</th>}
              <th>Group</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {result === null && (
              <tr>
                <td colSpan={colCount} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                  Loading…
                </td>
              </tr>
            )}
            {result?.data.map((p) => {
              const stay = p.stays?.[0];
              const activePass = p.qr_passes?.find((q) => q.is_active);
              const members = activePass?.group_members || [];
              const groupSize = activePass?.group_size ?? 1;
              const isExpanded = expanded.has(p.person_id);
              return (
                <Fragment key={p.person_id}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.mobile}</div>
                    </td>
                    <td>
                      <span className={`${styles.tag} ${styles[TYPE_TAG[p.person_type] || 'tagGrey']}`}>{p.person_type.replace(/_/g, ' ')}</span>
                    </td>
                    {showDepartment && <td style={{ fontSize: 12 }}>{p.department?.dept_name || '—'}</td>}
                    <td className={styles.mono} style={{ fontSize: 11 }}>
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {stay?.check_in_date ? new Date(stay.check_in_date).toLocaleDateString('en-IN') : '—'}
                      {stay?.check_out_date ? ` → ${new Date(stay.check_out_date).toLocaleDateString('en-IN')}` : ''}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {(() => {
                        const block = stay?.accommodation_block || p.accommodation_block;
                        const room = stay?.room_number || p.room_number;
                        return block ? `${block}${room ? ` / ${room}` : ''}` : '—';
                      })()}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {p.meal_registrations.length > 0
                        ? p.meal_registrations.map((m) => m.meal_type).join(', ')
                        : <span style={{ color: 'var(--text3)' }}>Not registered</span>}
                    </td>
                    {showPresentToday && (
                      <td>
                        <span className={`${styles.tag} ${p.present_today ? styles.tagG : styles.tagGrey}`}>
                          {p.present_today ? '✓ Present' : 'Absent'}
                        </span>
                      </td>
                    )}
                    <td>
                      {groupSize > 1 ? (
                        <button
                          className={`${styles.tag} ${styles.tagB}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => toggleExpanded(p.person_id)}
                        >
                          {groupSize} people {isExpanded ? '▲' : '▼'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Solo</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.tag} ${p.status === 'on_campus' ? styles.tagG : styles.tagGrey}`}>
                        {p.status === 'on_campus' ? '✓ On Campus' : p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {activePass ? (
                          <a className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} style={{ textDecoration: 'none' }} href={gateApi.passPdfUrl(activePass.qr_id)} target="_blank" rel="noreferrer">
                            Pass
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text3)', fontSize: 11 }}>No QR</span>
                        )}
                        {VOLUNTEER_TYPES.has(p.person_type) && p.status === 'on_campus' && (
                          <button
                            className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                            onClick={() => openSevaModal(p.person_id, p.full_name, stay?.check_in_date, stay?.check_out_date)}
                          >
                            Extend / Reduce &amp; Close
                          </button>
                        )}
                        <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => openEditModal(p)}>
                          Edit Accommodation / Meals
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && groupSize > 1 && (
                    <tr>
                      <td colSpan={colCount} style={{ background: 'var(--surface, #f8eee4)', padding: '10px 16px' }}>
                        {members.length === 0 ? (
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                            Group of {groupSize} registered, but individual member details weren't recorded.
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                            {members
                              .slice()
                              .sort((a, b) => a.member_number - b.member_number)
                              .map((m) => (
                                <div key={m.member_id} style={{ fontSize: 12 }}>
                                  <strong>{m.full_name}</strong>
                                  <span style={{ color: 'var(--text3)' }}>
                                    {' '}
                                    {[m.relation_to_leader, m.age ? `${m.age}y` : null, m.gender && m.gender !== 'not_specified' ? m.gender : null]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {result && result.data.length === 0 && (
              <tr>
                <td colSpan={colCount} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {result && totalPages > 1 && (
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

      {sevaTarget && (
        <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && setSevaTarget(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span style={{ fontSize: 18 }}>📅</span>
              <span className={styles.modalTitle}>Extend / Reduce &amp; Close Seva</span>
              <button className={styles.modalClose} onClick={() => setSevaTarget(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 0 }}>
                Pick a new end date for <strong>{sevaTarget.full_name}</strong>&apos;s seva
                {sevaTarget.check_out_date ? <> — currently ends {new Date(sevaTarget.check_out_date).toLocaleDateString('en-IN')}</> : null}.
                A later date extends it; today or earlier closes it out.
              </p>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                New End Date
              </label>
              <input
                className={styles.dashInput}
                style={{ padding: '8px 10px' }}
                type="date"
                min={sevaTarget.check_in_date || undefined}
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />

              {sevaResolvedAction === 'extend' && (
                <div className={`${styles.callout} ${styles.info}`} style={{ marginTop: 14, marginBottom: 0 }}>
                  <span className={styles.calloutIcon}>📅</span>
                  <div className={styles.calloutBody}>
                    <strong>This will extend their seva.</strong>
                    Their stay stays active and their QR pass validity moves out to match.
                  </div>
                </div>
              )}

              {sevaResolvedAction === 'close' && (
                <>
                  <div className={`${styles.callout} ${styles.warn}`} style={{ marginTop: 14, marginBottom: 14 }}>
                    <span className={styles.calloutIcon}>⏹️</span>
                    <div className={styles.calloutBody}>
                      <strong>This will end their seva early.</strong>
                      Closes their current stay, revokes their QR pass (if the date is today or earlier), and marks them departed.
                    </div>
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                    Remarks (optional)
                  </label>
                  <textarea
                    className={styles.dashInput}
                    style={{ padding: '8px 10px', minHeight: 60, resize: 'vertical' }}
                    placeholder="e.g. reason for ending seva early"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </>
              )}

              {sevaError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 10 }}>{sevaError}</div>}
            </div>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setSevaTarget(null)}>
                Cancel
              </button>
              <button
                className={`${styles.btn} ${sevaResolvedAction === 'close' ? styles.btnDanger : styles.btnPrimary}`}
                disabled={!sevaResolvedAction || sevaSubmitting}
                onClick={confirmSevaAction}
              >
                {sevaSubmitting ? 'Saving…' : sevaResolvedAction === 'close' ? 'Reduce & Close' : sevaResolvedAction === 'extend' ? 'Extend Seva' : 'Pick a date'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <span style={{ fontSize: 18 }}>🏠</span>
              <span className={styles.modalTitle}>Edit Accommodation / Meals</span>
              <button className={styles.modalClose} onClick={() => setEditTarget(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 0 }}>
                Set accommodation and Annakshetra meal enrollment for <strong>{editTarget.full_name}</strong>. Entered here manually — not
                sourced from Greythr.
              </p>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Accommodation Block
              </label>
              <input
                className={styles.dashInput}
                style={{ padding: '8px 10px', marginBottom: 14 }}
                placeholder="e.g. Block C"
                value={editBlock}
                onChange={(e) => setEditBlock(e.target.value)}
              />
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Room Number
              </label>
              <input
                className={styles.dashInput}
                style={{ padding: '8px 10px', marginBottom: 14 }}
                placeholder="e.g. C-204"
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
              />
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Meal Enrollment (Annakshetra)
              </label>
              <div style={{ display: 'flex', gap: 16 }}>
                {(['breakfast', 'dinner'] as const).map((meal) => (
                  <label key={meal} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, textTransform: 'capitalize' }}>
                    <input type="checkbox" checked={editMeals.has(meal)} onChange={() => toggleEditMeal(meal)} />
                    {meal}
                  </label>
                ))}
              </div>

              {editError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 10 }}>{editError}</div>}
            </div>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={editSubmitting} onClick={confirmEdit}>
                {editSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
