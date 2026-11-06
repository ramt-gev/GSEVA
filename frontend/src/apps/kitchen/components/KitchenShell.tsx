import type { ReactNode } from 'react';
import AppShell, { type NavSection } from '../../../components/AppShell';
import OverviewBar from './OverviewBar';

export interface KitchenTab {
  id: string;
  label: string;
  icon: ReactNode;
}

interface Props {
  brandSub: string;
  topbarSub: string;
  tabs: KitchenTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  toast: string | null;
  children: ReactNode;
}

export default function KitchenShell({ brandSub, topbarSub, tabs, activeTab, onTabChange, toast, children }: Props) {
  const sections: NavSection[] = [{ title: 'Kitchen', items: tabs }];
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label || '';

  return (
    <AppShell
      brandName="KITCHEN"
      brandNameSize={18}
      brandSub={brandSub}
      sections={sections}
      activeId={activeTab}
      onNavigate={onTabChange}
      topbarTitle={activeLabel}
      topbarSub={topbarSub}
    >
      <OverviewBar />
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 20, right: 20, background: 'var(--saffron)', color: '#fff',
            padding: '12px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            boxShadow: '0 8px 20px rgba(0,0,0,.18)', zIndex: 50,
          }}
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}
