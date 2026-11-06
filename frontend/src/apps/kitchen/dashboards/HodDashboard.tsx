import { useState } from 'react';
import { CalendarClock, UtensilsCrossed, Utensils, Archive, Trash2, Star, Mic2 } from 'lucide-react';
import styles from '../../../styles/backoffice.module.css';
import KitchenShell, { type KitchenTab } from '../components/KitchenShell';
import { useKitchenToast } from '../useKitchenToast';
import HodMeetingTab from '../components/HodMeetingTab';
import MenuTab from '../components/MenuTab';
import BldTab from '../components/BldTab';
import StorageWastageTab from '../components/StorageWastageTab';
import SpecialRequestsTab from '../components/SpecialRequestsTab';
import PreachingTab from '../components/PreachingTab';
import KhichdiTab from '../components/KhichdiTab';

const ICON_SIZE = 16;
const TABS: KitchenTab[] = [
  { id: 'meeting', label: "Today's Meeting", icon: <CalendarClock size={ICON_SIZE} /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed size={ICON_SIZE} /> },
  { id: 'bld', label: 'BLD', icon: <Utensils size={ICON_SIZE} /> },
  { id: 'storage', label: 'Storage', icon: <Archive size={ICON_SIZE} /> },
  { id: 'wastage', label: 'Wastage', icon: <Trash2 size={ICON_SIZE} /> },
  { id: 'special', label: 'Special Requests', icon: <Star size={ICON_SIZE} /> },
  { id: 'preachkhichdi', label: 'Preaching & Khichdi', icon: <Mic2 size={ICON_SIZE} /> },
];

export default function HodDashboard() {
  const [tab, setTab] = useState('meeting');
  const { message, notify } = useKitchenToast();

  return (
    <KitchenShell brandSub="HOD" topbarSub="Hare Krishna · Kitchen HOD" tabs={TABS} activeTab={tab} onTabChange={setTab} toast={message}>
      {tab === 'meeting' && <HodMeetingTab notify={notify} />}
      {tab === 'menu' && <MenuTab canEdit={false} notify={notify} />}
      {tab === 'bld' && <BldTab canEdit={false} notify={notify} />}
      {tab === 'storage' && <StorageWastageTab recordType="STORAGE" canEdit={false} notify={notify} />}
      {tab === 'wastage' && <StorageWastageTab recordType="WASTAGE" canEdit={false} notify={notify} />}
      {tab === 'special' && <SpecialRequestsTab canDecide notify={notify} />}
      {tab === 'preachkhichdi' && (
        <>
          <div className={styles.callout} style={{ background: 'var(--surface, #f8eee4)', border: '1px solid var(--border, #e8ddd4)' }}>
            <span className={styles.calloutIcon}>📋</span>
            <div className={styles.calloutBody}>Both tables live on the same shared screen. View only.</div>
          </div>
          <PreachingTab canEdit={false} notify={notify} bare />
          <KhichdiTab canEdit={false} notify={notify} bare />
        </>
      )}
    </KitchenShell>
  );
}
