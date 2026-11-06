import { useState } from 'react';
import { PackageCheck, ClipboardCheck } from 'lucide-react';
import styles from '../../../styles/backoffice.module.css';
import KitchenShell, { type KitchenTab } from '../components/KitchenShell';
import { useKitchenToast } from '../useKitchenToast';
import DistributionBoardTab from '../components/DistributionBoardTab';
import CollectionStatusTab from '../components/CollectionStatusTab';

const ICON_SIZE = 16;
const TABS: KitchenTab[] = [
  { id: 'today', label: "Today's Distribution", icon: <PackageCheck size={ICON_SIZE} /> },
  { id: 'collection', label: 'Collection / Delivery Status', icon: <ClipboardCheck size={ICON_SIZE} /> },
];

export default function CollectionDashboard() {
  const [tab, setTab] = useState('today');
  const { message, notify } = useKitchenToast();

  return (
    <KitchenShell brandSub="Collection & Distribution" topbarSub="Hare Krishna · Collection & Distribution" tabs={TABS} activeTab={tab} onTabChange={setTab} toast={message}>
      <div className={`${styles.callout} ${styles.warn}`}>
        <span className={styles.calloutIcon}>ℹ️</span>
        <div className={styles.calloutBody}>
          This role has no access to Menu, Storage, Special Requests, or CPD Procurement, and cannot approve anything.
          It only sees today&apos;s finalized BLD, Khichdi, and Preaching Program items, and records collection/delivery status.
        </div>
      </div>
      {tab === 'today' && <DistributionBoardTab />}
      {tab === 'collection' && <CollectionStatusTab notify={notify} />}
    </KitchenShell>
  );
}
