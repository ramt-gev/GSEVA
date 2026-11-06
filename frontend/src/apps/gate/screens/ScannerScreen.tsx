import { useState } from 'react';
import styles from '../gate.module.css';
import { QrScanner } from '../../../components/QrScanner';
import { useHardwareScannerInput } from '../../../components/useHardwareScannerInput';
import { useClock, type GateOption } from '../useGateSession';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  gate: GateOption;
  stats: { allowed: number; denied: number; lastScanTime: string | null };
  onScan: (input: { qr_id?: string; mobile?: string }) => void;
  onNavEvents: () => void;
  onNavLogout: () => void;
}

export default function ScannerScreen({ gate, stats, onScan, onNavEvents, onNavLogout }: Props) {
  const clock = useClock();
  const [manualValue, setManualValue] = useState('');
  const [camMessage, setCamMessage] = useState<string | null>('Starting camera…');

  function submitManual() {
    const q = manualValue.trim();
    if (!q) {
      alert('Enter a mobile number or QR code to search.');
      return;
    }
    onScan(UUID_RE.test(q) ? { qr_id: q } : { mobile: q });
    setManualValue('');
  }

  function handleQrDecode(decoded: string) {
    onScan({ qr_id: decoded.trim() });
  }

  useHardwareScannerInput(handleQrDecode, true);

  return (
    <div className={`${styles.screen}`}>
      <div className={styles.topBar}>
        <div className={styles.gatePill}>
          <div className={styles.liveDot} />
          <span className={styles.gateLabelTxt}>{gate.name}</span>
        </div>
        <div className={styles.topBarRight}>
          <span className={styles.clockTxt}>{clock}</span>
          <div className={styles.iconBtn} onClick={onNavEvents}>
            📋
          </div>
        </div>
      </div>

      <div className={styles.scanBody}>
        <div className={styles.qrFrameWrap}>
          <div className={styles.qrFrameInner}>
            <QrScanner active onScan={handleQrDecode} onError={setCamMessage} elementId="gate-qr-reader" />
            <div className={`${styles.c} ${styles.cTl}`} />
            <div className={`${styles.c} ${styles.cTr}`} />
            <div className={`${styles.c} ${styles.cBl}`} />
            <div className={`${styles.c} ${styles.cBr}`} />
            <div className={styles.scanLn} />
            {camMessage && <div className={styles.camStatusPill}>{camMessage}</div>}
          </div>
        </div>
        <div>
          <div className={styles.scanInstrMain}>Show QR Code to Camera</div>
          <div className={styles.scanInstrSub}>Hold the visitor's QR code steady in front of the camera</div>
        </div>
        <div className={styles.manualRow}>
          <input
            type="text"
            className={styles.manualInp}
            placeholder="Or type mobile number / QR code manually"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
          />
          <button className={styles.searchBtn} onClick={submitManual}>
            🔍
          </button>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statCol}>
          <div className={`${styles.statNum} ${styles.g}`}>{stats.allowed}</div>
          <div className={styles.statLbl}>Allowed</div>
        </div>
        <div className={styles.statCol}>
          <div className={`${styles.statNum} ${styles.r}`}>{stats.denied}</div>
          <div className={styles.statLbl}>Denied</div>
        </div>
        <div className={styles.statCol}>
          <div className={`${styles.statNum} ${styles.s}`}>{stats.allowed + stats.denied}</div>
          <div className={styles.statLbl}>Total Today</div>
        </div>
        <div className={styles.statCol}>
          <div className={styles.statNum} style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {stats.lastScanTime || '—'}
          </div>
          <div className={styles.statLbl}>Last Scan</div>
        </div>
      </div>

      <div className={styles.bottomNav}>
        <button className={`${styles.bnavBtn} ${styles.active}`}>
          <span className={styles.bnavIcon}>📷</span>
          <span className={styles.bnavLabel}>Scanner</span>
        </button>
        <button className={styles.bnavBtn} onClick={onNavEvents}>
          <span className={styles.bnavIcon}>📋</span>
          <span className={styles.bnavLabel}>Events</span>
        </button>
        <button className={styles.bnavBtn} onClick={onNavLogout}>
          <span className={styles.bnavIcon}>🔓</span>
          <span className={styles.bnavLabel}>Logout</span>
        </button>
      </div>
    </div>
  );
}
