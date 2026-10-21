import { hospitals, initialAmbulances, initialDoctors, initialEmergencies } from '../data/mockData';
import type { Ambulance, Doctor, Emergency, Hospital, HospitalResourceSummary, HospitalRegistration } from '../types';

export interface MockHospitalCredential {
  hospitalId: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
}

interface DemoState {
  hospitals: Hospital[];
  emergencies: Emergency[];
  ambulances: Ambulance[];
  doctors: Doctor[];
  resources: Record<string, Pick<HospitalResourceSummary, "beds" | "updatedAt">>;
  registrations: HospitalRegistration[];
  accounts: MockHospitalCredential[];
}

const STORAGE_KEY = 'lifelink-demo-operational-state-v3';
export const DATA_CHANGED_EVENT = 'lifelink:demo-data-changed';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function freshState(): DemoState {
  return clone({ hospitals, emergencies: initialEmergencies, ambulances: initialAmbulances, doctors: initialDoctors, registrations: [], accounts: [], resources: Object.fromEntries(hospitals.map(h => [h.id, { updatedAt: new Date().toISOString(), beds: {
 general: {total: 0, occupied: 0, available: 0},
 emergency: {...h.emergencyBeds, occupied: h.emergencyBeds.total - h.emergencyBeds.available},
 icu: {...h.icuBeds, occupied: h.icuBeds.total - h.icuBeds.available}
 }}])) });
}

function loadState(): DemoState {
  if (typeof window === 'undefined') return freshState();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return freshState();
    const parsed = JSON.parse(stored) as Partial<DemoState>;
    if (!Array.isArray(parsed.emergencies) || !Array.isArray(parsed.ambulances) || !Array.isArray(parsed.doctors)) return freshState();
    const fresh = freshState();
    const storedHospitals = Array.isArray(parsed.hospitals) ? parsed.hospitals : [];
    const demoHospitalIds = new Set(fresh.hospitals.map((hospital) => hospital.id));
    const mergedHospitals = [...fresh.hospitals, ...storedHospitals.filter((hospital) => !demoHospitalIds.has(hospital.id))];
    const resources = { ...fresh.resources, ...(parsed.resources ?? {}) };
    for (const hospital of mergedHospitals) {
      resources[hospital.id] ??= {
        updatedAt: new Date().toISOString(),
        beds: {
          general: { total: 0, occupied: 0, available: 0 },
          icu: { total: 0, occupied: 0, available: 0 },
          emergency: { total: 0, occupied: 0, available: 0 },
        },
      };
    }
    return {
      hospitals: mergedHospitals,
      emergencies: parsed.emergencies,
      ambulances: parsed.ambulances,
      doctors: parsed.doctors,
      resources,
      registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
    };
  } catch {
    return freshState();
  }
}

let state = loadState();

export function getMockState() {
  return state;
}

export function cloneValue<T>(value: T): T {
  return clone(value);
}

export function saveMockState() {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Demo still works in memory. */ }
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}

export function resetMockState() {
  state = freshState();
  saveMockState();
}
