import { useState } from 'react';
import {
  CalendarClock, UtensilsCrossed, Utensils, Archive, Trash2, Star, Mic2, Soup, Truck, CheckSquare,
} from 'lucide-react';
import KitchenShell, { type KitchenTab } from '../components/KitchenShell';
import { useKitchenToast } from '../useKitchenToast';
import SupervisorMeetingTab from '../components/SupervisorMeetingTab';
import MenuTab from '../components/MenuTab';
import BldTab from '../components/BldTab';
import StorageWastageTab from '../components/StorageWastageTab';
import SpecialRequestsTab from '../components/SpecialRequestsTab';
import PreachingTab from '../components/PreachingTab';
import KhichdiTab from '../components/KhichdiTab';
import CpdProcurementTab from '../components/CpdProcurementTab';
import FinalCountTab from '../components/FinalCountTab';

const ICON_SIZE = 16;
const TABS: KitchenTab[] = [
  { id: 'meeting', label: "Today's Meeting", icon: <CalendarClock size={ICON_SIZE} /> },
  { id: 'menu', label: 'Menu', icon: <UtensilsCrossed size={ICON_SIZE} /> },
  { id: 'bld', label: 'BLD', icon: <Utensils size={ICON_SIZE} /> },
  { id: 'storage', label: 'Storage', icon: <Archive size={ICON_SIZE} /> },
  { id: 'wastage', label: 'Wastage', icon: <Trash2 size={ICON_SIZE} /> },
  { id: 'special', label: 'Special Requests', icon: <Star size={ICON_SIZE} /> },
  { id: 'preaching', label: 'Preaching Programs', icon: <Mic2 size={ICON_SIZE} /> },
  { id: 'khichdi', label: 'Khichdi', icon: <Soup size={ICON_SIZE} /> },
  { id: 'cpd', label: 'CPD Procurement', icon: <Truck size={ICON_SIZE} /> },
  { id: 'finalcount', label: 'Final Distribution Count', icon: <CheckSquare size={ICON_SIZE} /> },
];

export default function SupervisorDashboard() {
  const [tab, setTab] = useState('meeting');
  const { message, notify } = useKitchenToast();

  return (
    <KitchenShell brandSub="Supervisor" topbarSub="Hare Krishna · Kitchen Supervisor" tabs={TABS} activeTab={tab} onTabChange={setTab} toast={message}>
      {tab === 'meeting' && <SupervisorMeetingTab notify={notify} onGoToCpd={() => setTab('cpd')} />}
      {tab === 'menu' && <MenuTab canEdit notify={notify} />}
      {tab === 'bld' && <BldTab canEdit notify={notify} />}
      {tab === 'storage' && <StorageWastageTab recordType="STORAGE" canEdit notify={notify} />}
      {tab === 'wastage' && <StorageWastageTab recordType="WASTAGE" canEdit notify={notify} />}
      {tab === 'special' && <SpecialRequestsTab canDecide={false} notify={notify} />}
      {tab === 'preaching' && <PreachingTab canEdit notify={notify} />}
      {tab === 'khichdi' && <KhichdiTab canEdit notify={notify} />}
      {tab === 'cpd' && <CpdProcurementTab notify={notify} />}
      {tab === 'finalcount' && <FinalCountTab notify={notify} />}
    </KitchenShell>
  );
}
