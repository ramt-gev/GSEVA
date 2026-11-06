import styles from '../register.module.css';
import type { Member } from '../types';

const ICONS = ['👤', '👤', '👶', '👶', '👴', '👵', '👤', '👤', '👶', '👶'];

interface Props {
  members: Member[];
  onChange: (members: Member[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function GroupMembers({ members, onChange, onContinue, onBack }: Props) {
  function update(index: number, patch: Partial<Member>) {
    const next = members.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function handleContinue() {
    if (!members[0]?.name.trim()) {
      alert("Please enter the leader's name.");
      return;
    }
    onContinue();
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Group Members</div>
      <div className={styles.sectionSub}>Please provide details for each person in your group.</div>

      {members.map((member, i) => (
        <div className={styles.memberCard} key={i}>
          <div className={styles.memberHeader}>
            <div className={styles.memberAv}>{ICONS[i] || '👤'}</div>
            <div className={styles.memberTitle}>{i === 0 ? 'You (Group Leader)' : `Member ${i + 1}`}</div>
          </div>
          <div className={styles.memberFields}>
            <div className={`${styles.field} ${styles.memberFieldFull}`}>
              <div className={styles.fieldLabel}>Full Name *</div>
              <input
                type="text"
                placeholder="Full name"
                value={member.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Age</div>
              <input
                type="number"
                placeholder="Age"
                min={1}
                max={120}
                value={member.age}
                onChange={(e) => update(i, { age: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Gender</div>
              <select value={member.gender} onChange={(e) => update(i, { gender: e.target.value })}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className={styles.btnPrimary} onClick={handleContinue}>
        Continue →
      </button>
      <button type="button" className={styles.btnSecondary} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
