export interface Member {
  name: string;
  age: string;
  gender: string;
  relation: string;
}

export interface Services {
  darshan: boolean;
  lunch: boolean;
  vf: boolean;
  zone3: boolean; // Govinda's Guest Area
  dhanvantari: boolean; // Dhanvantari Café — also a Zone 3 paid café, see computeTotal
  khichadi: boolean; // free tap-counter meal, indicate-only like lunch
}

export interface RegistrationState {
  visitType: 'free' | 'paid';
  groupSize: number;
  leaderName: string;
  leaderMobile: string;
  leaderCity: string;
  members: Member[];
  services: Services;
  vfSlot: string | null;
  vfSlotId: string | null;
}

export interface RegConfig {
  maxGroupSize: number;
  zone3Price: number;
  programmePrice: number;
}

export const INITIAL_STATE: RegistrationState = {
  visitType: 'free',
  groupSize: 1,
  leaderName: '',
  leaderMobile: '',
  leaderCity: '',
  members: [],
  services: { darshan: true, lunch: true, vf: false, zone3: false, dhanvantari: false, khichadi: false },
  vfSlot: null,
  vfSlotId: null,
};

export const DEFAULT_CONFIG: RegConfig = {
  maxGroupSize: 10,
  zone3Price: 350,
  programmePrice: 850,
};

export function computeTotal(state: RegistrationState, config: RegConfig): number {
  const g = state.groupSize;
  if (state.visitType === 'paid') return config.programmePrice * g;
  // Either paid café is the same one Zone 3 upgrade charge, not additive —
  // picking both still means one Zone 3 access fee, not two café bills.
  if (state.services.zone3 || state.services.dhanvantari) return config.zone3Price * g;
  return 0;
}
