import type { ReactNode } from 'react';
import styles from '../styles/backoffice.module.css';
import { useAuth } from '../lib/auth';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface Props {
  brandName: string;
  brandNameSize?: number; // px override — Admin/Dashboard keep the CSS default (26px)
  brandSub: string;
  sections: NavSection[];
  activeId: string;
  onNavigate: (id: string) => void;
  topbarTitle: string;
  topbarSub: string;
  topbarExtra?: ReactNode;
  children: ReactNode;
}

// Shared sidebar+topbar shell for Admin Portal and Dashboard Reports — the
// two prototypes' shells are near-identical (same CSS variable names,
// structure) per direct comparison; one component instead of two copies.
export default function AppShell({
  brandName, brandNameSize, brandSub, sections, activeId, onNavigate, topbarTitle, topbarSub, topbarExtra, children,
}: Props) {
  const { user, logout } = useAuth();

  return (
    <div className={styles.appRoot}>
      <div className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/logo.svg" alt="GEV" style={{ height: 60 }} />
          <div>
            <div className={styles.brandName} style={brandNameSize ? { fontSize: brandNameSize } : undefined}>{brandName}</div>
            <div className={styles.brandSub}>{brandSub}</div>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <div className={styles.navSection}>{section.title}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${activeId === item.id ? styles.active : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLbl}>{item.label}</span>
                {item.badge !== undefined && <span className={styles.navBadge}>{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarUser}>{user?.full_name || user?.username}</div>
          {user?.role.replace(/_/g, ' ')} · Live view
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.liveDot} />
          <div>
            <span className={styles.topbarTitle}>{topbarTitle}</span>
            <span className={styles.topbarSub}>{topbarSub}</span>
          </div>
          <div className={styles.topbarRight}>
            <span style={{ fontSize: 11, color: 'var(--text2)', marginRight: 8 }}>{user?.full_name}</span>
            <button className={styles.topbarBtn} onClick={logout}>
              Sign Out
            </button>
            {topbarExtra}
          </div>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
