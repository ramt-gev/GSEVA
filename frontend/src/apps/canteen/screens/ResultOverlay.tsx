import { useEffect } from 'react';
import { CircleCheckBig, CircleX, Leaf, TriangleAlert } from 'lucide-react';
import styles from '../canteen.module.css';
import type { ResultData } from '../useCanteenSession';

const KIND_STYLES: Record<ResultData['kind'], { overlay: string; icon: React.ReactNode; dismissLabel: string }> = {
  served: { overlay: styles.roServed, icon: <CircleCheckBig size={52} color="#16A34A" />, dismissLabel: 'Next' },
  already: { overlay: styles.roAlready, icon: <TriangleAlert size={52} color="#703d1a" />, dismissLabel: 'Back' },
  denied: { overlay: styles.roDenied, icon: <CircleX size={52} color="#EF4444" />, dismissLabel: 'Back' },
  free: { overlay: styles.roFree, icon: <Leaf size={52} color="#556B2F" />, dismissLabel: 'Next' },
};

interface Props {
  result: ResultData;
  onDismiss: () => void;
}

export default function ResultOverlay({ result, onDismiss }: Props) {
  const kindStyle = KIND_STYLES[result.kind];

  const isGroup = (result.kind === 'served' || result.kind === 'free') && (result.groupSize || 1) > 1;

  useEffect(() => {
    // Groups need longer on screen — the operator has to read "serve N
    // plates" and actually count them out, not just glance and dismiss.
    const timer = setTimeout(onDismiss, isGroup ? 6000 : 3000);
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss();
    window.addEventListener('keydown', onEscape);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onEscape);
    };
  }, [result, onDismiss, isGroup]);

  return (
    <div className={styles.resultOverlay}>
      <div className={`${styles.resultCard} ${kindStyle.overlay}`}>
        <div className={styles.rIcon}>{kindStyle.icon}</div>
        <div className={styles.rStatus}>{result.status}</div>
        <div className={styles.rName}>{result.name}</div>
        <div className={`${styles.rBadge}`}>{result.type}</div>
        <div className={styles.rDetail}>{result.detail}</div>
        {isGroup && <div className={styles.rGroupBadge}>👪 Group of {result.groupSize} — serve {result.groupSize} plates</div>}
        <button className={styles.rDismiss} onClick={onDismiss}>
          {kindStyle.dismissLabel}
        </button>
      </div>
    </div>
  );
}
