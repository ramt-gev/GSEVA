import { useEffect, useState } from 'react';
import { Soup, CloudSun, PartyPopper } from 'lucide-react';
import styles from '../../../styles/backoffice.module.css';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function OverviewBar() {
  const [data, setData] = useState<kitchenApi.KitchenOverview | null>(null);
  const [histDate, setHistDate] = useState('');
  const [histResult, setHistResult] = useState('');

  useEffect(() => {
    kitchenApi.overview().then(setData).catch(() => {});
  }, []);

  async function checkHistorical() {
    if (!histDate) return;
    try {
      const rec = await kitchenApi.historical(histDate);
      setHistResult(
        rec.total > 0
          ? `Total: ${rec.total}${rec.event ? ` · Event: ${rec.event}` : ' · No event that day'}`
          : `No recorded total for ${histDate}.`
      );
    } catch {
      setHistResult('Could not look up that date.');
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
      <div className={styles.card} style={{ marginBottom: 0 }}>
        <div className={styles.cardHead}>
          <Soup size={15} color="var(--saffron)" />
          <span className={styles.cardTitle}>Prasadam Count</span>
        </div>
        <div className={styles.cardBody}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0', color: 'var(--text2)' }}>
            <span>{data ? `Yesterday (${formatDateShort(data.yesterday.date)})` : 'Yesterday'}</span>
            <strong style={{ color: 'var(--text)' }}>{data?.yesterday.total ?? '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0', color: 'var(--text2)' }}>
            <span>{data ? `Today (${formatDateShort(data.today.date)})` : 'Today'}</span>
            <strong style={{ color: 'var(--text)' }}>{data?.today.total ?? '—'}</strong>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              className={styles.dashInput} type="date" style={{ padding: '6px 8px', fontSize: 11.5, flex: 1 }}
              value={histDate} onChange={(e) => setHistDate(e.target.value)}
            />
            <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={checkHistorical}>
              Historical
            </button>
          </div>
          {histResult && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{histResult}</div>}
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 0 }}>
        <div className={styles.cardHead}>
          <CloudSun size={15} color="var(--saffron)" />
          <span className={styles.cardTitle}>{data?.weather ? `Weather — ${formatDateShort(data.weather.date)}` : 'Weather'}</span>
        </div>
        <div className={styles.cardBody}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {data?.weather ? `${data.weather.temp_c}°C · ${data.weather.rain_mm}mm rain` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{data?.weather?.condition_text || 'No forecast recorded'}</div>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 0 }}>
        <div className={styles.cardHead}>
          <PartyPopper size={15} color="var(--saffron)" />
          <span className={styles.cardTitle}>{data?.event ? `Event — ${formatDateShort(data.event.date)}` : 'Event'}</span>
        </div>
        <div className={styles.cardBody}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{data?.event ? data.event.name : 'No upcoming festival'}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {data?.event?.expected_attendance ? `Expected attendance: ${data.event.expected_attendance}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
