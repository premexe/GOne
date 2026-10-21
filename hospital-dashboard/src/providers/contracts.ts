import type { HospitalRegistrationInput, HospitalRegistration, HospitalResourceSummary, BedUpdate, DoctorInput, AmbulanceInput, ActivityPoint, Ambulance, AuthSession, DashboardStats, Doctor, Emergency, EmergencyStatus, Hospital, HospitalId } from '../types';

export interface AuthProvider {
  register(payload: HospitalRegistrationInput): Promise<HospitalRegistration>;
  getSession(): AuthSession | null;
  login(email: string, password: string): Promise<AuthSession>;
  logout(): void;
}

export interface HospitalProvider {
  getById(hospitalId: HospitalId): Promise<Hospital>;
  getStats(hospitalId: HospitalId): Promise<DashboardStats>;
  getActivity(hospitalId: HospitalId): Promise<ActivityPoint[]>;
}

export interface EmergencyProvider {
  getNew(hospitalId: HospitalId): Promise<Emergency[]>;
  getOngoing(hospitalId: HospitalId): Promise<Emergency[]>;
  getCompleted(hospitalId: HospitalId): Promise<Emergency[]>;
  getById(id: string, hospitalId: HospitalId): Promise<Emergency | null>;
  accept(id: string, hospitalId: HospitalId): Promise<Emergency>;
  reject(id: string, hospitalId: HospitalId, reason: string): Promise<Emergency>;
  updateStatus(id: string, hospitalId: HospitalId, status: EmergencyStatus): Promise<Emergency>;
}

export interface ResourceProvider {
  getResources(hospitalId: HospitalId): Promise<HospitalResourceSummary>;
  updateBeds(hospitalId: HospitalId, payload: BedUpdate): Promise<HospitalResourceSummary>;
  createDoctor(hospitalId: HospitalId, payload: DoctorInput): Promise<HospitalResourceSummary>;
  updateDoctor(hospitalId: HospitalId, id: string, payload: DoctorInput): Promise<HospitalResourceSummary>;
  deleteDoctor(hospitalId: HospitalId, id: string): Promise<HospitalResourceSummary>;
  createAmbulance(hospitalId: HospitalId, payload: AmbulanceInput): Promise<HospitalResourceSummary>;
  updateAmbulance(hospitalId: HospitalId, id: string, payload: AmbulanceInput): Promise<HospitalResourceSummary>;
  deleteAmbulance(hospitalId: HospitalId, id: string): Promise<HospitalResourceSummary>;

  getAmbulances(hospitalId: HospitalId): Promise<Ambulance[]>;
  getDoctors(hospitalId: HospitalId): Promise<Doctor[]>;
  assignAmbulance(id: string, hospitalId: HospitalId, ambulanceId: string): Promise<Emergency>;
  assignDoctor(id: string, hospitalId: HospitalId, doctorId: string): Promise<Emergency>;
}

export interface DemoProvider {
  reset(): Promise<void>;
}

export interface ProviderSet {
  auth: AuthProvider;
  hospital: HospitalProvider;
  emergency: EmergencyProvider;
  resource: ResourceProvider;
  demo: DemoProvider;
}
