import { useState } from 'react';
import styles from '../canteen.module.css';
import { QrScanner } from '../../../components/QrScanner';
import { useHardwareScannerInput } from '../../../components/useHardwareScannerInput';
import KhichadiCounterPanel from './KhichadiCounterPanel';
import ResultOverlay from './ResultOverlay';
import DashboardTab from './DashboardTab';
import TodayListTab from './TodayListTab';
import { isKhichadi, type CurrentMeal, type ResultData } from '../useCanteenSession';

type Tab = 'scan' | 'dashboard' | 'list';

interface Props {
  currentMeal: CurrentMeal;
  tapCount: number;
  scanCount: number;
  result: ResultData | null;
  onScan: (qrId: string) => void;
  onChangeTap: (delta: number) => void;
  onChangeKpCount: (delta: number) => void;
  onDismissResult: () => void;
  onBack: () => void;
}

export default function ScanScreen({
  currentMeal, tapCount, scanCount, result,
  onScan, onChangeTap, onChangeKpCount, onDismissResult, onBack,
}: Props) {
  const [tab, setTab] = useState<Tab>('scan');
  const [camMessage, setCamMessage] = useState<string | null>('Starting camera…');
  const khichadi = isKhichadi(currentMeal.id);
  const cameraActive = tab === 'scan' && !khichadi;

  useHardwareScannerInput(onScan, tab === 'scan');

  const badgeStyle =
    khichadi
      ? { background: 'rgba(112,61,26,0.12)', color: '#703d1a', border: '1px solid rgba(112,61,26,0.2)' }
      : currentMeal.mode === 'scan_only'
        ? { background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.2)' }
        : { background: 'rgba(85,107,47,0.12)', color: '#556B2F', border: '1px solid rgba(85,107,47,0.2)' };
  const badgeText = khichadi ? 'Counter Only' : currentMeal.mode === 'scan_only' ? 'Scan Only' : 'Scan + Tap';
  const hintText = currentMeal.mode === 'scan_only' ? "Scan registered person's QR code" : 'Scan QR or use tap counter below';

  return (
    <div className={styles.scanScreen}>
      <div className={styles.topbar}>
        <div style={{ flex: 1 }}>
          <div className={styles.tbTitle}>{currentMeal.name}</div>
          <div className={styles.tbTime}>{currentMeal.time}</div>
        </div>
        <span className={styles.tbMeal} style={badgeStyle}>
          {badgeText}
        </span>
        <button className={styles.tbBtn} style={{ marginLeft: 8 }} onClick={onBack}>
          Back
        </button>
      </div>

      {tab === 'scan' && khichadi && (
        <KhichadiCounterPanel meal={currentMeal} tapCount={tapCount} scanCount={scanCount} onChange={onChangeKpCount} />
      )}

      {tab === 'scan' && !khichadi && (
        <div className={styles.scanCameraArea}>
          <QrScanner active={cameraActive} onScan={onScan} onError={setCamMessage} elementId="qr-reader" />
          {camMessage && <div className={styles.camStatusPill}>{camMessage}</div>}
          <div className={styles.scanFrameBox}>
            <div className={`${styles.sfbCorner} ${styles.sfbTl}`} />
            <div className={`${styles.sfbCorner} ${styles.sfbTr}`} />
            <div className={`${styles.sfbCorner} ${styles.sfbBl}`} />
            <div className={`${styles.sfbCorner} ${styles.sfbBr}`} />
            <div className={styles.sfbScanLine} />
          </div>
          <div className={styles.scanHintText}>{hintText}</div>
        </div>
      )}

      {tab === 'scan' && !khichadi && currentMeal.mode !== 'scan_only' && (
        <div className={styles.tapSection}>
          <div className={styles.tapLabel}>No QR — Tap Counter (Fallback)</div>
          <div className={styles.tapRow}>
            <button className={`${styles.tapBtn} ${styles.tapMinus}`} onClick={() => onChangeTap(-1)}>
              −
            </button>
            <div className={styles.tapCountWrap}>
              <div className={styles.tapCount}>{tapCount}</div>
              <div className={styles.tapCountSub}>no-QR visitors today</div>
            </div>
            <button className={`${styles.tapBtn} ${styles.tapPlus}`} onClick={() => onChangeTap(1)}>
              +
            </button>
          </div>
        </div>
      )}

      {tab === 'scan' && !khichadi && (
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <div className={`${styles.statNum} ${styles.snG}`}>{scanCount}</div>
            <div className={styles.statLbl}>QR Scanned</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statNum} ${styles.snB}`}>{tapCount}</div>
            <div className={styles.statLbl}>Tap (no QR)</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statNum} ${styles.snS}`}>{scanCount + tapCount}</div>
            <div className={styles.statLbl}>Total Today</div>
          </div>
        </div>
      )}

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'list' && <TodayListTab currentMeal={currentMeal} />}

      <div className={styles.scanBottomBar}>
        <div className={styles.scanPillWrap}>
          <button className={`${styles.spwBtn} ${tab === 'scan' ? styles.active : ''}`} onClick={() => setTab('scan')}>
            Scan QR
          </button>
          <button className={`${styles.spwBtn} ${tab === 'dashboard' ? styles.active : ''}`} onClick={() => setTab('dashboard')}>
            Dashboard
          </button>
          <button className={`${styles.spwBtn} ${tab === 'list' ? styles.active : ''}`} onClick={() => setTab('list')}>
            Today's List
          </button>
        </div>
      </div>

      {result && <ResultOverlay result={result} onDismiss={onDismissResult} />}
    </div>
  );
}
