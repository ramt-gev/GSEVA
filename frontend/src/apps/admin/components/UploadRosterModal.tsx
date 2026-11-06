import { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import type { RosterRow } from '../../../lib/endpoints/admin';

interface Props {
  personType: 'brahmachari' | 'varishtha_vaishnava';
  label: string;
  onClose: () => void;
  onImported: () => void;
}

// Column-name matching is deliberately loose (case/space/underscore
// insensitive, common synonyms) since this reads whatever roster the ashram
// office already has — we don't control its exact header row.
const HEADER_ALIASES: Record<string, keyof RosterRow> = {
  fullname: 'full_name',
  name: 'full_name',
  mobile: 'mobile',
  mobilenumber: 'mobile',
  phone: 'mobile',
  phonenumber: 'mobile',
  contact: 'mobile',
  gender: 'gender',
  sex: 'gender',
  dateofbirth: 'date_of_birth',
  dob: 'date_of_birth',
  campuslocation: 'campus_location',
  location: 'campus_location',
  accommodation: 'campus_location',
  room: 'campus_location',
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z]/g, '');
}

function parseWorkbook(buffer: ArrayBuffer): RosterRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return raw.map((rawRow) => {
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawRow)) {
      const field = HEADER_ALIASES[normalizeHeader(key)];
      if (!field || value === '' || value === undefined || value === null) continue;
      fields[field] = String(value).trim();
    }
    return { full_name: '', mobile: '', ...fields };
  });
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Full Name', 'Mobile', 'Gender', 'Date of Birth', 'Campus Location'],
    ['e.g. Sri Nandanandan P', '9876543210', 'male', '1985-01-15', 'Brahmachari Ashram'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Roster');
  XLSX.writeFile(wb, 'ashram-roster-template.xlsx');
}

export default function UploadRosterModal({ personType, label, onClose, onImported }: Props) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<adminApi.BulkImportResult | null>(null);

  function handleFile(file: File) {
    setParseError('');
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseWorkbook(reader.result as ArrayBuffer);
        const valid = parsed.filter((r) => r.full_name || r.mobile);
        if (valid.length === 0) {
          setParseError("Couldn't find any rows with a name or mobile number — check the file matches the template format.");
          setRows(null);
          return;
        }
        setRows(valid);
      } catch {
        setParseError('Could not read this file. Make sure it is a valid .xlsx, .xls, or .csv file.');
        setRows(null);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function submit() {
    if (!rows) return;
    setSubmitting(true);
    try {
      const res = await adminApi.ashramBulkImport(personType, rows);
      setResult(res);
      onImported();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span className={styles.modalTitle}>Upload Roster — {label}</span>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!result && (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>
                Upload an Excel (.xlsx) or CSV file with columns for <strong>Full Name</strong> and <strong>Mobile</strong>
                (Gender, Date of Birth, and Campus Location are optional). Anyone whose mobile number already exists gets
                updated; everyone else is added as a new {label.toLowerCase()} with a QR pass.
              </div>
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} style={{ alignSelf: 'flex-start' }} onClick={downloadTemplate}>
                ⬇ Download template
              </button>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />

              {parseError && <div style={{ color: 'var(--red)', fontSize: 12.5 }}>{parseError}</div>}

              {rows && (
                <div style={{ background: 'var(--surface, #f8eee4)', borderRadius: 8, padding: 12, fontSize: 12.5 }}>
                  <strong>{fileName}</strong> — found {rows.length} row{rows.length === 1 ? '' : 's'} with a name or mobile.
                  <div style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto' }}>
                    {rows.slice(0, 8).map((r, i) => (
                      <div key={i} style={{ color: 'var(--text3)' }}>
                        {r.full_name || '(no name)'} — {r.mobile || '(no mobile)'}
                      </div>
                    ))}
                    {rows.length > 8 && <div style={{ color: 'var(--text3)' }}>… and {rows.length - 8} more</div>}
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={`${styles.callout} ${result.failed > 0 ? styles.warn : styles.ok}`}>
                <span className={styles.calloutIcon}>{result.failed > 0 ? '⚠️' : '✅'}</span>
                <div className={styles.calloutBody}>
                  <strong>Import complete</strong>
                  {result.created} created · {result.updated} updated{result.failed > 0 ? ` · ${result.failed} failed` : ''}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {result.errors.map((e) => (
                    <div key={e.row}>
                      Row {e.row} ({e.name}): {e.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles.modalFoot}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!rows || submitting} onClick={submit}>
              {submitting ? 'Importing…' : `Import ${rows?.length ?? ''} rows`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
