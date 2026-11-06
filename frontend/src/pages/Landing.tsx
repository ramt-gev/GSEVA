import { Link } from 'react-router-dom';
import { ClipboardList, Handshake, DoorOpen, Utensils, ShieldCheck, LayoutDashboard, ChefHat } from 'lucide-react';
import styles from './Landing.module.css';
import '../styles/tokens-public.css';

const LINKS = [
  { to: '/register', icon: ClipboardList, label: 'Smart Registration' },
  { to: '/register/staff', icon: Handshake, label: 'Volunteer / Contractor / Vendor / Guest Registration' },
  { to: '/gate', icon: DoorOpen, label: 'Gate Tablet App' },
  { to: '/canteen', icon: Utensils, label: 'Annakshetra Canteen' },
  { to: '/kitchen', icon: ChefHat, label: 'Kitchen Operations' },
  { to: '/admin', icon: ShieldCheck, label: 'Admin Portal' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard & Reports' },
];

export default function Landing() {
  return (
    <div className={`theme-public ${styles.page}`}>
      <div className={styles.imageSide}>
        <img src="/aarti-night.jpg" alt="Govardhan EcoVillage" className={styles.image} />
        <div className={styles.imageOverlay}>
          <img src="/logo.svg" alt="Govardhan EcoVillage" className={styles.imageLogo} />
          <p className={styles.welcomeSmall}>welcome to</p>
          <h1 className={styles.gsevaBig}>GSEVA</h1>
          <p className={styles.gsevaFullForm}>Govardhan Smart EcoVillage Administration</p>
          <p className={styles.caption}>Serving Every Soul at the Dham</p>
          <p className={styles.description}>
            One portal for visitor registration, gate access, Annakshetra meals, festival operations, and
            campus-wide reporting at Govardhan EcoVillage.
          </p>
        </div>
      </div>

      <div className={styles.contentSide}>
        <nav className={styles.linkList}>
          {LINKS.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className={styles.link}>
              <span className={styles.thumb}>
                <Icon size={26} strokeWidth={1.7} />
              </span>
              <span className={styles.linkLabel}>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
