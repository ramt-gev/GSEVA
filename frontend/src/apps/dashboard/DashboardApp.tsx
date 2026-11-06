import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, DoorOpen, Utensils, Sparkles, FileBarChart, Shield, CreditCard, TrendingUp, Lock } from 'lucide-react';
import '../../styles/tokens-backoffice.css';
import { RequireAuth } from '../../components/RequireAuth';
import LoginOverlay from '../../components/LoginOverlay';
import AppShell, { type NavSection } from '../../components/AppShell';
import Overview from './pages/Overview';
import Gates from './pages/Gates';
import Meals from '../../components/reports/MealsSummary';
import Festival from '../../components/reports/FestivalCalendar';
import ReportsLibrary from './pages/ReportsLibrary';
import Police from '../../components/reports/PoliceReport';
import Billing from './pages/Billing';
import Trends from './pages/Trends';
import Audit from '../../components/reports/AuditTrail';

const SECTIONS: NavSection[] = [
  { title: 'Live Dashboards', items: [
    { id: '', label: 'Campus Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'gates', label: 'Gate Activity', icon: <DoorOpen size={16} /> },
    { id: 'meals', label: 'Annakshetra', icon: <Utensils size={16} /> },
    { id: 'festival', label: 'Festival Mode', icon: <Sparkles size={16} /> },
  ] },
  { title: 'Reports', items: [
    { id: 'reports', label: 'Reports Library', icon: <FileBarChart size={16} /> },
    { id: 'police', label: 'Police Report', icon: <Shield size={16} /> },
    { id: 'billing', label: 'Billing Recovery', icon: <CreditCard size={16} /> },
  ] },
  { title: 'Analytics', items: [
    { id: 'trends', label: 'Visitor Trends', icon: <TrendingUp size={16} /> },
    { id: 'audit', label: 'Audit Trail', icon: <Lock size={16} /> },
  ] },
];

const PAGE_META: Record<string, [string, string]> = {
  '': ['Campus Overview', 'Live · All modules'],
  gates: ['Gate Activity', 'All 4 campus gates · Live'],
  meals: ['Annakshetra', 'Meal scanning · Forecasting · Billing'],
  festival: ['Festival Mode', 'Calendar · Committee · Batch entry'],
  reports: ['Reports Library', 'Report types · All modules'],
  police: ['Police Report', 'Monthly resident register'],
  billing: ['Billing Recovery', 'Contractor B+D'],
  trends: ['Visitor Trends', 'Analytics'],
  audit: ['Audit Trail', 'Immutable log · Super Admin only'],
};

function DashboardAuthed() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.replace(/^\/dashboard\/?/, '');
  const meta = PAGE_META[activeId] || PAGE_META[''];

  return (
    <AppShell
      brandName="GSEVA"
      brandSub="Dashboard & Reports"
      sections={SECTIONS}
      activeId={activeId}
      onNavigate={(id) => navigate(id ? `/dashboard/${id}` : '/dashboard')}
      topbarTitle={meta[0]}
      topbarSub={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + meta[1]}
    >
      <Routes>
        <Route index element={<Overview />} />
        <Route path="gates" element={<Gates />} />
        <Route path="meals" element={<Meals />} />
        <Route path="festival" element={<Festival />} />
        <Route path="reports" element={<ReportsLibrary />} />
        <Route path="police" element={<Police />} />
        <Route path="billing" element={<Billing />} />
        <Route path="trends" element={<Trends />} />
        <Route path="audit" element={<Audit />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function DashboardApp() {
  return (
    <div className="theme-backoffice">
      <RequireAuth
        fallback={
          <LoginOverlay
            logoName="GSEVA"
            logoSub="Campus Overview & Reports"
            headline={<>Campus Overview<br />& Reports</>}
            heroSub="Serving Every Soul at the Dham"
            description="Real-time gate activity, meal counts, occupancy trends, and police reports — all in one unified view for Govardhan EcoVillage."
            badgeText="Dashboard · Live"
          />
        }
      >
        <DashboardAuthed />
      </RequireAuth>
    </div>
  );
}
