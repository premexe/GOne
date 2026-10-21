import { emergencyActivityByHospital, hospitalAccounts } from '../../data/mockData';
import type { Emergency, EmergencyStatus, Hospital, HospitalId } from '../../types';
import { cloneValue, getMockState, resetMockState, saveMockState } from '../../services/mockStore';
import type { ProviderSet } from '../contracts';

import { validateBeds, validateDoctor, validateAmbulance, validateRegistration } from '../../services/resourceValidation';
import type { HospitalResourceSummary } from '../../types';

const SESSION_KEY = 'lifelink-demo-hospital-session-v1';
const ongoingStatuses: EmergencyStatus[] = ['ACCEPTED', 'AMBULANCE_ASSIGNED', 'EN_ROUTE', 'PATIENT_PICKED_UP', 'ARRIVED'];
const delay = (ms = 180) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

function hospitalFor(id: HospitalId | null): Hospital | null {
  return id ? getMockState().hospitals.find((hospital) => hospital.id === id) ?? null : null;
}

function nextHospitalId(): HospitalId {
  const ids = new Set(getMockState().hospitals.map((hospital) => hospital.id));
  let number = Math.max(4, ...[...ids].map((id) => /^HSP-(\d+)$/.exec(id)?.[1]).filter(Boolean).map(Number)) + 1;
  while (ids.has(`HSP-${String(number).padStart(3, '0')}`)) number += 1;
  return `HSP-${String(number).padStart(3, '0')}`;
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string) {
  const encoded = new TextEncoder().encode(`${salt}:${password}`);
  return bytesToHex(await crypto.subtle.digest('SHA-256', encoded));
}

function scopedEmergency(id: string, hospitalId: HospitalId) {
  assertHospital(hospitalId);
  const emergency = getMockState().emergencies.find((item) => item.id === id && item.hospitalId === hospitalId);
  if (!emergency) throw new Error('Emergency not found for this hospital');
  return emergency;
}

function advanceTimeline(emergency: Emergency, label: string) {
  emergency.timeline.forEach((item) => { item.current = false; });
  const matching = emergency.timeline.find((item) => item.label.toLowerCase().includes(label.toLowerCase()));
  if (matching) {
    matching.completed = true;
    matching.current = true;
    matching.timestamp = timeNow();
  } else {
    emergency.timeline.push({ id: `${Date.now()}`, label, timestamp: timeNow(), completed: true, current: true, actorType: 'hospital' });
  }
}

function sortOperational(items: Emergency[]) {
  return [...items].sort((a, b) => b.priority.score - a.priority.score || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function assertHospital(id: string) {
 if (typeof window === 'undefined' || window.localStorage.getItem(SESSION_KEY) !== id || !hospitalFor(id)) throw new Error('Access denied for this hospital.');
}
function resources(id: string): HospitalResourceSummary {
 assertHospital(id);
 const s = getMockState();
 return cloneValue({ hospitalId: id, ...s.resources[id], doctors: s.doctors.filter(d => d.hospitalId === id), ambulances: s.ambulances.filter(a => a.hospitalId === id) });
}
function changed(id: string) {
 getMockState().resources[id].updatedAt = new Date().toISOString();
 saveMockState(); return resources(id);
}
function inUse(id: string, hospitalId: string, kind: 'Doctor' | 'Ambulance') {
 return getMockState().emergencies.some(e => e.hospitalId === hospitalId && ongoingStatuses.includes(e.status) && (kind === 'Doctor' ? e.assignedDoctor?.id : e.assignedAmbulance?.id) === id);
}
export const mockProviders: ProviderSet = {
  auth: {
    async register(payload) {
      validateRegistration(payload); await delay(250);
      const {password: _password, ...safe} = payload;
      const state = getMockState();
      const emails = [safe.adminEmail, safe.hospitalEmail].map((email) => email.trim().toLowerCase());
      const duplicate = state.registrations.some((registration) =>
        registration.licenseNumber.trim().toLowerCase() === safe.licenseNumber.trim().toLowerCase()
        || emails.includes(registration.adminEmail.trim().toLowerCase())
        || emails.includes(registration.hospitalEmail.trim().toLowerCase()))
        || hospitalAccounts.some((account) => emails.includes(account.email.toLowerCase()))
        || state.accounts.some((account) => emails.includes(account.email.toLowerCase()));
      if (duplicate) throw new Error('This hospital license or email is already registered.');

      const passwordSalt = crypto.randomUUID();
      const passwordHash = await hashPassword(payload.password, passwordSalt);
      const hospitalId = nextHospitalId();
      const submittedAt = new Date().toISOString();
      const hospital: Hospital = {
        id: hospitalId,
        name: safe.hospitalName.trim(),
        shortName: safe.hospitalName.trim(),
        department: 'Emergency Department',
        latitude: safe.latitude ?? 19.697,
        longitude: safe.longitude ?? 72.766,
        address: safe.address.trim(),
        area: safe.city.trim(),
        city: safe.city.trim(),
        networkRegion: safe.state.trim(),
        emergencyBeds: { available: 0, total: 0 },
        icuBeds: { available: 0, total: 0 },
        averageResponseTimeMinutes: 0,
        completedToday: 0,
        acceptanceRate: 0,
        email: safe.hospitalEmail.trim(),
        capabilities: [],
        specialities: [],
        status: 'CONNECTED',
        availabilityUpdatedAt: submittedAt,
        availabilitySource: 'mock',
        availabilityVerificationStatus: 'UNVERIFIED',
      };
      const record = { ...safe, id: crypto.randomUUID(), hospitalId, status: 'APPROVED' as const, submittedAt };
      state.hospitals.push(hospital);
      state.accounts.push({ hospitalId, email: safe.adminEmail.trim().toLowerCase(), passwordHash, passwordSalt });
      state.registrations.push(record);
      state.resources[hospitalId] = {
        updatedAt: submittedAt,
        beds: {
          general: { total: 0, occupied: 0, available: 0 },
          icu: { total: 0, occupied: 0, available: 0 },
          emergency: { total: 0, occupied: 0, available: 0 },
        },
      };
      saveMockState();
      return cloneValue(record);
    },
    getSession() {
      if (typeof window === 'undefined') return null;
      try {
        const hospital = hospitalFor(window.localStorage.getItem(SESSION_KEY) as HospitalId | null);
        return hospital ? { hospital: cloneValue(hospital) } : null;
      } catch { return null; }
    },
    async login(email, password) {
      await delay(420);
      const normalizedEmail = email.trim().toLowerCase();
      const account = hospitalAccounts.find((item) => item.email.toLowerCase() === normalizedEmail && item.password === password);
      const registeredAccount = getMockState().accounts.find((item) => item.email === normalizedEmail);
      const registeredPasswordMatches = registeredAccount
        ? await hashPassword(password, registeredAccount.passwordSalt) === registeredAccount.passwordHash
        : false;
      const hospitalId = account?.hospitalId ?? (registeredPasswordMatches ? registeredAccount?.hospitalId : undefined);
      if (!hospitalId) throw new Error('Email or password is incorrect.');
      const hospital = hospitalFor(hospitalId);
      if (!hospital) throw new Error('Hospital account is not available.');
      window.localStorage.setItem(SESSION_KEY, hospital.id);
      return { hospital: cloneValue(hospital) };
    },
    logout() {
      if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
    },
  },
  hospital: {
    async getById(hospitalId) { assertHospital(hospitalId); await delay(80); return cloneValue(hospitalFor(hospitalId)!); },
    async getStats(hospitalId) { assertHospital(hospitalId);
      await delay();
      const state = getMockState();
      const hospital = hospitalFor(hospitalId)!;
      const cases = state.emergencies.filter((item) => item.hospitalId === hospitalId);
      const newCases = cases.filter((item) => item.requestStatus === 'PENDING');
      const ongoing = cases.filter((item) => item.requestStatus === 'ACCEPTED' && ongoingStatuses.includes(item.status));
      const active = [...newCases, ...ongoing];
      const ambulances = state.ambulances.filter((item) => item.hospitalId === hospitalId);
      const doctors = state.doctors.filter((item) => item.hospitalId === hospitalId);
      const completedInDemo = cases.filter((item) => item.status === 'COMPLETED').length;
      return cloneValue({
        newEmergencies: newCases.length,
        ongoingCases: ongoing.length,
        activeEmergencies: active.length,
        criticalCases: active.filter((item) => item.priority.level === 'CRITICAL').length,
        availableAmbulances: ambulances.filter((item) => item.status === 'AVAILABLE').length,
        totalAmbulances: ambulances.length,
        availableDoctors: doctors.filter((item) => item.status === 'AVAILABLE').length,
        totalDoctors: doctors.length,
        availableBeds: state.resources[hospitalId].beds.emergency.available,
        totalBeds: state.resources[hospitalId].beds.emergency.total,
        availableIcuBeds: state.resources[hospitalId].beds.icu.available,
        totalIcuBeds: state.resources[hospitalId].beds.icu.total,
        averageResponseTimeMinutes: hospital.averageResponseTimeMinutes,
        completedToday: hospital.completedToday + completedInDemo,
        acceptanceRate: hospital.acceptanceRate,
      });
    },
    async getActivity(hospitalId) { assertHospital(hospitalId); await delay(90); return cloneValue(emergencyActivityByHospital[hospitalId] ?? []); },
  },
  emergency: {
    async getNew(hospitalId) { assertHospital(hospitalId);
      await delay();
      return cloneValue(sortOperational(getMockState().emergencies.filter((item) => item.hospitalId === hospitalId && item.requestStatus === 'PENDING')));
    },
    async getCompleted(hospitalId) { assertHospital(hospitalId);
      await delay();
      return cloneValue(sortOperational(getMockState().emergencies.filter((item) => item.hospitalId === hospitalId && item.status === 'COMPLETED')));
    },

    async getOngoing(hospitalId) { assertHospital(hospitalId);
      await delay();
      return cloneValue(sortOperational(getMockState().emergencies.filter((item) => item.hospitalId === hospitalId && item.requestStatus === 'ACCEPTED' && ongoingStatuses.includes(item.status))));
    },
    async getById(id, hospitalId) { assertHospital(hospitalId);
      await delay();
      return cloneValue(getMockState().emergencies.find((item) => item.id === id && item.hospitalId === hospitalId) ?? null);
    },
    async accept(id, hospitalId) {
      const emergency = scopedEmergency(id, hospitalId);
      if (emergency.requestStatus !== 'PENDING') throw new Error('This request has already been decided');
      emergency.requestStatus = 'ACCEPTED';
      emergency.status = 'ACCEPTED';
      emergency.hospitalDecision = 'ACCEPTED';
      emergency.acceptedAt = new Date().toISOString();
      emergency.updatedAt = emergency.acceptedAt;
      advanceTimeline(emergency, 'Hospital accepted emergency');
      getMockState().resources[hospitalId].updatedAt = new Date().toISOString();
      saveMockState();
      return cloneValue(emergency);
    },
    async reject(id, hospitalId, reason) {
      const emergency = scopedEmergency(id, hospitalId);
      if (emergency.requestStatus !== 'PENDING') throw new Error('This request has already been decided');
      emergency.requestStatus = 'REJECTED';
      emergency.status = 'REJECTED';
      emergency.hospitalDecision = 'REJECTED';
      emergency.rejectionReason = reason;
      emergency.updatedAt = new Date().toISOString();
      advanceTimeline(emergency, 'Emergency rejected');
      getMockState().resources[hospitalId].updatedAt = new Date().toISOString();
      saveMockState();
      return cloneValue(emergency);
    },
    async updateStatus(id, hospitalId, status) {
      const state = getMockState();
      const emergency = scopedEmergency(id, hospitalId);
      emergency.status = status;
      emergency.updatedAt = new Date().toISOString();
      if (emergency.assignedAmbulance) {
        const resource = state.ambulances.find((item) => item.id === emergency.assignedAmbulance?.id && item.hospitalId === hospitalId);
        const ambulanceStatus = status === 'EN_ROUTE' ? 'EN_ROUTE' : status === 'PATIENT_PICKED_UP' ? 'TRANSPORTING' : status === 'COMPLETED' ? 'AVAILABLE' : 'ASSIGNED';
        emergency.assignedAmbulance.status = ambulanceStatus;
        if (resource) resource.status = ambulanceStatus;
      }
      if (status === 'COMPLETED') {
        emergency.completedAt = new Date().toISOString();
        if (emergency.assignedDoctor) {
          const doctor = state.doctors.find((item) => item.id === emergency.assignedDoctor?.id && item.hospitalId === hospitalId);
          if (doctor) {
            doctor.currentCases = Math.max(0, doctor.currentCases - 1);
            doctor.status = doctor.currentCases <= 1 ? 'AVAILABLE' : 'BUSY';
          }
        }
      }
      const labels: Partial<Record<EmergencyStatus, string>> = {
        EN_ROUTE: 'Ambulance en route', PATIENT_PICKED_UP: 'Patient picked up', ARRIVED: 'Arrived at hospital', COMPLETED: 'Case completed',
      };
      if (labels[status]) advanceTimeline(emergency, labels[status]);
      getMockState().resources[hospitalId].updatedAt = new Date().toISOString();
      saveMockState();
      return cloneValue(emergency);
    },
  },
  resource: {
    async createAmbulance(hospitalId, payload) {
      assertHospital(hospitalId); validateAmbulance(payload); const id = crypto.randomUUID(); if (getMockState().ambulances.some(a => a.hospitalId === hospitalId && a.id !== id && a.vehicleNumber.toLowerCase() === payload.vehicleNumber.trim().toLowerCase())) throw new Error('Vehicle number already exists.');
      getMockState().ambulances.push({vehicleNumber: payload.vehicleNumber.trim(), driverName: payload.driverName, driverPhone: payload.driverPhone, status: payload.status, id, hospitalId, locationLabel: 'Hospital'}); return changed(hospitalId);
    },
    async updateAmbulance(hospitalId, id, payload) {
      assertHospital(hospitalId); validateAmbulance(payload); if (getMockState().ambulances.some(a => a.hospitalId === hospitalId && a.id !== id && a.vehicleNumber.toLowerCase() === payload.vehicleNumber.trim().toLowerCase())) throw new Error('Vehicle number already exists.');
      const item = getMockState().ambulances.find(x => x.hospitalId === hospitalId && x.id === id);
      if (!item) throw new Error('Resource not found.');
      if (inUse(id, hospitalId, 'Ambulance') && item.status !== payload.status) throw new Error('Update the active case before changing this resource status.');
      Object.assign(item, {vehicleNumber: payload.vehicleNumber.trim(), driverName: payload.driverName, driverPhone: payload.driverPhone, status: payload.status}); return changed(hospitalId);
    },
    async deleteAmbulance(hospitalId, id) {
      assertHospital(hospitalId);
      if (inUse(id, hospitalId, 'Ambulance')) throw new Error('This resource is assigned to an active case and cannot be removed.');
      const list = getMockState().ambulances; const index = list.findIndex(x => x.id === id && x.hospitalId === hospitalId);
      if (index < 0) throw new Error('Resource not found.'); list.splice(index, 1); return changed(hospitalId);
    },

    async createDoctor(hospitalId, payload) {
      assertHospital(hospitalId); validateDoctor(payload); const id = crypto.randomUUID(); 
      getMockState().doctors.push({name: payload.name.trim(), department: payload.department, specialization: payload.specialization, phone: payload.phone, status: payload.status, id, hospitalId, currentCases: 0}); return changed(hospitalId);
    },
    async updateDoctor(hospitalId, id, payload) {
      assertHospital(hospitalId); validateDoctor(payload); 
      const item = getMockState().doctors.find(x => x.hospitalId === hospitalId && x.id === id);
      if (!item) throw new Error('Resource not found.');
      if (inUse(id, hospitalId, 'Doctor') && item.status !== payload.status) throw new Error('Update the active case before changing this resource status.');
      Object.assign(item, {name: payload.name.trim(), department: payload.department, specialization: payload.specialization, phone: payload.phone, status: payload.status}); return changed(hospitalId);
    },
    async deleteDoctor(hospitalId, id) {
      assertHospital(hospitalId);
      if (inUse(id, hospitalId, 'Doctor')) throw new Error('This resource is assigned to an active case and cannot be removed.');
      const list = getMockState().doctors; const index = list.findIndex(x => x.id === id && x.hospitalId === hospitalId);
      if (index < 0) throw new Error('Resource not found.'); list.splice(index, 1); return changed(hospitalId);
    },

    async getResources(id) { assertHospital(id); await delay(); return resources(id); },
    async updateBeds(id, payload) {
      assertHospital(id); validateBeds(payload);
      for (const kind of ['general','icu','emergency'] as const) getMockState().resources[id].beds[kind] = {total: payload[kind].total, occupied: payload[kind].occupied, available: payload[kind].total - payload[kind].occupied};
      return changed(id);
    },
    async getAmbulances(hospitalId) { assertHospital(hospitalId); await delay(100); return cloneValue(getMockState().ambulances.filter((item) => item.hospitalId === hospitalId)); },
    async getDoctors(hospitalId) { assertHospital(hospitalId); await delay(100); return cloneValue(getMockState().doctors.filter((item) => item.hospitalId === hospitalId)); },
    async assignAmbulance(id, hospitalId, ambulanceId) {
      const state = getMockState();
      const emergency = scopedEmergency(id, hospitalId);
      const ambulance = state.ambulances.find((item) => item.id === ambulanceId && item.hospitalId === hospitalId);
      if (!ambulance || ambulance.status !== 'AVAILABLE') throw new Error('Selected ambulance is not available');
      ambulance.status = 'ASSIGNED';
      emergency.assignedAmbulance = cloneValue(ambulance);
      emergency.status = 'AMBULANCE_ASSIGNED';
      emergency.assignedAt = new Date().toISOString();
      emergency.updatedAt = emergency.assignedAt;
      advanceTimeline(emergency, 'Ambulance assigned');
      getMockState().resources[hospitalId].updatedAt = new Date().toISOString();
      saveMockState();
      return cloneValue(emergency);
    },
    async assignDoctor(id, hospitalId, doctorId) {
      const state = getMockState();
      const emergency = scopedEmergency(id, hospitalId);
      const doctor = state.doctors.find((item) => item.id === doctorId && item.hospitalId === hospitalId);
      if (!doctor || doctor.status !== 'AVAILABLE') throw new Error('Selected doctor is not available');
      doctor.status = 'BUSY';
      doctor.currentCases += 1;
      emergency.assignedDoctor = cloneValue(doctor);
      emergency.updatedAt = new Date().toISOString();
      advanceTimeline(emergency, `${doctor.name} assigned`);
      getMockState().resources[hospitalId].updatedAt = new Date().toISOString();
      saveMockState();
      return cloneValue(emergency);
    },
  },
  demo: {
    async reset() {
      await delay(120);
      if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
      resetMockState();
    },
  },
};
