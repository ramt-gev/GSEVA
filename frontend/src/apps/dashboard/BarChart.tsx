import styles from '../../styles/backoffice.module.css';

interface Props {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
}

// Ports buildChart()'s pure-CSS-bar approach — no charting library needed
// for a single-series bar chart.
export default function BarChart({ data, color, height = 110 }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={styles.barChart} style={{ height }}>
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * 100);
        return (
          <div className={styles.barWrap} key={i}>
            <div className={styles.barVal}>{d.value}</div>
            <div className={styles.bar} style={{ height: `${h}%`, background: color, opacity: 0.5 + 0.5 * (d.value / max) }} />
          </div>
        );
      })}
    </div>
  );
}
