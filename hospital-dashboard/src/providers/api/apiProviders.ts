import type { AmbulanceStatus, DoctorStatus,
  AuthSession,
  Emergency,
  EmergencyStatus,
  Hospital,
  HospitalId,
  HospitalResourceSummary,
  HospitalRegistration,
  HospitalRegistrationInput,
  Doctor,
  Ambulance,
  BedUpdate,
  DoctorInput,
  AmbulanceInput,
} from '../../types';
import { httpClient } from '../../services/httpClient';
import { DATA_CHANGED_EVENT } from '../../services/mockStore';
import { toApiHospitalStatus } from '../../services/statusMapper';
import { tokenStore } from '../../services/tokenStore';
import type { ProviderSet } from '../contracts';
import { endpoints } from '../../config/endpoints';

const API_SESSION_KEY = 'lifelink-api-session-hospital-v1';
const LOCAL_DOCTORS_KEY = 'lifelink-local-doctors-v1';
const LOCAL_AMBULANCES_KEY = 'lifelink-local-ambulances-v1';

// ── Backend response shapes ───────────────────────────────────────────────────

interface LoginResponse {
  access_token: string;
  token_type: string;
  hospital?: BackendHospital;
}

interface BackendHospital {
  hospital_id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  total_beds?: number;
  icu_beds?: number;
  oxygen_beds?: number;
  general_occupied?: number;
  icu_occupied?: number;
  emergency_occupied?: number;
  phone_number?: string;
  rating?: number;
  created_at?: string;
}

interface BackendDoctor {
  doctor_id: number;
  hospital_id: number;
  name: string;
  department?: string;
  specialization?: string;
  phone?: string;
  status: string;
  current_cases?: number;
}

interface BackendAmbulance {
  ambulance_id: number;
  hospital_id: number;
  vehicle_number: string;
  driver_name?: string;
  driver_phone?: string;
  location_label?: string;
  status: string;
}

interface BackendSOS {
  sos_id: number;
  user_id: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  dispatch_status?: string;
  accepted_hospital_id?: number;
  assigned_ambulance_id?: number;
  assigned_doctor_id?: number;
  patient_name?: string;
  patient_phone?: string;
  ai_emergency_understanding?: string;
  ai_severity?: string;
  ai_health_summary?: string;
  ai_emergency_report?: string;
  call_transcript?: string;
  call_summary?: string;
  created_at: string;
  resolved_at?: string;
  hospital?: BackendHospital;
  ambulance?: BackendAmbulance;
  doctor?: BackendDoctor;
}

function splitPatientValues(value?: string) {
  if (!value) return [];
  return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function contextValue(summary: string | undefined, label: string) {
  if (!summary) return '';
  const expression = new RegExp(`(?:^|\\n)${label}:\\s*(.*?)(?=\\n[^\\n:]{2,60}:|$)`, 'is');
  return summary.match(expression)?.[1]?.trim() ?? '';
}

function sosSymptoms(description?: string) {
  if (!description) return [];
  const match = description.match(/(?:^|\n)Symptoms:\s*(.*?)(?=\n|$)/i);
  return splitPatientValues(match?.[1]);
}

// ── Demo hospital email → hospital name mapping ───────────────────────────────
const DEMO_EMAIL_MAP: Record<string, string> = {
  'citycare@lifelink.demo': 'CityCare Hospital',
  'metro@lifelink.demo': 'Metro General Hospital',
  'lifeline@lifelink.demo': 'Lifeline Medical Centre',
  'harbourview@lifelink.demo': 'Harbourview Emergency Hospital',
};

// ── Local storage helpers for doctors/ambulances fallback ─────────────────────

function getLocalStore<T>(key: string): Record<string, T[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? '{}');
  } catch {
    return {};
  }
}

function setLocalStore<T>(key: string, data: Record<string, T[]>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

function getLocalHospitalItems<T>(key: string, hospitalId: string): T[] {
  const store = getLocalStore<T>(key);
  return store[hospitalId] ?? [];
}

function saveLocalHospitalItems<T>(key: string, hospitalId: string, items: T[]) {
  const store = getLocalStore<T>(key);
  store[hospitalId] = items;
  setLocalStore(key, store);
}

// ── Mapper: backend hospital row → dashboard Hospital type ────────────────────

function toHospital(h: BackendHospital): Hospital {
  const generalTotal = h.total_beds ?? 100;
  const generalOcc = h.general_occupied ?? 0;
  const icuTotal = h.icu_beds ?? 20;
  const icuOcc = h.icu_occupied ?? 0;
  const hospitalName = h.name || 'Hospital';

  return {
    id: String(h.hospital_id ?? '1'),
    name: hospitalName,
    shortName: hospitalName.split(' ').slice(0, 2).join(' '),
    networkRegion: 'India',
    department: 'Emergency',
    address: h.address ?? 'Medical District',
    latitude: h.latitude ?? 19.7,
    longitude: h.longitude ?? 72.77,
    emergencyBeds: {
      available: Math.max(0, generalTotal - generalOcc),
      total: generalTotal,
    },
    icuBeds: {
      available: Math.max(0, icuTotal - icuOcc),
      total: icuTotal,
    },
    averageResponseTimeMinutes: 8,
    completedToday: 0,
    acceptanceRate: 0.95,
    status: 'CONNECTED',
  };
}

const FALLBACK_HOSPITAL: Hospital = {
  id: '16',
  name: 'Anand Hospital & Critical Care',
  shortName: 'Anand Hospital',
  networkRegion: 'Palghar District',
  department: 'Emergency',
  address: 'Mahim Road, Opp. ST Stand, Palghar West, Maharashtra 401404',
  latitude: 19.699,
  longitude: 72.771,
  emergencyBeds: { available: 10, total: 15 },
  icuBeds: { available: 5, total: 8 },
  averageResponseTimeMinutes: 5,
  completedToday: 0,
  acceptanceRate: 0.95,
  status: 'CONNECTED',
};

// ── Session helpers ───────────────────────────────────────────────────────────

function storedApiSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const hospital = JSON.parse(
      window.sessionStorage.getItem(API_SESSION_KEY) ?? 'null'
    ) as Hospital | null;
    const accessToken = tokenStore.get();
    return hospital && accessToken ? { hospital, accessToken } : null;
  } catch {
    return null;
  }
}

function rememberHospital(hospital: Hospital) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(API_SESSION_KEY, JSON.stringify(hospital));
  } catch { /* ignore */ }
}

function forgetHospital() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(API_SESSION_KEY);
  } catch { /* ignore */ }
}

// ── Hospital fetch helpers ────────────────────────────────────────────────────

async function fetchAllHospitals(): Promise<BackendHospital[]> {
  try {
    const list = await httpClient.get<BackendHospital[]>(endpoints.hospitals);
    if (Array.isArray(list)) return list;
  } catch { /* ignore */ }
  return [];
}

async function fetchHospitalById(id: string): Promise<BackendHospital | null> {
  try {
    const res = await httpClient.get<BackendHospital>(`/hospitals/${encodeURIComponent(id)}`);
    if (res && res.hospital_id) return res;
  } catch { /* fall back to searching list */ }

  const all = await fetchAllHospitals();
  return all.find((h) => String(h.hospital_id) === String(id)) ?? null;
}

async function fetchHospitalForEmail(email: string): Promise<Hospital> {
  const all = await fetchAllHospitals();
  if (all.length === 0) return FALLBACK_HOSPITAL;

  const expectedName = DEMO_EMAIL_MAP[email.toLowerCase()];
  if (expectedName) {
    const match = all.find(
      (h) => h.name.toLowerCase() === expectedName.toLowerCase()
    );
    if (match) return toHospital(match);
  }

  return toHospital(all[0]);
}

// ── Emergency mapper ──────────────────────────────────────────────────────────

function toEmergencyItem(s: BackendSOS, hospitalId: string): Emergency {
  const isCompleted = s.status === 'RESOLVED' || s.dispatch_status === 'COMPLETED' || s.dispatch_status === 'completed';
  const isAccepted = s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS' || s.dispatch_status === 'ACCEPTED' || s.dispatch_status === 'AMBULANCE_ASSIGNED' || s.dispatch_status === 'EN_ROUTE' || isCompleted;
  const statusRaw = (isCompleted ? 'COMPLETED' : (s.dispatch_status || (isAccepted ? 'ACCEPTED' : 'RECEIVED'))) as EmergencyStatus;
  const healthSummary = s.ai_health_summary || '';
  const profileNotes = contextValue(healthSummary, 'Emergency profile notes');
  const uploadedRecords = contextValue(healthSummary, 'Uploaded medical records');
  const typedNote = s.description?.match(/(?:^|\n)Patient note:\s*(.*?)(?=\n|$)/i)?.[1]?.trim();
  
  let assignedAmb: Ambulance | undefined;
  if (s.ambulance) {
    assignedAmb = {
      id: String(s.ambulance.ambulance_id),
      hospitalId,
      vehicleNumber: s.ambulance.vehicle_number,
      driverName: s.ambulance.driver_name ?? '',
      driverPhone: s.ambulance.driver_phone ?? '',
      locationLabel: s.ambulance.location_label ?? 'Hospital Fleet',
      status: (s.ambulance.status as any) ?? 'AVAILABLE',
    };
  } else if (s.assigned_ambulance_id) {
    const localAmbs = getLocalHospitalItems<Ambulance>(LOCAL_AMBULANCES_KEY, hospitalId);
    assignedAmb = localAmbs.find((a) => a.id === String(s.assigned_ambulance_id)) ?? {
      id: String(s.assigned_ambulance_id),
      hospitalId,
      vehicleNumber: `AMB-${s.assigned_ambulance_id}`,
      driverName: 'Assigned Driver',
      locationLabel: 'En Route',
      status: 'EN_ROUTE',
    };
  }

  let assignedDoc: Doctor | undefined;
  if (s.doctor) {
    assignedDoc = {
      id: String(s.doctor.doctor_id),
      hospitalId,
      name: s.doctor.name,
      department: s.doctor.department ?? 'Emergency',
      specialization: s.doctor.specialization ?? 'General Physician',
      phone: s.doctor.phone,
      status: (s.doctor.status as any) ?? 'AVAILABLE',
      currentCases: s.doctor.current_cases ?? 1,
    };
  }

  return {
    id: String(s.sos_id),
    sosId: String(s.sos_id),
    hospitalId,
    requestStatus: isAccepted ? 'ACCEPTED' : 'PENDING',
    type: 'SOS Emergency',
    status: statusRaw,
    priority: {
      score: 95,
      level: (s.ai_severity === 'HIGH' ? 'HIGH' : s.ai_severity === 'MODERATE' ? 'MEDIUM' : s.ai_severity === 'LOW' ? 'LOW' : 'CRITICAL'),
      reasons: [s.ai_emergency_understanding || 'Citizen SOS Triggered', 'Critical Triage Required'],
    },
    patient: {
      id: String(s.user_id),
      name: s.patient_name || `User #${s.user_id}`,
      bloodGroup: contextValue(healthSummary, 'Blood group') || undefined,
      medicalConditions: splitPatientValues(contextValue(healthSummary, 'Known conditions')),
      allergies: splitPatientValues(contextValue(healthSummary, 'Allergies')),
      medications: splitPatientValues(contextValue(healthSummary, 'Current medications')),
      criticalNotes: [
        ...sosSymptoms(s.description),
        ...(typedNote ? [`Patient note: ${typedNote}`] : []),
        ...(profileNotes ? [profileNotes] : []),
        ...(uploadedRecords ? [`Uploaded records: ${uploadedRecords}`] : []),
        ...(s.call_transcript ? [`AI voice interview transcript:\n${s.call_transcript}`] : []),
      ],
    },
    symptoms: sosSymptoms(s.description),
    severity: s.ai_severity || undefined,
    location: {
      latitude: s.latitude ?? 19.697,
      longitude: s.longitude ?? 72.766,
      address: s.description || 'Live GPS Location Broadcasted',
      area: 'Palghar District Emergency Zone',
      city: 'Palghar',
    },
    createdAt: s.created_at ?? new Date().toISOString(),
    assignedAmbulance: assignedAmb,
    assignedDoctor: assignedDoc,
    timeline: [
      {
        id: 'tl-1',
        label: 'SOS Broadcast Received',
        completed: true,
        current: !isAccepted,
        timestamp: s.created_at,
      },
      {
        id: 'tl-2',
        label: isAccepted ? 'Hospital Accepted Admission' : 'Awaiting Hospital Admission',
        completed: isAccepted,
        current: isAccepted && !s.assigned_ambulance_id,
      },
      {
        id: 'tl-3',
        label: assignedAmb ? `Ambulance Dispatched (${assignedAmb.vehicleNumber})` : 'Ambulance Dispatch Pending',
        completed: Boolean(assignedAmb),
        current: Boolean(assignedAmb) && statusRaw !== 'COMPLETED',
      },
    ],
  };
}

// ── Doctors & Ambulances API with graceful sync ───────────────────────────────

async function fetchDoctorsFromBackend(hospitalId: string): Promise<Doctor[]> {
  try {
    const [res, activeSosList] = await Promise.all([
      httpClient.get<BackendDoctor[]>(`/hospitals/${encodeURIComponent(hospitalId)}/doctors/`),
      httpClient.get<BackendSOS[]>('/sos/').catch(() => [] as BackendSOS[]),
    ]);

    if (Array.isArray(res)) {
      // Find all doctors who actually have an ongoing (non-completed) emergency
      const activeDoctorCaseCounts = new Map<string, number>();
      if (Array.isArray(activeSosList)) {
        for (const sos of activeSosList) {
          if (sos.status !== 'RESOLVED' && sos.dispatch_status !== 'COMPLETED' && sos.assigned_doctor_id) {
            const docId = String(sos.assigned_doctor_id);
            activeDoctorCaseCounts.set(docId, (activeDoctorCaseCounts.get(docId) || 0) + 1);
          }
        }
      }

      const docs: Doctor[] = res.map((d) => {
        const docId = String(d.doctor_id);
        const actualActiveCases = activeDoctorCaseCounts.get(docId) || 0;
        const effectiveStatus: DoctorStatus = actualActiveCases >= 3 ? 'BUSY' : 'AVAILABLE';

        // Auto-heal backend if doctor workload is out of sync
        if (d.current_cases !== actualActiveCases || d.status !== effectiveStatus) {
          httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/doctors/${encodeURIComponent(docId)}`, {
            method: 'PUT',
            body: JSON.stringify({ current_cases: actualActiveCases, status: effectiveStatus }),
          }).catch(() => {});
        }

        return {
          id: docId,
          hospitalId,
          name: d.name,
          department: d.department ?? 'Emergency',
          specialization: d.specialization ?? 'General Physician',
          phone: d.phone,
          status: effectiveStatus,
          currentCases: actualActiveCases,
        };
      });

      saveLocalHospitalItems(LOCAL_DOCTORS_KEY, hospitalId, docs);
      return docs;
    }
  } catch {}
  return getLocalHospitalItems<Doctor>(LOCAL_DOCTORS_KEY, hospitalId);
}

async function fetchAmbulancesFromBackend(hospitalId: string): Promise<Ambulance[]> {
  try {
    const [res, activeSosList] = await Promise.all([
      httpClient.get<BackendAmbulance[]>(`/hospitals/${encodeURIComponent(hospitalId)}/ambulances/`),
      httpClient.get<BackendSOS[]>('/sos/').catch(() => [] as BackendSOS[]),
    ]);

    if (Array.isArray(res)) {
      // Find all ambulances ACTUALLY assigned to an active (non-resolved) SOS right now
      const activelyAssignedAmbIds = new Set<string>();
      if (Array.isArray(activeSosList)) {
        for (const sos of activeSosList) {
          if (sos.status !== 'RESOLVED' && sos.dispatch_status !== 'COMPLETED' && sos.assigned_ambulance_id) {
            activelyAssignedAmbIds.add(String(sos.assigned_ambulance_id));
          }
        }
      }

      const ambs: Ambulance[] = res.map((a) => {
        const ambId = String(a.ambulance_id);
        const isActuallyInUse = activelyAssignedAmbIds.has(ambId);
        const effectiveStatus: AmbulanceStatus = isActuallyInUse ? 'EN_ROUTE' : 'AVAILABLE';

        // Auto-heal backend database if ambulance was left in EN_ROUTE after case was completed
        if (a.status !== effectiveStatus) {
          httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/ambulances/${encodeURIComponent(ambId)}`, {
            method: 'PUT',
            body: JSON.stringify({ status: effectiveStatus }),
          }).catch(() => {});
        }

        return {
          id: ambId,
          hospitalId,
          vehicleNumber: a.vehicle_number,
          driverName: a.driver_name ?? '',
          driverPhone: a.driver_phone ?? '',
          locationLabel: a.location_label ?? 'Hospital Fleet',
          status: effectiveStatus,
        };
      });

      saveLocalHospitalItems(LOCAL_AMBULANCES_KEY, hospitalId, ambs);
      return ambs;
    }
  } catch {}
  return getLocalHospitalItems<Ambulance>(LOCAL_AMBULANCES_KEY, hospitalId);
}

export const apiProviders: ProviderSet = {
  auth: {
    async register(payload: HospitalRegistrationInput): Promise<HospitalRegistration> {
      // 1. Create Hospital record directly in the hospitals table
      // Email (e.g. Gmail) and password are saved directly in hospitals table (users table is kept clean for app patients)
      const fullAddress = [payload.address, payload.city, payload.state, payload.pinCode]
        .filter(Boolean)
        .join(', ');

      const createdHospital = await httpClient.post<BackendHospital>('/hospitals/', {
        name: payload.hospitalName,
        email: payload.adminEmail,
        password: payload.password,
        address: fullAddress,
        latitude: payload.latitude ?? 19.697,
        longitude: payload.longitude ?? 72.766,
        total_beds: payload.generalBeds,
        icu_beds: payload.icuBeds,
        oxygen_beds: payload.emergencyBeds,
        phone_number: payload.emergencyPhone || payload.adminPhone,
        rating: 5.0,
      });

      const hospitalId = String(createdHospital.hospital_id ?? Date.now());

      // 3. Initialize ambulances if requested
      if (payload.ambulanceCount > 0) {
        const initialAmbs: Ambulance[] = [];
        for (let i = 1; i <= payload.ambulanceCount; i++) {
          const vehNum = `AMB-${payload.city.slice(0, 3).toUpperCase()}-${String(i).padStart(2, '0')}`;
          try {
            await httpClient.post(`/hospitals/${encodeURIComponent(hospitalId)}/ambulances/`, {
              vehicle_number: vehNum,
              driver_name: `Driver ${i}`,
              driver_phone: payload.emergencyPhone,
              status: 'AVAILABLE',
            });
          } catch {
            initialAmbs.push({
              id: `amb-${i}`,
              hospitalId,
              vehicleNumber: vehNum,
              driverName: `Driver ${i}`,
              driverPhone: payload.emergencyPhone,
              locationLabel: 'Hospital Fleet',
              status: 'AVAILABLE',
            });
          }
        }
        if (initialAmbs.length > 0) {
          saveLocalHospitalItems(LOCAL_AMBULANCES_KEY, hospitalId, initialAmbs);
        }
      }

      return {
        id: hospitalId,
        hospitalName: payload.hospitalName,
        licenseNumber: payload.licenseNumber,
        hospitalType: payload.hospitalType,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        pinCode: payload.pinCode,
        emergencyPhone: payload.emergencyPhone,
        hospitalEmail: payload.hospitalEmail,
        website: payload.website,
        latitude: payload.latitude,
        longitude: payload.longitude,
        adminName: payload.adminName,
        designation: payload.designation,
        adminEmail: payload.adminEmail,
        adminPhone: payload.adminPhone,
        generalBeds: payload.generalBeds,
        icuBeds: payload.icuBeds,
        emergencyBeds: payload.emergencyBeds,
        ambulanceCount: payload.ambulanceCount,
        status: 'APPROVED',
        submittedAt: new Date().toISOString(),
      };
    },

    getSession: storedApiSession,

    async login(email, password) {
      // Step 1: Authenticate -> JWT + Hospital
      const tokenResp = await httpClient.post<LoginResponse>(endpoints.login, { email, password });
      tokenStore.set(tokenResp.access_token);

      // Step 2: Use returned hospital directly or fallback
      let hospital: Hospital;
      if (tokenResp.hospital) {
        hospital = toHospital(tokenResp.hospital);
      } else {
        hospital = await fetchHospitalForEmail(email);
      }
      rememberHospital(hospital);
      return { hospital, accessToken: tokenResp.access_token };
    },

    logout() {
      tokenStore.clear();
      forgetHospital();
    },
  },

  hospital: {
    async getById(hospitalId) {
      const h = await fetchHospitalById(hospitalId);
      return h ? toHospital(h) : FALLBACK_HOSPITAL;
    },

    async getStats(hospitalId) {
      const [h, doctors, ambulances] = await Promise.all([
        fetchHospitalById(hospitalId),
        fetchDoctorsFromBackend(hospitalId),
        fetchAmbulancesFromBackend(hospitalId),
      ]);

      const genTotal = h?.total_beds ?? 100;
      const genOcc = h?.general_occupied ?? 0;
      const genAvail = Math.max(0, genTotal - genOcc);

      const icuTotal = h?.icu_beds ?? 20;
      const icuOcc = h?.icu_occupied ?? 0;
      const icuAvail = Math.max(0, icuTotal - icuOcc);

      const emTotal = h?.oxygen_beds ?? 15;
      const emOcc = h?.emergency_occupied ?? 0;
      const emAvail = Math.max(0, emTotal - emOcc);

      const availAmbulances = ambulances.filter((a) => a.status === 'AVAILABLE').length;
      const availDoctors = doctors.filter((d) => d.status === 'AVAILABLE').length;

      return {
        newEmergencies: 0,
        ongoingCases: 0,
        activeEmergencies: 0,
        criticalCases: 0,
        availableAmbulances: availAmbulances,
        totalAmbulances: ambulances.length,
        availableDoctors: availDoctors,
        totalDoctors: doctors.length,
        availableBeds: genAvail + icuAvail + emAvail,
        totalBeds: genTotal + icuTotal + emTotal,
        availableIcuBeds: icuAvail,
        totalIcuBeds: icuTotal,
        availableGeneralBeds: genAvail,
        totalGeneralBeds: genTotal,
        availableEmergencyDoctors: availDoctors,
        averageResponseTimeMinutes: 8,
        completedToday: 0,
        acceptanceRate: 0.95,
      };
    },

    async getActivity(_hospitalId) {
      return [];
    },
  },

  emergency: {
    async getNew(hospitalId) {
      try {
        const sos = await httpClient.get<BackendSOS[]>('/sos/');
        if (!Array.isArray(sos)) return [];
        return sos
          .filter((s) => {
          const ds = (s.dispatch_status || '').toUpperCase();
          const st = (s.status || '').toUpperCase();
          // Exclude rejected, accepted, in-progress, resolved, completed
          if (ds === 'REJECTED' || st === 'REJECTED') return false;
          if (st === 'ACCEPTED' || st === 'IN_PROGRESS' || st === 'RESOLVED') return false;
          if (ds === 'COMPLETED' || ds === 'ACCEPTED' || ds === 'AMBULANCE_ASSIGNED' || ds === 'EN_ROUTE' || ds === 'ARRIVED' || ds === 'PATIENT_PICKED_UP') return false;
          // Only show unhandled active/pending SOS
          return st === 'ACTIVE' || ds === 'RECEIVED' || ds === '' || ds === 'PENDING';
        })
          .map((s) => toEmergencyItem(s, hospitalId));
      } catch {
        return [];
      }
    },

    async getCompleted(hospitalId) {
      const localKey = 'lifelink_completed_' + hospitalId;
      let localItems: Emergency[] = [];
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) localItems = JSON.parse(raw);
      } catch {}

      let backendItems: Emergency[] = [];

      // 1. Try dedicated endpoint first
      try {
        const sos = await httpClient.get<BackendSOS[]>('/sos/completed?hospital_id=' + encodeURIComponent(hospitalId));
        if (Array.isArray(sos) && sos.length > 0) {
          backendItems = sos.map((s) => toEmergencyItem(s, hospitalId));
        }
      } catch {}

      // 2. If empty, probe recent SOS IDs (1 to 30) in parallel via /sos/{id}
      if (backendItems.length === 0) {
        try {
          const probePromises: Promise<BackendSOS | null>[] = [];
          for (let id = 1; id <= 30; id++) {
            probePromises.push(
              httpClient.get<BackendSOS>(`/sos/${id}`).catch(() => null)
            );
          }
          const results = await Promise.allSettled(probePromises);
          const allResolved: BackendSOS[] = [];
          for (const res of results) {
            if (res.status === 'fulfilled' && res.value) {
              const s = res.value;
              if (s.status === 'RESOLVED' || s.dispatch_status === 'COMPLETED' || s.dispatch_status === 'completed') {
                allResolved.push(s);
              }
            }
          }

          // Filter by current hospital, or fallback to all resolved cases in network
          const hospitalSpecific = allResolved.filter(
            (s) => String(s.accepted_hospital_id) === String(hospitalId) || !s.accepted_hospital_id
          );
          const toUse = hospitalSpecific.length > 0 ? hospitalSpecific : allResolved;
          backendItems = toUse.map((s) => toEmergencyItem(s, hospitalId));
        } catch {}
      }

      // 3. Deduplicate and cache in localStorage
      const map = new Map<string, Emergency>();
      for (const item of [...backendItems, ...localItems]) {
        map.set(item.id, item);
      }
      const combined = Array.from(map.values()).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );

      if (combined.length > 0) {
        try {
          localStorage.setItem(localKey, JSON.stringify(combined));
        } catch {}
      }

      return combined;
    },

    async getOngoing(hospitalId) {
      try {
        const sos = await httpClient.get<BackendSOS[]>('/sos/');
        if (!Array.isArray(sos)) return [];
        return sos
          .filter((s) => (s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS') && (String(s.accepted_hospital_id) === String(hospitalId) || !s.accepted_hospital_id))
          .map((s) => toEmergencyItem(s, hospitalId));
      } catch {
        return [];
      }
    },

    async getById(id, hospitalId) {
      try {
        const s = await httpClient.get<BackendSOS>(`/sos/${encodeURIComponent(id)}`);
        if (!s) return null;
        return toEmergencyItem(s, hospitalId);
      } catch {
        return null;
      }
    },

    async accept(id, hospitalId) {
      try {
        const s = await httpClient.post<BackendSOS>(`/sos/${encodeURIComponent(id)}/accept`, {
          hospital_id: Number(hospitalId),
        });
        return toEmergencyItem(s, hospitalId);
      } catch {
        // Fallback
        return {
          id,
          hospitalId,
          requestStatus: 'ACCEPTED',
          type: 'SOS Emergency',
          status: 'ACCEPTED',
          priority: { score: 95, level: 'CRITICAL', reasons: ['SOS Accepted'] },
          patient: { id: 'patient', name: 'Emergency Patient' },
          location: { latitude: 19.697, longitude: 72.766, address: 'Emergency Location', area: 'Palghar District Emergency Zone', city: 'Palghar' },
          createdAt: new Date().toISOString(),
          timeline: [],
        };
      }
    },

    async reject(id, hospitalId, reason) {
      try {
        const s = await httpClient.post<BackendSOS>(`/sos/${encodeURIComponent(id)}/reject`, {
          hospital_id: Number(hospitalId),
          reason,
        });
        return toEmergencyItem(s, hospitalId);
      } catch {
        return {
          id,
          hospitalId,
          requestStatus: 'REJECTED',
          type: 'SOS Emergency',
          status: 'REJECTED',
          priority: { score: 95, level: 'CRITICAL', reasons: ['Rejected'] },
          patient: { id: 'patient', name: 'Emergency Patient' },
          location: { latitude: 19.697, longitude: 72.766, address: 'Emergency Location', area: 'Palghar District Emergency Zone', city: 'Palghar' },
          createdAt: new Date().toISOString(),
          timeline: [],
        };
      }
    },

    async updateStatus(id, hospitalId, status: EmergencyStatus) {
      if (status === 'COMPLETED') {
        try {
          const existing = await this.getById(id, hospitalId);
          if (existing) {
            // 1. Archive to completed cases localStorage
            const completedItem = { ...existing, status: 'COMPLETED' as EmergencyStatus };
            const localKey = 'lifelink_completed_' + hospitalId;
            const current: Emergency[] = JSON.parse(localStorage.getItem(localKey) || '[]');
            const updated = [completedItem, ...current.filter((c: Emergency) => c.id !== id)];
            localStorage.setItem(localKey, JSON.stringify(updated));

            // 2. Free up assigned ambulance
            if (existing.assignedAmbulance?.id) {
              const ambId = existing.assignedAmbulance.id;
              try {
                await httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/ambulances/${encodeURIComponent(ambId)}`, {
                  method: 'PUT',
                  body: JSON.stringify({ status: 'AVAILABLE' }),
                });
              } catch {}

              const ambs = getLocalHospitalItems<Ambulance>(LOCAL_AMBULANCES_KEY, hospitalId);
              const ambMatch = ambs.find((a) => a.id === ambId || a.vehicleNumber === existing.assignedAmbulance?.vehicleNumber);
              if (ambMatch) {
                ambMatch.status = 'AVAILABLE';
                saveLocalHospitalItems(LOCAL_AMBULANCES_KEY, hospitalId, ambs);
              }
            }

            // 3. Free up assigned doctor
            if (existing.assignedDoctor?.id) {
              const docId = existing.assignedDoctor.id;
              try {
                await httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/doctors/${encodeURIComponent(docId)}`, {
                  method: 'PUT',
                  body: JSON.stringify({ status: 'AVAILABLE', current_cases: 0 }),
                });
              } catch {}

              const docs = getLocalHospitalItems<Doctor>(LOCAL_DOCTORS_KEY, hospitalId);
              const docMatch = docs.find((d) => d.id === docId);
              if (docMatch) {
                docMatch.status = 'AVAILABLE';
                docMatch.currentCases = Math.max(0, (docMatch.currentCases ?? 1) - 1);
                saveLocalHospitalItems(LOCAL_DOCTORS_KEY, hospitalId, docs);
              }
            }

            window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
          }
        } catch {}
      }

      try {
        const s = await httpClient.patch<BackendSOS>(`/sos/${encodeURIComponent(id)}/status`, {
          status: toApiHospitalStatus(status),
        });
        return toEmergencyItem(s, hospitalId);
      } catch {
        return {
          id,
          hospitalId,
          requestStatus: 'ACCEPTED',
          type: 'SOS Emergency',
          status,
          priority: { score: 95, level: 'CRITICAL', reasons: ['Updated'] },
          patient: { id: 'patient', name: 'Emergency Patient' },
          location: { latitude: 19.697, longitude: 72.766, address: 'Emergency Location', area: 'Palghar District Emergency Zone', city: 'Palghar' },
          createdAt: new Date().toISOString(),
          timeline: [],
        };
      }
    },
  },

  resource: {
    async getResources(hospitalId: HospitalId): Promise<HospitalResourceSummary> {
      const [h, doctors, ambulances] = await Promise.all([
        fetchHospitalById(hospitalId),
        fetchDoctorsFromBackend(hospitalId),
        fetchAmbulancesFromBackend(hospitalId),
      ]);

      const genTotal = h?.total_beds ?? 100;
      const genOcc = h?.general_occupied ?? 0;

      const icuTotal = h?.icu_beds ?? 20;
      const icuOcc = h?.icu_occupied ?? 0;

      const emTotal = h?.oxygen_beds ?? 15;
      const emOcc = h?.emergency_occupied ?? 0;

      return {
        hospitalId,
        beds: {
          general: {
            total: genTotal,
            occupied: genOcc,
            available: Math.max(0, genTotal - genOcc),
          },
          icu: {
            total: icuTotal,
            occupied: icuOcc,
            available: Math.max(0, icuTotal - icuOcc),
          },
          emergency: {
            total: emTotal,
            occupied: emOcc,
            available: Math.max(0, emTotal - emOcc),
          },
        },
        doctors,
        ambulances,
        updatedAt: new Date().toISOString(),
      };
    },

    async updateBeds(hospitalId: HospitalId, payload: BedUpdate): Promise<HospitalResourceSummary> {
      const updatePayload: Record<string, any> = {
        total_beds: payload.general.total,
        icu_beds: payload.icu.total,
        oxygen_beds: payload.emergency.total,
        general_occupied: payload.general.occupied,
        icu_occupied: payload.icu.occupied,
        emergency_occupied: payload.emergency.occupied,
      };

      try {
        await httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        });
      } catch (err) {
        console.warn('Backend bed update warning:', err);
      }

      return this.getResources(hospitalId);
    },

    async getDoctors(hospitalId: HospitalId): Promise<Doctor[]> {
      return fetchDoctorsFromBackend(hospitalId);
    },

    async createDoctor(hospitalId: HospitalId, payload: DoctorInput): Promise<HospitalResourceSummary> {
      try {
        const res = await httpClient.post<BackendDoctor>(`/hospitals/${encodeURIComponent(hospitalId)}/doctors/`, {
          name: payload.name,
          department: payload.department ?? 'Emergency',
          specialization: payload.specialization ?? 'General Physician',
          phone: payload.phone ?? '',
          status: payload.status ?? 'AVAILABLE',
        });
        if (res && res.doctor_id) {
          return this.getResources(hospitalId);
        }
      } catch {
        // Fallback to local storage
      }

      const existing = getLocalHospitalItems<Doctor>(LOCAL_DOCTORS_KEY, hospitalId);
      const newDoc: Doctor = {
        id: `doc-${Date.now()}`,
        hospitalId,
        name: payload.name,
        department: payload.department ?? 'Emergency',
        specialization: payload.specialization ?? 'General Physician',
        phone: payload.phone,
        status: payload.status ?? 'AVAILABLE',
        currentCases: 0,
      };
      saveLocalHospitalItems(LOCAL_DOCTORS_KEY, hospitalId, [...existing, newDoc]);
      return this.getResources(hospitalId);
    },

    async updateDoctor(hospitalId: HospitalId, id: string, payload: DoctorInput): Promise<HospitalResourceSummary> {
      try {
        await httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/doctors/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: payload.name,
            department: payload.department,
            specialization: payload.specialization,
            phone: payload.phone,
            status: payload.status,
          }),
        });
        return this.getResources(hospitalId);
      } catch {
        // Fallback to local storage
      }

      const existing = getLocalHospitalItems<Doctor>(LOCAL_DOCTORS_KEY, hospitalId);
      const updated = existing.map((d) => (d.id === id ? { ...d, ...payload } : d));
      saveLocalHospitalItems(LOCAL_DOCTORS_KEY, hospitalId, updated);
      return this.getResources(hospitalId);
    },

    async deleteDoctor(hospitalId: HospitalId, id: string): Promise<HospitalResourceSummary> {
      try {
        await httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/doctors/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        return this.getResources(hospitalId);
      } catch {
        // Fallback to local storage
      }

      const existing = getLocalHospitalItems<Doctor>(LOCAL_DOCTORS_KEY, hospitalId);
      saveLocalHospitalItems(LOCAL_DOCTORS_KEY, hospitalId, existing.filter((d) => d.id !== id));
      return this.getResources(hospitalId);
    },

    async getAmbulances(hospitalId: HospitalId): Promise<Ambulance[]> {
      return fetchAmbulancesFromBackend(hospitalId);
    },

    async createAmbulance(hospitalId: HospitalId, payload: AmbulanceInput): Promise<HospitalResourceSummary> {
      try {
        const res = await httpClient.post<BackendAmbulance>(`/hospitals/${encodeURIComponent(hospitalId)}/ambulances/`, {
          vehicle_number: payload.vehicleNumber,
          driver_name: payload.driverName ?? '',
          driver_phone: payload.driverPhone ?? '',
          status: payload.status ?? 'AVAILABLE',
        });
        if (res && res.ambulance_id) {
          return this.getResources(hospitalId);
        }
      } catch {
        // Fallback to local storage
      }

      const existing = getLocalHospitalItems<Ambulance>(LOCAL_AMBULANCES_KEY, hospitalId);
      const newAmb: Ambulance = {
        id: `amb-${Date.now()}`,
        hospitalId,
        vehicleNumber: payload.vehicleNumber,
        driverName: payload.driverName ?? '',
        driverPhone: payload.driverPhone ?? '',
        locationLabel: 'Hospital Fleet',
        status: payload.status ?? 'AVAILABLE',
      };
      saveLocalHospitalItems(LOCAL_AMBULANCES_KEY, hospitalId, [...existing, newAmb]);
      return this.getResources(hospitalId);
    },

    async updateAmbulance(hospitalId: HospitalId, id: string, payload: AmbulanceInput): Promise<HospitalResourceSummary> {
      try {
        await httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/ambulances/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify({
            vehicle_number: payload.vehicleNumber,
            driver_name: payload.driverName,
            driver_phone: payload.driverPhone,
            status: payload.status,
          }),
        });
        return this.getResources(hospitalId);
      } catch {
        // Fallback to local storage
      }

      const existing = getLocalHospitalItems<Ambulance>(LOCAL_AMBULANCES_KEY, hospitalId);
      const updated = existing.map((a) => (a.id === id ? { ...a, ...payload } : a));
      saveLocalHospitalItems(LOCAL_AMBULANCES_KEY, hospitalId, updated);
      return this.getResources(hospitalId);
    },

    async deleteAmbulance(hospitalId: HospitalId, id: string): Promise<HospitalResourceSummary> {
      try {
        await httpClient.request(`/hospitals/${encodeURIComponent(hospitalId)}/ambulances/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        return this.getResources(hospitalId);
      } catch {
        // Fallback to local storage
      }

      const existing = getLocalHospitalItems<Ambulance>(LOCAL_AMBULANCES_KEY, hospitalId);
      saveLocalHospitalItems(LOCAL_AMBULANCES_KEY, hospitalId, existing.filter((a) => a.id !== id));
      return this.getResources(hospitalId);
    },

    async assignAmbulance(id, hospitalId, ambulanceId) {
      try {
        const s = await httpClient.post<BackendSOS>(`/sos/${encodeURIComponent(id)}/ambulance-assignment`, {
          ambulance_id: Number(ambulanceId),
        });
        return toEmergencyItem(s, hospitalId);
      } catch {
        return this.getResources(hospitalId) as any;
      }
    },

    async assignDoctor(id, hospitalId, doctorId) {
      try {
        const s = await httpClient.post<BackendSOS>(`/sos/${encodeURIComponent(id)}/doctor-assignment`, {
          doctor_id: Number(doctorId),
        });
        return toEmergencyItem(s, hospitalId);
      } catch {
        return this.getResources(hospitalId) as any;
      }
    },
  },

  demo: {
    async reset() {
      throw new Error('Demo reset is available only when VITE_DATA_MODE=mock.');
    },
  },
};

