import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import GateApp from './apps/gate/GateApp';
import CanteenApp from './apps/canteen/CanteenApp';
import AdminApp from './apps/admin/AdminApp';
import DashboardApp from './apps/dashboard/DashboardApp';
import RegisterPage from './apps/register/RegisterPage';
import RegisterStaffPage from './apps/register-staff/RegisterStaffPage';
import KitchenApp from './apps/kitchen/KitchenApp';

// Mirrors backend-mysql/src/index.js's static routes (/, /gate, /canteen,
// /admin, /dashboard, /register, /register/staff). Admin/Dashboard get real
// nested routes (/admin/*, /dashboard/*) instead of the originals'
// no-URL-state div toggling; Gate/Canteen/Register stay single-URL with
// internal screen state, matching their kiosk/wizard originals.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/staff" element={<RegisterStaffPage />} />
      <Route path="/kitchen" element={<KitchenApp />} />
      <Route path="/gate/*" element={<GateApp />} />
      <Route path="/canteen/*" element={<CanteenApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/dashboard/*" element={<DashboardApp />} />
    </Routes>
  );
}
