import type { ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
  span?: number;
}

// Matches the label+control pattern used across the Admin Portal's own
// entry forms (see RegisterPerson.tsx's local Field helper) — reused here
// instead of inventing a parallel one.
export default function Field({ label, children, span }: Props) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
