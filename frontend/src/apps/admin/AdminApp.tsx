import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Hotel, Users, HeartHandshake, BookOpen, HardHat, Truck, Home,
  Utensils, CalendarHeart, Network, Shield, UsersRound, Settings as SettingsIcon, ClipboardList,
} from 'lucide-react';
import '../../styles/tokens-backoffice.css';
import { RequireAuth } from '../../components/RequireAuth';
import LoginOverlay from '../../components/LoginOverlay';
import AppShell, { type NavSection } from '../../components/AppShell';
import { useAuth } from '../../lib/auth';
import { canAccess } from './rbac';

import Dashboard from './pages/Dashboard';
import RegisterPerson from './pages/RegisterPerson';
import Guests from './pages/Guests';
import Staff from './pages/Staff';
import Seva from './pages/Seva';
import Students from './pages/Students';
import Contractors from './pages/Contractors';
import Vendors from './pages/Vendors';
import Ashram from './pages/Ashram';
import Annakshetra from './pages/Annakshetra';
import Festival from './pages/Festival';
import OrgStructure from './pages/OrgStructure';
import Security from './pages/Security';
import UsersPage from './pages/Users';
import Settings from './pages/Settings';
import Audit from './pages/Audit';

const ALL_SECTIONS: NavSection[] = [
  { title: 'Main', items: [
    { id: '', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'register', label: 'Register New Person', icon: <UserPlus size={16} /> },
  ] },
  { title: 'By Visitor Type', items: [
    { id: 'guests', label: 'Guests & Day Visitors', icon: <Hotel size={16} /> },
    { id: 'staff', label: 'Resident Staff & Family', icon: <Users size={16} /> },
    { id: 'seva', label: 'Seva & Volunteers', icon: <HeartHandshake size={16} /> },
    { id: 'students', label: 'Students & Courses', icon: <BookOpen size={16} /> },
    { id: 'contractors', label: 'Contractors & Labourers', icon: <HardHat size={16} /> },
    { id: 'vendors', label: 'Vendors & Suppliers', icon: <Truck size={16} /> },
    { id: 'ashram', label: 'Ashram Residents', icon: <Home size={16} /> },
  ] },
  { title: 'Operations', items: [
    { id: 'annakshetra', label: 'Annakshetra', icon: <Utensils size={16} /> },
    { id: 'festival', label: 'Festival Mode', icon: <CalendarHeart size={16} /> },
  ] },
  { title: 'Organisation', items: [
    { id: 'org', label: 'Org Structure', icon: <Network size={16} /> },
  ] },
  { title: 'Security & Admin', items: [
    { id: 'security', label: 'Security & Reports', icon: <Shield size={16} /> },
    { id: 'users', label: 'User Management', icon: <UsersRound size={16} /> },
    { id: 'settings', label: 'System Settings', icon: <SettingsIcon size={16} /> },
    { id: 'audit', label: 'Audit Trail', icon: <ClipboardList size={16} /> },
  ] },
];

const PAGE_META: Record<string, [string, string]> = {
  '': ['Dashboard', ''],
  register: ['Register New Person', 'Add any visitor type to campus'],
  guests: ['Guests & Day Visitors', 'Room guests, day visitors, VIPs, corporate groups'],
  staff: ['Resident Staff & Family', 'Payroll staff · Dependants — Greythr synced'],
  seva: ['Seva & Volunteers', 'Volunteer seva · Sustainability interns'],
  students: ['Students & Courses', 'Yoga, Ayurveda, Vidyapeetha, TTC'],
  contractors: ['Contractors & Labourers', 'Active contractors · Labourers · Pending approvals'],
  vendors: ['Vendors & Suppliers', 'Vendor day-visit management'],
  ashram: ['Ashram Residents', 'Brahmacharis · Varishtha Vaishnavas'],
  annakshetra: ['Annakshetra', 'Meal token management · Free meal counter'],
  festival: ['Festival Mode', 'Festival calendar · Batch entry'],
  org: ['Org Structure', 'GAC · Committees · Sevak registration'],
  security: ['Security & Reports', 'Monthly police report · Gate logs'],
  users: ['User Management', 'RBAC — 5-layer role system'],
  settings: ['System Settings', 'System config · Café capacity · Zone 3 upgrades'],
  audit: ['Audit Trail', 'Immutable log — Super Admin only'],
};

function AdminAuthed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.replace(/^\/admin\/?/, '');
  const meta = PAGE_META[activeId] || PAGE_META[''];

  const sections = ALL_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(item.id, user)),
  })).filter((section) => section.items.length > 0);

  return (
    <AppShell
      brandName="GSEVA"
      brandSub="Campus Management"
      sections={sections}
      activeId={activeId}
      onNavigate={(id) => navigate(id ? `/admin/${id}` : '/admin')}
      topbarTitle={meta[0]}
      topbarSub={activeId === '' ? `Hare Krishna${user ? ', ' + user.full_name : ''}` : meta[1]}
    >
      <Routes>
        <Route index element={<Guarded id="" user={user}><Dashboard /></Guarded>} />
        <Route path="register" element={<Guarded id="register" user={user}><RegisterPerson /></Guarded>} />
        <Route path="guests" element={<Guarded id="guests" user={user}><Guests /></Guarded>} />
        <Route path="staff" element={<Guarded id="staff" user={user}><Staff /></Guarded>} />
        <Route path="seva" element={<Guarded id="seva" user={user}><Seva /></Guarded>} />
        <Route path="students" element={<Guarded id="students" user={user}><Students /></Guarded>} />
        <Route path="contractors" element={<Guarded id="contractors" user={user}><Contractors /></Guarded>} />
        <Route path="vendors" element={<Guarded id="vendors" user={user}><Vendors /></Guarded>} />
        <Route path="ashram" element={<Guarded id="ashram" user={user}><Ashram /></Guarded>} />
        <Route path="annakshetra" element={<Guarded id="annakshetra" user={user}><Annakshetra /></Guarded>} />
        <Route path="festival" element={<Guarded id="festival" user={user}><Festival /></Guarded>} />
        <Route path="org" element={<Guarded id="org" user={user}><OrgStructure /></Guarded>} />
        <Route path="security" element={<Guarded id="security" user={user}><Security /></Guarded>} />
        <Route path="users" element={<Guarded id="users" user={user}><UsersPage /></Guarded>} />
        <Route path="settings" element={<Guarded id="settings" user={user}><Settings /></Guarded>} />
        <Route path="audit" element={<Guarded id="audit" user={user}><Audit /></Guarded>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppShell>
  );
}

function Guarded({ id, user, children }: { id: string; user: ReturnType<typeof useAuth>['user']; children: React.ReactNode }) {
  if (!canAccess(id, user)) {
    return <div style={{ padding: 24, color: 'var(--red)' }}>Access denied — your role does not have permission to view this section.</div>;
  }
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <div className="theme-backoffice">
      <RequireAuth
        fallback={
          <LoginOverlay
            logoName="GSEVA"
            logoSub="Campus Management"
            headline={<>Integrated Campus<br />Management</>}
            heroSub="Serving Every Soul at the Dham"
            description="One portal for visitor registration, gate access, Annakshetra meals, festival operations, and campus-wide reporting at Govardhan EcoVillage."
            badgeText="Admin Portal · Live"
          />
        }
      >
        <AdminAuthed />
      </RequireAuth>
    </div>
  );
}
