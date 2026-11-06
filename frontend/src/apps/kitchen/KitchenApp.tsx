import '../../styles/tokens-backoffice.css';
import { RequireAuth } from '../../components/RequireAuth';
import LoginOverlay from '../../components/LoginOverlay';
import { useAuth } from '../../lib/auth';
import SupervisorDashboard from './dashboards/SupervisorDashboard';
import HodDashboard from './dashboards/HodDashboard';
import CollectionDashboard from './dashboards/CollectionDashboard';

function KitchenAuthed() {
  const { user, logout } = useAuth();

  if (user?.role === 'kitchen_supervisor' || user?.role === 'super_admin') return <SupervisorDashboard />;
  if (user?.role === 'kitchen_hod') return <HodDashboard />;
  if (user?.role === 'kitchen_collection_distribution') return <CollectionDashboard />;

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <p>Your account (role: {user?.role}) isn&apos;t set up for the Kitchen system.</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}

export default function KitchenApp() {
  return (
    <div className="theme-backoffice">
      <RequireAuth
        fallback={
          <LoginOverlay
            logoName="GEV - Kitchen"
            logoSub="Supervisor · HOD · Distribution"
            headline={<>Prasadam,<br />Planned &amp; Tracked</>}
            heroSub="From the 2 PM meeting to the last delivered tray"
            description="Meeting, menu, BLD counts, storage, wastage, special requests, procurement and distribution — one system for the whole kitchen team."
            badgeText="Kitchen · Live"
          />
        }
      >
        <KitchenAuthed />
      </RequireAuth>
    </div>
  );
}
